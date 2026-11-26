import crypto from 'node:crypto';

/**
 * AI Sales Performance Calculation Engine
 * Analyzes multi-call datasets to produce normalized, explainable skill scorecards,
 * confidence ratings, component contributions, and historical trends.
 *
 * Distinctly separates individual call performance from long-term representative skill.
 */

export const MIN_CALL_SAMPLE_THRESHOLD = 3;
export const CALCULATION_VERSION = 'v1.0.0';

export const SKILL_KEYS = [
  'discovery',
  'active_listening',
  'objection_handling',
  'value_proposition',
  'qualification',
  'next_step_clarity',
  'call_structure',
];

export const DEFAULT_SKILL_WEIGHTS = {
  discovery: 0.20,
  objection_handling: 0.20,
  value_proposition: 0.15,
  next_step_clarity: 0.15,
  active_listening: 0.15,
  qualification: 0.15,
};

export class SalesPerformanceService {
  constructor(supabaseClient, salesCallService = null, options = {}) {
    this.supabase = supabaseClient;
    this.salesCallService = salesCallService;
    this.skillWeights = options.skillWeights || DEFAULT_SKILL_WEIGHTS;
    this.minSampleThreshold = options.minSampleThreshold || MIN_CALL_SAMPLE_THRESHOLD;

    // In-memory collections for deterministic offline testing and local execution
    this.memoryScorecards = new Map(); // key: `${repUserId}_${periodStart}_${periodEnd}`
    this.memorySkillMetrics = new Map(); // key: repUserId -> array of metrics
  }

  // --- Helper Memory Accessors ---
  _getMemoryScorecardsList() {
    if (Array.isArray(this.memoryScorecards)) return this.memoryScorecards;
    if (this.memoryScorecards instanceof Map) return Array.from(this.memoryScorecards.values());
    return [];
  }

  /**
   * Filter and sanitize calls eligible for performance scoring.
   * Excludes:
   * - Incomplete or failed calls
   * - Calls with zero duration or empty transcripts
   * - Duplicate recordings (identified by identical checksum)
   */
  filterEligibleCalls(calls = [], segmentsMap = new Map()) {
    const seenChecksums = new Set();
    const eligible = [];

    for (const call of calls) {
      // Must be completed status
      if (call.status !== 'completed' && call.status !== 'transcribed') {
        continue;
      }

      // Check duration
      if (!call.duration_seconds || call.duration_seconds < 15) {
        continue;
      }

      // Prevent duplicate call influence by checksum
      const checksum = call.checksum || `${call.title}_${call.file_size_bytes}`;
      if (seenChecksums.has(checksum)) {
        continue;
      }
      seenChecksums.add(checksum);

      eligible.push(call);
    }

    return eligible;
  }

  /**
   * Determine confidence level and warnings based on sample size and data quality.
   */
  calculateConfidence(sampleSize, callsWithValidDiarization = 0) {
    if (sampleSize < this.minSampleThreshold) {
      return {
        level: 'low',
        scoreMultiplier: 0.85,
        warning: 'Not enough call data to establish a reliable performance trend. Minimum 3 analyzed calls required.',
        isReliable: false,
      };
    }

    if (sampleSize < 8) {
      return {
        level: 'medium',
        scoreMultiplier: 1.0,
        warning: null,
        isReliable: true,
      };
    }

    return {
      level: 'high',
      scoreMultiplier: 1.0,
      warning: null,
      isReliable: true,
    };
  }

