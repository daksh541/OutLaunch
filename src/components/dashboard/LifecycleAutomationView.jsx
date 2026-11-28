import React, { useState, useEffect, useCallback } from 'react';
import {
  GitMerge,
  Search,
  Filter,
  Plus,
  Play,
  Pause,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Layers,
  FileText,
  User,
  Building,
  Check,
  X,
  Send,
  AlertCircle,
  BarChart3,
  Calendar,
  Zap,
  RotateCcw,
  Ban,
  Eye,
  ChevronRight,
  Lock
} from 'lucide-react';
import {
  fetchLifecycleWorkflows,
  createLifecycleWorkflow,
  fetchLifecycleWorkflow,
  updateLifecycleWorkflow,
  publishLifecycleWorkflow,
  pauseLifecycleWorkflow,
  resumeLifecycleWorkflow,
  duplicateLifecycleWorkflow,
  fetchLifecycleTemplates,
  instantiateLifecycleTemplate,
  fetchLifecycleRuns,
  fetchLifecycleRun,
  cancelLifecycleRun,
  retryLifecycleRun,
  fetchLifecycleApprovals,
  approveLifecycleAction,
  rejectLifecycleAction,
  fetchLifecycleRecommendations,
  createDraftFromLifecycleRecommendation,
  fetchLifecycleAnalyticsOverview
} from '../../lib/outreachService';

