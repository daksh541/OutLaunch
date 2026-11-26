/**
 * Analytics Service for Campaign Performance & Telemetry
 * Provides:
 * - Overview KPI cards with previous-period comparison & deltas
 * - Time-series trends (daily, weekly, monthly)
 * - Campaign performance table with sorting, filtering, and pagination
 * - Campaign conversion funnel (Targeted -> Sent -> Delivered -> Replied -> Positive)
 * - Sequence-step breakdown analytics
 * - Reply classification breakdown (sentiment & categories)
 * - CSV export with formula injection sanitization
 */

export class AnalyticsService {
  constructor(supabaseClient, emailWorker = null, inboundService = null) {
    this.supabase = supabaseClient;
    this.emailWorker = emailWorker;
    this.inboundService = inboundService;
  }

  /**
   * Helper: sanitize a cell value against CSV formula injection
   * Escapes values starting with '=', '+', '-', '@', '\t', '\r'
   */
  sanitizeCsvCell(val) {
    if (val === null || val === undefined) return '';
    let str = String(val);
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerousChars.some(char => str.startsWith(char))) {
      str = `'${str}`;
    }
    // Escape internal double quotes and wrap in quotes if it has comma, quotes, or newlines
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Safe percentage calculation with 1 decimal place
   */
  calcRate(numerator, denominator) {
    if (!denominator || denominator <= 0) return 0.0;
    const rate = (numerator / denominator) * 100;
    return Number(rate.toFixed(1));
  }

  /**
   * Compute date windows for current & previous period
   */
  getDateRange(period = '30d', customStart = null, customEnd = null) {
    const now = new Date();
    let currentStart, currentEnd = customEnd ? new Date(customEnd) : now;

    if (customStart) {
      currentStart = new Date(customStart);
    } else {
      currentStart = new Date(now);
      if (period === '7d') currentStart.setDate(now.getDate() - 7);
      else if (period === '90d') currentStart.setDate(now.getDate() - 90);
      else if (period === 'all') currentStart = new Date(0); // Epoch
      else currentStart.setDate(now.getDate() - 30); // Default 30d
    }

    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const prevEnd = new Date(currentStart.getTime());
    const prevStart = new Date(currentStart.getTime() - durationMs);

    return {
      current: { start: currentStart, end: currentEnd },
      previous: { start: prevStart, end: prevEnd },
      isAllTime: period === 'all',
    };
  }

  /**
   * Fetch all email events for user, optionally filtered by campaign and date range
   */
  async getEvents(userId, { campaignId = null, start = null, end = null } = {}) {
    let events = [];

    // 1. Try DB
    if (this.supabase) {
      try {
        let query = this.supabase
          .from('email_events')
          .select('*')
          .eq('user_id', userId);

        if (campaignId) query = query.eq('campaign_id', campaignId);
        if (start) query = query.gte('created_at', start.toISOString());
        if (end) query = query.lte('created_at', end.toISOString());

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          events = data;
        }
      } catch {}
    }

    // 2. Merge with worker memory events if DB empty or in memory mode
    if (this.emailWorker && this.emailWorker.memoryEvents) {
      const memEvents = this.emailWorker.memoryEvents.filter(e => {
        if (e.user_id && e.user_id !== userId) return false;
        if (campaignId && e.campaign_id !== campaignId) return false;
        if (start && new Date(e.created_at) < start) return false;
        if (end && new Date(e.created_at) > end) return false;
        return true;
      });

      // Avoid duplicates if both DB and memory have same IDs
      const seenIds = new Set(events.map(e => e.id));
      for (const me of memEvents) {
        if (!seenIds.has(me.id)) {
          events.push(me);
          seenIds.add(me.id);
        }
      }
    }

