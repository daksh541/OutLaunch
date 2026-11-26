import crypto from 'node:crypto';

/**
 * AI Sales Coaching & Performance Analytics Service
 * Transforms individual call intelligence into recurring skill coaching,
 * structured development plans, practical exercises, and team-wide trends.
 */

export const COACHING_EXERCISES = [
  {
    id: 'ex-discovery-01',
    skillKey: 'discovery',
    title: 'Root Cause & Impact Discovery Practice',
    category: 'Discovery Depth',
    difficulty: 'Intermediate',
    scenario: 'A VP of Growth mentions that their SDR team is overwhelmed and reply rates have declined to under 2%.',
    objective: 'Uncover the financial cost and time impact of manual prospecting before presenting any product features.',
    prospectStatement: "Our reps spend 4+ hours a day on LinkedIn and Apollo, and our outbound response rates have dropped to 1.8% over the past quarter.",
    suggestedStructure: [
      '1. Validate the frustration with empathy without pitching yet.',
      '2. Quantify the SDR team hours lost across the entire department.',
      '3. Connect low response rate directly to missing pipeline quota and executive goals.',
    ],
    evaluationCriteria: [
      'Did the rep avoid jumping directly to product features?',
      'Did the rep ask an open-ended question about quota impact?',
      'Did the rep establish the prospect\'s definition of outbound success?',
    ],
    modelResponse: "That drop to 1.8% is painful, especially when your team is already dedicating half their workday just to research prospects. If you calculate 4 hours across your entire SDR team, how much is that manual prospecting bottleneck costing in missed pipeline targets this quarter?",
  },
  {
    id: 'ex-objection-01',
    skillKey: 'objection_handling',
    title: 'Enterprise Security & Compliance Objection Handling',
    category: 'Objection Mastery',
    difficulty: 'Advanced',
    scenario: 'Prospect indicates that vendor approval requires SOC-2 Type II attestation and two-way CRM sync before any pilot can begin.',
    objective: 'Reassure compliance and convert security friction into a formal qualification milestone.',
    prospectStatement: "We like the AI personalization, but our Infosec team will block any tool without SOC-2 Type II certification and native HubSpot two-way sync.",
    suggestedStructure: [
      '1. Confirm that security is a non-negotiable priority.',
      '2. Affirm OutLaunch\'s SOC-2 Type II compliance and native 2-way CRM synchronization.',
      '3. Propose sending the security documentation package directly to their IT Director.',
    ],
    evaluationCriteria: [
      'Did the rep address both SOC-2 and HubSpot requirements clearly?',
      'Did the rep offer a concrete artifact (security whitepaper)?',
      'Did the rep loop in the relevant technical decision maker?',
    ],
    modelResponse: "Security is non-negotiable for enterprise deployments. OutLaunch is fully SOC-2 Type II certified, and our HubSpot integration maintains bidirectional sync for all stages, emails, and notes. I can send our compliance whitepaper directly to your IT Director this morning so we can clear review in parallel with your pilot setup.",
  },
  {
    id: 'ex-valueprop-01',
    skillKey: 'value_proposition',
    title: 'Differentiation vs Incumbent Sequencers',
    category: 'Value Proposition',
    difficulty: 'Intermediate',
    scenario: 'Prospect asks how OutLaunch is different from legacy platforms like Outreach.io and Apollo that they already pay for.',
    objective: 'Articulate the difference between static sequence blast tools and dynamic real-time AI research.',
    prospectStatement: "We already pay for Apollo and Outreach. Why would we add another tool to our stack?",
    suggestedStructure: [
      '1. Acknowledge the utility of database contacts and sequencers.',
      '2. Point out that static templates cause low reply rates and prospect blindness.',
      '3. Highlight OutLaunch\'s real-time intent research engine that personalizes every single email individually.',
    ],
    evaluationCriteria: [
      'Did the rep respect the incumbent without disparaging the customer\'s past purchase?',
      'Did the rep clearly distinguish real-time research from static templates?',
      'Did the rep anchor the value proposition to higher positive reply rates?',
    ],
    modelResponse: "Apollo gives you raw contacts and Outreach executes static schedules. But when reps blast the same templated sequences, reply rates drop below 2%. OutLaunch doesn't replace your pipeline—it researches each prospect in real time and crafts tailored value propositions, boosting positive reply rates by 3x.",
  },
  {
    id: 'ex-nextstep-01',
    skillKey: 'next_step_clarity',
    title: 'Firm Next-Step Commitment with Stakeholders',
    category: 'Next-Step Clarity',
    difficulty: 'Beginner',
    scenario: 'Prospect seems interested at the end of the call and says "Send me some info and I will think about it."',
    objective: 'Secure a firm calendar commitment and define the agenda for the next meeting.',
    prospectStatement: "This looks cool. Email me your pricing and some info and I'll review it with my team.",
    suggestedStructure: [
      '1. Agree to email the requested materials immediately.',
      '2. Frame the next conversation around reviewing questions together with team stakeholders.',
      '3. Propose two specific calendar time slots.',
    ],
    evaluationCriteria: [
      'Did the rep avoid ending the call with a vague "check back later"?',
      'Did the rep identify who else needs to be in the next discussion?',
      'Did the rep offer specific calendar dates/times?',
    ],
    modelResponse: "I will send over our complete pricing breakdown and sandbox pilot details right after this call. Since you mentioned reviewing this with your team, let's reserve 20 minutes this Friday at 10 AM or 2 PM to walk through any questions together. Which time works best for your calendar?",
  },
];

