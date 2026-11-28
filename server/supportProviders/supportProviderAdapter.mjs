import crypto from 'node:crypto';

/**
 * Support Provider Adapter & Registry
 *
 * Provides a unified abstraction layer over external support providers
 * (Zendesk, Intercom, Email Webhooks) and internal channels (Manual, CSV).
 *
 * Key Principles:
 * - When external credentials are missing, reports clean unconfigured status ('not_configured')
 * - Never fabricates fake credentials or simulated live sync counts
 * - Validates and normalizes all incoming payloads into standard OutLaunch schema
 * - Enforces provider deduplication keys (workspace_id, provider, provider_ticket_id)
 * - Treats raw ticket and message contents as untrusted external text
 */

export const SUPPORT_PROVIDERS = {
  MANUAL: 'manual',
  CSV: 'csv',
  ZENDESK: 'zendesk',
  INTERCOM: 'intercom',
  EMAIL: 'email',
  WEBHOOK: 'webhook',
  API: 'api',
};

export class SupportProviderAdapter {
  constructor(options = {}) {
    this.options = options;
    this.zendeskConfig = {
      subdomain: process.env.ZENDESK_SUBDOMAIN || options.zendeskSubdomain || null,
      apiToken: process.env.ZENDESK_API_TOKEN || options.zendeskApiToken || null,
      email: process.env.ZENDESK_EMAIL || options.zendeskEmail || null,
    };
    this.intercomConfig = {
      accessToken: process.env.INTERCOM_ACCESS_TOKEN || options.intercomAccessToken || null,
      appId: process.env.INTERCOM_APP_ID || options.intercomAppId || null,
    };
  }

  /**
   * Returns connection status for all registered support providers
   */
  getProvidersStatus(workspaceId = 'default-workspace') {
    return [
      {
        provider: SUPPORT_PROVIDERS.MANUAL,
        name: 'Manual Entry',
        connected: true,
        status: 'active',
        canImport: false,
        canCreate: true,
        message: 'Direct agent and customer ticket authoring ready.',
        workspaceId,
      },
      {
        provider: SUPPORT_PROVIDERS.CSV,
        name: 'CSV & Spreadsheets',
        connected: true,
        status: 'active',
        canImport: true,
        canCreate: false,
        message: 'Batch import tickets, historical conversations, and tags.',
        workspaceId,
      },
      {
        provider: SUPPORT_PROVIDERS.ZENDESK,
        name: 'Zendesk Support',
        connected: Boolean(this.zendeskConfig.subdomain && this.zendeskConfig.apiToken),
        status: this.zendeskConfig.subdomain && this.zendeskConfig.apiToken ? 'connected' : 'not_configured',
        canImport: true,
        canCreate: false,
        message:
          this.zendeskConfig.subdomain && this.zendeskConfig.apiToken
            ? `Connected to ${this.zendeskConfig.subdomain}.zendesk.com`
            : 'Zendesk credentials not configured. Manual creation and CSV import are available.',
        workspaceId,
      },
      {
        provider: SUPPORT_PROVIDERS.INTERCOM,
        name: 'Intercom',
        connected: Boolean(this.intercomConfig.accessToken),
        status: this.intercomConfig.accessToken ? 'connected' : 'not_configured',
        canImport: true,
        canCreate: false,
        message: this.intercomConfig.accessToken
          ? 'Connected to Intercom Conversations API'
          : 'Intercom credentials not configured. Manual creation and CSV import are available.',
        workspaceId,
      },
      {
        provider: SUPPORT_PROVIDERS.API,
        name: 'Custom Webhooks & REST API',
        connected: true,
        status: 'active',
        canImport: true,
        canCreate: true,
        message: 'Workspace API endpoints active for ticket ingestion.',
        workspaceId,
      },
    ];
  }

