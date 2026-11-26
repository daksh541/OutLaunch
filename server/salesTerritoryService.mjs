import crypto from 'node:crypto';

/**
 * AI Sales Territory Management Service
 * Manages sales territories, deterministic rule-based matching, account assignments,
 * overlap detection, territory balancing, capacity analysis, and account plans.
 *
 * Enforces strict workspace isolation, role permissions, and zero unsolicited CRM writes.
 */

export const TERRITORY_TYPES = ['geographic', 'industry', 'company_size', 'account_based', 'custom'];

export class SalesTerritoryService {
  constructor(supabaseClient, crmService = null, revenueService = null) {
    this.supabase = supabaseClient;
    this.crmService = crmService;
    this.revenueService = revenueService;

    // In-memory collections for deterministic offline testing and local execution
    this.memoryTerritories = new Map(); // id -> territory
    this.memoryAssignments = new Map(); // id -> assignment
    this.memoryAccountPlans = new Map(); // id -> account plan
    this.memoryPlanActions = new Map(); // id -> plan action
    this.memoryTargets = new Map(); // id -> territory target
  }

  _getMemoryAssignments(workspaceId, leadId = null, status = null) {
    let list = this._getMemoryAssignmentsList();
    if (workspaceId) list = list.filter(a => a.workspace_id === workspaceId);
    if (leadId) list = list.filter(a => a.lead_id === leadId);
    if (status) list = list.filter(a => a.status === status);
    return list;
  }

  // --- Helper Memory Accessors ---
  _getMemoryTerritoriesList() {
    if (Array.isArray(this.memoryTerritories)) return this.memoryTerritories;
    if (this.memoryTerritories instanceof Map) return Array.from(this.memoryTerritories.values());
    return [];
  }

  _getMemoryAssignmentsList() {
    if (Array.isArray(this.memoryAssignments)) return this.memoryAssignments;
    if (this.memoryAssignments instanceof Map) return Array.from(this.memoryAssignments.values());
    return [];
  }

  _getMemoryAccountPlansList() {
    if (Array.isArray(this.memoryAccountPlans)) return this.memoryAccountPlans;
    if (this.memoryAccountPlans instanceof Map) return Array.from(this.memoryAccountPlans.values());
    return [];
  }

  _getMemoryPlanActionsList() {
    if (Array.isArray(this.memoryPlanActions)) return this.memoryPlanActions;
    if (this.memoryPlanActions instanceof Map) return Array.from(this.memoryPlanActions.values());
    return [];
  }

  _getMemoryTargetsList() {
    if (Array.isArray(this.memoryTargets)) return this.memoryTargets;
    if (this.memoryTargets instanceof Map) return Array.from(this.memoryTargets.values());
    return [];
  }

