/**
 * Lead CRM & Sales Pipeline Management Service
 * Provides:
 * - Full Lead CRM with stage tracking, filtering, and bulk updates
 * - Visual Sales Pipeline (8 stages: New -> Contacted -> Engaged -> Qualified -> Meeting Scheduled -> Proposal -> Won -> Lost)
 * - Stage history recording with duplicate transition prevention
 * - Lead detail profile with unified chronological activity timeline (email events, replies, qualifications, notes, tasks, deals)
 * - Sales tasks & follow-up management with overdue tracking
 * - Private sales notes
 * - Deal management ($ value, probability, weighted pipeline value, won/lost transitions)
 * - CRM Overview dashboard KPIs and conversion funnel
 */

export const CRM_STAGES = [
  'New',
  'Contacted',
  'Engaged',
  'Qualified',
  'Meeting Scheduled',
  'Proposal',
  'Won',
  'Lost'
];

export class CrmService {
  constructor(supabaseClient, emailWorker = null, inboundService = null) {
    this.supabase = supabaseClient;
    this.emailWorker = emailWorker;
    this.inboundService = inboundService;

    // Default 8-stage pipeline
    this.defaultStages = [
      { name: 'New', order: 1, color: '#64748b', is_won: false, is_lost: false },
      { name: 'Contacted', order: 2, color: '#0284c7', is_won: false, is_lost: false },
      { name: 'Engaged', order: 3, color: '#0d9467', is_won: false, is_lost: false },
      { name: 'Qualified', order: 4, color: '#8b5cf6', is_won: false, is_lost: false },
      { name: 'Meeting Scheduled', order: 5, color: '#f59e0b', is_won: false, is_lost: false },
      { name: 'Proposal', order: 6, color: '#ec4899', is_won: false, is_lost: false },
      { name: 'Won', order: 7, color: '#10b981', is_won: true, is_lost: false },
      { name: 'Lost', order: 8, color: '#ef4444', is_won: false, is_lost: true },
    ];

    // In-memory fallback structures for testing and fast local lookups
    this.memoryLeads = new Map();
    this.memoryStageHistory = [];
    this.memoryTasks = new Map();
    this.memoryNotes = new Map();
    this.memoryDeals = new Map();
    this.memoryQualifications = new Map();
    this.memoryCampaigns = [];
    this.memoryCampaignLeads = [];
  }

  // Helper memory accessors to handle either Map or Array safely
  _getMemoryLeadsList() {
    if (Array.isArray(this.memoryLeads)) return this.memoryLeads;
    if (this.memoryLeads instanceof Map) return Array.from(this.memoryLeads.values());
    return [];
  }

  _getMemoryLead(leadId) {
    if (Array.isArray(this.memoryLeads)) return this.memoryLeads.find(l => l.id === leadId);
    if (this.memoryLeads instanceof Map) return this.memoryLeads.get(leadId);
    return null;
  }

  _setMemoryLead(leadId, lead) {
    if (Array.isArray(this.memoryLeads)) {
      const idx = this.memoryLeads.findIndex(l => l.id === leadId);
      if (idx >= 0) this.memoryLeads[idx] = lead;
      else this.memoryLeads.push(lead);
    } else if (this.memoryLeads instanceof Map) {
      this.memoryLeads.set(leadId, lead);
    }
  }

  _getMemoryTasksList() {
    if (Array.isArray(this.memoryTasks)) return this.memoryTasks;
    if (this.memoryTasks instanceof Map) return Array.from(this.memoryTasks.values());
    return [];
  }

  _getMemoryTask(taskId) {
    if (Array.isArray(this.memoryTasks)) return this.memoryTasks.find(t => t.id === taskId);
    if (this.memoryTasks instanceof Map) return this.memoryTasks.get(taskId);
    return null;
  }

  _setMemoryTask(taskId, task) {
    if (Array.isArray(this.memoryTasks)) {
      const idx = this.memoryTasks.findIndex(t => t.id === taskId);
      if (idx >= 0) this.memoryTasks[idx] = task;
      else this.memoryTasks.push(task);
    } else if (this.memoryTasks instanceof Map) {
      this.memoryTasks.set(taskId, task);
    }
  }

  _getMemoryNotesList() {
    if (Array.isArray(this.memoryNotes)) return this.memoryNotes;
    if (this.memoryNotes instanceof Map) return Array.from(this.memoryNotes.values());
    return [];
  }

  _getMemoryNote(noteId) {
    if (Array.isArray(this.memoryNotes)) return this.memoryNotes.find(n => n.id === noteId);
    if (this.memoryNotes instanceof Map) return this.memoryNotes.get(noteId);
    return null;
  }

  _setMemoryNote(noteId, note) {
    if (Array.isArray(this.memoryNotes)) {
      const idx = this.memoryNotes.findIndex(n => n.id === noteId);
      if (idx >= 0) this.memoryNotes[idx] = note;
      else this.memoryNotes.push(note);
    } else if (this.memoryNotes instanceof Map) {
      this.memoryNotes.set(noteId, note);
    }
  }

  _deleteMemoryNote(noteId) {
    if (Array.isArray(this.memoryNotes)) {
      const idx = this.memoryNotes.findIndex(n => n.id === noteId);
      if (idx >= 0) this.memoryNotes.splice(idx, 1);
    } else if (this.memoryNotes instanceof Map) {
      this.memoryNotes.delete(noteId);
    }
  }

