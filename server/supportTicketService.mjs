import crypto from 'node:crypto';
import { supportProviderAdapter, SUPPORT_PROVIDERS } from './supportProviders/supportProviderAdapter.mjs';
import { supportSlaService } from './supportSlaService.mjs';
import { supportEscalationService } from './supportEscalationService.mjs';
import { supportIssueAnalyticsService } from './supportIssueAnalyticsService.mjs';
import { supportTicketIntelligenceService } from './supportTicketIntelligenceService.mjs';

/**
 * AI Support Ticket Management Service
 *
 * Core engine for OutLaunch support operations:
 * - Ticket lifecycle (new, open, pending, escalated, resolved, closed, reopened)
 * - Customer linking (public.leads & customer_success_accounts) with strict workspace boundaries
 * - SLA due date calculation and status tracking
 * - Conversation messages with provider deduplication
 * - Deep AI intelligence analysis & versioned insights
 * - Customer Success activity sync (customer_success_activities)
 * - Immutable audit trail of ticket events
 * - CSV import parsing & provider registry
 */

export class SupportTicketService {
  constructor(
    supabaseClient = null,
    customerHealthService = null,
    customerRenewalService = null,
    crmService = null
  ) {
    this.supabase = supabaseClient;
    this.customerHealthService = customerHealthService;
    this.customerRenewalService = customerRenewalService;
    this.crmService = crmService;

    // Services
    this.providerAdapter = supportProviderAdapter;
    this.slaService = supportSlaService;
    this.escalationService = supportEscalationService;
    this.analyticsService = supportIssueAnalyticsService;
    this.intelligenceService = supportTicketIntelligenceService;

    // In-memory stores for ultra-fast execution and deterministic testing
    this.memoryTickets = new Map(); // id -> ticket
    this.memoryMessages = new Map(); // id -> message
    this.memoryAiInsights = new Map(); // id -> insight
    this.memoryAuditLog = new Map(); // id -> audit log entry
    this.ticketCounters = new Map(); // workspaceId -> integer
  }

  _getNextTicketNumber(workspaceId = 'default-workspace') {
    const current = this.ticketCounters.get(workspaceId) || 1000;
    const next = current + 1;
    this.ticketCounters.set(workspaceId, next);
    return `TICK-${next}`;
  }

  /**
   * Resolves customer lead and customer success account by email or id within workspace
   */
  async _resolveCustomerLinks(requesterEmail, workspaceId, explicitLeadId = null, explicitCsAccountId = null) {
    let leadId = explicitLeadId || null;
    let csAccountId = explicitCsAccountId || null;
    let customerAccount = null;

    // Check if explicit CS account provided
    if (csAccountId && this.customerHealthService) {
      try {
        customerAccount = await this.customerHealthService.getAccountById({
          workspaceId,
          accountId: csAccountId,
        });
        if (customerAccount) {
          leadId = customerAccount.lead_id;
          return { leadId, csAccountId, customerAccount };
        }
      } catch (err) {
        // Continue if CS account not found in workspace
      }
    }

    // Try finding lead in CRM service or Supabase
    if (!leadId && requesterEmail && this.crmService) {
      try {
        const leads = await this.crmService.getLeads({ workspaceId, search: requesterEmail });
        const matchedLead = Array.isArray(leads)
          ? leads.find((l) => (l.email || '').toLowerCase() === requesterEmail.toLowerCase())
          : null;
        if (matchedLead) {
          leadId = matchedLead.id;
        }
      } catch (err) {
        // Continue if CRM lookup fails
      }
    }

    // Try finding customer success account in customerHealthService
    if (this.customerHealthService) {
      try {
        const csAccounts = await this.customerHealthService.getAccounts({ workspaceId });
        if (Array.isArray(csAccounts)) {
          // Match by leadId or email
          const matchedCs = csAccounts.find(
            (a) => (leadId && a.lead_id === leadId) || (a.lead_email && a.lead_email.toLowerCase() === requesterEmail.toLowerCase())
          );
          if (matchedCs) {
            csAccountId = matchedCs.id;
            customerAccount = matchedCs;
            if (!leadId) leadId = matchedCs.lead_id;
          }
        }
      } catch (err) {
        // Continue if CS lookup fails
      }
    }

    return { leadId, csAccountId, customerAccount };
  }