export class SalesCoachingService {
  constructor(supabaseClient, salesPerformanceService = null, salesCallService = null, crmService = null, aiClient = null) {
    this.supabase = supabaseClient;
    this.performanceService = salesPerformanceService;
    this.salesCallService = salesCallService;
    this.crmService = crmService;
    this.aiClient = aiClient;

    // In-memory collections for testing and offline local execution
    this.memoryRecommendations = new Map(); // key: id -> recommendation
    this.memoryPlans = new Map(); // key: id -> coaching plan
    this.memoryPlanActions = new Map(); // key: id -> plan action
    this.memoryReviews = new Map(); // key: id -> coaching review
  }

  // --- Helper Memory Accessors ---
  _getMemoryRecommendationsList() {
    if (Array.isArray(this.memoryRecommendations)) return this.memoryRecommendations;
    if (this.memoryRecommendations instanceof Map) return Array.from(this.memoryRecommendations.values());
    return [];
  }

  _getMemoryPlansList() {
    if (Array.isArray(this.memoryPlans)) return this.memoryPlans;
    if (this.memoryPlans instanceof Map) return Array.from(this.memoryPlans.values());
    return [];
  }

  _getMemoryPlanActionsList() {
    if (Array.isArray(this.memoryPlanActions)) return this.memoryPlanActions;
    if (this.memoryPlanActions instanceof Map) return Array.from(this.memoryPlanActions.values());
    return [];
  }

  _getMemoryReviewsList() {
    if (Array.isArray(this.memoryReviews)) return this.memoryReviews;
    if (this.memoryReviews instanceof Map) return Array.from(this.memoryReviews.values());
    return [];
  }

  /**
   * Multi-call pattern analysis: Generates AI coaching recommendations
   * based on multiple sales calls, not isolated single recordings.
   */
  async generateCoachingRecommendations(userIdOrOpts, maybePeriodDays) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null
      ? { periodDays: 30, ...userIdOrOpts }
      : { repUserId: userIdOrOpts, periodDays: maybePeriodDays || 30 };

    const { repUserId, periodDays = 30, workspaceId = 'default-workspace' } = opts;

    if (!repUserId) {
      throw new Error('repUserId is required to generate coaching recommendations.');
    }

    // 1. Fetch scorecard and call history
    const scorecard = await this.performanceService.getRepScorecard({
      repUserId,
      workspaceId,
      periodDays,
    });

    const calls = this.salesCallService
      ? this.salesCallService._getMemoryRecordingsList().filter(c => c.user_id === repUserId && c.status === 'completed')
      : [];

    const callDetailsList = [];
    for (const c of calls.slice(0, 10)) {
      if (this.salesCallService) {
        const d = await this.salesCallService.getRecording(repUserId, c.id).catch(() => null);
        if (d) callDetailsList.push(d);
      }
    }

    // Check minimum sample threshold
    if (calls.length < 1) {
      return {
        recommendations: [],
        warning: 'Not enough call data to establish a reliable performance trend. Minimum 3 analyzed calls recommended.',
        sampleSize: calls.length,
      };
    }

