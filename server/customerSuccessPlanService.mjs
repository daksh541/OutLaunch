import crypto from 'node:crypto';

/**
 * AI Customer Success Plan Service
 *
 * Generates and manages editable Customer Success Plans containing:
 * - Customer objectives
 * - Business outcomes
 * - Success metrics
 * - Current progress
 * - Stakeholders supported by existing records
 * - Engagement strategy
 * - Renewal milestones
 * - Risk mitigation plan
 * - Expansion strategy
 * - Next review date
 *
 * Grounding & Safety Rules:
 * - Clearly separates verified facts from AI-generated recommendations.
 * - Generated plans remain in 'draft' or 'review' status until explicitly saved/approved by the user.
 * - AI-generated tasks are NEVER created automatically in the CRM.
 */

export const CS_PLAN_STATUSES = ['draft', 'review', 'active', 'completed', 'archived'];

export class CustomerSuccessPlanService {
  constructor(
    supabaseClient = null,
    customerHealthService = null,
    customerRenewalService = null,
    customerExpansionService = null,
    crmService = null
  ) {
    this.supabase = supabaseClient;
    this.healthService = customerHealthService;
    this.renewalService = customerRenewalService;
    this.expansionService = customerExpansionService;
    this.crmService = crmService;

    this.memoryPlans = new Map(); // id -> plan
  }

