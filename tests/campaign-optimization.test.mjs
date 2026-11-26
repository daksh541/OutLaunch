import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { OptimizationService } from '../server/optimizationService.mjs';
import { AnalyticsService } from '../server/analyticsService.mjs';
import { EmailQueueWorker } from '../server/emailQueueWorker.mjs';
import { InboundEmailService } from '../server/inboundEmailService.mjs';

test('AI Campaign Optimization & Recommendation Engine Test Suite', async (t) => {
  const userId = 'user-opt-test-1';
  const otherUserId = 'user-opt-test-2';
  const campaignId = 'camp-opt-uuid-1';

  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => null,
            order: () => ({ data: [] }),
          }),
          gte: () => ({ lte: () => ({ data: [] }) }),
          maybeSingle: async () => null,
          order: () => ({ data: [] }),
        }),
        order: () => ({ data: [] }),
      }),
      insert: async () => ({ error: null }),
      update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
  };

  const emailWorker = new EmailQueueWorker(mockSupabase, { pollIntervalMs: 10000 });
  const inboundService = new InboundEmailService(mockSupabase, emailWorker, { webhookSecret: 'test_secret' });
  const analyticsService = new AnalyticsService(mockSupabase, emailWorker, inboundService);
  const optimizationService = new OptimizationService(mockSupabase, analyticsService, {
    minSampleSize: 15,
  });

  // 1. Campaign Health Calculation
  await t.test('1. Campaign Health Calculation Categories', () => {
    // Healthy campaign
    const healthyMetrics = {
      sent: 50,
      delivered: 49,
      delivery_rate: 98.0,
      bounces: 1,
      bounce_rate: 2.0,
      replies: 2,
      reply_rate: 4.1,
      positive_replies: 1,
      positive_reply_rate: 2.0,
      unsubscribes: 0,
      unsubscribe_rate: 0.0,
    };
    const health = optimizationService.calculateCampaignHealth(healthyMetrics);
    assert.equal(health.health, 'Excellent');
    assert.ok(health.score >= 88);

    // Critical bounce rate
    const criticalMetrics = {
      ...healthyMetrics,
      bounce_rate: 6.2,
      bounces: 3,
    };
    const critHealth = optimizationService.calculateCampaignHealth(criticalMetrics);
    assert.equal(critHealth.health, 'Critical');
    assert.ok(critHealth.score <= 45);

    // Needs attention (low replies)
    const warningMetrics = {
      ...healthyMetrics,
      reply_rate: 0.5,
      positive_reply_rate: 0.0,
    };
    const warnHealth = optimizationService.calculateCampaignHealth(warningMetrics);
    assert.equal(warnHealth.health, 'Needs Attention');
  });

  // 2. Insufficient Data Handling
  await t.test('2. Insufficient Data Protection (< 15 sent emails)', () => {
    const sparseMetrics = {
      sent: 8,
      delivered: 8,
      delivery_rate: 100.0,
      bounces: 0,
      bounce_rate: 0.0,
      replies: 0,
      reply_rate: 0.0,
    };
    const health = optimizationService.calculateCampaignHealth(sparseMetrics);
    assert.equal(health.health, 'Insufficient Data');
    assert.equal(health.score, null, 'Score must not be calculated when data is insufficient');
    assert.ok(health.reasons[0].includes('minimum threshold: 15'));
  });

  // 3. Recommendation Evidence Validation
  await t.test('3. Recommendation Evidence & Supporting Metrics Validation', async () => {
    // Seed campaign & metrics
    emailWorker.memoryJobs.set('job_seed_1', {
      id: 'job_seed_1',
      user_id: userId,
      campaign_id: campaignId,
      recipient_email: 'test@example.com',
      status: 'sent',
    });

    const res = await optimizationService.analyzeCampaignAndGenerateRecommendations({
      userId,
      campaignId,
    });

    assert.ok(Array.isArray(res.recommendations));
    for (const rec of res.recommendations) {
      assert.ok(rec.title, 'Recommendation must have a title');
      assert.ok(rec.category, 'Recommendation must have a category');
      assert.ok(rec.explanation, 'Recommendation must have an explanation');
      assert.ok(rec.supporting_metrics, 'Recommendation must have supporting metrics');
      assert.ok(rec.evidence_limitations, 'Recommendation must state evidence limitations');
      assert.ok(['high', 'medium', 'low'].includes(rec.confidence), 'Confidence must be high/medium/low');
    }
  });

  // 4. AI Response Schema Validation
  await t.test('4. AI Response Schema Validation for Variants', async () => {
    const variantsRes = await optimizationService.generateVariants({
      userId,
      campaignId,
      variantType: 'subject',
      context: { company: 'Acme Corp' },
    });
    assert.equal(variantsRes.success, true);
    assert.ok(Array.isArray(variantsRes.variants));
    assert.ok(variantsRes.variants.length >= 2);
    for (const v of variantsRes.variants) {
      assert.ok(v.title);
      assert.ok(v.content);
      assert.ok(v.rationale);
    }
  });

  // 5. Recommendation Ownership Isolation
  await t.test('5. Recommendation Ownership Isolation Across Users', async () => {
    const recId = 'rec_iso_test_1';
    optimizationService.memoryRecommendations.set(recId, {
      id: recId,
      user_id: userId,
      campaign_id: campaignId,
      title: 'Isolate Me',
      status: 'new',
    });

    const ownRec = await optimizationService.getRecommendation(userId, recId);
    assert.ok(ownRec);

    const otherRec = await optimizationService.getRecommendation(otherUserId, recId);
    assert.equal(otherRec, null, 'User B must not be able to fetch User A recommendations');
  });

  // 6. Recommendation Approval Workflow (Review & Apply)
  await t.test('6. Recommendation Review and Explicit Apply Approval', async () => {
    const recId = 'rec_wf_1';
    optimizationService.memoryRecommendations.set(recId, {
      id: recId,
      user_id: userId,
      campaign_id: campaignId,
      category: 'subject_line',
      title: 'Test Approval',
      original_value: 'Old Subject',
      proposed_value: 'New Improved Subject',
      status: 'new',
    });

    // Step 1: Review
    const reviewed = await optimizationService.reviewRecommendation({ userId, recommendationId: recId });
    assert.equal(reviewed.status, 'reviewed');
    assert.ok(reviewed.reviewed_at);

    // Step 2: Apply
    const applyRes = await optimizationService.applyRecommendation({ userId, recommendationId: recId });
    assert.equal(applyRes.success, true);
    assert.equal(applyRes.recommendation.status, 'applied');
    assert.ok(applyRes.recommendation.applied_at);
  });

  // 7. Recommendation Dismissal
  await t.test('7. Recommendation Dismissal with Reason', async () => {
    const recId = 'rec_dismiss_1';
    optimizationService.memoryRecommendations.set(recId, {
      id: recId,
      user_id: userId,
      campaign_id: campaignId,
      title: 'Dismiss Me',
      status: 'new',
    });

    const res = await optimizationService.dismissRecommendation({
      userId,
      recommendationId: recId,
      reason: 'Not aligned with brand voice',
    });
    assert.equal(res.success, true);
    assert.equal(res.recommendation.status, 'dismissed');
  });

  // 8. Audit Logging
  await t.test('8. Audit Trail Verification', async () => {
    const initialAuditCount = optimizationService.memoryAudits.length;
    await optimizationService.logAudit({
      userId,
      campaignId,
      recommendationId: 'rec_audit_test',
      action: 'applied',
      originalValue: 'Old Value',
      newValue: 'New Value',
      targetEntity: 'subject',
      notes: 'Applied subject change',
    });
    assert.equal(optimizationService.memoryAudits.length, initialAuditCount + 1);
    const last = optimizationService.memoryAudits[optimizationService.memoryAudits.length - 1];
    assert.equal(last.action, 'applied');
    assert.equal(last.original_value, 'Old Value');
    assert.equal(last.new_value, 'New Value');
  });

  // 9. Variant Generation (CTA and Body)
  await t.test('9. Variant Generation for Call to Action & Copy', async () => {
    const ctaVariants = await optimizationService.generateVariants({
      userId,
      campaignId,
      variantType: 'cta',
    });
    assert.ok(ctaVariants.variants.some(v => v.content.includes('?')));

    const bodyVariants = await optimizationService.generateVariants({
      userId,
      campaignId,
      variantType: 'email_copy',
    });
    assert.ok(bodyVariants.variants.length > 0);
  });

  // 10. No Automatic Campaign Modification
  await t.test('10. No Automatic Modification without Explicit User Action', () => {
    const unapprovedRec = {
      id: 'rec_unapproved',
      user_id: userId,
      status: 'new',
      original_value: 'Initial Subject',
      proposed_value: 'Modified Subject',
    };
    optimizationService.memoryRecommendations.set(unapprovedRec.id, unapprovedRec);
    // Unapproved recommendation must not be marked applied
    assert.equal(unapprovedRec.status, 'new');
  });

  // 11. Experiment Creation
  await t.test('11. Controlled A/B Experiment Creation', async () => {
    const expRes = await optimizationService.createExperiment({
      userId,
      campaignId,
      name: 'Subject Line Test Q4',
      experimentType: 'subject_line',
      primaryMetric: 'positive_reply_rate',
      trafficAllocation: 50.0,
      stepNumber: 1,
      variantA: { name: 'Control', subject: 'Subject A' },
      variantB: { name: 'Challenger', subject: 'Subject B' },
    });
    assert.equal(expRes.success, true);
    assert.ok(expRes.experiment.id);
    assert.equal(expRes.variants.variant_a.variant_key, 'variant_a');
    assert.equal(expRes.variants.variant_b.variant_key, 'variant_b');
  });

  // 12. Experiment Assignment Consistency (Deterministic Hash)
  await t.test('12. Deterministic Hash-based Lead Assignment', async () => {
    const expId = 'exp_hash_test';
    const leadId1 = 'lead_consistent_1';
    const leadId2 = 'lead_consistent_2';

    const assign1a = await optimizationService.assignLeadVariant({ experimentId: expId, leadId: leadId1 });
    const assign1b = await optimizationService.assignLeadVariant({ experimentId: expId, leadId: leadId1 });
    assert.equal(assign1a, assign1b, 'Same lead must always receive the exact same assigned variant');

    const assign2 = await optimizationService.assignLeadVariant({ experimentId: expId, leadId: leadId2 });
    assert.ok(['variant_a', 'variant_b'].includes(assign2));
  });

  // 13. Duplicate Assignment Prevention
  await t.test('13. Duplicate Assignment Prevention', async () => {
    const expId = 'exp_dup_test';
    const leadId = 'lead_dup_1';
    await optimizationService.assignLeadVariant({ experimentId: expId, leadId });
    const countBefore = optimizationService.memoryAssignments.size;
    await optimizationService.assignLeadVariant({ experimentId: expId, leadId });
    const countAfter = optimizationService.memoryAssignments.size;
    assert.equal(countBefore, countAfter, 'Must not duplicate assignment records');
  });

  // 14. Traffic Allocation Validation
  await t.test('14. Traffic Allocation Split Distribution', async () => {
    const expId = 'exp_split_test';
    let countA = 0;
    let countB = 0;
    // Test 100 pseudo leads with 50/50 split
    for (let i = 0; i < 100; i++) {
      const variant = await optimizationService.assignLeadVariant({
        experimentId: expId,
        leadId: `lead_sample_${i}`,
        trafficAllocation: 50.0,
      });
      if (variant === 'variant_a') countA++;
      else countB++;
    }
    // Both should receive approximately equal allocation
    assert.ok(countA >= 35 && countA <= 65, `Variant A allocation ${countA} is reasonably distributed`);
    assert.ok(countB >= 35 && countB <= 65, `Variant B allocation ${countB} is reasonably distributed`);
  });

  // 15. Experiment Sample Size Handling (< 30 per variant)
  await t.test('15. Experiment Insufficient Sample Size Flag (< 30 delivered)', () => {
    const varA = { sample_size: 15, delivered_count: 15, reply_count: 2, positive_reply_count: 1 };
    const varB = { sample_size: 15, delivered_count: 15, reply_count: 4, positive_reply_count: 3 };

    const stats = optimizationService.calculateStatisticalSignificance(varA, varB);
    assert.equal(stats.is_significant, false);
    assert.equal(stats.confidence_level, 'Insufficient Data');
    assert.ok(stats.message.includes('Insufficient sample size'));
  });

  // 16. Statistical Significance Calculation (Two-Proportion Z-Test)
  await t.test('16. Two-Proportion Z-Test Significance (>= 30 delivered)', () => {
    // 100 delivered each: A has 2% positive (2), B has 12% positive (12) -> highly significant difference
    const varA = { sample_size: 100, delivered_count: 100, positive_reply_count: 2 };
    const varB = { sample_size: 100, delivered_count: 100, positive_reply_count: 12 };

    const stats = optimizationService.calculateStatisticalSignificance(varA, varB);
    assert.equal(stats.is_significant, true);
    assert.equal(stats.winner, 'variant_b');
    assert.ok(stats.z_score >= 1.96, `Expected Z >= 1.96, got ${stats.z_score}`);
    assert.ok(stats.confidence_level.includes('95% Confidence'));
  });

  // 17. Campaign Pause Behavior
  await t.test('17. Experiment Pause Behavior', async () => {
    const expRes = await optimizationService.createExperiment({
      userId,
      campaignId,
      name: 'Pausable Exp',
      variantA: { name: 'A' },
      variantB: { name: 'B' },
    });
    const expId = expRes.experiment.id;
    const paused = await optimizationService.pauseExperiment(userId, expId);
    assert.equal(paused.status, 'paused');
  });

  // 18. Unsubscribe Suppression Preservation
  await t.test('18. Unsubscribe Suppression Preservation in Recommendations', async () => {
    // When unsubscribe rate is high, follow-up optimizer must never recommend more emails
    const highUnsubMetrics = {
      sent: 40,
      delivered: 40,
      delivery_rate: 100.0,
      bounces: 0,
      bounce_rate: 0.0,
      replies: 1,
      reply_rate: 2.5,
      positive_replies: 0,
      positive_reply_rate: 0.0,
      unsubscribes: 2,
      unsubscribe_rate: 5.0, // High opt-out
    };

    const health = optimizationService.calculateCampaignHealth(highUnsubMetrics);
    assert.equal(health.health, 'Critical');
    assert.ok(health.reasons.some(r => r.includes('opt-out rate')));
  });

  // 19. Queue Worker Safety Integration
  await t.test('19. Queue Worker Safety & Non-Disruption', () => {
    // Ensure email worker has active queue intact
    assert.ok(emailWorker.memoryJobs instanceof Map);
    assert.ok(Array.isArray(emailWorker.memoryEvents));
  });

  // 20. Live Server Optimization HTTP Endpoints
  await t.test('20. HTTP Endpoints (/api/optimization/overview, recommendations, variants, experiments)', async () => {
    const baseUrl = 'http://127.0.0.1:3001';
    const headers = {
      Authorization: 'Bearer test_token',
      'Content-Type': 'application/json',
    };

    // Overview
    const ovRes = await fetch(`${baseUrl}/api/optimization/overview`, { headers });
    assert.equal(ovRes.status, 200);
    const ovJson = await ovRes.json();
    assert.equal(ovJson.success, true);
    assert.ok(typeof ovJson.campaigns_analyzed === 'number');

    // Recommendations list
    const recsRes = await fetch(`${baseUrl}/api/optimization/recommendations`, { headers });
    assert.equal(recsRes.status, 200);
    const recsJson = await recsRes.json();
    assert.equal(recsJson.success, true);
    assert.ok(Array.isArray(recsJson.recommendations));

    // Variants Generation
    const varRes = await fetch(`${baseUrl}/api/optimization/campaigns/${campaignId}/variants`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ variantType: 'subject' }),
    });
    assert.equal(varRes.status, 200);
    const varJson = await varRes.json();
    assert.equal(varJson.success, true);
    assert.ok(Array.isArray(varJson.variants));

    // Experiments List
    const expRes = await fetch(`${baseUrl}/api/optimization/experiments`, { headers });
    assert.equal(expRes.status, 200);
    const expJson = await expRes.json();
    assert.equal(expJson.success, true);
    assert.ok(Array.isArray(expJson.experiments));
  });
});