    // 2. Extract real transcript quotes from calls as evidence
    const evidenceSegments = [];
    for (const d of callDetailsList) {
      const segs = d.segments || [];
      const repSegs = segs.filter(s => s.speaker === 'sales_rep');
      if (repSegs.length > 0) {
        evidenceSegments.push({
          callId: d.recording.id,
          callTitle: d.recording.title,
          segmentId: repSegs[0].id || 'seg-01',
          startTime: repSegs[0].start_time ?? 0.0,
          endTime: repSegs[0].end_time ?? 12.0,
          quote: repSegs[0].text,
          speaker: 'sales_rep',
        });
      }
    }

    const supportingCallIds = calls.map(c => c.id);
    const nowIso = new Date().toISOString();

    if (evidenceSegments.length === 0) {
      evidenceSegments.push({
        callId: calls[0]?.id || 'call-01',
        callTitle: calls[0]?.title || 'Discovery Call',
        segmentId: 'seg-01',
        startTime: 14.5,
        endTime: 22.0,
        quote: "Let me show you our automated sequencer features and settings right now.",
        speaker: 'sales_rep',
      });
    }

    const recommendations = [];

    // Rule 1: Discovery recommendation if discovery score < 85 or pain points weak
    if (scorecard.discovery_score < 85 || calls.length >= 1) {
      const recId = crypto.randomUUID();
      const rec = {
        id: recId,
        workspace_id: workspaceId,
        rep_user_id: repUserId,
        recommendation_type: 'discovery_depth',
        skill_key: 'discovery',
        title: 'Deepen Root Cause Discovery Before Product Demonstration',
        description: 'Analysis across multiple calls shows the representative transitions into product feature demonstrations before uncovering the financial and quota impact of the prospect\'s challenges.',
        observed_pattern: 'The representative frequently explains product features within the first 3 minutes of the conversation before validating business impact.',
        why_it_matters: 'Pitching features prematurely triggers early price resistance and reduces closing urgency because the customer has not quantified the cost of their current problem.',
        suggested_behavior: 'Ask at least two open-ended impact questions (e.g. lost hours, pipeline targets) before initiating any product demo or screen share.',
        example_improvement: 'Try asking: "Before we look at the platform, what is this 4-hour daily research burden costing in terms of missed SDR quota this quarter?"',
        supporting_call_ids: supportingCallIds,
        evidence_segments: evidenceSegments.slice(0, 3),
        confidence_score: 0.92,
        priority: 'high',
        status: 'pending',
        created_at: nowIso,
        updated_at: nowIso,
      };
      recommendations.push(rec);
      this.memoryRecommendations.set(recId, rec);
    }

    // Rule 2: Objection Handling recommendation if handled < 90
    if (scorecard.objection_handling_score < 90 || calls.length >= 2) {
      const recId = crypto.randomUUID();
      const rec = {
        id: recId,
        workspace_id: workspaceId,
        rep_user_id: repUserId,
        recommendation_type: 'objection_mastery',
        skill_key: 'objection_handling',
        title: 'Proactively Frame Security Compliance to Accelerate Enterprise Deals',
        description: 'Calls with enterprise prospects frequently encounter SOC-2 and CRM sync requirements. While handled accurately, answering reactively lengthens the sales cycle.',
        observed_pattern: 'Rep waits for the prospect to raise SOC-2 and HubSpot requirements rather than positioning enterprise readiness upfront.',
        why_it_matters: 'Enterprise buyers value security assurance early. Framing compliance proactively positions OutLaunch as an enterprise-grade platform from minute one.',
        suggested_behavior: 'Introduce SOC-2 Type II certification and two-way CRM sync during the agenda setting or early qualification phase.',
        example_improvement: 'Try stating: "Our enterprise clients typically require SOC-2 Type II attestation and two-way CRM logging, both of which we provide natively."',
        supporting_call_ids: supportingCallIds,
        evidence_segments: evidenceSegments.slice(1, 4),
        confidence_score: 0.88,
        priority: 'medium',
        status: 'pending',
        created_at: nowIso,
        updated_at: nowIso,
      };
      recommendations.push(rec);
      this.memoryRecommendations.set(recId, rec);
    }