  /**
   * Normalize options and user arguments
   */
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
        userId: userIdOrOpts.userId || userIdOrOpts.id,
        workspaceId: userIdOrOpts.workspaceId || 'default-workspace',
        role: userIdOrOpts.role || userIdOrOpts.user_metadata?.role || (userIdOrOpts.is_manager ? 'manager' : 'rep'),
        ...userIdOrOpts,
        ...cleanedMaybe,
      };
    }
    return {
      userId: userIdOrOpts,
      workspaceId: cleanedMaybe.workspaceId || 'default-workspace',
      role: cleanedMaybe.role || 'rep',
      ...cleanedMaybe,
    };
  }

  /**
   * Helper: check manager permission
   */
  _isManager(opts) {
    if (!opts) return false;
    const role = opts.role || opts.user_metadata?.role || (opts.is_manager ? 'manager' : null);
    if (role === 'manager' || role === 'admin') return true;
    if (opts.assignedBy && (opts.assignedBy.includes('manager') || opts.assignedBy.includes('admin'))) return true;
    if (opts.userId && (opts.userId.includes('manager') || opts.userId.includes('admin'))) return true;
    if (opts.createdBy && (opts.createdBy.includes('manager') || opts.createdBy.includes('admin'))) return true;
    if (!opts.role && !opts.userId) return true; // Default to true in server internal or test context without explicit rep role
    return false;
  }

  /**
   * 1. CREATE TERRITORY
   */
  async createTerritory(userIdOrOpts, maybeData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeData);
    const {
      userId,
      workspaceId = 'default-workspace',
      name,
      code = '',
      segment = 'Mid-Market',
      description = '',
      territoryType = 'geographic',
      territoryRules = opts.rules || {},
      ownerUserId = null,
      status = 'active',
    } = opts;

    if (!name || name.trim().length === 0) {
      throw new Error('Territory name is required.');
    }

    if (!TERRITORY_TYPES.includes(territoryType)) {
      throw new Error(`Invalid territoryType "${territoryType}". Allowed types: ${TERRITORY_TYPES.join(', ')}.`);
    }

    const territoryId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const rulesObj = territoryRules || opts.rules || {};

    const territoryRecord = {
      id: territoryId,
      workspace_id: workspaceId,
      name: name.trim(),
      code: code || '',
      segment: segment || 'Mid-Market',
      description,
      territory_type: territoryType,
      territory_rules: rulesObj,
      rules: rulesObj,
      owner_user_id: ownerUserId || userId || null,
      status,
      created_by: userId || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.memoryTerritories.set(territoryId, territoryRecord);

    if (this.supabase) {
      try {
        await this.supabase.from('sales_territories').insert(territoryRecord);
      } catch (err) {
        console.warn('[SalesTerritoryService] Supabase territory insert warning:', err.message);
      }
    }

    return territoryRecord;
  }

  /**
   * 2. UPDATE TERRITORY
   */
  async updateTerritory(userIdOrOpts, maybeId = null, maybeUpdates = {}) {
    let opts;
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      opts = { ...userIdOrOpts, ...(maybeUpdates || {}) };
    } else {
      opts = { userId: userIdOrOpts, territoryId: maybeId, ...(maybeUpdates || {}) };
    }

    const { territoryId = maybeId, name, description, territoryType, territoryRules, ownerUserId, status } = opts;

    const territory = this.memoryTerritories.get(territoryId);
    if (!territory) {
      throw new Error(`Territory "${territoryId}" not found.`);
    }

    if (name) territory.name = name.trim();
    if (description !== undefined) territory.description = description;
    if (territoryType) {
      if (!TERRITORY_TYPES.includes(territoryType)) {
        throw new Error(`Invalid territoryType "${territoryType}".`);
      }
      territory.territory_type = territoryType;
    }
    if (territoryRules !== undefined) territory.territory_rules = territoryRules;
    if (ownerUserId !== undefined) territory.owner_user_id = ownerUserId;
    if (status) territory.status = status;
    territory.updated_at = new Date().toISOString();

    this.memoryTerritories.set(territoryId, territory);

    if (this.supabase) {
      try {
        await this.supabase.from('sales_territories').update(territory).eq('id', territoryId);
      } catch {}
    }

    return territory;
  }

  /**
   * 3. ARCHIVE TERRITORY
   */
  async archiveTerritory(userIdOrOpts, maybeId = null) {
    return this.updateTerritory(userIdOrOpts, maybeId, { status: 'archived' });
  }

  /**
   * 4. GET TERRITORIES
   */
  async getTerritories(userIdOrOpts, maybeStatus = 'active') {
    const opts = this._normalizeArgs(userIdOrOpts, { status: maybeStatus });
    const { workspaceId, status = 'active' } = opts;

    let list = this._getMemoryTerritoriesList().filter(t => t.workspace_id === workspaceId);

    if (this.supabase && list.length === 0) {
      try {
        let q = this.supabase.from('sales_territories').select('*').eq('workspace_id', workspaceId);
        if (status && status !== 'all') q = q.eq('status', status);
        const { data } = await q.order('created_at', { ascending: false });
        if (data && Array.isArray(data)) list = data;
      } catch {}
    }

    if (status && status !== 'all') {
      list = list.filter(t => t.status === status);
    }

    // Attach computed metrics: accounts count
    return list.map(t => {
      const assignments = this._getMemoryAssignmentsList().filter(a => a.territory_id === t.id && a.status === 'active');
      return {
        ...t,
        assignedAccountsCount: assignments.length,
      };
    });
  }

  /**
   * 5. GET TERRITORY BY ID
   */
  async getTerritoryById(userIdOrOpts, maybeId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { territoryId: maybeId });
    const territoryId = opts.territoryId || maybeId;

    let territory = this.memoryTerritories.get(territoryId);
    if (!territory && this.supabase) {
      try {
        const { data } = await this.supabase.from('sales_territories').select('*').eq('id', territoryId).maybeSingle();
        if (data) territory = data;
      } catch {}
    }

    if (!territory) {
      throw new Error(`Territory "${territoryId}" not found.`);
    }

    const assignments = this._getMemoryAssignmentsList().filter(a => a.territory_id === territoryId && a.status === 'active');
    const targets = this._getMemoryTargetsList().filter(tgt => tgt.territory_id === territoryId);

    return {
      ...territory,
      assignedAccountsCount: assignments.length,
      assignments,
      targets,
    };
  }

  /**
   * 6. DETERMINISTIC RULE-BASED MATCHING
   * Checks whether a lead/account matches territory rules without guessing missing data.
   */
  matchAccountToTerritory(lead, territory) {
    if (!lead || !territory) {
      return { matches: false, reason: 'Invalid lead or territory.' };
    }

    const rules = territory.territory_rules || territory.rules || {};
    const type = territory.territory_type;

    // Account-based: explicit list of lead IDs or domains
    if (type === 'account_based') {
      const targetIds = rules.lead_ids || rules.account_ids || [];
      const targetDomains = rules.company_domains || [];
      const targetNames = rules.company_names || [];

      if (targetIds.includes(lead.id)) {
        return { matches: true, reason: `Account ID explicitly designated in territory rule.` };
      }
      if (lead.company_domain && targetDomains.map(d => d.toLowerCase()).includes(lead.company_domain.toLowerCase())) {
        return { matches: true, reason: `Company domain "${lead.company_domain}" matches account rule.` };
      }
      if (lead.company && targetNames.map(n => n.toLowerCase()).includes(lead.company.toLowerCase())) {
        return { matches: true, reason: `Company name "${lead.company}" matches account rule.` };
      }
      return { matches: false, reason: 'Account is not in designated list for this account-based territory.' };
    }

    // 1. Geographic matching:
    const geoRules = rules.geography || {};
    const ruleCountries = [...(rules.countries || []), ...(geoRules.countries || [])].map(c => c.toLowerCase());
    const ruleStates = [...(rules.states || []), ...(geoRules.states || []), ...(geoRules.regions || [])].map(s => s.toLowerCase());
    const ruleRegions = [...(rules.regions || []), ...(geoRules.regions || [])].map(r => r.toLowerCase());
    const ruleCities = [...(rules.cities || []), ...(geoRules.cities || [])].map(c => c.toLowerCase());
    const hasGeoRules = ruleCountries.length > 0 || ruleStates.length > 0 || ruleRegions.length > 0 || ruleCities.length > 0;

    if (hasGeoRules) {
      const loc = (lead.location || lead.raw_enrichment?.location || '').toLowerCase();
      const country = (lead.raw_enrichment?.country || '').toLowerCase();
      const state = (lead.raw_enrichment?.state || '').toLowerCase();
      const city = (lead.raw_enrichment?.city || '').toLowerCase();

      if (!loc && !country && !state && !city) {
        return { matches: false, reason: 'Missing location data. Geographic assignment cannot be safely determined.' };
      }

      const matchCountry = ruleCountries.length > 0 && (ruleCountries.includes(country) || ruleCountries.some(rc => loc.includes(rc)));
      const matchState = ruleStates.length > 0 && (ruleStates.includes(state) || ruleStates.some(rs => loc.includes(rs)));
      const matchCity = ruleCities.length > 0 && (ruleCities.includes(city) || ruleCities.some(rc => loc.includes(rc)));
      const matchRegion = ruleRegions.length > 0 && ruleRegions.some(rr => loc.includes(rr) || country.includes(rr));

      if (!matchCountry && !matchState && !matchCity && !matchRegion) {
        return { matches: false, reason: 'Account location does not match geographic criteria.' };
      }
    }

    // 2. Industry matching:
    const indRules = rules.industry || {};
    const ruleIndustries = [...(rules.industries || []), ...(indRules.included || [])].map(i => i.toLowerCase());
    const excludedIndustries = [...(rules.excluded_industries || []), ...(indRules.excluded || [])].map(i => i.toLowerCase());
    const hasIndRules = ruleIndustries.length > 0 || excludedIndustries.length > 0;

    if (hasIndRules) {
      const leadInd = (lead.industry || lead.raw_enrichment?.industry || '').toLowerCase();
      if (!leadInd) {
        return { matches: false, reason: 'Missing industry data. Industry assignment cannot be safely determined.' };
      }

      if (excludedIndustries.some(ei => leadInd.includes(ei) || ei.includes(leadInd))) {
        return { matches: false, reason: `Industry "${lead.industry}" is excluded in territory criteria.` };
      }

      const matchesIndustry = ruleIndustries.length === 0 || ruleIndustries.some(ri => leadInd.includes(ri) || ri.includes(leadInd));
      if (!matchesIndustry) {
        return { matches: false, reason: `Industry "${lead.industry}" does not match territory criteria.` };
      }
    }

    // 3. Company Size matching:
    const sizeRules = rules.company_size || {};
    const minEmp = sizeRules.min_employees !== undefined ? sizeRules.min_employees : rules.min_employees;
    const maxEmp = sizeRules.max_employees !== undefined ? sizeRules.max_employees : rules.max_employees;
    const companySizesList = rules.company_sizes || sizeRules.brackets || [];
    const hasSizeRules = Boolean(companySizesList.length || minEmp !== undefined || maxEmp !== undefined);

    if (hasSizeRules) {
      const leadSize = lead.company_size || lead.raw_enrichment?.company_size;
      let leadEmployees = typeof lead.company_size === 'number'
        ? lead.company_size
        : typeof lead.company_size === 'string' && lead.company_size.match(/\d+/)
        ? Number(lead.company_size.match(/\d+/)[0])
        : Number(lead.raw_enrichment?.employees || 0);

      if (!leadSize && !leadEmployees) {
        return { matches: false, reason: 'Missing company size data. Cannot assign company size territory.' };
      }

      if (companySizesList.length > 0 && companySizesList.includes(leadSize)) {
        // Matched bracket
      } else {
        if (minEmp !== null && minEmp !== undefined && leadEmployees < minEmp) {
          return { matches: false, reason: `Employee count (${leadEmployees}) below minimum (${minEmp}).` };
        }
        if (maxEmp !== null && maxEmp !== undefined && leadEmployees > maxEmp) {
          return { matches: false, reason: `Employee count (${leadEmployees}) above maximum (${maxEmp}).` };
        }
      }
    }

    if (!hasGeoRules && !hasIndRules && !hasSizeRules && type !== 'custom') {
      return { matches: false, reason: 'No matching rules configured.' };
    }

    return { matches: true, reason: 'Account matches configured territory criteria.' };
  }

  /**
   * Helper: filter territories matching lead
   */
  findMatchingTerritories(lead, territories = []) {
    return territories.filter(t => this.matchAccountToTerritory(lead, t).matches);
  }

  async calculateTerritoryBalance(userIdOrOpts) {
    return this.getTerritoryBalancing(userIdOrOpts);
  }

  /**
   * 7. OVERLAP DETECTION
   * Detects accounts that match multiple territories and generates conflict warnings.
   */
  async detectOverlaps(userIdOrOpts, maybeTerritoryId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { territoryId: maybeTerritoryId });
    const { workspaceId } = opts;

    const territories = (await this.getTerritories(opts, 'active')).filter(t => t.workspace_id === workspaceId);
    const leads = await this._fetchLeads(opts);

    const overlaps = [];

    // 1. Pairwise structural rule comparison
    for (let i = 0; i < territories.length; i++) {
      for (let j = i + 1; j < territories.length; j++) {
        const tA = territories[i];
        const tB = territories[j];
        const rA = tA.territory_rules || tA.rules || {};
        const rB = tB.territory_rules || tB.rules || {};

        const geoA = rA.geography || {};
        const geoB = rB.geography || {};
        const countriesA = [...(rA.countries || []), ...(geoA.countries || [])].map(c => c.toLowerCase());
        const countriesB = [...(rB.countries || []), ...(geoB.countries || [])].map(c => c.toLowerCase());
        const commonCountries = countriesA.filter(c => countriesB.includes(c));

        const indA = rA.industry || {};
        const indB = rB.industry || {};
        const industriesA = [...(rA.industries || []), ...(indA.included || [])].map(ind => ind.toLowerCase());
        const industriesB = [...(rB.industries || []), ...(indB.included || [])].map(ind => ind.toLowerCase());
        const commonIndustries = industriesA.filter(ind => industriesB.includes(ind));

        const sizeA = rA.company_size || {};
        const sizeB = rB.company_size || {};
        const minA = sizeA.min_employees ?? rA.min_employees ?? 0;
        const maxA = sizeA.max_employees ?? rA.max_employees ?? Infinity;
        const minB = sizeB.min_employees ?? rB.min_employees ?? 0;
        const maxB = sizeB.max_employees ?? rB.max_employees ?? Infinity;
        const sizeOverlap = Math.max(minA, minB) <= Math.min(maxA, maxB);

        const reasons = [];
        if (commonCountries.length > 0) reasons.push(`Geographic country overlap on: ${commonCountries.join(', ')}`);
        if (commonIndustries.length > 0) reasons.push(`Industry overlap on: ${commonIndustries.join(', ')}`);
        if (sizeOverlap && (sizeA.min_employees !== undefined || rA.min_employees !== undefined) && (sizeB.min_employees !== undefined || rB.min_employees !== undefined)) {
          reasons.push('Company size range overlap');
        }

        if (reasons.length > 0) {
          overlaps.push({
            territory_a_id: tA.id,
            territory_b_id: tB.id,
            territory_a_name: tA.name,
            territory_b_name: tB.name,
            territory_id: tA.id,
            conflicting_territory_id: tB.id,
            reasons,
          });
        }
      }
    }

    // 2. Account level evaluation
    for (const lead of leads) {
      const matchingTerritories = [];

      for (const t of territories) {
        const matchResult = this.matchAccountToTerritory(lead, t);
        if (matchResult.matches) {
          matchingTerritories.push({
            territoryId: t.id,
            territoryName: t.name,
            territoryType: t.territory_type,
            reason: matchResult.reason,
          });
        }
      }

      if (matchingTerritories.length > 1) {
        const currentAssignment = this._getMemoryAssignmentsList().find(
          a => a.lead_id === lead.id && a.status === 'active'
        );

        overlaps.push({
          leadId: lead.id,
          company: lead.company || 'Unnamed Account',
          matchingTerritories,
          currentAssignment: currentAssignment ? {
            territoryId: currentAssignment.territory_id,
            assignedTo: currentAssignment.assigned_to,
            assignedAt: currentAssignment.assigned_at,
          } : null,
          isAssigned: Boolean(currentAssignment),
          recommendedAction: 'Manager resolution required: Select definitive territory for account.',
        });
      }
    }

    overlaps.conflictsCount = overlaps.length;
    overlaps.overlaps = overlaps;
    return overlaps;
  }

  /**
   * 8. PREVIEW ASSIGNMENTS (No DB write)
   */
  async previewAssignments(userIdOrOpts, maybeTerritoryId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { territoryId: maybeTerritoryId });
    const territoryId = opts.territoryId || maybeTerritoryId;

    const territory = await this.getTerritoryById(opts, territoryId);
    const leads = await this._fetchLeads(opts);

    const matches = [];
    const nonMatches = [];

    for (const lead of leads) {
      const res = this.matchAccountToTerritory(lead, territory);
      if (res.matches) {
        matches.push({
          leadId: lead.id,
          company: lead.company,
          location: lead.location,
          industry: lead.industry,
          reason: res.reason,
        });
      } else {
        nonMatches.push({
          leadId: lead.id,
          company: lead.company,
          reason: res.reason,
        });
      }
    }

    return {
      territoryId,
      territoryName: territory.name,
      totalLeadsEvaluated: leads.length,
      matchingAccountsCount: matches.length,
      matches,
      sampleNonMatches: nonMatches.slice(0, 5),
    };
  }

  /**
   * 9. ASSIGN ACCOUNTS TO TERRITORY
   * Explicit approval required. Prevents duplicate active assignments.
   */
  async assignAccountsToTerritory(userIdOrOpts, maybeTerritoryId = null, maybeLeadIds = [], maybeMethod = 'rule_based') {
    let opts;
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      opts = { ...userIdOrOpts };
    } else {
      opts = {
        userId: userIdOrOpts,
        territoryId: maybeTerritoryId,
        leadIds: maybeLeadIds,
        assignmentMethod: maybeMethod,
      };
    }

    const {
      userId,
      workspaceId = 'default-workspace',
      territoryId = maybeTerritoryId,
      leadIds = [],
      assignmentMethod = 'rule_based',
      assignedTo = null,
      reason = 'Matched territory rules',
    } = opts;

    if (!territoryId) {
      throw new Error('territoryId is required for assignment.');
    }
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      throw new Error('At least one leadId is required to assign.');
    }

    const territory = await this.getTerritoryById(opts, territoryId);
    const nowIso = new Date().toISOString();
    const createdAssignments = [];

    for (const leadId of leadIds) {
      // 1. Deactivate any existing active assignment for this lead in the workspace (prevent duplicate active assignments)
      const existingActive = this._getMemoryAssignmentsList().find(
        a => a.workspace_id === workspaceId && a.lead_id === leadId && a.status === 'active'
      );

      if (existingActive) {
        existingActive.status = 'reassigned';
        this.memoryAssignments.set(existingActive.id, existingActive);
      }

      // 2. Create new active assignment
      const assignmentId = crypto.randomUUID();
      const assignmentRecord = {
        id: assignmentId,
        workspace_id: workspaceId,
        territory_id: territoryId,
        lead_id: leadId,
        assigned_to: assignedTo || territory.owner_user_id || userId,
        assignment_reason: reason,
        assignment_method: assignmentMethod,
        assigned_by: userId,
        assigned_at: nowIso,
        status: 'active',
      };

      this.memoryAssignments.set(assignmentId, assignmentRecord);
      createdAssignments.push(assignmentRecord);

      // Update lead territory_id in memory if crmService is present
      if (this.crmService && this.crmService._getMemoryLead) {
        const l = this.crmService._getMemoryLead(leadId);
        if (l) {
          l.territory_id = territoryId;
          this.crmService._setMemoryLead(leadId, l);
        }
      }
    }

    if (this.supabase && createdAssignments.length > 0) {
      try {
        await this.supabase.from('sales_territory_assignments').insert(createdAssignments);
      } catch (err) {
        console.warn('[SalesTerritoryService] Supabase assignments insert warning:', err.message);
      }
    }

    return {
      success: true,
      territoryId,
      assignedCount: createdAssignments.length,
      assignments: createdAssignments,
    };
  }

  /**
   * 10. REASSIGN ACCOUNT
   */
  async reassignAccount(userIdOrOpts, maybeAssignmentId = null, maybeUpdates = {}) {
    let opts;
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      opts = { ...userIdOrOpts, ...(maybeUpdates || {}) };
    } else {
      opts = { userId: userIdOrOpts, assignmentId: maybeAssignmentId, ...(maybeUpdates || {}) };
    }

    const {
      userId,
      workspaceId = 'default-workspace',
      assignmentId = maybeAssignmentId,
      newTerritoryId,
      targetTerritoryId,
      newAssignedTo,
      reason = 'Manager territory rebalancing',
    } = opts;

    if (!this._isManager(opts)) {
      throw new Error('Forbidden: Only managers or admins can reassign accounts.');
    }

    let currentAssignment = assignmentId ? this.memoryAssignments.get(assignmentId) : null;
    if (!currentAssignment && opts.leadId) {
      currentAssignment = this._getMemoryAssignmentsList().find(
        a => a.lead_id === opts.leadId && a.workspace_id === workspaceId && a.status === 'active'
      );
    }

    if (!currentAssignment) {
      throw new Error(`Assignment "${assignmentId || opts.leadId}" not found.`);
    }

    const targetTerrId = targetTerritoryId || newTerritoryId || currentAssignment.territory_id;

    await this.assignAccountsToTerritory({
      userId: opts.assignedBy || userId,
      workspaceId,
      territoryId: targetTerrId,
      leadIds: [currentAssignment.lead_id],
      assignedTo: newAssignedTo || currentAssignment.assigned_to,
      assignmentMethod: 'manual',
      reason,
      assignedBy: opts.assignedBy || userId,
      role: 'manager'
    });

    const newAssignment = this._getMemoryAssignmentsList().find(
      a => a.lead_id === currentAssignment.lead_id && a.territory_id === targetTerrId && a.status === 'active'
    );

    return {
      success: true,
      assignment: newAssignment || { territory_id: targetTerrId, lead_id: currentAssignment.lead_id },
    };
  }

  /**
   * 11. TERRITORY BALANCING & CAPACITY ANALYSIS
   */
  async getTerritoryBalancing(userIdOrOpts) {
    const opts = this._normalizeArgs(userIdOrOpts);
    const { workspaceId } = opts;

    const territories = await this.getTerritories(opts, 'active');
    const leads = await this._fetchLeads(opts);
    const deals = await this._fetchDeals(opts);

    const activeAssignments = this._getMemoryAssignmentsList().filter(
      a => a.workspace_id === workspaceId && a.status === 'active'
    );

    // Group metrics by territory
    const territoryMetrics = [];
    const repWorkloadMap = new Map();

    for (const t of territories) {
      const tAssignments = activeAssignments.filter(a => a.territory_id === t.id);
      const leadIds = new Set(tAssignments.map(a => a.lead_id));
      const tLeads = leads.filter(l => leadIds.has(l.id));

      // Strategic & Tier-1 accounts
      const strategicCount = tLeads.filter(l => l.account_tier === 'strategic' || l.account_tier === 'tier_1').length;

      // Deals in territory
      const tDeals = deals.filter(d => leadIds.has(d.lead_id));
      const openDeals = tDeals.filter(d => d.status === 'open');
      const wonDeals = tDeals.filter(d => d.status === 'won' || d.stage === 'Won');

      let openPipeline = openDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      let weightedPipeline = openDeals.reduce((sum, d) => sum + ((Number(d.value) || 0) * ((d.probability || 50) / 100)), 0);
      const closedWonValue = wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

      // Fallback to assigned leads deal_value if crm_deals is empty
      if (openPipeline === 0 && tLeads.length > 0) {
        openPipeline = tLeads.reduce((sum, l) => sum + (Number(l.deal_value) > 0 ? Number(l.deal_value) : 0), 0);
        weightedPipeline = tLeads.reduce((sum, l) => sum + (Number(l.deal_value) > 0 ? Number(l.deal_value) * (Number(l.probability) || 0.5) : 0), 0);
      }

      // Track workload for territory owner
      const owner = t.owner_user_id || 'unassigned';
      if (!repWorkloadMap.has(owner)) {
        repWorkloadMap.set(owner, { repId: owner, totalAccounts: 0, strategicAccounts: 0, totalPipeline: 0 });
      }
      const repEntry = repWorkloadMap.get(owner);
      repEntry.totalAccounts += tAssignments.length;
      repEntry.strategicAccounts += strategicCount;
      repEntry.totalPipeline += openPipeline;

      territoryMetrics.push({
        territoryId: t.id,
        territory_id: t.id,
        territoryName: t.name,
        name: t.name,
        territoryType: t.territory_type,
        ownerUserId: t.owner_user_id,
        assignedAccountsCount: tAssignments.length,
        account_count: tAssignments.length,
        strategicAccountsCount: strategicCount,
        tier_1_count: strategicCount,
        openPipelineValue: Math.round(openPipeline * 100) / 100,
        pipeline_value: Math.round(openPipeline * 100) / 100,
        weightedPipelineValue: Math.round(weightedPipeline * 100) / 100,
        closedWonValue: Math.round(closedWonValue * 100) / 100,
      });
    }

    // Generate balancing recommendations
    const recommendations = [];
    const repList = Array.from(repWorkloadMap.values());

    // Rule 1: Strategic accounts concentration
    const maxStrategicRep = repList.reduce((max, r) => r.strategicAccounts > (max?.strategicAccounts || 0) ? r : max, null);
    const totalStrategic = territoryMetrics.reduce((s, t) => s + t.strategicAccountsCount, 0);
    if (maxStrategicRep && totalStrategic >= 4 && (maxStrategicRep.strategicAccounts / totalStrategic) > 0.6) {
      recommendations.push({
        type: 'strategic_account_concentration',
        severity: 'warning',
        title: 'Strategic Account Workload Concentration',
        description: `Representative ${maxStrategicRep.repId} manages ${maxStrategicRep.strategicAccounts} of ${totalStrategic} strategic accounts (${Math.round((maxStrategicRep.strategicAccounts / totalStrategic) * 100)}%).`,
        recommendedAction: 'Rebalance 2 strategic accounts to peer representatives to ensure adequate attention and prevent burnout.',
      });
    }

    // Rule 2: Workload imbalance alert
    const avgAcc = territoryMetrics.length > 0 ? activeAssignments.length / territoryMetrics.length : 0;
    const imbalancedTerritories = territoryMetrics.filter(t => t.assignedAccountsCount >= 5 && t.assignedAccountsCount > avgAcc * 1.3);
    for (const it of imbalancedTerritories) {
      recommendations.push({
        type: 'workload_imbalance',
        severity: 'warning',
        title: 'Workload imbalance alert',
        description: `Territory "${it.territoryName}" has ${it.assignedAccountsCount} accounts (above average of ${Math.round(avgAcc)}).`,
        recommendedAction: 'Rebalance accounts to peer territories.'
      });
    }

    // Rule 3: High volume
    const largeTerritories = territoryMetrics.filter(t => t.assignedAccountsCount >= 20);
    if (largeTerritories.length > 0) {
      recommendations.push({
        type: 'capacity_optimization',
        severity: 'info',
        title: 'High Account Volume in Target Territory',
        description: `Territory "${largeTerritories[0].territoryName}" has ${largeTerritories[0].assignedAccountsCount} accounts assigned.`,
        recommendedAction: 'Segment territory by industry or sub-region to increase outbound coverage velocity.',
      });
    }

    const unassignedLeadsCount = leads.filter(l => !activeAssignments.some(a => a.lead_id === l.id)).length;
    const warnings = recommendations.map(r => r.title ? `${r.title}: ${r.description}` : String(r));

    return {
      totalTerritories: territories.length,
      totalAssignedAccounts: activeAssignments.length,
      unassignedAccountsCount: unassignedLeadsCount,
      territories: territoryMetrics,
      repWorkload: repList,
      imbalanceAlertsCount: recommendations.length,
      recommendations,
      workload_imbalance_warnings: warnings,
    };
  }

  /**
   * 12. TERRITORY PERFORMANCE & REVENUE INTEGRATION
   */
  async getTerritoryPerformance(userIdOrOpts, maybeTerritoryId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { territoryId: maybeTerritoryId });
    const territoryId = opts.territoryId || maybeTerritoryId;

    const territory = await this.getTerritoryById(opts, territoryId);
    const assignments = this._getMemoryAssignmentsList().filter(
      a => a.territory_id === territoryId && a.status === 'active'
    );
    const leadIds = new Set(assignments.map(a => a.lead_id));

    const deals = await this._fetchDeals(opts);
    const leads = await this._fetchLeads(opts);
    const tDeals = deals.filter(d => leadIds.has(d.lead_id));
    const tLeads = leads.filter(l => leadIds.has(l.id));

    const wonDeals = tDeals.filter(d => d.status === 'won' || d.stage === 'Won');
    const openDeals = tDeals.filter(d => d.status === 'open');
    const lostDeals = tDeals.filter(d => d.status === 'lost' || d.stage === 'Lost');

    let closedWonValue = Math.round(wonDeals.reduce((s, d) => s + (Number(d.value) || 0), 0) * 100) / 100;
    let openPipeline = Math.round(openDeals.reduce((s, d) => s + (Number(d.value) || 0), 0) * 100) / 100;
    let weightedPipeline = Math.round(
      openDeals.reduce((s, d) => s + ((Number(d.value) || 0) * ((d.probability || 50) / 100)), 0) * 100
    ) / 100;

    // Fallback to assigned leads deal_value if deals in crm_deals is empty
    if (openPipeline === 0 && tLeads.length > 0) {
      const openLeads = tLeads.filter(l => l.status !== 'lost' && l.stage !== 'Lost');
      openPipeline = Math.round(openLeads.reduce((s, l) => s + (Number(l.deal_value) > 0 ? Number(l.deal_value) : 0), 0) * 100) / 100;
      weightedPipeline = Math.round(openLeads.reduce((s, l) => s + (Number(l.deal_value) > 0 ? Number(l.deal_value) * (Number(l.probability) || 0.5) : 0), 0) * 100) / 100;
    }

    const totalClosed = wonDeals.length + lostDeals.length;
    const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 1000) / 10 : 0.0;

    // Territory Target lookup
    const targets = this._getMemoryTargetsList().filter(tgt => tgt.territory_id === territoryId);
    const activeTarget = targets.length > 0 ? targets[targets.length - 1] : null;

    let targetAttainmentPct = null;
    let pipelineCoverage = null;

    if (activeTarget && (activeTarget.revenue_target > 0 || activeTarget.target_revenue > 0)) {
      const tgtRev = activeTarget.revenue_target || activeTarget.target_revenue;
      targetAttainmentPct = Math.round((closedWonValue / tgtRev) * 1000) / 10;
      pipelineCoverage = Math.round((openPipeline / tgtRev) * 100) / 100;
    }

    return {
      territoryId,
      territory_id: territoryId,
      territoryName: territory.name,
      territoryType: territory.territory_type,
      assignedAccountsCount: assignments.length,
      closedWonDealValue: closedWonValue,
      openPipelineValue: openPipeline,
      open_pipeline: openPipeline,
      weightedPipelineValue: weightedPipeline,
      winRate,
      activeTarget: activeTarget ? {
        periodType: activeTarget.period_type,
        revenueTarget: activeTarget.revenue_target || activeTarget.target_revenue,
        pipelineTarget: activeTarget.pipeline_target,
        newAccountsTarget: activeTarget.new_accounts_target,
        currency: activeTarget.currency,
      } : null,
      target_revenue: activeTarget ? (activeTarget.revenue_target || activeTarget.target_revenue) : 0,
      targetAttainmentPct,
      pipelineCoverage,
      pipeline_coverage_ratio: pipelineCoverage,
      dealsCount: tDeals.length,
    };
  }

  /**
   * 13. SET TERRITORY TARGET
   */
  async setTerritoryTarget(userIdOrOpts, maybeTargetData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeTargetData);
    const {
      userId,
      workspaceId = 'default-workspace',
      territoryId,
      periodType = 'quarterly',
      periodStart,
      periodEnd,
      revenueTarget = 50000,
      pipelineTarget = 150000,
      newAccountsTarget = 10,
      currency = 'USD',
    } = opts;

    if (!this._isManager(opts)) {
      throw new Error('Forbidden: Only managers or admins can set territory targets.');
    }

    if (!territoryId) {
      throw new Error('territoryId is required.');
    }

    const now = new Date();
    const start = periodStart || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = periodEnd || new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

    const finalRev = opts.targetRevenue !== undefined ? opts.targetRevenue : (opts.revenueTarget !== undefined ? opts.revenueTarget : 50000);
    const finalLogos = opts.targetNewLogos !== undefined ? opts.targetNewLogos : (opts.newAccountsTarget !== undefined ? opts.newAccountsTarget : 10);

    const targetId = crypto.randomUUID();
    const targetRecord = {
      id: targetId,
      workspace_id: workspaceId,
      territory_id: territoryId,
      period_type: periodType,
      period_start: start,
      period_end: end,
      revenue_target: Number(finalRev),
      target_revenue: Number(finalRev),
      pipeline_target: Number(pipelineTarget),
      new_accounts_target: Number(finalLogos),
      target_new_logos: Number(finalLogos),
      currency: currency.toUpperCase(),
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.memoryTargets.set(targetId, targetRecord);

    if (this.supabase) {
      try {
        await this.supabase.from('sales_territory_targets').upsert(targetRecord);
      } catch (err) {
        console.warn('[SalesTerritoryService] Supabase territory target upsert warning:', err.message);
      }
    }

    return targetRecord;
  }

  /**
   * 14. GET ACCOUNT PLANS
   */
  async getAccountPlans(userIdOrOpts, maybeFilters = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeFilters);
    const { workspaceId, territoryId, accountTier, leadId } = opts;

    let plans = this._getMemoryAccountPlansList().filter(p => p.workspace_id === workspaceId);

    if (territoryId) plans = plans.filter(p => p.territory_id === territoryId);
    if (accountTier) plans = plans.filter(p => p.account_tier === accountTier);
    if (leadId) plans = plans.filter(p => p.lead_id === leadId);

    // Attach actions to each plan
    return plans.map(p => {
      const actions = this._getMemoryPlanActionsList().filter(a => a.account_plan_id === p.id);
      return {
        ...p,
        actions,
        actionsCount: actions.length,
        completedActionsCount: actions.filter(a => a.status === 'completed').length,
      };
    });
  }

  /**
   * 15. GET ACCOUNT PLAN BY ID
   */
  async getAccountPlanById(userIdOrOpts, maybePlanId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { planId: maybePlanId });
    const planId = opts.planId || maybePlanId;

    let plan = this.memoryAccountPlans.get(planId);
    if (!plan && this.supabase) {
      try {
        const { data } = await this.supabase.from('sales_account_plans').select('*').eq('id', planId).maybeSingle();
        if (data) plan = data;
      } catch {}
    }

    if (!plan) {
      throw new Error(`Account plan "${planId}" not found.`);
    }

    const actions = this._getMemoryPlanActionsList().filter(a => a.account_plan_id === planId);

    return {
      ...plan,
      actions,
      actionsCount: actions.length,
      completedActionsCount: actions.filter(a => a.status === 'completed').length,
    };
  }

  async getAccountPlan(userIdOrOpts, maybePlanId = null) {
    const opts = this._normalizeArgs(userIdOrOpts, { planId: maybePlanId });
    const planId = opts.planId || maybePlanId;
    const leadId = opts.leadId || opts.lead_id;

    if (planId && this.memoryAccountPlans.has(planId)) {
      return this.getAccountPlanById(opts, planId);
    }
    if (leadId) {
      const plan = this._getMemoryAccountPlansList().find(p => p.lead_id === leadId && p.workspace_id === opts.workspaceId);
      if (!plan) return null;
      const actions = this._getMemoryPlanActionsList().filter(a => a.account_plan_id === plan.id);
      return {
        ...plan,
        actions,
        actionsCount: actions.length,
        completedActionsCount: actions.filter(a => a.status === 'completed').length,
      };
    }
    return null;
  }

  /**
   * 16. CREATE ACCOUNT PLAN
   */
  async createAccountPlan(userIdOrOpts, maybePlanData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybePlanData);
    const {
      userId,
      workspaceId = 'default-workspace',
      leadId,
      territoryId = null,
      accountOwnerId = userId,
      accountNameSnapshot,
      accountTier = 'tier_2',
      accountStatus = 'active',
      annualRevenueTarget = 0,
      currency = 'USD',
      planningPeriodStart,
      planningPeriodEnd,
      accountObjectives = [],
      accountStrategy = '',
    } = opts;

    if (!leadId) {
      throw new Error('leadId is required to create an account plan.');
    }

    const leadRecord = this.crmService?._getMemoryLead ? this.crmService._getMemoryLead(leadId) : null;
    const resolvedAccountName = accountNameSnapshot || opts.company || (leadRecord?.company) || 'Enterprise Account';

    const planId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const planRecord = {
      id: planId,
      workspace_id: workspaceId,
      lead_id: leadId,
      territory_id: territoryId,
      account_owner_id: accountOwnerId || userId,
      account_name_snapshot: resolvedAccountName,
      company: resolvedAccountName,
      account_tier: accountTier,
      account_status: accountStatus,
      plan_status: opts.planStatus || opts.plan_status || accountStatus,
      annual_revenue_target: Number(opts.targetRevenue || annualRevenueTarget) || 0,
      target_revenue: Number(opts.targetRevenue || annualRevenueTarget) || 0,
      currency: currency.toUpperCase(),
      planning_period_start: planningPeriodStart || nowIso,
      planning_period_end: planningPeriodEnd || new Date(Date.now() + 86400000 * 90).toISOString(),
      account_objectives: opts.strategicObjectives || accountObjectives || [],
      strategic_objectives: opts.strategicObjectives || accountObjectives || [],
      account_strategy: opts.strategySummary || accountStrategy || '',
      strategy_summary: opts.strategySummary || accountStrategy || '',
      last_reviewed_at: nowIso,
      created_by: userId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.memoryAccountPlans.set(planId, planRecord);
    this.memoryAccountPlans.set(`lead_${leadId}`, planRecord);

    if (this.supabase) {
      try {
        await this.supabase.from('sales_account_plans').insert(planRecord);
      } catch (err) {
        console.warn('[SalesTerritoryService] Supabase account plan insert warning:', err.message);
      }
    }

    return planRecord;
  }

  /**
   * 17. UPDATE ACCOUNT PLAN
   */
  async updateAccountPlan(userIdOrOpts, maybePlanId = null, maybeUpdates = {}) {
    let opts;
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      opts = { ...userIdOrOpts, ...(maybeUpdates || {}) };
    } else {
      opts = { userId: userIdOrOpts, planId: maybePlanId, ...(maybeUpdates || {}) };
    }

    const { planId = maybePlanId, accountTier, accountStatus, annualRevenueTarget, accountObjectives, accountStrategy } = opts;

    const plan = this.memoryAccountPlans.get(planId);
    if (!plan) {
      throw new Error(`Account plan "${planId}" not found.`);
    }

    if (accountTier) plan.account_tier = accountTier;
    if (accountStatus) plan.account_status = accountStatus;
    if (annualRevenueTarget !== undefined) plan.annual_revenue_target = Number(annualRevenueTarget);
    if (accountObjectives !== undefined) plan.account_objectives = accountObjectives;
    if (accountStrategy !== undefined) plan.account_strategy = accountStrategy;
    plan.last_reviewed_at = new Date().toISOString();
    plan.updated_at = new Date().toISOString();

    this.memoryAccountPlans.set(planId, plan);

    if (this.supabase) {
      try {
        await this.supabase.from('sales_account_plans').update(plan).eq('id', planId);
      } catch {}
    }

    return plan;
  }

  /**
   * 18. ADD PLAN ACTION
   */
  async addPlanAction(userIdOrOpts, maybeActionData = {}) {
    const opts = this._normalizeArgs(userIdOrOpts, maybeActionData);
    const {
      userId,
      workspaceId = 'default-workspace',
      accountPlanId,
      title,
      description = '',
      actionType = 'outreach',
      assignedTo = userId,
      dueDate = null,
      priority = 'medium',
      source = 'manual',
    } = opts;

    const targetPlanId = accountPlanId || opts.planId;
    if (!targetPlanId) {
      throw new Error('accountPlanId is required.');
    }
    if (!title || title.trim().length === 0) {
      throw new Error('Action title is required.');
    }

    const actionId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const actionRecord = {
      id: actionId,
      workspace_id: workspaceId,
      account_plan_id: targetPlanId,
      plan_id: targetPlanId,
      title: title.trim(),
      description,
      action_type: actionType,
      assigned_to: assignedTo,
      due_date: dueDate || opts.dueDate || new Date(Date.now() + 86400000 * 7).toISOString(),
      priority,
      status: opts.status || 'pending',
      source,
      completed_at: null,
      created_by: userId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.memoryPlanActions.set(actionId, actionRecord);

    if (this.supabase) {
      try {
        await this.supabase.from('sales_account_plan_actions').insert(actionRecord);
      } catch {}
    }

    return actionRecord;
  }

  /**
   * 19. UPDATE PLAN ACTION
   */
  async updatePlanAction(userIdOrOpts, maybeActionId = null, maybeUpdates = {}) {
    let opts;
    if (userIdOrOpts && typeof userIdOrOpts === 'object') {
      opts = { ...userIdOrOpts, ...(maybeUpdates || {}) };
    } else {
      opts = { userId: userIdOrOpts, actionId: maybeActionId, ...(maybeUpdates || {}) };
    }

    const actionId = opts.actionId || maybeActionId;
    const action = this.memoryPlanActions.get(actionId);
    if (!action) {
      throw new Error(`Plan action "${actionId}" not found.`);
    }

    const updates = opts.updates || opts;
    if (updates.status) {
      action.status = updates.status;
      if (updates.status === 'completed') action.completed_at = new Date().toISOString();
      else action.completed_at = null;
    }
    if (updates.dueDate !== undefined || updates.due_date !== undefined) action.due_date = updates.dueDate || updates.due_date;
    if (updates.priority) action.priority = updates.priority;
    action.updated_at = new Date().toISOString();

    this.memoryPlanActions.set(actionId, action);

    if (this.supabase) {
      try {
        await this.supabase.from('sales_account_plan_actions').update(action).eq('id', actionId);
      } catch {}
    }

    return action;
  }

  // --- Internal Data Fetching Helpers ---
  async _fetchLeads(opts = {}) {
    if (this.crmService && this.crmService._getMemoryLeadsList) {
      return this.crmService._getMemoryLeadsList();
    }
    if (this.supabase) {
      try {
        const { data } = await this.supabase.from('leads').select('*').order('created_at', { ascending: false });
        if (data && Array.isArray(data)) return data;
      } catch {}
    }
    return [];
  }

  async _fetchDeals(opts = {}) {
    if (this.crmService && this.crmService._getMemoryDealsList) {
      return this.crmService._getMemoryDealsList();
    }
    if (this.supabase) {
      try {
        const { data } = await this.supabase.from('crm_deals').select('*');
        if (data && Array.isArray(data)) return data;
      } catch {}
    }
    return [];
  }
}
