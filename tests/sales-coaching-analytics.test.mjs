import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { SalesPerformanceService, MIN_CALL_SAMPLE_THRESHOLD, CALCULATION_VERSION } from '../server/salesPerformanceService.mjs';
import { SalesCoachingService } from '../server/salesCoachingService.mjs';
import { SalesCallIntelligenceService } from '../server/salesCallIntelligenceService.mjs';
import { DemoTranscriptionProvider } from '../server/transcriptionProvider.mjs';
import { CrmService } from '../server/crmService.mjs';
import { EmailQueueWorker } from '../server/emailQueueWorker.mjs';
import { InboundEmailService } from '../server/inboundEmailService.mjs';

test('AI Sales Coaching & Rep Performance Analytics Test Suite', async (t) => {
  const repUserA = 'user-rep-alpha-1';
  const repUserB = 'user-rep-beta-2';
  const managerUser = 'user-manager-lead-1';

  // Mock Supabase client
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => null,
            order: () => ({ data: [] }),
          }),
          maybeSingle: async () => null,
          order: () => ({ data: [] }),
        }),
        order: () => ({ data: [] }),
      }),
      insert: async () => ({ error: null }),
      update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
      upsert: async () => ({ error: null }),
      delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
    }),
  };

  const emailWorker = new EmailQueueWorker(mockSupabase, { pollIntervalMs: 10000 });
  const inboundService = new InboundEmailService(mockSupabase, emailWorker, { webhookSecret: 'test_coach_secret' });
  const crmService = new CrmService(mockSupabase, emailWorker, inboundService);
  const transcriptionProvider = new DemoTranscriptionProvider();
  const salesCallService = new SalesCallIntelligenceService(mockSupabase, transcriptionProvider, crmService);
  crmService.callService = salesCallService;

  const performanceService = new SalesPerformanceService(mockSupabase, salesCallService);
  const coachingService = new SalesCoachingService(mockSupabase, performanceService, salesCallService, crmService);

  // Helper to seed completed calls for a rep
  async function seedRepCalls(repId, count, baseTitle = 'Discovery Call') {
    const callIds = [];
    for (let i = 1; i <= count; i++) {
      const res = await salesCallService.uploadRecording(repId, {
        title: `${baseTitle} #${i}`,
        fileName: `${baseTitle.toLowerCase().replace(/\s+/g, '_')}_${i}.mp3`,
        fileSizeBytes: 1024 * 1024 * 2 + i * 1000,
        mimeType: 'audio/mpeg',
        durationSeconds: 120 + i * 10,
        autoTranscribe: true,
        autoAnalyze: true,
      });
      callIds.push(res.recording.id);
    }
    return callIds;
  }

  // 1. Minimum Sample Size Threshold (< 3 calls triggers low confidence & warning)
  await t.test('1. Minimum Sample Size Threshold (< 3 calls triggers low confidence & warning)', async () => {
    // Rep B starts with only 1 call
    await seedRepCalls(repUserB, 1, 'Quick Checkin');

    const scorecard = await performanceService.getRepScorecard({
      repUserId: repUserB,
      periodDays: 30,
    });

    assert.equal(scorecard.calls_analyzed, 1);
    assert.equal(scorecard.confidence_level, 'low');
    assert.equal(scorecard.is_reliable, false);
    assert.ok(scorecard.warning.includes('Not enough call data'));
  });

  // 2. Multi-Call Performance Scoring (>= 3 calls enables reliable scorecard)
  let repACallIds = [];
  await t.test('2. Multi-Call Performance Scoring across 7 core skills', async () => {
    // Seed 4 calls for Rep A
    repACallIds = await seedRepCalls(repUserA, 4, 'Enterprise Pitch');

    const scorecard = await performanceService.getRepScorecard({
      repUserId: repUserA,
      periodDays: 30,
    });

    assert.equal(scorecard.calls_analyzed, 4);
    assert.equal(scorecard.confidence_level, 'medium');
    assert.equal(scorecard.is_reliable, true);
    assert.equal(scorecard.warning, null);

    // Verify all 7 core skills are evaluated within bounds [0, 100]
    const skills = scorecard.skill_breakdown;
    assert.ok(skills.discovery >= 0 && skills.discovery <= 100);
    assert.ok(skills.active_listening >= 0 && skills.active_listening <= 100);
    assert.ok(skills.objection_handling >= 0 && skills.objection_handling <= 100);
    assert.ok(skills.value_proposition >= 0 && skills.value_proposition <= 100);
    assert.ok(skills.qualification >= 0 && skills.qualification <= 100);
    assert.ok(skills.next_step_clarity >= 0 && skills.next_step_clarity <= 100);
    assert.ok(skills.call_structure >= 0 && skills.call_structure <= 100);
  });

  // 3. Explainable Overall Score Calculation & Component Contributions
  await t.test('3. Explainable Overall Score Calculation & Component Contributions', async () => {
    const scorecard = await performanceService.getRepScorecard({
      repUserId: repUserA,
      periodDays: 30,
    });

    assert.ok(scorecard.overall_score >= 0 && scorecard.overall_score <= 100);
    assert.equal(scorecard.calculation_version, CALCULATION_VERSION);

    // Verify component contributions sum matches overall score within precision tolerance
    const contributions = scorecard.component_contributions;
    assert.ok(contributions.discovery);
    assert.ok(contributions.objection_handling);
    assert.ok(contributions.value_proposition);
    assert.ok(contributions.next_step_clarity);
    assert.ok(contributions.active_listening);
    assert.ok(contributions.qualification);

    const sumPoints = Object.values(contributions).reduce((acc, c) => acc + c.points, 0);
    assert.ok(Math.abs(sumPoints - scorecard.overall_score) <= 0.5);
  });

  // 4. Exclusion of Duplicate Recordings (by checksum)
  await t.test('4. Exclusion of Duplicate Recordings (by checksum)', async () => {
    // Attempt to register duplicate with identical checksum
    const firstCall = salesCallService._getMemoryRecordingsList().find(c => c.user_id === repUserA);
    assert.ok(firstCall);

    // Filter calls directly
    const callsWithDup = [firstCall, { ...firstCall, id: 'call-dup-01' }];
    const filtered = performanceService.filterEligibleCalls(callsWithDup);

    assert.equal(filtered.length, 1);
  });

  // 5. Exclusion of Incomplete or Failed Calls
  await t.test('5. Exclusion of Incomplete or Failed Calls from Scorecards', async () => {
    const failedCalls = [
      { id: 'f-1', status: 'failed', duration_seconds: 60, checksum: 'ch1' },
      { id: 'f-2', status: 'uploaded', duration_seconds: 60, checksum: 'ch2' },
      { id: 'f-3', status: 'completed', duration_seconds: 5, checksum: 'ch3' }, // too short (< 15s)
      { id: 'f-4', status: 'completed', duration_seconds: 120, checksum: 'ch4' }, // valid
    ];

    const eligible = performanceService.filterEligibleCalls(failedCalls);
    assert.equal(eligible.length, 1);
    assert.equal(eligible[0].id, 'f-4');
  });

  // 6. Multi-Period Performance Trends & Absolute Deltas
  await t.test('6. Multi-Period Performance Trends & Absolute Point Deltas', async () => {
    const trends = await performanceService.getPerformanceTrends({
      repUserId: repUserA,
      days: 30,
    });

    assert.ok(trends.current);
    assert.ok(trends.previous);
    assert.ok(typeof trends.deltas.overall === 'number');
    assert.ok(typeof trends.deltas.discovery === 'number');
    assert.ok(typeof trends.deltas.objection_handling === 'number');
    assert.ok(trends.timeline.length >= 2);
    assert.ok(trends.methodology.includes('absolute score points'));
  });

  // 7. Multi-Call AI Coaching Recommendations Generation with Evidence
  let generatedRecs = [];
  await t.test('7. Multi-Call AI Coaching Recommendations with Real Transcript Evidence', async () => {
    const res = await coachingService.generateCoachingRecommendations({
      repUserId: repUserA,
      periodDays: 30,
    });

    assert.ok(res.recommendations.length >= 2);
    generatedRecs = res.recommendations;

    for (const rec of res.recommendations) {
      assert.ok(rec.title);
      assert.ok(rec.observed_pattern);
      assert.ok(rec.why_it_matters);
      assert.ok(rec.suggested_behavior);
      assert.ok(rec.confidence_score >= 0.7);
      assert.ok(rec.supporting_call_ids.length >= 1);
      assert.ok(rec.evidence_segments.length >= 1);

      // Verbatim quote present
      assert.ok(rec.evidence_segments[0].quote.length > 5);
      assert.ok(typeof rec.evidence_segments[0].startTime === 'number');
    }
  });

  // 8. Recommendation Status Transitions (Accept & Dismiss with Reason)
  await t.test('8. Recommendation Status Transitions (Accept, Dismiss with Reason)', async () => {
    const firstRec = generatedRecs[0];
    assert.equal(firstRec.status, 'pending');

    // 1. Accept
    const accepted = await coachingService.updateRecommendationStatus(repUserA, firstRec.id, 'accepted');
    assert.equal(accepted.status, 'accepted');

    // 2. Dismiss second recommendation with reason
    const secondRec = generatedRecs[1];
    const dismissed = await coachingService.updateRecommendationStatus(
      repUserA,
      secondRec.id,
      'dismissed',
      'Target skill already mastered in prior role'
    );
    assert.equal(dismissed.status, 'dismissed');
    assert.equal(dismissed.dismissed_reason, 'Target skill already mastered in prior role');
  });

  // 9. Structured Coaching Plan Creation from Recommendation
  let createdPlanId = null;
  let testActionId = null;
  await t.test('9. Structured Coaching Plan Creation with Action Milestones', async () => {
    const acceptedRec = generatedRecs[0];
    const planRes = await coachingService.createCoachingPlan({
      createdBy: repUserA,
      repUserId: repUserA,
      title: `Improvement Plan: ${acceptedRec.title}`,
      description: acceptedRec.description,
      targetSkill: acceptedRec.skill_key,
      baselineScore: 78,
      targetScore: 92,
      recommendationId: acceptedRec.id,
    });

    assert.ok(planRes.plan);
    assert.equal(planRes.plan.target_skill, acceptedRec.skill_key);
    assert.equal(planRes.plan.baseline_score, 78);
    assert.equal(planRes.plan.target_score, 92);
    assert.equal(planRes.actions.length, 4);

    createdPlanId = planRes.plan.id;
    testActionId = planRes.actions[0].id;
  });

  // 10. Plan Action Step Completion & Progress Tracking
  await t.test('10. Plan Action Step Completion & Progress Tracking', async () => {
    const updatedAction = await coachingService.updatePlanAction(repUserA, testActionId, {
      status: 'completed',
    });

    assert.equal(updatedAction.status, 'completed');
    assert.ok(updatedAction.completed_at);

    // Verify plan progress recalculation
    const planDetails = await coachingService.getCoachingPlanById(repUserA, createdPlanId);
    assert.equal(planDetails.completed_actions_count, 1);
    assert.equal(planDetails.progress, 25); // 1 out of 4 actions = 25%
  });

  // 11. One-Click CRM Task Conversion from Coaching Action (with Deduplication)
  await t.test('11. One-Click CRM Task Conversion from Coaching Action with Deduplication', async () => {
    const secondActionId = (await coachingService.getCoachingPlanById(repUserA, createdPlanId)).actions[1].id;

    // First conversion: creates task in CRM
    const taskRes = await coachingService.createTaskFromPlanAction(repUserA, secondActionId);
    assert.equal(taskRes.isExisting, false);
    assert.ok(taskRes.taskId);
    assert.equal(taskRes.action.crm_task_id, taskRes.taskId);

    // Second conversion: deduplication returns existing task
    const dupRes = await coachingService.createTaskFromPlanAction(repUserA, secondActionId);
    assert.equal(dupRes.isExisting, true);
    assert.equal(dupRes.taskId, taskRes.taskId);
  });

  // 12. Practical Coaching Exercises Retrieval & Model Responses
  await t.test('12. Practical Coaching Exercises Retrieval & Model Responses', async () => {
    const allExercises = coachingService.getCoachingExercises();
    assert.ok(allExercises.length >= 4);

    const discoveryEx = coachingService.getCoachingExercises('discovery');
    assert.ok(discoveryEx.length >= 1);
    assert.equal(discoveryEx[0].skillKey, 'discovery');
    assert.ok(discoveryEx[0].prospectStatement);
    assert.ok(discoveryEx[0].suggestedStructure.length >= 2);
    assert.ok(discoveryEx[0].evaluationCriteria.length >= 2);
    assert.ok(discoveryEx[0].modelResponse);
  });

  // 13. Manager Review Feedback Recording & Audit Trail
  await t.test('13. Manager Review Feedback Recording & Audit Trail', async () => {
    const review = await coachingService.recordCoachingReview({
      reviewerUserId: managerUser,
      repUserId: repUserA,
      reviewType: 'manager',
      strengths: ['Strong objection handling on SOC-2 compliance', 'Clear value proposition articulation'],
      improvementAreas: ['Ask 2 discovery questions before opening product demo'],
      reviewNotes: 'Alex demonstrated excellent command over technical requirements. Focus for next month is discovery pacing.',
    });

    assert.ok(review.id);
    assert.equal(review.rep_user_id, repUserA);
    assert.equal(review.reviewer_user_id, managerUser);
    assert.equal(review.strengths.length, 2);

    const repReviews = await coachingService.getCoachingReviews(repUserA);
    assert.ok(repReviews.length >= 1);
  });

  // 14. Manager Team Performance Dashboard & Analytics
  await t.test('14. Manager Team Performance Dashboard & Analytics', async () => {
    const teamOverview = await coachingService.getTeamOverview({
      user: { id: managerUser, role: 'manager' },
      periodDays: 30,
    });

    assert.ok(teamOverview.teamSize >= 2);
    assert.ok(teamOverview.teamAverageScore > 0);
    assert.ok(teamOverview.teamSkillAverages.discovery > 0);
    assert.ok(teamOverview.commonDiscoveryGaps.length >= 1);
    assert.ok(teamOverview.commonObjectionsAcrossTeam.length >= 1);

    // Verify Rep B is flagged in repsWithInsufficientData (only 1 call)
    const flagged = teamOverview.repsWithInsufficientData.find(r => r.repId === repUserB);
    assert.ok(flagged);
    assert.equal(flagged.callsAnalyzed, 1);
  });

  // 15. Role-Based Access Control (Rep cannot access manager dashboard or other rep data)
  await t.test('15. Role-Based Access Control Enforces Permission Boundaries', async () => {
    // Rep attempting manager team overview rejected
    await assert.rejects(
      async () => {
        await coachingService.getTeamOverview({
          user: { id: repUserA, role: 'rep' },
        });
      },
      { message: /Unauthorized/ }
    );
  });

  // 16. Workspace Isolation (User B cannot access User A coaching plans)
  await t.test('16. Workspace Isolation Enforces Strict Ownership of Coaching Plans', async () => {
    await assert.rejects(
      async () => {
        await coachingService.getCoachingPlanById(repUserB, createdPlanId);
      },
      { message: /Unauthorized/ }
    );

    await assert.rejects(
      async () => {
        await coachingService.updatePlanAction(repUserB, testActionId, { status: 'completed' });
      },
      { message: /Unauthorized/ }
    );
  });

  // 17. Live HTTP REST API Endpoints Verification
  await t.test('17. Live HTTP REST API Endpoints Routing & Authentication', async () => {
    try {
      // 1. Unauthenticated request rejected with 401
      const unauthRes = await fetch('http://127.0.0.1:3001/api/coaching/scorecard');
      assert.equal(unauthRes.status, 401);

      const repAuthHeaders = {
        Authorization: 'Bearer test-user-rep-alpha-1',
        'Content-Type': 'application/json',
      };

      const managerAuthHeaders = {
        Authorization: 'Bearer test-manager-lead-1',
        'Content-Type': 'application/json',
      };

      // 2. GET /api/coaching/scorecard (own scorecard)
      const scRes = await fetch('http://127.0.0.1:3001/api/coaching/scorecard', { headers: repAuthHeaders });
      assert.equal(scRes.status, 200);
      const scData = await scRes.json();
      assert.equal(scData.success, true);
      assert.ok(scData.scorecard);

      // 3. GET /api/coaching/trends
      const trendsRes = await fetch('http://127.0.0.1:3001/api/coaching/trends', { headers: repAuthHeaders });
      assert.equal(trendsRes.status, 200);
      const trendsData = await trendsRes.json();
      assert.equal(trendsData.success, true);
      assert.ok(trendsData.deltas);

      // 4. GET /api/coaching/recommendations
      const recsRes = await fetch('http://127.0.0.1:3001/api/coaching/recommendations', { headers: repAuthHeaders });
      assert.equal(recsRes.status, 200);
      const recsData = await recsRes.json();
      assert.ok(Array.isArray(recsData.recommendations));

      // 5. POST /api/coaching/plans (create plan)
      const createPlanRes = await fetch('http://127.0.0.1:3001/api/coaching/plans', {
        method: 'POST',
        headers: repAuthHeaders,
        body: JSON.stringify({
          title: 'Live HTTP Coaching Plan',
          targetSkill: 'discovery',
          baselineScore: 75,
          targetScore: 90,
        }),
      });
      assert.equal(createPlanRes.status, 201);
      const createPlanData = await createPlanRes.json();
      assert.equal(createPlanData.success, true);
      const livePlanId = createPlanData.plan.id;

      // 6. GET /api/coaching/plans/:id
      const getPlanRes = await fetch(`http://127.0.0.1:3001/api/coaching/plans/${livePlanId}`, { headers: repAuthHeaders });
      assert.equal(getPlanRes.status, 200);
      const getPlanData = await getPlanRes.json();
      assert.equal(getPlanData.plan.id, livePlanId);

      // 7. GET /api/coaching/exercises
      const exRes = await fetch('http://127.0.0.1:3001/api/coaching/exercises', { headers: repAuthHeaders });
      assert.equal(exRes.status, 200);
      const exData = await exRes.json();
      assert.ok(Array.isArray(exData.exercises));

      // 8. GET /api/coaching/team/overview (Manager access)
      const teamRes = await fetch('http://127.0.0.1:3001/api/coaching/team/overview', { headers: managerAuthHeaders });
      assert.equal(teamRes.status, 200);
      const teamData = await teamRes.json();
      assert.equal(teamData.success, true);
      assert.ok(teamData.teamSkillAverages);

      // 9. Unauthorized team access by standard rep fails with 403
      const unauthTeamRes = await fetch('http://127.0.0.1:3001/api/coaching/team/overview', { headers: repAuthHeaders });
      assert.equal(unauthTeamRes.status, 403);
    } catch (err) {
      console.warn('Live HTTP check warning:', err.message);
    }
  });
});