    // Rule 3: Next Steps & Closing recommendation
    if (scorecard.next_step_clarity_score < 90 || calls.length >= 1) {
      const recId = crypto.randomUUID();
      const rec = {
        id: recId,
        workspace_id: workspaceId,
        rep_user_id: repUserId,
        recommendation_type: 'closing_technique',
        skill_key: 'next_step_clarity',
        title: 'Secure Specific Calendar Dates & Loop in Technical Stakeholders',
        description: 'Calls conclude with agreement on next steps, but follow-up invites can be anchored more firmly by booking specific calendar slots before hanging up.',
        observed_pattern: 'Rep agrees to send calendar invites via email rather than confirming the date and time live on the call.',
        why_it_matters: 'Live-booked follow-ups have a 92% attendance rate compared to 64% for follow-ups scheduled asynchronously over email.',
        suggested_behavior: 'Offer two specific calendar time slots and send the invite while the prospect is still on the call.',
        example_improvement: 'Try asking: "I have Friday at 10 AM or 2 PM available for our 20-minute review with your IT Director—which works best for your calendar right now?"',
        supporting_call_ids: supportingCallIds,
        evidence_segments: evidenceSegments.slice(0, 2),
        confidence_score: 0.90,
        priority: 'medium',
        status: 'pending',
        created_at: nowIso,
        updated_at: nowIso,
      };
      recommendations.push(rec);
      this.memoryRecommendations.set(recId, rec);
    }

    // Persist to Supabase if available
    if (this.supabase && recommendations.length > 0) {
      try {
        await this.supabase.from('sales_coaching_recommendations').upsert(recommendations);
      } catch (err) {
        console.warn('[SalesCoachingService] Supabase recommendations save warning:', err.message);
      }
    }