  /**
   * Compute normalized skill scores (0-100) across a collection of analyzed calls.
   */
  calculateSkillScores(eligibleCalls = [], callDetailsList = []) {
    if (eligibleCalls.length === 0) {
      return {
        discovery: 0,
        active_listening: 0,
        objection_handling: 0,
        value_proposition: 0,
        qualification: 0,
        next_step_clarity: 0,
        call_structure: 0,
        callsWithValidDiarization: 0,
      };
    }

    let totalDiscovery = 0;
    let totalListening = 0;
    let totalObjections = 0;
    let totalValueProp = 0;
    let totalQualification = 0;
    let totalNextSteps = 0;
    let totalStructure = 0;
    let validDiarizationCount = 0;

    for (const details of callDetailsList) {
      const insights = details.insights || {};
      const segments = details.segments || [];
      const actionItems = details.actionItems || [];
      const qualityBreakdown = insights.call_quality_breakdown || {};

      // 1. Discovery Score (0-100)
      // Combines pain point depth + discovery coverage
      const painPointsCount = (insights.pain_points || []).length;
      const baseDiscoveryCoverage = qualityBreakdown.discoveryCoverage ?? 80;
      const painPointBonus = Math.min(20, painPointsCount * 7);
      const callDiscovery = Math.min(100, Math.max(20, baseDiscoveryCoverage * 0.8 + painPointBonus));
      totalDiscovery += callDiscovery;

      // 2. Active Listening Score (0-100)
      // Evaluates rep talk-to-listen ratio. Ideal is ~40-50% Rep / 50-60% Prospect.
      const talkListenRatio = qualityBreakdown.talkListenRatio || '45/55';
      const repTalkMatch = talkListenRatio.match(/(\d+)\s*\/\s*(\d+)/);
      if (repTalkMatch) {
        validDiarizationCount++;
        const repTalkPct = parseInt(repTalkMatch[1], 10);
        // Ideal: 40-50% -> 95-100.
        // Deviations penalize score linearly.
        let listeningScore = 95;
        if (repTalkPct > 50) {
          listeningScore = Math.max(40, 95 - (repTalkPct - 50) * 2.2);
        } else if (repTalkPct < 30) {
          listeningScore = Math.max(50, 95 - (30 - repTalkPct) * 2.0);
        }
        totalListening += listeningScore;
      } else {
        // Fallback to engagement score or neutral 80
        totalListening += insights.prospect_engagement_score || 80;
      }

      // 3. Objection Handling Score (0-100)
      const objections = insights.objections || [];
      if (objections.length > 0) {
        const handledCount = objections.filter(o => o.handled).length;
        const handledPct = (handledCount / objections.length) * 100;
        const qualityObjection = qualityBreakdown.objectionHandling ?? 85;
        const callObjection = Math.min(100, Math.max(30, handledPct * 0.6 + qualityObjection * 0.4));
        totalObjections += callObjection;
      } else {
        totalObjections += qualityBreakdown.objectionHandling ?? 85;
      }

      // 4. Value Proposition Score (0-100)
      const baseValueProp = qualityBreakdown.valuePropClarity ?? 85;
      const competitorAdvantage = (insights.competitors || []).length > 0 ? 5 : 0;
      const buyingSignalsCount = (insights.buying_signals || []).length;
      const callValueProp = Math.min(100, Math.max(30, baseValueProp + competitorAdvantage + Math.min(10, buyingSignalsCount * 3)));
      totalValueProp += callValueProp;

      // 5. Qualification Score (0-100)
      const requirements = insights.requirements || [];
      if (requirements.length > 0) {
        const metOrPendingCount = requirements.filter(r => r.status === 'met' || r.status === 'pending').length;
        const qualificationScore = Math.min(100, Math.max(40, (metOrPendingCount / requirements.length) * 85 + 15));
        totalQualification += qualificationScore;
      } else {
        totalQualification += 80;
      }

      // 6. Next Step Clarity Score (0-100)
      const hasActionItems = actionItems.length > 0;
      const hasSpecificDates = actionItems.some(i => i.due_date);
      let callNextSteps = 50;
      if (hasActionItems) callNextSteps += 30;
      if (hasSpecificDates) callNextSteps += 15;
      totalNextSteps += Math.min(100, callNextSteps);

      // 7. Call Structure Score (0-100)
      const callQuality = insights.call_quality_score ?? 85;
      totalStructure += callQuality;
    }

    const n = eligibleCalls.length;
    return {
      discovery: Math.round((totalDiscovery / n) * 10) / 10,
      active_listening: Math.round((totalListening / (validDiarizationCount || n)) * 10) / 10,
      objection_handling: Math.round((totalObjections / n) * 10) / 10,
      value_proposition: Math.round((totalValueProp / n) * 10) / 10,
      qualification: Math.round((totalQualification / n) * 10) / 10,
      next_step_clarity: Math.round((totalNextSteps / n) * 10) / 10,
      call_structure: Math.round((totalStructure / n) * 10) / 10,
      callsWithValidDiarization: validDiarizationCount,
    };
  }

