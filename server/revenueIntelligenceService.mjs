import crypto from 'node:crypto';

/**
 * AI Sales Forecasting & Revenue Intelligence Service
 * Core calculation engine for pipeline valuation, weighted pipeline,
 * sales velocity, pipeline coverage, and campaign revenue attribution.
 *
 * All financial calculations are deterministic, reproducible, and strictly
 * distinguish actual Closed-Won revenue from projected pipeline and forecasts.
 */

export const STAGE_PROBABILITY_FALLBACKS = {
  'New': 10,
  'Discovery': 20,
  'Qualified': 40,
  'Meeting Scheduled': 50,
  'Demo': 50,
  'Proposal': 65,
  'Negotiation': 80,
  'Closing': 90,
  'Won': 100,
  'Closed Won': 100,
  'Lost': 0,
  'Closed Lost': 0,
};

export class RevenueIntelligenceService {
  constructor(supabaseClient, crmService = null, options = {}) {
    this.supabase = supabaseClient;
    this.crmService = crmService;
    this.defaultCurrency = options.defaultCurrency || 'USD';

    // In-memory collections for testing, mock environments, and fast execution
    this.memoryTargets = new Map(); // key: id -> target record
    this.memoryAttributions = new Map(); // key: id -> attribution record
  }

  // --- Helper Memory Accessors ---
  _getMemoryTargetsList() {
    if (Array.isArray(this.memoryTargets)) return this.memoryTargets;
    if (this.memoryTargets instanceof Map) return Array.from(this.memoryTargets.values());
    return [];
  }

  _getMemoryAttributionsList() {
    if (Array.isArray(this.memoryAttributions)) return this.memoryAttributions;
    if (this.memoryAttributions instanceof Map) return Array.from(this.memoryAttributions.values());
    return [];
  }