  /**
   * Normalizes incoming raw ticket payload from any provider
   */
  normalizeTicket(rawTicket = {}, provider = SUPPORT_PROVIDERS.MANUAL, workspaceId = 'default-workspace') {
    if (!rawTicket || typeof rawTicket !== 'object') {
      throw new Error('Invalid ticket payload: expected an object');
    }

    const providerKey = (provider || SUPPORT_PROVIDERS.MANUAL).toLowerCase();
    let providerTicketId = null;
    let subject = 'Support Request';
    let description = '';
    let requesterEmail = '';
    let requesterName = null;
    let status = 'open';
    let priority = 'medium';
    let category = 'general';
    let channel = 'web';
    let tags = [];
    let createdAt = new Date().toISOString();
    let rawMessages = [];

    if (providerKey === SUPPORT_PROVIDERS.ZENDESK) {
      providerTicketId = String(rawTicket.provider_ticket_id || rawTicket.id || rawTicket.ticket_id || '').trim() || null;
      subject = rawTicket.subject || rawTicket.raw_subject || 'Zendesk Ticket';
      description = rawTicket.description || (rawTicket.comment && rawTicket.comment.body) || '';
      requesterEmail = (rawTicket.requester && rawTicket.requester.email) || rawTicket.requester_email || '';
      requesterName = (rawTicket.requester && rawTicket.requester.name) || rawTicket.requester_name || null;
      priority = this._normalizePriority(rawTicket.priority);
      status = this._normalizeStatus(rawTicket.status);
      channel = 'zendesk';
      tags = Array.isArray(rawTicket.tags) ? rawTicket.tags : [];
      if (rawTicket.created_at) createdAt = new Date(rawTicket.created_at).toISOString();
      if (Array.isArray(rawTicket.comments)) {
        rawMessages = rawTicket.comments.map((c) => ({
          provider_message_id: String(c.id || ''),
          sender_type: c.author_id === rawTicket.requester_id ? 'customer' : 'agent',
          sender_email: requesterEmail,
          sender_name: requesterName,
          message_body: c.body || c.value || '',
          is_private_note: Boolean(c.public === false),
          created_at: c.created_at,
        }));
      }
    } else if (providerKey === SUPPORT_PROVIDERS.INTERCOM) {
      providerTicketId = String(rawTicket.provider_ticket_id || rawTicket.id || '').trim() || null;
      subject = (rawTicket.source && rawTicket.source.subject) || rawTicket.subject || 'Intercom Conversation';
      description = (rawTicket.source && rawTicket.source.body) || rawTicket.body || '';
      requesterEmail = (rawTicket.source && rawTicket.source.author && rawTicket.source.author.email) || rawTicket.user_email || '';
      requesterName = (rawTicket.source && rawTicket.source.author && rawTicket.source.author.name) || rawTicket.user_name || null;
      priority = this._normalizePriority(rawTicket.priority);
      status = rawTicket.state === 'closed' ? 'resolved' : 'open';
      channel = 'intercom';
      tags = Array.isArray(rawTicket.tags?.tags) ? rawTicket.tags.tags.map((t) => t.name) : [];
      if (rawTicket.created_at) {
        createdAt = typeof rawTicket.created_at === 'number'
          ? new Date(rawTicket.created_at * 1000).toISOString()
          : new Date(rawTicket.created_at).toISOString();
      }
      if (Array.isArray(rawTicket.conversation_parts?.conversation_parts)) {
        rawMessages = rawTicket.conversation_parts.conversation_parts.map((p) => ({
          provider_message_id: String(p.id || ''),
          sender_type: p.author?.type === 'user' || p.author?.type === 'lead' ? 'customer' : 'agent',
          sender_email: p.author?.email || requesterEmail,
          sender_name: p.author?.name || null,
          message_body: p.body || '',
          is_private_note: p.part_type === 'note',
          created_at: typeof p.created_at === 'number' ? new Date(p.created_at * 1000).toISOString() : p.created_at,
        }));
      }
    } else {
      // Manual / CSV / Direct API
      providerTicketId = rawTicket.provider_ticket_id ? String(rawTicket.provider_ticket_id) : null;
      subject = String(rawTicket.subject || rawTicket.title || 'Support Request').trim();
      description = String(rawTicket.description || rawTicket.body || rawTicket.message || '').trim();
      requesterEmail = String(rawTicket.requester_email || rawTicket.email || rawTicket.sender_email || '').trim().toLowerCase();
      requesterName = rawTicket.requester_name || rawTicket.name || null;
      priority = this._normalizePriority(rawTicket.priority);
      status = this._normalizeStatus(rawTicket.status);
      category = this._normalizeCategory(rawTicket.category);
      channel = rawTicket.channel || (providerKey === 'csv' ? 'csv' : 'web');
      if (Array.isArray(rawTicket.tags)) {
        tags = rawTicket.tags.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof rawTicket.tags === 'string' && rawTicket.tags.trim()) {
        tags = rawTicket.tags.split(',').map((t) => t.trim()).filter(Boolean);
      }
      if (rawTicket.created_at) createdAt = new Date(rawTicket.created_at).toISOString();
      if (Array.isArray(rawTicket.messages)) {
        rawMessages = rawTicket.messages;
      }
    }

    if (!requesterEmail) {
      throw new Error('Ticket requester email is required');
    }
    if (!subject) {
      throw new Error('Ticket subject is required');
    }

    return {
      workspace_id: workspaceId,
      provider: providerKey,
      provider_ticket_id: providerTicketId,
      subject,
      description: description || subject,
      requester_email: requesterEmail,
      requester_name: requesterName,
      status,
      priority,
      category,
      channel,
      tags,
      created_at: createdAt,
      rawMessages,
      metadata: rawTicket.metadata || {},
    };
  }

