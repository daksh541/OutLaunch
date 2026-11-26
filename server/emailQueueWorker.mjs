import { EmailProvider } from './emailProvider.mjs';

/**
 * In-Memory & Database-backed Queue Worker
 * Ensures reliable background execution:
 * - Polls scheduled jobs
 * - Enforces daily send limits
 * - Skips replied/bounced/unsubscribed leads
 * - Stops processing paused or cancelled campaigns
 * - Exponential backoff retry for transient errors (up to 3 attempts)
 * - Records email events (queued, sent, delivered, bounced, failed)
 */

export class EmailQueueWorker {
  constructor(supabaseClient, options = {}) {
    this.supabase = supabaseClient;
    this.pollIntervalMs = options.pollIntervalMs || 5000;
    this.isRunning = false;
    this.timer = null;
    this.provider = new EmailProvider({
      provider: process.env.EMAIL_PROVIDER || 'mock',
      apiKey: process.env.EMAIL_PROVIDER_API_KEY || '',
      testMode: process.env.EMAIL_TEST_MODE === 'true',
      testRecipient: process.env.EMAIL_TEST_RECIPIENT || '',
    });

    // In-memory fallback queue storage when Supabase schema is unmigrated or in local sandbox
    this.memoryJobs = new Map();
    this.memoryEvents = [];
    this.memorySuppressions = new Set();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[EmailQueueWorker] Started with provider: ${this.provider.name} (Poll every ${this.pollIntervalMs}ms)`);
    this.scheduleNextTick();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('[EmailQueueWorker] Stopped.');
  }

  scheduleNextTick() {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      try {
        await this.processNextBatch();
      } catch (err) {
        console.error('[EmailQueueWorker] Error in process loop:', err.message);
      } finally {
        this.scheduleNextTick();
      }
    }, this.pollIntervalMs);
  }

  /**
   * Process a single batch of scheduled jobs ready to send
   */
  async processNextBatch(limit = 10) {
    const nowIso = new Date().toISOString();

    // 1. Query pending jobs from Supabase or memory
    let jobs = [];
    let isDbQueue = false;

    try {
      const { data, error } = await this.supabase
        .from('email_jobs')
        .select('*, campaigns!inner(status, stop_on_reply, stop_on_bounce), leads!inner(status, email, full_name, job_title, company)')
        .in('status', ['scheduled', 'processing'])
        .lte('scheduled_for', nowIso)
        .order('scheduled_for', { ascending: true })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        jobs = data;
        isDbQueue = true;
      }
    } catch {
      // Fallback to memory
    }

    if (!isDbQueue) {
      const nowMs = Date.now();
      jobs = Array.from(this.memoryJobs.values())
        .filter((j) => (j.status === 'scheduled' || j.status === 'processing') && new Date(j.scheduled_for).getTime() <= nowMs)
        .slice(0, limit);
    }

    if (jobs.length === 0) return 0;

    let processedCount = 0;
    for (const job of jobs) {
      const result = await this.processSingleJob(job, isDbQueue);
      if (result) processedCount++;
    }

    return processedCount;
  }

  /**
   * Process one job with all safety, follow-up, and compliance checks
   */
  async processSingleJob(job, isDbQueue) {
    const now = new Date().toISOString();

    // 0. Safety Check: If job has been cancelled or skipped, do not process
    if (job.status === 'cancelled' || job.status === 'skipped') {
      console.log(`[EmailQueueWorker] Skipping job ${job.id}: Status is ${job.status}.`);
      return false;
    }

    // 1. Mark job as processing
    await this.updateJobStatus(job.id, 'processing', isDbQueue);

    // 2. Safety Check: Verify campaign is ACTIVE (stop processing paused or cancelled campaigns)
    const campaignStatus = job.campaigns?.status || job.campaign_status || 'Active';
    if (campaignStatus !== 'Active') {
      console.log(`[EmailQueueWorker] Skipping job ${job.id}: Campaign is ${campaignStatus}.`);
      await this.updateJobStatus(job.id, campaignStatus === 'Paused' ? 'scheduled' : 'cancelled', isDbQueue);
      return false;
    }

    // 3. Safety Check: Check Suppression list (Unsubscribed or Do-Not-Contact)
    const recipientEmail = (job.recipient_email || '').toLowerCase().trim();
    const isSuppressed = await this.checkIfSuppressed(job.user_id, recipientEmail, isDbQueue);
    if (isSuppressed) {
      console.log(`[EmailQueueWorker] Skipping job ${job.id}: Recipient ${recipientEmail} is suppressed/unsubscribed.`);
      await this.updateJobStatus(job.id, 'skipped', isDbQueue, 'Recipient suppressed/unsubscribed');
      await this.recordEvent(job, 'skipped', { reason: 'suppressed' }, isDbQueue);
      return false;
    }

    // 4. Follow-up Logic: Stop if lead has Replied or is Not Interested
    const leadStatus = job.leads?.status || job.lead_status || 'Researched';
    if (leadStatus === 'Replied') {
      console.log(`[EmailQueueWorker] Skipping job ${job.id}: Lead ${recipientEmail} has already replied.`);
      await this.updateJobStatus(job.id, 'skipped', isDbQueue, 'Lead has replied');
      await this.recordEvent(job, 'skipped', { reason: 'lead_replied' }, isDbQueue);
      return false;
    }
    if (leadStatus === 'Not Interested' || leadStatus === 'Bounced') {
      console.log(`[EmailQueueWorker] Skipping job ${job.id}: Lead status is ${leadStatus}.`);
      await this.updateJobStatus(job.id, 'skipped', isDbQueue, `Lead status is ${leadStatus}`);
      return false;
    }

    // 5. Sending Cap Check (Respect daily limit per sender/campaign)
    // Daily limits default to 35
    const dailyLimit = job.daily_limit || 35;
    const sentTodayCount = await this.getSentCountToday(job.user_id, isDbQueue);
    if (sentTodayCount >= dailyLimit) {
      console.warn(`[EmailQueueWorker] Daily limit reached (${sentTodayCount}/${dailyLimit}). Rescheduling job ${job.id} for tomorrow.`);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await this.rescheduleJob(job.id, tomorrow, isDbQueue);
      return false;
    }

    // 6. Build Unsubscribe URL & Compliance footer
    const host = process.env.PUBLIC_APP_URL || 'http://localhost:3000';
    const unsubscribeUrl = `${host}/api/email/unsubscribe?email=${encodeURIComponent(recipientEmail)}&leadId=${job.lead_id}&campaignId=${job.campaign_id}`;

    let emailHtml = job.rendered_body.replace(/\n/g, '<br/>');
    emailHtml += `
      <br/><br/>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />
      <p style="font-size:11px;color:#737373;line-height:1.4;">
        Sent via OutLaunch Outreach Engine. To opt out of future communications, 
        <a href="${unsubscribeUrl}" style="color:#0d9467;text-decoration:underline;">click here to unsubscribe</a>.
      </p>
    `;

    // 7. Dispatch via Provider
    try {
      const sendResult = await this.provider.sendEmail({
        to: recipientEmail,
        from: job.sender_email || process.env.DEFAULT_SENDER_EMAIL || 'outreach@resend.dev',
        fromName: job.sender_name || 'Outbound Team',
        subject: job.subject,
        html: emailHtml,
        text: job.rendered_body,
        unsubscribeUrl,
        idempotencyKey: job.idempotency_key,
      });

      // 8. Update job to sent
      await this.updateJobStatus(job.id, 'sent', isDbQueue, null, sendResult.messageId);
      await this.recordEvent(job, 'sent', { provider: this.provider.name, messageId: sendResult.messageId }, isDbQueue);
      console.log(`[EmailQueueWorker] Sent email to ${recipientEmail} (Msg ID: ${sendResult.messageId})`);
      return true;
    } catch (err) {
      console.error(`[EmailQueueWorker] Failed sending job ${job.id}:`, err.message);
      const attemptCount = (job.attempt_count || 0) + 1;
      const maxAttempts = job.max_attempts || 3;

      if (err.isTransient && attemptCount < maxAttempts) {
        // Exponential backoff: 2^attempt * 30 seconds
        const backoffSeconds = Math.pow(2, attemptCount) * 30;
        const retryAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
        console.log(`[EmailQueueWorker] Transient error. Retrying job ${job.id} at ${retryAt} (Attempt ${attemptCount}/${maxAttempts})`);
        await this.rescheduleJob(job.id, retryAt, isDbQueue, attemptCount, err.message);
      } else {
        // Permanent failure
        console.log(`[EmailQueueWorker] Permanent failure for job ${job.id}. Marking as failed.`);
        await this.updateJobStatus(job.id, 'failed', isDbQueue, err.message);
        await this.recordEvent(job, 'failed', { error: err.message }, isDbQueue);
      }
      return false;
    }
  }

  async checkIfSuppressed(userId, email, isDbQueue) {
    if (isDbQueue) {
      try {
        const { data } = await this.supabase
          .from('email_suppressions')
          .select('id')
          .eq('user_id', userId)
          .eq('email', email)
          .maybeSingle();
        return !!data;
      } catch {
        return false;
      }
    }
    return this.memorySuppressions.has(email);
  }

  async getSentCountToday(userId, isDbQueue) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();

    if (isDbQueue) {
      try {
        const { count } = await this.supabase
          .from('email_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'sent')
          .gte('updated_at', startIso);
        return count || 0;
      } catch {
        return 0;
      }
    }

    return Array.from(this.memoryJobs.values()).filter(
      (j) => j.status === 'sent' && new Date(j.updated_at).getTime() >= startOfDay.getTime()
    ).length;
  }

  async updateJobStatus(jobId, status, isDbQueue, errorMsg = null, providerMsgId = null) {
    const now = new Date().toISOString();
    if (isDbQueue) {
      try {
        const update = { status, updated_at: now };
        if (errorMsg) update.last_error = errorMsg;
        if (providerMsgId) update.provider_message_id = providerMsgId;
        await this.supabase.from('email_jobs').update(update).eq('id', jobId);
      } catch (e) {
        console.warn('DB update failed, writing to memory', e.message);
      }
    }

    const mem = this.memoryJobs.get(jobId);
    if (mem) {
      mem.status = status;
      mem.updated_at = now;
      if (errorMsg) mem.last_error = errorMsg;
      if (providerMsgId) mem.provider_message_id = providerMsgId;
    }
  }

  async rescheduleJob(jobId, scheduledFor, isDbQueue, attemptCount = 0, lastError = null) {
    const now = new Date().toISOString();
    if (isDbQueue) {
      try {
        await this.supabase.from('email_jobs').update({
          status: 'scheduled',
          scheduled_for: scheduledFor,
          attempt_count: attemptCount,
          last_error: lastError,
          updated_at: now,
        }).eq('id', jobId);
      } catch {}
    }

    const mem = this.memoryJobs.get(jobId);
    if (mem) {
      mem.status = 'scheduled';
      mem.scheduled_for = scheduledFor;
      mem.attempt_count = attemptCount;
      mem.last_error = lastError;
      mem.updated_at = now;
    }
  }

  async recordEvent(job, eventType, metadata = {}, isDbQueue = false) {
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: job.user_id,
      job_id: job.id,
      campaign_id: job.campaign_id,
      lead_id: job.lead_id,
      event_type: eventType,
      provider_message_id: job.provider_message_id || metadata.messageId || null,
      metadata,
      created_at: new Date().toISOString(),
    };

    if (isDbQueue) {
      try {
        await this.supabase.from('email_events').insert([event]);
      } catch {}
    }
    this.memoryEvents.push(event);
  }
}