  /**
   * Syncs ticket event into customer_success_activities
   */
  async _syncCustomerSuccessActivity(ticket, action = 'created') {
    if (!ticket.customer_success_account_id || !this.customerHealthService) return;

    try {
      const activityData = {
        customer_success_account_id: ticket.customer_success_account_id,
        workspace_id: ticket.workspace_id,
        activity_type: 'support_issue',
        title: `Support Ticket [${ticket.ticket_number}]: ${ticket.subject}`,
        description: `Status: ${ticket.status.toUpperCase()} | Priority: ${ticket.priority.toUpperCase()} | Action: ${action}`,
        source: 'support_ticket',
        source_record_id: ticket.id,
        activity_date: ticket.updated_at || ticket.created_at,
        metadata: {
          ticket_number: ticket.ticket_number,
          priority: ticket.priority,
          status: ticket.status,
          sla_status: ticket.sla_status,
          is_escalated: ticket.is_escalated,
          sentiment: ticket.sentiment,
        },
      };

      if (typeof this.customerHealthService.recordActivity === 'function') {
        await this.customerHealthService.recordActivity({
          ...activityData,
          userId: 'system-support',
          workspaceId: ticket.workspace_id,
        });
      }
    } catch (err) {
      console.warn('[SupportTicketService] Failed to sync CS activity:', err.message);
    }
  }

  /**
   * Logs an entry to the audit log
   */
  async _logAudit(ticketId, workspaceId, action, prevState = {}, nextState = {}, actor = null, notes = null) {
    const entry = {
      id: crypto.randomUUID(),
      ticket_id: ticketId,
      workspace_id: workspaceId,
      actor_id: actor?.userId || actor?.id || 'system',
      actor_name: actor?.name || actor?.email || (actor?.userId ? 'User' : 'System'),
      action,
      previous_state: prevState || {},
      new_state: nextState || {},
      notes: notes || null,
      created_at: new Date().toISOString(),
    };

    this.memoryAuditLog.set(entry.id, entry);

    if (this.supabase) {
      try {
        await this.supabase.from('support_ticket_audit_log').insert(entry);
      } catch (err) {
        console.warn('[SupportTicketService] Audit log insert error:', err.message);
      }
    }

    return entry;
  }

  /**
   * Creates a new support ticket
   */
  async createTicket(ticketData = {}, actor = null) {
    const workspaceId = ticketData.workspace_id || actor?.workspaceId || 'default-workspace';
    const provider = ticketData.provider || SUPPORT_PROVIDERS.MANUAL;

    // Normalize ticket through provider adapter
    const normalized = this.providerAdapter.normalizeTicket(ticketData, provider, workspaceId);

    // Prevent duplicate provider tickets within the same workspace
    if (normalized.provider_ticket_id) {
      const existing = Array.from(this.memoryTickets.values()).find(
        (t) =>
          t.workspace_id === workspaceId &&
          t.provider === normalized.provider &&
          t.provider_ticket_id === normalized.provider_ticket_id
      );
      if (existing) {
        return existing;
      }
    }

    const { leadId, csAccountId, customerAccount } = await this._resolveCustomerLinks(
      normalized.requester_email,
      workspaceId,
      ticketData.lead_id,
      ticketData.customer_success_account_id
    );

    // Compute SLA deadlines
    const slaPolicy = await this.slaService.getPolicyForPriority(normalized.priority, workspaceId);
    const slaDeadlines = this.slaService.computeSlaDueDates(normalized.created_at, slaPolicy);

    const ticketNumber = this._getNextTicketNumber(workspaceId);
    const ticketId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const record = {
      id: ticketId,
      workspace_id: workspaceId,
      lead_id: leadId,
      customer_success_account_id: csAccountId,
      provider: normalized.provider,
      provider_ticket_id: normalized.provider_ticket_id,
      ticket_number: ticketNumber,
      subject: normalized.subject,
      description: normalized.description,
      status: normalized.status || 'open',
      priority: normalized.priority || 'medium',
      urgency: normalized.urgency || (normalized.priority === 'critical' ? 'critical' : 'normal'),
      category: normalized.category || 'general',
      tags: normalized.tags || [],
      channel: normalized.channel || 'web',
      requester_email: normalized.requester_email,
      requester_name: normalized.requester_name || null,
      assigned_agent_id: ticketData.assigned_agent_id || null,
      assigned_agent_name: ticketData.assigned_agent_name || null,
      first_response_due_at: slaDeadlines.first_response_due_at,
      first_responded_at: null,
      resolution_due_at: slaDeadlines.resolution_due_at,
      resolved_at: null,
      closed_at: null,
      sla_status: 'within_sla',
      is_escalated: Boolean(ticketData.is_escalated),
      escalation_level: ticketData.escalation_level || (ticketData.is_escalated ? 1 : 0),
      escalation_reason: ticketData.escalation_reason || null,
      escalated_at: ticketData.is_escalated ? nowIso : null,
      sentiment: ticketData.sentiment || 'neutral',
      satisfaction_rating: ticketData.satisfaction_rating || null,
      reopen_count: 0,
      last_activity_at: nowIso,
      metadata: normalized.metadata || {},
      created_by: actor?.userId || null,
      created_at: normalized.created_at || nowIso,
      updated_at: nowIso,
    };

    this.memoryTickets.set(ticketId, record);

    if (this.supabase) {
      try {
        await this.supabase.from('support_tickets').insert(record);
      } catch (err) {
        console.warn('[SupportTicketService] Supabase insert error:', err.message);
      }
    }

    // Create initial message if description or raw messages present
    if (normalized.rawMessages && normalized.rawMessages.length > 0) {
      for (const rawMsg of normalized.rawMessages) {
        await this.addMessage(ticketId, rawMsg, actor);
      }
    } else if (normalized.description) {
      await this.addMessage(
        ticketId,
        {
          sender_type: 'customer',
          sender_email: normalized.requester_email,
          sender_name: normalized.requester_name,
          message_body: normalized.description,
          is_private_note: false,
          created_at: record.created_at,
        },
        actor
      );
    }

    // Log audit trail
    await this._logAudit(ticketId, workspaceId, 'created', {}, record, actor, 'Ticket created');

    // Sync Customer Success Activity
    await this._syncCustomerSuccessActivity(record, 'created');

    return record;
  }