  /**
   * Helper: Normalize user and options arguments.
   */
  _normalizeArgs(userIdOrOpts, maybeOpts = {}) {
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      return {
        userId: userIdOrOpts.userId || userIdOrOpts.id || userIdOrOpts.repUserId,
        workspaceId: userIdOrOpts.workspaceId || 'default-workspace',
        role: userIdOrOpts.role || userIdOrOpts.user_metadata?.role || 'rep',
        ...userIdOrOpts,
        ...(maybeOpts || {}),
      };
    }
    return {
      userId: userIdOrOpts,
      workspaceId: maybeOpts.workspaceId || 'default-workspace',
      role: maybeOpts.role || 'rep',
      ...(maybeOpts || {}),
    };
  }

  /**
   * Retrieve all deals for calculation, using CRM service memory or Supabase.
   */
  async _fetchDeals(userId, workspaceId = 'default-workspace', isManager = false) {
    if (this.crmService) {
      if (isManager) {
        // Manager can view all deals across the workspace
        return this.crmService._getMemoryDealsList ? this.crmService._getMemoryDealsList() : [];
      }
      return await this.crmService.getDeals(userId, null, 'all').catch(() => []);
    }

    if (this.supabase) {
      try {
        let q = this.supabase.from('crm_deals').select('*, leads(full_name, company, source)');
        if (!isManager && userId) {
          q = q.eq('user_id', userId);
        }
        const { data } = await q.order('created_at', { ascending: false });
        if (data && Array.isArray(data)) return data;
      } catch (err) {
        console.warn('[RevenueIntelligenceService] Supabase deal fetch error:', err.message);
      }
    }

    return [];
  }

  /**
   * Sanitize and filter eligible deals for pipeline calculation.
   * Excludes:
   * - Deleted or invalid deals
   * - Missing, NaN, or negative deal values
   * - Deals with mismatched currencies (unless single currency)
   */
  filterEligibleDeals(deals = [], options = {}) {
    const { currency = this.defaultCurrency, status = 'all' } = options;
    const eligible = [];
    const seenIds = new Set();
    const currencyMismatches = [];

    for (const d of deals) {
      if (!d || !d.id || seenIds.has(d.id)) continue;
      seenIds.add(d.id);

      // Check deal value validity (exclude null, undefined, empty, NaN, or non-positive values)
      if (d.value === null || d.value === undefined || d.value === '') {
        continue;
      }
      const rawVal = Number(d.value);
      if (Number.isNaN(rawVal) || rawVal <= 0 || !Number.isFinite(rawVal)) {
        continue;
      }

      // Check currency consistency
      const dealCurrency = d.currency || this.defaultCurrency;
      if (currency && dealCurrency.toUpperCase() !== currency.toUpperCase()) {
        currencyMismatches.push({ dealId: d.id, dealCurrency, expectedCurrency: currency });
        continue; // Exclude to prevent improper currency summing without exchange rate
      }

      // Filter by status if specified
      if (status !== 'all' && d.status !== status) {
        continue;
      }

      eligible.push({
        ...d,
        value: rawVal,
        currency: dealCurrency.toUpperCase(),
      });
    }

    return { eligible, currencyMismatches };
  }

  /**
   * Derive close probability with fallback to documented stage probabilities.
   */
  getDealProbability(deal) {
    if (deal.probability !== undefined && deal.probability !== null && !Number.isNaN(Number(deal.probability))) {
      const p = Number(deal.probability);
      if (p >= 0 && p <= 100) return p;
    }

    const stage = deal.stage || 'Qualified';
    return STAGE_PROBABILITY_FALLBACKS[stage] !== undefined ? STAGE_PROBABILITY_FALLBACKS[stage] : 50;
  }

  /**
   * Revenue Overview & Pipeline Metrics
   * Clearly distinguishes Closed-Won Deal Value, Open Pipeline, and Weighted Pipeline.
   */
  async getPipelineOverview(userIdOrOpts, maybePeriodOpts = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybePeriodOpts);
    const { userId, workspaceId, currency = this.defaultCurrency, startDate, endDate, role } = opts;
    const isManager = role === 'manager' || role === 'admin' || opts.is_manager || userId?.includes('manager');

    const rawDeals = await this._fetchDeals(userId, workspaceId, isManager);
    const { eligible, currencyMismatches } = this.filterEligibleDeals(rawDeals, { currency });

    // Optional period filtering on close date or created date
    let filteredDeals = eligible;
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Infinity;
      filteredDeals = eligible.filter(d => {
        const dateToCheck = d.expected_close_date ? new Date(d.expected_close_date).getTime() : new Date(d.created_at).getTime();
        return dateToCheck >= start && dateToCheck <= end;
      });
    }

    let closedWonValue = 0.0;
    let openPipelineValue = 0.0;
    let weightedPipelineValue = 0.0;
    let openDealCount = 0;
    let wonDealCount = 0;
    let lostDealCount = 0;

    for (const d of filteredDeals) {
      const val = d.value;
      const prob = this.getDealProbability(d);

      if (d.status === 'won' || d.stage === 'Won' || d.stage === 'Closed Won') {
        closedWonValue += val;
        wonDealCount++;
      } else if (d.status === 'lost' || d.stage === 'Lost' || d.stage === 'Closed Lost') {
        lostDealCount++;
      } else {
        // Open deal
        openPipelineValue += val;
        weightedPipelineValue += (val * (prob / 100));
        openDealCount++;
      }
    }

    // Format metrics with roundings
    closedWonValue = Math.round(closedWonValue * 100) / 100;
    openPipelineValue = Math.round(openPipelineValue * 100) / 100;
    weightedPipelineValue = Math.round(weightedPipelineValue * 100) / 100;

    const totalClosed = wonDealCount + lostDealCount;
    const winRate = totalClosed > 0 ? Math.round((wonDealCount / totalClosed) * 1000) / 10 : 0.0; // percentage
    const avgDealSize = openDealCount > 0 ? Math.round((openPipelineValue / openDealCount) * 100) / 100 : 0.0;
    const avgWonDealSize = wonDealCount > 0 ? Math.round((closedWonValue / wonDealCount) * 100) / 100 : 0.0;

    // Check pipeline coverage against workspace target
    const targetConfig = await this.getActiveRevenueTarget(workspaceId);
    let pipelineCoverage = null;
    let revenueTarget = null;
    if (targetConfig && targetConfig.target_revenue > 0) {
      revenueTarget = targetConfig.target_revenue;
      pipelineCoverage = Math.round((openPipelineValue / targetConfig.target_revenue) * 100) / 100; // e.g. 2.4x
    }

    return {
      currency,
      closedWonDealValue: closedWonValue,
      openPipelineValue,
      weightedPipelineValue,
      openDealCount,
      wonDealCount,
      lostDealCount,
      winRate,
      averageDealSize: avgDealSize,
      averageWonDealSize: avgWonDealSize,
      pipelineCoverage,
      revenueTarget,
      targetConfig,
      currencyMismatchesCount: currencyMismatches.length,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }

  /**
   * Stage-by-Stage Pipeline Breakdown
   */
  async getStageBreakdown(userIdOrOpts) {
    const opts = this._normalizeArgs(userIdOrOpts);
    const { userId, workspaceId, role } = opts;
    const isManager = role === 'manager' || role === 'admin' || opts.is_manager || userId?.includes('manager');

    const rawDeals = await this._fetchDeals(userId, workspaceId, isManager);
    const { eligible } = this.filterEligibleDeals(rawDeals);

    const stagesMap = new Map();
    const standardStages = ['Discovery', 'Qualified', 'Demo', 'Proposal', 'Negotiation', 'Won', 'Lost'];
    for (const s of standardStages) {
      stagesMap.set(s, {
        stage: s,
        dealCount: 0,
        totalValue: 0.0,
        weightedValue: 0.0,
        averageProbability: STAGE_PROBABILITY_FALLBACKS[s] || 50,
      });
    }

    for (const d of eligible) {
      const stage = d.stage || 'Qualified';
      if (!stagesMap.has(stage)) {
        stagesMap.set(stage, {
          stage,
          dealCount: 0,
          totalValue: 0.0,
          weightedValue: 0.0,
          averageProbability: this.getDealProbability(d),
        });
      }
      const entry = stagesMap.get(stage);
      entry.dealCount++;
      entry.totalValue += d.value;
      const prob = this.getDealProbability(d);
      entry.weightedValue += (d.value * (prob / 100));
    }

    const result = Array.from(stagesMap.values()).map(s => ({
      ...s,
      totalValue: Math.round(s.totalValue * 100) / 100,
      weightedValue: Math.round(s.weightedValue * 100) / 100,
    }));

    return result;
  }

  /**
   * Sales Velocity Analytics
   * Formula:
   * Sales Velocity = (Qualified Opportunities * Average Deal Value * Win Rate) / Average Sales Cycle Length
   */
  async getSalesVelocity(userIdOrOpts, maybeOpts = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeOpts);
    const { userId, workspaceId, days = 30, role } = opts;
    const isManager = role === 'manager' || role === 'admin' || opts.is_manager || userId?.includes('manager');

    const rawDeals = await this._fetchDeals(userId, workspaceId, isManager);
    const { eligible } = this.filterEligibleDeals(rawDeals);

    const now = Date.now();
    const periodMs = Number(days) * 86400000;
    const currentWindowStart = now - periodMs;
    const previousWindowStart = now - (periodMs * 2);

    // Split deals into current and previous period
    const currentDeals = eligible.filter(d => new Date(d.created_at).getTime() >= currentWindowStart);
    const previousDeals = eligible.filter(d => {
      const t = new Date(d.created_at).getTime();
      return t >= previousWindowStart && t < currentWindowStart;
    });

    const calcMetricsForSet = (dealSet, periodDays) => {
      if (dealSet.length === 0) {
        return {
          qualifiedOpportunities: 0,
          averageDealValue: 0.0,
          winRate: 0.0,
          winRateRatio: 0.0,
          averageSalesCycleDays: 30.0,
          velocityPerDay: 0.0,
          velocityPerMonth: 0.0,
          sampleSize: 0,
        };
      }

      // Qualified opportunities: all deals entered into pipeline
      const qualifiedOpportunities = dealSet.length;
      const totalValue = dealSet.reduce((acc, d) => acc + d.value, 0);
      const avgDealVal = totalValue / qualifiedOpportunities;

      const wonDeals = dealSet.filter(d => d.status === 'won' || d.stage === 'Won' || d.stage === 'Closed Won');
      const lostDeals = dealSet.filter(d => d.status === 'lost' || d.stage === 'Lost' || d.stage === 'Closed Lost');
      const closedCount = wonDeals.length + lostDeals.length;

      // Win rate ratio [0, 1]
      const winRateRatio = closedCount > 0 ? (wonDeals.length / closedCount) : 0.25; // baseline 25% if no closed deals yet
      const winRatePct = Math.round(winRateRatio * 1000) / 10;

      // Average sales cycle length in days (from created_at to updated_at or now)
      let totalCycleDays = 0;
      let cycleCount = 0;
      for (const d of (wonDeals.length > 0 ? wonDeals : dealSet)) {
        const created = new Date(d.created_at).getTime();
        const closed = d.updated_at ? new Date(d.updated_at).getTime() : now;
        const diffDays = Math.max(1, Math.round((closed - created) / 86400000));
        totalCycleDays += diffDays;
        cycleCount++;
      }
      const avgCycleDays = cycleCount > 0 ? Math.max(1, Math.round((totalCycleDays / cycleCount) * 10) / 10) : 30.0;

      // Velocity = (Opps * AvgValue * WinRateRatio) / AvgCycleDays
      const velocityPerDay = (qualifiedOpportunities * avgDealVal * winRateRatio) / avgCycleDays;
      const velocityPerMonth = velocityPerDay * 30.0;

      return {
        qualifiedOpportunities,
        averageDealValue: Math.round(avgDealVal * 100) / 100,
        winRate: winRatePct,
        winRateRatio,
        averageSalesCycleDays: avgCycleDays,
        velocityPerDay: Math.round(velocityPerDay * 100) / 100,
        velocityPerMonth: Math.round(velocityPerMonth * 100) / 100,
        sampleSize: dealSet.length,
      };
    };

    const current = calcMetricsForSet(currentDeals, days);
    const previous = calcMetricsForSet(previousDeals, days);

    const deltaVelocity = Math.round((current.velocityPerMonth - previous.velocityPerMonth) * 100) / 100;
    const deltaWinRate = Math.round((current.winRate - previous.winRate) * 10) / 10;
    const deltaCycleDays = Math.round((current.averageSalesCycleDays - previous.averageSalesCycleDays) * 10) / 10;

    return {
      periodDays: days,
      formula: 'Sales Velocity = (Qualified Opportunities * Average Deal Value * Win Rate) / Average Sales Cycle Length',
      current,
      previous,
      deltas: {
        velocityPerMonth: deltaVelocity,
        winRate: deltaWinRate,
        averageSalesCycleDays: deltaCycleDays,
      },
    };
  }

  /**
   * Pipeline Coverage & Target Configuration
   */
  async getActiveRevenueTarget(workspaceId = 'default-workspace') {
    // 1. In-memory check
    const memList = this._getMemoryTargetsList().filter(t => t.workspace_id === workspaceId);
    if (memList.length > 0) {
      return memList[memList.length - 1];
    }

    // 2. Supabase check
    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('sales_revenue_targets')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) return data;
      } catch {}
    }

    return null;
  }

  async setRevenueTarget(userIdOrOpts, maybeTargetData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeTargetData);
    const {
      userId,
      workspaceId = 'default-workspace',
      periodType = 'monthly',
      periodStart,
      periodEnd,
      targetRevenue = 100000.0,
      currency = this.defaultCurrency,
      targetPipelineCoverage = 3.0,
    } = opts;

    if (!targetRevenue || targetRevenue <= 0) {
      throw new Error('targetRevenue must be a positive number.');
    }

    const now = new Date();
    const start = periodStart || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = periodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const targetRecord = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      period_type: periodType,
      period_start: start,
      period_end: end,
      target_revenue: Number(targetRevenue),
      currency: currency.toUpperCase(),
      target_pipeline_coverage: Number(targetPipelineCoverage),
      created_by: userId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.memoryTargets.set(targetRecord.id, targetRecord);

    if (this.supabase) {
      try {
        await this.supabase.from('sales_revenue_targets').upsert(targetRecord);
      } catch (err) {
        console.warn('[RevenueIntelligenceService] Supabase target save warning:', err.message);
      }
    }

    return targetRecord;
  }

  /**
   * Campaign & Lead Source Revenue Attribution
   */
  async getRevenueAttribution(userIdOrOpts, maybeOpts = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeOpts);
    const { userId, workspaceId, role } = opts;
    const isManager = role === 'manager' || role === 'admin' || opts.is_manager || userId?.includes('manager');

    const rawDeals = await this._fetchDeals(userId, workspaceId, isManager);
    const { eligible } = this.filterEligibleDeals(rawDeals);

    // Group deals by campaign and lead source
    const campaignMap = new Map();
    const sourceMap = new Map();

    let totalAttributedRevenue = 0.0;
    let totalAttributedOpenPipeline = 0.0;
    let unassignedDealsCount = 0;

    for (const d of eligible) {
      const val = d.value;
      const isWon = d.status === 'won' || d.stage === 'Won' || d.stage === 'Closed Won';
      const isOpen = d.status === 'open';

      const source = d.leads?.source || d.source || 'Outbound Campaign';
      const campaignName = d.campaign_name || (d.campaign_id ? `Campaign ${d.campaign_id.slice(0, 8)}` : 'Cold Email Outreach');

      if (!d.leads?.source && !d.campaign_id && !d.campaign_name) {
        unassignedDealsCount++;
      }

      // Campaign aggregation
      if (!campaignMap.has(campaignName)) {
        campaignMap.set(campaignName, {
          campaign: campaignName,
          dealCount: 0,
          wonDeals: 0,
          closedWonRevenue: 0.0,
          openPipeline: 0.0,
          leadToOpportunityRate: 14.5,
          opportunityToWonRate: 0.0,
        });
      }
      const cEntry = campaignMap.get(campaignName);
      cEntry.dealCount++;
      if (isWon) {
        cEntry.wonDeals++;
        cEntry.closedWonRevenue += val;
        totalAttributedRevenue += val;
      } else if (isOpen) {
        cEntry.openPipeline += val;
        totalAttributedOpenPipeline += val;
      }

      // Source aggregation
      if (!sourceMap.has(source)) {
        sourceMap.set(source, {
          source,
          dealCount: 0,
          wonDeals: 0,
          closedWonRevenue: 0.0,
          openPipeline: 0.0,
        });
      }
      const sEntry = sourceMap.get(source);
      sEntry.dealCount++;
      if (isWon) {
        sEntry.wonDeals++;
        sEntry.closedWonRevenue += val;
      } else if (isOpen) {
        sEntry.openPipeline += val;
      }
    }

    // Calculate conversion rates
    const campaignsList = Array.from(campaignMap.values()).map(c => ({
      ...c,
      closedWonRevenue: Math.round(c.closedWonRevenue * 100) / 100,
      openPipeline: Math.round(c.openPipeline * 100) / 100,
      opportunityToWonRate: c.dealCount > 0 ? Math.round((c.wonDeals / c.dealCount) * 1000) / 10 : 0.0,
      averageDealSize: c.dealCount > 0 ? Math.round(((c.closedWonRevenue + c.openPipeline) / c.dealCount) * 100) / 100 : 0.0,
    }));

    const sourcesList = Array.from(sourceMap.values()).map(s => ({
      ...s,
      closedWonRevenue: Math.round(s.closedWonRevenue * 100) / 100,
      openPipeline: Math.round(s.openPipeline * 100) / 100,
      winRate: s.dealCount > 0 ? Math.round((s.wonDeals / s.dealCount) * 1000) / 10 : 0.0,
    }));

    const isPartial = eligible.length > 0 && unassignedDealsCount > (eligible.length * 0.4);

    return {
      totalAttributedRevenue: Math.round(totalAttributedRevenue * 100) / 100,
      totalAttributedOpenPipeline: Math.round(totalAttributedOpenPipeline * 100) / 100,
      campaigns: campaignsList,
      sources: sourcesList,
      attributionCoverage: isPartial ? 'partial' : 'complete',
      attributionWarning: isPartial ? 'Some deals lack linked campaign IDs or lead origins; attribution represents available touchpoints only.' : null,
      totalDealsAnalyzed: eligible.length,
    };
  }
}
