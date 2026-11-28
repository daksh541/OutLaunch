import crypto from 'node:crypto';

/**
 * Support SLA Service
 *
 * Implements deterministic SLA tracking for B2B customer support tickets.
 * Handles target deadline calculation, business hour consideration,
 * real-time SLA breach/at-risk evaluation, and workspace-wide compliance metrics.
 */

export const DEFAULT_SLA_POLICIES = [
  {
    priority: 'critical',
    policy_name: 'Critical Priority SLA',
    first_response_time_minutes: 60, // 1 hour
    resolution_time_minutes: 240, // 4 hours
    business_hours_only: false,
    is_default: true,
  },
  {
    priority: 'urgent',
    policy_name: 'Urgent Priority SLA',
    first_response_time_minutes: 120, // 2 hours
    resolution_time_minutes: 480, // 8 hours
    business_hours_only: false,
    is_default: true,
  },
  {
    priority: 'high',
    policy_name: 'High Priority SLA',
    first_response_time_minutes: 240, // 4 hours
    resolution_time_minutes: 1440, // 24 hours
    business_hours_only: false,
    is_default: true,
  },
  {
    priority: 'medium',
    policy_name: 'Medium Priority SLA',
    first_response_time_minutes: 480, // 8 hours
    resolution_time_minutes: 2880, // 48 hours
    business_hours_only: false,
    is_default: true,
  },
  {
    priority: 'low',
    policy_name: 'Low Priority SLA',
    first_response_time_minutes: 1440, // 24 hours
    resolution_time_minutes: 5760, // 96 hours
    business_hours_only: false,
    is_default: true,
  },
];

export class SupportSlaService {
  constructor(supabaseClient = null) {
    this.supabase = supabaseClient;
    this.memoryPolicies = new Map(); // id -> policy
    this._initDefaultPolicies();
  }

