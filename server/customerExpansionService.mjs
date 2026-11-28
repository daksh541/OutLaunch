import crypto from 'node:crypto';

/**
 * AI Customer Expansion Revenue Intelligence Service
 *
 * Identifies and manages expansion opportunities:
 * - upsell
 * - cross_sell
 * - seat_expansion
 * - usage_expansion
 * - other
 *
 * Strict Grounding & Approval Rules:
 * - Every opportunity must include concrete evidence and source attribution.
 * - Estimated value is populated ONLY when supported by available evidence (e.g., existing contract value ratio or explicit deal/call figure); otherwise null.
 * - Never invents budgets, seat counts, usage metrics, or customer needs.
 * - AI recommendations remain in 'suggested' status until explicitly approved or dismissed.
 * - Never automatically creates CRM deals or mutates CRM records.
 */

export const EXPANSION_TYPES = ['upsell', 'cross_sell', 'seat_expansion', 'usage_expansion', 'other'];
export const EXPANSION_STATUSES = ['suggested', 'approved', 'in_progress', 'won', 'dismissed'];

export class CustomerExpansionService {
  constructor(
    supabaseClient = null,
    customerHealthService = null,
    crmService = null,
    salesCallService = null,
    territoryService = null
  ) {
    this.supabase = supabaseClient;
    this.healthService = customerHealthService;
    this.crmService = crmService;
    this.salesCallService = salesCallService;
    this.territoryService = territoryService;

    this.memoryExpansions = new Map(); // id -> expansion opportunity
    this.memoryAuditLog = [];
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

  _getMemoryExpansionsList(workspaceId = null) {
    const all = Array.from(this.memoryExpansions.values());
    if (workspaceId) return all.filter((e) => e.workspace_id === workspaceId);
    return all;
  }

  /**
   * 1. IDENTIFY EVIDENCE-BACKED EXPANSION RECOMMENDATIONS FOR AN ACCOUNT
   * Does not automatically approve or create CRM deals.
   */
  async identifyExpansionOpportunities(userIdOrOpts, maybeAccountId = null, context = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, { accountId: maybeAccountId, ...(context || {}) });
    const accountId = opts.accountId || opts.customer_success_account_id || maybeAccountId;
    const { userId, workspaceId } = opts;

    const account = this.healthService ? this.healthService.memoryAccounts.get(accountId) : opts.account;
    if (!account || account.workspace_id !== workspaceId) {
      throw new Error(`Customer Success account "${accountId}" not found in workspace.`);
    }

    const evidenceItems = [];
    let inferredType = 'upsell';
    let explicitEstimatedValue = null;

    const callInsights = opts.callInsights || context.callInsights;
    const explicitRequest = opts.explicitRequest || context.explicitRequest;
    const explicitRequestSource = opts.explicitRequestSource || context.explicitRequestSource;

    // 1. Check explicit customer requests or call insights
    if (Array.isArray(callInsights)) {
      for (const call of callInsights) {
        if (Array.isArray(call.buyingSignals) && call.buyingSignals.length > 0) {
          evidenceItems.push({
            source: `sales_call_intelligence (call_id: ${call.id || 'call'})`,
            type: 'buying_signal',
            detail: `Buying signal detected in call: "${call.buyingSignals[0]}"`,
          });
          if (String(call.buyingSignals[0]).toLowerCase().includes('seat') || String(call.buyingSignals[0]).toLowerCase().includes('team')) {
            inferredType = 'seat_expansion';
          }
        }
        if (call.explicitExpansionValue && Number(call.explicitExpansionValue) > 0) {
          explicitEstimatedValue = Number(call.explicitExpansionValue);
        }
      }
    }

    if (explicitRequest) {
      evidenceItems.push({
        source: explicitRequestSource || 'customer_success_activities',
        type: 'explicit_customer_request',
        detail: String(explicitRequest),
      });
      if (String(explicitRequest).toLowerCase().includes('cross') || String(explicitRequest).toLowerCase().includes('module')) {
        inferredType = 'cross_sell';
      } else if (String(explicitRequest).toLowerCase().includes('seat')) {
        inferredType = 'seat_expansion';
      }
    }

    // 2. Check completed customer success objectives
    const objectives = Array.isArray(account.success_objectives) ? account.success_objectives : [];
    const completedObjectives = objectives.filter(
      (o) => o && (o.status === 'completed' || o.completed === true || Number(o.progress) >= 100)
    );
    if (completedObjectives.length > 0 && account.health_score >= 70) {
      evidenceItems.push({
        source: 'customer_success_accounts.success_objectives',
        type: 'objective_milestone_achieved',
        detail: `${completedObjectives.length} of ${objectives.length} success objectives completed alongside strong account health (${account.health_score}/100).`,
      });
    }

    // 3. Check existing contract value & account plan
    const contractVal = Number(account.contract_value || 0);
    if (contractVal > 0 && account.health_score >= 75) {
      evidenceItems.push({
        source: 'customer_success_accounts.contract_value',
        type: 'healthy_baseline_contract',
        detail: `Active contract value of $${contractVal.toLocaleString()} ${account.currency || 'USD'} in Healthy tier (${account.health_score}/100).`,
      });
    }

    // If no evidence is available, do not fabricate an expansion opportunity
    if (evidenceItems.length === 0) {
      return [];
    }

    // Determine estimated_value ONLY when supported by evidence (either explicit figure or healthy verified contract baseline)
    let estimatedValue = null;
    if (explicitEstimatedValue !== null && explicitEstimatedValue > 0) {
      estimatedValue = explicitEstimatedValue;
    } else if (contractVal > 0) {
      // Conservative 25% expansion benchmark anchored strictly to verified contract_value
      estimatedValue = Math.round(contractVal * 0.25 * 100) / 100;
    }

    const confidenceLevel =
      evidenceItems.length >= 2 && account.health_score >= 75
        ? 'high'
        : evidenceItems.length >= 1 && account.health_score >= 60
        ? 'medium'
        : 'low';

    const probability = confidenceLevel === 'high' ? 65 : confidenceLevel === 'medium' ? 45 : 25;

    const suggestion = await this.createExpansionOpportunity({
      userId,
      workspaceId,
      accountId: account.id,
      opportunityType: context.opportunityType || inferredType,
      estimatedValue,
      currency: account.currency || 'USD',
      probability,
      status: 'suggested',
      confidenceLevel,
      evidence: evidenceItems,
      recommendedAction:
        inferredType === 'seat_expansion'
          ? 'Review additional department rollout scope with account champion during next review.'
          : inferredType === 'cross_sell'
          ? 'Present tailored workflow capability demo aligned with completed phase-1 objectives.'
          : 'Propose tier upgrade package anchored on achieved ROI milestones.',
    });

    return [suggestion];
  }