  /**
   * Parses CSV string into structured tickets with validation
   */
  parseCsv(csvContent = '', workspaceId = 'default-workspace') {
    if (!csvContent || typeof csvContent !== 'string') {
      return { success: false, tickets: [], errors: ['Empty CSV content'] };
    }

    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return { success: false, tickets: [], errors: ['CSV must contain a header row and at least one data row'] };
    }

    const headerLine = lines[0];
    const headers = this._parseCsvLine(headerLine).map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, '_'));

    const requiredFields = ['subject', 'requester_email'];
    const missingRequired = requiredFields.filter(
      (rf) => !headers.includes(rf) && !headers.some((h) => h.includes('email') || h.includes('subject') || h.includes('title'))
    );

    if (missingRequired.length > 0) {
      return {
        success: false,
        tickets: [],
        errors: [`Missing required header columns: ${missingRequired.join(', ')}`],
      };
    }

    const tickets = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const values = this._parseCsvLine(line);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx].trim() : '';
      });

      // Map flexible header names
      const subject = row.subject || row.title || row.issue || row.ticket_title || '';
      const description = row.description || row.body || row.message || row.details || subject;
      const requesterEmail = row.requester_email || row.email || row.customer_email || row.contact_email || '';
      const requesterName = row.requester_name || row.name || row.customer_name || null;
      const priority = row.priority || 'medium';
      const status = row.status || 'open';
      const category = row.category || 'general';
      const tags = row.tags ? row.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const externalId = row.provider_ticket_id || row.id || row.ticket_id || row.external_id || null;

      if (!subject || !requesterEmail) {
        errors.push(`Row ${i + 1}: Missing subject or customer email`);
        continue;
      }

      try {
        const normalized = this.normalizeTicket(
          {
            subject,
            description,
            requester_email: requesterEmail,
            requester_name: requesterName,
            priority,
            status,
            category,
            tags,
            provider_ticket_id: externalId,
          },
          SUPPORT_PROVIDERS.CSV,
          workspaceId
        );
        tickets.push(normalized);
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return {
      success: errors.length === 0,
      totalRows: lines.length - 1,
      importedCount: tickets.length,
      tickets,
      errors,
    };
  }

  _parseCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur);
    return result;
  }

  _normalizePriority(priority) {
    if (!priority) return 'medium';
    const p = String(priority).toLowerCase().trim();
    if (['critical', 'p0', 'highest'].includes(p)) return 'critical';
    if (['urgent', 'p1', 'high_urgency'].includes(p)) return 'urgent';
    if (['high', 'p2'].includes(p)) return 'high';
    if (['low', 'p4', 'lowest', 'trivial'].includes(p)) return 'low';
    return 'medium';
  }

  _normalizeStatus(status) {
    if (!status) return 'open';
    const s = String(status).toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (['new', 'open', 'pending', 'waiting_on_customer', 'escalated', 'resolved', 'closed', 'reopened'].includes(s)) {
      return s;
    }
    if (['solved', 'completed', 'done'].includes(s)) return 'resolved';
    if (['in_progress', 'working', 'active'].includes(s)) return 'open';
    if (['waiting', 'hold', 'paused'].includes(s)) return 'pending';
    return 'open';
  }

  _normalizeCategory(category) {
    if (!category) return 'general';
    const c = String(category).toLowerCase().trim().replace(/[\s-]+/g, '_');
    const valid = [
      'general',
      'billing',
      'technical',
      'bug',
      'feature_request',
      'integration',
      'security',
      'account',
      'onboarding',
      'performance',
      'data_sync',
    ];
    return valid.includes(c) ? c : 'general';
  }
}

export const supportProviderAdapter = new SupportProviderAdapter();