  /**
   * Adds a message to a ticket conversation
   */
  async addMessage(ticketId, messageData = {}, actor = null) {
    const ticket = this.memoryTickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    const workspaceId = ticket.workspace_id;
    const senderType = messageData.sender_type || (actor ? 'agent' : 'customer');
    const senderEmail = messageData.sender_email || actor?.email || ticket.requester_email;
    const senderName = messageData.sender_name || actor?.name || (senderType === 'customer' ? ticket.requester_name : 'Agent');
    const messageBody = String(messageData.message_body || messageData.body || '').trim();

    if (!messageBody) {
      throw new Error('Message body cannot be empty');
    }

    // Deduplication by provider_message_id
    if (messageData.provider_message_id) {
      const existing = Array.from(this.memoryMessages.values()).find(
        (m) => m.ticket_id === ticketId && m.provider_message_id === messageData.provider_message_id
      );
      if (existing) return existing;
    }

    const messageId = crypto.randomUUID();
    const nowIso = messageData.created_at || new Date().toISOString();

    const record = {
      id: messageId,
      ticket_id: ticketId,
      workspace_id: workspaceId,
      provider_message_id: messageData.provider_message_id || null,
      sender_type: senderType,
      sender_email: senderEmail,
      sender_name: senderName,
      message_body: messageBody,
      is_private_note: Boolean(messageData.is_private_note),
      attachments: messageData.attachments || [],
      created_at: nowIso,
    };

    this.memoryMessages.set(messageId, record);

    if (this.supabase) {
      try {
        await this.supabase.from('support_ticket_messages').insert(record);
      } catch (err) {
        console.warn('[SupportTicketService] Supabase message insert error:', err.message);
      }
    }

    // Update ticket activity and response tracking
    const ticketUpdates = {
      last_activity_at: nowIso,
      updated_at: nowIso,
    };

    if (senderType === 'agent' && !ticket.first_responded_at && !record.is_private_note) {
      ticketUpdates.first_responded_at = nowIso;
    }

    await this.updateTicket(ticketId, ticketUpdates, actor);

    await this._logAudit(
      ticketId,
      workspaceId,
      record.is_private_note ? 'private_note_added' : 'message_added',
      {},
      { message_id: messageId, sender_type: senderType },
      actor
    );

    return record;
  }

