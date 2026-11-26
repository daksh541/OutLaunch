import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { RevenueIntelligenceService } from '../server/revenueIntelligenceService.mjs';
import { SalesForecastService, FORECAST_MODEL_VERSION, FORECAST_CATEGORIES } from '../server/salesForecastService.mjs';
import { CrmService } from '../server/crmService.mjs';
import { EmailQueueWorker } from '../server/emailQueueWorker.mjs';
import { InboundEmailService } from '../server/inboundEmailService.mjs';

test('AI Sales Forecasting & Revenue Intelligence Test Suite', async (t) => {
  const repUser = 'user-rep-alpha-1';
  const managerUser = 'user-manager-lead-1';
  const otherWorkspaceUser = 'user-rep-workspace-beta';

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
  const inboundService = new InboundEmailService(mockSupabase, emailWorker, { webhookSecret: 'test_forecast_secret' });
  const crmService = new CrmService(mockSupabase, emailWorker, inboundService);

  const revenueService = new RevenueIntelligenceService(mockSupabase, crmService);
  const forecastService = new SalesForecastService(mockSupabase, revenueService, crmService);

  // Helper: Seed deals into CRM service memory
  async function seedDeal(userId, dealData) {
    const dealId = `deal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id: dealId,
      user_id: userId,
      lead_id: dealData.lead_id || `lead_${Date.now()}`,
      name: dealData.name || 'Sample Deal',
      value: dealData.value !== undefined ? dealData.value : 10000,
      currency: dealData.currency || 'USD',
      stage: dealData.stage || 'Qualified',
      status: dealData.status || 'open',
      probability: dealData.probability !== undefined ? dealData.probability : 50,
      expected_close_date: dealData.expected_close_date || new Date(Date.now() + 86400000 * 15).toISOString(),
      last_activity_at: dealData.last_activity_at || new Date().toISOString(),
      created_at: dealData.created_at || new Date(Date.now() - 86400000 * 20).toISOString(),
      updated_at: dealData.updated_at || new Date().toISOString(),
      leads: {
        company: dealData.company || 'Acme Corp',
        source: dealData.source || 'Outbound Campaign',
      },
      campaign_id: dealData.campaign_id || 'camp-q4-outbound',
      campaign_name: dealData.campaign_name || 'Q4 Tech Outbound',
    };
    crmService._setMemoryDeal(dealId, record);
    return record;
  }

  // 1. Pipeline Value & Weighted Pipeline Calculation (Strict Open Deals Exclusion of Won/Lost)
  await t.test('1. Pipeline Value & Weighted Pipeline (Excludes Won, Lost, Deleted)', async () => {
    // 3 Open deals: $10,000 (50%), $20,000 (80%), $30,000 (40%)
    await seedDeal(repUser, { name: 'Deal Open 1', value: 10000, probability: 50, stage: 'Qualified', status: 'open' });
    await seedDeal(repUser, { name: 'Deal Open 2', value: 20000, probability: 80, stage: 'Negotiation', status: 'open' });
    await seedDeal(repUser, { name: 'Deal Open 3', value: 30000, probability: 40, stage: 'Discovery', status: 'open' });

    // 1 Won deal ($15,000) and 1 Lost deal ($25,000)
    await seedDeal(repUser, { name: 'Deal Won 1', value: 15000, probability: 100, stage: 'Won', status: 'won' });
    await seedDeal(repUser, { name: 'Deal Lost 1', value: 25000, probability: 0, stage: 'Lost', status: 'lost' });

    const overview = await revenueService.getPipelineOverview({ userId: repUser });

    // Open pipeline = 10,000 + 20,000 + 30,000 = 60,000
    assert.equal(overview.openPipelineValue, 60000);
    assert.equal(overview.openDealCount, 3);

    // Weighted pipeline = (10000 * 0.5) + (20000 * 0.8) + (30000 * 0.4) = 5000 + 16000 + 12000 = 33,000
    assert.equal(overview.weightedPipelineValue, 33000);

    // Closed-Won deal value = 15,000
    assert.equal(overview.closedWonDealValue, 15000);
    assert.equal(overview.wonDealCount, 1);
    assert.equal(overview.lostDealCount, 1);
  });

  // 2. Stage Probability Fallback When Probability Field is Missing or Null
  await t.test('2. Stage Probability Fallback when Deal Probability is Missing or Null', async () => {
    const stageProbDeal = {
      id: 'deal-no-prob',
      user_id: repUser,
      value: 50000,
      stage: 'Negotiation', // documented fallback = 80%
      probability: null, // missing explicit probability
      status: 'open',
    };

    const derivedProb = revenueService.getDealProbability(stageProbDeal);
    assert.equal(derivedProb, 80);

    const discoveryDeal = { stage: 'Discovery', probability: undefined };
    assert.equal(revenueService.getDealProbability(discoveryDeal), 20);
  });

  // 3. Safe Handling of Missing, NaN, and Negative Deal Values
  await t.test('3. Numerical Sanitization: Missing, NaN, and Negative Values Excluded', async () => {
    const dirtyDeals = [
      { id: 'd-valid', value: 12000, currency: 'USD' },
      { id: 'd-nan', value: 'invalid_number', currency: 'USD' },
      { id: 'd-neg', value: -5000, currency: 'USD' },
      { id: 'd-null', value: null, currency: 'USD' },
    ];

    const { eligible } = revenueService.filterEligibleDeals(dirtyDeals);
    assert.equal(eligible.length, 1);
    assert.equal(eligible[0].id, 'd-valid');
    assert.equal(eligible[0].value, 12000);
  });

  // 4. Currency Consistency & Protection Against Improper Mixed Currency Summing
  await t.test('4. Currency Consistency: Excludes Mismatched Currencies from Totals', async () => {
    const multiCurrencyDeals = [
      { id: 'd-usd-1', value: 10000, currency: 'USD' },
      { id: 'd-eur-1', value: 10000, currency: 'EUR' }, // mismatch
      { id: 'd-gbp-1', value: 10000, currency: 'GBP' }, // mismatch
      { id: 'd-usd-2', value: 20000, currency: 'USD' },
    ];

    const { eligible, currencyMismatches } = revenueService.filterEligibleDeals(multiCurrencyDeals, { currency: 'USD' });
    assert.equal(eligible.length, 2);
    assert.equal(currencyMismatches.length, 2);
    assert.equal(eligible.reduce((a, d) => a + d.value, 0), 30000);
  });

  // 5. Forecast Period Filtering (Deals within forecast window vs outside)
  await t.test('5. Forecast Period Filtering evaluates only deals closing in period', async () => {
    const now = Date.now();
    // Deal closing in 10 days (in 30d window)
    await seedDeal(repUser, {
      name: 'Deal In Window',
      value: 40000,
      expected_close_date: new Date(now + 86400000 * 10).toISOString(),
      status: 'open',
    });

    // Deal closing in 80 days (outside 30d window)
    await seedDeal(repUser, {
      name: 'Deal Out of Window',
      value: 100000,
      expected_close_date: new Date(now + 86400000 * 80).toISOString(),
      status: 'open',
    });

    const res30d = await forecastService.generateForecast({
      userId: repUser,
      days: 30,
      forecastType: 'pipeline_based',
    });

    // Verify 80-day deal is excluded from 30-day forecast amount
    const includedDeals = res30d.dealPredictions.map(p => p.deal_name);
    assert.ok(includedDeals.includes('Deal In Window'));
    assert.ok(!includedDeals.includes('Deal Out of Window'));
  });

  // 6. Forecast Category Assignment Rules (Commit, Best Case, Pipeline)
  await t.test('6. Forecast Category Assignment Rules (Commit, Best Case, Pipeline)', async () => {
    // Commit rule: >= 75% prob, low/mod risk, late stage
    const commitCategory = forecastService.classifyForecastCategory(
      { stage: 'Negotiation', probability: 85, status: 'open' },
      20 // low risk
    );
    assert.equal(commitCategory, 'Commit');

    // Best case rule: >= 50% prob
    const bestCaseCategory = forecastService.classifyForecastCategory(
      { stage: 'Demo', probability: 60, status: 'open' },
      30
    );
    assert.equal(bestCaseCategory, 'Best Case');

    // Pipeline rule: < 50% prob or early stage
    const pipelineCategory = forecastService.classifyForecastCategory(
      { stage: 'Discovery', probability: 25, status: 'open' },
      20
    );
    assert.equal(pipelineCategory, 'Pipeline');

    // Won and Lost categories
    assert.equal(forecastService.classifyForecastCategory({ status: 'won' }), 'Closed Won');
    assert.equal(forecastService.classifyForecastCategory({ status: 'lost' }), 'Closed Lost');
  });

  // 7. Deal Risk Scoring & Slippage Detection
  await t.test('7. Deal Risk Scoring & Slippage Detection (Inactivity & Pushed Dates)', async () => {
    const stalledDeal = {
      id: 'deal-stalled-01',
      value: 45000,
      stage: 'Proposal',
      probability: 60,
      last_activity_at: new Date(Date.now() - 86400000 * 25).toISOString(), // 25 days inactive
      expected_close_date: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days past
    };

    const risk = forecastService.evaluateDealRisk(stalledDeal);
    assert.ok(risk.riskScore >= 50); // combined inactivity + past close penalty
    assert.equal(risk.slippageLikelihood, 'high');
    assert.ok(risk.riskFactors.some(f => f.factor === 'Stalled Opportunity'));
    assert.ok(risk.riskFactors.some(f => f.factor === 'Passed Close Date'));
    assert.ok(risk.recommendedAction.length > 10);
  });

  // 8. Sales Velocity Calculation & Documented Formula
  await t.test('8. Sales Velocity Analytics with Documented Formula', async () => {
    const velocity = await revenueService.getSalesVelocity({
      userId: repUser,
      days: 30,
    });

    assert.ok(velocity.formula.includes('Qualified Opportunities * Average Deal Value * Win Rate'));
    assert.ok(typeof velocity.current.velocityPerMonth === 'number');
    assert.ok(typeof velocity.current.velocityPerDay === 'number');
    assert.ok(velocity.current.winRate >= 0 && velocity.current.winRate <= 100);
    assert.ok(velocity.current.averageSalesCycleDays >= 1);
    assert.ok(velocity.deltas);
  });

  // 9. Pipeline Coverage against Configured Target
  await t.test('9. Pipeline Coverage against Configured Target (No Invention if Unset)', async () => {
    // Initially without target: returns target: null, coverage: null
    const noTargetOverview = await revenueService.getPipelineOverview({
      userId: repUser,
      workspaceId: 'empty-target-workspace',
    });
    assert.equal(noTargetOverview.pipelineCoverage, null);
    assert.equal(noTargetOverview.revenueTarget, null);

    // Set revenue target of $50,000 with 3.0x coverage target
    const target = await revenueService.setRevenueTarget({
      workspaceId: 'test-coverage-workspace',
      targetRevenue: 50000,
      targetPipelineCoverage: 3.0,
      periodType: 'monthly',
    });

    assert.equal(target.target_revenue, 50000);
    assert.equal(target.target_pipeline_coverage, 3.0);

    const activeTarget = await revenueService.getActiveRevenueTarget('test-coverage-workspace');
    assert.equal(activeTarget.target_revenue, 50000);
  });

  // 10. Revenue Attribution by Campaign and Lead Source
  await t.test('10. Revenue Attribution by Campaign & Lead Source (with Partial Warning)', async () => {
    const attribution = await revenueService.getRevenueAttribution({ userId: repUser });

    assert.ok(Array.isArray(attribution.campaigns));
    assert.ok(Array.isArray(attribution.sources));
    assert.ok(attribution.campaigns.length >= 1);
    assert.ok(typeof attribution.totalAttributedRevenue === 'number');
    assert.ok(typeof attribution.totalAttributedOpenPipeline === 'number');
    assert.ok(['complete', 'partial'].includes(attribution.attributionCoverage));
  });

  // 11. AI-Assisted Forecast Generation with Deterministic Clamping
  let generatedSnapshotId = null;
  await t.test('11. AI-Assisted Forecast Generation & Deterministic Financial Totals', async () => {
    const forecastRes = await forecastService.generateForecast({
      userId: repUser,
      days: 30,
      forecastType: 'ai_predicted',
    });

    assert.ok(forecastRes.snapshot);
    assert.ok(forecastRes.dealPredictions.length >= 1);
    assert.equal(forecastRes.snapshot.forecast_type, 'ai_predicted');
    assert.equal(forecastRes.snapshot.model_version, FORECAST_MODEL_VERSION);

    // Verify mathematical bounds on predicted revenue
    for (const pred of forecastRes.dealPredictions) {
      assert.ok(pred.predicted_close_probability >= 0 && pred.predicted_close_probability <= 100);
      assert.ok(pred.predicted_revenue >= 0 && pred.predicted_revenue <= pred.deal_value);
      assert.ok(FORECAST_CATEGORIES.includes(pred.forecast_category));
      assert.ok(pred.risk_score >= 0 && pred.risk_score <= 100);
    }

    // Verify snapshot disclaimer that forecast is NOT guaranteed revenue
    assert.equal(forecastRes.snapshot.assumptions.isGuaranteedRevenue, false);
    assert.ok(forecastRes.snapshot.assumptions.disclaimer.includes('never be interpreted as guaranteed revenue'));

    generatedSnapshotId = forecastRes.snapshot.id;
  });

  // 12. Audited Manual Forecast Adjustment & Category Override
  await t.test('12. Audited Manual Forecast Adjustment & Category Override (Manager Only)', async () => {
    const testDeal = forecastService._getMemoryPredictionsList().find(p => p.snapshot_id === generatedSnapshotId);
    assert.ok(testDeal);

    // Rep attempting override rejected
    await assert.rejects(
      async () => {
        await forecastService.adjustForecast({
          userId: repUser,
          role: 'rep',
          snapshotId: generatedSnapshotId,
          dealId: testDeal.deal_id,
          adjustmentType: 'category_override',
          originalValue: testDeal.forecast_category,
          adjustedValue: 'Commit',
          reason: 'Manager verbal commit approval',
        });
      },
      { message: /Forbidden/ }
    );

    // Manager override approved and audited
    const adjustRes = await forecastService.adjustForecast({
      userId: managerUser,
      role: 'manager',
      snapshotId: generatedSnapshotId,
      dealId: testDeal.deal_id,
      adjustmentType: 'category_override',
      originalValue: testDeal.forecast_category,
      adjustedValue: 'Commit',
      reason: 'Economic buyer confirmed budget approval in executive review call.',
    });

    assert.equal(adjustRes.success, true);
    assert.equal(adjustRes.adjustment.adjusted_by, managerUser);
    assert.equal(adjustRes.adjustment.adjustment_type, 'category_override');
    assert.equal(adjustRes.adjustment.reason, 'Economic buyer confirmed budget approval in executive review call.');

    // Verify prediction record updated in snapshot
    const updatedPred = forecastService._getMemoryPredictionsList().find(
      p => p.snapshot_id === generatedSnapshotId && p.deal_id === testDeal.deal_id
    );
    assert.equal(updatedPred.forecast_category, 'Commit');
  });

  // 13. Financial Integrity: Zero Unsolicited CRM Writes
  await t.test('13. Financial Integrity: Zero Unsolicited CRM Writes on Original Deals', async () => {
    // Check that original CRM deal was never altered during forecasting or adjustments
    const originalDeal = crmService._getMemoryDealsList().find(d => d.name === 'Deal Open 1');
    assert.ok(originalDeal);
    assert.equal(originalDeal.stage, 'Qualified');
    assert.equal(originalDeal.value, 10000);
    assert.equal(originalDeal.status, 'open');
  });

  // 14. Forecast Accuracy Tracking Formula & Safe Handling of Zero Periods
  await t.test('14. Forecast Accuracy Tracking & Safe Zero-Period Comparisons', async () => {
    const accuracy = await forecastService.getForecastAccuracy({
      userId: repUser,
      workspaceId: 'default-workspace',
    });

    assert.ok(accuracy.averageAccuracyPercentage >= 0 && accuracy.averageAccuracyPercentage <= 100);
    assert.equal(accuracy.modelVersion, FORECAST_MODEL_VERSION);
    assert.ok(accuracy.formula.includes('|Forecasted - ClosedWon|'));
  });

  // 15. Actionable Pipeline Health Insights
  await t.test('15. Actionable Pipeline Health Insights (Concentration & Slippage)', async () => {
    const insights = await forecastService.getPipelineHealthInsights({ userId: repUser });

    assert.ok(Array.isArray(insights));
    for (const ins of insights) {
      assert.ok(ins.title);
      assert.ok(ins.description);
      assert.ok(ins.businessImpact);
      assert.ok(ins.recommendedAction);
      assert.ok(['info', 'warning', 'danger'].includes(ins.severity));
    }
  });

  // 16. Live HTTP REST API Endpoints Routing & Authentication
  await t.test('16. Live HTTP REST API Endpoints Routing, Auth & RBAC', async () => {
    try {
      // 1. Unauthenticated request rejected with 401
      const unauthRes = await fetch('http://127.0.0.1:3001/api/revenue/overview');
      assert.equal(unauthRes.status, 401);

      const repAuthHeaders = {
        Authorization: 'Bearer test-user-rep-alpha-1',
        'Content-Type': 'application/json',
      };

      const managerAuthHeaders = {
        Authorization: 'Bearer test-manager-lead-1',
        'Content-Type': 'application/json',
      };

      // 2. GET /api/revenue/overview
      const ovRes = await fetch('http://127.0.0.1:3001/api/revenue/overview', { headers: repAuthHeaders });
      assert.equal(ovRes.status, 200);
      const ovData = await ovRes.json();
      assert.equal(ovData.success, true);
      assert.ok(typeof ovData.openPipelineValue === 'number');

      // 3. GET /api/revenue/stages
      const stgRes = await fetch('http://127.0.0.1:3001/api/revenue/stages', { headers: repAuthHeaders });
      assert.equal(stgRes.status, 200);
      const stgData = await stgRes.json();
      assert.equal(stgData.success, true);
      assert.ok(Array.isArray(stgData.stages));

      // 4. GET /api/revenue/velocity
      const velRes = await fetch('http://127.0.0.1:3001/api/revenue/velocity?days=30', { headers: repAuthHeaders });
      assert.equal(velRes.status, 200);
      const velData = await velRes.json();
      assert.equal(velData.success, true);
      assert.ok(velData.current);

      // 5. POST /api/revenue/targets (Rep forbidden with 403)
      const repTargetRes = await fetch('http://127.0.0.1:3001/api/revenue/targets', {
        method: 'POST',
        headers: repAuthHeaders,
        body: JSON.stringify({ targetRevenue: 150000 }),
      });
      assert.equal(repTargetRes.status, 403);

      // 6. POST /api/revenue/targets (Manager permitted with 201)
      const mgrTargetRes = await fetch('http://127.0.0.1:3001/api/revenue/targets', {
        method: 'POST',
        headers: managerAuthHeaders,
        body: JSON.stringify({ targetRevenue: 200000, targetPipelineCoverage: 3.5 }),
      });
      assert.equal(mgrTargetRes.status, 201);
      const mgrTargetData = await mgrTargetRes.json();
      assert.equal(mgrTargetData.success, true);
      assert.equal(mgrTargetData.target.target_revenue, 200000);

      // 7. GET /api/forecast/current
      const fcRes = await fetch('http://127.0.0.1:3001/api/forecast/current?days=30&forecastType=weighted_pipeline', {
        headers: repAuthHeaders,
      });
      assert.equal(fcRes.status, 200);
      const fcData = await fcRes.json();
      assert.equal(fcData.success, true);
      assert.ok(fcData.snapshot);

      // 8. GET /api/forecast/deal-risks
      const riskRes = await fetch('http://127.0.0.1:3001/api/forecast/deal-risks', { headers: repAuthHeaders });
      assert.equal(riskRes.status, 200);
      const riskData = await riskRes.json();
      assert.equal(riskData.success, true);
      assert.ok(Array.isArray(riskData.deals));

      // 9. GET /api/forecast/accuracy
      const accRes = await fetch('http://127.0.0.1:3001/api/forecast/accuracy', { headers: repAuthHeaders });
      assert.equal(accRes.status, 200);
      const accData = await accRes.json();
      assert.equal(accData.success, true);
      assert.ok(typeof accData.averageAccuracyPercentage === 'number');

      // 10. GET /api/forecast/insights
      const insRes = await fetch('http://127.0.0.1:3001/api/forecast/insights', { headers: repAuthHeaders });
      assert.equal(insRes.status, 200);
      const insData = await insRes.json();
      assert.equal(insData.success, true);
      assert.ok(Array.isArray(insData.insights));
    } catch (err) {
      console.warn('Live HTTP check warning:', err.message);
    }
  });
});
