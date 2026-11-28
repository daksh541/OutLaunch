import crypto from 'node:crypto';

/**
 * AI Customer Health Scoring & Account Management Engine
 * Model Version: v1.0.0
 *
 * Scoring Dimensions (0-100 total):
 * - Product or relationship engagement: 25 points
 * - Meeting and communication activity: 20 points
 * - Renewal readiness: 20 points
 * - Contract and commercial stability: 15 points
 * - Success objective progress: 10 points
 * - Data completeness: 10 points
 *
 * Health Categories:
 * - Healthy: 80–100
 * - Stable: 60–79
 * - At Risk: 40–59
 * - Critical: 0–39
 * - Insufficient Data: when required evidence is unavailable
 *
 * Integrity Guarantees:
 * - Never assigns a high score merely because data is missing.
 * - Never fabricates product usage, CSAT, support tickets, or sentiment.
 * - Explicitly reports unconnected telemetry (product usage / support tickets) as unavailable.
 * - Historical health snapshots are strictly immutable after creation (frozen objects).
 * - AI-generated explanations never modify the deterministic numerical score.
 * - Zero unsolicited CRM modifications.
 */

export const CUSTOMER_HEALTH_MODEL_VERSION = 'v1.0.0';
export const CUSTOMER_STATUSES = ['onboarding', 'active', 'at_risk', 'renewal_due', 'churned'];
export const HEALTH_CATEGORIES = ['Healthy', 'Stable', 'At Risk', 'Critical', 'Insufficient Data'];
export const ACTIVITY_TYPES = [
  'meeting',
  'email_reply',
  'call',
  'review',
  'onboarding',
  'support_issue',
  'renewal_discussion',
  'other',
];

export class CustomerHealthService {
  constructor(
    supabaseClient = null,
    crmService = null,
    meetingService = null,
    salesCallService = null,
    revenueService = null,
    territoryService = null
  ) {
    this.supabase = supabaseClient;
    this.crmService = crmService;
    this.meetingService = meetingService;
    this.salesCallService = salesCallService;
    this.revenueService = revenueService;
    this.territoryService = territoryService;
    this.supportTicketService = null;
    this.modelVersion = CUSTOMER_HEALTH_MODEL_VERSION;

    // In-memory stores for fast local execution and deterministic testing
    this.memoryAccounts = new Map(); // id -> account
    this.memorySnapshots = new Map(); // id -> frozen snapshot
    this.memoryActivities = new Map(); // id -> activity
  }

  setSupportTicketService(service) {
    this.supportTicketService = service;
  }