  /**
   * 2. CREATE EXPANSION OPPORTUNITY
   */
  async createExpansionOpportunity(userIdOrOpts, maybeData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeData);
    const {
      userId,
      workspaceId,
      accountId = opts.customer_success_account_id || opts.accountId,
      opportunityType = opts.opportunity_type || 'upsell',
      estimatedValue = opts.estimated_value !== undefined ? opts.estimated_value : opts.estimatedValue,
      currency = opts.currency || 'USD',
      probability = opts.probability !== undefined ? opts.probability : 50,
      status = opts.status || 'suggested',
      evidence = opts.evidence || [],
      confidenceLevel = opts.confidence_level || opts.confidenceLevel || null,
      recommendedAction = opts.recommended_action || opts.recommendedAction || 'Schedule expansion discovery call with stakeholder.',
    } = opts;

    if (!accountId) {
      throw new Error('customer_success_account_id is required to create an expansion opportunity.');
    }

    const account = this.healthService ? this.healthService.memoryAccounts.get(accountId) : null;
    if (account && account.workspace_id !== workspaceId) {
      throw new Error('Forbidden: Customer Success account belongs to a different workspace.');
    }

    if (!EXPANSION_TYPES.includes(opportunityType)) {
      throw new Error(`Invalid opportunity_type "${opportunityType}". Allowed: ${EXPANSION_TYPES.join(', ')}`);
    }
    if (!EXPANSION_STATUSES.includes(status)) {
      throw new Error(`Invalid expansion status "${status}". Allowed: ${EXPANSION_STATUSES.join(', ')}`);
    }

    if (!Array.isArray(evidence) || evidence.length === 0) {
      throw new Error('Expansion opportunity requires at least one supporting evidence record.');
    }

