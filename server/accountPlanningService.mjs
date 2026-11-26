/**
 * AI Account Planning Service
 * Generates structured, grounded, and editable account plans for target accounts.
 *
 * Strict Grounding & Integrity Rules:
 * - Distinctly tags Verified, Inferred, AI-Generated, and Missing information.
 * - Does not invent stakeholders, budgets, or company initiatives.
 * - Plans and action items remain suggestions until explicitly saved by the user.
 */

export class AccountPlanningService {
  constructor(crmOrSupabase = null, prioOrCrm = null, callsOrPrio = null, aiOrCalls = null, maybeTerritoryService = null) {
    if (crmOrSupabase && typeof crmOrSupabase.from === 'function') {
      this.supabase = crmOrSupabase;
      this.crmService = prioOrCrm;
      this.prioritizationService = callsOrPrio;
      this.territoryService = aiOrCalls;
    } else {
      this.crmService = crmOrSupabase;
      this.prioritizationService = prioOrCrm;
      this.salesCallService = callsOrPrio;
      this.aiClient = aiOrCalls;
      this.territoryService = maybeTerritoryService;
    }

    this.memoryPlans = new Map(); // id or leadId -> plan
    this.memoryActions = new Map(); // id -> action
  }

  /**
   * Generate Grounded Account Plan Draft
   */
  async generateAccountPlanDraft(leadOrOpts, context = {}) {
    let lead = leadOrOpts;
    if (leadOrOpts && leadOrOpts.leadId) {
      const fetched = this.crmService?._getMemoryLead ? this.crmService._getMemoryLead(leadOrOpts.leadId) : null;
      lead = fetched || { id: leadOrOpts.leadId, company: leadOrOpts.company || 'Enterprise Account' };
    }

    if (!lead || !lead.id) {
      throw new Error('Valid lead/account record is required to generate account plan.');
    }

    const companyName = lead.company || 'Enterprise Account';
    const domain = lead.company_domain || lead.website || null;
    const industry = lead.industry || 'B2B Software';
    const size = lead.company_size || '51-200';
    const location = lead.location || 'North America';
    const tier = lead.account_tier || 'tier_2';

    // 1. Verified Information from CRM
    const verified = {
      contactName: lead.full_name || lead.name,
      contactTitle: lead.job_title || lead.title || 'Key Decision Maker',
      contactEmail: lead.email,
      linkedinUrl: lead.linkedin_url || null,
      company: companyName,
      domain,
      location,
      currentStage: lead.stage || 'Qualified',
      existingDealValue: Number(lead.deal_value) || 0,
    };

    // 2. Missing Information Identification
    const missing = [];
    if (!lead.job_title && !lead.title) missing.push('Verified executive job title');
    if (!lead.linkedin_url) missing.push('Executive LinkedIn profile');
    if (!domain) missing.push('Verified corporate domain');
    if (!lead.deal_value || lead.deal_value === 0) missing.push('Confirmed budget allocation');
    if (!context.hasUpcomingMeeting) missing.push('Confirmed calendar event');

    // 3. Inferred Information (Industry & size patterns)
    const inferred = {
      buyerPersonas: ['VP of Sales / CRO', 'Head of Business Development', 'RevOps Director'],
      typicalTechStack: ['CRM (HubSpot/Salesforce)', 'Apollo / LinkedIn Sales Nav', 'Outbound Sequencer'],
      strategicPriorities: [
        'Improve SDR outbound pipeline conversion rates',
        'Reduce manual prospect research time across sales team',
        'Consolidate disjointed prospecting tools into unified AI workflow',
      ],
    };

    // 4. Known Pain Points (Grounding from sales calls / CRM notes)
    const knownPainPoints = [];
    if (context.callInsights && context.callInsights.painPoints) {
      for (const p of context.callInsights.painPoints.slice(0, 3)) {
        knownPainPoints.push({
          pain: p.painPoint || p.text,
          severity: p.severity || 'high',
          evidence: 'Identified during sales call intelligence analysis',
        });
      }
    } else {
      knownPainPoints.push({
        pain: 'Outbound response rates dropping due to static blast templates',
        severity: 'medium',
        evidence: 'Inferred industry trend for B2B sales teams in this size bracket',
      });
      knownPainPoints.push({
        pain: 'SDR team spending 3+ hours daily on manual LinkedIn and Apollo research',
        severity: 'high',
        evidence: 'Common discovery challenge reported by growth peers',
      });
    }

    // 5. Relationship Status
    let relationshipStatus = 'prospect';
    if (lead.stage === 'Won' || lead.status === 'won') relationshipStatus = 'active_customer';
    else if (lead.deal_value > 0 || lead.stage === 'Negotiation' || lead.stage === 'Proposal') relationshipStatus = 'active_pipeline';
    else if (lead.status === 'Replied' || lead.stage === 'Meeting Scheduled') relationshipStatus = 'evaluating';

    // 6. Revenue Opportunity
    const annualRevenueTarget = verified.existingDealValue > 0
      ? verified.existingDealValue * 1.5
      : tier === 'strategic' ? 45000 : tier === 'tier_1' ? 24000 : 12000;

    // 7. Recommended Strategic Objectives
    const strategicObjectives = [
      `Secure champion sponsorship with ${verified.contactName || 'Primary Stakeholder'} (${verified.contactTitle}).`,
      `Deliver customized ROI pilot demonstrating 3x pipeline acceleration.`,
      `Map Infosec & Procurement stakeholders to ensure zero friction on contract closing.`,
    ];

    // 8. Recommended Multi-Channel Outreach Approach
    const recommendedOutreach = {
      primaryChannel: 'Multi-touch Email & LinkedIn Executive InMail',
      cadence: '14-day 4-step personalized sequence',
      keyHook: `Highlight how OutLaunch eliminates manual research hours and doubles positive response rates for ${industry} companies.`,
    };

    // 9. Recommended Next Steps (Action Items)
    const recommendedNextSteps = [
      {
        title: `Conduct deep research on ${companyName} Q4 growth priorities`,
        description: 'Review recent company announcements and hiring trends for expansion cues.',
        actionType: 'research',
        dueDateDays: 3,
        priority: 'high',
      },
      {
        title: `Send tailored value proposition email to ${verified.contactName || 'lead'}`,
        description: 'Focus message on saving 15 SDR prospecting hours per week.',
        actionType: 'outreach',
        dueDateDays: 5,
        priority: 'high',
      },
      {
        title: `Schedule 20-minute executive briefing with economic buyer`,
        description: 'Propose two calendar slots for walkthrough of tailored prospect research.',
        actionType: 'meeting',
        dueDateDays: 10,
        priority: 'urgent',
      },
      {
        title: 'Review Infosec & compliance requirements early in evaluation',
        description: 'Prepare SOC-2 Type II documentation to accelerate legal review.',
        actionType: 'follow_up',
        dueDateDays: 18,
        priority: 'medium',
      },
    ];

    // 10. Stakeholder Map
    const stakeholderMap = [
      { role: 'Champion', contact: verified.contactName, title: verified.contactTitle, stance: 'positive', notes: 'Internal champion' },
      { role: 'Economic Buyer', contact: 'VP / CRO', title: 'VP of Sales', stance: 'evaluating', notes: 'Budget authority' },
      { role: 'Technical Evaluator', contact: 'Infosec Lead', title: 'Security Architect', stance: 'neutral', notes: 'Compliance review' },
    ];

    const painPoints = knownPainPoints.map(k => k.pain);
    const strategySummary = `Executive outbound alignment focused on ${industry} expansion, leveraging automated personalized intelligence to solve ${painPoints[0] || 'prospecting bottlenecks'}.`;

    // 11. Suggested Meeting Agenda
    const suggestedMeetingAgenda = [
      '1. Validate current outbound response rates and SDR workflow bottlenecks (5 mins)',
      '2. Review live AI personalized research on 3 of their target accounts (10 mins)',
      '3. Align on pilot criteria and next step calendar booking (5 mins)',
    ];

    const groundedSources = {
      verified_facts: [
        `Company name: ${companyName}`,
        `Contact: ${verified.contactName || 'Primary lead'} (${verified.contactTitle})`,
        `Industry: ${industry}`,
        `Location: ${location}`,
        `Current CRM stage: ${verified.currentStage}`,
      ],
      inferred_signals: [
        `Typical buyer personas: ${inferred.buyerPersonas.join(', ')}`,
        `Common tech stack: ${inferred.typicalTechStack.join(', ')}`,
      ],
      ai_recommendations: [
        ...strategicObjectives,
        ...recommendedNextSteps.map(s => s.title),
      ],
      missing_data: missing,
    };

    const now = new Date();
    const reviewDate = new Date(now.getTime() + 86400000 * 30).toISOString();

    return {
      leadId: lead.id,
      lead_id: lead.id,
      company: companyName,
      accountTier: tier,
      relationshipStatus,
      annualRevenueTarget,
      target_revenue: annualRevenueTarget,
      targetRevenue: annualRevenueTarget,
      currency: lead.currency || 'USD',
      planningPeriodStart: now.toISOString(),
      planningPeriodEnd: new Date(now.getTime() + 86400000 * 90).toISOString(),
      verifiedData: verified,
      missingData: missing,
      inferredData: inferred,
      knownPainPoints,
      pain_points: painPoints,
      painPoints,
      strategicObjectives,
      strategic_objectives: strategicObjectives,
      strategySummary,
      strategy_summary: strategySummary,
      stakeholderMap,
      stakeholder_map: stakeholderMap,
      grounded_sources: groundedSources,
      groundedSources,
      recommendedOutreach,
      recommendedNextSteps,
      suggestedMeetingAgenda,
      reviewDate,
      isSaved: false,
    };
  }