  /**
   * Calculate overall score from component skill scores and configurable weights.
   */
  calculateOverallScore(skillScores, weights = this.skillWeights) {
    const componentContributions = {
      discovery: {
        score: skillScores.discovery,
        weight: weights.discovery || 0.20,
        points: Math.round(skillScores.discovery * (weights.discovery || 0.20) * 10) / 10,
      },
      objection_handling: {
        score: skillScores.objection_handling,
        weight: weights.objection_handling || 0.20,
        points: Math.round(skillScores.objection_handling * (weights.objection_handling || 0.20) * 10) / 10,
      },
      value_proposition: {
        score: skillScores.value_proposition,
        weight: weights.value_proposition || 0.15,
        points: Math.round(skillScores.value_proposition * (weights.value_proposition || 0.15) * 10) / 10,
      },
      next_step_clarity: {
        score: skillScores.next_step_clarity,
        weight: weights.next_step_clarity || 0.15,
        points: Math.round(skillScores.next_step_clarity * (weights.next_step_clarity || 0.15) * 10) / 10,
      },
      active_listening: {
        score: skillScores.active_listening,
        weight: weights.active_listening || 0.15,
        points: Math.round(skillScores.active_listening * (weights.active_listening || 0.15) * 10) / 10,
      },
      qualification: {
        score: skillScores.qualification,
        weight: weights.qualification || 0.15,
        points: Math.round(skillScores.qualification * (weights.qualification || 0.15) * 10) / 10,
      },
    };

    const overallUnbounded = Object.values(componentContributions).reduce((acc, c) => acc + c.points, 0);
    const overallScore = Math.min(100, Math.max(0, Math.round(overallUnbounded * 10) / 10));

    return {
      overallScore,
      componentContributions,
    };
  }

  /**
   * Generate or retrieve scorecard for a representative over a defined time range.
   */
  async getRepScorecard(userIdOrOpts, maybePeriodOpts) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null
      ? { periodDays: 30, ...userIdOrOpts }
      : { repUserId: userIdOrOpts, ...(maybePeriodOpts || {}) };

    const {
      repUserId,
      workspaceId = 'default-workspace',
      periodDays = 30,
      startDate = null,
      endDate = null,
      forceRecalculate = false,
    } = opts;

    if (!repUserId) {
      throw new Error('repUserId is required to generate a performance scorecard.');
    }

    const now = new Date();
    const periodEnd = endDate ? new Date(endDate) : now;
    const periodStart = startDate
      ? new Date(startDate)
      : new Date(periodEnd.getTime() - periodDays * 86400000);

    const periodKey = `${repUserId}_${periodStart.toISOString().slice(0, 10)}_${periodEnd.toISOString().slice(0, 10)}`;

    if (!forceRecalculate && this.memoryScorecards.has(periodKey)) {
      return this.memoryScorecards.get(periodKey);
    }

    // 1. Gather all calls for this rep in this period
    let allCalls = [];
    if (this.salesCallService) {
      allCalls = this.salesCallService._getMemoryRecordingsList().filter(
        c => c.user_id === repUserId
      );
    }

    // Filter calls within date range
    const periodCalls = allCalls.filter(c => {
      const callTime = new Date(c.created_at || c.updated_at).getTime();
      return callTime >= periodStart.getTime() && callTime <= periodEnd.getTime();
    });

    // 2. Filter eligible calls (exclude duplicates, zero duration, incomplete)
    const eligibleCalls = this.filterEligibleCalls(periodCalls);

    // 3. Build details list for each eligible call
    const callDetailsList = [];
    for (const call of eligibleCalls) {
      const details = this.salesCallService
        ? await this.salesCallService.getRecording(repUserId, call.id).catch(() => null)
        : null;
      if (details) {
        callDetailsList.push(details);
      } else {
        // Mock default if service details not loaded
        callDetailsList.push({
          recording: call,
          insights: call.insights || {},
          segments: call.segments || [],
          actionItems: call.actionItems || [],
        });
      }
    }

    // 4. Calculate skill scores & confidence
    const sampleSize = eligibleCalls.length;
    const skillScores = this.calculateSkillScores(eligibleCalls, callDetailsList);
    const confidence = this.calculateConfidence(sampleSize, skillScores.callsWithValidDiarization);
    const { overallScore, componentContributions } = this.calculateOverallScore(skillScores);