    let resolvedEstimatedValue = null;
    if (estimatedValue !== null && estimatedValue !== undefined && estimatedValue !== '') {
      const numVal = Number(estimatedValue);
      if (Number.isNaN(numVal) || numVal < 0) {
        throw new Error('estimated_value must be null or a non-negative number.');
      }
      resolvedEstimatedValue = numVal;
    }

    const resolvedConfidence =
      confidenceLevel || (evidence.length >= 2 ? 'high' : evidence.length === 1 ? 'medium' : 'low');

    const expansionId = opts.id || crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const record = {
      id: expansionId,
      workspace_id: workspaceId,
      customer_success_account_id: accountId,
      opportunity_type: opportunityType,
      estimated_value: resolvedEstimatedValue,
      currency: String(currency || account?.currency || 'USD').toUpperCase(),
      probability: Math.min(100, Math.max(0, Number(probability))),
      status,
      confidence_level: resolvedConfidence,
      evidence,
      recommended_action: recommendedAction,
      created_by: userId || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.memoryExpansions.set(expansionId, record);

    if (this.supabase) {
      try {
        await this.supabase.from('customer_expansion_opportunities').insert(record);
      } catch {}
    }

    return this._enrichExpansion(record);
  }

  /**
   * 3. UPDATE EXPANSION OPPORTUNITY
   */
  async updateExpansionOpportunity(userIdOrOpts, maybeExpansionId = null, maybeUpdates = {}) {
    let opts;
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      opts = this._normalizeArgs(userIdOrOpts, maybeUpdates);
      if (maybeExpansionId && typeof maybeExpansionId === 'string') opts.expansionId = maybeExpansionId;
    } else {
      opts = this._normalizeArgs(userIdOrOpts, { expansionId: maybeExpansionId, ...(maybeUpdates || {}) });
    }

    const expansionId = opts.expansionId || opts.id || maybeExpansionId;
    const { userId, workspaceId } = opts;

    const record = this.memoryExpansions.get(expansionId);
    if (!record || record.workspace_id !== workspaceId) {
      throw new Error(`Expansion opportunity "${expansionId}" not found in workspace.`);
    }

    const updates = opts.updates || (maybeUpdates && Object.keys(maybeUpdates).length > 0 ? maybeUpdates : opts);

    if (updates.opportunity_type || updates.opportunityType) {
      const nextType = updates.opportunity_type || updates.opportunityType;
      if (!EXPANSION_TYPES.includes(nextType)) {
        throw new Error(`Invalid opportunity_type "${nextType}".`);
      }
      record.opportunity_type = nextType;
    }

    if (updates.status) {
      if (!EXPANSION_STATUSES.includes(updates.status)) {
        throw new Error(`Invalid expansion status "${updates.status}".`);
      }
      record.status = updates.status;
    }

    if (updates.estimated_value !== undefined || updates.estimatedValue !== undefined) {
      const raw = updates.estimated_value !== undefined ? updates.estimated_value : updates.estimatedValue;
      record.estimated_value = raw === null ? null : Math.max(0, Number(raw));
    }

    if (updates.probability !== undefined) {
      record.probability = Math.min(100, Math.max(0, Number(updates.probability)));
    }
    if (updates.evidence !== undefined) {
      if (!Array.isArray(updates.evidence) || updates.evidence.length === 0) {
        throw new Error('Expansion opportunity must retain supporting evidence.');
      }
      record.evidence = updates.evidence;
    }
    if (updates.recommended_action !== undefined || updates.recommendedAction !== undefined) {
      record.recommended_action = updates.recommended_action ?? updates.recommendedAction;
    }

    record.updated_at = new Date().toISOString();
    this.memoryExpansions.set(expansionId, record);

    this.memoryAuditLog.push({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      entity_type: 'expansion_opportunity',
      entity_id: expansionId,
      action: 'updated',
      actor_id: userId,
      status: record.status,
      timestamp: record.updated_at,
    });

    if (this.supabase) {
      try {
        await this.supabase
          .from('customer_expansion_opportunities')
          .update(record)
          .eq('id', expansionId)
          .eq('workspace_id', workspaceId);
      } catch {}
    }