    return events;
  }

  /**
   * Fetch conversations for user
   */
  async getConversations(userId, campaignId = null) {
    let conversations = [];

    if (this.supabase) {
      try {
        let query = this.supabase
          .from('email_conversations')
          .select('*')
          .eq('user_id', userId);
        if (campaignId) query = query.eq('campaign_id', campaignId);

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          conversations = data;
        }
      } catch {}
    }

    if (this.inboundService && this.inboundService.memoryConversations) {
      const memConvs = Array.from(this.inboundService.memoryConversations.values()).filter(c => {
        if (c.user_id && c.user_id !== userId) return false;
        if (campaignId && c.campaign_id !== campaignId) return false;
        return true;
      });
      const seenIds = new Set(conversations.map(c => c.id));
      for (const mc of memConvs) {
        if (!seenIds.has(mc.id)) {
          conversations.push(mc);
          seenIds.add(mc.id);
        }
      }
    }

    return conversations;
  }

  /**
   * Fetch enrolled leads count (targeted count)
   */
  async getTargetedCount(userId, campaignId = null) {
    let count = 0;
    if (this.supabase) {
      try {
        let query = this.supabase
          .from('campaign_leads')
          .select('lead_id', { count: 'exact', head: true });
        if (campaignId) query = query.eq('campaign_id', campaignId);
        if (userId) query = query.eq('user_id', userId);

        const res = await query;
        if (res.count) count = res.count;
      } catch {}
    }

    // Fallback: count distinct leads in memory jobs
    if (count === 0 && this.emailWorker && this.emailWorker.memoryJobs) {
      const distinctLeads = new Set();
      for (const job of this.emailWorker.memoryJobs.values()) {
        if (job.user_id === userId && (!campaignId || job.campaign_id === campaignId)) {
          distinctLeads.add(job.lead_id);
        }
      }
      count = distinctLeads.size;
    }

    return count;
  }

  /**
   * Calculate metrics from a set of events & conversations
   */
  computeMetrics(events, conversations = [], targetedCount = 0) {
    // 1. Sent: unique successful sent events (excluding failed or scheduled)
    const sentEvents = events.filter(e => e.event_type === 'sent');
    const sentCount = sentEvents.length;

    // 2. Delivered: count delivered events; if provider does not emit separate delivered events,
    // default to sent minus bounces.
    const deliveredEvents = events.filter(e => e.event_type === 'delivered');
    const bounceEvents = events.filter(e => e.event_type === 'bounced' || e.event_type === 'bounce');
    const bounceCount = bounceEvents.length;

    const deliveredCount = deliveredEvents.length > 0 
      ? deliveredEvents.length 
      : Math.max(0, sentCount - bounceCount);

    // 3. Unique replied-to leads
    const repliedLeads = new Set();
    const positiveLeads = new Set();

    // From email_events
    for (const e of events) {
      if (e.event_type === 'replied' || e.event_type === 'reply') {
        const leadKey = e.lead_id || e.metadata?.sender || e.metadata?.email || e.id;
        repliedLeads.add(leadKey);

        const isPositive = e.is_positive === true || 
                           e.metadata?.is_positive === true || 
                           e.metadata?.sentiment === 'positive' ||
                           e.metadata?.classification === 'Interested' ||
                           e.metadata?.classification === 'Referral';
        if (isPositive) {
          positiveLeads.add(leadKey);
        }
      }
    }

    // From conversations (match against time range if events didn't catch)
    for (const c of conversations) {
      const leadKey = c.lead_id || c.prospect_email;
      if (leadKey) {
        repliedLeads.add(leadKey);
        const isPos = c.status === 'interested' || 
                      c.status === 'referral' || 
                      c.ai_classification === 'Interested' || 
                      c.ai_classification === 'Referral';
        if (isPos) {
          positiveLeads.add(leadKey);
        }
      }
    }

    const replyCount = repliedLeads.size;
    const positiveReplyCount = positiveLeads.size;

    // 4. Unsubscribes (unique leads)
    const unsubLeads = new Set();
    for (const e of events) {
      if (e.event_type === 'unsubscribed' || e.event_type === 'unsubscribe') {
        unsubLeads.add(e.lead_id || e.metadata?.email || e.id);
      }
    }
    const unsubCount = unsubLeads.size;

    // 5. Rates (all formatted with safe 0 denominator handling)
    const deliveryRate = this.calcRate(deliveredCount, sentCount);
    const replyRate = this.calcRate(replyCount, deliveredCount);
    const positiveReplyRate = this.calcRate(positiveReplyCount, deliveredCount);
    const bounceRate = this.calcRate(bounceCount, sentCount);
    const unsubscribeRate = this.calcRate(unsubCount, deliveredCount);

    return {
      targeted_leads: targetedCount,
      sent: sentCount,
      delivered: deliveredCount,
      delivery_rate: deliveryRate,
      replies: replyCount,
      reply_rate: replyRate,
      positive_replies: positiveReplyCount,
      positive_reply_rate: positiveReplyRate,
      bounces: bounceCount,
      bounce_rate: bounceRate,
      unsubscribes: unsubCount,
      unsubscribe_rate: unsubscribeRate,
    };
  }

  /**
   * GET /api/analytics/overview
   */
  async getOverview({ userId, campaignId = null, period = '30d', startDate = null, endDate = null }) {
    const { current, previous, isAllTime } = this.getDateRange(period, startDate, endDate);

    const targetedCount = await this.getTargetedCount(userId, campaignId);
    const currentEvents = await this.getEvents(userId, { campaignId, start: isAllTime ? null : current.start, end: current.end });
    const currentConversations = await this.getConversations(userId, campaignId);

    const currentMetrics = this.computeMetrics(currentEvents, currentConversations, targetedCount);

    let prevMetrics = null;
    let deltas = {
      sent_change: 0,
      sent_change_pct: 0,
      delivery_rate_change: 0,
      reply_rate_change: 0,
      positive_reply_rate_change: 0,
      bounce_rate_change: 0,
      unsubscribe_rate_change: 0,
    };

    if (!isAllTime) {
      const prevEvents = await this.getEvents(userId, { campaignId, start: previous.start, end: previous.end });
      prevMetrics = this.computeMetrics(prevEvents, [], targetedCount);

      const sentDiff = currentMetrics.sent - prevMetrics.sent;
      const sentChangePct = prevMetrics.sent > 0 
        ? Number(((sentDiff / prevMetrics.sent) * 100).toFixed(1))
        : (currentMetrics.sent > 0 ? 100.0 : 0.0);

      deltas = {
        sent_change: sentDiff,
        sent_change_pct: sentChangePct,
        delivery_rate_change: Number((currentMetrics.delivery_rate - prevMetrics.delivery_rate).toFixed(1)),
        reply_rate_change: Number((currentMetrics.reply_rate - prevMetrics.reply_rate).toFixed(1)),
        positive_reply_rate_change: Number((currentMetrics.positive_reply_rate - prevMetrics.positive_reply_rate).toFixed(1)),
        bounce_rate_change: Number((currentMetrics.bounce_rate - prevMetrics.bounce_rate).toFixed(1)),
        unsubscribe_rate_change: Number((currentMetrics.unsubscribe_rate - prevMetrics.unsubscribe_rate).toFixed(1)),
      };
    }

    return {
      period,
      start_date: current.start.toISOString(),
      end_date: current.end.toISOString(),
      metrics: currentMetrics,
      previous_metrics: prevMetrics,
      deltas,
    };
  }

  /**
   * GET /api/analytics/trends
   * Time-series breakdown by daily, weekly, or monthly intervals
   */
  async getTrends({ userId, campaignId = null, interval = 'daily', range = '30d', startDate = null, endDate = null }) {
    const { current, isAllTime } = this.getDateRange(range, startDate, endDate);
    const start = isAllTime ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : current.start;
    const end = current.end;

    const events = await this.getEvents(userId, { campaignId, start, end });

    // Generate date map buckets
    const buckets = new Map();
    const curDate = new Date(start);
    curDate.setHours(0, 0, 0, 0);

    const stepMs = interval === 'monthly' 
      ? 30 * 24 * 60 * 60 * 1000 
      : interval === 'weekly' 
      ? 7 * 24 * 60 * 60 * 1000 
      : 24 * 60 * 60 * 1000;

    while (curDate <= end) {
      const dateKey = curDate.toISOString().slice(0, 10);
      const label = curDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      buckets.set(dateKey, {
        date: dateKey,
        label,
        sent: 0,
        delivered: 0,
        replies: 0,
        positive_replies: 0,
        bounces: 0,
      });
      curDate.setTime(curDate.getTime() + stepMs);
    }

    // Populate counts from events
    for (const e of events) {
      const eventDate = new Date(e.created_at);
      eventDate.setHours(0, 0, 0, 0);
      const dateKey = eventDate.toISOString().slice(0, 10);

      // Find best bucket match
      let bucket = buckets.get(dateKey);
      if (!bucket) {
        const label = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        bucket = { date: dateKey, label, sent: 0, delivered: 0, replies: 0, positive_replies: 0, bounces: 0 };
        buckets.set(dateKey, bucket);
      }

      if (e.event_type === 'sent') bucket.sent += 1;
      else if (e.event_type === 'delivered') bucket.delivered += 1;
      else if (e.event_type === 'bounced' || e.event_type === 'bounce') bucket.bounces += 1;
      else if (e.event_type === 'replied' || e.event_type === 'reply') {
        bucket.replies += 1;
        const isPos = e.is_positive === true || 
                      e.metadata?.is_positive === true || 
                      e.metadata?.sentiment === 'positive' ||
                      e.metadata?.classification === 'Interested' ||
                      e.metadata?.classification === 'Referral';
        if (isPos) bucket.positive_replies += 1;
      }
    }

    // Fill in delivered defaults if separate delivered webhook was not received
    for (const b of buckets.values()) {
      if (b.delivered === 0 && b.sent > 0) {
        b.delivered = Math.max(0, b.sent - b.bounces);
      }
    }

    const sortedBuckets = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      interval,
      range,
      data: sortedBuckets,
    };
  }

  /**
   * GET /api/analytics/campaigns
   * Paginated list of campaigns with aggregated performance metrics
   */
  async getCampaigns({
    userId,
    search = '',
    status = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
    startDate = null,
    endDate = null,
  }) {
    let campaignsList = [];

    // 1. Fetch campaigns from DB
    if (this.supabase) {
      try {
        let query = this.supabase
          .from('campaigns')
          .select('*')
          .eq('user_id', userId);

        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          campaignsList = data;
        }
      } catch {}
    }

    // 2. Fallback to memory jobs / mock campaigns if none in DB
    if (campaignsList.length === 0 && this.emailWorker && this.emailWorker.memoryJobs) {
      const campaignMap = new Map();
      for (const job of this.emailWorker.memoryJobs.values()) {
        if (job.user_id === userId) {
          if (!campaignMap.has(job.campaign_id)) {
            campaignMap.set(job.campaign_id, {
              id: job.campaign_id,
              user_id: userId,
              name: `Campaign ${job.campaign_id.slice(0, 8)}`,
              status: 'Active',
              created_at: job.created_at || new Date().toISOString(),
            });
          }
        }
      }
      campaignsList = Array.from(campaignMap.values());
    }

    // 3. For each campaign, compute its metrics
    const results = [];
    for (const camp of campaignsList) {
      // Filter by search
      if (search && !camp.name.toLowerCase().includes(search.toLowerCase())) {
        continue;
      }
      // Filter by status if not already
      if (status !== 'all' && camp.status?.toLowerCase() !== status.toLowerCase()) {
        continue;
      }

      const targetedCount = await this.getTargetedCount(userId, camp.id);
      const events = await this.getEvents(userId, { 
        campaignId: camp.id,
        start: startDate ? new Date(startDate) : null,
        end: endDate ? new Date(endDate) : null,
      });
      const convs = await this.getConversations(userId, camp.id);
      const metrics = this.computeMetrics(events, convs, targetedCount);

      results.push({
        id: camp.id,
        name: camp.name,
        status: camp.status || 'Active',
        created_at: camp.created_at,
        daily_limit: camp.daily_limit || 35,
        ...metrics,
      });
    }

    // 4. Sort results
    results.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = valA || 0;
      valB = valB || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    // 5. Paginate
    const total = results.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.max(1, parseInt(limit, 10));
    const totalPages = Math.ceil(total / pageLimit) || 1;
    const startIndex = (pageNum - 1) * pageLimit;
    const paginated = results.slice(startIndex, startIndex + pageLimit);

    return {
      campaigns: paginated,
      pagination: {
        total,
        page: pageNum,
        limit: pageLimit,
        total_pages: totalPages,
      },
    };
  }

  /**
   * GET /api/analytics/campaigns/:campaignId
   * Detailed overview and conversion funnel for a specific campaign
   */
  async getCampaignDetail({ userId, campaignId }) {
    let campaign = null;

    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .maybeSingle();
        campaign = data;
      } catch {}
    }

    if (!campaign) {
      campaign = {
        id: campaignId,
        name: 'Outreach Campaign',
        status: 'Active',
        created_at: new Date().toISOString(),
      };
    }

    const targetedCount = await this.getTargetedCount(userId, campaignId);
    const events = await this.getEvents(userId, { campaignId });
    const convs = await this.getConversations(userId, campaignId);
    const metrics = this.computeMetrics(events, convs, targetedCount);

    // Funnel stages: Targeted -> Sent -> Delivered -> Replied -> Positive Replies
    const stages = [
      {
        stage: 'Targeted Leads',
        count: metrics.targeted_leads,
        conversion_rate: 100.0,
        drop_off_pct: 0.0,
      },
      {
        stage: 'Emails Sent',
        count: metrics.sent,
        conversion_rate: this.calcRate(metrics.sent, metrics.targeted_leads),
        drop_off_pct: metrics.targeted_leads > 0 
          ? Number(Math.max(0, 100 - (metrics.sent / metrics.targeted_leads) * 100).toFixed(1)) 
          : 0.0,
      },
      {
        stage: 'Delivered',
        count: metrics.delivered,
        conversion_rate: this.calcRate(metrics.delivered, metrics.sent),
        drop_off_pct: metrics.sent > 0 
          ? Number(Math.max(0, 100 - (metrics.delivered / metrics.sent) * 100).toFixed(1)) 
          : 0.0,
      },
      {
        stage: 'Replies',
        count: metrics.replies,
        conversion_rate: this.calcRate(metrics.replies, metrics.delivered),
        drop_off_pct: metrics.delivered > 0 
          ? Number(Math.max(0, 100 - (metrics.replies / metrics.delivered) * 100).toFixed(1)) 
          : 0.0,
      },
      {
        stage: 'Positive Replies',
        count: metrics.positive_replies,
        conversion_rate: this.calcRate(metrics.positive_replies, metrics.replies),
        drop_off_pct: metrics.replies > 0 
          ? Number(Math.max(0, 100 - (metrics.positive_replies / metrics.replies) * 100).toFixed(1)) 
          : 0.0,
      },
    ];

    const overallConversion = this.calcRate(metrics.positive_replies, metrics.targeted_leads || metrics.delivered);

    return {
      campaign,
      metrics,
      funnel: {
        stages,
        overall_conversion_rate: overallConversion,
      },
    };
  }

  /**
   * GET /api/analytics/campaigns/:campaignId/sequence
   * Sequence step performance breakdown
   */
  async getSequencePerformance({ userId, campaignId }) {
    let steps = [];

    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('campaign_sequence_steps')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('step_number', { ascending: true });
        if (data && Array.isArray(data)) {
          steps = data;
        }
      } catch {}
    }

    if (steps.length === 0) {
      // Default to standard sequence steps
      steps = [
        { step_number: 1, title: 'Initial Outreach', subject: 'Quick question regarding your growth', delay_days: 0 },
        { step_number: 2, title: 'Value Follow-up', subject: 'Re: Quick question regarding your growth', delay_days: 3 },
        { step_number: 3, title: 'Case Study & Proof', subject: 'How similar teams solved this', delay_days: 7 },
      ];
    }

    const events = await this.getEvents(userId, { campaignId });

    const stepBreakdown = steps.map((s, idx) => {
      const stepNum = s.step_number || idx + 1;
      const stepId = s.id || `step_${stepNum}`;

      // Match events belonging to this step
      const stepSentEvents = events.filter(e => {
        if (e.event_type !== 'sent') return false;
        return e.metadata?.step_number === stepNum || 
               e.metadata?.step_id === stepId || 
               e.job_id?.includes(`step_${stepNum}`) ||
               (stepNum === 1 && !e.metadata?.step_number);
      });

      const stepSentCount = stepSentEvents.length;
      const stepBounceEvents = events.filter(e => {
        if (e.event_type !== 'bounced') return false;
        return e.metadata?.step_number === stepNum || e.metadata?.step_id === stepId;
      });
      const stepBounceCount = stepBounceEvents.length;

      const stepDeliveredCount = Math.max(0, stepSentCount - stepBounceCount);

      const stepReplyEvents = events.filter(e => {
        if (e.event_type !== 'replied') return false;
        return e.metadata?.step_number === stepNum || e.metadata?.step_id === stepId || (stepNum === 1 && !e.metadata?.step_number);
      });

      const stepRepliesCount = new Set(stepReplyEvents.map(e => e.lead_id || e.id)).size;
      const stepPosRepliesCount = new Set(
        stepReplyEvents.filter(e => e.is_positive || e.metadata?.is_positive).map(e => e.lead_id || e.id)
      ).size;

      return {
        step_number: stepNum,
        title: s.title || `Step ${stepNum}`,
        subject: s.subject || 'Follow up',
        delay_days: s.delay_days || 0,
        sent: stepSentCount,
        delivered: stepDeliveredCount,
        delivery_rate: this.calcRate(stepDeliveredCount, stepSentCount),
        replies: stepRepliesCount,
        reply_rate: this.calcRate(stepRepliesCount, stepDeliveredCount),
        positive_replies: stepPosRepliesCount,
        positive_reply_rate: this.calcRate(stepPosRepliesCount, stepDeliveredCount),
        bounces: stepBounceCount,
        bounce_rate: this.calcRate(stepBounceCount, stepSentCount),
      };
    });

    return {
      campaign_id: campaignId,
      steps: stepBreakdown,
    };
  }

  /**
   * GET /api/analytics/campaigns/:campaignId/replies
   * Reply classification & sentiment breakdown
   */
  async getRepliesBreakdown({ userId, campaignId }) {
    const convs = await this.getConversations(userId, campaignId);
    const events = await this.getEvents(userId, { campaignId });

    const categories = {
      interested: 0,
      question: 0,
      not_interested: 0,
      referral: 0,
      out_of_office: 0,
      unsubscribe: 0,
      other: 0,
    };

    const replyList = [];

    for (const c of convs) {
      const cat = (c.status || c.ai_classification || 'other').toLowerCase();
      if (cat.includes('interest')) categories.interested++;
      else if (cat.includes('question')) categories.question++;
      else if (cat.includes('referral')) categories.referral++;
      else if (cat.includes('out_of_office') || cat.includes('office')) categories.out_of_office++;
      else if (cat.includes('unsub')) categories.unsubscribe++;
      else if (cat.includes('not_interest')) categories.not_interested++;
      else categories.other++;

      replyList.push({
        id: c.id,
        prospect_name: c.prospect_name || c.prospect_email,
        prospect_email: c.prospect_email,
        subject: c.subject,
        status: c.status,
        classification: c.ai_classification || 'Interested',
        confidence: c.ai_confidence || 0.9,
        summary: c.ai_summary || '',
        received_at: c.last_message_at || c.created_at,
      });
    }

    // Also factor in reply events not linked to full conversations
    for (const e of events) {
      if (e.event_type === 'replied') {
        const cls = (e.metadata?.classification || '').toLowerCase();
        if (cls.includes('interest') && convs.length === 0) categories.interested++;
        else if (cls.includes('question') && convs.length === 0) categories.question++;
      }
    }

    const totalReplies = Object.values(categories).reduce((sum, v) => sum + v, 0);

    const breakdown = Object.entries(categories).map(([category, count]) => ({
      category,
      label: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      percentage: this.calcRate(count, totalReplies),
    }));

    return {
      campaign_id: campaignId,
      total_replies: totalReplies,
      breakdown,
      recent_replies: replyList.slice(0, 10),
    };
  }

  /**
   * GET /api/analytics/export
   * Generates sanitized CSV with formula injection defense
   */
  async exportCsv({ userId, type = 'campaigns', campaignId = null, startDate = null, endDate = null }) {
    if (type === 'campaign_leads') {
      // Export leads enrolled in campaign with activity summary
      let leads = [];

      if (this.supabase) {
        try {
          const { data } = await this.supabase
            .from('campaign_leads')
            .select('lead_id, leads(id, full_name, email, company, job_title)')
            .eq('campaign_id', campaignId);
          if (data && Array.isArray(data)) {
            leads = data.map(d => d.leads).filter(Boolean);
          }
        } catch {}
      }

      if (leads.length === 0 && this.emailWorker && this.emailWorker.memoryJobs) {
        for (const job of this.emailWorker.memoryJobs.values()) {
          if (job.campaign_id === campaignId) {
            leads.push({
              id: job.lead_id,
              full_name: job.recipient_name || job.recipient_email?.split('@')[0],
              email: job.recipient_email,
              company: 'Target Prospect',
              job_title: 'Executive',
            });
          }
        }
      }

      const events = await this.getEvents(userId, { campaignId });
      const convs = await this.getConversations(userId, campaignId);

      const headers = ['Lead Name', 'Email', 'Company', 'Job Title', 'Status', 'Sent Events', 'Replied', 'Reply Sentiment', 'Last Contacted'];
      const rows = [headers.join(',')];

      for (const lead of leads) {
        const leadEvents = events.filter(e => e.lead_id === lead.id || e.metadata?.email === lead.email);
        const sentCount = leadEvents.filter(e => e.event_type === 'sent').length;
        const hasReplied = leadEvents.some(e => e.event_type === 'replied') || convs.some(c => c.lead_id === lead.id);
        const matchingConv = convs.find(c => c.lead_id === lead.id || c.prospect_email === lead.email);
        const sentiment = matchingConv?.ai_classification || (hasReplied ? 'Interested' : 'Pending');
        const lastEvent = leadEvents[leadEvents.length - 1];
        const lastContacted = lastEvent?.created_at ? new Date(lastEvent.created_at).toISOString().slice(0, 10) : 'N/A';

        const row = [
          this.sanitizeCsvCell(lead.full_name || 'N/A'),
          this.sanitizeCsvCell(lead.email || 'N/A'),
          this.sanitizeCsvCell(lead.company || 'N/A'),
          this.sanitizeCsvCell(lead.job_title || 'N/A'),
          this.sanitizeCsvCell(hasReplied ? 'Replied' : (sentCount > 0 ? 'Contacted' : 'Queued')),
          this.sanitizeCsvCell(sentCount),
          this.sanitizeCsvCell(hasReplied ? 'Yes' : 'No'),
          this.sanitizeCsvCell(sentiment),
          this.sanitizeCsvCell(lastContacted),
        ];
        rows.push(row.join(','));
      }

      return {
        filename: `campaign_leads_${campaignId || 'export'}_${Date.now()}.csv`,
        csv: rows.join('\r\n'),
      };
    }

    // Default: Export Campaigns Overview
    const { campaigns } = await this.getCampaigns({
      userId,
      limit: 1000,
      startDate,
      endDate,
    });

    const headers = [
      'Campaign Name',
      'Status',
      'Created Date',
      'Targeted Leads',
      'Sent',
      'Delivered',
      'Delivery Rate %',
      'Replies',
      'Reply Rate %',
      'Positive Replies',
      'Positive Reply Rate %',
      'Bounces',
      'Bounce Rate %',
      'Unsubscribes',
      'Unsubscribe Rate %'
    ];

    const rows = [headers.join(',')];

    for (const c of campaigns) {
      const row = [
        this.sanitizeCsvCell(c.name),
        this.sanitizeCsvCell(c.status),
        this.sanitizeCsvCell(c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : 'N/A'),
        this.sanitizeCsvCell(c.targeted_leads),
        this.sanitizeCsvCell(c.sent),
        this.sanitizeCsvCell(c.delivered),
        this.sanitizeCsvCell(c.delivery_rate),
        this.sanitizeCsvCell(c.replies),
        this.sanitizeCsvCell(c.reply_rate),
        this.sanitizeCsvCell(c.positive_replies),
        this.sanitizeCsvCell(c.positive_reply_rate),
        this.sanitizeCsvCell(c.bounces),
        this.sanitizeCsvCell(c.bounce_rate),
        this.sanitizeCsvCell(c.unsubscribes),
        this.sanitizeCsvCell(c.unsubscribe_rate),
      ];
      rows.push(row.join(','));
    }

    return {
      filename: `campaign_performance_${Date.now()}.csv`,
      csv: rows.join('\r\n'),
    };
  }
}