export default function LifecycleAutomationView({ prospects = [], onNavigateToCrm, onNavigateToCustomerSuccess }) {
  // Navigation & Sub-views
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'workflows' | 'templates' | 'runs' | 'approvals' | 'recommendations' | 'analytics'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Core Data
  const [workflows, setWorkflows] = useState([]);
  const [runs, setRuns] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Modals & Drawers
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [builderForm, setBuilderForm] = useState({
    name: '',
    description: '',
    workflow_type: 'onboarding',
    trigger_event: 'customer_onboarding_started',
    steps: [
      { id: 'step_1', type: 'action', action_type: 'create_cs_task', title: 'Prepare kickoff checklist', priority: 'high', next_step_id: null }
    ]
  });

  // Load Initial Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wfRes, runsRes, appRes, tmplRes, recsRes, analyticsRes] = await Promise.all([
        fetchLifecycleWorkflows().catch(() => ({ workflows: [] })),
        fetchLifecycleRuns().catch(() => ({ runs: [] })),
        fetchLifecycleApprovals({ status: 'pending' }).catch(() => ({ approvals: [] })),
        fetchLifecycleTemplates().catch(() => []),
        fetchLifecycleRecommendations().catch(() => []),
        fetchLifecycleAnalyticsOverview().catch(() => null),
      ]);

      setWorkflows(wfRes?.workflows || []);
      setRuns(runsRes?.runs || []);
      setApprovals(appRes?.approvals || []);
      setTemplates(tmplRes || []);
      setRecommendations(recsRes || []);
      setAnalytics(analyticsRes);
    } catch (err) {
      console.error('[LifecycleAutomationView] Load error:', err);
      setError(err.message || 'Failed to load lifecycle automation data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Publish Workflow
  const handlePublishWorkflow = async (workflowId) => {
    setActionLoading(true);
    try {
      await publishLifecycleWorkflow(workflowId, { change_summary: 'Published from dashboard builder' });
      setSuccessMessage('Workflow published and activated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Pause / Resume Workflow
  const handleToggleWorkflowStatus = async (workflow) => {
    setActionLoading(true);
    try {
      if (workflow.status === 'active') {
        await pauseLifecycleWorkflow(workflow.id);
        setSuccessMessage(`Workflow "${workflow.name}" paused`);
      } else {
        await resumeLifecycleWorkflow(workflow.id);
        setSuccessMessage(`Workflow "${workflow.name}" resumed`);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Duplicate Workflow
  const handleDuplicateWorkflow = async (workflowId) => {
    setActionLoading(true);
    try {
      await duplicateLifecycleWorkflow(workflowId);
      setSuccessMessage('Workflow duplicated into new draft');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Template Instantiation
  const handleInstantiateTemplate = async (templateId) => {
    setActionLoading(true);
    try {
      const created = await instantiateLifecycleTemplate(templateId);
      setSuccessMessage(`Created draft workflow "${created.name}" from template`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDashboardData();
      setActiveTab('workflows');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle AI Recommendation Draft Creation
  const handleCreateDraftFromRecommendation = async (recId) => {
    setActionLoading(true);
    try {
      const draft = await createDraftFromLifecycleRecommendation(recId);
      setSuccessMessage(`Created draft workflow "${draft.name}" from AI recommendation`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDashboardData();
      setActiveTab('workflows');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Approve Action
  const handleApproveAction = async (approvalId) => {
    setActionLoading(true);
    try {
      await approveLifecycleAction(approvalId);
      setSuccessMessage('Action approved and workflow resumed');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject Action
  const handleRejectAction = async (approvalId) => {
    setActionLoading(true);
    try {
      await rejectLifecycleAction(approvalId, 'Rejected by reviewer from approval inbox');
      setSuccessMessage('Action rejected and logged in audit trail');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel Run
  const handleCancelRun = async (runId) => {
    setActionLoading(true);
    try {
      await cancelLifecycleRun(runId, 'Cancelled by user from runs monitor');
      setSuccessMessage('Workflow run cancelled');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Save New Workflow from Builder
  const handleSaveBuilderWorkflow = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const formattedSteps = builderForm.steps.map((st, idx) => ({
        id: st.id || `step_${idx + 1}`,
        type: st.type || 'action',
        action_type: st.action_type || 'create_cs_task',
        params: { title: st.title || 'Workflow Action', priority: st.priority || 'medium' },
        next_step_id: idx < builderForm.steps.length - 1 ? (builderForm.steps[idx + 1].id || `step_${idx + 2}`) : null,
      }));

      await createLifecycleWorkflow({
        name: builderForm.name || 'Custom Lifecycle Workflow',
        description: builderForm.description,
        workflow_type: builderForm.workflow_type,
        trigger_config: { event_type: builderForm.trigger_event },
        workflow_config: { steps: formattedSteps },
      });

      setShowBuilderModal(false);
      setSuccessMessage('Draft workflow saved');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDashboardData();
      setActiveTab('workflows');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Badges
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950 text-[#00e599] border border-emerald-800">Active</span>;
      case 'paused':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-950 text-amber-400 border border-amber-800">Paused</span>;
      case 'archived':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Archived</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-950 text-blue-400 border border-blue-800">Draft</span>;
    }
  };

  const getRunStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950 text-[#00e599] border border-emerald-800 flex items-center gap-1"><CheckCircle2 size={11} /> Completed</span>;
      case 'running':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-950 text-blue-400 border border-blue-800 flex items-center gap-1"><RefreshCw size={11} className="animate-spin" /> Running</span>;
      case 'waiting':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1"><Clock size={11} /> Waiting</span>;
      case 'failed':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-950 text-red-400 border border-red-800 flex items-center gap-1"><AlertTriangle size={11} /> Failed</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1"><Ban size={11} /> Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-zinc-800 text-zinc-300">Queued</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* Top Header Accent Card */}
      <div className="bg-[#0b1410] border border-[#1b3527] rounded-2xl p-6 shadow-sm text-[#edf2ec] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00e599]">
            <GitMerge size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#edf2ec]">Lifecycle Automation</h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#00e599]/15 text-[#00e599] border border-[#00e599]/30 rounded-full">
                AI Driven
              </span>
            </div>
            <p className="text-xs text-[#9ab4a3] mt-0.5">
              Event-triggered lifecycle workflows, human approvals, and compliance safeguards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadDashboardData()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#152e22] text-[#9ab4a3] hover:text-[#edf2ec] border border-[rgba(255,255,255,0.08)] hover:border-emerald-500/30 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowBuilderModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#00e599] text-[#0d1c15] hover:bg-[#00e599]/90 flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Plus size={16} />
            New Workflow
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="mx-8 mt-4 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            <X size={14} />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="mx-8 mt-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#00e599]" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* View Navigation Tabs */}
      <div className="px-8 mt-6">
        <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-px">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'workflows', label: `Workflows (${workflows.length})`, icon: GitMerge },
            { id: 'templates', label: 'Starter Templates', icon: FileText },
            { id: 'runs', label: `Execution Runs (${runs.length})`, icon: Play },
            { id: 'approvals', label: `Approvals (${approvals.length})`, icon: ShieldCheck },
            { id: 'recommendations', label: 'AI Suggestions', icon: Sparkles },
            { id: 'analytics', label: 'Performance & Attribution', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                  isActive
                    ? 'border-[#00e599] text-[#00e599] bg-[#152e22]/50'
                    : 'border-transparent text-[#9ab4a3] hover:text-[#edf2ec] hover:bg-[#11251c]'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-8">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <span className="text-xs text-[#9ab4a3]">Active Workflows</span>
                <div className="text-2xl font-bold text-[#00e599] mt-2">
                  {analytics?.summary?.active_workflows ?? workflows.filter((w) => w.status === 'active').length}
                </div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">{workflows.length} total defined</div>
              </div>

              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <span className="text-xs text-[#9ab4a3]">Total Runs</span>
                <div className="text-2xl font-bold text-[#edf2ec] mt-2">
                  {analytics?.summary?.total_runs ?? runs.length}
                </div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">
                  Completion rate: {analytics?.summary?.completion_rate ?? 100}%
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <span className="text-xs text-[#9ab4a3]">Pending Approvals</span>
                <div className="text-2xl font-bold text-amber-400 mt-2">
                  {approvals.length}
                </div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">Requires human confirmation</div>
              </div>

              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <span className="text-xs text-[#9ab4a3]">Compliance Safeguards</span>
                <div className="text-2xl font-bold text-emerald-400 mt-2">
                  {analytics?.summary?.emails_blocked_by_compliance ?? 0} Blocked
                </div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">Suppressed / opted-out contacts protected</div>
              </div>

              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <span className="text-xs text-[#9ab4a3]">Actions Performed</span>
                <div className="text-2xl font-bold text-[#edf2ec] mt-2">
                  {analytics?.summary?.actions_completed ?? 0}
                </div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">CRM tasks, notes & notifications</div>
              </div>
            </div>

            {/* Pending Approvals Quick Alert */}
            {approvals.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-amber-200">Pending Action Authorizations</h4>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      {approvals.length} sensitive lifecycle actions are waiting for human review before execution.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('approvals')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-[#0d1c15] hover:bg-amber-400"
                >
                  Review Approvals
                </button>
              </div>
            )}

            {/* Active Workflows Summary Grid */}
            <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#edf2ec]">Active Automated Workflows</h3>
                <button
                  onClick={() => setActiveTab('workflows')}
                  className="text-xs text-[#00e599] hover:underline flex items-center gap-1"
                >
                  View All <ChevronRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.map((wf) => (
                  <div key={wf.id} className="p-4 rounded-xl bg-[#152e22]/50 border border-[rgba(255,255,255,0.06)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#edf2ec] truncate">{wf.name}</span>
                      {getStatusBadge(wf.status)}
                    </div>
                    <p className="text-[11px] text-[#9ab4a3] line-clamp-2">{wf.description || 'Lifecycle automation'}</p>
                    <div className="pt-2 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between text-[11px] text-[#9ab4a3]">
                      <span>Trigger: <code>{wf.trigger_config?.event_type || 'manual'}</code></span>
                      <span>{wf.workflow_config?.steps?.length || 0} steps</span>
                    </div>
                  </div>
                ))}
                {workflows.length === 0 && (
                  <div className="col-span-full py-8 text-center text-xs text-[#9ab4a3]">
                    No lifecycle workflows configured yet. Choose from our starter templates or create a custom workflow.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WORKFLOWS */}
        {activeTab === 'workflows' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#edf2ec]">Configured Lifecycle Workflows</h3>
              <button
                onClick={() => setShowBuilderModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#00e599] text-[#0d1c15] flex items-center gap-1.5"
              >
                <Plus size={14} /> New Workflow
              </button>
            </div>

            <div className="space-y-3">
              {workflows.map((wf) => (
                <div key={wf.id} className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#edf2ec]">{wf.name}</h4>
                      {getStatusBadge(wf.status)}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                        {wf.workflow_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9ab4a3]">{wf.description}</p>
                    <div className="text-[11px] text-[#9ab4a3] flex items-center gap-4">
                      <span>Trigger: <code className="text-[#00e599]">{wf.trigger_config?.event_type}</code></span>
                      <span>Steps: {wf.workflow_config?.steps?.length || 0}</span>
                      <span>Version: {wf.active_version ? `v${wf.active_version.version_number}` : 'Unpublished draft'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {wf.status === 'draft' ? (
                      <button
                        onClick={() => handlePublishWorkflow(wf.id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#00e599] text-[#0d1c15] hover:bg-[#00e599]/90 flex items-center gap-1"
                      >
                        <Play size={13} /> Publish & Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleWorkflowStatus(wf)}
                        disabled={actionLoading}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 ${
                          wf.status === 'active'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {wf.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                        {wf.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                    )}

                    <button
                      onClick={() => handleDuplicateWorkflow(wf.id)}
                      disabled={actionLoading}
                      className="p-1.5 rounded-lg text-[#9ab4a3] hover:text-[#edf2ec] bg-[#152e22] border border-[rgba(255,255,255,0.06)]"
                      title="Duplicate Workflow"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: STARTER TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#edf2ec]">Production Lifecycle Templates</h3>
            <p className="text-xs text-[#9ab4a3]">
              Pre-built workflow recipes designed for B2B lifecycle events across onboarding, retention, renewal, and support.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#edf2ec]">{tmpl.name}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {tmpl.workflow_type}
                      </span>
                    </div>
                    <p className="text-xs text-[#9ab4a3] leading-relaxed">{tmpl.description}</p>
                    <div className="text-[11px] text-[#9ab4a3]">
                      Trigger Event: <code className="text-[#00e599]">{tmpl.trigger_config?.event_type}</code>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-end">
                    <button
                      onClick={() => handleInstantiateTemplate(tmpl.id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#00e599] text-[#0d1c15] hover:bg-[#00e599]/90 flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: WORKFLOW RUNS */}
        {activeTab === 'runs' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#edf2ec]">Execution History & Step Monitor</h3>
            <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#11251c]">
              <table className="w-full text-xs text-left">
                <thead className="text-[#9ab4a3] border-b border-[rgba(255,255,255,0.08)] bg-[#152e22]/50">
                  <tr>
                    <th className="py-2.5 px-3">Run ID</th>
                    <th className="py-2.5 px-3">Trigger Event</th>
                    <th className="py-2.5 px-3">Current Step</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Started</th>
                    <th className="py-2.5 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                  {runs.map((r) => (
                    <tr key={r.id} className="hover:bg-[#152e22]/40">
                      <td className="py-2.5 px-3 font-mono text-[#00e599]">{r.id.substring(0, 8)}</td>
                      <td className="py-2.5 px-3 font-mono text-[#9ab4a3]">{r.trigger_event_id}</td>
                      <td className="py-2.5 px-3">{r.current_step_id || 'End'}</td>
                      <td className="py-2.5 px-3">{getRunStatusBadge(r.status)}</td>
                      <td className="py-2.5 px-3 text-[#9ab4a3]">{new Date(r.created_at).toLocaleTimeString()}</td>
                      <td className="py-2.5 px-3">
                        {r.status === 'running' || r.status === 'waiting' ? (
                          <button
                            onClick={() => handleCancelRun(r.id)}
                            className="px-2 py-1 text-[11px] rounded bg-red-950 text-red-300 border border-red-800"
                          >
                            Cancel
                          </button>
                        ) : r.status === 'failed' ? (
                          <button
                            onClick={() => retryLifecycleRun(r.id)}
                            className="px-2 py-1 text-[11px] rounded bg-blue-950 text-blue-300 border border-blue-800"
                          >
                            Retry
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#9ab4a3]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {runs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[#9ab4a3]">
                        No workflow runs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: APPROVALS INBOX */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#edf2ec] flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-400" />
              Human Authorization & Approval Inbox
            </h3>
            <p className="text-xs text-[#9ab4a3]">
              Lifecycle actions that require explicit human approval before external communication or CRM modification.
            </p>

            <div className="space-y-3">
              {approvals.map((app) => (
                <div key={app.id} className="p-4 rounded-xl bg-[#11251c] border border-amber-800/60 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-950 text-amber-300 border border-amber-700">
                        {app.action_type}
                      </span>
                      <span className="text-xs text-[#9ab4a3]">Requested by: {app.requested_by}</span>
                    </div>
                    <pre className="text-xs text-[#edf2ec] bg-[#152e22] p-2.5 rounded font-mono border border-[rgba(255,255,255,0.06)] mt-2">
                      {JSON.stringify(app.proposed_action, null, 2)}
                    </pre>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRejectAction(app.id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-950 text-red-300 border border-red-800 hover:bg-red-900/60"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveAction(app.id)}
                      disabled={actionLoading}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#00e599] text-[#0d1c15] hover:bg-[#00e599]/90 font-bold"
                    >
                      Authorize Action
                    </button>
                  </div>
                </div>
              ))}

              {approvals.length === 0 && (
                <div className="p-8 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] text-center text-xs text-[#9ab4a3]">
                  No pending action approvals. All systems operating safely within automatic parameters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: AI RECOMMENDATIONS */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#edf2ec] flex items-center gap-2">
              <Sparkles size={18} className="text-[#00e599]" />
              AI Workflow Recommendations
            </h3>
            <p className="text-xs text-[#9ab4a3]">
              Grounded workflow opportunities identified from verified CRM, customer health, renewal, and support ticket telemetry.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => (
                <div key={rec.id} className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#edf2ec]">{rec.title}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {rec.workflow_type}
                      </span>
                    </div>
                    <p className="text-xs text-[#9ab4a3]">{rec.purpose}</p>

                    <div className="p-2.5 rounded bg-[#152e22] text-xs text-[#edf2ec] border border-[rgba(255,255,255,0.05)]">
                      <strong className="text-[#00e599] block text-[10px] uppercase mb-0.5">Telemetry Evidence:</strong>
                      {rec.evidence}
                    </div>

                    <div className="text-[11px] text-[#9ab4a3]">
                      Trigger: <code className="text-[#00e599]">{rec.trigger_event}</code>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-end">
                    <button
                      onClick={() => handleCreateDraftFromRecommendation(rec.id)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#00e599] text-[#0d1c15] hover:bg-[#00e599]/90 flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Create Editable Draft
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: ANALYTICS & ATTRIBUTION */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] text-center">
                <span className="text-xs text-[#9ab4a3] uppercase">Workflow Completion Rate</span>
                <div className="text-4xl font-bold text-[#00e599] mt-3">
                  {analytics?.summary?.completion_rate ?? 100}%
                </div>
                <div className="text-xs text-[#9ab4a3] mt-2">
                  {analytics?.summary?.completed_runs ?? 0} completed / {analytics?.summary?.total_runs ?? 0} total runs
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] text-center">
                <span className="text-xs text-[#9ab4a3] uppercase">Approval Rate</span>
                <div className="text-4xl font-bold text-emerald-400 mt-3">
                  {analytics?.summary?.approval_rate ?? 100}%
                </div>
                <div className="text-xs text-[#9ab4a3] mt-2">Human authorizations approved</div>
              </div>

              <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] text-center">
                <span className="text-xs text-[#9ab4a3] uppercase">Compliance Filter Protection</span>
                <div className="text-4xl font-bold text-amber-400 mt-3">
                  {analytics?.summary?.emails_blocked_by_compliance ?? 0}
                </div>
                <div className="text-xs text-[#9ab4a3] mt-2">Suppressed / unsubscribed emails blocked</div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-2">
              <h4 className="text-xs font-bold text-[#edf2ec] uppercase">Attribution Methodology & Verification</h4>
              <p className="text-xs text-[#9ab4a3] leading-relaxed">
                OutLaunch applies strict deterministic temporal correlation: business outcomes (such as meeting conversions, retention, and renewal agreements) are only attributed to lifecycle workflows when the event occurred within a verified 14-day window for the exact prospect or customer entity. Theoretical or speculative revenue claims are excluded.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* NEW WORKFLOW BUILDER MODAL */}
      {showBuilderModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#11251c] border border-[rgba(255,255,255,0.12)] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
              <h3 className="text-base font-bold text-[#edf2ec] flex items-center gap-2">
                <GitMerge size={18} className="text-[#00e599]" />
                Workflow Builder
              </h3>
              <button onClick={() => setShowBuilderModal(false)} className="text-[#9ab4a3] hover:text-[#edf2ec]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBuilderWorkflow} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Workflow Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Customer Onboarding Sequence"
                  value={builderForm.name}
                  onChange={(e) => setBuilderForm({ ...builderForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-[#00e599]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Summary of workflow lifecycle purpose"
                  value={builderForm.description}
                  onChange={(e) => setBuilderForm({ ...builderForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-[#00e599]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Workflow Type</label>
                  <select
                    value={builderForm.workflow_type}
                    onChange={(e) => setBuilderForm({ ...builderForm, workflow_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none"
                  >
                    <option value="onboarding">Customer Onboarding</option>
                    <option value="engagement">Engagement & Retention</option>
                    <option value="renewal">Contract Renewal</option>
                    <option value="reactivation">Reactivation</option>
                    <option value="support_followup">Support Follow-up</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Trigger Event</label>
                  <select
                    value={builderForm.trigger_event}
                    onChange={(e) => setBuilderForm({ ...builderForm, trigger_event: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none"
                  >
                    <option value="customer_onboarding_started">Customer Onboarding Started</option>
                    <option value="customer_marked_at_risk">Customer Marked At Risk</option>
                    <option value="renewal_approaching">Renewal Approaching</option>
                    <option value="support_ticket_escalated">Support Ticket Escalated</option>
                    <option value="lead_qualified">Lead Qualified</option>
                    <option value="meeting_completed">Meeting Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Initial Step Action</label>
                <input
                  type="text"
                  placeholder="Task title or action description"
                  value={builderForm.steps[0]?.title || ''}
                  onChange={(e) => {
                    const newSteps = [...builderForm.steps];
                    newSteps[0].title = e.target.value;
                    setBuilderForm({ ...builderForm, steps: newSteps });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-[#00e599]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)]">
                <button
                  type="button"
                  onClick={() => setShowBuilderModal(false)}
                  className="px-4 py-2 text-xs rounded-lg text-[#9ab4a3] hover:text-[#edf2ec]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#00e599] text-[#0d1c15] hover:bg-[#00e599]/90 disabled:opacity-50"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