  _getMemoryDealsList() {
    if (Array.isArray(this.memoryDeals)) return this.memoryDeals;
    if (this.memoryDeals instanceof Map) return Array.from(this.memoryDeals.values());
    return [];
  }

  _getMemoryDeal(dealId) {
    if (Array.isArray(this.memoryDeals)) return this.memoryDeals.find(d => d.id === dealId);
    if (this.memoryDeals instanceof Map) return this.memoryDeals.get(dealId);
    return null;
  }

  _setMemoryDeal(dealId, deal) {
    if (Array.isArray(this.memoryDeals)) {
      const idx = this.memoryDeals.findIndex(d => d.id === dealId);
      if (idx >= 0) this.memoryDeals[idx] = deal;
      else this.memoryDeals.push(deal);
    } else if (this.memoryDeals instanceof Map) {
      this.memoryDeals.set(dealId, deal);
    }
  }

  /**
   * Helper: Validate whether a stage name is in the configured pipeline
   */
  isValidStage(stageName) {
    if (!stageName) return false;
    return this.defaultStages.some(
      s => s.name.toLowerCase() === stageName.toLowerCase()
    );
  }

  getCanonicalStageName(stageName) {
    const matched = this.defaultStages.find(
      s => s.name.toLowerCase() === (stageName || '').toLowerCase()
    );
    return matched ? matched.name : stageName;
  }

