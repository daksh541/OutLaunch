import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CustomerHealthService, CUSTOMER_HEALTH_MODEL_VERSION } from '../server/customerHealthService.mjs';
import { CustomerRenewalService } from '../server/customerRenewalService.mjs';
import { CustomerExpansionService } from '../server/customerExpansionService.mjs';
import { CustomerSuccessPlanService } from '../server/customerSuccessPlanService.mjs';
import { CrmService } from '../server/crmService.mjs';
import { EmailQueueWorker } from '../server/emailQueueWorker.mjs';
import { InboundEmailService } from '../server/inboundEmailService.mjs';

test('AI Customer Success & Renewal Intelligence Module Test Suite', async (t) => {
  const workspaceA = 'workspace-cs-alpha';
  const workspaceB = 'workspace-cs-beta';
  const repUser1 = 'user-cs-rep-1';
  const repUser2 = 'user-cs-rep-2';
  const managerUser = 'user-cs-manager-1';

  // Mock Supabase client
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => null,
            order: () => ({ data: [] }),
            limit: () => ({ maybeSingle: async () => null }),
          }),
          maybeSingle: async () => null,
          order: () => ({ data: [] }),
          limit: () => ({ maybeSingle: async () => null }),
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
  const inboundService = new InboundEmailService(mockSupabase, emailWorker, { webhookSecret: 'test_cs_secret' });
  const crmService = new CrmService(mockSupabase, emailWorker, inboundService);

  const healthService = new CustomerHealthService(mockSupabase, crmService);
  const renewalService = new CustomerRenewalService(mockSupabase, healthService, crmService);
  const expansionService = new CustomerExpansionService(mockSupabase, healthService, crmService);
  const planService = new CustomerSuccessPlanService(
    mockSupabase,
    healthService,
    renewalService,
    expansionService,
    crmService
  );

  // Helper to seed a CRM lead without modifying it from CS services
  function seedLead(workspaceId, leadData = {}) {
    const leadId = leadData.id || `lead_cs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: leadId,
      user_id: leadData.user_id || repUser1,
      workspace_id: workspaceId,
      company: leadData.company !== undefined ? leadData.company : 'Apex Cloud Inc',
      company_domain: leadData.company_domain !== undefined ? leadData.company_domain : 'apexcloud.io',
      full_name: leadData.full_name !== undefined ? leadData.full_name : 'Elena Rostova',
      job_title: leadData.job_title !== undefined ? leadData.job_title : 'VP of Revenue Operations',
      email: leadData.email !== undefined ? leadData.email : 'elena@apexcloud.io',
      industry: leadData.industry !== undefined ? leadData.industry : 'Software',
      location: leadData.location !== undefined ? leadData.location : 'New York, NY, United States',
      stage: leadData.stage || 'Won',
      status: leadData.status || 'Replied',
      deal_value: leadData.deal_value !== undefined ? leadData.deal_value : 48000,
      probability: leadData.probability !== undefined ? leadData.probability : 100,
      currency: leadData.currency || 'USD',
      last_activity_at: leadData.last_activity_at !== undefined ? leadData.last_activity_at : new Date().toISOString(),
    };
    crmService._setMemoryLead(leadId, record);
    return record;
  }

  // 1. Customer success account creation
  await t.test('1. Customer success account creation', async () => {
    const lead = seedLead(workspaceA, { company: 'HyperScale Systems', deal_value: 60000 });
    const renewalDate = new Date(Date.now() + 86400000 * 120).toISOString();

    const account = await healthService.createAccount({
      workspaceId: workspaceA,
      userId: repUser1,
      leadId: lead.id,
      customerStatus: 'active',
      contractValue: 60000,
      currency: 'USD',
      renewalDate,
      renewalProbability: 90,
      successObjectives: [
        { id: 'obj_1', title: 'Deploy automated sequence workflows', status: 'completed', progress: 100 },
        { id: 'obj_2', title: 'Train 15 SDRs on AI research', status: 'completed', progress: 100 },
      ],
      lastCustomerReviewAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    });

    assert.ok(account.id);
    assert.equal(account.workspace_id, workspaceA);
    assert.equal(account.lead_id, lead.id);
    assert.equal(account.company, 'HyperScale Systems');
    assert.equal(account.contract_value, 60000);
    assert.equal(account.currency, 'USD');
    assert.ok(account.health_score >= 70);
  });

  // 2. Duplicate account prevention
  await t.test('2. Duplicate account prevention in the same workspace', async () => {
    const lead = seedLead(workspaceA, { company: 'Unique Customer Co' });

    await healthService.createAccount({
      workspaceId: workspaceA,
      userId: repUser1,
      leadId: lead.id,
      contractValue: 24000,
    });

    await assert.rejects(
      async () => {
        await healthService.createAccount({
          workspaceId: workspaceA,
          userId: repUser1,
          leadId: lead.id,
          contractValue: 24000,
        });
      },
      /Duplicate customer success profile/
    );
  });

  // 3. Health score determinism
  await t.test('3. Health score determinism (v1.0.0)', async () => {
    const lead = seedLead(workspaceA, { company: 'Deterministic SaaS' });
    const account = await healthService.createAccount({
      workspaceId: workspaceA,
      userId: repUser1,
      leadId: lead.id,
      contractValue: 36000,
      renewalDate: new Date(Date.now() + 86400000 * 100).toISOString(),
      renewalProbability: 85,
      successObjectives: [{ id: 'o1', title: 'Onboarding complete', status: 'completed', progress: 100 }],
      lastCustomerReviewAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    });

    const run1 = healthService.calculateHealthScore(account, { lead });
    const run2 = healthService.calculateHealthScore(account, { lead });

    assert.equal(run1.health_score, run2.health_score);
    assert.equal(run1.health_status, run2.health_status);
    assert.deepEqual(run1.component_scores, run2.component_scores);
    assert.equal(run1.model_version, CUSTOMER_HEALTH_MODEL_VERSION);
  });

  // 4. Health score bounds ([0, 100])
  await t.test('4. Health score bounds ([0, 100] guaranteed under extreme inputs)', async () => {
    const leadPerfect = seedLead(workspaceA, { company: 'Max Health Corp' });
    const acctMax = await healthService.createAccount({
      workspaceId: workspaceA,
      userId: repUser1,
      leadId: leadPerfect.id,
      contractValue: 250000,
      renewalDate: new Date(Date.now() + 86400000 * 180).toISOString(),
      renewalProbability: 100,
      successObjectives: [{ id: '1', title: 'Goal 1', status: 'completed', progress: 100 }],
      lastCustomerReviewAt: new Date().toISOString(),
    });

    await healthService.recordActivity({
      workspaceId: workspaceA,
      accountId: acctMax.id,
      activityType: 'meeting',
      title: 'Executive QBR 1',
    });
    await healthService.recordActivity({
      workspaceId: workspaceA,
      accountId: acctMax.id,
      activityType: 'call',
      title: 'Check-in Call 2',
    });
    await healthService.recordActivity({
      workspaceId: workspaceA,
      accountId: acctMax.id,
      activityType: 'email_reply',
      title: 'Stakeholder Reply',
    });
    await healthService.recordActivity({
      workspaceId: workspaceA,
      accountId: acctMax.id,
      activityType: 'renewal_discussion',
      title: 'Early Renewal Confirmation',
    });

    const maxScoreRes = await healthService.getAccountHealth({ workspaceId: workspaceA, accountId: acctMax.id });
    assert.ok(maxScoreRes.health_score >= 0 && maxScoreRes.health_score <= 100);
    assert.equal(maxScoreRes.health_status, 'Healthy');

    // Churned / worst case account
    const leadMin = seedLead(workspaceA, { company: 'Min Health Corp' });
    const acctMin = await healthService.createAccount({
      workspaceId: workspaceA,
      userId: repUser1,
      leadId: leadMin.id,
      customerStatus: 'churned',
      contractValue: 0,
      renewalProbability: 0,
    });

    const minScoreRes = healthService.calculateHealthScore(acctMin, { lead: leadMin });
    assert.ok(minScoreRes.health_score >= 0 && minScoreRes.health_score <= 100);
    assert.equal(minScoreRes.health_status, 'Critical');
  });

  // 5. Missing data and insufficient-data handling
  await t.test('5. Missing data and insufficient-data handling (no fabricated telemetry)', async () => {
    const emptyAccount = {
      id: 'acct-empty-evidence',
      workspace_id: workspaceA,
      lead_id: 'non-existent-lead',
      account_owner_id: null,
      customer_status: 'active',
      contract_value: 0,
      renewal_date: null,
      contract_end_date: null,
      success_objectives: [],
      last_customer_review_at: null,
    };

    const health = healthService.calculateHealthScore(emptyAccount, {
      lead: null,
      activities: [],
    });

    assert.equal(health.health_status, 'Insufficient Data');
    assert.ok(health.health_score < 40, 'Missing data must never produce a high health score');
    assert.ok(
      health.missing_data.some((m) => m.includes('Live product usage telemetry not connected')),
      'Must explicitly report unconnected product usage telemetry as unavailable'
    );
    assert.ok(
      health.missing_data.some((m) => m.includes('External support ticket system not connected')),
      'Must explicitly report unconnected support system as unavailable'
    );
  });

  // 6. AI explanation cannot modify health score
  await t.test('6. AI explanation cannot modify deterministic health score', async () => {
    const lead = seedLead(workspaceA, { company: 'Audit Lock Co' });
    const account = await healthService.createAccount({
      workspaceId: workspaceA,
      userId: repUser1,
      leadId: lead.id,
      contractValue: 40000,
      renewalDate: new Date(Date.now() + 86400000 * 75).toISOString(),
    });

    const deterministic = healthService.calculateHealthScore(account, { lead });
    const withAiExplanation = healthService.generateHealthExplanation(
      account,
      deterministic,
      'AI narrative suggests customer is 100/100 Healthy despite deterministic score.'
    );

    assert.equal(withAiExplanation.health_score, deterministic.health_score);
    assert.equal(withAiExplanation.health_status, deterministic.health_status);
    assert.deepEqual(withAiExplanation.component_scores, deterministic.component_scores);
  });

  // 7. Evidence-backed churn risk factors (and low email activity alone does not infer churn)
  await t.test('7. Evidence-backed churn risk factors & no churn inferred solely from low email activity', async () => {
    const leadRisky = seedLead(workspaceA, { company: 'AtRisk Enterprise' });
    const acctRisky = await healthService.createAccount({
      workspaceId: workspaceA,
      userId: repUser1,
      leadId: leadRisky.id,
      contractValue: 85000,
      // Approaching renewal in 20 days without renewal_discussion
      renewalDate: new Date(Date.now() + 86400000 * 20).toISOString(),
      successObjectives: [
        { id: 'o1', title: 'Phase 1 Integration', status: 'pending', progress: 0 },
        { id: 'o2', title: 'Team Rollout', status: 'pending', progress: 0 },
      ],
      // Overdue review (> 90 days ago)
      lastCustomerReviewAt: new Date(Date.now() - 86400000 * 120).toISOString(),
    });

    const riskResult = renewalService.evaluateAccountChurnRisk(acctRisky, {
      meetings: [
        { id: 'mtg_1', status: 'cancelled' },
        { id: 'mtg_2', status: 'no_show' },
      ],
      callInsights: [
        {
          id: 'call_99',
          sentiment: 'negative',
          unresolvedObjections: 1,
          primaryObjection: 'Pricing tier mismatch for Q4 renewal',
          customerFeedback: 'Platform reporting latency needs resolution before renewal sign-off',
        },
      ],
    });

    assert.ok(riskResult.risk_score >= 60);
    assert.ok(riskResult.risk_factors.length >= 4);

    // Every risk factor must contain evidence and source
    for (const rf of riskResult.risk_factors) {
      assert.ok(rf.factor);
      assert.ok(rf.evidence && rf.evidence.length > 5);
      assert.ok(rf.source && rf.source.length > 3);
    }

    // Verify an account with healthy review, distant renewal, completed objectives, and 0 email replies has 0 churn risk factors
    const leadQuietEmail = seedLead(workspaceA, { company: 'Quiet Email Healthy Corp', status: 'New' });
    const acctQuietEmail = await healthService.createAccount({
      workspaceId: workspaceA,
      userId: repUser1,
      leadId: leadQuietEmail.id,
      contractValue: 30000,
      renewalDate: new Date(Date.now() + 86400000 * 150).toISOString(),
      successObjectives: [{ id: 'o1', title: 'Go-live', status: 'completed', progress: 100 }],
      lastCustomerReviewAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    });

    const quietRisk = renewalService.evaluateAccountChurnRisk(acctQuietEmail, {
      activities: [
        {
          id: 'act_mtg',
          activity_type: 'meeting',
          title: 'Monthly Alignment',
          activity_date: new Date(Date.now() - 86400000 * 10).toISOString(),
        },
      ],
    });

    assert.equal(quietRisk.risk_score, 0, 'Low email activity alone must never trigger churn risk');
    assert.equal(quietRisk.risk_factors.length, 0);
  });

  // 8. Renewal date and period filtering
  await t.test('8. Renewal date and period filtering', async () => {
    const wsFilter = 'workspace-renewal-filter';
    const lead1 = seedLead(wsFilter, { company: 'Month 1 Renewal' });
    const lead2 = seedLead(wsFilter, { company: 'Month 4 Renewal' });

    const acct1 = await healthService.createAccount({
      workspaceId: wsFilter,
      leadId: lead1.id,
      contractValue: 20000,
    });
    const acct2 = await healthService.createAccount({
      workspaceId: wsFilter,
      leadId: lead2.id,
      contractValue: 40000,
    });

    await renewalService.createRenewalOpportunity({
      workspaceId: wsFilter,
      accountId: acct1.id,
      renewalDate: '2027-02-15T00:00:00.000Z',
      contractValue: 20000,
    });
    await renewalService.createRenewalOpportunity({
      workspaceId: wsFilter,
      accountId: acct2.id,
      renewalDate: '2027-06-15T00:00:00.000Z',
      contractValue: 40000,
    });

    const q1Renewals = await renewalService.getRenewals({
      workspaceId: wsFilter,
      startDate: '2027-01-01T00:00:00.000Z',
      endDate: '2027-03-31T23:59:59.000Z',
    });

    assert.equal(q1Renewals.length, 1);
    assert.equal(q1Renewals[0].contract_value, 20000);
  });

  // 9. Renewal forecast calculations
  await t.test('9. Deterministic renewal forecast calculations (distinguishes expected vs realized)', async () => {
    const wsForecast = 'workspace-forecast-math';
    const l1 = seedLead(wsForecast, { company: 'Open Safe Co' });
    const l2 = seedLead(wsForecast, { company: 'Open AtRisk Co' });
    const l3 = seedLead(wsForecast, { company: 'Realized Renewed Co' });
    const l4 = seedLead(wsForecast, { company: 'Churned Lost Co' });

    const a1 = await healthService.createAccount({ workspaceId: wsForecast, leadId: l1.id, contractValue: 50000 });
    const a2 = await healthService.createAccount({ workspaceId: wsForecast, leadId: l2.id, contractValue: 40000 });
    const a3 = await healthService.createAccount({ workspaceId: wsForecast, leadId: l3.id, contractValue: 60000 });
    const a4 = await healthService.createAccount({ workspaceId: wsForecast, leadId: l4.id, contractValue: 20000 });

    // Open renewal 1: $50,000 @ 80% prob (weighted = $40,000), risk_score = 15
    await renewalService.createRenewalOpportunity({
      workspaceId: wsForecast,
      accountId: a1.id,
      renewalDate: '2027-03-10T00:00:00.000Z',
      contractValue: 50000,
      currency: 'USD',
      renewalStatus: 'upcoming',
      renewalProbability: 80,
      risk_score: 15,
    });

    // Open renewal 2 (At-Risk): $40,000 @ 50% prob (weighted = $20,000), risk_score = 65
    await renewalService.createRenewalOpportunity({
      workspaceId: wsForecast,
      accountId: a2.id,
      renewalDate: '2027-03-25T00:00:00.000Z',
      contractValue: 40000,
      currency: 'USD',
      renewalStatus: 'in_progress',
      renewalProbability: 50,
      risk_score: 65,
    });

    // Realized renewed: $60,000
    await renewalService.createRenewalOpportunity({
      workspaceId: wsForecast,
      accountId: a3.id,
      renewalDate: '2027-01-15T00:00:00.000Z',
      contractValue: 60000,
      currency: 'USD',
      renewalStatus: 'renewed',
      renewalProbability: 100,
      risk_score: 0,
    });

    // Churned lost: $20,000
    await renewalService.createRenewalOpportunity({
      workspaceId: wsForecast,
      accountId: a4.id,
      renewalDate: '2027-01-20T00:00:00.000Z',
      contractValue: 20000,
      currency: 'USD',
      renewalStatus: 'lost',
      renewalProbability: 0,
      risk_score: 100,
    });

    const fc = await renewalService.getRenewalForecast({ workspaceId: wsForecast, baseCurrency: 'USD' });

    // Upcoming open = 50,000 + 40,000 = 90,000
    assert.equal(fc.total_upcoming_renewal_value, 90000);
    // Weighted open = (50,000 * 0.8) + (40,000 * 0.5) = 40,000 + 20,000 = 60,000
    assert.equal(fc.weighted_renewal_value, 60000);
    // At-risk open = 40,000
    assert.equal(fc.at_risk_renewal_value, 40000);
    // Realized renewed = 60,000
    assert.equal(fc.realized_renewed_value, 60000);
    // Expected retained = realized (60,000) + weighted open (60,000) = 120,000
    assert.equal(fc.expected_retained_revenue, 120000);
    // Churned = 20,000
    assert.equal(fc.churned_contract_value, 20000);
    // Value renewal rate = 60,000 / (60,000 + 20,000) = 75%
    assert.equal(fc.renewal_rate_pct, 75);
    assert.ok(fc.by_month.length >= 2);
    assert.ok(fc.by_quarter.length >= 1);
  });

  // 10. Currency mismatch handling
  await t.test('10. Currency mismatch handling (never mixes currencies in totals)', async () => {
    const wsCurr = 'workspace-currency-safety';
    const lUsd = seedLead(wsCurr, { company: 'US Customer', currency: 'USD' });
    const lEur = seedLead(wsCurr, { company: 'EU Customer', currency: 'EUR' });

    const aUsd = await healthService.createAccount({
      workspaceId: wsCurr,
      leadId: lUsd.id,
      contractValue: 30000,
      currency: 'USD',
    });
    const aEur = await healthService.createAccount({
      workspaceId: wsCurr,
      leadId: lEur.id,
      contractValue: 25000,
      currency: 'EUR',
    });

    await renewalService.createRenewalOpportunity({
      workspaceId: wsCurr,
      accountId: aUsd.id,
      renewalDate: '2027-04-10T00:00:00.000Z',
      contractValue: 30000,
      currency: 'USD',
    });
    await renewalService.createRenewalOpportunity({
      workspaceId: wsCurr,
      accountId: aEur.id,
      renewalDate: '2027-04-12T00:00:00.000Z',
      contractValue: 25000,
      currency: 'EUR',
    });

    const fc = await renewalService.getRenewalForecast({ workspaceId: wsCurr, baseCurrency: 'USD' });
    assert.equal(fc.total_upcoming_renewal_value, 30000, 'EUR contract must not be summed into USD total');
    assert.deepEqual(fc.excluded_currencies, ['EUR']);
    assert.equal(fc.excluded_records_count, 1);
    assert.ok(fc.currency_mismatch_warning.includes('EUR'));
  });

  // 11. Renewal status transitions
  await t.test('11. Renewal status transitions and audit logging', async () => {
    const lead = seedLead(workspaceA, { company: 'Transition Test Corp' });
    const acct = await healthService.createAccount({
      workspaceId: workspaceA,
      leadId: lead.id,
      contractValue: 45000,
    });

    const renewal = await renewalService.createRenewalOpportunity({
      workspaceId: workspaceA,
      userId: repUser1,
      accountId: acct.id,
      contractValue: 45000,
      renewalStatus: 'upcoming',
    });

    const inProg = await renewalService.updateRenewalOpportunity({
      workspaceId: workspaceA,
      userId: repUser1,
      renewalId: renewal.id,
      renewal_status: 'in_progress',
    });
    assert.equal(inProg.renewal_status, 'in_progress');

    const renewed = await renewalService.updateRenewalOpportunity({
      workspaceId: workspaceA,
      userId: repUser1,
      renewalId: renewal.id,
      renewal_status: 'renewed',
    });
    assert.equal(renewed.renewal_status, 'renewed');
    assert.equal(renewed.renewal_probability, 100);
    assert.equal(renewed.risk_score, 0);

    // Verify audit log captured transitions
    const audits = renewalService.memoryAuditLog.filter((a) => a.entity_id === renewal.id);
    assert.ok(audits.length >= 3);
  });

  // 12. Historical health snapshot immutability
  await t.test('12. Historical health snapshot immutability', async () => {
    const lead = seedLead(workspaceA, { company: 'Immutable Snapshot Corp' });
    const acct = await healthService.createAccount({
      workspaceId: workspaceA,
      leadId: lead.id,
      contractValue: 32000,
    });

    await healthService.recalculateAccountHealth({ workspaceId: workspaceA, accountId: acct.id });
    const snapshots = await healthService.getHealthHistory({ workspaceId: workspaceA, accountId: acct.id });
    assert.ok(snapshots.length >= 2);

    const snap = snapshots[0];
    assert.equal(Object.isFrozen(snap), true);
    assert.equal(Object.isFrozen(snap.component_scores), true);

    // Attempting to mutate frozen snapshot property throws TypeError
    assert.throws(() => {
      snap.health_score = 999;
    }, TypeError);

    // Attempting to call updateHealthSnapshot or deleteHealthSnapshot throws Immutable Violation
    await assert.rejects(async () => {
      await healthService.updateHealthSnapshot(snap.id, { health_score: 100 });
    }, /Immutable Violation/);

    await assert.rejects(async () => {
      await healthService.deleteHealthSnapshot(snap.id);
    }, /Immutable Violation/);
  });

  // 13. Expansion opportunity evidence requirements
  await t.test('13. Expansion opportunity evidence & uninvented estimated value', async () => {
    const lead = seedLead(workspaceA, { company: 'Expansion Evidence Corp' });
    const acct = await healthService.createAccount({
      workspaceId: workspaceA,
      leadId: lead.id,
      contractValue: 0, // No baseline contract value to extrapolate from
    });

    // Rejects creation when evidence array is empty
    await assert.rejects(async () => {
      await expansionService.createExpansionOpportunity({
        workspaceId: workspaceA,
        accountId: acct.id,
        opportunityType: 'upsell',
        evidence: [],
      });
    }, /requires at least one supporting evidence/);

    // When identified from explicit qualitative signal without monetary figure and 0 contract_value, estimated_value must be null (never invented)
    const identified = await expansionService.identifyExpansionOpportunities({
      workspaceId: workspaceA,
      accountId: acct.id,
      explicitRequest: 'Customer inquired about adding EMEA team seats in Q3',
      explicitRequestSource: 'meeting_notes_q2',
    });

    assert.equal(identified.length, 1);
    assert.equal(identified[0].opportunity_type, 'seat_expansion');
    assert.equal(identified[0].estimated_value, null, 'Must not invent monetary budget when unsupported by evidence');
    assert.ok(identified[0].evidence.length >= 1);
    assert.equal(identified[0].status, 'suggested');
  });

  // 14. Expansion approval requirements
  await t.test('14. Expansion approval and dismissal workflow', async () => {
    const lead = seedLead(workspaceA, { company: 'Approval Workflow Co' });
    const acct = await healthService.createAccount({
      workspaceId: workspaceA,
      leadId: lead.id,
      contractValue: 80000,
    });

    const exp = await expansionService.createExpansionOpportunity({
      workspaceId: workspaceA,
      userId: repUser1,
      accountId: acct.id,
      opportunityType: 'cross_sell',
      estimatedValue: 20000,
      evidence: [{ source: 'call_transcript_12', detail: 'VP requested Call Intelligence module pricing' }],
    });

    assert.equal(exp.status, 'suggested');

    const approved = await expansionService.approveExpansionOpportunity({
      workspaceId: workspaceA,
      userId: managerUser,
      expansionId: exp.id,
    });
    assert.equal(approved.status, 'approved');
    assert.equal(approved.approved_by, managerUser);

    const dismissed = await expansionService.dismissExpansionOpportunity({
      workspaceId: workspaceA,
      userId: managerUser,
      expansionId: exp.id,
      reason: 'Customer postponed expansion to next fiscal year',
    });
    assert.equal(dismissed.status, 'dismissed');
  });

  // 15. Success plan generation and saving
  await t.test('15. Success plan generation separates verified facts from AI recommendations', async () => {
    const lead = seedLead(workspaceA, {
      company: 'Grounded Plan Enterprises',
      full_name: 'Marcus Vance',
      job_title: 'Chief Revenue Officer',
    });
    const acct = await healthService.createAccount({
      workspaceId: workspaceA,
      leadId: lead.id,
      contractValue: 72000,
    });

    const draft = await planService.generateSuccessPlanDraft({
      workspaceId: workspaceA,
      userId: repUser1,
      accountId: acct.id,
    });

    assert.equal(draft.status, 'draft');
    assert.equal(draft.is_saved, false);
    assert.ok(draft.grounding);
    assert.ok(draft.grounding.verified_facts.length >= 4);
    assert.ok(draft.grounding.ai_recommendations.length >= 3);
    assert.equal(draft.stakeholders.length, 1);
    assert.equal(draft.stakeholders[0].name, 'Marcus Vance');
    assert.equal(draft.stakeholders[0].verified, true);
  });

  // 16. AI recommendations require confirmation (no auto-saved active plans or auto-created CRM tasks)
  await t.test('16. AI recommendations require confirmation before activation', async () => {
    const lead = seedLead(workspaceA, { company: 'Explicit Confirmation Corp' });
    const acct = await healthService.createAccount({
      workspaceId: workspaceA,
      leadId: lead.id,
      contractValue: 55000,
    });

    const tasksBefore = crmService._getMemoryTasksList().length;

    // Generate draft
    const draft = await planService.generateSuccessPlanDraft({
      workspaceId: workspaceA,
      userId: repUser1,
      accountId: acct.id,
    });

    // Verify no plan was persisted yet and no CRM tasks were auto-created
    const existingPlans = await planService.getSuccessPlans({
      workspaceId: workspaceA,
      accountId: acct.id,
    });
    assert.equal(existingPlans.length, 0);
    assert.equal(crmService._getMemoryTasksList().length, tasksBefore, 'AI tasks must not be created automatically');

    // User explicitly saves plan (in review status)
    const saved = await planService.createSuccessPlan({
      ...draft,
      workspaceId: workspaceA,
      userId: repUser1,
      status: 'review',
    });
    assert.equal(saved.status, 'review');

    // User explicitly approves plan -> becomes active
    const approved = await planService.approveSuccessPlan({
      workspaceId: workspaceA,
      userId: managerUser,
      planId: saved.id,
    });
    assert.equal(approved.status, 'active');
  });

  // 17. Workspace isolation
  await t.test('17. Workspace isolation across accounts, renewals, expansions, and plans', async () => {
    const leadA = seedLead(workspaceA, { company: 'Tenant Alpha Only' });
    const acctA = await healthService.createAccount({
      workspaceId: workspaceA,
      leadId: leadA.id,
      contractValue: 50000,
    });

    // Workspace B cannot list or fetch Workspace A account
    const listB = await healthService.getAccounts({ workspaceId: workspaceB });
    assert.equal(
      listB.find((a) => a.id === acctA.id),
      undefined
    );

    await assert.rejects(async () => {
      await healthService.getAccountById({ workspaceId: workspaceB, accountId: acctA.id });
    }, /not found in workspace/);

    await assert.rejects(async () => {
      await renewalService.createRenewalOpportunity({
        workspaceId: workspaceB,
        accountId: acctA.id,
        contractValue: 50000,
      });
    }, /Forbidden/);
  });

  // 18. RBAC enforcement
  await t.test('18. Role-Based Access Control (RBAC) enforcement', async () => {
    const baseUrl = 'http://127.0.0.1:3001';

    // Non-manager rep attempting to assign account ownership to a different rep must return 403
    const forbiddenRes = await fetch(`${baseUrl}/api/customer-success/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-user-rep-1',
      },
      body: JSON.stringify({
        lead_id: `lead_rbac_${Date.now()}`,
        account_owner_id: 'other-user-999',
        contract_value: 30000,
      }),
    });
    assert.equal(forbiddenRes.status, 403);
  });

  // 19. Live HTTP API Authentication
  await t.test('19. Live HTTP API Authentication (401 on missing token, 200/201 on valid token)', async () => {
    const baseUrl = 'http://127.0.0.1:3001';

    // 1. Unauthenticated request must return 401
    const unauthRes = await fetch(`${baseUrl}/api/customer-success/accounts`);
    assert.equal(unauthRes.status, 401);

    // 2. Manager creating an account over HTTP succeeds with 201
    const uniqueLeadId = `lead_http_${Date.now()}`;
    const managerCreateRes = await fetch(`${baseUrl}/api/customer-success/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-user-manager-1',
      },
      body: JSON.stringify({
        lead_id: uniqueLeadId,
        account_owner_id: repUser2,
        contract_value: 42000,
      }),
    });
    assert.equal(managerCreateRes.status, 201);
    const createdJson = await managerCreateRes.json();
    assert.ok(createdJson.account.id);

    // 3. Fetch renewal forecast over HTTP
    const fcRes = await fetch(`${baseUrl}/api/customer-success/renewals/forecast`, {
      headers: { Authorization: 'Bearer test-user-manager-1' },
    });
    assert.equal(fcRes.status, 200);
  });

  // 20. No unsolicited CRM modifications
  await t.test('20. Financial and CRM integrity: Zero unsolicited CRM modifications', async () => {
    const pristineLead = seedLead(workspaceA, {
      company: 'Pristine CRM Record Ltd',
      deal_value: 95000,
      stage: 'Won',
      probability: 100,
    });
    const dealsCountBefore = crmService._getMemoryDealsList ? crmService._getMemoryDealsList().length : 0;

    const acct = await healthService.createAccount({
      workspaceId: workspaceA,
      leadId: pristineLead.id,
      contractValue: 95000,
    });

    await healthService.recalculateAccountHealth({ workspaceId: workspaceA, accountId: acct.id });
    await renewalService.createRenewalOpportunity({
      workspaceId: workspaceA,
      accountId: acct.id,
      contractValue: 95000,
    });
    await expansionService.identifyExpansionOpportunities({
      workspaceId: workspaceA,
      accountId: acct.id,
      explicitRequest: 'Interested in multi-team expansion',
    });
    await planService.generateSuccessPlanDraft({
      workspaceId: workspaceA,
      accountId: acct.id,
    });

    const leadAfter = crmService._getMemoryLead(pristineLead.id);
    const dealsCountAfter = crmService._getMemoryDealsList ? crmService._getMemoryDealsList().length : 0;

    assert.equal(leadAfter.deal_value, 95000);
    assert.equal(leadAfter.stage, 'Won');
    assert.equal(leadAfter.probability, 100);
    assert.equal(dealsCountAfter, dealsCountBefore, 'No unsolicited CRM deals may be created');
  });
});