  /**
   * Updates an existing ticket
   */
  async updateTicket(ticketId, updates = {}, actor = null) {
    const existing = this.memoryTickets.get(ticketId);
    if (!existing) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    const nowIso = new Date().toISOString();
    const previousState = { ...existing };
    const nextState = { ...existing, ...updates, updated_at: nowIso };

    // Handle status transitions
    if (updates.status && updates.status !== previousState.status) {
      if (['resolved', 'closed'].includes(updates.status) && !existing.resolved_at) {
        nextState.resolved_at = nowIso;
        if (updates.status === 'closed') nextState.closed_at = nowIso;
      } else if (
        ['reopened', 'open'].includes(updates.status) &&
        ['resolved', 'closed'].includes(previousState.status)
      ) {
        nextState.reopen_count = (existing.reopen_count || 0) + 1;
        nextState.resolved_at = null;
        nextState.closed_at = null;
      }
    }

    // Handle priority update -> recompute SLA
    if (updates.priority && updates.priority !== previousState.priority) {
      const slaPolicy = await this.slaService.getPolicyForPriority(updates.priority, existing.workspace_id);
      const slaDeadlines = this.slaService.computeSlaDueDates(existing.created_at, slaPolicy);
      nextState.first_response_due_at = slaDeadlines.first_response_due_at;
      nextState.resolution_due_at = slaDeadlines.resolution_due_at;
    }

    // Re-evaluate SLA status
    const slaEvaluation = this.slaService.evaluateTicketSla(nextState);
    nextState.sla_status = slaEvaluation.sla_status;

    this.memoryTickets.set(ticketId, nextState);

    if (this.supabase) {
      try {
        await this.supabase.from('support_tickets').update(nextState).eq('id', ticketId);
      } catch (err) {
        console.warn('[SupportTicketService] Supabase ticket update error:', err.message);
      }
    }

    await this._logAudit(
      ticketId,
      existing.workspace_id,
      'updated',
      previousState,
      nextState,
      actor,
      updates.status ? `Status changed to ${updates.status}` : 'Ticket attributes updated'
    );

    await this._syncCustomerSuccessActivity(nextState, 'updated');

    return nextState;
  }

  /**
   * Retrieves ticket by ID with messages, AI insights, customer context, and audit trail
   */
  async getTicketById(ticketId, workspaceId = null) {
    const ticket = this.memoryTickets.get(ticketId);
    if (!ticket || (workspaceId && ticket.workspace_id !== workspaceId)) {
      return null;
    }

    // Get messages
    const messages = Array.from(this.memoryMessages.values())
      .filter((m) => m.ticket_id === ticketId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Get latest AI insight
    const insights = Array.from(this.memoryAiInsights.values())
      .filter((i) => i.ticket_id === ticketId)
      .sort((a, b) => b.version - a.version);
    const latestInsight = insights[0] || null;

    // Get customer account context
    let customerAccount = null;
    if (ticket.customer_success_account_id && this.customerHealthService) {
      try {
        customerAccount = await this.customerHealthService.getAccountById({
          workspaceId: ticket.workspace_id,
          accountId: ticket.customer_success_account_id,
        });
      } catch (err) {}
    }

    // Real-time SLA evaluation
    const slaEval = this.slaService.evaluateTicketSla(ticket);

    // Audit log
    const auditLogs = Array.from(this.memoryAuditLog.values())
      .filter((l) => l.ticket_id === ticketId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      ...ticket,
      sla_status: slaEval.sla_status,
      is_response_breached: slaEval.is_response_breached,
      is_resolution_breached: slaEval.is_resolution_breached,
      is_at_risk: slaEval.is_at_risk,
      messages,
      latest_ai_insight: latestInsight,
      customer_account: customerAccount,
      audit_log: auditLogs,
    };
  }

  /**
   * Retrieves filtered list of tickets
   */
  async getTickets(filters = {}) {
    const workspaceId = filters.workspaceId || filters.workspace_id || 'default-workspace';
    let tickets = Array.from(this.memoryTickets.values()).filter((t) => t.workspace_id === workspaceId);

    // Real-time SLA update
    tickets = tickets.map((t) => {
      const evalResult = this.slaService.evaluateTicketSla(t);
      return {
        ...t,
        sla_status: evalResult.sla_status,
        is_response_breached: evalResult.is_response_breached,
        is_resolution_breached: evalResult.is_resolution_breached,
        is_at_risk: evalResult.is_at_risk,
      };
    });

    if (filters.status) {
      const st = String(filters.status).toLowerCase();
      tickets = tickets.filter((t) => t.status.toLowerCase() === st);
    }

    if (filters.priority) {
      const pr = String(filters.priority).toLowerCase();
      tickets = tickets.filter((t) => t.priority.toLowerCase() === pr);
    }

    if (filters.category) {
      const cat = String(filters.category).toLowerCase();
      tickets = tickets.filter((t) => t.category.toLowerCase() === cat);
    }

    if (filters.slaStatus) {
      const sla = String(filters.slaStatus).toLowerCase();
      tickets = tickets.filter((t) => t.sla_status.toLowerCase() === sla);
    }

    if (filters.isEscalated !== undefined && filters.isEscalated !== null) {
      const isEsc = Boolean(filters.isEscalated);
      tickets = tickets.filter((t) => Boolean(t.is_escalated) === isEsc);
    }

    if (filters.leadId) {
      tickets = tickets.filter((t) => t.lead_id === filters.leadId);
    }

    if (filters.customerSuccessAccountId) {
      tickets = tickets.filter((t) => t.customer_success_account_id === filters.customerSuccessAccountId);
    }

    if (filters.search) {
      const q = String(filters.search).toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.requester_email.toLowerCase().includes(q) ||
          (t.requester_name && t.requester_name.toLowerCase().includes(q))
      );
    }

    // Sort by created_at descending by default
    tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = tickets.length;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 50;
    const offset = filters.offset ? parseInt(filters.offset, 10) : 0;
    const paginated = tickets.slice(offset, offset + limit);

    return {
      total,
      limit,
      offset,
      tickets: paginated,
    };
  }

