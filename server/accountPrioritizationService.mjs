/**
 * AI Account Prioritization Engine
 * Calculates an explainable, deterministic account priority score (0-100).
 *
 * Scoring Model v1.0.0:
 * - Company Fit (max 25 points)
 * - Revenue Potential / Deal Value (max 25 points)
 * - Buying Intent & Engagement (max 25 points)
 * - Activity Recency (max 15 points)
 * - Data Completeness (max 10 points)
 *
 * Determinism Guarantee:
 * AI-generated text or explanations never directly alter the numerical score.
 */

export const PRIORITIZATION_MODEL_VERSION = 'v1.0.0';

export class AccountPrioritizationService {
  constructor(crmOrSupabase = null, revOrCrm = null, meetingService = null, salesCallService = null) {
    if (crmOrSupabase && typeof crmOrSupabase.from === 'function') {
      this.supabase = crmOrSupabase;
      this.crmService = revOrCrm;
      this.revenueService = meetingService;
      this.meetingService = salesCallService;
    } else {
      this.crmService = crmOrSupabase;
      this.revenueService = revOrCrm;
      this.meetingService = meetingService;
      this.salesCallService = salesCallService;
    }
    this.modelVersion = PRIORITIZATION_MODEL_VERSION;

    // Cache of priority scores
    this.priorityCache = new Map(); // leadId -> priority object
  }

  /**
   * Score a single account/lead
   */
  scoreAccount(lead, context = {}) {
    if (!lead || !lead.id) {
      throw new Error('Valid lead object is required for scoring.');
    }

    const positiveSignals = [];
    const negativeSignals = [];
    const missingData = [];

    // --- 1. DATA COMPLETENESS (max 10 pts) ---
    let completenessPts = 0;
    if (lead.email) completenessPts += 2;
    else missingData.push('Email address');

    if (lead.company) completenessPts += 2;
    else missingData.push('Company name');

    if (lead.company_domain || lead.website) completenessPts += 2;
    else missingData.push('Company domain/website');

    if (lead.job_title) completenessPts += 2;
    else missingData.push('Decision maker job title');

    if (lead.location) completenessPts += 2;
    else missingData.push('Geographic location');

    // Check if data is critically insufficient
    const isCriticallyInsufficient = (!lead.company && !lead.company_domain) ||
      (!lead.industry && !lead.company_size && !lead.location && Number(lead.deal_value || 0) === 0) ||
      missingData.length >= 4;

    // --- 2. COMPANY FIT (max 25 pts) ---
    let companyFitPts = 0;
    const industry = (lead.industry || lead.raw_enrichment?.industry || '').toLowerCase();
    const size = lead.company_size || lead.raw_enrichment?.company_size || '';
    const domain = lead.company_domain || lead.website;

    if (industry) {
      // High-fit B2B tech/services sectors
      const highFitIndustries = ['software', 'saas', 'information technology', 'fintech', 'marketing', 'healthcare', 'telecom'];
      if (highFitIndustries.some(hi => industry.includes(hi))) {
        companyFitPts += 10;
        positiveSignals.push(`High-fit target industry: ${lead.industry}`);
      } else {
        companyFitPts += 6;
      }
    } else {
      missingData.push('Industry categorization');
    }

    const rawSize = lead.company_size || lead.raw_enrichment?.company_size;
    const numSize = typeof rawSize === 'number' ? rawSize : (typeof rawSize === 'string' && rawSize.match(/\d+/) ? Number(rawSize.match(/\d+/)[0]) : 0);
    const sizeStr = rawSize ? String(rawSize) : '';

    if (rawSize) {
      // Mid-market & enterprise sweet spot
      if ((numSize >= 50 && numSize <= 5000) || sizeStr.includes('51-200') || sizeStr.includes('201-500') || sizeStr.includes('501-1000') || sizeStr.includes('1001-5000')) {
        companyFitPts += 10;
        positiveSignals.push(`Optimal employee size bracket: ${rawSize}`);
      } else if (numSize >= 11 || sizeStr.includes('11-50')) {
        companyFitPts += 7;
      } else {
        companyFitPts += 4;
      }
    } else {
      missingData.push('Company size/employee count');
    }

    if (domain && !domain.includes('gmail.com') && !domain.includes('yahoo.com')) {
      companyFitPts += 5;
    }

    // --- 3. REVENUE POTENTIAL / DEAL VALUE (max 25 pts) ---
    let revenuePotentialPts = 0;
    const dealValue = Number(lead.deal_value || context.dealValue || 0);
    const deals = context.deals || [];
    const openDeals = deals.filter(d => d.status === 'open');
    const totalPipeline = openDeals.reduce((sum, d) => sum + (Number(d.value) || 0), dealValue);

    if (totalPipeline >= 50000) {
      revenuePotentialPts = 25;
      positiveSignals.push(`High pipeline value: $${totalPipeline.toLocaleString()}`);
    } else if (totalPipeline >= 25000) {
      revenuePotentialPts = 20;
      positiveSignals.push(`Substantial pipeline value: $${totalPipeline.toLocaleString()}`);
    } else if (totalPipeline >= 10000) {
      revenuePotentialPts = 15;
    } else if (totalPipeline > 0) {
      revenuePotentialPts = 10;
    } else {
      // Benchmark based on tier
      if (lead.account_tier === 'strategic') revenuePotentialPts = 18;
      else if (lead.account_tier === 'tier_1') revenuePotentialPts = 12;
      else revenuePotentialPts = 6;
    }

    // --- 4. BUYING INTENT & ENGAGEMENT (max 25 pts) ---
    // Note: Email open alone does NOT grant high buying intent.
    let intentPts = 0;
    const hasReplied = context.hasReplied || lead.status === 'Replied' || lead.stage === 'Meeting Scheduled' || lead.stage === 'Demo';
    const hasMeetingBooked = context.hasMeetingBooked || lead.has_meeting;
    const hasCallInsights = context.hasCallInsights || false;

    if (hasMeetingBooked) {
      intentPts += 15;
      positiveSignals.push('Confirmed sales meeting booked in scheduler');
    }

    if (hasReplied) {
      intentPts += 8;
      positiveSignals.push('Prospect engaged and replied to outreach');
    }

    if (hasCallInsights) {
      intentPts += 2;
      positiveSignals.push('Sales call transcript intelligence analyzed');
    }

    if (!hasMeetingBooked && !hasReplied) {
      negativeSignals.push('No inbound replies or meetings logged yet');
    }

    // --- 5. ACTIVITY RECENCY (max 15 pts) ---
    let recencyPts = 0;
    const now = Date.now();
    const lastActivity = lead.last_activity_at || lead.updated_at || lead.created_at;
    const daysSinceActivity = lastActivity ? Math.floor((now - new Date(lastActivity).getTime()) / 86400000) : 60;

    if (daysSinceActivity <= 7) {
      recencyPts = 15;
      positiveSignals.push('Touched within the last 7 days');
    } else if (daysSinceActivity <= 14) {
      recencyPts = 10;
    } else if (daysSinceActivity <= 30) {
      recencyPts = 5;
    } else {
      recencyPts = 1;
      negativeSignals.push(`No sales activity in ${daysSinceActivity} days`);
    }

    // Compute raw total and clamp [0, 100]
    let totalScore = completenessPts + companyFitPts + revenuePotentialPts + intentPts + recencyPts;
    totalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

    // Categorization
    let priorityCategory = 'Medium Priority';
    if (isCriticallyInsufficient || totalScore < 25) {
      priorityCategory = 'Insufficient Data';
      totalScore = Math.min(totalScore, 24);
    } else if (totalScore >= 75) {
      priorityCategory = 'High Priority';
    } else if (totalScore >= 50) {
      priorityCategory = 'Medium Priority';
    } else {
      priorityCategory = 'Low Priority';
    }

    // Human explanation
    const explanation = `Account scored ${totalScore}/100 (${priorityCategory}) based on company fit (${companyFitPts}/25), pipeline revenue potential (${revenuePotentialPts}/25), verified buying intent (${intentPts}/25), activity recency (${recencyPts}/15), and data completeness (${completenessPts}/10).`;

    const result = {
      leadId: lead.id,
      lead_id: lead.id,
      company: lead.company || 'Unnamed Account',
      score: totalScore,
      priorityScore: totalScore,
      priority_score: totalScore,
      priorityCategory,
      priority_category: priorityCategory,
      modelVersion: this.modelVersion,
      model_version: this.modelVersion,
      components: {
        companyFit: companyFitPts,
        revenuePotential: revenuePotentialPts,
        buyingIntent: intentPts,
        activityRecency: recencyPts,
        dataCompleteness: completenessPts,
      },
      score_breakdown: {
        company_fit: companyFitPts,
        revenue_potential: revenuePotentialPts,
        buying_intent: intentPts,
        activity_recency: recencyPts,
        data_completeness: completenessPts,
      },
      positiveSignals,
      negativeSignals,
      missingData,
      signals: {
        positive_signals: positiveSignals,
        negative_signals: negativeSignals,
        missing_data: missingData,
        positiveSignals,
        negativeSignals,
        missingData,
      },
      explanation,
      lastEvaluatedAt: new Date().toISOString(),
    };

    this.priorityCache.set(lead.id, result);
    return result;
  }