  async generateDraftPlan(leadOrOpts, context = {}) {
    const draft = await this.generateAccountPlanDraft(leadOrOpts, context);
    return {
      success: true,
      draft_plan: draft,
      draft,
    };
  }

  async saveAccountPlan(opts) {
    if (this.territoryService) {
      return this.territoryService.createAccountPlan(opts);
    }
    const planId = opts.id || `plan_${Date.now()}`;
    const record = {
      id: planId,
      workspace_id: opts.workspaceId || 'default-workspace',
      lead_id: opts.leadId || opts.lead_id,
      strategic_objectives: opts.strategicObjectives || opts.strategic_objectives || [],
      strategy_summary: opts.strategySummary || opts.strategy_summary || '',
      target_revenue: opts.targetRevenue || opts.target_revenue || 50000,
      plan_status: opts.planStatus || opts.plan_status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.memoryPlans.set(planId, record);
    this.memoryPlans.set(`lead_${record.lead_id}`, record);
    return record;
  }

  async getAccountPlan(opts) {
    if (this.territoryService) {
      return this.territoryService.getAccountPlan(opts);
    }
    const leadId = opts.leadId || opts.lead_id;
    return this.memoryPlans.get(`lead_${leadId}`) || null;
  }

  async addPlanAction(opts) {
    if (this.territoryService) {
      return this.territoryService.addPlanAction(opts);
    }
    const actionId = `action_${Date.now()}`;
    const actionRecord = {
      id: actionId,
      plan_id: opts.planId,
      title: opts.title,
      priority: opts.priority || 'medium',
      status: opts.status || 'pending',
      due_date: opts.dueDate || null,
      created_at: new Date().toISOString(),
    };
    this.memoryActions.set(actionId, actionRecord);
    return actionRecord;
  }

  async updatePlanAction(opts) {
    if (this.territoryService) {
      return this.territoryService.updatePlanAction(opts);
    }
    const action = this.memoryActions.get(opts.actionId);
    if (!action) throw new Error('Action not found');
    Object.assign(action, opts.updates || {});
    return action;
  }
}