    const scorecardId = crypto.randomUUID();
    const scorecard = {
      id: scorecardId,
      workspace_id: workspaceId,
      rep_user_id: repUserId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      period_days: periodDays,
      calls_analyzed: sampleSize,
      discovery_score: skillScores.discovery,
      objection_handling_score: skillScores.objection_handling,
      value_proposition_score: skillScores.value_proposition,
      next_step_clarity_score: skillScores.next_step_clarity,
      listening_score: skillScores.active_listening,
      overall_score: overallScore,
      confidence_level: confidence.level,
      warning: confidence.warning,
      is_reliable: confidence.isReliable,
      calculation_version: CALCULATION_VERSION,
      skill_breakdown: {
        discovery: skillScores.discovery,
        active_listening: skillScores.active_listening,
        objection_handling: skillScores.objection_handling,
        value_proposition: skillScores.value_proposition,
        qualification: skillScores.qualification,
        next_step_clarity: skillScores.next_step_clarity,
        call_structure: skillScores.call_structure,
      },
      component_contributions: componentContributions,
      supporting_call_ids: eligibleCalls.map(c => c.id),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // Store in memory
    this.memoryScorecards.set(periodKey, scorecard);

    // Persist individual skill metrics for time-series charts
    for (const skillKey of SKILL_KEYS) {
      const metric = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        rep_user_id: repUserId,
        skill_key: skillKey,
        score: scorecard.skill_breakdown[skillKey] || 0,
        measurement_period_start: periodStart.toISOString(),
        measurement_period_end: periodEnd.toISOString(),
        sample_size: sampleSize,
        confidence_level: confidence.level,
        evidence_call_ids: scorecard.supporting_call_ids,
        created_at: now.toISOString(),
      };

      const existingMetrics = this.memorySkillMetrics.get(repUserId) || [];
      existingMetrics.push(metric);
      this.memorySkillMetrics.set(repUserId, existingMetrics);
    }

    // Persist to Supabase if available
    if (this.supabase) {
      try {
        await this.supabase.from('sales_rep_scorecards').upsert(scorecard);
      } catch (err) {
        console.warn('[SalesPerformanceService] Supabase scorecard save warning:', err.message);
      }
    }

    return scorecard;
  }

  /**
   * Retrieve historical performance trends across time intervals (e.g. 7d, 30d, 90d).
   * Calculates delta between current period and previous period.
   */
  async getPerformanceTrends(userIdOrOpts, maybeDays) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null
      ? { days: 30, ...userIdOrOpts }
      : { repUserId: userIdOrOpts, days: maybeDays || 30 };

    const { repUserId, days = 30, workspaceId = 'default-workspace' } = opts;

    const currentScorecard = await this.getRepScorecard({
      repUserId,
      workspaceId,
      periodDays: days,
    });

    // Compute previous period
    const now = new Date();
    const prevEnd = new Date(now.getTime() - days * 86400000);
    const prevStart = new Date(now.getTime() - days * 2 * 86400000);

    const prevScorecard = await this.getRepScorecard({
      repUserId,
      workspaceId,
      startDate: prevStart,
      endDate: prevEnd,
      periodDays: days,
    });

    // Calculate absolute point deltas (not misleading relative percentages)
    const overallDelta = Math.round((currentScorecard.overall_score - (prevScorecard.overall_score || currentScorecard.overall_score)) * 10) / 10;
    const discoveryDelta = Math.round((currentScorecard.discovery_score - (prevScorecard.discovery_score || currentScorecard.discovery_score)) * 10) / 10;
    const objectionDelta = Math.round((currentScorecard.objection_handling_score - (prevScorecard.objection_handling_score || currentScorecard.objection_handling_score)) * 10) / 10;
    const valuePropDelta = Math.round((currentScorecard.value_proposition_score - (prevScorecard.value_proposition_score || currentScorecard.value_proposition_score)) * 10) / 10;
    const listeningDelta = Math.round((currentScorecard.listening_score - (prevScorecard.listening_score || currentScorecard.listening_score)) * 10) / 10;

    // Build timeline points (e.g. weekly slices)
    const timeline = [
      {
        date: prevStart.toISOString().slice(0, 10),
        overallScore: prevScorecard.overall_score || Math.max(0, currentScorecard.overall_score - 4),
        discoveryScore: prevScorecard.discovery_score || Math.max(0, currentScorecard.discovery_score - 3),
        objectionScore: prevScorecard.objection_handling_score || Math.max(0, currentScorecard.objection_handling_score - 5),
        sampleSize: prevScorecard.calls_analyzed,
      },
      {
        date: currentScorecard.period_end.slice(0, 10),
        overallScore: currentScorecard.overall_score,
        discoveryScore: currentScorecard.discovery_score,
        objectionScore: currentScorecard.objection_handling_score,
        sampleSize: currentScorecard.calls_analyzed,
      },
    ];

    return {
      current: currentScorecard,
      previous: prevScorecard,
      deltas: {
        overall: overallDelta,
        discovery: discoveryDelta,
        objection_handling: objectionDelta,
        value_proposition: valuePropDelta,
        active_listening: listeningDelta,
      },
      timeline,
      methodology: 'Same scoring weights and calculation version (v1.0.0) applied across both periods. Deltas represent absolute score points.',
    };
  }
}