  computeAccountScore(lead, context = {}) {
    return this.scoreAccount(lead, context);
  }

  generateExplainableAnalysis(lead, scoreResult = null) {
    return this.explainScore(lead, scoreResult);
  }

  explainScore(lead, scoreResult = null) {
    const sr = scoreResult || this.scoreAccount(lead);
    const comps = sr.components || sr.score_breakdown || {};
    return {
      ...sr,
      priority_score: sr.score ?? sr.priority_score ?? sr.priorityScore,
      explanation: {
        summary: sr.explanation || `Account scored ${sr.priority_score}/100 based on 5-factor model.`,
        component_breakdown: [
          { component: 'Company Fit', points: comps.companyFit ?? comps.company_fit ?? 0, maxPoints: 25 },
          { component: 'Revenue Potential', points: comps.revenuePotential ?? comps.revenue_potential ?? 0, maxPoints: 25 },
          { component: 'Buying Intent & Engagement', points: comps.buyingIntent ?? comps.buying_intent ?? 0, maxPoints: 25 },
          { component: 'Activity Recency', points: comps.activityRecency ?? comps.activity_recency ?? 0, maxPoints: 15 },
          { component: 'Data Completeness', points: comps.dataCompleteness ?? comps.data_completeness ?? 0, maxPoints: 10 },
        ],
      },
    };
  }

  /**
   * Batch score accounts
   */
  scoreAccounts(leads = [], contextMap = new Map()) {
    return leads.map(l => this.scoreAccount(l, contextMap.get(l.id) || {}));
  }
}
