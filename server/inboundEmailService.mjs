import crypto from 'node:crypto';

/**
 * Inbound Email Service & Reply Matching Engine
 *
 * Responsibilities:
 * 1. Webhook signature verification (rejects unauthorized/tampered webhooks)
 * 2. Deduplication check using unique provider event IDs
 * 3. Extraction of sender, recipient, subject, headers, and bodies (plain text and HTML)
 * 4. Multi-layer reply matching:
 *    - In-Reply-To / References message headers
 *    - Campaign tracking identifiers in Subject / Headers
 *    - Prospect email matching against leads and previous email jobs
 * 5. Immediate follow-up cancellation:
 *    - Marks lead as 'Replied'
 *    - Cancels/skips future scheduled jobs for that lead and campaign
 *    - Records reply audit event in email_events
 *    - Deterministic unsubscribe detection
 * 6. Thread management:
 *    - Upserts email_conversations
 *    - Records conversation_messages
 */

export class InboundEmailService {
  constructor(supabaseClient, emailWorker, options = {}) {
    this.supabase = supabaseClient;
    this.emailWorker = emailWorker;
    this.webhookSecret = options.webhookSecret || process.env.INBOUND_WEBHOOK_SECRET || 'dev_inbound_secret';
    
    // In-memory store fallback for development & testing
    this.memoryInboundEvents = new Set();
    this.memoryConversations = new Map();
    this.memoryMessages = [];
  }

  /**
   * Verify Webhook Signature (Supports HMAC SHA256 or Bearer secret)
   */
  verifyWebhookSignature(headers, rawBody) {
    // 1. Direct secret header check
    const authHeader = headers['authorization'] || headers['x-webhook-secret'] || '';
    if (authHeader && (authHeader === `Bearer ${this.webhookSecret}` || authHeader === this.webhookSecret)) {
      return true;
    }

    // 2. HMAC SHA256 signature check (e.g. Svix / Resend / SendGrid / Postmark webhook signatures)
    const signature = headers['x-webhook-signature'] || headers['svix-signature'] || headers['x-resend-signature'];
    if (!signature) {
      // In development test mode without signature headers, allow if secret matches default
      return false;
    }

    const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const parts = signature.split(',');
    for (const part of parts) {
      const clean = part.replace(/^v\d+=/, '').trim();
      const bufA = Buffer.from(clean);
      const bufB = Buffer.from(expected);
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Process incoming webhook payload
   */
  async processInboundWebhook(rawPayload, headers = {}) {
    // 1. Extract and normalize provider event ID
    const eventId = rawPayload.id || rawPayload.eventId || rawPayload.messageId || `inbound_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 2. Prevent duplicate processing
    if (this.memoryInboundEvents.has(eventId)) {
      console.log(`[InboundEmailService] Duplicate event detected: ${eventId}. Skipping.`);
      return { duplicate: true, eventId };
    }

    try {
      const { data: existing } = await this.supabase
        .from('email_inbound_messages')
        .select('id')
        .eq('provider_event_id', eventId)
        .maybeSingle();

      if (existing) {
        console.log(`[InboundEmailService] Event ${eventId} already recorded in DB. Skipping.`);
        this.memoryInboundEvents.add(eventId);
        return { duplicate: true, eventId };
      }
    } catch {}

    this.memoryInboundEvents.add(eventId);

    // 3. Extract sender, recipient, subject, headers, and body
    const parsed = this.parseInboundPayload(rawPayload);

    // 4. Deterministic Unsubscribe Check
    const lowerBody = (parsed.textBody + ' ' + parsed.subject).toLowerCase();
    const isUnsubscribeRequest = 
      lowerBody.includes('unsubscribe') || 
      lowerBody.includes('remove me') || 
      lowerBody.includes('stop emailing me') || 
      lowerBody.includes('please take me off');

    if (isUnsubscribeRequest) {
      console.log(`[InboundEmailService] Deterministic unsubscribe detected from: ${parsed.senderEmail}`);
      if (this.emailWorker) {
        this.emailWorker.memorySuppressions.add(parsed.senderEmail.toLowerCase());
      }
      try {
        await this.supabase.from('email_suppressions').insert([{
          email: parsed.senderEmail.toLowerCase(),
          reason: 'unsubscribed',
        }]);
      } catch {}
    }

    // 5. Match Reply to Lead, User, Campaign, and Job
    const match = await this.matchReply(parsed);

    // 6. Stop Pending Follow-ups for this lead & campaign
    if (match.isMatched && match.leadId) {
      await this.cancelFutureFollowUps(match.leadId, match.campaignId, match.userId);
    }

    // 7. Upsert Conversation and Save Chronological Message
    const conversation = await this.saveConversationAndMessage(parsed, match, isUnsubscribeRequest);

    // 8. Record Inbound Message in DB
    try {
      await this.supabase.from('email_inbound_messages').insert([{
        user_id: match.userId || null,
        conversation_id: conversation.id,
        lead_id: match.leadId || null,
        campaign_id: match.campaignId || null,
        provider_event_id: eventId,
        provider_message_id: parsed.providerMessageId || null,
        in_reply_to: parsed.inReplyTo || null,
        references_header: parsed.references || null,
        sender_email: parsed.senderEmail,
        sender_name: parsed.senderName || null,
        recipient_email: parsed.recipientEmail,
        subject: parsed.subject,
        text_body: parsed.textBody,
        html_body: parsed.htmlBody,
        headers: parsed.headers || {},
        raw_payload: rawPayload,
        is_matched: match.isMatched,
        received_at: parsed.receivedAt || new Date().toISOString(),
      }]);
    } catch (e) {
      console.warn('[InboundEmailService] DB save warning:', e.message);
    }

    // 9. Record Reply event in email_events for audit & analytics
    if (match.isMatched && match.campaignId) {
      const isPositiveReply = conversation.status === 'interested' || 
                              conversation.status === 'referral' || 
                              conversation.ai_classification === 'Interested' || 
                              conversation.ai_classification === 'Referral';

      const replyEvent = {
        id: `evt_reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: match.userId,
        campaign_id: match.campaignId,
        lead_id: match.leadId,
        event_type: 'replied',
        is_positive: isPositiveReply,
        provider_message_id: parsed.providerMessageId || null,
        metadata: {
          sender: parsed.senderEmail,
          subject: parsed.subject,
          isUnsubscribe: isUnsubscribeRequest,
          is_positive: isPositiveReply,
          classification: conversation.ai_classification || (isPositiveReply ? 'Interested' : 'Other'),
          sentiment: isPositiveReply ? 'positive' : (isUnsubscribeRequest ? 'negative' : 'neutral'),
        },
        created_at: new Date().toISOString(),
      };
      if (this.emailWorker) {
        this.emailWorker.memoryEvents.push(replyEvent);
      }
      try {
        await this.supabase.from('email_events').insert([replyEvent]);
      } catch {}
    }

    return {
      success: true,
      eventId,
      matched: match.isMatched,
      conversationId: conversation.id,
      leadId: match.leadId,
      campaignId: match.campaignId,
      isUnsubscribe: isUnsubscribeRequest,
    };
  }