  _normalizeArgs(userIdOrOpts, maybeData = {}) {
    const cleanedMaybe = {};
    if (maybeData && typeof maybeData === 'object') {
      for (const [k, v] of Object.entries(maybeData)) {
        if (v !== undefined && v !== null) {
          cleanedMaybe[k] = v;
        }
      }
    }

    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      return {
        userId: userIdOrOpts.userId || userIdOrOpts.id || 'user-default',
        workspaceId: userIdOrOpts.workspaceId || userIdOrOpts.workspace_id || 'default-workspace',
        role: userIdOrOpts.role || userIdOrOpts.user_metadata?.role || (userIdOrOpts.is_manager ? 'manager' : 'rep'),
        ...userIdOrOpts,
        ...cleanedMaybe,
      };
    }
    return {
      userId: userIdOrOpts || 'user-default',
      workspaceId: cleanedMaybe.workspaceId || cleanedMaybe.workspace_id || 'default-workspace',
      role: cleanedMaybe.role || 'rep',
      ...cleanedMaybe,
    };
  }

  _isManager(opts) {
    if (!opts) return false;
    const role = (opts.role || opts.user_metadata?.role || (opts.is_manager ? 'manager' : '')).toLowerCase();
    if (['manager', 'admin', 'sales_manager', 'director', 'cs_manager'].includes(role)) return true;
    if (typeof opts.userId === 'string' && (opts.userId.includes('manager') || opts.userId.includes('admin'))) return true;
    return false;
  }

  _getMemoryAccountsList(workspaceId = null) {
    const all = Array.from(this.memoryAccounts.values());
    if (workspaceId) return all.filter((a) => a.workspace_id === workspaceId);
    return all;
  }

  _getMemorySnapshotsList(workspaceId = null, accountId = null) {
    let all = Array.from(this.memorySnapshots.values());
    if (workspaceId) all = all.filter((s) => s.workspace_id === workspaceId);
    if (accountId) all = all.filter((s) => s.customer_success_account_id === accountId);
    return all.sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime());
  }

  _getMemoryActivitiesList(workspaceId = null, accountId = null) {
    let all = Array.from(this.memoryActivities.values());
    if (workspaceId) all = all.filter((a) => a.workspace_id === workspaceId);
    if (accountId) all = all.filter((a) => a.customer_success_account_id === accountId);
    return all.sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime());
  }

  /**
   * Look up underlying CRM lead/account record without modifying it
   */
  _resolveLead(leadId) {
    if (!leadId) return null;
    if (this.crmService && typeof this.crmService._getMemoryLead === 'function') {
      const lead = this.crmService._getMemoryLead(leadId);
      if (lead) return lead;
    }
    return null;
  }

  /**
   * 1. CREATE CUSTOMER SUCCESS ACCOUNT
   * Prevents duplicate customer success profiles for the same lead_id and workspace_id.
   */
  async createAccount(userIdOrOpts, maybeData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeData);
    const {
      userId,
      workspaceId,
      leadId = opts.lead_id,
      accountOwnerId = opts.account_owner_id || opts.userId,
      customerStatus = opts.customer_status || 'active',
      customerSince = opts.customer_since || new Date().toISOString(),
      contractStartDate = opts.contract_start_date || new Date().toISOString(),
      contractEndDate = opts.contract_end_date || null,
      renewalDate = opts.renewal_date || opts.contract_end_date || null,
      contractValue = opts.contract_value,
      currency = opts.currency || 'USD',
      renewalProbability = opts.renewal_probability,
      successObjectives = opts.success_objectives || [],
      lastCustomerReviewAt = opts.last_customer_review_at || null,
    } = opts;

    if (!leadId) {
      throw new Error('leadId is required to create a Customer Success account.');
    }

    if (!CUSTOMER_STATUSES.includes(customerStatus)) {
      throw new Error(`Invalid customer_status "${customerStatus}". Allowed: ${CUSTOMER_STATUSES.join(', ')}`);
    }

    // Check duplicate in workspace
    const existing = this._getMemoryAccountsList(workspaceId).find((a) => a.lead_id === leadId);
    if (existing) {
      throw new Error(`Duplicate customer success profile: Account for lead "${leadId}" already exists in workspace "${workspaceId}".`);
    }

    const lead = this._resolveLead(leadId);
    if (lead && lead.workspace_id && lead.workspace_id !== workspaceId) {
      throw new Error('Forbidden: Cannot create Customer Success account for a lead belonging to another workspace.');
    }

    const resolvedContractValue =
      contractValue !== undefined && contractValue !== null
        ? Number(contractValue)
        : lead && Number(lead.deal_value) > 0
        ? Number(lead.deal_value)
        : 0;

    if (Number.isNaN(resolvedContractValue) || resolvedContractValue < 0) {
      throw new Error('Invalid contract_value: must be a non-negative number.');
    }

    const resolvedProb =
      renewalProbability !== undefined && renewalProbability !== null
        ? Math.min(100, Math.max(0, Number(renewalProbability)))
        : 75;

    const accountId = opts.id || crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const accountRecord = {
      id: accountId,
      workspace_id: workspaceId,
      lead_id: leadId,
      lead_email: opts.leadEmail || opts.lead_email || lead?.email || null,
      lead_name: opts.leadName || opts.lead_name || lead?.name || lead?.company || null,
      account_owner_id: accountOwnerId || userId || null,
      customer_status: customerStatus,
      customer_since: customerSince,
      contract_start_date: contractStartDate,
      contract_end_date: contractEndDate || renewalDate,
      renewal_date: renewalDate || contractEndDate,
      contract_value: resolvedContractValue,
      currency: String(currency || lead?.currency || 'USD').toUpperCase(),
      renewal_probability: resolvedProb,
      health_score: 50,
      health_status: 'Stable',
      success_objectives: Array.isArray(successObjectives) ? successObjectives : [],
      last_customer_review_at: lastCustomerReviewAt,
      created_by: userId || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Perform initial deterministic health calculation
    const healthResult = this.calculateHealthScore(accountRecord, {
      lead,
      activities: [],
      persistSnapshot: true,
    });

    accountRecord.health_score = healthResult.health_score;
    accountRecord.health_status = healthResult.health_status;

    this.memoryAccounts.set(accountId, accountRecord);

    if (this.supabase) {
      try {
        await this.supabase.from('customer_success_accounts').insert(accountRecord);
      } catch (err) {
        console.warn('[CustomerHealthService] Supabase insert warning:', err.message);
      }
    }

    return this._enrichAccount(accountRecord);
  }

  /**
   * 2. UPDATE CUSTOMER SUCCESS ACCOUNT
   */
  async updateAccount(userIdOrOpts, maybeAccountId = null, maybeUpdates = {}) {
    let opts;
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      opts = this._normalizeArgs(userIdOrOpts, maybeUpdates);
      if (maybeAccountId && typeof maybeAccountId === 'string') opts.accountId = maybeAccountId;
    } else {
      opts = this._normalizeArgs(userIdOrOpts, { accountId: maybeAccountId, ...(maybeUpdates || {}) });
    }

    const accountId = opts.accountId || opts.id || maybeAccountId;
    const { workspaceId } = opts;

    const account = this.memoryAccounts.get(accountId);
    if (!account || account.workspace_id !== workspaceId) {
      throw new Error(`Customer Success account "${accountId}" not found in workspace.`);
    }

    const updates = opts.updates || (maybeUpdates && Object.keys(maybeUpdates).length > 0 ? maybeUpdates : opts);

    if (updates.customer_status || updates.customerStatus) {
      const nextStatus = updates.customer_status || updates.customerStatus;
      if (!CUSTOMER_STATUSES.includes(nextStatus)) {
        throw new Error(`Invalid customer_status "${nextStatus}".`);
      }
      account.customer_status = nextStatus;
    }

    if (updates.account_owner_id !== undefined || updates.accountOwnerId !== undefined) {
      account.account_owner_id = updates.account_owner_id ?? updates.accountOwnerId;
    }
    if (updates.contract_start_date !== undefined || updates.contractStartDate !== undefined) {
      account.contract_start_date = updates.contract_start_date ?? updates.contractStartDate;
    }
    if (updates.contract_end_date !== undefined || updates.contractEndDate !== undefined) {
      account.contract_end_date = updates.contract_end_date ?? updates.contractEndDate;
    }
    if (updates.renewal_date !== undefined || updates.renewalDate !== undefined) {
      account.renewal_date = updates.renewal_date ?? updates.renewalDate;
    }
    if (updates.contract_value !== undefined || updates.contractValue !== undefined) {
      const val = Number(updates.contract_value ?? updates.contractValue);
      if (Number.isNaN(val) || val < 0) throw new Error('contract_value must be non-negative.');
      account.contract_value = val;
    }
    if (updates.currency !== undefined) {
      account.currency = String(updates.currency).toUpperCase();
    }
    if (updates.renewal_probability !== undefined || updates.renewalProbability !== undefined) {
      const prob = Number(updates.renewal_probability ?? updates.renewalProbability);
      account.renewal_probability = Math.min(100, Math.max(0, prob));
    }
    if (updates.success_objectives !== undefined || updates.successObjectives !== undefined) {
      account.success_objectives = updates.success_objectives ?? updates.successObjectives;
    }
    if (updates.last_customer_review_at !== undefined || updates.lastCustomerReviewAt !== undefined) {
      account.last_customer_review_at = updates.last_customer_review_at ?? updates.lastCustomerReviewAt;
    }

    account.updated_at = new Date().toISOString();
    this.memoryAccounts.set(accountId, account);

    if (this.supabase) {
      try {
        await this.supabase
          .from('customer_success_accounts')
          .update(account)
          .eq('id', accountId)
          .eq('workspace_id', workspaceId);
      } catch {}
    }

    return this._enrichAccount(account);
  }

  /**
   * 3. GET ACCOUNTS & SINGLE ACCOUNT
   */
  async getAccounts(userIdOrOpts, maybeFilters = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeFilters);
    const { workspaceId, status, healthStatus, ownerId, search } = opts;

    let list = this._getMemoryAccountsList(workspaceId);

    // Auto-seed from Won CRM leads/deals if memory is empty and autoSeed is requested
    if (list.length === 0 && opts.autoSeedFromCrm && this.crmService) {
      const leads = this.crmService._getMemoryLeadsList ? this.crmService._getMemoryLeadsList() : [];
      const wonLeads = leads.filter(
        (l) => (!l.workspace_id || l.workspace_id === workspaceId) && (l.stage === 'Won' || l.status === 'won')
      );
      for (const wl of wonLeads) {
        try {
          await this.createAccount({
            workspaceId,
            userId: wl.user_id || opts.userId,
            leadId: wl.id,
            contractValue: wl.deal_value || 25000,
            currency: wl.currency || 'USD',
            renewalDate: new Date(Date.now() + 86400000 * 60).toISOString(),
          });
        } catch {}
      }
      list = this._getMemoryAccountsList(workspaceId);
    }

    if (status && status !== 'all') {
      list = list.filter((a) => a.customer_status === status);
    }
    if (healthStatus && healthStatus !== 'all') {
      list = list.filter((a) => a.health_status === healthStatus);
    }
    if (ownerId && ownerId !== 'all') {
      list = list.filter((a) => a.account_owner_id === ownerId);
    }

    const enriched = list.map((a) => this._enrichAccount(a));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      return enriched.filter(
        (a) =>
          (a.company && a.company.toLowerCase().includes(q)) ||
          (a.contact_name && a.contact_name.toLowerCase().includes(q)) ||
          (a.industry && a.industry.toLowerCase().includes(q))
      );
    }

    return enriched;
  }

  async getAccountById(userIdOrOpts, maybeAccountId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { accountId: maybeAccountId });
    const accountId = opts.accountId || opts.id || maybeAccountId;
    const { workspaceId } = opts;

    const account = this.memoryAccounts.get(accountId);
    if (!account || account.workspace_id !== workspaceId) {
      throw new Error(`Customer Success account "${accountId}" not found in workspace.`);
    }

    return this._enrichAccount(account);
  }

  _enrichAccount(account) {
    const lead = this._resolveLead(account.lead_id) || {};
    const snapshots = this._getMemorySnapshotsList(account.workspace_id, account.id);
    const latestSnapshot = snapshots[0] || null;
    const activities = this._getMemoryActivitiesList(account.workspace_id, account.id);

    return {
      ...account,
      company: lead.company || account.company || 'Customer Account',
      company_domain: lead.company_domain || lead.website || null,
      contact_name: lead.full_name || lead.name || null,
      contact_email: lead.email || null,
      contact_title: lead.job_title || lead.title || null,
      industry: lead.industry || null,
      location: lead.location || null,
      account_tier: lead.account_tier || 'tier_2',
      territory_id: lead.territory_id || null,
      latest_health: latestSnapshot,
      activities_count: activities.length,
    };
  }

  /**
   * 4. RECORD & SYNC CUSTOMER SUCCESS ACTIVITIES
   * Deduplicates when syncing from existing meetings or call records via (workspace_id, account_id, source, source_record_id).
   */
  async recordActivity(userIdOrOpts, maybeActivityData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeActivityData);
    const {
      userId,
      workspaceId,
      accountId = opts.customer_success_account_id || opts.accountId,
      activityType = opts.activity_type || 'other',
      title,
      description = '',
      activityDate = opts.activity_date || new Date().toISOString(),
      source = 'manual',
      sourceRecordId = opts.source_record_id || null,
    } = opts;

    if (!accountId) {
      throw new Error('customer_success_account_id is required to log activity.');
    }
    const account = this.memoryAccounts.get(accountId);
    if (!account || account.workspace_id !== workspaceId) {
      throw new Error(`Customer Success account "${accountId}" not found in workspace.`);
    }

    if (!ACTIVITY_TYPES.includes(activityType)) {
      throw new Error(`Invalid activity_type "${activityType}".`);
    }
    if (!title || !String(title).trim()) {
      throw new Error('Activity title is required.');
    }

    // Prevent duplicate synced activities
    if (sourceRecordId) {
      const existing = this._getMemoryActivitiesList(workspaceId, accountId).find(
        (act) => act.source === source && act.source_record_id === String(sourceRecordId)
      );
      if (existing) {
        return existing;
      }
    }

    const activityId = crypto.randomUUID();
    const record = {
      id: activityId,
      workspace_id: workspaceId,
      customer_success_account_id: accountId,
      activity_type: activityType,
      title: String(title).trim(),
      description,
      activity_date: activityDate,
      source,
      source_record_id: sourceRecordId ? String(sourceRecordId) : null,
      created_by: userId || null,
      created_at: new Date().toISOString(),
    };

    this.memoryActivities.set(activityId, record);

    if (activityType === 'review') {
      account.last_customer_review_at = activityDate;
      this.memoryAccounts.set(accountId, account);
    }

    if (this.supabase) {
      try {
        await this.supabase.from('customer_success_activities').insert(record);
      } catch {}
    }

    return record;
  }

  /**
   * Get unified Customer Success timeline (merges CS activities + synced meetings + calls for the underlying lead)
   */
  async getAccountTimeline(userIdOrOpts, maybeAccountId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { accountId: maybeAccountId });
    const accountId = opts.accountId || opts.id || maybeAccountId;
    const { workspaceId } = opts;

    const account = this.memoryAccounts.get(accountId);
    if (!account || account.workspace_id !== workspaceId) {
      throw new Error(`Customer Success account "${accountId}" not found in workspace.`);
    }

    // Sync from meetings and calls if available
    await this._syncFromMeetingsAndCalls(account);

    const activities = this._getMemoryActivitiesList(workspaceId, accountId);
    return activities;
  }

  async _syncFromMeetingsAndCalls(account) {
    if (!account || !account.lead_id) return;

    // 1. Sync from meetingService
    if (this.meetingService && this.meetingService.memoryMeetings) {
      const meetings = Array.from(this.meetingService.memoryMeetings.values()).filter(
        (m) => m.lead_id === account.lead_id
      );
      for (const m of meetings) {
        await this.recordActivity({
          workspaceId: account.workspace_id,
          userId: account.account_owner_id,
          accountId: account.id,
          activityType: 'meeting',
          title: m.title || 'Scheduled Customer Meeting',
          description: `Meeting status: ${m.status}${m.outcome ? ` (${m.outcome})` : ''}`,
          activityDate: m.start_time || m.created_at,
          source: 'meeting_scheduler',
          sourceRecordId: m.id,
        });
      }
    }

    // 2. Sync from salesCallService
    if (this.salesCallService && this.salesCallService.memoryCalls) {
      const calls = Array.from(this.salesCallService.memoryCalls.values()).filter(
        (c) => c.lead_id === account.lead_id
      );
      for (const c of calls) {
        await this.recordActivity({
          workspaceId: account.workspace_id,
          userId: account.account_owner_id,
          accountId: account.id,
          activityType: 'call',
          title: c.title || 'Customer Call Recording',
          description: c.summary || 'Analyzed conversation recording',
          activityDate: c.call_date || c.created_at,
          source: 'call_intelligence',
          sourceRecordId: c.id,
        });
      }
    }
  }

  /**
   * 5. DETERMINISTIC CUSTOMER HEALTH SCORING ENGINE (v1.0.0)
   *
   * Dimensions (Max 100):
   * 1. Product or relationship engagement: 25 pts
   * 2. Meeting and communication activity: 20 pts
   * 3. Renewal readiness: 20 pts
   * 4. Contract and commercial stability: 15 pts
   * 5. Success objective progress: 10 pts
   * 6. Data completeness: 10 pts
   */
  calculateHealthScore(account, context = {}) {
    if (!account) {
      throw new Error('Customer Success account is required for health calculation.');
    }

    const lead = context.lead !== undefined ? context.lead : this._resolveLead(account.lead_id);
    const activities =
      context.activities !== undefined
        ? context.activities
        : this._getMemoryActivitiesList(account.workspace_id, account.id);
    const callInsights = context.callInsights || [];
    const meetings = context.meetings || [];

    const positiveSignals = [];
    const riskSignals = [];
    const missingData = [];

    // Support telemetry integration
    let supportTickets = context.supportTickets || [];
    if (!context.supportTickets && this.supportTicketService && this.supportTicketService.memoryTickets) {
      supportTickets = Array.from(this.supportTicketService.memoryTickets.values()).filter(
        (t) => t.customer_success_account_id === account.id || (account.lead_id && t.lead_id === account.lead_id)
      );
    }

    const isSupportConnected =
      context.supportSystemConnected === true ||
      Boolean(this.supportTicketService) ||
      supportTickets.length > 0;

    // Explicitly report unconnected product usage and support ticket systems as unavailable
    if (context.productUsageConnected !== true) {
      missingData.push('Live product usage telemetry not connected (scored strictly on relationship engagement)');
    }
    if (!isSupportConnected) {
      missingData.push('External support ticket system not connected');
    }

    // --- DIMENSION 1: DATA COMPLETENESS (Max 10 pts) ---
    let dataCompletenessPts = 0;
    const hasContractValue = account.contract_value !== null && account.contract_value !== undefined && Number(account.contract_value) > 0;
    const hasRenewalDate = Boolean(account.renewal_date || account.contract_end_date);
    const hasOwner = Boolean(account.account_owner_id);
    const hasObjectives = Array.isArray(account.success_objectives) && account.success_objectives.length > 0;
    const hasContactOrLead = Boolean(lead && (lead.company || lead.email));

    if (hasContractValue) dataCompletenessPts += 2;
    else missingData.push('Contract value is missing or zero');

    if (hasRenewalDate) dataCompletenessPts += 2;
    else missingData.push('Contract renewal / end date is missing');

    if (hasOwner) dataCompletenessPts += 2;
    else missingData.push('Account owner is unassigned');

    if (hasObjectives) dataCompletenessPts += 2;
    else missingData.push('Customer success objectives not defined');

    if (hasContactOrLead) dataCompletenessPts += 2;
    else missingData.push('Primary CRM contact / company details unavailable');

    // Check if critically insufficient evidence exists
    const isInsufficientData =
      context.forceInsufficientData === true ||
      (!hasContractValue && !hasRenewalDate && !hasObjectives && activities.length === 0 && !lead);

    // --- DIMENSION 2: PRODUCT OR RELATIONSHIP ENGAGEMENT (Max 25 pts) ---
    let engagementPts = 0;
    const now = Date.now();
    const lastActivityDate =
      activities[0]?.activity_date || lead?.last_activity_at || account.last_customer_review_at || null;
    const daysSinceLastActivity = lastActivityDate
      ? Math.max(0, Math.floor((now - new Date(lastActivityDate).getTime()) / 86400000))
      : null;

    if (account.customer_status === 'churned') {
      engagementPts = 0;
      riskSignals.push('Account status is marked as churned');
    } else if (daysSinceLastActivity === null) {
      engagementPts = 5;
      missingData.push('No recorded relationship touchpoints or activity timestamps');
    } else if (daysSinceLastActivity <= 14) {
      engagementPts += 15;
      positiveSignals.push(`Active relationship touchpoint within ${daysSinceLastActivity} days`);
    } else if (daysSinceLastActivity <= 30) {
      engagementPts += 10;
    } else if (daysSinceLastActivity <= 60) {
      engagementPts += 5;
      riskSignals.push(`No customer engagement logged in ${daysSinceLastActivity} days`);
    } else {
      engagementPts += 0;
      riskSignals.push(`Severe engagement gap: ${daysSinceLastActivity} days since last touchpoint`);
    }

    // Executive business review / check-in bonus
    if (account.last_customer_review_at) {
      const daysSinceReview = Math.floor((now - new Date(account.last_customer_review_at).getTime()) / 86400000);
      if (daysSinceReview <= 90) {
        engagementPts += 10;
        positiveSignals.push('Customer executive review completed within the last 90 days');
      } else {
        engagementPts += 3;
        riskSignals.push(`Last customer review was ${daysSinceReview} days ago (> 90 days)`);
      }
    } else {
      missingData.push('No formal customer business review (QBR/EBR) recorded');
    }
    engagementPts = Math.min(25, Math.max(0, engagementPts));

    // --- DIMENSION 3: MEETING & COMMUNICATION ACTIVITY (Max 20 pts) ---
    let communicationPts = 0;
    const meetingActivities = activities.filter((a) => a.activity_type === 'meeting' || a.activity_type === 'call');
    const replyActivities = activities.filter((a) => a.activity_type === 'email_reply');
    const supportIssues = activities.filter((a) => a.activity_type === 'support_issue');

    const cancelledOrPostponedMeetings = meetings.filter(
      (m) => m.status === 'cancelled' || m.status === 'no_show' || m.rescheduled_count > 1
    );

    if (meetingActivities.length >= 2) {
      communicationPts += 12;
      positiveSignals.push(`${meetingActivities.length} customer meetings/calls recorded`);
    } else if (meetingActivities.length === 1) {
      communicationPts += 8;
    } else if (lead && (lead.stage === 'Won' || lead.status === 'Replied')) {
      communicationPts += 6;
    } else {
      riskSignals.push('No customer meetings or calls recorded');
    }

    if (replyActivities.length > 0 || (lead && lead.status === 'Replied')) {
      communicationPts += 8;
      positiveSignals.push('Responsive two-way communication verified');
    }

    if (cancelledOrPostponedMeetings.length >= 2) {
      communicationPts = Math.max(0, communicationPts - 6);
      riskSignals.push(`${cancelledOrPostponedMeetings.length} postponed or cancelled meetings detected`);
    }

    if (supportIssues.length > 0) {
      communicationPts = Math.max(0, communicationPts - Math.min(8, supportIssues.length * 4));
      riskSignals.push(`${supportIssues.length} support issue(s) logged in activity history`);
    }

    // Direct support ticket telemetry
    const openSupport = supportTickets.filter((t) =>
      ['new', 'open', 'pending', 'waiting_on_customer', 'escalated', 'reopened'].includes(t.status)
    );
    const criticalSupport = openSupport.filter((t) => t.priority === 'critical' || t.is_escalated);
    if (criticalSupport.length > 0) {
      communicationPts = Math.max(0, communicationPts - Math.min(10, criticalSupport.length * 5));
      riskSignals.push(`${criticalSupport.length} open critical or escalated support ticket(s) detected`);
    }

    const breachedTickets = supportTickets.filter((t) =>
      ['breached_response', 'breached_resolution', 'breached_both'].includes(t.sla_status)
    );
    if (breachedTickets.length > 0) {
      riskSignals.push(`${breachedTickets.length} support ticket(s) breached SLA response or resolution deadlines`);
    }

    const ratedTickets = supportTickets.filter((t) => t.satisfaction_rating !== null && t.satisfaction_rating !== undefined);
    if (ratedTickets.length > 0) {
      const avgCsat = ratedTickets.reduce((acc, t) => acc + Number(t.satisfaction_rating), 0) / ratedTickets.length;
      if (avgCsat >= 4.0) {
        positiveSignals.push(`Support customer satisfaction rated ${avgCsat.toFixed(1)}/5`);
      } else if (avgCsat < 3.0) {
        riskSignals.push(`Low support customer satisfaction rating of ${avgCsat.toFixed(1)}/5`);
      }
    }

    // Unresolved objections from call intelligence
    const unresolvedObjections = callInsights.filter((ci) => ci.unresolvedObjections > 0 || ci.sentiment === 'negative');
    if (unresolvedObjections.length > 0) {
      communicationPts = Math.max(0, communicationPts - 6);
      riskSignals.push('Unresolved objections or negative sentiment identified in call transcripts');
    }

    communicationPts = Math.min(20, Math.max(0, communicationPts));

    // --- DIMENSION 4: RENEWAL READINESS (Max 20 pts) ---
    let renewalReadinessPts = 0;
    const renewalDateStr = account.renewal_date || account.contract_end_date;
    const hasRenewalDiscussion = activities.some((a) => a.activity_type === 'renewal_discussion');

    if (account.customer_status === 'churned') {
      renewalReadinessPts = 0;
    } else if (!renewalDateStr) {
      renewalReadinessPts = 6;
    } else {
      const daysToRenewal = Math.floor((new Date(renewalDateStr).getTime() - now) / 86400000);
      if (daysToRenewal > 90) {
        renewalReadinessPts = 16;
        if (hasRenewalDiscussion) renewalReadinessPts = 20;
      } else if (daysToRenewal >= 30 && daysToRenewal <= 90) {
        if (hasRenewalDiscussion) {
          renewalReadinessPts = 18;
          positiveSignals.push(`Renewal discussion active ahead of renewal in ${daysToRenewal} days`);
        } else {
          renewalReadinessPts = 8;
          riskSignals.push(`Renewal approaching in ${daysToRenewal} days without logged renewal discussion`);
        }
      } else if (daysToRenewal >= 0 && daysToRenewal < 30) {
        if (hasRenewalDiscussion) {
          renewalReadinessPts = 14;
        } else {
          renewalReadinessPts = 3;
          riskSignals.push(`Urgent: Renewal due in ${daysToRenewal} days with no renewal discussion`);
        }
      } else {
        // Past due renewal date
        renewalReadinessPts = 2;
        riskSignals.push(`Renewal date passed ${Math.abs(daysToRenewal)} days ago without closed renewal`);
      }
    }
    renewalReadinessPts = Math.min(20, Math.max(0, renewalReadinessPts));

    // --- DIMENSION 5: CONTRACT & COMMERCIAL STABILITY (Max 15 pts) ---
    let commercialStabilityPts = 0;
    if (account.customer_status === 'churned') {
      commercialStabilityPts = 0;
    } else if (hasContractValue) {
      commercialStabilityPts += 8;
      if (Number(account.renewal_probability) >= 80) {
        commercialStabilityPts += 7;
        positiveSignals.push(`High commercial renewal probability (${account.renewal_probability}%)`);
      } else if (Number(account.renewal_probability) >= 60) {
        commercialStabilityPts += 5;
      } else if (Number(account.renewal_probability) >= 40) {
        commercialStabilityPts += 2;
        riskSignals.push(`Moderate/Low renewal probability (${account.renewal_probability}%)`);
      } else {
        riskSignals.push(`Critical commercial renewal probability (${account.renewal_probability}%)`);
      }
    } else {
      commercialStabilityPts = 3;
    }
    commercialStabilityPts = Math.min(15, Math.max(0, commercialStabilityPts));

    // --- DIMENSION 6: SUCCESS OBJECTIVE PROGRESS (Max 10 pts) ---
    let objectiveProgressPts = 0;
    const objectives = Array.isArray(account.success_objectives) ? account.success_objectives : [];
    if (objectives.length > 0) {
      const completedCount = objectives.filter(
        (o) => o && (o.status === 'completed' || o.completed === true || Number(o.progress) >= 100)
      ).length;
      const inProgressCount = objectives.filter(
        (o) => o && (o.status === 'in_progress' || (Number(o.progress) > 0 && Number(o.progress) < 100))
      ).length;
      const completionRatio = (completedCount + inProgressCount * 0.5) / objectives.length;
      objectiveProgressPts = Math.round(completionRatio * 10);

      if (completedCount === objectives.length) {
        positiveSignals.push(`All ${objectives.length} customer success objectives achieved`);
      } else if (completedCount === 0 && inProgressCount === 0) {
        riskSignals.push(`0 of ${objectives.length} customer success objectives started`);
      }
    } else {
      objectiveProgressPts = 0;
    }
    objectiveProgressPts = Math.min(10, Math.max(0, objectiveProgressPts));

    // --- TOTAL SCORE & BOUNDS [0, 100] ---
    const rawTotal =
      engagementPts +
      communicationPts +
      renewalReadinessPts +
      commercialStabilityPts +
      objectiveProgressPts +
      dataCompletenessPts;

    const healthScore = Math.min(100, Math.max(0, Math.round(rawTotal)));

    // --- HEALTH CATEGORY CLASSIFICATION ---
    let healthStatus = 'Stable';
    if (isInsufficientData) {
      healthStatus = 'Insufficient Data';
    } else if (account.customer_status === 'churned' || healthScore < 40) {
      healthStatus = 'Critical';
    } else if (healthScore < 60) {
      healthStatus = 'At Risk';
    } else if (healthScore < 80) {
      healthStatus = 'Stable';
    } else {
      healthStatus = 'Healthy';
    }

    const componentScores = {
      relationship_engagement: engagementPts,
      meeting_and_communication: communicationPts,
      renewal_readiness: renewalReadinessPts,
      commercial_stability: commercialStabilityPts,
      success_objective_progress: objectiveProgressPts,
      data_completeness: dataCompletenessPts,
    };

    const timestamp = new Date().toISOString();
    const explanation =
      healthStatus === 'Insufficient Data'
        ? `Account has insufficient verified data (${healthScore}/100). Missing critical contract, renewal, and activity records.`
        : `Account scored ${healthScore}/100 (${healthStatus}) via model ${this.modelVersion}: Relationship Engagement (${engagementPts}/25), Communication Activity (${communicationPts}/20), Renewal Readiness (${renewalReadinessPts}/20), Commercial Stability (${commercialStabilityPts}/15), Objective Progress (${objectiveProgressPts}/10), Data Completeness (${dataCompletenessPts}/10).`;

    const result = {
      account_id: account.id,
      workspace_id: account.workspace_id,
      health_score: healthScore,
      healthScore,
      health_status: healthStatus,
      healthCategory: healthStatus,
      component_scores: componentScores,
      componentScores,
      positive_signals: positiveSignals,
      positiveSignals,
      risk_signals: riskSignals,
      negative_signals: riskSignals,
      negativeSignals: riskSignals,
      missing_data: missingData,
      missingData,
      model_version: this.modelVersion,
      modelVersion: this.modelVersion,
      calculated_at: timestamp,
      calculationTimestamp: timestamp,
      explanation,
    };

    if (context.persistSnapshot && account.id) {
      const snapshot = this._createImmutableSnapshot(account, result);
      result.snapshot_id = snapshot.id;
    }

    return result;
  }

  /**
   * AI-assisted narrative explanation wrapper.
   * Guarantee: AI explanations NEVER modify the deterministic numerical score or category.
   */
  generateHealthExplanation(account, deterministicHealthResult, aiNarrativeOverride = null) {
    const base = deterministicHealthResult || this.calculateHealthScore(account);
    const lockedScore = base.health_score;
    const lockedCategory = base.health_status;
    const lockedComponents = { ...base.component_scores };

    const narrative =
      typeof aiNarrativeOverride === 'string' && aiNarrativeOverride.trim().length > 0
        ? aiNarrativeOverride.trim()
        : base.explanation;

    return {
      ...base,
      health_score: lockedScore,
      healthScore: lockedScore,
      health_status: lockedCategory,
      healthCategory: lockedCategory,
      component_scores: lockedComponents,
      ai_explanation: narrative,
      explanation: base.explanation,
    };
  }

  /**
   * Create an IMMUTABLE historical health snapshot.
   * Returned snapshot object is frozen with Object.freeze (including nested arrays/objects)
   * so any attempt to mutate it throws a TypeError in strict mode.
   */
  _createImmutableSnapshot(account, healthResult) {
    const snapshotId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const snapshotRecord = {
      id: snapshotId,
      workspace_id: account.workspace_id || 'default-workspace',
      customer_success_account_id: account.id,
      health_score: healthResult.health_score,
      health_status: healthResult.health_status,
      component_scores: Object.freeze({ ...healthResult.component_scores }),
      positive_signals: Object.freeze([...healthResult.positive_signals]),
      risk_signals: Object.freeze([...healthResult.risk_signals]),
      missing_data: Object.freeze([...healthResult.missing_data]),
      model_version: this.modelVersion,
      snapshot_date: nowIso,
      created_at: nowIso,
    };

    const frozenSnapshot = Object.freeze(snapshotRecord);
    this.memorySnapshots.set(snapshotId, frozenSnapshot);

    if (this.supabase) {
      this.supabase
        .from('customer_health_snapshots')
        .insert(snapshotRecord)
        .then(() => {})
        .catch(() => {});
    }

    return frozenSnapshot;
  }

  /**
   * Prevent updating or deleting health snapshots programmatically
   */
  async updateHealthSnapshot() {
    throw new Error('Immutable Violation: customer_health_snapshots cannot be modified after creation.');
  }

  async deleteHealthSnapshot() {
    throw new Error('Immutable Violation: customer_health_snapshots cannot be deleted after creation.');
  }

  /**
   * 6. RECALCULATE ACCOUNT HEALTH & RECORD NEW SNAPSHOT
   */
  async recalculateAccountHealth(userIdOrOpts, maybeAccountId = null, context = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, { accountId: maybeAccountId });
    const accountId = opts.accountId || opts.id || maybeAccountId;
    const { workspaceId } = opts;

    const account = this.memoryAccounts.get(accountId);
    if (!account || account.workspace_id !== workspaceId) {
      throw new Error(`Customer Success account "${accountId}" not found in workspace.`);
    }

    await this._syncFromMeetingsAndCalls(account);
    const activities = this._getMemoryActivitiesList(workspaceId, accountId);
    const lead = this._resolveLead(account.lead_id);

    const healthResult = this.calculateHealthScore(account, {
      ...context,
      lead,
      activities,
      persistSnapshot: true,
    });

    account.health_score = healthResult.health_score;
    account.health_status = healthResult.health_status;
    account.updated_at = new Date().toISOString();
    this.memoryAccounts.set(accountId, account);

    return healthResult;
  }

  /**
   * 7. GET CURRENT HEALTH & HISTORICAL SNAPSHOTS
   */
  async getAccountHealth(userIdOrOpts, maybeAccountId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { accountId: maybeAccountId });
    const accountId = opts.accountId || opts.id || maybeAccountId;
    const { workspaceId } = opts;

    const account = this.memoryAccounts.get(accountId);
    if (!account || account.workspace_id !== workspaceId) {
      throw new Error(`Customer Success account "${accountId}" not found in workspace.`);
    }

    const activities = this._getMemoryActivitiesList(workspaceId, accountId);
    const lead = this._resolveLead(account.lead_id);

    return this.calculateHealthScore(account, {
      lead,
      activities,
      persistSnapshot: false,
    });
  }

  async getHealthHistory(userIdOrOpts, maybeAccountId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { accountId: maybeAccountId });
    const accountId = opts.accountId || opts.id || maybeAccountId;
    const { workspaceId } = opts;

    const account = this.memoryAccounts.get(accountId);
    if (!account || account.workspace_id !== workspaceId) {
      throw new Error(`Customer Success account "${accountId}" not found in workspace.`);
    }

    return this._getMemorySnapshotsList(workspaceId, accountId);
  }
}