  /**
   * Pipeline Stages List
   */
  async getStages(userIdOrOpts) {
    const userId = typeof userIdOrOpts === 'object' && userIdOrOpts !== null ? userIdOrOpts.userId : userIdOrOpts;
    let stages = [];
    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('lead_pipeline_stages')
          .select('*')
          .eq('user_id', userId)
          .order('stage_order', { ascending: true });
        if (data && data.length > 0) stages = data;
      } catch {}
    }

    if (stages.length === 0) {
      stages = this.defaultStages.map(s => ({
        ...s,
        id: `stage_${s.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        user_id: userId,
      }));
    }

    return stages;
  }

  /**
   * Pipeline Stages with Aggregated Metrics
   */
  async getPipelineStages(userIdOrOpts) {
    const userId = typeof userIdOrOpts === 'object' && userIdOrOpts !== null ? userIdOrOpts.userId : userIdOrOpts;
    const overview = await this.getOverview(userId);
    return {
      stages: overview.pipeline_by_stage.map(s => ({
        id: s.stage,
        name: s.stage,
        color: s.color,
        count: s.count,
        dealValue: s.deal_value,
        deal_value: s.deal_value,
      })),
      totalLeads: overview.kpis.total_leads,
      pipelineValue: overview.kpis.total_pipeline_value,
      weightedPipelineValue: overview.kpis.weighted_pipeline_value,
      activeOpportunities: overview.kpis.active_opportunities,
      wonDeals: overview.kpis.won_deals,
      lostDeals: overview.kpis.lost_deals,
      qualifiedLeads: overview.kpis.qualified_leads,
      conversionFunnel: overview.conversion_funnel,
    };
  }

  /**
   * GET /api/crm/leads: List leads with search, stage, industry, source, qualification filtering & pagination
   */
  async getLeads(userIdOrOptions, maybeOptions = {}) {
    const opts = typeof userIdOrOptions === 'object' && userIdOrOptions !== null
      ? userIdOrOptions
      : { userId: userIdOrOptions, ...maybeOptions };

    const {
      userId,
      search = '',
      stage = 'all',
      industry = 'all',
      source = 'all',
      minScore = null,
      sortBy = 'last_activity_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = opts;

    let leadsList = [];

    // 1. Try DB fetch
    if (this.supabase) {
      try {
        let query = this.supabase
          .from('leads')
          .select('*, lead_qualifications(score, fit_level, rationale)')
          .eq('user_id', userId);

        if (stage && stage !== 'all') {
          query = query.eq('stage', this.getCanonicalStageName(stage));
        }
        if (industry && industry !== 'all') {
          query = query.ilike('industry', `%${industry}%`);
        }
        if (source && source !== 'all') {
          query = query.eq('data_source', source);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          leadsList = data;
        }
      } catch {}
    }

    // 2. Merge / fallback with memory leads
    if (leadsList.length === 0) {
      leadsList = this._getMemoryLeadsList().filter(l => l.user_id === userId);
    }

    // 3. Apply in-memory filtering & joins
    let filtered = leadsList.filter(l => {
      // Search by name, email, company, domain
      if (search) {
        const q = search.toLowerCase();
        const leadName = l.full_name || l.name || '';
        const matchName = leadName.toLowerCase().includes(q);
        const matchEmail = l.email?.toLowerCase().includes(q);
        const leadCompany = l.company || l.company_name || '';
        const matchCompany = leadCompany.toLowerCase().includes(q);
        const matchDomain = (l.company_domain || l.website)?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchCompany && !matchDomain) return false;
      }

      // Stage filter
      if (stage && stage !== 'all') {
        const leadStage = (l.stage || 'New').toLowerCase();
        if (leadStage !== stage.toLowerCase()) return false;
      }

      // Industry filter
      if (industry && industry !== 'all') {
        if (!l.industry?.toLowerCase().includes(industry.toLowerCase())) return false;
      }

      // Source filter
      if (source && source !== 'all') {
        const leadSource = (l.source || l.data_source || 'manual').toLowerCase();
        if (leadSource !== source.toLowerCase()) return false;
      }

      // Qualification score filter
      const qual = l.lead_qualifications?.[0] || (this.memoryQualifications instanceof Map ? this.memoryQualifications.get(l.id) : null);
      const score = qual?.score !== undefined ? qual.score : (l.qualification_score ?? l.score ?? 0);
      if (minScore !== null && score < Number(minScore)) {
        return false;
      }

      return true;
    });

    // 4. Attach joined metadata (qualification, active deal, tasks count)
    const enriched = filtered.map(l => {
      const qual = l.lead_qualifications?.[0] || (this.memoryQualifications instanceof Map ? this.memoryQualifications.get(l.id) : null) || null;
      const leadDeals = this._getMemoryDealsList().filter(d => d.lead_id === l.id);
      const leadTasks = this._getMemoryTasksList().filter(t => t.lead_id === l.id && t.status !== 'completed');

      return {
        ...l,
        stage: this.getCanonicalStageName(l.stage || 'New'),
        qualification: qual,
        qualification_score: qual?.score || l.qualification_score || null,
        deals_count: leadDeals.length,
        open_tasks_count: leadTasks.length,
        last_activity: l.last_activity_at || l.created_at,
      };
    });

    // 5. Sorting
    enriched.sort((a, b) => {
      let valA = a[sortBy] ?? a.last_activity;
      let valB = b[sortBy] ?? b.last_activity;

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = valA || 0;
      valB = valB || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    // 6. Pagination
    const total = enriched.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = enriched.slice(startIndex, startIndex + limitNum);

    return {
      leads: paginated,
      total,
      page: pageNum,
      totalPages,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: totalPages,
      },
    };
  }

  /**
   * Update Lead Stage with Transactional Stage History & Duplicate Prevention
   */
  async updateLeadStage(userIdOrOpts, maybeLeadId, maybeNewStage, maybeNotes = '') {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !maybeLeadId
      ? userIdOrOpts
      : { userId: userIdOrOpts, leadId: maybeLeadId, newStage: maybeNewStage, notes: maybeNotes };

    const { userId, leadId, newStage, notes = '' } = opts;

    if (!this.isValidStage(newStage)) {
      throw new Error(`Invalid pipeline stage: "${newStage}". Allowed stages: ${this.defaultStages.map(s => s.name).join(', ')}`);
    }

    const canonicalNewStage = this.getCanonicalStageName(newStage);

    // Verify lead ownership
    let lead = await this.getLeadById(userId, leadId);
    if (!lead) {
      throw new Error('Lead not found or unauthorized.');
    }

    const prevStage = this.getCanonicalStageName(lead.stage || 'New');

    // Duplicate stage transition check: if stage is unchanged, do not create duplicate history
    if (prevStage.toLowerCase() === canonicalNewStage.toLowerCase()) {
      return {
        ...lead,
        success: true,
        message: 'Lead is already in this stage.',
        lead,
        history_created: false,
      };
    }

    const now = new Date().toISOString();
    const updatePayload = {
      stage: canonicalNewStage,
      last_activity_at: now,
      updated_at: now,
    };

    // Stage-specific updates
    if (canonicalNewStage === 'Won') {
      updatePayload.probability = 100;
    } else if (canonicalNewStage === 'Lost') {
      updatePayload.probability = 0;
      if (notes) updatePayload.loss_reason = notes;
    }

    // 1. Update in DB
    if (this.supabase) {
      try {
        await this.supabase
          .from('leads')
          .update(updatePayload)
          .eq('id', leadId)
          .eq('user_id', userId);
      } catch (err) {
        throw new Error(`Failed to update lead stage: ${err.message}`);
      }
    }

    // 2. Update in memory
    Object.assign(lead, updatePayload);
    this._setMemoryLead(leadId, lead);

    // 3. Record Stage History
    const historyRecord = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      lead_id: leadId,
      previous_stage: prevStage,
      new_stage: canonicalNewStage,
      changed_by: userId,
      changed_by_user_id: userId,
      reason: notes || `Moved from ${prevStage} to ${canonicalNewStage}`,
      notes: notes || `Moved from ${prevStage} to ${canonicalNewStage}`,
      created_at: now,
    };

    this.memoryStageHistory.push(historyRecord);
    if (this.supabase) {
      try {
        await this.supabase.from('lead_stage_history').insert([historyRecord]);
      } catch {}
    }

    return {
      ...lead,
      success: true,
      lead,
      previous_stage: prevStage,
      new_stage: canonicalNewStage,
      history_created: true,
      history_record: historyRecord,
    };
  }

  /**
   * Bulk Stage Update
   */
  async bulkUpdateLeadStage(userIdOrOpts, maybeLeadIds = [], maybeNewStage, maybeNotes = '') {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !Array.isArray(maybeLeadIds)
      ? userIdOrOpts
      : { userId: userIdOrOpts, leadIds: maybeLeadIds, newStage: maybeNewStage, notes: maybeNotes };

    const { userId, leadIds = [], newStage, notes = '' } = opts;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      throw new Error('At least one lead ID is required.');
    }
    if (!this.isValidStage(newStage)) {
      throw new Error(`Invalid stage: "${newStage}".`);
    }

    const results = [];
    for (const id of leadIds) {
      try {
        const res = await this.updateLeadStage({ userId, leadId: id, newStage, notes });
        results.push(res);
      } catch (err) {
        results.push({ leadId: id, success: false, error: err.message });
      }
    }

    const updatedCount = results.filter(r => r.success).length;

    return {
      success: true,
      total_requested: leadIds.length,
      updated_count: updatedCount,
      updatedCount,
      results,
    };
  }

  /**
   * GET /api/crm/leads/:leadId: Detailed lead profile with activity timeline
   */
  async getLeadProfile(userIdOrOpts, maybeLeadId) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !maybeLeadId
      ? userIdOrOpts
      : { userId: userIdOrOpts, leadId: maybeLeadId };

    const { userId, leadId } = opts;

    const lead = await this.getLeadById(userId, leadId);
    if (!lead) throw new Error('Lead not found or unauthorized.');

    // Fetch qualification
    let qual = null;
    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('lead_qualifications')
          .select('*')
          .eq('lead_id', leadId)
          .maybeSingle();
        if (data) qual = data;
      } catch {}
    }
    if (!qual) {
      qual = (this.memoryQualifications instanceof Map ? this.memoryQualifications.get(leadId) : null) || null;
    }

    // Fetch enrolled campaigns
    let campaigns = [];
    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('campaign_leads')
          .select('campaign_id, campaigns(id, name, status, created_at)')
          .eq('lead_id', leadId);
        if (data && Array.isArray(data)) {
          campaigns = data.map(d => d.campaigns).filter(Boolean);
        }
      } catch {}
    }

    if (campaigns.length === 0 && this.memoryCampaignLeads && this.memoryCampaigns) {
      const campLead = this.memoryCampaignLeads.find(cl => cl.lead_id === leadId);
      if (campLead) {
        const camp = this.memoryCampaigns.find(c => c.id === campLead.campaign_id);
        if (camp) campaigns.push(camp);
      }
    }

    // Fetch Tasks & Notes
    const tasks = await this.getTasks({ userId, leadId });
    const notes = await this.getNotes({ userId, leadId });
    const deals = await this.getDeals({ userId, leadId });

    // Build unified chronological activity timeline
    const timeline = await this.getActivityTimeline({ userId, leadId, lead, tasks, notes, deals });

    return {
      ...lead,
      lead: {
        ...lead,
        stage: this.getCanonicalStageName(lead.stage || 'New'),
      },
      qualification: qual,
      qualification_score: qual?.score || lead.qualification_score || null,
      qualification_fit: qual?.fit_level || lead.qualification_fit || null,
      campaigns,
      deals,
      tasks: tasks.tasks || [],
      notes,
      timeline,
    };
  }

  /**
   * Unified Chronological Activity Timeline
   */
  async getActivityTimeline({ userId, leadId, lead, tasks = {}, notes = [], deals = [] }) {
    const events = [];

    // 1. Lead creation
    if (lead?.created_at) {
      events.push({
        id: `tl_created_${lead.id}`,
        type: 'lead_created',
        title: 'Lead Created',
        description: `Added to CRM via ${lead.data_source || lead.source || 'manual import'}.`,
        timestamp: lead.created_at,
        icon: 'UserPlus',
      });
    }

    // 2. Enrichment
    if (lead?.enriched_at) {
      events.push({
        id: `tl_enrich_${lead.id}`,
        type: 'lead_enriched',
        title: 'Lead Enriched',
        description: `Data enriched from ${lead.data_source || lead.source || 'discovery engine'} (${lead.verification_status || 'unverified'}).`,
        timestamp: lead.enriched_at,
        icon: 'Sparkles',
      });
    }

    // 3. Stage changes from lead_stage_history
    let history = this.memoryStageHistory.filter(h => h.lead_id === leadId && h.user_id === userId);
    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('lead_stage_history')
          .select('*')
          .eq('lead_id', leadId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (data && Array.isArray(data)) history = data;
      } catch {}
    }

    for (const h of history) {
      events.push({
        id: `tl_stage_${h.id}`,
        type: 'stage_changed',
        title: `Stage Changed: ${h.new_stage}`,
        description: h.reason || h.notes || `Moved from ${h.previous_stage} to ${h.new_stage}`,
        timestamp: h.created_at,
        icon: 'ArrowRight',
      });
    }

    // 4. Email events (outreach sends, deliveries, replies)
    if (this.emailWorker && this.emailWorker.memoryEvents) {
      const emailEvents = this.emailWorker.memoryEvents.filter(e => e.lead_id === leadId);
      for (const ee of emailEvents) {
        if (ee.event_type === 'sent') {
          events.push({
            id: `tl_sent_${ee.id}`,
            type: 'email_sent',
            title: 'Outbound Email Sent',
            description: `Sent outreach email (Msg ID: ${ee.provider_message_id || 'dispatched'})`,
            timestamp: ee.created_at,
            icon: 'Send',
          });
        } else if (ee.event_type === 'delivered') {
          events.push({
            id: `tl_deliv_${ee.id}`,
            type: 'email_delivered',
            title: 'Email Delivered',
            description: 'Provider confirmed inbox delivery.',
            timestamp: ee.created_at,
            icon: 'CheckCircle2',
          });
        } else if (ee.event_type === 'replied') {
          events.push({
            id: `tl_reply_${ee.id}`,
            type: 'email_replied',
            title: 'Prospect Replied',
            description: `Inbound reply: ${ee.metadata?.classification || (ee.is_positive ? 'Interested' : 'Response received')}`,
            timestamp: ee.created_at,
            icon: 'MessageSquare',
          });
        }
      }
    }

    // 5. Notes
    for (const n of notes) {
      events.push({
        id: `tl_note_${n.id}`,
        type: 'note_added',
        title: 'Sales Note Added',
        description: n.content,
        timestamp: n.created_at,
        icon: 'FileText',
      });
    }

    // 6. Tasks
    const allTasks = tasks.tasks || [];
    for (const t of allTasks) {
      if (t.status === 'completed' || t.is_completed) {
        events.push({
          id: `tl_task_comp_${t.id}`,
          type: 'task_completed',
          title: `Task Completed: ${t.title}`,
          description: t.description || 'Completed follow-up action',
          timestamp: t.completed_at || t.updated_at,
          icon: 'CheckSquare',
        });
      } else {
        events.push({
          id: `tl_task_new_${t.id}`,
          type: 'task_created',
          title: `Task Scheduled: ${t.title}`,
          description: `Due: ${new Date(t.due_date || t.due_at).toLocaleDateString()}`,
          timestamp: t.created_at,
          icon: 'Clock',
        });
      }
    }

    // 7. Deals
    for (const d of deals) {
      events.push({
        id: `tl_deal_${d.id}`,
        type: d.status === 'won' ? 'deal_won' : d.status === 'lost' ? 'deal_lost' : 'deal_created',
        title: `Deal: ${d.name} ($${Number(d.value).toLocaleString()})`,
        description: `Stage: ${d.stage} • Probability: ${d.probability}%`,
        timestamp: d.created_at,
        icon: 'DollarSign',
      });
    }

    // 8. Meetings
    if (this.meetingService) {
      try {
        const bookings = this.meetingService._getMemoryBookingsList().filter(b => b.lead_id === leadId && b.user_id === userId);
        for (const m of bookings) {
          const typeStr = m.status === 'completed' ? 'meeting_completed' : m.status === 'cancelled' ? 'meeting_cancelled' : 'meeting_scheduled';
          const titleStr = m.status === 'completed' ? 'Meeting Completed' : m.status === 'cancelled' ? 'Meeting Cancelled' : 'Meeting Scheduled';
          events.push({
            id: `tl_meeting_${m.id}`,
            type: typeStr,
            title: `${titleStr}: ${new Date(m.start_time).toLocaleString()}`,
            description: `${m.prospect_name} (${m.prospect_email})${m.meeting_link ? ` • Link: ${m.meeting_link}` : ''}${m.cancellation_reason ? ` • Cancel Reason: ${m.cancellation_reason}` : ''}`,
            timestamp: m.updated_at || m.created_at || m.start_time,
            icon: 'Calendar',
          });
        }
      } catch {}
    }

    // 9. Sales Calls & Conversation Intelligence
    if (this.callService) {
      try {
        const calls = this.callService._getMemoryRecordingsList().filter(c => c.lead_id === leadId && c.user_id === userId);
        for (const c of calls) {
          const insight = this.callService.memoryInsights?.get(c.id);
          events.push({
            id: `tl_call_${c.id}`,
            type: 'call_recorded',
            title: `Sales Call: ${c.title || c.file_name}`,
            description: `Duration: ${Math.floor((c.duration_seconds || 0) / 60)}m ${(c.duration_seconds || 0) % 60}s • Status: ${c.status}${insight ? ` • Deal Risk: ${insight.deal_risk_score}/100 (${insight.deal_risk_level})` : ''}`,
            timestamp: c.created_at,
            icon: 'PhoneCall',
          });
        }
      } catch {}
    }

    // Sort descending (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events;
  }

  async getLeadActivityTimeline(userIdOrOpts, maybeLeadId) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !maybeLeadId
      ? userIdOrOpts
      : { userId: userIdOrOpts, leadId: maybeLeadId };
    const { userId, leadId } = opts;
    const profile = await this.getLeadProfile({ userId, leadId });
    return profile.timeline;
  }

  /**
   * Tasks Management
   */
  async getTasks(userIdOrOpts, maybeLeadId = null, maybeStatus = 'all') {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && typeof maybeLeadId === 'undefined'
      ? userIdOrOpts
      : { userId: userIdOrOpts, leadId: maybeLeadId, status: maybeStatus };

    const { userId, leadId = null, status = 'all' } = opts;

    let tasksList = [];

    if (this.supabase) {
      try {
        let q = this.supabase
          .from('crm_tasks')
          .select('*, leads(full_name, company, email)')
          .eq('user_id', userId);
        if (leadId) q = q.eq('lead_id', leadId);
        if (status !== 'all') q = q.eq('status', status);
        const { data } = await q.order('due_date', { ascending: true });
        if (data && Array.isArray(data)) tasksList = data;
      } catch {}
    }

    if (tasksList.length === 0) {
      tasksList = this._getMemoryTasksList().filter(t => {
        if (t.user_id !== userId) return false;
        if (leadId && t.lead_id !== leadId) return false;
        if (status !== 'all' && t.status !== status) return false;
        return true;
      });
    }

    const now = Date.now();
    const overdue = [];
    const today = [];
    const upcoming = [];
    const completed = [];

    for (const t of tasksList) {
      const dueTime = new Date(t.due_date || t.due_at).getTime();
      const isPast = dueTime < now;
      const isToday = new Date(t.due_date || t.due_at).toDateString() === new Date().toDateString();
      const isComp = Boolean(t.is_completed || t.status === 'completed');

      const enriched = {
        ...t,
        is_completed: isComp,
        is_overdue: !isComp && t.status !== 'cancelled' && isPast,
      };

      if (isComp) {
        completed.push(enriched);
      } else if (enriched.is_overdue) {
        overdue.push(enriched);
      } else if (isToday) {
        today.push(enriched);
      } else {
        upcoming.push(enriched);
      }
    }

    return {
      tasks: tasksList,
      overdue,
      today,
      upcoming,
      completed,
      overdue_count: overdue.length,
    };
  }

  async createTask(userIdOrOpts, maybeTask = {}) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !maybeTask.title && (userIdOrOpts.title || userIdOrOpts.name)
      ? userIdOrOpts
      : { userId: userIdOrOpts, ...maybeTask };

    const { userId } = opts;
    const leadId = opts.lead_id || opts.leadId;
    const title = opts.title || opts.name;
    const description = opts.description || '';
    const taskType = opts.task_type || opts.taskType || 'follow_up';
    const priority = opts.priority || 'medium';
    const dueDate = opts.due_at || opts.dueDate || opts.due_date || new Date().toISOString();

    if (!title || !dueDate) throw new Error('Task title and due date are required.');

    const isCompleted = Boolean(opts.is_completed || opts.status === 'completed');
    const taskRecord = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      lead_id: leadId,
      title,
      description,
      task_type: taskType,
      priority,
      status: isCompleted ? 'completed' : (opts.status || 'pending'),
      is_completed: isCompleted,
      due_at: new Date(dueDate).toISOString(),
      due_date: new Date(dueDate).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this._setMemoryTask(taskRecord.id, taskRecord);
    if (this.supabase) {
      try {
        await this.supabase.from('crm_tasks').insert([taskRecord]);
      } catch {}
    }

    return taskRecord;
  }

  async updateTask(userIdOrOpts, maybeTaskId, maybeUpdates = {}) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !maybeTaskId
      ? userIdOrOpts
      : { userId: userIdOrOpts, taskId: maybeTaskId, updates: maybeUpdates };

    const { userId, taskId, updates = {} } = opts;

    let task = this._getMemoryTask(taskId);
    if (!task && this.supabase) {
      try {
        const { data } = await this.supabase
          .from('crm_tasks')
          .select('*')
          .eq('id', taskId)
          .eq('user_id', userId)
          .maybeSingle();
        if (data) task = data;
      } catch {}
    }
    if (!task || task.user_id !== userId) {
      throw new Error('Task not found or unauthorized.');
    }

    const now = new Date().toISOString();
    const isCompleted = updates.is_completed !== undefined
      ? Boolean(updates.is_completed)
      : (updates.status ? updates.status === 'completed' : task.is_completed);

    const updated = {
      ...task,
      ...updates,
      is_completed: isCompleted,
      status: isCompleted ? 'completed' : (updates.status || 'pending'),
      updated_at: now,
    };
    if (isCompleted && !task.completed_at) {
      updated.completed_at = now;
    }

    this._setMemoryTask(taskId, updated);
    if (this.supabase) {
      try {
        await this.supabase.from('crm_tasks').update(updated).eq('id', taskId).eq('user_id', userId);
      } catch {}
    }

    return updated;
  }

  /**
   * Notes Management
   */
  async getNotes(userIdOrOpts, maybeLeadId = null) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && typeof maybeLeadId === 'undefined'
      ? userIdOrOpts
      : { userId: userIdOrOpts, leadId: maybeLeadId };

    const { userId, leadId = null } = opts;

    let notes = [];
    if (this.supabase) {
      try {
        let q = this.supabase
          .from('crm_notes')
          .select('*')
          .eq('user_id', userId);
        if (leadId) q = q.eq('lead_id', leadId);
        const { data } = await q.order('created_at', { ascending: false });
        if (data && Array.isArray(data)) notes = data;
      } catch {}
    }
    if (notes.length === 0) {
      notes = this._getMemoryNotesList().filter(
        n => n.user_id === userId && (!leadId || n.lead_id === leadId)
      );
    }
    return notes;
  }

  async createNote(userIdOrOpts, maybeLeadId, maybeNote = {}) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !maybeLeadId
      ? userIdOrOpts
      : { userId: userIdOrOpts, leadId: maybeLeadId, ...maybeNote };

    const { userId } = opts;
    const leadId = opts.lead_id || opts.leadId;
    const taskId = opts.task_id || opts.taskId || null;
    const content = (opts.content || '').trim();
    const tags = Array.isArray(opts.tags) ? opts.tags : [];
    const authorName = opts.author_name || opts.authorName || 'Sales Rep';

    if (!content) throw new Error('Note content cannot be empty.');

    const noteRecord = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      lead_id: leadId,
      task_id: taskId,
      content,
      tags,
      author_name: authorName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this._setMemoryNote(noteRecord.id, noteRecord);
    if (this.supabase) {
      try {
        await this.supabase.from('crm_notes').insert([noteRecord]);
      } catch {}
    }

    return noteRecord;
  }

  async updateNote(userIdOrOpts, maybeNoteId, maybeContent = '') {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !maybeNoteId
      ? userIdOrOpts
      : { userId: userIdOrOpts, noteId: maybeNoteId, content: maybeContent };

    const { userId, noteId, content = '' } = opts;

    const note = this._getMemoryNote(noteId);
    if (!note || note.user_id !== userId) throw new Error('Note not found or unauthorized.');
    note.content = content.trim();
    note.updated_at = new Date().toISOString();
    return note;
  }

  async deleteNote(userIdOrOpts, maybeNoteId) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !maybeNoteId
      ? userIdOrOpts
      : { userId: userIdOrOpts, noteId: maybeNoteId };

    const { userId, noteId } = opts;

    const note = this._getMemoryNote(noteId);
    if (!note || note.user_id !== userId) throw new Error('Note not found or unauthorized.');
    this._deleteMemoryNote(noteId);
    if (this.supabase) {
      try {
        await this.supabase.from('crm_notes').delete().eq('id', noteId).eq('user_id', userId);
      } catch {}
    }
    return { success: true };
  }

  /**
   * Deal Management
   */
  async getDeals(userIdOrOpts, maybeLeadId = null, maybeStatus = 'all') {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && typeof maybeLeadId === 'undefined'
      ? userIdOrOpts
      : { userId: userIdOrOpts, leadId: maybeLeadId, status: maybeStatus };

    const { userId, leadId = null, status = 'all' } = opts;

    let deals = [];
    if (this.supabase) {
      try {
        let q = this.supabase.from('crm_deals').select('*, leads(full_name, company)').eq('user_id', userId);
        if (leadId) q = q.eq('lead_id', leadId);
        if (status !== 'all') q = q.eq('status', status);
        const { data } = await q.order('created_at', { ascending: false });
        if (data && Array.isArray(data)) deals = data;
      } catch {}
    }

    if (deals.length === 0) {
      deals = this._getMemoryDealsList().filter(d => {
        if (d.user_id !== userId) return false;
        if (leadId && d.lead_id !== leadId) return false;
        if (status !== 'all' && d.status !== status) return false;
        return true;
      });
    }

    return deals;
  }

  async createDeal(userIdOrOpts, maybeDeal = {}) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !maybeDeal.name && !maybeDeal.title && (userIdOrOpts.name || userIdOrOpts.title)
      ? userIdOrOpts
      : { userId: userIdOrOpts, ...maybeDeal };

    const { userId } = opts;
    const leadId = opts.lead_id || opts.leadId;
    const name = opts.name || opts.title || 'New Deal';
    const value = Number(opts.value) || 0.0;
    const currency = opts.currency || 'USD';
    const stage = this.getCanonicalStageName(opts.stage || 'Qualified');
    const probability = opts.probability !== undefined ? Number(opts.probability) : 50;
    const expectedCloseDate = opts.expected_close_date || opts.expectedCloseDate || null;

    if (!name || !leadId) throw new Error('Deal name and lead ID are required.');

    const dealRecord = {
      id: `deal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      lead_id: leadId,
      name,
      title: name,
      value,
      currency,
      stage,
      status: 'open',
      probability: Math.min(100, Math.max(0, probability)),
      expected_close_date: expectedCloseDate ? new Date(expectedCloseDate).toISOString() : null,
      loss_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this._setMemoryDeal(dealRecord.id, dealRecord);
    if (this.supabase) {
      try {
        await this.supabase.from('crm_deals').insert([dealRecord]);
      } catch {}
    }

    // Also update lead deal_value
    const lead = await this.getLeadById(userId, leadId);
    if (lead) {
      lead.deal_value = dealRecord.value;
      lead.probability = dealRecord.probability;
      lead.expected_close_date = dealRecord.expected_close_date;
      this._setMemoryLead(leadId, lead);
    }

    return dealRecord;
  }

  async updateDeal(userIdOrOpts, maybeDealId, maybeUpdates = {}) {
    const opts = typeof userIdOrOpts === 'object' && userIdOrOpts !== null && !maybeDealId
      ? userIdOrOpts
      : { userId: userIdOrOpts, dealId: maybeDealId, updates: maybeUpdates };

    const { userId, dealId, updates = {} } = opts;

    let deal = this._getMemoryDeal(dealId);
    if (!deal && this.supabase) {
      try {
        const { data } = await this.supabase
          .from('crm_deals')
          .select('*')
          .eq('id', dealId)
          .eq('user_id', userId)
          .maybeSingle();
        if (data) deal = data;
      } catch {}
    }
    if (!deal || deal.user_id !== userId) {
      throw new Error('Deal not found or unauthorized.');
    }

    const now = new Date().toISOString();
    const updated = {
      ...deal,
      ...updates,
      updated_at: now,
    };

    if (updates.status === 'won') {
      updated.stage = 'Won';
      updated.probability = 100;
    } else if (updates.status === 'lost') {
      updated.stage = 'Lost';
      updated.probability = 0;
    }

    this._setMemoryDeal(dealId, updated);
    if (this.supabase) {
      try {
        await this.supabase.from('crm_deals').update(updated).eq('id', dealId).eq('user_id', userId);
      } catch {}
    }

    return updated;
  }

  /**
   * CRM Pipeline Overview & Aggregated Metrics
   */
  async getOverview(userIdOrOpts) {
    const userId = typeof userIdOrOpts === 'object' && userIdOrOpts !== null ? userIdOrOpts.userId : userIdOrOpts;

    const { leads } = await this.getLeads({ userId, limit: 1000 });
    const stages = await this.getStages(userId);
    const deals = await this.getDeals({ userId });
    const tasksRes = await this.getTasks({ userId });

    // Pipeline by Stage
    const stageMap = new Map();
    for (const s of stages) {
      stageMap.set(s.name, {
        stage: s.name,
        order: s.order || s.stage_order || 1,
        color: s.color || '#0d9467',
        count: 0,
        deal_value: 0,
      });
    }

    let totalPipelineValue = 0;
    let weightedPipelineValue = 0;
    let activeOpportunities = 0;
    let wonDeals = 0;
    let lostDeals = 0;
    let qualifiedLeads = 0;

    for (const l of leads) {
      const st = this.getCanonicalStageName(l.stage || 'New');
      const entry = stageMap.get(st) || { stage: st, count: 0, deal_value: 0 };
      entry.count++;

      const val = Number(l.deal_value) || 0;
      entry.deal_value += val;

      if (val > 0 && st.toLowerCase() !== 'lost') {
        totalPipelineValue += val;
        weightedPipelineValue += (val * (l.probability !== undefined ? l.probability : 50)) / 100;
      }

      if (['qualified', 'meeting scheduled', 'proposal'].includes(st.toLowerCase())) {
        activeOpportunities++;
      }

      if (st.toLowerCase() === 'won') {
        wonDeals++;
      } else if (st.toLowerCase() === 'lost') {
        lostDeals++;
      }

      if (['qualified', 'meeting scheduled', 'proposal', 'won'].includes(st.toLowerCase()) || (l.qualification_score && l.qualification_score >= 70)) {
        qualifiedLeads++;
      }
    }

    // Check deal items as well
    for (const d of deals) {
      if (d.status === 'won' && !stageMap.get('Won')?.count) {
        wonDeals++;
      } else if (d.status === 'lost' && !stageMap.get('Lost')?.count) {
        lostDeals++;
      }
    }

    const pipelineByStage = Array.from(stageMap.values()).sort((a, b) => a.order - b.order);

    // Conversion Funnel: New -> Contacted -> Engaged -> Qualified -> Meeting Scheduled -> Won
    const funnelStages = ['New', 'Contacted', 'Engaged', 'Qualified', 'Meeting Scheduled', 'Won'];
    const funnelCounts = {};
    for (const fs of funnelStages) {
      funnelCounts[fs] = 0;
    }

    // Cumulative unique leads reaching each stage
    for (const l of leads) {
      const curStage = this.getCanonicalStageName(l.stage || 'New');
      const stageIdx = funnelStages.indexOf(curStage);
      if (stageIdx !== -1) {
        for (let i = 0; i <= stageIdx; i++) {
          funnelCounts[funnelStages[i]]++;
        }
      } else if (curStage === 'Proposal') {
        // Between Meeting and Won
        for (let i = 0; i <= 4; i++) {
          funnelCounts[funnelStages[i]]++;
        }
      } else {
        funnelCounts['New']++;
      }
    }

    const baseCount = funnelCounts['New'] || 1;
    const conversionFunnel = funnelStages.map(stageName => ({
      stage: stageName,
      count: funnelCounts[stageName],
      conversion_rate: Number(((funnelCounts[stageName] / baseCount) * 100).toFixed(1)),
    }));

    return {
      kpis: {
        total_leads: leads.length,
        total_crm_leads: leads.length,
        qualified_leads: qualifiedLeads,
        active_opportunities: activeOpportunities,
        meetings_scheduled: stageMap.get('Meeting Scheduled')?.count || 0,
        won_deals: wonDeals,
        lost_deals: lostDeals,
        total_pipeline_value: totalPipelineValue,
        weighted_pipeline_value: Math.round(weightedPipelineValue),
      },
      pipeline_by_stage: pipelineByStage,
      sales_activity: {
        contacted: stageMap.get('Contacted')?.count || 0,
        replies_received: stageMap.get('Engaged')?.count || 0,
        meetings_scheduled: stageMap.get('Meeting Scheduled')?.count || 0,
        tasks_completed: tasksRes.completed.length,
        overdue_followups: tasksRes.overdue_count,
      },
      conversion_funnel: conversionFunnel,
    };
  }

  async getLeadById(userId, leadId) {
    const memLead = this._getMemoryLead(leadId);
    if (memLead && memLead.user_id === userId) return memLead;

    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .eq('user_id', userId)
          .maybeSingle();
        if (data) {
          this._setMemoryLead(data.id, data);
          return data;
        }
      } catch {}
    }
    return null;
  }
}
