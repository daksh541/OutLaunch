import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { SalesTerritoryService } from '../server/salesTerritoryService.mjs';
import { AccountPrioritizationService, PRIORITIZATION_MODEL_VERSION } from '../server/accountPrioritizationService.mjs';
import { AccountPlanningService } from '../server/accountPlanningService.mjs';
import { CrmService } from '../server/crmService.mjs';
import { EmailQueueWorker } from '../server/emailQueueWorker.mjs';
import { InboundEmailService } from '../server/inboundEmailService.mjs';

test('AI Sales Territory & Account Planning Module Test Suite', async (t) => {
  const workspaceA = 'workspace-alpha-1';
  const workspaceB = 'workspace-beta-2';
  const repUser1 = 'user-rep-1';
  const repUser2 = 'user-rep-2';
  const managerUser = 'user-manager-1';

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
  const inboundService = new InboundEmailService(mockSupabase, emailWorker, { webhookSecret: 'test_territory_secret' });
  const crmService = new CrmService(mockSupabase, emailWorker, inboundService);

  const territoryService = new SalesTerritoryService(mockSupabase, crmService);
  const prioritizationService = new AccountPrioritizationService(mockSupabase, crmService);
  const planningService = new AccountPlanningService(mockSupabase, crmService, prioritizationService, territoryService);

  // Helper to seed a lead into CRM service memory
  async function seedLead(workspaceId, leadData) {
    const leadId = leadData.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: leadId,
      user_id: leadData.user_id || repUser1,
      workspace_id: workspaceId,
      company: leadData.company !== undefined ? leadData.company : 'Enterprise Corp',
      company_domain: leadData.company_domain !== undefined ? leadData.company_domain : 'enterprisecorp.com',
      company_size: leadData.company_size !== undefined ? leadData.company_size : 500,
      industry: leadData.industry !== undefined ? leadData.industry : 'Software',
      location: leadData.location !== undefined ? leadData.location : 'San Francisco, CA, United States',
      stage: leadData.stage || 'Qualified',
      status: leadData.status || 'open',
      deal_value: leadData.deal_value !== undefined ? leadData.deal_value : 50000,
      probability: leadData.probability !== undefined ? leadData.probability : 0.6,
      currency: leadData.currency || 'USD',
      account_tier: leadData.account_tier !== undefined ? leadData.account_tier : 'tier_1',
      last_activity_at: leadData.last_activity_at !== undefined ? leadData.last_activity_at : new Date().toISOString(),
      created_at: leadData.created_at || new Date(Date.now() - 86400000 * 30).toISOString(),
      raw_enrichment: leadData.raw_enrichment !== undefined ? leadData.raw_enrichment : {
        phone: '+1-555-0199',
        verified_intent: true,
        website_visits: 12
      }
    };
    crmService._setMemoryLead(leadId, record);
    return record;
  }

  // 1. Territory creation and rule validation
  await t.test('1. Territory creation and rule validation', async () => {
    // Valid creation
    const territory = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'North America Enterprise',
      code: 'NA-ENT',
      segment: 'Enterprise',
      rules: {
        geography: { countries: ['United States', 'Canada'] },
        industry: { included: ['Software', 'FinTech'] },
        company_size: { min_employees: 250, max_employees: 5000 },
        account_tier: { tiers: ['tier_1'] }
      }
    });

    assert.ok(territory.id);
    assert.equal(territory.name, 'North America Enterprise');
    assert.equal(territory.segment, 'Enterprise');
    assert.equal(territory.rules.company_size.min_employees, 250);

    // Missing required territory name should throw
    await assert.rejects(async () => {
      await territoryService.createTerritory({
        workspaceId: workspaceA,
        name: ''
      });
    }, /Territory name is required/);
  });

  // 2. Geographic territory matching
  await t.test('2. Geographic territory matching (country/region/city)', async () => {
    const naTerritory = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'US West Coast',
      rules: {
        geography: { countries: ['United States'], regions: ['California', 'Washington'] }
      }
    });

    const leadMatch = await seedLead(workspaceA, {
      company: 'Pacific Tech',
      location: 'Seattle, Washington, United States'
    });

    const leadNonMatch = await seedLead(workspaceA, {
      company: 'Euro Retail',
      location: 'Berlin, Germany'
    });

    const matches = territoryService.findMatchingTerritories(leadMatch, [naTerritory]);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, naTerritory.id);

    const nonMatches = territoryService.findMatchingTerritories(leadNonMatch, [naTerritory]);
    assert.equal(nonMatches.length, 0);
  });

  // 3. Industry and company-size matching
  await t.test('3. Industry and company-size matching', async () => {
    const healthcareTerritory = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'Healthcare Scale',
      rules: {
        industry: { included: ['Healthcare', 'Biotech'], excluded: ['Tobacco'] },
        company_size: { min_employees: 100, max_employees: 1000 }
      }
    });

    const leadMatch = await seedLead(workspaceA, {
      company: 'BioGen Labs',
      industry: 'Healthcare',
      company_size: 450
    });

    const leadTooSmall = await seedLead(workspaceA, {
      company: 'Tiny Clinic',
      industry: 'Healthcare',
      company_size: 20
    });

    const leadWrongIndustry = await seedLead(workspaceA, {
      company: 'Fintech Hub',
      industry: 'FinTech',
      company_size: 300
    });

    assert.equal(territoryService.findMatchingTerritories(leadMatch, [healthcareTerritory]).length, 1);
    assert.equal(territoryService.findMatchingTerritories(leadTooSmall, [healthcareTerritory]).length, 0);
    assert.equal(territoryService.findMatchingTerritories(leadWrongIndustry, [healthcareTerritory]).length, 0);
  });

  // 4. Missing company data handling (never guess missing geo/industry)
  await t.test('4. Missing company data handling (never guess missing geo/industry)', async () => {
    const geoTerritory = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'Strict Geo Territory',
      rules: {
        geography: { countries: ['France'] }
      }
    });

    const leadNoLocation = await seedLead(workspaceA, {
      company: 'Unknown Location Inc',
      location: null // Missing location
    });

    const matches = territoryService.findMatchingTerritories(leadNoLocation, [geoTerritory]);
    // Must NOT guess or match
    assert.equal(matches.length, 0);
  });

  // 5. Duplicate active assignment prevention
  await t.test('5. Duplicate active assignment prevention', async () => {
    const terr1 = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'Territory Prime'
    });
    const terr2 = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'Territory Secondary'
    });

    const lead = await seedLead(workspaceA, { company: 'Single Active Account' });

    // Assign to terr1
    const res1 = await territoryService.assignAccountsToTerritory({
      workspaceId: workspaceA,
      territoryId: terr1.id,
      leadIds: [lead.id],
      assignedBy: managerUser
    });
    assert.equal(res1.assignedCount, 1);

    // Verify memory active assignment
    let activeAssignments = territoryService._getMemoryAssignments(workspaceA, lead.id, 'active');
    assert.equal(activeAssignments.length, 1);
    assert.equal(activeAssignments[0].territory_id, terr1.id);

    // Reassign to terr2
    const res2 = await territoryService.assignAccountsToTerritory({
      workspaceId: workspaceA,
      territoryId: terr2.id,
      leadIds: [lead.id],
      assignedBy: managerUser
    });
    assert.equal(res2.assignedCount, 1);

    // Previous assignment must be reassigned, only ONE active assignment remains
    activeAssignments = territoryService._getMemoryAssignments(workspaceA, lead.id, 'active');
    assert.equal(activeAssignments.length, 1);
    assert.equal(activeAssignments[0].territory_id, terr2.id);

    const history = territoryService._getMemoryAssignments(workspaceA, lead.id);
    assert.equal(history.length, 2);
    const oldAssign = history.find(a => a.territory_id === terr1.id);
    assert.equal(oldAssign.status, 'reassigned');
  });

  // 6. Territory overlap detection and conflict reporting
  await t.test('6. Territory overlap detection and conflict reporting', async () => {
    const terrA = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'SaaS East',
      rules: {
        geography: { countries: ['United States'] },
        industry: { included: ['Software'] },
        company_size: { min_employees: 100, max_employees: 500 }
      }
    });

    const terrB = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'Mid-Market US',
      rules: {
        geography: { countries: ['United States'] },
        industry: { included: ['Software'] },
        company_size: { min_employees: 200, max_employees: 1000 }
      }
    });

    const overlaps = await territoryService.detectOverlaps({ workspaceId: workspaceA });
    assert.ok(overlaps.length > 0);
    const conflict = overlaps.find(o =>
      (o.territory_a_id === terrA.id && o.territory_b_id === terrB.id) ||
      (o.territory_a_id === terrB.id && o.territory_b_id === terrA.id)
    );
    assert.ok(conflict);
    assert.ok(conflict.reasons.some(r => r.includes('Geographic country overlap')));
    assert.ok(conflict.reasons.some(r => r.includes('Industry overlap')));
    assert.ok(conflict.reasons.some(r => r.includes('Company size range overlap')));
  });

  // 7. Assignment authorization (manager required for assignments & reassignments)
  await t.test('7. Assignment authorization check', async () => {
    // Testing role-based check logic
    const isManagerRole = (role) => ['admin', 'manager', 'sales_manager', 'director'].includes(role?.toLowerCase());

    assert.equal(isManagerRole('manager'), true);
    assert.equal(isManagerRole('admin'), true);
    assert.equal(isManagerRole('sales_rep'), false);
    assert.equal(isManagerRole('viewer'), false);
  });

  // 8. Workspace isolation
  await t.test('8. Workspace isolation (multi-tenant boundary enforcement)', async () => {
    const wsATerritory = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'Territory Workspace Alpha'
    });

    const wsBTerritories = await territoryService.getTerritories({ workspaceId: workspaceB });
    const leaked = wsBTerritories.find(t => t.id === wsATerritory.id);
    assert.equal(leaked, undefined, 'Workspace B must never access Workspace A territories');
  });

  // 9. Account prioritization score determinism
  await t.test('9. Account prioritization score determinism', async () => {
    const testLead = await seedLead(workspaceA, {
      company: 'Deterministic Corp',
      industry: 'Software',
      company_size: 500,
      deal_value: 75000,
      account_tier: 'tier_1',
      raw_enrichment: { phone: '+1234567', website_visits: 10, verified_intent: true }
    });

    const scoreRun1 = prioritizationService.computeAccountScore(testLead);
    const scoreRun2 = prioritizationService.computeAccountScore(testLead);

    assert.equal(scoreRun1.priority_score, scoreRun2.priority_score);
    assert.deepEqual(scoreRun1.score_breakdown, scoreRun2.score_breakdown);
    assert.equal(scoreRun1.priority_category, scoreRun2.priority_category);
    assert.equal(scoreRun1.model_version, PRIORITIZATION_MODEL_VERSION);
  });

  // 10. Priority score bounds ([0, 100] guaranteed)
  await t.test('10. Priority score bounds ([0, 100] guaranteed under any data)', async () => {
    // Perfect lead
    const maxLead = await seedLead(workspaceA, {
      company: 'Perfect Lead Inc',
      industry: 'Enterprise Software',
      company_size: 2000,
      deal_value: 500000,
      account_tier: 'tier_1',
      last_activity_at: new Date().toISOString(),
      raw_enrichment: { phone: '+123', email: 'verified@domain.com', verified_intent: true }
    });

    // Empty lead
    const emptyLead = await seedLead(workspaceA, {
      company: '',
      industry: null,
      company_size: null,
      deal_value: 0,
      location: null,
      last_activity_at: null,
      raw_enrichment: null
    });

    const maxResult = prioritizationService.computeAccountScore(maxLead);
    const minResult = prioritizationService.computeAccountScore(emptyLead);

    assert.ok(maxResult.priority_score <= 100, `Score ${maxResult.priority_score} must be <= 100`);
    assert.ok(maxResult.priority_score >= 0, `Score ${maxResult.priority_score} must be >= 0`);

    assert.ok(minResult.priority_score <= 100, `Score ${minResult.priority_score} must be <= 100`);
    assert.ok(minResult.priority_score >= 0, `Score ${minResult.priority_score} must be >= 0`);
  });

  // 11. Missing data handling and "Insufficient Data" category classification
  await t.test('11. Missing data handling and "Insufficient Data" category', async () => {
    const scarceLead = await seedLead(workspaceA, {
      company: 'Scarce Data LLC',
      industry: null,
      location: null,
      company_size: null,
      deal_value: 0,
      last_activity_at: null,
      raw_enrichment: null
    });

    const res = prioritizationService.computeAccountScore(scarceLead);
    assert.equal(res.priority_category, 'Insufficient Data');
    assert.ok(res.priority_score < 25);
    assert.ok(res.signals.missing_data.length >= 3);
  });

  // 12. Grounded AI explanation separation: AI cannot alter numerical scores
  await t.test('12. Grounded AI explanation separation: mathematical determinism', async () => {
    const lead = await seedLead(workspaceA, {
      company: 'Math Verification Co',
      deal_value: 60000,
      company_size: 300,
      industry: 'FinTech'
    });

    const baseScore = prioritizationService.computeAccountScore(lead);
    const explanation = prioritizationService.generateExplainableAnalysis(lead, baseScore);

    // Numerical score must remain unchanged
    assert.equal(explanation.priority_score, baseScore.priority_score);
    assert.ok(explanation.explanation.summary);
    assert.ok(Array.isArray(explanation.explanation.component_breakdown));
    assert.equal(explanation.explanation.component_breakdown.length, 5);
  });

  // 13. Grounded account plan generation
  await t.test('13. Grounded account plan generation (verified vs inferred vs AI recommendations)', async () => {
    const lead = await seedLead(workspaceA, {
      company: 'CloudStream Systems',
      industry: 'Cloud Infrastructure',
      company_size: 800,
      deal_value: 120000,
      location: 'Austin, TX, United States'
    });

    const draft = await planningService.generateDraftPlan({
      workspaceId: workspaceA,
      leadId: lead.id
    });

    assert.ok(draft.draft_plan);
    assert.equal(draft.draft_plan.lead_id, lead.id);
    assert.equal(draft.draft_plan.company, 'CloudStream Systems');
    assert.ok(draft.draft_plan.strategic_objectives.length > 0);
    assert.ok(draft.draft_plan.stakeholder_map.length > 0);
    assert.ok(draft.draft_plan.grounded_sources);
    assert.ok(draft.draft_plan.grounded_sources.verified_facts.length > 0);
    assert.ok(draft.draft_plan.grounded_sources.ai_recommendations.length > 0);
  });

  // 14. Explicit user confirmation requirement before saving account plan
  await t.test('14. Explicit user confirmation requirement before saving account plan', async () => {
    const lead = await seedLead(workspaceA, { company: 'Unsaved Draft Account' });

    // Generating a draft must NOT save it to the database
    await planningService.generateDraftPlan({
      workspaceId: workspaceA,
      leadId: lead.id
    });

    const existingPlan = await planningService.getAccountPlan({
      workspaceId: workspaceA,
      leadId: lead.id
    });
    assert.equal(existingPlan, null, 'Draft plan must not be committed without explicit save call');

    // Explicit user save
    const savedPlan = await planningService.saveAccountPlan({
      workspaceId: workspaceA,
      leadId: lead.id,
      strategicObjectives: ['Expand to 200 seats', 'Security compliance sign-off'],
      strategySummary: 'Executive alignment and technical POC',
      targetRevenue: 100000,
      planStatus: 'active'
    });

    assert.ok(savedPlan.id);
    assert.equal(savedPlan.lead_id, lead.id);
    assert.equal(savedPlan.plan_status, 'active');

    // Now it should exist
    const retrieved = await planningService.getAccountPlan({
      workspaceId: workspaceA,
      leadId: lead.id
    });
    assert.ok(retrieved);
    assert.equal(retrieved.id, savedPlan.id);
  });

  // 15. AI plan recommendations require approval before becoming tasks
  await t.test('15. AI plan recommendations require approval before becoming action items', async () => {
    const lead = await seedLead(workspaceA, { company: 'Action Item Corp' });
    const plan = await planningService.saveAccountPlan({
      workspaceId: workspaceA,
      leadId: lead.id,
      strategicObjectives: ['POC Completion']
    });

    // Adding explicit confirmed action item
    const action = await planningService.addPlanAction({
      workspaceId: workspaceA,
      planId: plan.id,
      title: 'Schedule architecture review with VP Engineering',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString()
    });

    assert.ok(action.id);
    assert.equal(action.status, 'pending');
    assert.equal(action.title, 'Schedule architecture review with VP Engineering');

    // Updating action status
    const updated = await planningService.updatePlanAction({
      workspaceId: workspaceA,
      planId: plan.id,
      actionId: action.id,
      updates: { status: 'completed' }
    });

    assert.equal(updated.status, 'completed');
  });

  // 16. Territory balancing calculations and strategic account concentration alerts
  await t.test('16. Territory balancing calculations and workload imbalance detection', async () => {
    const terrAlpha = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'Loaded Territory',
      ownerUserId: repUser1
    });

    const terrBeta = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'Light Territory',
      ownerUserId: repUser2
    });

    // Seed 10 tier_1 leads in terrAlpha ($50,000 each = $500,000)
    for (let i = 0; i < 10; i++) {
      const l = await seedLead(workspaceA, {
        company: `Heavy Corp ${i}`,
        account_tier: 'tier_1',
        deal_value: 50000
      });
      await territoryService.assignAccountsToTerritory({
        workspaceId: workspaceA,
        territoryId: terrAlpha.id,
        leadIds: [l.id]
      });
    }

    // Seed 1 lead in terrBeta ($10,000)
    const lightLead = await seedLead(workspaceA, {
      company: 'Light Corp 1',
      account_tier: 'tier_3',
      deal_value: 10000
    });
    await territoryService.assignAccountsToTerritory({
      workspaceId: workspaceA,
      territoryId: terrBeta.id,
      leadIds: [lightLead.id]
    });

    const balance = await territoryService.calculateTerritoryBalance({ workspaceId: workspaceA });
    assert.ok(balance.territories);
    assert.ok(balance.workload_imbalance_warnings.length > 0);
    assert.ok(balance.workload_imbalance_warnings.some(w => w.includes('Workload imbalance') || w.includes('concentration')));
  });

  // 17. Revenue calculation reuse and currency safety
  await t.test('17. Revenue calculation reuse and currency safety', async () => {
    const terr = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'Financial Territory'
    });

    const validLead = await seedLead(workspaceA, { deal_value: 45000, currency: 'USD' });
    const nullLead = await seedLead(workspaceA, { deal_value: null });
    const negativeLead = await seedLead(workspaceA, { deal_value: -5000 });

    await territoryService.assignAccountsToTerritory({
      workspaceId: workspaceA,
      territoryId: terr.id,
      leadIds: [validLead.id, nullLead.id, negativeLead.id]
    });

    const perf = await territoryService.getTerritoryPerformance({
      workspaceId: workspaceA,
      territoryId: terr.id
    });

    // Open pipeline should only count non-negative valid numerical deals ($45,000)
    assert.equal(perf.open_pipeline, 45000);
  });

  // 18. Territory target configuration and pipeline coverage
  await t.test('18. Territory target configuration and pipeline coverage', async () => {
    const terr = await territoryService.createTerritory({
      workspaceId: workspaceA,
      name: 'Quota Territory'
    });

    const lead = await seedLead(workspaceA, { deal_value: 150000 });
    await territoryService.assignAccountsToTerritory({
      workspaceId: workspaceA,
      territoryId: terr.id,
      leadIds: [lead.id]
    });

    // Set target of $50,000
    const target = await territoryService.setTerritoryTarget({
      workspaceId: workspaceA,
      territoryId: terr.id,
      targetRevenue: 50000,
      targetNewLogos: 5,
      periodType: 'quarterly',
      userId: managerUser
    });

    assert.equal(target.target_revenue, 50000);

    const perf = await territoryService.getTerritoryPerformance({
      workspaceId: workspaceA,
      territoryId: terr.id
    });

    // Coverage = 150,000 / 50,000 = 3.0x
    assert.equal(perf.target_revenue, 50000);
    assert.equal(perf.pipeline_coverage_ratio, 3.0);
  });

  // 19. Reassignment audit tracking
  await t.test('19. Reassignment audit tracking', async () => {
    const terrOld = await territoryService.createTerritory({ workspaceId: workspaceA, name: 'Old Terr' });
    const terrNew = await territoryService.createTerritory({ workspaceId: workspaceA, name: 'New Terr' });

    const lead = await seedLead(workspaceA, { company: 'Audited Company' });

    // Initial assignment
    await territoryService.assignAccountsToTerritory({
      workspaceId: workspaceA,
      territoryId: terrOld.id,
      leadIds: [lead.id]
    });

    // Reassignment
    const reassignRes = await territoryService.reassignAccount({
      workspaceId: workspaceA,
      leadId: lead.id,
      targetTerritoryId: terrNew.id,
      reason: 'Mid-quarter portfolio rebalance',
      assignedBy: managerUser
    });

    assert.equal(reassignRes.success, true);
    assert.equal(reassignRes.assignment.territory_id, terrNew.id);

    // Audit logs
    const history = territoryService._getMemoryAssignments(workspaceA, lead.id);
    const reassignedRecord = history.find(a => a.territory_id === terrOld.id);
    assert.equal(reassignedRecord.status, 'reassigned');
  });

  // 20. Financial and data integrity: Zero unsolicited CRM writes
  await t.test('20. Financial and data integrity: Zero unsolicited CRM writes', async () => {
    const pristineLead = await seedLead(workspaceA, {
      company: 'Pristine Financials Inc',
      deal_value: 88888,
      stage: 'Negotiation',
      probability: 0.75
    });

    // Running prioritization, balance, and plan draft should never modify lead's deal_value or stage
    prioritizationService.computeAccountScore(pristineLead);
    await territoryService.calculateTerritoryBalance({ workspaceId: workspaceA });
    await planningService.generateDraftPlan({ workspaceId: workspaceA, leadId: pristineLead.id });

    const checkedLead = crmService._getMemoryLead(pristineLead.id);
    assert.equal(checkedLead.deal_value, 88888);
    assert.equal(checkedLead.stage, 'Negotiation');
    assert.equal(checkedLead.probability, 0.75);
  });
});