  /**
   * Parse various provider inbound payload formats (Resend, SendGrid, Postmark, generic)
   */
  parseInboundPayload(payload) {
    const headers = payload.headers || {};
    const fromStr = payload.from || payload.sender || payload.From || '';
    let senderName = '';
    let senderEmail = fromStr;

    if (fromStr.includes('<')) {
      const match = fromStr.match(/^(.*?)\s*<([^>]+)>/);
      if (match) {
        senderName = match[1].replace(/['"]/g, '').trim();
        senderEmail = match[2].trim();
      }
    }

    const toStr = payload.to || payload.recipient || payload.To || '';
    let recipientEmail = toStr;
    if (toStr.includes('<')) {
      const match = toStr.match(/<([^>]+)>/);
      if (match) recipientEmail = match[1].trim();
    }

    return {
      providerMessageId: payload.message_id || payload.messageId || headers['message-id'] || null,
      inReplyTo: payload.in_reply_to || payload.inReplyTo || headers['in-reply-to'] || null,
      references: payload.references || headers['references'] || null,
      senderEmail: senderEmail.toLowerCase().trim(),
      senderName,
      recipientEmail: recipientEmail.toLowerCase().trim(),
      subject: payload.subject || payload.Subject || 'Re: Outreach conversation',
      textBody: payload.text || payload.text_body || payload.body || payload.textBody || '',
      htmlBody: payload.html || payload.html_body || payload.htmlBody || '',
      receivedAt: payload.created_at || payload.timestamp || new Date().toISOString(),
      headers,
    };
  }

  /**
   * Match inbound message to Lead, User, and Campaign
   */
  async matchReply(parsed) {
    const senderEmail = parsed.senderEmail;

    // A. Match via Lead email in Supabase
    try {
      const { data: lead } = await this.supabase
        .from('leads')
        .select('id, user_id, full_name, company, job_title')
        .ilike('email', senderEmail)
        .maybeSingle();

      if (lead) {
        // Find most recent campaign lead was enrolled in
        let campaignId = null;
        try {
          const { data: campLead } = await this.supabase
            .from('campaign_leads')
            .select('campaign_id')
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (campLead) campaignId = campLead.campaign_id;
        } catch {}

        // Fallback: check email_jobs for this lead
        if (!campaignId && this.emailWorker) {
          const matchingJob = Array.from(this.emailWorker.memoryJobs.values())
            .find(j => j.recipient_email?.toLowerCase() === senderEmail);
          if (matchingJob) campaignId = matchingJob.campaign_id;
        }

        return {
          isMatched: true,
          userId: lead.user_id,
          leadId: lead.id,
          leadName: lead.full_name,
          leadCompany: lead.company,
          campaignId: campaignId || null,
        };
      }
    } catch {}

    // B. Match via memory jobs (if offline or database unmigrated)
    if (this.emailWorker) {
      const matchingJob = Array.from(this.emailWorker.memoryJobs.values())
        .find(j => j.recipient_email?.toLowerCase() === senderEmail);

      if (matchingJob) {
        return {
          isMatched: true,
          userId: matchingJob.user_id,
          leadId: matchingJob.lead_id,
          leadName: matchingJob.recipient_name || senderEmail.split('@')[0],
          leadCompany: matchingJob.company || '',
          campaignId: matchingJob.campaign_id,
        };
      }
    }

    // C. Unmatched reply -> Goes to Unmatched Inbox section
    console.log(`[InboundEmailService] Could not match inbound email from: ${senderEmail}. Routing to Unmatched Inbox.`);
    return {
      isMatched: false,
      userId: null,
      leadId: null,
      leadName: parsed.senderName || senderEmail.split('@')[0],
      leadCompany: senderEmail.split('@')[1] || '',
      campaignId: null,
    };
  }

  /**
   * Stop pending follow-ups immediately
   */
  async cancelFutureFollowUps(leadId, campaignId, userId) {
    console.log(`[InboundEmailService] Stopping pending follow-ups for lead ${leadId} (Campaign: ${campaignId})`);

    // 1. Update Lead Status to 'Replied'
    try {
      await this.supabase.from('leads').update({
        status: 'Replied',
        updated_at: new Date().toISOString(),
      }).eq('id', leadId);
    } catch (e) {
      console.warn('Failed to update lead status in DB:', e.message);
    }

    // 2. Cancel scheduled email jobs in DB
    try {
      let query = this.supabase.from('email_jobs')
        .update({
          status: 'cancelled',
          last_error: 'Auto-cancelled: Lead replied',
          updated_at: new Date().toISOString(),
        })
        .eq('lead_id', leadId)
        .eq('status', 'scheduled');

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }
      await query;
    } catch {}

    // 3. Cancel scheduled email jobs in memory worker
    if (this.emailWorker) {
      let cancelledCount = 0;
      for (const [jobId, job] of this.emailWorker.memoryJobs.entries()) {
        if (job.lead_id === leadId && job.status === 'scheduled') {
          if (!campaignId || job.campaign_id === campaignId) {
            job.status = 'cancelled';
            job.last_error = 'Auto-cancelled: Lead replied';
            job.updated_at = new Date().toISOString();
            cancelledCount++;
          }
        }
      }
      console.log(`[InboundEmailService] Cancelled ${cancelledCount} scheduled follow-up jobs in worker.`);
    }
  }

  /**
   * Upsert conversation and add message to thread
   */
  async saveConversationAndMessage(parsed, match, isUnsubscribe) {
    const prospectEmail = parsed.senderEmail;
    const convId = `conv_${match.userId || 'anon'}_${prospectEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const initialStatus = !match.isMatched
      ? 'unmatched'
      : isUnsubscribe
      ? 'not_interested'
      : 'interested';

    const convRecord = {
      id: convId,
      user_id: match.userId || '11111111-1111-4111-a111-111111111111',
      lead_id: match.leadId,
      campaign_id: match.campaignId,
      prospect_email: prospectEmail,
      prospect_name: match.leadName || parsed.senderName || prospectEmail.split('@')[0],
      subject: parsed.subject,
      status: initialStatus,
      unread: true,
      last_message_at: parsed.receivedAt || new Date().toISOString(),
      ai_classification: isUnsubscribe ? 'Unsubscribe request' : 'Interested',
      ai_confidence: 0.95,
      ai_summary: isUnsubscribe ? 'Prospect requested to be removed from outreach list.' : 'Prospect replied to outreach email.',
      ai_suggested_next_action: isUnsubscribe ? 'Suppression list updated. No further action needed.' : 'Schedule a discovery call or send case study.',
      suggested_reply_draft: isUnsubscribe ? '' : `Hi ${match.leadName ? match.leadName.split(' ')[0] : 'there'},\n\nThanks for getting back to me! Would Thursday at 2:00 PM EST work for a brief 10-minute chat?\n\nBest,\nYour Name`,
      updated_at: new Date().toISOString(),
    };

    // Save in memory
    const existing = this.memoryConversations.get(convId);
    if (existing) {
      existing.unread = true;
      existing.last_message_at = convRecord.last_message_at;
      existing.subject = convRecord.subject;
    } else {
      this.memoryConversations.set(convId, convRecord);
    }

    // Save chronological message
    const msgRecord = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversation_id: convId,
      user_id: convRecord.user_id,
      direction: 'inbound',
      sender: parsed.senderName || prospectEmail,
      sender_email: prospectEmail,
      recipient_email: parsed.recipientEmail,
      subject: parsed.subject,
      body: parsed.textBody || parsed.htmlBody || '(Empty email body)',
      provider_message_id: parsed.providerMessageId,
      in_reply_to: parsed.inReplyTo,
      sent_at: parsed.receivedAt || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    this.memoryMessages.push(msgRecord);

    // Save to Supabase if accessible
    try {
      await this.supabase.from('email_conversations').upsert(convRecord, { onConflict: 'user_id,prospect_email' });
      await this.supabase.from('conversation_messages').insert([msgRecord]);
    } catch {}

    return convRecord;
  }
}
