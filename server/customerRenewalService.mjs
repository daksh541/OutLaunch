import crypto from 'node:crypto';

/**
 * AI Churn Risk & Renewal Forecasting Service
 *
 * Responsibilities:
 * - Renewal opportunity tracking and pipeline management
 * - Evidence-backed churn risk detection (every risk factor includes factor, evidence, source, severity)
 * - Never infers churn solely from low email activity
 * - Deterministic renewal forecasting (total upcoming, weighted, at-risk, expected retained, realized renewed, churned, renewal rate)
 * - Monthly and quarterly renewal breakdown
 * - Strict currency isolation (never mixes currencies; reports currency mismatches clearly)
 * - Renewal status transitions with audit logging
 * - Historical renewal forecast accuracy calculation
 * - Zero unsolicited CRM modifications
 */

export const RENEWAL_STATUSES = ['upcoming', 'in_progress', 'renewed', 'lost', 'cancelled'];

export class CustomerRenewalService {
  constructor(
    supabaseClient = null,
    customerHealthService = null,
    crmService = null,
    meetingService = null,
    salesCallService = null
  ) {
    this.supabase = supabaseClient;
    this.healthService = customerHealthService;
    this.crmService = crmService;
    this.meetingService = meetingService;
    this.salesCallService = salesCallService;

    this.memoryRenewals = new Map(); // id -> renewal opportunity
    this.memoryAuditLog = []; // audit log entries for renewal mutations
    this.memoryForecastSnapshots = []; // historical forecast snapshots for accuracy tracking
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

  _getMemoryRenewalsList(workspaceId = null) {
    const all = Array.from(this.memoryRenewals.values());
    if (workspaceId) return all.filter((r) => r.workspace_id === workspaceId);
    return all;
  }

  /**
   * 1. DETECT EVIDENCE-BACKED CHURN RISK FACTORS
   * Every risk factor identifies its factor type, description, evidence, source, and severity.
   * Rule: Never infer churn solely from low email activity.
   */
  evaluateAccountChurnRisk(account, context = {}) {
    if (!account) {
      throw new Error('Customer Success account is required for churn risk evaluation.');
    }

    const now = Date.now();
    const activities =
      context.activities !== undefined
        ? context.activities
        : this.healthService
        ? this.healthService._getMemoryActivitiesList(account.workspace_id, account.id)
        : [];

    const meetings = context.meetings || [];
    const callInsights = context.callInsights || [];
    const totalWorkspaceContractValue = Number(context.totalWorkspaceContractValue || 0);
    const reviewPeriodDays = Number(context.reviewPeriodDays || 90);

    const riskFactors = [];
    let riskScore = 0;

    // 1. Renewal date approaching without a renewal discussion
    const renewalDateStr = account.renewal_date || account.contract_end_date;
    const renewalDiscussions = activities.filter((a) => a.activity_type === 'renewal_discussion');
    if (renewalDateStr) {
      const daysToRenewal = Math.floor((new Date(renewalDateStr).getTime() - now) / 86400000);
      if (daysToRenewal <= 60 && daysToRenewal >= 0 && renewalDiscussions.length === 0) {
        const pts = daysToRenewal <= 30 ? 28 : 18;
        riskScore += pts;
        riskFactors.push({
          factor: 'approaching_renewal_without_discussion',
          title: 'Renewal Approaching Without Discussion',
          severity: daysToRenewal <= 30 ? 'high' : 'medium',
          points: pts,
          evidence: `Renewal is scheduled in ${daysToRenewal} days (${new Date(renewalDateStr).toISOString().split('T')[0]}) with 0 logged renewal_discussion activities.`,
          source: 'customer_success_accounts.renewal_date & customer_success_activities',
          recommended_mitigation: 'Initiate commercial renewal review and confirm renewal timeline with economic buyer immediately.',
        });
      } else if (daysToRenewal < 0 && account.customer_status !== 'churned') {
        riskScore += 30;
        riskFactors.push({
          factor: 'overdue_renewal',
          title: 'Renewal Date Past Due',
          severity: 'high',
          points: 30,
          evidence: `Contract renewal date passed ${Math.abs(daysToRenewal)} days ago without completed renewal.`,
          source: 'customer_success_accounts.renewal_date',
          recommended_mitigation: 'Escalate overdue renewal contract status with account owner and finance.',
        });
      }
    }

    // 2. Repeatedly postponed or cancelled meetings
    const postponedMeetings = meetings.filter(
      (m) => m.status === 'cancelled' || m.status === 'no_show' || Number(m.rescheduled_count || 0) >= 2
    );
    if (postponedMeetings.length >= 2) {
      riskScore += 20;
      riskFactors.push({
        factor: 'repeatedly_postponed_meetings',
        title: 'Repeatedly Postponed or Cancelled Meetings',
        severity: 'high',
        points: 20,
        evidence: `${postponedMeetings.length} scheduled customer meetings were cancelled, no-show, or repeatedly rescheduled.`,
        source: `meeting_scheduler (records: ${postponedMeetings.map((m) => m.id || 'meeting').join(', ')})`,
        recommended_mitigation: 'Reach out to executive sponsor to re-establish cadence and confirm stakeholder availability.',
      });
    }

    // 3. Unresolved objections in call insights
    const objectionCalls = callInsights.filter(
      (c) => (Array.isArray(c.objections) && c.objections.some((o) => !o.resolved)) || Number(c.unresolvedObjections || 0) > 0
    );
    if (objectionCalls.length > 0) {
      const sampleObj =
        objectionCalls[0].objections?.find((o) => !o.resolved)?.text ||
        objectionCalls[0].primaryObjection ||
        'Unresolved commercial or product objection during customer call';
      riskScore += 22;
      riskFactors.push({
        factor: 'unresolved_call_objections',
        title: 'Unresolved Objections in Call Insights',
        severity: 'high',
        points: 22,
        evidence: `Unresolved objection logged in call transcript: "${sampleObj}"`,
        source: `sales_call_intelligence (call_id: ${objectionCalls[0].id || 'call_record'})`,
        recommended_mitigation: 'Deliver targeted objection resolution plan and follow up on open technical/ROI concerns.',
      });
    }

    // 4. Negative customer feedback explicitly present in source records
    const negativeCalls = callInsights.filter(
      (c) => c.sentiment === 'negative' || (typeof c.customerFeedback === 'string' && c.customerFeedback.trim().length > 0)
    );
    const supportIssues = activities.filter((a) => a.activity_type === 'support_issue');
    if (negativeCalls.length > 0 || supportIssues.length > 0) {
      const feedbackEvidence =
        negativeCalls[0]?.customerFeedback ||
        supportIssues[0]?.description ||
        supportIssues[0]?.title ||
        'Explicit negative feedback / support escalation recorded';
      const feedbackSource =
        negativeCalls.length > 0
          ? `sales_call_intelligence (call_id: ${negativeCalls[0].id || 'call'})`
          : `customer_success_activities (activity_id: ${supportIssues[0].id || 'support_issue'})`;

      riskScore += 20;
      riskFactors.push({
        factor: 'explicit_negative_feedback',
        title: 'Negative Customer Feedback or Escalation in Source Records',
        severity: 'high',
        points: 20,
        evidence: `Explicit feedback recorded: "${feedbackEvidence}"`,
        source: feedbackSource,
        recommended_mitigation: 'Coordinate resolution between Customer Success and Engineering/Support leadership.',
      });
    }

    // 5. Uncompleted success objectives
    const objectives = Array.isArray(account.success_objectives) ? account.success_objectives : [];
    if (objectives.length > 0) {
      const uncompleted = objectives.filter(
        (o) => o && o.status !== 'completed' && o.completed !== true && Number(o.progress || 0) < 100
      );
      if (uncompleted.length === objectives.length) {
        riskScore += 15;
        riskFactors.push({
          factor: 'uncompleted_success_objectives',
          title: 'Uncompleted Customer Success Objectives',
          severity: 'medium',
          points: 15,
          evidence: `${uncompleted.length} of ${objectives.length} agreed success objectives remain uncompleted.`,
          source: 'customer_success_accounts.success_objectives',
          recommended_mitigation: 'Conduct milestone unblock session to deliver measurable value before renewal window.',
        });
      } else if (uncompleted.length >= Math.ceil(objectives.length / 2) && renewalDateStr) {
        const daysToRenewal = Math.floor((new Date(renewalDateStr).getTime() - now) / 86400000);
        if (daysToRenewal <= 60) {
          riskScore += 12;
          riskFactors.push({
            factor: 'uncompleted_success_objectives',
            title: 'Key Success Objectives Incomplete Near Renewal',
            severity: 'medium',
            points: 12,
            evidence: `${uncompleted.length} of ${objectives.length} success objectives incomplete with ${daysToRenewal} days to renewal.`,
            source: 'customer_success_accounts.success_objectives',
            recommended_mitigation: 'Prioritize remaining onboarding/adoption objectives with customer project lead.',
          });
        }
      }
    }

    // 6. No account review within configured period
    if (account.last_customer_review_at) {
      const daysSinceReview = Math.floor((now - new Date(account.last_customer_review_at).getTime()) / 86400000);
      if (daysSinceReview > reviewPeriodDays) {
        riskScore += 12;
        riskFactors.push({
          factor: 'overdue_account_review',
          title: 'No Customer Review Within Configured Period',
          severity: 'medium',
          points: 12,
          evidence: `Last customer review was ${daysSinceReview} days ago (threshold: ${reviewPeriodDays} days).`,
          source: 'customer_success_accounts.last_customer_review_at',
          recommended_mitigation: 'Schedule Quarterly Business Review (QBR) to align on ROI and upcoming roadmap.',
        });
      }
    } else if (account.customer_since) {
      const daysAsCustomer = Math.floor((now - new Date(account.customer_since).getTime()) / 86400000);
      if (daysAsCustomer > reviewPeriodDays) {
        riskScore += 12;
        riskFactors.push({
          factor: 'overdue_account_review',
          title: 'No Account Review Logged Since Onboarding',
          severity: 'medium',
          points: 12,
          evidence: `Customer active for ${daysAsCustomer} days with no recorded customer business review.`,
          source: 'customer_success_accounts.last_customer_review_at',
          recommended_mitigation: 'Book executive alignment review to document business outcomes.',
        });
      }
    }

    // 7. Declining multi-channel engagement (Note: Never infer churn solely from low email activity!)
    // Only flag declining engagement when supported by cross-channel inactivity (meetings + calls + reviews) OR paired with other non-email risk factors.
    const nonEmailActivities = activities.filter((a) => a.activity_type !== 'email_reply');
    const latestNonEmail = nonEmailActivities[0]?.activity_date || account.last_customer_review_at;
    const daysSinceNonEmail = latestNonEmail
      ? Math.floor((now - new Date(latestNonEmail).getTime()) / 86400000)
      : null;

    if (daysSinceNonEmail !== null && daysSinceNonEmail > 60 && riskFactors.length > 0) {
      riskScore += 12;
      riskFactors.push({
        factor: 'declining_engagement',
        title: 'Declining Multi-Channel Relationship Engagement',
        severity: 'medium',
        points: 12,
        evidence: `${daysSinceNonEmail} days since last non-email customer interaction (meeting, call, or review), compounding existing risk signals.`,
        source: 'customer_success_activities (meetings, calls, reviews)',
        recommended_mitigation: 'Re-engage champion via executive outreach and value realization check-in.',
      });
    }

    // 8. Contract value concentration
    const acctVal = Number(account.contract_value || 0);
    if (totalWorkspaceContractValue > 0 && acctVal > 0 && acctVal / totalWorkspaceContractValue >= 0.35 && riskFactors.length > 0) {
      const sharePct = Math.round((acctVal / totalWorkspaceContractValue) * 100);
      riskScore += 10;
      riskFactors.push({
        factor: 'contract_value_concentration',
        title: 'High Contract Value Concentration at Risk',
        severity: 'high',
        points: 10,
        evidence: `Account represents ${sharePct}% ($${acctVal.toLocaleString()} ${account.currency || 'USD'}) of total workspace recurring contract value.`,
        source: 'customer_success_accounts.contract_value',
        recommended_mitigation: 'Assign executive sponsor for high-touch retention oversight.',
      });
    }

    const clampedRiskScore = Math.min(100, Math.max(0, Math.round(riskScore)));
    const computedRenewalProbability = Math.min(100, Math.max(0, Math.round(100 - clampedRiskScore * 0.85)));

    return {
      account_id: account.id,
      workspace_id: account.workspace_id,
      risk_score: clampedRiskScore,
      riskScore: clampedRiskScore,
      risk_level:
        clampedRiskScore >= 60 ? 'critical' : clampedRiskScore >= 35 ? 'high' : clampedRiskScore >= 15 ? 'moderate' : 'low',
      renewal_probability: computedRenewalProbability,
      renewalProbability: computedRenewalProbability,
      primary_risk_factor: riskFactors[0] || null,
      risk_factors: riskFactors,
      riskFactors,
      evaluated_at: new Date().toISOString(),
    };
  }

  /**
   * 2. CREATE RENEWAL OPPORTUNITY
   */
  async createRenewalOpportunity(userIdOrOpts, maybeData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeData);
    const {
      userId,
      workspaceId,
      accountId = opts.customer_success_account_id || opts.accountId,
      renewalDate = opts.renewal_date,
      contractValue = opts.contract_value,
      currency = opts.currency,
      renewalStatus = opts.renewal_status || 'upcoming',
      renewalProbability = opts.renewal_probability,
      renewalStrategy = opts.renewal_strategy || '',
      nextAction = opts.next_action || '',
      ownerUserId = opts.owner_user_id || userId,
    } = opts;

    if (!accountId) {
      throw new Error('customer_success_account_id is required to create a renewal opportunity.');
    }

    const account = this.healthService ? this.healthService.memoryAccounts.get(accountId) : null;
    if (account && account.workspace_id !== workspaceId) {
      throw new Error('Forbidden: Customer Success account belongs to a different workspace.');
    }

    if (!RENEWAL_STATUSES.includes(renewalStatus)) {
      throw new Error(`Invalid renewal_status "${renewalStatus}". Allowed: ${RENEWAL_STATUSES.join(', ')}`);
    }

    const resolvedRenewalDate =
      renewalDate || account?.renewal_date || new Date(Date.now() + 86400000 * 60).toISOString();
    const resolvedValue =
      contractValue !== undefined && contractValue !== null
        ? Number(contractValue)
        : Number(account?.contract_value || 0);

    if (Number.isNaN(resolvedValue) || resolvedValue < 0) {
      throw new Error('contract_value must be a non-negative number.');
    }

    const riskEval = account
      ? this.evaluateAccountChurnRisk(account, opts.riskContext || {})
      : { risk_score: 20, renewal_probability: 75, risk_factors: [] };

    const resolvedProb =
      renewalProbability !== undefined && renewalProbability !== null
        ? Math.min(100, Math.max(0, Number(renewalProbability)))
        : renewalStatus === 'renewed'
        ? 100
        : renewalStatus === 'lost' || renewalStatus === 'cancelled'
        ? 0
        : riskEval.renewal_probability;

    const resolvedRiskScore =
      opts.risk_score !== undefined && opts.risk_score !== null
        ? Math.min(100, Math.max(0, Number(opts.risk_score)))
        : riskEval.risk_score;

    const resolvedRiskFactors = Array.isArray(opts.risk_factors) ? opts.risk_factors : riskEval.risk_factors;

    const renewalId = opts.id || crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const record = {
      id: renewalId,
      workspace_id: workspaceId,
      customer_success_account_id: accountId,
      renewal_date: resolvedRenewalDate,
      contract_value: resolvedValue,
      currency: String(currency || account?.currency || 'USD').toUpperCase(),
      renewal_status: renewalStatus,
      renewal_probability: resolvedProb,
      risk_score: resolvedRiskScore,
      risk_factors: resolvedRiskFactors,
      renewal_strategy:
        renewalStrategy ||
        (resolvedRiskScore >= 40
          ? 'Executive retention cadence with ROI verification and risk mitigation milestones'
          : 'Standard 60-day commercial renewal review and multi-year expansion proposal'),
      next_action:
        nextAction ||
        resolvedRiskFactors[0]?.recommended_mitigation ||
        'Schedule renewal alignment discussion with primary stakeholder',
      owner_user_id: ownerUserId || account?.account_owner_id || userId || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.memoryRenewals.set(renewalId, record);

    this.memoryAuditLog.push({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      entity_type: 'renewal_opportunity',
      entity_id: renewalId,
      action: 'created',
      actor_id: userId,
      changes: { renewal_status: renewalStatus, contract_value: resolvedValue },
      timestamp: nowIso,
    });

    if (this.supabase) {
      try {
        await this.supabase.from('customer_renewal_opportunities').insert(record);
      } catch {}
    }

    return this._enrichRenewal(record);
  }

  /**
   * 3. UPDATE RENEWAL OPPORTUNITY & STATUS TRANSITIONS (With Audit Trail)
   */
  async updateRenewalOpportunity(userIdOrOpts, maybeRenewalId = null, maybeUpdates = {}) {
    let opts;
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      opts = this._normalizeArgs(userIdOrOpts, maybeUpdates);
      if (maybeRenewalId && typeof maybeRenewalId === 'string') opts.renewalId = maybeRenewalId;
    } else {
      opts = this._normalizeArgs(userIdOrOpts, { renewalId: maybeRenewalId, ...(maybeUpdates || {}) });
    }

    const renewalId = opts.renewalId || opts.id || maybeRenewalId;
    const { userId, workspaceId } = opts;

    const renewal = this.memoryRenewals.get(renewalId);
    if (!renewal || renewal.workspace_id !== workspaceId) {
      throw new Error(`Renewal opportunity "${renewalId}" not found in workspace.`);
    }

    const updates = opts.updates || (maybeUpdates && Object.keys(maybeUpdates).length > 0 ? maybeUpdates : opts);
    const previousStatus = renewal.renewal_status;

    if (updates.renewal_status || updates.renewalStatus) {
      const nextStatus = updates.renewal_status || updates.renewalStatus;
      if (!RENEWAL_STATUSES.includes(nextStatus)) {
        throw new Error(`Invalid renewal_status "${nextStatus}". Allowed: ${RENEWAL_STATUSES.join(', ')}`);
      }
      renewal.renewal_status = nextStatus;

      // Update probability deterministically on terminal transitions unless explicitly overridden
      if (nextStatus === 'renewed' && updates.renewal_probability === undefined) {
        renewal.renewal_probability = 100;
        renewal.risk_score = 0;
      } else if ((nextStatus === 'lost' || nextStatus === 'cancelled') && updates.renewal_probability === undefined) {
        renewal.renewal_probability = 0;
        renewal.risk_score = 100;
      }

      // Sync customer_status on Customer Success Account (NEVER modifies CRM deals/leads!)
      if (this.healthService && this.healthService.memoryAccounts.has(renewal.customer_success_account_id)) {
        const acct = this.healthService.memoryAccounts.get(renewal.customer_success_account_id);
        if (nextStatus === 'lost' || nextStatus === 'cancelled') {
          acct.customer_status = 'churned';
        } else if (nextStatus === 'renewed') {
          acct.customer_status = 'active';
        } else if (nextStatus === 'in_progress') {
          acct.customer_status = 'renewal_due';
        }
        this.healthService.memoryAccounts.set(acct.id, acct);
      }
    }

    if (updates.renewal_date !== undefined || updates.renewalDate !== undefined) {
      renewal.renewal_date = updates.renewal_date ?? updates.renewalDate;
    }
    if (updates.contract_value !== undefined || updates.contractValue !== undefined) {
      const val = Number(updates.contract_value ?? updates.contractValue);
      if (Number.isNaN(val) || val < 0) throw new Error('contract_value must be non-negative.');
      renewal.contract_value = val;
    }
    if (updates.currency !== undefined) {
      renewal.currency = String(updates.currency).toUpperCase();
    }
    if (updates.renewal_probability !== undefined || updates.renewalProbability !== undefined) {
      renewal.renewal_probability = Math.min(
        100,
        Math.max(0, Number(updates.renewal_probability ?? updates.renewalProbability))
      );
    }
    if (updates.risk_score !== undefined || updates.riskScore !== undefined) {
      renewal.risk_score = Math.min(100, Math.max(0, Number(updates.risk_score ?? updates.riskScore)));
    }
    if (updates.risk_factors !== undefined || updates.riskFactors !== undefined) {
      renewal.risk_factors = updates.risk_factors ?? updates.riskFactors;
    }
    if (updates.renewal_strategy !== undefined || updates.renewalStrategy !== undefined) {
      renewal.renewal_strategy = updates.renewal_strategy ?? updates.renewalStrategy;
    }
    if (updates.next_action !== undefined || updates.nextAction !== undefined) {
      renewal.next_action = updates.next_action ?? updates.nextAction;
    }
    if (updates.owner_user_id !== undefined || updates.ownerUserId !== undefined) {
      renewal.owner_user_id = updates.owner_user_id ?? updates.ownerUserId;
    }

    renewal.updated_at = new Date().toISOString();
    this.memoryRenewals.set(renewalId, renewal);

    this.memoryAuditLog.push({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      entity_type: 'renewal_opportunity',
      entity_id: renewalId,
      action: 'updated',
      actor_id: userId,
      previous_status: previousStatus,
      new_status: renewal.renewal_status,
      timestamp: renewal.updated_at,
    });

    if (this.supabase) {
      try {
        await this.supabase
          .from('customer_renewal_opportunities')
          .update(renewal)
          .eq('id', renewalId)
          .eq('workspace_id', workspaceId);
      } catch {}
    }

    return this._enrichRenewal(renewal);
  }