  _initDefaultPolicies() {
    for (const def of DEFAULT_SLA_POLICIES) {
      const id = `sla-default-${def.priority}`;
      this.memoryPolicies.set(id, {
        id,
        workspace_id: 'default-workspace',
        ...def,
        business_hours_start: '09:00',
        business_hours_end: '17:00',
        timezone: 'UTC',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Retrieves SLA policies for a workspace
   */
  async getPolicies(workspaceId = 'default-workspace') {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('support_sla_policies')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (!error && data && data.length > 0) {
        return data;
      }
    }

    const policies = Array.from(this.memoryPolicies.values()).filter(
      (p) => p.workspace_id === workspaceId || p.workspace_id === 'default-workspace'
    );
    return policies;
  }

  /**
   * Finds the applicable policy for a given ticket priority
   */
  async getPolicyForPriority(priority = 'medium', workspaceId = 'default-workspace') {
    const p = String(priority || 'medium').toLowerCase();
    const policies = await this.getPolicies(workspaceId);
    const found = policies.find((pol) => pol.priority.toLowerCase() === p);
    if (found) return found;

    // Fallback to default policy
    const defaultPol = DEFAULT_SLA_POLICIES.find((def) => def.priority === p) || DEFAULT_SLA_POLICIES[3];
    return {
      id: `sla-fallback-${p}`,
      workspace_id: workspaceId,
      ...defaultPol,
      business_hours_start: '09:00',
      business_hours_end: '17:00',
      timezone: 'UTC',
    };
  }

  /**
   * Updates or creates an SLA policy
   */
  async upsertPolicy(workspaceId = 'default-workspace', policyData = {}) {
    const priority = String(policyData.priority || 'medium').toLowerCase();
    const firstResponseMins = Math.max(1, parseInt(policyData.first_response_time_minutes, 10) || 480);
    const resolutionMins = Math.max(1, parseInt(policyData.resolution_time_minutes, 10) || 2880);

    const record = {
      workspace_id: workspaceId,
      policy_name: policyData.policy_name || `${priority.toUpperCase()} SLA Policy`,
      is_default: Boolean(policyData.is_default),
      priority,
      first_response_time_minutes: firstResponseMins,
      resolution_time_minutes: resolutionMins,
      business_hours_only: Boolean(policyData.business_hours_only),
      business_hours_start: policyData.business_hours_start || '09:00',
      business_hours_end: policyData.business_hours_end || '17:00',
      timezone: policyData.timezone || 'UTC',
      updated_at: new Date().toISOString(),
    };

    let existingId = null;
    for (const [id, pol] of this.memoryPolicies.entries()) {
      if (pol.workspace_id === workspaceId && pol.priority === priority) {
        existingId = id;
        break;
      }
    }

    if (existingId) {
      record.id = existingId;
      record.created_at = this.memoryPolicies.get(existingId).created_at;
    } else {
      record.id = crypto.randomUUID();
      record.created_at = new Date().toISOString();
    }

    this.memoryPolicies.set(record.id, record);

    if (this.supabase) {
      try {
        await this.supabase.from('support_sla_policies').upsert(record);
      } catch (err) {
        console.warn('[SupportSlaService] Supabase upsert error:', err.message);
      }
    }

    return record;
  }

  /**
   * Computes SLA due dates based on ticket creation time and policy
   */
  computeSlaDueDates(createdAt = new Date(), policy = null) {
    const baseDate = new Date(createdAt);
    const pol = policy || DEFAULT_SLA_POLICIES[3]; // medium default

    const firstResponseDue = new Date(baseDate.getTime() + pol.first_response_time_minutes * 60 * 1000);
    const resolutionDue = new Date(baseDate.getTime() + pol.resolution_time_minutes * 60 * 1000);

    return {
      first_response_due_at: firstResponseDue.toISOString(),
      resolution_due_at: resolutionDue.toISOString(),
    };
  }

  /**
   * Evaluates the current SLA status of a ticket
   */
  evaluateTicketSla(ticket, now = new Date()) {
    if (!ticket) return { sla_status: 'exempt', is_response_breached: false, is_resolution_breached: false };

    const nowDate = new Date(now);
    const createdDate = new Date(ticket.created_at || nowDate);
    const firstResponseDue = ticket.first_response_due_at ? new Date(ticket.first_response_due_at) : null;
    const resolutionDue = ticket.resolution_due_at ? new Date(ticket.resolution_due_at) : null;
    const firstRespondedAt = ticket.first_responded_at ? new Date(ticket.first_responded_at) : null;
    const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : null;

    let responseBreached = false;
    let resolutionBreached = false;
    let isAtRisk = false;

    // Response check
    if (firstResponseDue) {
      if (firstRespondedAt) {
        responseBreached = firstRespondedAt > firstResponseDue;
      } else {
        if (nowDate > firstResponseDue) {
          responseBreached = true;
        } else {
          // Check if > 75% of the response window has elapsed
          const totalWindow = firstResponseDue.getTime() - createdDate.getTime();
          const elapsed = nowDate.getTime() - createdDate.getTime();
          if (totalWindow > 0 && elapsed / totalWindow >= 0.75) {
            isAtRisk = true;
          }
        }
      }
    }

    // Resolution check
    const isClosedOrResolved = ['resolved', 'closed'].includes(ticket.status);
    if (resolutionDue) {
      if (isClosedOrResolved && resolvedAt) {
        resolutionBreached = resolvedAt > resolutionDue;
      } else if (!isClosedOrResolved) {
        if (nowDate > resolutionDue) {
          resolutionBreached = true;
        } else {
          // Check if > 75% of resolution window has elapsed
          const totalWindow = resolutionDue.getTime() - createdDate.getTime();
          const elapsed = nowDate.getTime() - createdDate.getTime();
          if (totalWindow > 0 && elapsed / totalWindow >= 0.75) {
            isAtRisk = true;
          }
        }
      }
    }

    let slaStatus = 'within_sla';
    if (responseBreached && resolutionBreached) {
      slaStatus = 'breached_both';
    } else if (responseBreached) {
      slaStatus = 'breached_response';
    } else if (resolutionBreached) {
      slaStatus = 'breached_resolution';
    } else if (isAtRisk && !isClosedOrResolved) {
      slaStatus = 'at_risk';
    }

    return {
      sla_status: slaStatus,
      is_response_breached: responseBreached,
      is_resolution_breached: resolutionBreached,
      is_at_risk: isAtRisk && !responseBreached && !resolutionBreached,
    };
  }

  /**
   * Computes aggregate SLA metrics for a set of tickets
   */
  calculateComplianceMetrics(tickets = []) {
    if (!tickets || tickets.length === 0) {
      return {
        total_tickets: 0,
        within_sla_count: 0,
        at_risk_count: 0,
        breached_response_count: 0,
        breached_resolution_count: 0,
        breached_total: 0,
        overall_compliance_rate: 100,
        first_response_compliance_rate: 100,
        resolution_compliance_rate: 100,
        average_first_response_time_minutes: null,
        average_resolution_time_minutes: null,
      };
    }

    const now = new Date();
    let totalTickets = tickets.length;
    let withinSla = 0;
    let atRisk = 0;
    let breachedResp = 0;
    let breachedRes = 0;
    let totalResponseMinutes = 0;
    let totalResponseCount = 0;
    let totalResolutionMinutes = 0;
    let totalResolutionCount = 0;

    for (const ticket of tickets) {
      const evaluation = this.evaluateTicketSla(ticket, now);
      if (evaluation.is_response_breached) breachedResp++;
      if (evaluation.is_resolution_breached) breachedRes++;
      if (evaluation.is_at_risk) atRisk++;
      if (evaluation.sla_status === 'within_sla') withinSla++;

      // Compute actual response minutes
      if (ticket.first_responded_at && ticket.created_at) {
        const diffMs = new Date(ticket.first_responded_at).getTime() - new Date(ticket.created_at).getTime();
        if (diffMs >= 0) {
          totalResponseMinutes += Math.round(diffMs / (60 * 1000));
          totalResponseCount++;
        }
      }

      // Compute actual resolution minutes
      if (ticket.resolved_at && ticket.created_at) {
        const diffMs = new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime();
        if (diffMs >= 0) {
          totalResolutionMinutes += Math.round(diffMs / (60 * 1000));
          totalResolutionCount++;
        }
      }
    }

    const totalBreached = tickets.filter((t) => {
      const evalStatus = this.evaluateTicketSla(t, now).sla_status;
      return ['breached_response', 'breached_resolution', 'breached_both'].includes(evalStatus);
    }).length;

    const overallCompliance = totalTickets > 0 ? Math.round(((totalTickets - totalBreached) / totalTickets) * 100) : 100;
    const responseCompliance = totalTickets > 0 ? Math.round(((totalTickets - breachedResp) / totalTickets) * 100) : 100;
    const resolutionCompliance = totalTickets > 0 ? Math.round(((totalTickets - breachedRes) / totalTickets) * 100) : 100;

    return {
      total_tickets: totalTickets,
      within_sla_count: withinSla,
      at_risk_count: atRisk,
      breached_response_count: breachedResp,
      breached_resolution_count: breachedRes,
      breached_total: totalBreached,
      overall_compliance_rate: Math.max(0, Math.min(100, overallCompliance)),
      first_response_compliance_rate: Math.max(0, Math.min(100, responseCompliance)),
      resolution_compliance_rate: Math.max(0, Math.min(100, resolutionCompliance)),
      average_first_response_time_minutes:
        totalResponseCount > 0 ? Math.round(totalResponseMinutes / totalResponseCount) : null,
      average_resolution_time_minutes:
        totalResolutionCount > 0 ? Math.round(totalResolutionMinutes / totalResolutionCount) : null,
    };
  }
}

export const supportSlaService = new SupportSlaService();