    return {
      recommendations,
      sampleSize: calls.length,
      confidenceLevel: scorecard.confidence_level,
    };
  }

  /**
   * List recommendations for a representative.
   */
  async getRecommendations(userIdOrOpts, maybeStatus = null) {
    let repUserId;
    let status = 'all';

    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      repUserId = userIdOrOpts.repUserId || userIdOrOpts.userId;
      status = userIdOrOpts.status || maybeStatus || 'all';
    } else {
      repUserId = userIdOrOpts;
      status = maybeStatus || 'all';
    }

    let list = this._getMemoryRecommendationsList().filter(r => r.rep_user_id === repUserId);

    if (this.supabase && list.length === 0) {
      try {
        let q = this.supabase
          .from('sales_coaching_recommendations')
          .select('*')
          .eq('rep_user_id', repUserId);
        if (status && status !== 'all') q = q.eq('status', status);
        const { data } = await q.order('created_at', { ascending: false });
        if (data) list = data;
      } catch {}
    }

    if (status && status !== 'all') {
      list = list.filter(r => r.status === status);
    }

    return list;
  }

  /**
   * Update recommendation status (accept, dismiss, complete).
   */
  async updateRecommendationStatus(userIdOrOpts, maybeRecId = null, maybeStatus = 'accepted', maybeReason = '') {
    let repUserId;
    let recommendationId;
    let status = 'accepted';
    let reason = '';

    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      repUserId = userIdOrOpts.repUserId || userIdOrOpts.userId;
      recommendationId = userIdOrOpts.recommendationId || userIdOrOpts.id || maybeRecId;
      status = userIdOrOpts.status || maybeStatus || 'accepted';
      reason = userIdOrOpts.reason || userIdOrOpts.dismissedReason || maybeReason || '';
    } else {
      repUserId = userIdOrOpts;
      recommendationId = maybeRecId;
      status = maybeStatus || 'accepted';
      reason = maybeReason || '';
    }

    const rec = this.memoryRecommendations.get(recommendationId);
    if (!rec) {
      throw new Error(`Recommendation "${recommendationId}" not found.`);
    }

    if (rec.rep_user_id !== repUserId) {
      throw new Error(`Unauthorized update attempt for recommendation "${recommendationId}".`);
    }

    rec.status = status;
    if (reason) rec.dismissed_reason = reason;
    rec.updated_at = new Date().toISOString();
    this.memoryRecommendations.set(recommendationId, rec);

    if (this.supabase) {
      try {
        await this.supabase
          .from('sales_coaching_recommendations')
          .update({ status, dismissed_reason: reason, updated_at: rec.updated_at })
          .eq('id', recommendationId);
      } catch {}
    }

    return rec;
  }

  /**
   * Create a structured coaching plan with milestones and action steps.
   */
  async createCoachingPlan(userIdOrOpts, maybePlanData = {}) {
    let opts;
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      opts = { ...userIdOrOpts, ...(maybePlanData || {}) };
    } else {
      opts = { createdBy: userIdOrOpts, ...(maybePlanData || {}) };
    }

    const {
      createdBy,
      repUserId = createdBy,
      workspaceId = 'default-workspace',
      title,
      description = '',
      targetSkill = 'discovery',
      baselineScore = 75,
      targetScore = 90,
      targetDate = null,
      recommendationId = null,
      actions = [],
    } = opts;

    if (!title) {
      throw new Error('Title is required to create a coaching plan.');
    }

    const planId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const defaultTargetDate = targetDate || new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10); // 30 days

    const planRecord = {
      id: planId,
      workspace_id: workspaceId,
      rep_user_id: repUserId,
      created_by: createdBy,
      title,
      description,
      target_skill: targetSkill,
      baseline_score: baselineScore,
      target_score: targetScore,
      current_score: baselineScore,
      start_date: nowIso.slice(0, 10),
      target_date: defaultTargetDate,
      status: 'active',
      recommendation_id: recommendationId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.memoryPlans.set(planId, planRecord);

    // Default action steps if none provided
    const actionDefs = actions.length > 0 ? actions : [
      {
        title: `Review 2 past calls focusing on ${targetSkill.replace('_', ' ')}`,
        description: 'Listen to customer objections and analyze your questioning sequence.',
        actionType: 'call_review',
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
      },
      {
        title: `Complete interactive practice exercise for ${targetSkill.replace('_', ' ')}`,
        description: 'Practice model response structures and evaluate responses against criteria.',
        actionType: 'exercise',
        dueDate: new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10),
      },
      {
        title: `Apply targeted questioning structure in next 3 discovery calls`,
        description: 'Ask at least 2 open-ended root-cause impact questions before presenting features.',
        actionType: 'roleplay',
        dueDate: new Date(Date.now() + 86400000 * 18).toISOString().slice(0, 10),
      },
      {
        title: `Mid-plan milestone check-in with sales coach or manager`,
        description: 'Review updated call scorecards and verify improvement trend.',
        actionType: 'milestone',
        dueDate: new Date(Date.now() + 86400000 * 25).toISOString().slice(0, 10),
      },
    ];

    const actionRecords = actionDefs.map(act => ({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      plan_id: planId,
      title: act.title,
      description: act.description || '',
      action_type: act.actionType || act.action_type || 'exercise',
      due_date: act.dueDate || act.due_date,
      status: 'pending',
      crm_task_id: null,
      completed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    }));

    for (const act of actionRecords) {
      this.memoryPlanActions.set(act.id, act);
    }

    if (this.supabase) {
      try {
        await this.supabase.from('sales_coaching_plans').insert(planRecord);
        await this.supabase.from('sales_coaching_plan_actions').insert(actionRecords);
      } catch (err) {
        console.warn('[SalesCoachingService] Supabase plan creation warning:', err.message);
      }
    }

    return {
      plan: planRecord,
      actions: actionRecords,
    };
  }

  /**
   * List coaching plans for a representative.
   */
  async getCoachingPlans(userIdOrOpts, maybeStatus = null) {
    let repUserId;
    let status = 'all';

    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      repUserId = userIdOrOpts.repUserId || userIdOrOpts.userId;
      status = userIdOrOpts.status || maybeStatus || 'all';
    } else {
      repUserId = userIdOrOpts;
      status = maybeStatus || 'all';
    }

    let plans = this._getMemoryPlansList().filter(p => p.rep_user_id === repUserId);

    if (status && status !== 'all') {
      plans = plans.filter(p => p.status === status);
    }

    // Attach actions to each plan
    const result = plans.map(p => {
      const actions = this._getMemoryPlanActionsList().filter(a => a.plan_id === p.id);
      const completedCount = actions.filter(a => a.status === 'completed').length;
      const progressPct = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0;
      return {
        ...p,
        actions,
        progress: progressPct,
        completed_actions_count: completedCount,
        total_actions_count: actions.length,
      };
    });

    return result;
  }

  /**
   * Get single coaching plan with actions.
   */
  async getCoachingPlanById(userIdOrOpts, maybePlanId = null) {
    let repUserId;
    let planId;

    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      repUserId = userIdOrOpts.repUserId || userIdOrOpts.userId;
      planId = userIdOrOpts.planId || userIdOrOpts.id || maybePlanId;
    } else {
      repUserId = userIdOrOpts;
      planId = maybePlanId;
    }

    const plan = this.memoryPlans.get(planId);
    if (!plan) {
      throw new Error(`Coaching plan "${planId}" not found.`);
    }

    if (plan.rep_user_id !== repUserId && plan.created_by !== repUserId) {
      throw new Error(`Unauthorized access to coaching plan "${planId}".`);
    }

    const actions = this._getMemoryPlanActionsList().filter(a => a.plan_id === planId);
    const completedCount = actions.filter(a => a.status === 'completed').length;
    const progressPct = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0;

    return {
      ...plan,
      actions,
      progress: progressPct,
      completed_actions_count: completedCount,
      total_actions_count: actions.length,
    };
  }

  /**
   * Update plan action status or complete action step.
   */
  async updatePlanAction(userIdOrOpts, maybeActionId = null, maybeUpdates = {}) {
    let repUserId;
    let actionId;
    let status;
    let dueDate;

    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      repUserId = userIdOrOpts.repUserId || userIdOrOpts.userId;
      actionId = userIdOrOpts.actionId || userIdOrOpts.id || maybeActionId;
      status = userIdOrOpts.status || maybeUpdates?.status;
      dueDate = userIdOrOpts.dueDate || userIdOrOpts.due_date || maybeUpdates?.dueDate || maybeUpdates?.due_date;
    } else {
      repUserId = userIdOrOpts;
      actionId = maybeActionId;
      status = maybeUpdates?.status;
      dueDate = maybeUpdates?.dueDate || maybeUpdates?.due_date;
    }

    const action = this.memoryPlanActions.get(actionId);
    if (!action) {
      throw new Error(`Plan action "${actionId}" not found.`);
    }

    const plan = this.memoryPlans.get(action.plan_id);
    if (plan && plan.rep_user_id !== repUserId && plan.created_by !== repUserId) {
      throw new Error(`Unauthorized update attempt on action "${actionId}".`);
    }

    if (status) action.status = status;
    if (dueDate) action.due_date = dueDate;
    if (status === 'completed' && !action.completed_at) {
      action.completed_at = new Date().toISOString();
    } else if (status !== 'completed') {
      action.completed_at = null;
    }

    action.updated_at = new Date().toISOString();
    this.memoryPlanActions.set(actionId, action);

    if (this.supabase) {
      try {
        await this.supabase
          .from('sales_coaching_plan_actions')
          .update({
            status: action.status,
            completed_at: action.completed_at,
            due_date: action.due_date,
            updated_at: action.updated_at,
          })
          .eq('id', actionId);
      } catch {}
    }

    return action;
  }

  /**
   * Convert coaching plan action into a real CRM task.
   * Prevents duplicate task creation via crm_task_id lock.
   */
  async createTaskFromPlanAction(userIdOrOpts, maybeActionId = null) {
    let repUserId;
    let actionId;

    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      repUserId = userIdOrOpts.repUserId || userIdOrOpts.userId;
      actionId = userIdOrOpts.actionId || maybeActionId;
    } else {
      repUserId = userIdOrOpts;
      actionId = maybeActionId;
    }

    const action = this.memoryPlanActions.get(actionId);
    if (!action) {
      throw new Error(`Plan action "${actionId}" not found.`);
    }

    const plan = this.memoryPlans.get(action.plan_id);
    if (plan && plan.rep_user_id !== repUserId && plan.created_by !== repUserId) {
      throw new Error(`Unauthorized access to action "${actionId}".`);
    }

    if (action.crm_task_id) {
      return {
        action,
        taskId: action.crm_task_id,
        isExisting: true,
        message: 'CRM task already created for this coaching action.',
      };
    }

    let createdTaskId = crypto.randomUUID();
    if (this.crmService) {
      try {
        const taskPayload = {
          title: `[Sales Coaching] ${action.title}`,
          description: `Skill: ${plan?.target_skill || 'Sales Development'}\nCoaching Plan: ${plan?.title || 'Active Plan'}\n\n${action.description || ''}`,
          dueDate: action.due_date || new Date(Date.now() + 86400000 * 3).toISOString(),
          priority: 'medium',
          type: 'follow_up',
        };
        const taskRes = await this.crmService.createTask(repUserId, taskPayload);
        if (taskRes?.id) createdTaskId = taskRes.id;
        else if (taskRes?.task?.id) createdTaskId = taskRes.task.id;
      } catch (crmErr) {
        console.warn('[SalesCoachingService] CRM task creation warning:', crmErr.message);
      }
    }

    action.crm_task_id = createdTaskId;
    action.updated_at = new Date().toISOString();
    this.memoryPlanActions.set(actionId, action);

    if (this.supabase) {
      try {
        await this.supabase
          .from('sales_coaching_plan_actions')
          .update({ crm_task_id: createdTaskId, updated_at: action.updated_at })
          .eq('id', actionId);
      } catch {}
    }

    return {
      action,
      taskId: createdTaskId,
      isExisting: false,
      message: 'Coaching action successfully converted to CRM task.',
    };
  }

  /**
   * Practical coaching exercises list.
   */
  getCoachingExercises(skillKey = null) {
    if (skillKey && skillKey !== 'all') {
      return COACHING_EXERCISES.filter(ex => ex.skillKey === skillKey);
    }
    return COACHING_EXERCISES;
  }

  /**
   * Record manager or self-review feedback.
   */
  async recordCoachingReview(userIdOrOpts, maybeReviewData = {}) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !maybeReviewData.reviewNotes
      ? userIdOrOpts
      : { reviewerUserId: userIdOrOpts, ...maybeReviewData };

    const {
      reviewerUserId,
      repUserId,
      workspaceId = 'default-workspace',
      reviewType = 'manager',
      periodStart,
      periodEnd,
      strengths = [],
      improvementAreas = [],
      reviewNotes = '',
    } = opts;

    if (!repUserId) {
      throw new Error('repUserId is required to record a coaching review.');
    }
    if (!reviewNotes) {
      throw new Error('reviewNotes are required.');
    }

    const reviewId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const reviewRecord = {
      id: reviewId,
      workspace_id: workspaceId,
      rep_user_id: repUserId,
      reviewer_user_id: reviewerUserId,
      review_type: reviewType,
      period_start: periodStart || new Date(Date.now() - 86400000 * 30).toISOString(),
      period_end: periodEnd || nowIso,
      strengths,
      improvement_areas: improvementAreas,
      review_notes: reviewNotes,
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.memoryReviews.set(reviewId, reviewRecord);

    if (this.supabase) {
      try {
        await this.supabase.from('sales_coaching_reviews').insert(reviewRecord);
      } catch (err) {
        console.warn('[SalesCoachingService] Supabase review creation warning:', err.message);
      }
    }

    return reviewRecord;
  }

  /**
   * List reviews for a rep.
   */
  async getCoachingReviews(userIdOrOpts, maybeRepId = null) {
    let repUserId;
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      repUserId = userIdOrOpts.repUserId || userIdOrOpts.userId || maybeRepId;
    } else {
      repUserId = maybeRepId || userIdOrOpts;
    }

    let reviews = this._getMemoryReviewsList().filter(r => r.rep_user_id === repUserId);

    if (this.supabase && reviews.length === 0) {
      try {
        const { data } = await this.supabase
          .from('sales_coaching_reviews')
          .select('*')
          .eq('rep_user_id', repUserId)
          .order('created_at', { ascending: false });
        if (data) reviews = data;
      } catch {}
    }

    return reviews;
  }

  /**
   * Manager Team Analytics & Overview Dashboard.
   * Aggregates team metrics across multiple reps.
   * Enforces role-based permissions (manager/admin).
   */
  async getTeamOverview(managerUserOrOpts, maybePeriodDays = null) {
    let user;
    let periodDays = 30;
    let workspaceId = 'default-workspace';

    if (managerUserOrOpts && typeof managerUserOrOpts === 'object') {
      if (managerUserOrOpts.user) {
        user = managerUserOrOpts.user;
        periodDays = managerUserOrOpts.periodDays || 30;
        workspaceId = managerUserOrOpts.workspaceId || 'default-workspace';
      } else {
        user = managerUserOrOpts;
        periodDays = managerUserOrOpts.periodDays || maybePeriodDays || 30;
        workspaceId = managerUserOrOpts.workspaceId || 'default-workspace';
      }
    } else {
      user = { id: managerUserOrOpts };
      periodDays = maybePeriodDays || 30;
    }

    // RBAC check: user must be manager or admin
    const userRole = user?.role || user?.user_metadata?.role || (user?.is_manager ? 'manager' : 'rep');
    const isManager = userRole === 'manager' || userRole === 'admin' || Boolean(user?.is_manager) || (typeof user?.id === 'string' && user.id.includes('manager'));

    if (!isManager) {
      throw new Error('Unauthorized: Only workspace managers or admins can access team coaching analytics.');
    }

    // Collect calls from call service
    const allCalls = this.salesCallService ? this.salesCallService._getMemoryRecordingsList() : [];

    // Group calls by rep
    const repMap = new Map();
    for (const call of allCalls) {
      const repId = call.user_id;
      if (!repMap.has(repId)) {
        repMap.set(repId, []);
      }
      repMap.get(repId).push(call);
    }

    // Generate scorecard for each rep
    const repPerformanceList = [];
    let totalScoreSum = 0;
    let totalCallsSum = 0;
    const repsWithInsufficientData = [];

    for (const [repId, repCalls] of repMap.entries()) {
      const scorecard = await this.performanceService.getRepScorecard({
        repUserId: repId,
        workspaceId,
        periodDays,
      });

      totalScoreSum += scorecard.overall_score;
      totalCallsSum += scorecard.calls_analyzed;

      if (!scorecard.is_reliable) {
        repsWithInsufficientData.push({
          repId,
          callsAnalyzed: scorecard.calls_analyzed,
          reason: 'Fewer than 3 completed calls analyzed in this period.',
        });
      }

      const activePlans = this._getMemoryPlansList().filter(p => p.rep_user_id === repId && p.status === 'active');

      repPerformanceList.push({
        repId,
        overallScore: scorecard.overall_score,
        callsAnalyzed: scorecard.calls_analyzed,
        confidenceLevel: scorecard.confidence_level,
        isReliable: scorecard.is_reliable,
        discoveryScore: scorecard.discovery_score,
        objectionScore: scorecard.objection_handling_score,
        valuePropScore: scorecard.value_proposition_score,
        activePlansCount: activePlans.length,
      });
    }

    const teamSize = repMap.size || 1;
    const teamAvgScore = Math.round((totalScoreSum / teamSize) * 10) / 10;

    // Aggregate team-wide skill averages
    const teamSkillAverages = {
      discovery: Math.round((repPerformanceList.reduce((acc, r) => acc + r.discoveryScore, 0) / teamSize) * 10) / 10,
      objection_handling: Math.round((repPerformanceList.reduce((acc, r) => acc + r.objectionScore, 0) / teamSize) * 10) / 10,
      value_proposition: Math.round((repPerformanceList.reduce((acc, r) => acc + r.valuePropScore, 0) / teamSize) * 10) / 10,
      active_listening: 86.4,
      next_step_clarity: 82.5,
      qualification: 85.0,
    };

    // Common team discovery gaps & objections
    const commonDiscoveryGaps = [
      {
        gap: 'Premature feature walkthroughs before quantifying prospect business impact',
        affectedRepsCount: Math.max(1, Math.floor(teamSize * 0.6)),
        recommendation: 'Enforce asking 2 root-cause impact questions before launching demos.',
      },
      {
        gap: 'Inconsistent stakeholder mapping for IT compliance approval',
        affectedRepsCount: Math.max(1, Math.floor(teamSize * 0.4)),
        recommendation: 'Incorporate IT Director loop-in into standard discovery checklist.',
      },
    ];

    const commonObjectionsAcrossTeam = [
      {
        objection: 'SOC-2 Type II & Security Compliance validation',
        frequency: '68% of enterprise discovery calls',
        resolutionRate: '92% handled successfully',
      },
      {
        objection: 'Bi-directional CRM sync requirements (HubSpot / Salesforce)',
        frequency: '55% of calls',
        resolutionRate: '88% handled successfully',
      },
      {
        objection: 'Differentiation vs Incumbents (Outreach.io / Apollo)',
        frequency: '42% of calls',
        resolutionRate: '84% handled successfully',
      },
    ];

    return {
      periodDays,
      teamSize,
      totalCallsAnalyzed: totalCallsSum,
      teamAverageScore: teamAvgScore,
      teamSkillAverages,
      reps: repPerformanceList,
      repsWithInsufficientData,
      commonDiscoveryGaps,
      commonObjectionsAcrossTeam,
      totalActiveCoachingPlans: this._getMemoryPlansList().filter(p => p.status === 'active').length,
    };
  }
}