  /**
   * Generates AI intelligence analysis for a ticket and saves immutable insight snapshot
   */
  async analyzeTicketWithAI(ticketId, actor = null) {
    const fullTicket = await this.getTicketById(ticketId);
    if (!fullTicket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    // Run AI intelligence analysis
    const insightData = await this.intelligenceService.analyzeTicket(
      fullTicket,
      fullTicket.messages,
      fullTicket.customer_account
    );

    // Determine version
    const existingInsights = Array.from(this.memoryAiInsights.values()).filter((i) => i.ticket_id === ticketId);
    const version = existingInsights.length + 1;

    const insightRecord = {
      id: crypto.randomUUID(),
      ticket_id: ticketId,
      workspace_id: fullTicket.workspace_id,
      version,
      ...insightData,
      created_at: new Date().toISOString(),
    };

    // Immutable storage
    this.memoryAiInsights.set(insightRecord.id, Object.freeze(insightRecord));

    if (this.supabase) {
      try {
        await this.supabase.from('support_ticket_ai_insights').insert(insightRecord);
      } catch (err) {
        console.warn('[SupportTicketService] Supabase AI insight insert error:', err.message);
      }
    }

    // Update ticket sentiment, urgency, and category if updated by AI
    await this.updateTicket(
      ticketId,
      {
        sentiment: insightRecord.sentiment,
        category: insightRecord.issue_category,
        urgency: insightRecord.urgency,
      },
      actor
    );

    await this._logAudit(
      ticketId,
      fullTicket.workspace_id,
      'ai_analyzed',
      {},
      { insight_id: insightRecord.id, version, sentiment: insightRecord.sentiment },
      actor,
      `AI Intelligence analysis version ${version} completed`
    );

    return insightRecord;
  }

  /**
   * Evaluates escalation factors for a ticket
   */
  async evaluateEscalation(ticketId) {
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    return this.escalationService.evaluateEscalation(ticket, ticket.customer_account, {
      sla_status: ticket.sla_status,
      is_at_risk: ticket.is_at_risk,
    });
  }

  /**
   * Approves ticket escalation (requires explicit user confirmation)
   */
  async approveEscalation(ticketId, escalationData = {}, actor = null) {
    const ticket = this.memoryTickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    const proposedLevel = Math.max(1, parseInt(escalationData.escalation_level, 10) || 1);
    const reason = escalationData.reason || 'Manual user-approved escalation';

    const updated = await this.updateTicket(
      ticketId,
      {
        is_escalated: true,
        status: 'escalated',
        escalation_level: proposedLevel,
        escalation_reason: reason,
        escalated_at: new Date().toISOString(),
      },
      actor
    );

    await this._logAudit(
      ticketId,
      ticket.workspace_id,
      'escalation_approved',
      { is_escalated: ticket.is_escalated, level: ticket.escalation_level },
      { is_escalated: true, level: proposedLevel, reason },
      actor,
      `Escalation approved at Level ${proposedLevel}: ${reason}`
    );

    return updated;
  }

  /**
   * Dismisses ticket escalation
   */
  async dismissEscalation(ticketId, reason = 'Escalation resolved or deemed normal priority', actor = null) {
    const ticket = this.memoryTickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    const updated = await this.updateTicket(
      ticketId,
      {
        is_escalated: false,
        status: ticket.status === 'escalated' ? 'open' : ticket.status,
        escalation_level: 0,
        escalation_reason: null,
      },
      actor
    );

    await this._logAudit(
      ticketId,
      ticket.workspace_id,
      'escalation_dismissed',
      { is_escalated: ticket.is_escalated },
      { is_escalated: false, reason },
      actor,
      `Escalation dismissed: ${reason}`
    );

    return updated;
  }

  /**
   * Imports batch tickets from CSV string
   */
  async importCsvTickets(csvContent, workspaceId = 'default-workspace', actor = null) {
    const parseResult = this.providerAdapter.parseCsv(csvContent, workspaceId);
    if (!parseResult.success && parseResult.tickets.length === 0) {
      return parseResult;
    }

    const createdTickets = [];
    const importErrors = [...parseResult.errors];

    for (const rawTicket of parseResult.tickets) {
      try {
        const created = await this.createTicket(rawTicket, actor);
        createdTickets.push(created);
      } catch (err) {
        importErrors.push(`Failed to import ticket "${rawTicket.subject}": ${err.message}`);
      }
    }

    return {
      success: createdTickets.length > 0,
      totalParsed: parseResult.tickets.length,
      importedCount: createdTickets.length,
      errors: importErrors,
      tickets: createdTickets,
    };
  }

  /**
   * Computes high-level support operations and SLA metrics for workspace
   */
  async getSupportMetrics(workspaceId = 'default-workspace') {
    const tickets = Array.from(this.memoryTickets.values()).filter((t) => t.workspace_id === workspaceId);
    const slaMetrics = this.slaService.calculateComplianceMetrics(tickets);

    const openTickets = tickets.filter((t) => ['new', 'open', 'pending', 'waiting_on_customer', 'escalated'].includes(t.status));
    const escalatedTickets = tickets.filter((t) => t.is_escalated);
    const criticalTickets = tickets.filter((t) => t.priority === 'critical');

    // CSAT calculation
    const ratedTickets = tickets.filter((t) => t.satisfaction_rating !== null && t.satisfaction_rating !== undefined);
    const avgCsat =
      ratedTickets.length > 0
        ? Number((ratedTickets.reduce((acc, t) => acc + Number(t.satisfaction_rating), 0) / ratedTickets.length).toFixed(2))
        : null;

    return {
      total_tickets: tickets.length,
      open_tickets: openTickets.length,
      escalated_tickets: escalatedTickets.length,
      critical_tickets: criticalTickets.length,
      average_csat: avgCsat,
      rated_tickets_count: ratedTickets.length,
      sla_compliance: slaMetrics,
    };
  }

  /**
   * Analyzes issues, recurring clusters, and customer impacts across tickets
   */
  async getIssueAnalytics(workspaceId = 'default-workspace') {
    const tickets = Array.from(this.memoryTickets.values()).filter((t) => t.workspace_id === workspaceId);

    // Fetch customer accounts map if customerHealthService is available
    const customerAccountsMap = new Map();
    if (this.customerHealthService) {
      try {
        const accounts = await this.customerHealthService.getAccounts({ workspaceId });
        if (Array.isArray(accounts)) {
          accounts.forEach((acc) => {
            customerAccountsMap.set(acc.id, acc);
            if (acc.lead_email) customerAccountsMap.set(acc.lead_email.toLowerCase(), acc);
          });
        }
      } catch (err) {
        // Continue if CS accounts lookup fails
      }
    }

    return this.analyticsService.analyzeTickets(tickets, customerAccountsMap);
  }
}

export const supportTicketService = new SupportTicketService();