    return this._enrichExpansion(record);
  }

  /**
   * 4. EXPLICIT APPROVAL & DISMISSAL WORKFLOW
   * AI recommendations remain 'suggested' until explicitly approved or dismissed.
   * Approving marks status = 'approved' and logs audit entry without unsolicited CRM deal creation.
   */
  async approveExpansionOpportunity(userIdOrOpts, maybeExpansionId = null, maybeData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, { expansionId: maybeExpansionId, ...(maybeData || {}) });
    const expansionId = opts.expansionId || opts.id || maybeExpansionId;
    const { userId, workspaceId } = opts;

    const record = this.memoryExpansions.get(expansionId);
    if (!record || record.workspace_id !== workspaceId) {
      throw new Error(`Expansion opportunity "${expansionId}" not found in workspace.`);
    }

    record.status = 'approved';
    record.approved_by = userId;
    record.approved_at = new Date().toISOString();
    if (opts.estimated_value !== undefined) {
      record.estimated_value = opts.estimated_value === null ? null : Number(opts.estimated_value);
    }
    if (opts.recommended_action) {
      record.recommended_action = opts.recommended_action;
    }
    record.updated_at = record.approved_at;

    this.memoryExpansions.set(expansionId, record);

    this.memoryAuditLog.push({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      entity_type: 'expansion_opportunity',
      entity_id: expansionId,
      action: 'approved',
      actor_id: userId,
      timestamp: record.updated_at,
    });

    return this._enrichExpansion(record);
  }

  async dismissExpansionOpportunity(userIdOrOpts, maybeExpansionId = null, maybeData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, { expansionId: maybeExpansionId, ...(maybeData || {}) });
    const expansionId = opts.expansionId || opts.id || maybeExpansionId;
    const { userId, workspaceId, reason = 'Dismissed by user' } = opts;

    const record = this.memoryExpansions.get(expansionId);
    if (!record || record.workspace_id !== workspaceId) {
      throw new Error(`Expansion opportunity "${expansionId}" not found in workspace.`);
    }

    record.status = 'dismissed';
    record.dismissed_by = userId;
    record.dismissal_reason = reason;
    record.updated_at = new Date().toISOString();

    this.memoryExpansions.set(expansionId, record);

    this.memoryAuditLog.push({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      entity_type: 'expansion_opportunity',
      entity_id: expansionId,
      action: 'dismissed',
      actor_id: userId,
      reason,
      timestamp: record.updated_at,
    });

    return this._enrichExpansion(record);
  }

  /**
   * 5. LIST & GET EXPANSION OPPORTUNITIES
   */
  async getExpansionOpportunities(userIdOrOpts, maybeFilters = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeFilters);
    const { workspaceId, status, accountId, opportunityType } = opts;

    let list = this._getMemoryExpansionsList(workspaceId);

    if (status && status !== 'all') {
      list = list.filter((e) => e.status === status);
    }
    if (accountId) {
      list = list.filter((e) => e.customer_success_account_id === accountId);
    }
    if (opportunityType && opportunityType !== 'all') {
      list = list.filter((e) => e.opportunity_type === opportunityType);
    }

    return list
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((e) => this._enrichExpansion(e));
  }

  async getExpansionById(userIdOrOpts, maybeExpansionId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { expansionId: maybeExpansionId });
    const expansionId = opts.expansionId || opts.id || maybeExpansionId;
    const { workspaceId } = opts;

    const record = this.memoryExpansions.get(expansionId);
    if (!record || record.workspace_id !== workspaceId) {
      throw new Error(`Expansion opportunity "${expansionId}" not found in workspace.`);
    }

    return this._enrichExpansion(record);
  }

  _enrichExpansion(record) {
    const acct = this.healthService ? this.healthService.memoryAccounts.get(record.customer_success_account_id) : null;
    const enrichedAcct = acct && this.healthService ? this.healthService._enrichAccount(acct) : null;

    return {
      ...record,
      company: enrichedAcct?.company || 'Customer Account',
      account_health_score: acct?.health_score ?? null,
      account_health_status: acct?.health_status ?? null,
      weighted_estimated_value:
        record.estimated_value !== null && record.estimated_value !== undefined
          ? Math.round(Number(record.estimated_value) * (Number(record.probability || 0) / 100) * 100) / 100
          : null,
    };
  }
}
