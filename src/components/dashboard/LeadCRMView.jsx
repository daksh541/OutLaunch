import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Kanban,
  List,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Plus,
  Calendar,
  Building,
  Mail,
  Phone,
  Globe,
  Linkedin,
  FileText,
  CheckSquare,
  Sparkles,
  TrendingUp,
  X,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  Send,
  MessageSquare,
  Award,
  Trash2
} from 'lucide-react';
import {
  fetchCrmOverview,
  fetchCrmPipelineStages,
  fetchCrmLeads,
  updateLeadCrmStage,
  bulkUpdateLeadCrmStage,
  fetchLeadProfile,
  fetchLeadNotes,
  createLeadNote,
  deleteLeadNote,
  fetchCrmTasks,
  createCrmTask,
  updateCrmTask,
  fetchCrmDeals,
  createCrmDeal,
  updateCrmDeal,
} from '../../lib/outreachService';

export default function LeadCRMView({ onNavigateToLeads }) {
  // Views: 'pipeline' (Kanban) | 'table' (List) | 'tasks' | 'overview'
  const [activeView, setActiveView] = useState('pipeline');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pipeline stages & Leads
  const [stages, setStages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [overview, setOverview] = useState(null);

  // Filters & Table State
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [minScore, setMinScore] = useState('');
  const [sortBy, setSortBy] = useState('last_activity_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, total_pages: 1 });

  // Bulk Actions
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [bulkStageTarget, setBulkStageTarget] = useState('Qualified');

  // Lead Profile Drawer
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [leadProfile, setLeadProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState('timeline'); // 'timeline' | 'notes' | 'tasks' | 'deals'

  // Notes Form State
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Tasks Form State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    taskType: 'follow_up',
    priority: 'medium',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    leadId: '',
  });
  const [tasksList, setTasksList] = useState({ tasks: [], overdue: [], today: [], upcoming: [], completed: [], overdue_count: 0 });

  // Deals Form State
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealForm, setDealForm] = useState({
    leadId: '',
    name: '',
    value: 5000,
    currency: 'USD',
    stage: 'Qualified',
    probability: 50,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  // Load Data
  const loadAllData = async () => {
    try {
      const [ovRes, stRes, leadsRes, tasksRes] = await Promise.all([
        fetchCrmOverview(),
        fetchCrmPipelineStages(),
        fetchCrmLeads({
          search,
          stage: selectedStage,
          industry: selectedIndustry,
          source: selectedSource,
          minScore: minScore || null,
          sortBy,
          sortOrder,
          page,
          limit: 100,
        }),
        fetchCrmTasks({ status: 'all' }),
      ]);

      if (ovRes && ovRes.kpis) setOverview(ovRes);
      if (Array.isArray(stRes)) setStages(stRes);
      if (leadsRes && leadsRes.leads) {
        setLeads(leadsRes.leads);
        if (leadsRes.pagination) setPagination(leadsRes.pagination);
      }
      if (tasksRes && tasksRes.tasks) setTasksList(tasksRes);
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    }
  };

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadAllData();
      setIsLoading(false);
    }
    init();
  }, [search, selectedStage, selectedIndustry, selectedSource, minScore, sortBy, sortOrder, page]);

  // Load single lead profile when activeLeadId changes
  useEffect(() => {
    if (!activeLeadId) {
      setLeadProfile(null);
      return;
    }
    let isMounted = true;
    async function loadProfile() {
      setIsProfileLoading(true);
      try {
        const profile = await fetchLeadProfile(activeLeadId);
        if (isMounted) setLeadProfile(profile);
      } catch (err) {
        console.error('Failed to load lead profile:', err);
      } finally {
        if (isMounted) setIsProfileLoading(false);
      }
    }
    loadProfile();
    return () => { isMounted = false; };
  }, [activeLeadId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    if (activeLeadId) {
      const profile = await fetchLeadProfile(activeLeadId);
      setLeadProfile(profile);
    }
    setIsRefreshing(false);
  };

  // Stage Transitions (Optimistic update)
  const handleStageChange = async (leadId, newStage, notes = '') => {
    // Optimistic UI update
    const previousLeads = [...leads];
    setLeads(prev =>
      prev.map(l => (l.id === leadId ? { ...l, stage: newStage, last_activity: new Date().toISOString() } : l))
    );

    try {
      await updateLeadCrmStage(leadId, newStage, notes);
      await loadAllData();
      if (activeLeadId === leadId) {
        const updated = await fetchLeadProfile(leadId);
        setLeadProfile(updated);
      }
    } catch (err) {
      // Rollback
      setLeads(previousLeads);
      alert(`Stage transition failed: ${err.message}`);
    }
  };

  // Bulk Stage Change
  const handleBulkStageChange = async () => {
    if (selectedLeadIds.size === 0) return;
    try {
      await bulkUpdateLeadCrmStage(Array.from(selectedLeadIds), bulkStageTarget, 'Bulk stage movement');
      setSelectedLeadIds(new Set());
      await loadAllData();
    } catch (err) {
      alert(`Bulk update failed: ${err.message}`);
    }
  };

  // Add Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !activeLeadId) return;
    setIsAddingNote(true);
    try {
      await createLeadNote(activeLeadId, { content: newNoteContent.trim() });
      setNewNoteContent('');
      const updated = await fetchLeadProfile(activeLeadId);
      setLeadProfile(updated);
    } catch (err) {
      alert(`Failed to add note: ${err.message}`);
    } finally {
      setIsAddingNote(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId) => {
    try {
      await deleteLeadNote(noteId);
      if (activeLeadId) {
        const updated = await fetchLeadProfile(activeLeadId);
        setLeadProfile(updated);
      }
    } catch (err) {
      alert(`Failed to delete note: ${err.message}`);
    }
  };

  // Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await createCrmTask({
        leadId: taskForm.leadId || activeLeadId || leads[0]?.id,
        title: taskForm.title,
        description: taskForm.description,
        taskType: taskForm.taskType,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate,
      });
      setShowTaskModal(false);
      setTaskForm({
        title: '',
        description: '',
        taskType: 'follow_up',
        priority: 'medium',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        leadId: '',
      });
      await loadAllData();
      if (activeLeadId) {
        const updated = await fetchLeadProfile(activeLeadId);
        setLeadProfile(updated);
      }
    } catch (err) {
      alert(`Failed to create task: ${err.message}`);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await updateCrmTask(taskId, { status: nextStatus });
      await loadAllData();
      if (activeLeadId) {
        const updated = await fetchLeadProfile(activeLeadId);
        setLeadProfile(updated);
      }
    } catch (err) {
      alert(`Failed to update task: ${err.message}`);
    }
  };

  // Create Deal
  const handleCreateDeal = async (e) => {
    e.preventDefault();
    try {
      await createCrmDeal({
        leadId: dealForm.leadId || activeLeadId || leads[0]?.id,
        name: dealForm.name,
        value: Number(dealForm.value) || 0,
        currency: dealForm.currency,
        stage: dealForm.stage,
        probability: Number(dealForm.probability) || 50,
        expectedCloseDate: dealForm.expectedCloseDate,
      });
      setShowDealModal(false);
      await loadAllData();
      if (activeLeadId) {
        const updated = await fetchLeadProfile(activeLeadId);
        setLeadProfile(updated);
      }
    } catch (err) {
      alert(`Failed to create deal: ${err.message}`);
    }
  };

  // Kanban Stage Grouping
  const leadsByStage = useMemo(() => {
    const map = {};
    for (const s of stages) {
      map[s.name] = [];
    }
    for (const l of leads) {
      const st = l.stage || 'New';
      if (!map[st]) map[st] = [];
      map[st].push(l);
    }
    return map;
  }, [stages, leads]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 1. Top Navigation & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#0d1c15]/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#0d1c15] flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[#0d9467]" />
              Lead CRM & Sales Pipeline
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#00e599]/15 text-[#0d9467] border border-[#00e599]/30">
              Pipeline Management
            </span>
          </div>
          <p className="text-sm text-[#0d1c15]/60 mt-1">
            Manage prospect relationships, track sales stages, schedule follow-up tasks, and close pipeline deals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggles */}
          <div className="inline-flex rounded-lg border border-[#0d1c15]/10 bg-white p-1 shadow-xs text-xs font-semibold">
            {[
              { id: 'pipeline', label: 'Pipeline Board', icon: Kanban },
              { id: 'table', label: 'Leads Table', icon: List },
              { id: 'tasks', label: `Tasks (${tasksList.overdue_count > 0 ? `${tasksList.overdue_count} Overdue` : tasksList.tasks.length})`, icon: CheckSquare },
              { id: 'overview', label: 'Metrics & Funnel', icon: TrendingUp },
            ].map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => setActiveView(v.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    activeView === v.id
                      ? 'bg-[#0d1c15] text-white shadow-xs'
                      : 'text-[#0d1c15]/70 hover:text-[#0d1c15] hover:bg-[#0d1c15]/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* Quick Create Buttons */}
          <button
            onClick={() => {
              setTaskForm(prev => ({ ...prev, leadId: leads[0]?.id || '' }));
              setShowTaskModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-[#0d1c15]/15 rounded-lg text-[#0d1c15] hover:bg-[#0d1c15]/5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#0d9467]" />
            New Task
          </button>

          <button
            onClick={() => {
              setDealForm(prev => ({ ...prev, leadId: leads[0]?.id || '' }));
              setShowDealModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0d1c15] text-white rounded-lg hover:bg-[#0d1c15]/90 shadow-xs transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5 text-[#00e599]" />
            New Deal
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-xs font-medium bg-white border border-[#0d1c15]/15 rounded-lg text-[#0d1c15]/70 hover:text-[#0d1c15] hover:bg-[#0d1c15]/5 shadow-xs transition-colors"
            title="Refresh CRM data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0d9467]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Pipeline Summary KPIs Bar */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-white p-3 rounded-xl border border-[#0d1c15]/10 shadow-xs">
            <span className="text-[10px] text-[#0d1c15]/50 font-medium block">Total Leads</span>
            <span className="text-xl font-bold text-[#0d1c15]">{overview.kpis.total_leads}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#0d1c15]/10 shadow-xs">
            <span className="text-[10px] text-[#0d1c15]/50 font-medium block">Qualified</span>
            <span className="text-xl font-bold text-[#8b5cf6]">{overview.kpis.qualified_leads}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#0d1c15]/10 shadow-xs">
            <span className="text-[10px] text-[#0d1c15]/50 font-medium block">Active Opps</span>
            <span className="text-xl font-bold text-[#0d9467]">{overview.kpis.active_opportunities}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#0d1c15]/10 shadow-xs">
            <span className="text-[10px] text-[#0d1c15]/50 font-medium block">Meetings</span>
            <span className="text-xl font-bold text-[#f59e0b]">{overview.kpis.meetings_scheduled}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#0d1c15]/10 shadow-xs">
            <span className="text-[10px] text-[#0d1c15]/50 font-medium block">Deals Won</span>
            <span className="text-xl font-bold text-emerald-600">{overview.kpis.won_deals}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#0d1c15]/10 shadow-xs">
            <span className="text-[10px] text-[#0d1c15]/50 font-medium block">Pipeline Value</span>
            <span className="text-xl font-bold text-[#0d1c15] font-mono">
              ${overview.kpis.total_pipeline_value?.toLocaleString()}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#0d1c15]/10 shadow-xs">
            <span className="text-[10px] text-[#0d1c15]/50 font-medium block">Weighted Value</span>
            <span className="text-xl font-bold text-[#0d9467] font-mono">
              ${overview.kpis.weighted_pipeline_value?.toLocaleString()}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#0d1c15]/10 shadow-xs">
            <span className="text-[10px] text-[#0d1c15]/50 font-medium block">Overdue Tasks</span>
            <span className={`text-xl font-bold ${overview.sales_activity.overdue_followups > 0 ? 'text-rose-600' : 'text-[#0d1c15]'}`}>
              {overview.sales_activity.overdue_followups}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: VISUAL SALES PIPELINE (KANBAN BOARD)                              */}
      {/* ========================================================================= */}
      {activeView === 'pipeline' && (
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex gap-3.5 min-w-full">
            {stages.map((stage) => {
              const stageLeads = leadsByStage[stage.name] || [];
              const stageValue = stageLeads.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

              return (
                <div
                  key={stage.name}
                  className="w-72 bg-[#f7f5f0]/80 rounded-2xl border border-[#0d1c15]/10 flex flex-col max-h-[75vh]"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-[#0d1c15]/10 flex items-center justify-between bg-white rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stage.color || '#0d9467' }}
                      />
                      <h3 className="text-xs font-bold text-[#0d1c15] truncate">{stage.name}</h3>
                      <span className="text-[11px] font-mono text-[#0d1c15]/50 bg-[#f7f5f0] px-1.5 py-0.5 rounded-md font-semibold">
                        {stageLeads.length}
                      </span>
                    </div>

                    {stageValue > 0 && (
                      <span className="text-[11px] font-mono font-semibold text-[#0d9467]">
                        ${stageValue.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Cards Container */}
                  <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1">
                    {stageLeads.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-[#0d1c15]/30">
                        No leads in {stage.name}
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => setActiveLeadId(lead.id)}
                          className="bg-white p-3 rounded-xl border border-[#0d1c15]/10 shadow-2xs hover:border-[#0d9467]/40 hover:shadow-xs transition-all cursor-pointer group space-y-2"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <div className="font-bold text-xs text-[#0d1c15] group-hover:text-[#0d9467] transition-colors">
                                {lead.full_name}
                              </div>
                              <div className="text-[11px] text-[#0d1c15]/60 truncate max-w-[190px]">
                                {lead.job_title} • {lead.company}
                              </div>
                            </div>

                            {/* Qualification Score Pill */}
                            {lead.qualification_score !== null && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                                  lead.qualification_score >= 80
                                    ? 'bg-[#00e599]/20 text-[#0d9467]'
                                    : lead.qualification_score >= 60
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {lead.qualification_score}
                              </span>
                            )}
                          </div>

                          {/* Deal value & Probability */}
                          {lead.deal_value > 0 && (
                            <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[#0d1c15]/5">
                              <span className="font-bold text-[#0d1c15]">
                                ${Number(lead.deal_value).toLocaleString()}
                              </span>
                              <span className="text-[#0d1c15]/50">
                                {lead.probability || 50}% prob.
                              </span>
                            </div>
                          )}

                          {/* Quick Stage Progression Controls */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-1 flex items-center justify-between text-[10px]"
                          >
                            <select
                              value={lead.stage || 'New'}
                              onChange={(e) => handleStageChange(lead.id, e.target.value)}
                              className="bg-[#f7f5f0] text-[10px] font-semibold text-[#0d1c15] py-1 px-1.5 rounded border-none focus:outline-hidden"
                            >
                              {stages.map((st) => (
                                <option key={st.name} value={st.name}>
                                  Move: {st.name}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => setActiveLeadId(lead.id)}
                              className="text-[#0d9467] hover:underline font-semibold flex items-center gap-0.5"
                            >
                              Profile <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: LEADS TABLE VIEW WITH BULK ACTIONS                               */}
      {/* ========================================================================= */}
      {activeView === 'table' && (
        <div className="bg-white rounded-2xl border border-[#0d1c15]/10 shadow-xs overflow-hidden space-y-3">
          {/* Controls Bar */}
          <div className="p-4 border-b border-[#0d1c15]/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#0d1c15]/40" />
                <input
                  type="text"
                  placeholder="Search name, email, company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#f7f5f0] rounded-lg border-none text-xs text-[#0d1c15] focus:outline-hidden w-56"
                />
              </div>

              {/* Stage Filter */}
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="bg-[#f7f5f0] rounded-lg py-1.5 px-2.5 text-xs text-[#0d1c15] border-none font-medium"
              >
                <option value="all">All Stages</option>
                {stages.map((st) => (
                  <option key={st.name} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </select>

              {/* Min Score Filter */}
              <select
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="bg-[#f7f5f0] rounded-lg py-1.5 px-2.5 text-xs text-[#0d1c15] border-none font-medium"
              >
                <option value="">Any AI Score</option>
                <option value="70">Score 70+ (High Fit)</option>
                <option value="80">Score 80+ (Tier 1)</option>
                <option value="90">Score 90+ (Ideal ICP)</option>
              </select>
            </div>

            {/* Bulk Action Controls */}
            {selectedLeadIds.size > 0 && (
              <div className="flex items-center gap-2 bg-[#00e599]/10 p-1.5 rounded-lg border border-[#00e599]/30">
                <span className="font-semibold text-xs text-[#0d9467] px-1.5">
                  {selectedLeadIds.size} selected
                </span>
                <select
                  value={bulkStageTarget}
                  onChange={(e) => setBulkStageTarget(e.target.value)}
                  className="bg-white rounded py-1 px-2 text-xs border border-[#0d1c15]/10"
                >
                  {stages.map((st) => (
                    <option key={st.name} value={st.name}>
                      Move to {st.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBulkStageChange}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#0d1c15] text-white rounded hover:bg-[#0d1c15]/90"
                >
                  Apply Stage
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f7f5f0]/60 border-b border-[#0d1c15]/10 text-[#0d1c15]/60 font-medium">
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={leads.length > 0 && selectedLeadIds.size === leads.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedLeadIds(new Set(leads.map(l => l.id)));
                        else setSelectedLeadIds(new Set());
                      }}
                    />
                  </th>
                  <th className="py-2.5 px-3">Lead & Title</th>
                  <th className="py-2.5 px-3">Company & Domain</th>
                  <th className="py-2.5 px-3">Pipeline Stage</th>
                  <th className="py-2.5 px-3 text-right">Deal Value</th>
                  <th className="py-2.5 px-3 text-right">AI Score</th>
                  <th className="py-2.5 px-3 text-right">Last Activity</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0d1c15]/5">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[#0d1c15]/40">
                      No CRM leads found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  leads.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setActiveLeadId(l.id)}
                      className="hover:bg-[#00e599]/5 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(l.id)}
                          onChange={() => {
                            const next = new Set(selectedLeadIds);
                            if (next.has(l.id)) next.delete(l.id);
                            else next.add(l.id);
                            setSelectedLeadIds(next);
                          }}
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#0d1c15]">{l.full_name}</div>
                        <div className="text-[11px] text-[#0d1c15]/60">{l.job_title} • {l.email}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-[#0d1c15]">{l.company}</div>
                        <div className="text-[11px] text-[#0d1c15]/50 font-mono">
                          {l.company_domain || l.website || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={l.stage || 'New'}
                          onChange={(e) => handleStageChange(l.id, e.target.value)}
                          className="bg-[#f7f5f0] text-xs font-semibold py-1 px-2 rounded-md border border-[#0d1c15]/10"
                        >
                          {stages.map((st) => (
                            <option key={st.name} value={st.name}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-[#0d1c15]">
                        {l.deal_value > 0 ? `$${Number(l.deal_value).toLocaleString()}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        {l.qualification_score !== null ? (
                          <span className="font-bold text-[#0d9467]">{l.qualification_score}</span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-3 text-right text-[11px] text-[#0d1c15]/50">
                        {l.last_activity ? new Date(l.last_activity).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveLeadId(l.id);
                          }}
                          className="text-xs font-semibold text-[#0d9467] hover:underline"
                        >
                          Open Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: TASKS & FOLLOW-UPS MANAGEMENT                                     */}
      {/* ========================================================================= */}
      {activeView === 'tasks' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0d1c15] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#0d9467]" />
              Sales Tasks & Scheduled Follow-ups
            </h2>

            <button
              onClick={() => {
                setTaskForm(prev => ({ ...prev, leadId: leads[0]?.id || '' }));
                setShowTaskModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0d1c15] text-white rounded-lg hover:bg-[#0d1c15]/90"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Overdue / Due Today */}
            <div className="bg-white p-4 rounded-2xl border border-[#0d1c15]/10 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Overdue & Today ({tasksList.overdue.length + tasksList.today.length})
              </h3>

              <div className="space-y-2">
                {[...tasksList.overdue, ...tasksList.today].length === 0 ? (
                  <div className="text-xs text-[#0d1c15]/40 italic py-4">No overdue tasks. All caught up!</div>
                ) : (
                  [...tasksList.overdue, ...tasksList.today].map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() => handleToggleTask(task.id, task.status)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-semibold text-[#0d1c15]">{task.title}</div>
                          <div className="text-[11px] text-[#0d1c15]/60">
                            {task.leads?.full_name} ({task.leads?.company}) • Due: {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
                        {task.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming & Completed */}
            <div className="bg-white p-4 rounded-2xl border border-[#0d1c15]/10 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d9467] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Upcoming Tasks ({tasksList.upcoming.length})
              </h3>

              <div className="space-y-2">
                {tasksList.upcoming.length === 0 ? (
                  <div className="text-xs text-[#0d1c15]/40 italic py-4">No upcoming scheduled tasks.</div>
                ) : (
                  tasksList.upcoming.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl border border-[#0d1c15]/10 bg-[#f7f5f0] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() => handleToggleTask(task.id, task.status)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-semibold text-[#0d1c15]">{task.title}</div>
                          <div className="text-[11px] text-[#0d1c15]/60">
                            {task.leads?.full_name} ({task.leads?.company}) • Due: {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white text-[#0d1c15]/70 border border-[#0d1c15]/10">
                        {task.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: CRM OVERVIEW METRICS & CONVERSION FUNNEL                          */}
      {/* ========================================================================= */}
      {activeView === 'overview' && overview && (
        <div className="space-y-6">
          {/* Conversion Funnel Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#0d1c15]/10 shadow-xs">
            <h2 className="text-base font-bold text-[#0d1c15] mb-1">
              Sales Pipeline Conversion Funnel
            </h2>
            <p className="text-xs text-[#0d1c15]/60 mb-6">
              Cumulative progression of unique prospects across core pipeline stages.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {overview.conversion_funnel.map((stage) => (
                <div key={stage.stage} className="bg-[#f7f5f0] p-4 rounded-xl border border-[#0d1c15]/5">
                  <div className="text-[11px] text-[#0d1c15]/50 font-medium mb-1">{stage.stage}</div>
                  <div className="text-2xl font-bold text-[#0d1c15]">{stage.count}</div>
                  <div className="mt-2 text-xs font-semibold text-[#0d9467]">
                    {stage.conversion_rate}% conversion
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: DETAILED LEAD PROFILE                                            */}
      {/* ========================================================================= */}
      {activeLeadId && (
        <div className="fixed inset-0 bg-[#0d1c15]/50 backdrop-blur-xs z-50 flex items-center justify-end animate-fade-in">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#0d1c15]/10 flex items-center justify-between bg-[#f7f5f0]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00e599]/20 text-[#0d9467] font-bold flex items-center justify-center text-sm">
                  {leadProfile?.lead?.full_name?.charAt(0) || 'L'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0d1c15]">
                    {leadProfile?.lead?.full_name || 'Loading Prospect Profile...'}
                  </h3>
                  <div className="text-xs text-[#0d1c15]/60">
                    {leadProfile?.lead?.job_title} • {leadProfile?.lead?.company}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveLeadId(null)}
                  className="p-1.5 text-[#0d1c15]/40 hover:text-[#0d1c15] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stage Selector Bar */}
            <div className="p-3.5 bg-[#f7f5f0] border-b border-[#0d1c15]/10 flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0d1c15]">Current Stage:</span>
              <select
                value={leadProfile?.lead?.stage || 'New'}
                onChange={(e) => handleStageChange(activeLeadId, e.target.value)}
                className="bg-white font-bold text-[#0d9467] py-1.5 px-3 rounded-lg border border-[#0d1c15]/15 focus:outline-hidden"
              >
                {stages.map((st) => (
                  <option key={st.name} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Drawer Navigation Tabs */}
            <div className="flex items-center border-b border-[#0d1c15]/10 text-xs font-semibold px-4">
              {[
                { id: 'timeline', label: 'Activity Timeline' },
                { id: 'notes', label: `Notes (${leadProfile?.notes?.length || 0})` },
                { id: 'tasks', label: `Tasks (${leadProfile?.tasks?.length || 0})` },
                { id: 'intelligence', label: 'AI Intelligence' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDrawerTab(t.id)}
                  className={`py-3 px-3 transition-colors ${
                    drawerTab === t.id
                      ? 'text-[#0d9467] border-b-2 border-[#0d9467]'
                      : 'text-[#0d1c15]/60 hover:text-[#0d1c15]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drawer Body Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {isProfileLoading ? (
                <div className="py-16 text-center text-[#0d1c15]/40 flex flex-col items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#0d9467] mb-2" />
                  Loading profile and timeline...
                </div>
              ) : (
                <>
                  {/* TAB A: TIMELINE */}
                  {drawerTab === 'timeline' && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {leadProfile?.timeline?.map((event, idx) => (
                          <div key={event.id || idx} className="flex items-start gap-3 relative group">
                            <div className="w-7 h-7 rounded-full bg-[#f7f5f0] border border-[#0d1c15]/10 flex items-center justify-center text-[#0d9467] shrink-0 mt-0.5">
                              {event.type.includes('email') ? (
                                <Send className="w-3.5 h-3.5" />
                              ) : event.type.includes('reply') ? (
                                <MessageSquare className="w-3.5 h-3.5" />
                              ) : event.type.includes('stage') ? (
                                <ArrowRight className="w-3.5 h-3.5" />
                              ) : event.type.includes('note') ? (
                                <FileText className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5" />
                              )}
                            </div>

                            <div className="bg-[#f7f5f0]/60 p-3 rounded-xl border border-[#0d1c15]/5 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#0d1c15]">{event.title}</span>
                                <span className="text-[10px] text-[#0d1c15]/40 font-mono">
                                  {new Date(event.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-[#0d1c15]/70 mt-1 leading-relaxed">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB B: NOTES */}
                  {drawerTab === 'notes' && (
                    <div className="space-y-4">
                      {/* Add Note Form */}
                      <form onSubmit={handleAddNote} className="space-y-2">
                        <textarea
                          rows={3}
                          placeholder="Add private sales call notes, objections, or next steps..."
                          value={newNoteContent}
                          onChange={(e) => setNewNoteContent(e.target.value)}
                          className="w-full p-3 bg-[#f7f5f0] border border-[#0d1c15]/10 rounded-xl text-xs text-[#0d1c15] focus:outline-hidden"
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={isAddingNote || !newNoteContent.trim()}
                            className="px-3.5 py-1.5 bg-[#0d1c15] text-white rounded-lg font-semibold hover:bg-[#0d1c15]/90 disabled:opacity-50"
                          >
                            {isAddingNote ? 'Saving...' : 'Add Note'}
                          </button>
                        </div>
                      </form>

                      {/* Notes List */}
                      <div className="space-y-2.5">
                        {leadProfile?.notes?.map((n) => (
                          <div key={n.id} className="p-3 bg-[#f7f5f0] rounded-xl border border-[#0d1c15]/5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-[#0d1c15]/50">
                              <span className="font-semibold text-[#0d1c15]">{n.author_name}</span>
                              <div className="flex items-center gap-2">
                                <span>{new Date(n.created_at).toLocaleString()}</span>
                                <button
                                  onClick={() => handleDeleteNote(n.id)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-[#0d1c15] leading-relaxed whitespace-pre-wrap">{n.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB C: TASKS */}
                  {drawerTab === 'tasks' && (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setTaskForm(prev => ({ ...prev, leadId: activeLeadId }));
                            setShowTaskModal(true);
                          }}
                          className="px-3 py-1 bg-[#0d1c15] text-white rounded-lg font-semibold text-xs"
                        >
                          + Add Task
                        </button>
                      </div>

                      <div className="space-y-2">
                        {leadProfile?.tasks?.map((t) => (
                          <div
                            key={t.id}
                            className="p-3 rounded-xl border border-[#0d1c15]/10 bg-[#f7f5f0] flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={t.status === 'completed'}
                                onChange={() => handleToggleTask(t.id, t.status)}
                                className="mt-0.5"
                              />
                              <div>
                                <div className="font-semibold text-[#0d1c15]">{t.title}</div>
                                <div className="text-[11px] text-[#0d1c15]/60">Due: {new Date(t.due_date).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white">
                              {t.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB D: INTELLIGENCE */}
                  {drawerTab === 'intelligence' && (
                    <div className="space-y-4">
                      {leadProfile?.qualification ? (
                        <div className="bg-[#f7f5f0] p-4 rounded-xl border border-[#0d1c15]/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#0d1c15]">AI ICP Fit Analysis</span>
                            <span className="font-bold font-mono text-base text-[#0d9467]">
                              {leadProfile.qualification.score}/100
                            </span>
                          </div>

                          <p className="text-xs text-[#0d1c15]/80 leading-relaxed">
                            {leadProfile.qualification.rationale}
                          </p>

                          {leadProfile.qualification.outreach_angles && (
                            <div className="pt-2 border-t border-[#0d1c15]/10">
                              <span className="font-semibold text-[#0d1c15] block mb-1">
                                Suggested Conversation Angles:
                              </span>
                              <div className="text-xs text-[#0d1c15]/70 italic">
                                {Array.isArray(leadProfile.qualification.outreach_angles)
                                  ? leadProfile.qualification.outreach_angles.join(' • ')
                                  : leadProfile.qualification.outreach_angles}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-[#0d1c15]/40 italic py-6 text-center">
                          No AI qualification data available for this prospect.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE TASK                                                        */}
      {/* ========================================================================= */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-[#0d1c15]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#0d1c15]/15 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-[#0d1c15]/10 flex items-center justify-between bg-[#f7f5f0]/40">
              <h3 className="text-sm font-bold text-[#0d1c15] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#0d9467]" /> Create Sales Follow-up Task
              </h3>
              <button onClick={() => setShowTaskModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#0d1c15] block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up on proposal..."
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f7f5f0] border-none rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-[#0d1c15] block mb-1">Target Lead</label>
                <select
                  value={taskForm.leadId}
                  onChange={(e) => setTaskForm({ ...taskForm, leadId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f7f5f0] border-none rounded-lg text-xs font-medium"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.full_name} ({l.company})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#0d1c15] block mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f7f5f0] border-none rounded-lg text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#0d1c15] block mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f7f5f0] border-none rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#0d1c15]/10">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-3 py-1.5 border border-[#0d1c15]/15 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0d1c15] text-white rounded-lg font-semibold"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE DEAL                                                        */}
      {/* ========================================================================= */}
      {showDealModal && (
        <div className="fixed inset-0 bg-[#0d1c15]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#0d1c15]/15 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-[#0d1c15]/10 flex items-center justify-between bg-[#f7f5f0]/40">
              <h3 className="text-sm font-bold text-[#0d1c15] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#00e599]" /> Create Pipeline Deal
              </h3>
              <button onClick={() => setShowDealModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#0d1c15] block mb-1">Deal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Enterprise SaaS License"
                  value={dealForm.name}
                  onChange={(e) => setDealForm({ ...dealForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f7f5f0] border-none rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-[#0d1c15] block mb-1">Associated Lead</label>
                <select
                  value={dealForm.leadId}
                  onChange={(e) => setDealForm({ ...dealForm, leadId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f7f5f0] border-none rounded-lg text-xs font-medium"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.full_name} ({l.company})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#0d1c15] block mb-1">Deal Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={dealForm.value}
                    onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f7f5f0] border-none rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#0d1c15] block mb-1">Close Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={dealForm.probability}
                    onChange={(e) => setDealForm({ ...dealForm, probability: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f7f5f0] border-none rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#0d1c15]/10">
                <button
                  type="button"
                  onClick={() => setShowDealModal(false)}
                  className="px-3 py-1.5 border border-[#0d1c15]/15 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0d1c15] text-white rounded-lg font-semibold"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