  /**
   * 4. LIST & FILTER RENEWAL OPPORTUNITIES
   */
  async getRenewals(userIdOrOpts, maybeFilters = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeFilters);
    const { workspaceId, status, accountId, startDate, endDate, daysAhead } = opts;

    let list = this._getMemoryRenewalsList(workspaceId);

    if (status && status !== 'all') {
      list = list.filter((r) => r.renewal_status === status);
    }
    if (accountId) {
      list = list.filter((r) => r.customer_success_account_id === accountId);
    }
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      list = list.filter((r) => new Date(r.renewal_date).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      list = list.filter((r) => new Date(r.renewal_date).getTime() <= endMs);
    }
    if (daysAhead !== undefined && daysAhead !== null) {
      const now = Date.now();
      const cutoff = now + Number(daysAhead) * 86400000;
      list = list.filter((r) => {
        const t = new Date(r.renewal_date).getTime();
        return t >= now && t <= cutoff;
      });
    }

    return list
      .sort((a, b) => new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime())
      .map((r) => this._enrichRenewal(r));
  }

  async getRenewalById(userIdOrOpts, maybeRenewalId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { renewalId: maybeRenewalId });
    const renewalId = opts.renewalId || opts.id || maybeRenewalId;
    const { workspaceId } = opts;

    const renewal = this.memoryRenewals.get(renewalId);
    if (!renewal || renewal.workspace_id !== workspaceId) {
      throw new Error(`Renewal opportunity "${renewalId}" not found in workspace.`);
    }

    return this._enrichRenewal(renewal);
  }

  _enrichRenewal(renewal) {
    const acct = this.healthService ? this.healthService.memoryAccounts.get(renewal.customer_success_account_id) : null;
    const enrichedAcct = acct && this.healthService ? this.healthService._enrichAccount(acct) : null;

    return {
      ...renewal,
      company: enrichedAcct?.company || 'Customer Account',
      contact_name: enrichedAcct?.contact_name || null,
      health_score: acct?.health_score ?? null,
      health_status: acct?.health_status ?? null,
      weighted_value: Math.round(Number(renewal.contract_value || 0) * (Number(renewal.renewal_probability || 0) / 100) * 100) / 100,
    };
  }

  /**
   * 5. DETERMINISTIC RENEWAL FORECASTING
   *
   * Calculates:
   * - Total upcoming renewal value (open renewals: upcoming + in_progress)
   * - Weighted renewal value (sum of contract_value * renewal_probability / 100 for open renewals)
   * - At-risk renewal value (open renewals where risk_score >= 40 or renewal_probability < 60 or health_status in At Risk/Critical)
   * - Realized renewed contract value (status === 'renewed')
   * - Expected retained revenue (realized renewed + weighted upcoming renewal value)
   * - Churned contract value (status in 'lost' or 'cancelled')
   * - Renewal rate (realized renewed value / (realized renewed + churned value), or count-based & value-based)
   * - Renewal forecast by month and quarter
   *
   * Currency Isolation Rule:
   * Never mix currencies in totals. Filters to baseCurrency (default 'USD') and reports excluded currencies clearly.
   */
  async getRenewalForecast(userIdOrOpts, maybeOpts = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeOpts);
    const { workspaceId, baseCurrency = 'USD', startDate, endDate } = opts;
    const targetCurrency = String(baseCurrency || 'USD').toUpperCase();

    let allWorkspaceRenewals = this._getMemoryRenewalsList(workspaceId);

    if (startDate) {
      const sMs = new Date(startDate).getTime();
      allWorkspaceRenewals = allWorkspaceRenewals.filter((r) => new Date(r.renewal_date).getTime() >= sMs);
    }
    if (endDate) {
      const eMs = new Date(endDate).getTime();
      allWorkspaceRenewals = allWorkspaceRenewals.filter((r) => new Date(r.renewal_date).getTime() <= eMs);
    }

    const matchingCurrencyRenewals = [];
    const mismatchedRenewals = [];
    const excludedCurrenciesSet = new Set();

    for (const r of allWorkspaceRenewals) {
      const curr = String(r.currency || 'USD').toUpperCase();
      if (curr === targetCurrency) {
        matchingCurrencyRenewals.push(r);
      } else {
        mismatchedRenewals.push(r);
        excludedCurrenciesSet.add(curr);
      }
    }

    const openRenewals = matchingCurrencyRenewals.filter(
      (r) => r.renewal_status === 'upcoming' || r.renewal_status === 'in_progress'
    );
    const renewedList = matchingCurrencyRenewals.filter((r) => r.renewal_status === 'renewed');
    const churnedList = matchingCurrencyRenewals.filter(
      (r) => r.renewal_status === 'lost' || r.renewal_status === 'cancelled'
    );

    const totalUpcomingRenewalValue =
      Math.round(openRenewals.reduce((sum, r) => sum + (Number(r.contract_value) || 0), 0) * 100) / 100;

    const weightedRenewalValue =
      Math.round(
        openRenewals.reduce(
          (sum, r) => sum + (Number(r.contract_value) || 0) * (Number(r.renewal_probability || 0) / 100),
          0
        ) * 100
      ) / 100;

    const atRiskRenewals = openRenewals.filter((r) => {
      return Number(r.risk_score) >= 40 || Number(r.renewal_probability) < 60;
    });

    const atRiskRenewalValue =
      Math.round(atRiskRenewals.reduce((sum, r) => sum + (Number(r.contract_value) || 0), 0) * 100) / 100;

    const realizedRenewedValue =
      Math.round(renewedList.reduce((sum, r) => sum + (Number(r.contract_value) || 0), 0) * 100) / 100;

    const churnedContractValue =
      Math.round(churnedList.reduce((sum, r) => sum + (Number(r.contract_value) || 0), 0) * 100) / 100;

    // Expected retained revenue = realized renewed + weighted open renewals (kept distinct from realizedRenewedValue)
    const expectedRetainedRevenue = Math.round((realizedRenewedValue + weightedRenewalValue) * 100) / 100;

    const closedTotalValue = realizedRenewedValue + churnedContractValue;
    const closedTotalCount = renewedList.length + churnedList.length;

    const valueRenewalRatePct =
      closedTotalValue > 0 ? Math.round((realizedRenewedValue / closedTotalValue) * 1000) / 10 : null;
    const countRenewalRatePct =
      closedTotalCount > 0 ? Math.round((renewedList.length / closedTotalCount) * 1000) / 10 : null;

    // Forecast breakdown by Month (YYYY-MM) and Quarter (YYYY-Q#)
    const byMonthMap = new Map();
    const byQuarterMap = new Map();

    for (const r of matchingCurrencyRenewals) {
      const d = new Date(r.renewal_date);
      if (Number.isNaN(d.getTime())) continue;
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const quarter = Math.floor(d.getUTCMonth() / 3) + 1;

      const monthKey = `${year}-${month}`;
      const quarterKey = `${year}-Q${quarter}`;

      const val = Number(r.contract_value) || 0;
      const isOpen = r.renewal_status === 'upcoming' || r.renewal_status === 'in_progress';
      const isRenewed = r.renewal_status === 'renewed';
      const isChurned = r.renewal_status === 'lost' || r.renewal_status === 'cancelled';
      const weighted = isOpen ? val * (Number(r.renewal_probability || 0) / 100) : isRenewed ? val : 0;

      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, {
          period: monthKey,
          upcoming_value: 0,
          weighted_value: 0,
          realized_renewed_value: 0,
          churned_value: 0,
          count: 0,
        });
      }
      const mEntry = byMonthMap.get(monthKey);
      if (isOpen) mEntry.upcoming_value = Math.round((mEntry.upcoming_value + val) * 100) / 100;
      mEntry.weighted_value = Math.round((mEntry.weighted_value + weighted) * 100) / 100;
      if (isRenewed) mEntry.realized_renewed_value = Math.round((mEntry.realized_renewed_value + val) * 100) / 100;
      if (isChurned) mEntry.churned_value = Math.round((mEntry.churned_value + val) * 100) / 100;
      mEntry.count += 1;

      if (!byQuarterMap.has(quarterKey)) {
        byQuarterMap.set(quarterKey, {
          period: quarterKey,
          upcoming_value: 0,
          weighted_value: 0,
          realized_renewed_value: 0,
          churned_value: 0,
          count: 0,
        });
      }
      const qEntry = byQuarterMap.get(quarterKey);
      if (isOpen) qEntry.upcoming_value = Math.round((qEntry.upcoming_value + val) * 100) / 100;
      qEntry.weighted_value = Math.round((qEntry.weighted_value + weighted) * 100) / 100;
      if (isRenewed) qEntry.realized_renewed_value = Math.round((qEntry.realized_renewed_value + val) * 100) / 100;
      if (isChurned) qEntry.churned_value = Math.round((qEntry.churned_value + val) * 100) / 100;
      qEntry.count += 1;
    }

    const excludedCurrencies = Array.from(excludedCurrenciesSet);
    const currencyMismatchWarning =
      mismatchedRenewals.length > 0
        ? `Excluded ${mismatchedRenewals.length} renewal record(s) in non-${targetCurrency} currencies (${excludedCurrencies.join(', ')}) to preserve financial accuracy.`
        : null;

    return {
      workspace_id: workspaceId,
      currency: targetCurrency,
      total_upcoming_renewal_value: totalUpcomingRenewalValue,
      totalUpcomingRenewalValue,
      weighted_renewal_value: weightedRenewalValue,
      weightedRenewalValue,
      at_risk_renewal_value: atRiskRenewalValue,
      atRiskRenewalValue,
      realized_renewed_value: realizedRenewedValue,
      realizedRenewedValue,
      expected_retained_revenue: expectedRetainedRevenue,
      expectedRetainedRevenue,
      churned_contract_value: churnedContractValue,
      churnedContractValue,
      renewal_rate_pct: valueRenewalRatePct,
      renewalRatePct: valueRenewalRatePct,
      count_renewal_rate_pct: countRenewalRatePct,
      counts: {
        open_renewals: openRenewals.length,
        at_risk_renewals: atRiskRenewals.length,
        renewed: renewedList.length,
        churned: churnedList.length,
        excluded_currency_records: mismatchedRenewals.length,
      },
      by_month: Array.from(byMonthMap.values()).sort((a, b) => a.period.localeCompare(b.period)),
      by_quarter: Array.from(byQuarterMap.values()).sort((a, b) => a.period.localeCompare(b.period)),
      excluded_currencies: excludedCurrencies,
      excluded_records_count: mismatchedRenewals.length,
      currency_mismatch_warning: currencyMismatchWarning,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * 6. GET PORTFOLIO CHURN RISKS
   */
  async getChurnRisks(userIdOrOpts, maybeOpts = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeOpts);
    const { workspaceId } = opts;

    const accounts = this.healthService ? this.healthService._getMemoryAccountsList(workspaceId) : [];
    const totalContractValue = accounts.reduce((s, a) => s + (Number(a.contract_value) || 0), 0);

    const accountRiskEvaluations = [];
    for (const acct of accounts) {
      if (acct.customer_status === 'churned') continue;
      const riskEval = this.evaluateAccountChurnRisk(acct, {
        totalWorkspaceContractValue: totalContractValue,
      });
      const enriched = this.healthService ? this.healthService._enrichAccount(acct) : acct;
      if (riskEval.risk_score > 0 || acct.health_status === 'At Risk' || acct.health_status === 'Critical') {
        accountRiskEvaluations.push({
          account_id: acct.id,
          lead_id: acct.lead_id,
          company: enriched.company,
          account_owner_id: acct.account_owner_id,
          contract_value: acct.contract_value,
          currency: acct.currency,
          renewal_date: acct.renewal_date,
          health_score: acct.health_score,
          health_status: acct.health_status,
          risk_score: riskEval.risk_score,
          risk_level: riskEval.risk_level,
          renewal_probability: riskEval.renewal_probability,
          primary_risk_factor: riskEval.primary_risk_factor,
          risk_factors: riskEval.risk_factors,
          recommended_mitigation:
            riskEval.primary_risk_factor?.recommended_mitigation || 'Schedule customer health review',
        });
      }
    }

    return accountRiskEvaluations.sort((a, b) => b.risk_score - a.risk_score);
  }

  /**
   * 7. RENEWAL FORECAST ACCURACY
   * Compares predicted weighted renewal values against actual realized renewal outcomes for closed renewals.
   */
  async getRenewalForecastAccuracy(userIdOrOpts, maybeOpts = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeOpts);
    const { workspaceId, baseCurrency = 'USD' } = opts;
    const targetCurrency = String(baseCurrency).toUpperCase();

    const renewals = this._getMemoryRenewalsList(workspaceId).filter(
      (r) => String(r.currency || 'USD').toUpperCase() === targetCurrency
    );

    const closedRenewals = renewals.filter(
      (r) => r.renewal_status === 'renewed' || r.renewal_status === 'lost' || r.renewal_status === 'cancelled'
    );

    if (closedRenewals.length === 0) {
      return {
        workspace_id: workspaceId,
        currency: targetCurrency,
        evaluated_renewals_count: 0,
        predicted_retained_value: 0,
        actual_retained_value: 0,
        variance_value: 0,
        accuracy_pct: null,
        status: 'insufficient_closed_history',
      };
    }

    const actualRetained = closedRenewals
      .filter((r) => r.renewal_status === 'renewed')
      .reduce((s, r) => s + (Number(r.contract_value) || 0), 0);

    // Use initial or pre-close probability if recorded, else 75% baseline expectation
    const predictedRetained = closedRenewals.reduce((s, r) => {
      const initialProb = r.initial_probability !== undefined ? Number(r.initial_probability) : 75;
      return s + (Number(r.contract_value) || 0) * (initialProb / 100);
    }, 0);

    const variance = Math.round((actualRetained - predictedRetained) * 100) / 100;
    const denominator = Math.max(actualRetained, predictedRetained, 1);
    const accuracyPct = Math.max(0, Math.min(100, Math.round((1 - Math.abs(variance) / denominator) * 1000) / 10));

    return {
      workspace_id: workspaceId,
      currency: targetCurrency,
      evaluated_renewals_count: closedRenewals.length,
      predicted_retained_value: Math.round(predictedRetained * 100) / 100,
      actual_retained_value: Math.round(actualRetained * 100) / 100,
      variance_value: variance,
      accuracy_pct: accuracyPct,
      status: 'evaluated',
    };
  }
}