  _normalizeArgs(userIdOrOpts, maybeData = {}) {
    if (this.healthService) {
      return this.healthService._normalizeArgs(userIdOrOpts, maybeData);
    }
    const cleanedMaybe = {};
    if (maybeData && typeof maybeData === 'object') {
      for (const [k, v] of Object.entries(maybeData)) {
        if (v !== undefined && v !== null) cleanedMaybe[k] = v;
      }
    }
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      return {
        userId: userIdOrOpts.userId || userIdOrOpts.id || 'user-default',
        workspaceId: userIdOrOpts.workspaceId || userIdOrOpts.workspace_id || 'default-workspace',
        role: userIdOrOpts.role || 'rep',
        ...userIdOrOpts,
        ...cleanedMaybe,
      };
    }
    return {
      userId: userIdOrOpts || 'user-default',
      workspaceId: cleanedMaybe.workspaceId || 'default-workspace',
      role: cleanedMaybe.role || 'rep',
      ...cleanedMaybe,
    };
  }

  _getMemoryPlansList(workspaceId = null) {
    const all = Array.from(this.memoryPlans.values());
    if (workspaceId) return all.filter((p) => p.workspace_id === workspaceId);
    return all;
  }

  /**
   * 1. GENERATE GROUNDED CUSTOMER SUCCESS PLAN DRAFT
   * If persistAsReview is false (default for preview generation), returns an unsaved draft in 'draft' status
   * or creates a 'review' draft on an existing plan ID without activating it or creating CRM tasks.
   */
  async generateSuccessPlanDraft(userIdOrOpts, maybeAccountOrPlanId = null, maybeOpts = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, {
      targetId: maybeAccountOrPlanId,
      ...(maybeOpts || {}),
    });
    const { userId, workspaceId } = opts;
    const targetId = opts.targetId || opts.planId || opts.accountId || opts.customer_success_account_id;

    // Resolve whether targetId is an existing plan or a CS account
    let existingPlan = targetId ? this.memoryPlans.get(targetId) : null;
    if (existingPlan && existingPlan.workspace_id !== workspaceId) {
      throw new Error('Forbidden: Plan belongs to another workspace.');
    }

    const accountId =
      existingPlan?.customer_success_account_id || opts.customer_success_account_id || opts.accountId || targetId;
    const account = this.healthService ? this.healthService.memoryAccounts.get(accountId) : opts.account;

    if (!account || account.workspace_id !== workspaceId) {
      throw new Error(`Customer Success account "${accountId}" not found in workspace.`);
    }

    const lead = this.healthService ? this.healthService._resolveLead(account.lead_id) : null;
    const riskEval = this.renewalService
      ? this.renewalService.evaluateAccountChurnRisk(account)
      : { risk_score: 20, risk_factors: [] };

    const companyName = lead?.company || account.company || 'Customer Account';
    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = new Date(now.getTime() + 86400000 * 90).toISOString();
    const nextReviewDate = new Date(now.getTime() + 86400000 * 30).toISOString();

    // 1. Verified Facts (strictly grounded from CRM lead + CS account records)
    const verifiedFacts = [
      { field: 'company', label: 'Company Name', value: companyName, source: 'public.leads' },
      {
        field: 'customer_status',
        label: 'Customer Status',
        value: account.customer_status,
        source: 'customer_success_accounts',
      },
      {
        field: 'contract_value',
        label: 'Contract Value',
        value: `${Number(account.contract_value || 0).toLocaleString()} ${account.currency || 'USD'}`,
        source: 'customer_success_accounts',
      },
      {
        field: 'health_score',
        label: 'Health Score',
        value: `${account.health_score}/100 (${account.health_status})`,
        source: 'customer_health_service',
      },
    ];

    if (account.renewal_date) {
      verifiedFacts.push({
        field: 'renewal_date',
        label: 'Renewal Date',
        value: account.renewal_date,
        source: 'customer_success_accounts',
      });
    }

    // 2. Stakeholders supported ONLY by existing records (never fabricate unknown names)
    const verifiedStakeholders = [];
    if (lead && (lead.full_name || lead.name || lead.email)) {
      verifiedStakeholders.push({
        name: lead.full_name || lead.name || lead.email,
        title: lead.job_title || lead.title || 'Primary Contact',
        email: lead.email || null,
        role: 'Primary Customer Stakeholder',
        source: `public.leads (id: ${lead.id})`,
        verified: true,
      });
    }

    // 3. Objectives & Progress
    const existingObjectives = Array.isArray(account.success_objectives) ? account.success_objectives : [];
    const objectives =
      existingObjectives.length > 0
        ? existingObjectives.map((obj, idx) => ({
            id: obj.id || `obj_${idx + 1}`,
            title: obj.title || obj.objective || String(obj),
            status: obj.status || (obj.completed ? 'completed' : 'in_progress'),
            progress: Number(obj.progress !== undefined ? obj.progress : obj.completed ? 100 : 35),
            origin: 'verified_account_objective',
          }))
        : [
            {
              id: 'obj_1',
              title: `Achieve full workflow onboarding and team adoption for ${companyName}`,
              status: 'in_progress',
              progress: 40,
              origin: 'ai_recommended',
            },
            {
              id: 'obj_2',
              title: 'Validate measurable pipeline ROI ahead of renewal milestone review',
              status: 'pending',
              progress: 0,
              origin: 'ai_recommended',
            },
          ];

    const avgProgress =
      objectives.length > 0
        ? Math.round(objectives.reduce((s, o) => s + (Number(o.progress) || 0), 0) / objectives.length)
        : 0;

    // 4. Business Outcomes & Success Metrics
    const businessOutcomes = [
      `Maintain healthy customer adoption and executive alignment across ${companyName}.`,
      `Secure on-time contract renewal ($${Number(account.contract_value || 0).toLocaleString()} ${account.currency || 'USD'}).`,
    ];

    const successMetrics = [
      {
        metric: 'Success Objective Completion Rate',
        target: '100% by 30 days pre-renewal',
        current: `${avgProgress}%`,
        source: 'customer_success_accounts.success_objectives',
      },
      {
        metric: 'Customer Health Score',
        target: '>= 80 (Healthy)',
        current: `${account.health_score}/100 (${account.health_status})`,
        source: 'customer_health_snapshots',
      },
      {
        metric: 'Executive Business Review Cadence',
        target: 'Every 90 days',
        current: account.last_customer_review_at
          ? `Last reviewed ${new Date(account.last_customer_review_at).toISOString().split('T')[0]}`
          : 'Review pending',
        source: 'customer_success_accounts.last_customer_review_at',
      },
    ];

    // 5. Renewal Milestones
    const renewalMilestones = [
      {
        milestone: '90-Day Pre-Renewal Value Audit',
        target_window: 'T-90 Days',
        status: 'pending',
        description: 'Document ROI and completed objectives with primary stakeholder.',
      },
      {
        milestone: '60-Day Commercial Proposal & Expansion Alignment',
        target_window: 'T-60 Days',
        status: 'pending',
        description: 'Present renewal terms and evaluate expansion readiness.',
      },
      {
        milestone: '30-Day Contract Sign-Off',
        target_window: 'T-30 Days',
        status: 'pending',
        description: 'Finalize procurement and legal approval prior to contract end date.',
      },
    ];

    // 6. Engagement Strategy, Risk Mitigation, Expansion Strategy (AI Recommendations)
    const engagementStrategy =
      account.health_score < 60
        ? 'High-touch bi-weekly turnaround cadence with executive sponsor check-ins and milestone unblock sessions.'
        : 'Monthly strategic value check-ins paired with Quarterly Business Reviews (QBRs).';

    const riskMitigationPlan =
      riskEval.risk_factors.length > 0
        ? riskEval.risk_factors
            .map((rf) => `[${rf.title}] ${rf.recommended_mitigation} (Evidence: ${rf.evidence})`)
            .join(' | ')
        : 'No critical churn risk factors active. Maintain proactive QBR schedule and monitor renewal milestones.';

    const expansionStrategy =
      account.health_score >= 75
        ? 'Eligible for expansion discovery: evaluate team rollout or cross-module adoption once primary objectives reach 80%+ completion.'
        : 'Hold expansion pitch until account health score reaches >= 75 and primary risk factors are resolved.';

    const recommendedTasks = [
      {
        title: `Conduct QBR & Success Plan review with ${verifiedStakeholders[0]?.name || companyName}`,
        priority: account.health_score < 60 ? 'urgent' : 'high',
        due_in_days: 7,
        origin: 'ai_recommended',
        requires_approval: true,
      },
      {
        title: `Verify completion progress on ${objectives.length} customer success objectives`,
        priority: 'medium',
        due_in_days: 14,
        origin: 'ai_recommended',
        requires_approval: true,
      },
    ];

    const draftPayload = {
      id: existingPlan ? existingPlan.id : null,
      workspace_id: workspaceId,
      customer_success_account_id: account.id,
      company: companyName,
      plan_period_start: periodStart,
      plan_period_end: periodEnd,
      objectives,
      business_outcomes: businessOutcomes,
      success_metrics: successMetrics,
      current_progress_pct: avgProgress,
      stakeholders: verifiedStakeholders,
      engagement_strategy: engagementStrategy,
      renewal_milestones: renewalMilestones,
      risk_mitigation_plan: riskMitigationPlan,
      expansion_strategy: expansionStrategy,
      review_date: nextReviewDate,
      recommended_tasks: recommendedTasks,
      grounding: {
        verified_facts: verifiedFacts,
        ai_recommendations: [
          { section: 'engagement_strategy', content: engagementStrategy },
          { section: 'risk_mitigation_plan', content: riskMitigationPlan },
          { section: 'expansion_strategy', content: expansionStrategy },
          ...recommendedTasks.map((t) => ({ section: 'recommended_task', content: t.title })),
        ],
      },
      status: existingPlan ? 'review' : 'draft',
      is_saved: Boolean(existingPlan),
      generated_by: userId,
      generated_at: now.toISOString(),
    };

    // If generating on an existing plan record, update it into 'review' status (never 'active' until explicitly approved!)
    if (existingPlan) {
      existingPlan.objectives = draftPayload.objectives;
      existingPlan.success_metrics = draftPayload.success_metrics;
      existingPlan.engagement_strategy = draftPayload.engagement_strategy;
      existingPlan.risk_mitigation_plan = draftPayload.risk_mitigation_plan;
      existingPlan.review_date = draftPayload.review_date;
      existingPlan.business_outcomes = draftPayload.business_outcomes;
      existingPlan.stakeholders = draftPayload.stakeholders;
      existingPlan.renewal_milestones = draftPayload.renewal_milestones;
      existingPlan.expansion_strategy = draftPayload.expansion_strategy;
      existingPlan.recommended_tasks = draftPayload.recommended_tasks;
      existingPlan.grounding = draftPayload.grounding;
      existingPlan.status = 'review';
      existingPlan.updated_at = now.toISOString();
      this.memoryPlans.set(existingPlan.id, existingPlan);
      return this._enrichPlan(existingPlan);
    }

    return draftPayload;
  }

  /**
   * 2. CREATE / SAVE CUSTOMER SUCCESS PLAN
   */
  async createSuccessPlan(userIdOrOpts, maybeData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeData);
    const {
      userId,
      workspaceId,
      accountId = opts.customer_success_account_id || opts.accountId,
      planPeriodStart = opts.plan_period_start || new Date().toISOString(),
      planPeriodEnd = opts.plan_period_end || new Date(Date.now() + 86400000 * 90).toISOString(),
      objectives = opts.objectives || [],
      successMetrics = opts.success_metrics || [],
      engagementStrategy = opts.engagement_strategy || '',
      riskMitigationPlan = opts.risk_mitigation_plan || '',
      reviewDate = opts.review_date || new Date(Date.now() + 86400000 * 30).toISOString(),
      status = opts.status || 'draft',
    } = opts;

    if (!accountId) {
      throw new Error('customer_success_account_id is required to create a Customer Success Plan.');
    }

    const account = this.healthService ? this.healthService.memoryAccounts.get(accountId) : null;
    if (account && account.workspace_id !== workspaceId) {
      throw new Error('Forbidden: Customer Success account belongs to another workspace.');
    }

    if (!CS_PLAN_STATUSES.includes(status)) {
      throw new Error(`Invalid plan status "${status}". Allowed: ${CS_PLAN_STATUSES.join(', ')}`);
    }

    const planId = opts.id || crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const record = {
      id: planId,
      workspace_id: workspaceId,
      customer_success_account_id: accountId,
      plan_period_start: planPeriodStart,
      plan_period_end: planPeriodEnd,
      objectives: Array.isArray(objectives) ? objectives : [],
      success_metrics: Array.isArray(successMetrics) ? successMetrics : [],
      business_outcomes: opts.business_outcomes || [],
      stakeholders: opts.stakeholders || [],
      renewal_milestones: opts.renewal_milestones || [],
      expansion_strategy: opts.expansion_strategy || '',
      recommended_tasks: opts.recommended_tasks || [],
      grounding: opts.grounding || null,
      engagement_strategy: engagementStrategy,
      risk_mitigation_plan: riskMitigationPlan,
      review_date: reviewDate,
      status,
      created_by: userId || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.memoryPlans.set(planId, record);

    if (this.supabase) {
      try {
        await this.supabase.from('customer_success_plans').insert({
          id: record.id,
          workspace_id: record.workspace_id,
          customer_success_account_id: record.customer_success_account_id,
          plan_period_start: record.plan_period_start,
          plan_period_end: record.plan_period_end,
          objectives: record.objectives,
          success_metrics: record.success_metrics,
          engagement_strategy: record.engagement_strategy,
          risk_mitigation_plan: record.risk_mitigation_plan,
          review_date: record.review_date,
          status: record.status,
          created_by: record.created_by,
          created_at: record.created_at,
          updated_at: record.updated_at,
        });
      } catch {}
    }

    return this._enrichPlan(record);
  }

  /**
   * 3. UPDATE CUSTOMER SUCCESS PLAN
   */
  async updateSuccessPlan(userIdOrOpts, maybePlanId = null, maybeUpdates = {}) {
    let opts;
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      opts = this._normalizeArgs(userIdOrOpts, maybeUpdates);
      if (maybePlanId && typeof maybePlanId === 'string') opts.planId = maybePlanId;
    } else {
      opts = this._normalizeArgs(userIdOrOpts, { planId: maybePlanId, ...(maybeUpdates || {}) });
    }

    const planId = opts.planId || opts.id || maybePlanId;
    const { workspaceId } = opts;

    const plan = this.memoryPlans.get(planId);
    if (!plan || plan.workspace_id !== workspaceId) {
      throw new Error(`Customer Success plan "${planId}" not found in workspace.`);
    }

    const updates = opts.updates || (maybeUpdates && Object.keys(maybeUpdates).length > 0 ? maybeUpdates : opts);

    if (updates.status) {
      if (!CS_PLAN_STATUSES.includes(updates.status)) {
        throw new Error(`Invalid plan status "${updates.status}".`);
      }
      plan.status = updates.status;
    }

    if (updates.objectives !== undefined) plan.objectives = updates.objectives;
    if (updates.success_metrics !== undefined || updates.successMetrics !== undefined) {
      plan.success_metrics = updates.success_metrics ?? updates.successMetrics;
    }
    if (updates.engagement_strategy !== undefined || updates.engagementStrategy !== undefined) {
      plan.engagement_strategy = updates.engagement_strategy ?? updates.engagementStrategy;
    }
    if (updates.risk_mitigation_plan !== undefined || updates.riskMitigationPlan !== undefined) {
      plan.risk_mitigation_plan = updates.risk_mitigation_plan ?? updates.riskMitigationPlan;
    }
    if (updates.review_date !== undefined || updates.reviewDate !== undefined) {
      plan.review_date = updates.review_date ?? updates.reviewDate;
    }
    if (updates.plan_period_start !== undefined) plan.plan_period_start = updates.plan_period_start;
    if (updates.plan_period_end !== undefined) plan.plan_period_end = updates.plan_period_end;

    plan.updated_at = new Date().toISOString();
    this.memoryPlans.set(planId, plan);

    return this._enrichPlan(plan);
  }

  /**
   * 4. APPROVE CUSTOMER SUCCESS PLAN
   * Transitions plan from 'draft' or 'review' to 'active' only upon explicit user approval.
   */
  async approveSuccessPlan(userIdOrOpts, maybePlanId = null, maybeOpts = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, { planId: maybePlanId, ...(maybeOpts || {}) });
    const planId = opts.planId || opts.id || maybePlanId;
    const { userId, workspaceId } = opts;

    const plan = this.memoryPlans.get(planId);
    if (!plan || plan.workspace_id !== workspaceId) {
      throw new Error(`Customer Success plan "${planId}" not found in workspace.`);
    }

    plan.status = 'active';
    plan.approved_by = userId;
    plan.approved_at = new Date().toISOString();
    plan.updated_at = plan.approved_at;

    // Also sync approved objectives back to the Customer Success account (never mutating CRM deals!)
    if (this.healthService && this.healthService.memoryAccounts.has(plan.customer_success_account_id)) {
      const acct = this.healthService.memoryAccounts.get(plan.customer_success_account_id);
      if (Array.isArray(plan.objectives) && plan.objectives.length > 0) {
        acct.success_objectives = plan.objectives;
      }
      acct.last_customer_review_at = plan.approved_at;
      this.healthService.memoryAccounts.set(acct.id, acct);
    }

    this.memoryPlans.set(planId, plan);
    return this._enrichPlan(plan);
  }

  /**
   * 5. LIST & GET SUCCESS PLANS
   */
  async getSuccessPlans(userIdOrOpts, maybeFilters = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeFilters);
    const { workspaceId, accountId, status } = opts;

    let list = this._getMemoryPlansList(workspaceId);
    if (accountId) {
      list = list.filter((p) => p.customer_success_account_id === accountId);
    }
    if (status && status !== 'all') {
      list = list.filter((p) => p.status === status);
    }

    return list
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map((p) => this._enrichPlan(p));
  }

  async getSuccessPlanById(userIdOrOpts, maybePlanId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { planId: maybePlanId });
    const planId = opts.planId || opts.id || maybePlanId;
    const { workspaceId } = opts;

    const plan = this.memoryPlans.get(planId);
    if (!plan || plan.workspace_id !== workspaceId) {
      throw new Error(`Customer Success plan "${planId}" not found in workspace.`);
    }

    return this._enrichPlan(plan);
  }

  _enrichPlan(plan) {
    const acct = this.healthService ? this.healthService.memoryAccounts.get(plan.customer_success_account_id) : null;
    const enrichedAcct = acct && this.healthService ? this.healthService._enrichAccount(acct) : null;
    const objectives = Array.isArray(plan.objectives) ? plan.objectives : [];
    const avgProgress =
      objectives.length > 0
        ? Math.round(objectives.reduce((s, o) => s + (Number(o.progress) || (o.status === 'completed' ? 100 : 0)), 0) / objectives.length)
        : 0;

    return {
      ...plan,
      company: enrichedAcct?.company || plan.company || 'Customer Account',
      current_progress_pct: avgProgress,
      account_health_score: acct?.health_score ?? null,
      account_health_status: acct?.health_status ?? null,
    };
  }
}
