import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Globe,
  Compass,
  Users,
  Target,
  BarChart3,
  Scale,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  Layers,
  Briefcase,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Sliders,
  DollarSign,
  Calendar,
  CheckSquare,
  Clock,
  Building2,
  X,
  Edit3,
  UserCheck,
  FileText,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import {
  fetchTerritories,
  createTerritory,
  updateTerritory,
  deleteTerritory,
  fetchTerritoryOverlaps,
  fetchTerritoryBalance,
  fetchTerritoryPerformance,
  previewTerritoryAssignments,
  assignAccountsToTerritory,
  reassignAccount,
  fetchAccountPriorities,
  recalculateAccountPriorities,
  fetchAccountPlans,
  fetchAccountPlan,
  generateAccountPlanDraft,
  saveAccountPlan,
  addAccountPlanAction,
  updateAccountPlanAction,
  setTerritoryTarget
} from '../../lib/outreachService';

export default function SalesTerritoryView({ onNavigateToLeads, onNavigateToCrm }) {
  // Navigation Tabs: 'overview', 'territories', 'accounts', 'prioritization', 'plans', 'balancing'
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Core Data
  const [territories, setTerritories] = useState([]);
  const [overlaps, setOverlaps] = useState([]);
  const [balance, setBalance] = useState(null);
  const [accountPriorities, setAccountPriorities] = useState([]);
  const [accountPlans, setAccountPlans] = useState([]);

  // Modals & Drawers
  const [showTerritoryModal, setShowTerritoryModal] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState(null);
  const [showAssignPreviewModal, setShowAssignPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewTerritoryId, setPreviewTerritoryId] = useState('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignAccountTarget, setReassignAccountTarget] = useState(null);
  const [reassignTargetTerritoryId, setReassignTargetTerritoryId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Target Modal
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedTerritoryForTarget, setSelectedTerritoryForTarget] = useState(null);
  const [targetForm, setTargetForm] = useState({
    target_revenue: 150000,
    target_new_logos: 10,
    period_type: 'quarterly'
  });

  // Account Plan Generation & View Drawer
  const [showPlanDrawer, setShowPlanDrawer] = useState(false);
  const [selectedPlanAccount, setSelectedPlanAccount] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [draftPlan, setDraftPlan] = useState(null);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionDueDate, setNewActionDueDate] = useState('');
  const [newActionPriority, setNewActionPriority] = useState('medium');

  // Search & Filter States
  const [accountSearch, setAccountSearch] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Territory Form State
  const [territoryForm, setTerritoryForm] = useState({
    name: '',
    code: '',
    description: '',
    segment: 'Mid-Market',
    parent_territory_id: '',
    owner_user_id: '',
    rules: {
      geography: { countries: [], regions: [], cities: [] },
      industry: { included: [], excluded: [] },
      company_size: { min_employees: null, max_employees: null },
      account_tier: { tiers: [] }
    }
  });

  // Quick inputs for rules
  const [ruleGeoInput, setRuleGeoInput] = useState('');
  const [ruleIndustryInput, setRuleIndustryInput] = useState('');

  // Notice helper
  const notify = (msg, type = 'success') => {
    setActionNotice({ msg, type });
    setTimeout(() => setActionNotice(null), 4500);
  };

  // 1. Initial Data Fetch
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [terrRes, ovlRes, balRes, prioRes, plansRes] = await Promise.all([
        fetchTerritories().catch(() => ({ data: [] })),
        fetchTerritoryOverlaps().catch(() => ({ data: { overlaps: [] } })),
        fetchTerritoryBalance().catch(() => ({ data: null })),
        fetchAccountPriorities().catch(() => ({ data: [] })),
        fetchAccountPlans().catch(() => ({ data: [] }))
      ]);

      setTerritories(terrRes.data || []);
      setOverlaps(ovlRes.data?.overlaps || []);
      setBalance(balRes.data || null);
      setAccountPriorities(prioRes.data || []);
      setAccountPlans(plansRes.data || []);
    } catch (err) {
      console.error('Failed to load Sales Territory data:', err);
      setError('Could not load territory and account planning data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Recalculate Prioritization Handler
  const handleRecalculatePriorities = async () => {
    try {
      setRefreshing(true);
      const res = await recalculateAccountPriorities();
      notify(`Recalculated priority scores for ${res.data?.processed || 0} accounts.`);
      await loadAllData();
    } catch (err) {
      notify('Failed to recalculate account priorities: ' + err.message, 'error');
      setRefreshing(false);
    }
  };

  // Territory Create/Update Form Handler
  const handleSaveTerritory = async (e) => {
    e.preventDefault();
    if (!territoryForm.name.trim()) {
      notify('Territory name is required.', 'error');
      return;
    }

    try {
      if (editingTerritory) {
        await updateTerritory(editingTerritory.id, territoryForm);
        notify(`Territory "${territoryForm.name}" updated successfully.`);
      } else {
        await createTerritory(territoryForm);
        notify(`Territory "${territoryForm.name}" created successfully.`);
      }
      setShowTerritoryModal(false);
      setEditingTerritory(null);
      resetTerritoryForm();
      loadAllData();
    } catch (err) {
      notify('Failed to save territory: ' + err.message, 'error');
    }
  };

  const resetTerritoryForm = () => {
    setTerritoryForm({
      name: '',
      code: '',
      description: '',
      segment: 'Mid-Market',
      parent_territory_id: '',
      owner_user_id: '',
      rules: {
        geography: { countries: [], regions: [], cities: [] },
        industry: { included: [], excluded: [] },
        company_size: { min_employees: null, max_employees: null },
        account_tier: { tiers: [] }
      }
    });
    setRuleGeoInput('');
    setRuleIndustryInput('');
  };

  // Open Edit Modal
  const handleEditTerritory = (t) => {
    setEditingTerritory(t);
    setTerritoryForm({
      name: t.name || '',
      code: t.code || '',
      description: t.description || '',
      segment: t.segment || 'Mid-Market',
      parent_territory_id: t.parent_territory_id || '',
      owner_user_id: t.owner_user_id || '',
      rules: t.rules || {
        geography: { countries: [], regions: [], cities: [] },
        industry: { included: [], excluded: [] },
        company_size: { min_employees: null, max_employees: null },
        account_tier: { tiers: [] }
      }
    });
    setShowTerritoryModal(true);
  };

  // Archive / Delete Territory
  const handleDeleteTerritory = async (id, name) => {
    if (!window.confirm(`Are you sure you want to archive territory "${name}"? Active assignments will remain preserved.`)) {
      return;
    }
    try {
      await deleteTerritory(id);
      notify(`Territory "${name}" archived.`);
      loadAllData();
    } catch (err) {
      notify('Failed to archive territory: ' + err.message, 'error');
    }
  };

  // Preview Assignments
  const handlePreviewAssignments = async (territoryId) => {
    try {
      setPreviewTerritoryId(territoryId);
      setShowAssignPreviewModal(true);
      setPreviewData(null);
      const res = await previewTerritoryAssignments(territoryId);
      setPreviewData(res.data);
    } catch (err) {
      notify('Failed to preview matches: ' + err.message, 'error');
      setShowAssignPreviewModal(false);
    }
  };

  // Apply Previewed Assignments
  const handleApplyAssignments = async () => {
    if (!previewData || !previewTerritoryId) return;
    try {
      const leadIds = previewData.matching_leads?.map(l => l.id) || [];
      const res = await assignAccountsToTerritory(previewTerritoryId, {
        lead_ids: leadIds,
        assignment_method: 'rule_based'
      });
      notify(`Successfully assigned ${res.data?.assigned_count || 0} accounts.`);
      setShowAssignPreviewModal(false);
      loadAllData();
    } catch (err) {
      notify('Failed to assign accounts: ' + err.message, 'error');
    }
  };

  // Reassign Single Account Handler
  const handleExecuteReassign = async () => {
    if (!reassignAccountTarget || !reassignTargetTerritoryId) return;
    try {
      await reassignAccount({
        lead_id: reassignAccountTarget.lead_id,
        target_territory_id: reassignTargetTerritoryId,
        reason: reassignReason || 'Manager territory adjustment'
      });
      notify(`Reassigned "${reassignAccountTarget.lead?.company || 'Account'}" to new territory.`);
      setShowReassignModal(false);
      setReassignAccountTarget(null);
      setReassignReason('');
      loadAllData();
    } catch (err) {
      notify('Failed to reassign account: ' + err.message, 'error');
    }
  };

  // Save Target Handler
  const handleSaveTarget = async (e) => {
    e.preventDefault();
    if (!selectedTerritoryForTarget) return;
    try {
      await setTerritoryTarget(selectedTerritoryForTarget.id, targetForm);
      notify(`Quota target set for ${selectedTerritoryForTarget.name}.`);
      setShowTargetModal(false);
      loadAllData();
    } catch (err) {
      notify('Failed to save quota target: ' + err.message, 'error');
    }
  };

  // Open Account Plan Drawer
  const handleOpenAccountPlan = async (account) => {
    setSelectedPlanAccount(account);
    setShowPlanDrawer(true);
    setDraftPlan(null);
    setCurrentPlan(null);
    try {
      const res = await fetchAccountPlan(account.lead_id);
      if (res.data) {
        setCurrentPlan(res.data);
      }
    } catch {
      // Plan might not exist yet
    }
  };

  // Generate Draft Plan
  const handleGenerateDraft = async () => {
    if (!selectedPlanAccount) return;
    try {
      setGeneratingDraft(true);
      const res = await generateAccountPlanDraft(selectedPlanAccount.lead_id, {
        focus_area: 'Enterprise Expansion and Security'
      });
      setDraftPlan(res.data?.draft_plan);
    } catch (err) {
      notify('Failed to generate draft plan: ' + err.message, 'error');
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Commit / Save Draft Plan
  const handleConfirmSavePlan = async () => {
    if (!selectedPlanAccount || !draftPlan) return;
    try {
      const res = await saveAccountPlan({
        lead_id: selectedPlanAccount.lead_id,
        territory_id: selectedPlanAccount.territory_id || territories[0]?.id || null,
        target_revenue: draftPlan.target_revenue || 50000,
        strategic_objectives: draftPlan.strategic_objectives || [],
        strategy_summary: draftPlan.strategy_summary || '',
        pain_points: draftPlan.pain_points || [],
        stakeholder_map: draftPlan.stakeholder_map || [],
        meeting_agenda: draftPlan.meeting_agenda || [],
        competitor_analysis: draftPlan.competitor_analysis || [],
        plan_status: 'active'
      });
      notify('Account strategy plan confirmed and saved.');
      setCurrentPlan(res.data);
      setDraftPlan(null);
      loadAllData();
    } catch (err) {
      notify('Failed to save plan: ' + err.message, 'error');
    }
  };

  // Add Action Item to Plan
  const handleAddAction = async (e) => {
    e.preventDefault();
    if (!currentPlan || !newActionTitle.trim()) return;
    try {
      await addAccountPlanAction(currentPlan.id, {
        title: newActionTitle.trim(),
        due_date: newActionDueDate || null,
        priority: newActionPriority
      });
      setNewActionTitle('');
      setNewActionDueDate('');
      notify('Action item added to account plan.');
      // Refresh current plan
      const refreshed = await fetchAccountPlan(selectedPlanAccount.lead_id);
      setCurrentPlan(refreshed.data);
    } catch (err) {
      notify('Failed to add action item: ' + err.message, 'error');
    }
  };

  // Toggle Action Status
  const handleToggleAction = async (actionId, currentStatus) => {
    if (!currentPlan) return;
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await updateAccountPlanAction(currentPlan.id, actionId, {
        status: nextStatus
      });
      const refreshed = await fetchAccountPlan(selectedPlanAccount.lead_id);
      setCurrentPlan(refreshed.data);
    } catch (err) {
      notify('Failed to update action: ' + err.message, 'error');
    }
  };

  // Computed KPI Metrics
  const summaryMetrics = useMemo(() => {
    const totalTerritories = territories.filter(t => t.status === 'active').length;
    const totalAccounts = accountPriorities.length;
    const assignedAccounts = accountPriorities.filter(a => a.territory_id).length;
    const unassignedAccounts = totalAccounts - assignedAccounts;

    const highPriorityAccounts = accountPriorities.filter(a => a.priority_category === 'High Priority').length;
    const totalPipeline = accountPriorities.reduce((sum, a) => sum + (Number(a.deal_value) || 0), 0);
    const weightedPipeline = accountPriorities.reduce((sum, a) => {
      const val = Number(a.deal_value) || 0;
      const prob = Number(a.lead?.probability) || 0.25;
      return sum + (val * prob);
    }, 0);

    const totalTargets = territories.reduce((sum, t) => {
      const tgt = t.targets?.[0]?.target_revenue || 0;
      return sum + Number(tgt);
    }, 0);

    const attainment = totalTargets > 0 ? ((totalPipeline / totalTargets) * 100).toFixed(1) : '0.0';

    return {
      totalTerritories,
      totalAccounts,
      assignedAccounts,
      unassignedAccounts,
      highPriorityAccounts,
      totalPipeline,
      weightedPipeline,
      totalTargets,
      attainment,
      overlapCount: overlaps.length,
      imbalanceWarnings: balance?.workload_imbalance_warnings?.length || 0
    };
  }, [territories, accountPriorities, overlaps, balance]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accountPriorities.filter(item => {
      const lead = item.lead || {};
      const company = (lead.company || '').toLowerCase();
      const contact = (lead.name || '').toLowerCase();
      const industry = (lead.industry || '').toLowerCase();
      const q = accountSearch.toLowerCase();

      const matchSearch = !q || company.includes(q) || contact.includes(q) || industry.includes(q);
      const matchTerritory = territoryFilter === 'all'
        ? true
        : territoryFilter === 'unassigned'
        ? !item.territory_id
        : item.territory_id === territoryFilter;

      const matchTier = tierFilter === 'all' ? true : (item.account_tier || lead.account_tier) === tierFilter;
      const matchPriority = priorityFilter === 'all' ? true : item.priority_category === priorityFilter;

      return matchSearch && matchTerritory && matchTier && matchPriority;
    });
  }, [accountPriorities, accountSearch, territoryFilter, tierFilter, priorityFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8">
        <RefreshCw className="w-8 h-8 text-[#0d9467] animate-spin mb-4" />
        <h3 className="text-base font-semibold text-[#0d1c15]">Loading Territory & Account Intelligence...</h3>
        <p className="text-xs text-[#73827a] mt-1 max-w-sm">
          Analyzing geographic segments, deterministic account priority scores, and team capacity balance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notice */}
      {actionNotice && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border shadow-sm transition-all ${
          actionNotice.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-[#edf2ec] border-[#0d9467]/30 text-[#0d1c15]'
        }`}>
          <div className="flex items-center gap-2">
            {actionNotice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#0d9467] shrink-0" />
            )}
            <span>{actionNotice.msg}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#0d1c15]/08 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#0d1c15] text-[#00e599] flex items-center justify-center shrink-0 shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#0d1c15] tracking-tight font-display">
                  Territory & Account Planning
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#00e599]/20 text-[#0d9467] text-[10px] font-mono font-bold">
                  AI v1.0.0
                </span>
              </div>
              <p className="text-xs text-[#73827a] mt-0.5">
                Deterministic rule-based territory segmentation, explainable account prioritization, and grounded account strategy plans.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleRecalculatePriorities}
            disabled={refreshing}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#0d1c15]/10 text-xs font-semibold text-[#0d1c15] hover:bg-[#edf2ec] transition-colors cursor-pointer disabled:opacity-50"
            title="Recalculate deterministic priority scores across accounts"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0d9467] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Recalculate Scores</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetTerritoryForm();
              setEditingTerritory(null);
              setShowTerritoryModal(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#00e599]" />
            <span>Create Territory</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#0d1c15]/08 text-xs font-medium">
        {[
          { id: 'overview', label: 'Territory Overview', icon: Layers },
          { id: 'territories', label: 'Territory Management', icon: Globe, count: territories.length },
          { id: 'accounts', label: 'Account Explorer & Assignments', icon: Building2, count: filteredAccounts.length },
          { id: 'prioritization', label: 'Prioritization Engine', icon: Sparkles },
          { id: 'plans', label: 'Account Plans', icon: FileText, count: accountPlans.length },
          { id: 'balancing', label: 'Capacity & Balancing', icon: Scale, warning: summaryMetrics.imbalanceWarnings > 0 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0d1c15] text-[#00e599] font-semibold shadow-xs'
                  : 'text-[#73827a] hover:text-[#0d1c15] hover:bg-white/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  isActive ? 'bg-[#00e599]/20 text-[#00e599]' : 'bg-[#0d1c15]/06 text-[#73827a]'
                }`}>
                  {tab.count}
                </span>
              )}
              {tab.warning && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Workload imbalance detected" />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overlap & Workload Alert Banners */}
          {overlaps.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-950">Territory Overlaps Detected ({overlaps.length})</h4>
                  <p className="text-amber-800/90 mt-0.5">
                    Overlapping segmentation rules detected between territories. Review conflicting rules to prevent rep collision:
                  </p>
                  <ul className="list-disc list-inside mt-1.5 space-y-0.5 font-mono text-[11px] text-amber-900">
                    {overlaps.slice(0, 3).map((ov, i) => (
                      <li key={i}>
                        <span className="font-semibold">{ov.territory_a_name}</span> and <span className="font-semibold">{ov.territory_b_name}</span> overlap on {ov.reasons?.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('territories')}
                className="px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 font-semibold text-amber-900 transition-colors shrink-0"
              >
                Resolve Overlaps
              </button>
            </div>
          )}

          {summaryMetrics.imbalanceWarnings > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-rose-950">Capacity & Workload Imbalance Detected</h4>
                  <p className="text-rose-800/90 mt-0.5">
                    {balance.workload_imbalance_warnings[0]}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('balancing')}
                className="px-3 py-1.5 rounded-lg bg-rose-200 hover:bg-rose-300 font-semibold text-rose-900 transition-colors shrink-0"
              >
                View Balancing
              </button>
            </div>
          )}

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#73827a] block mb-1">
                Active Territories
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-[#0d1c15]">
                  {summaryMetrics.totalTerritories}
                </span>
                <span className="text-[11px] text-[#0d9467] font-semibold">
                  {summaryMetrics.assignedAccounts} assigned
                </span>
              </div>
              <div className="mt-2 text-[11px] text-[#73827a] flex items-center justify-between border-t border-[#0d1c15]/06 pt-2">
                <span>Unassigned accounts:</span>
                <span className={`font-mono font-semibold ${summaryMetrics.unassignedAccounts > 0 ? 'text-amber-600' : 'text-[#0d9467]'}`}>
                  {summaryMetrics.unassignedAccounts}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#73827a] block mb-1">
                High Priority Accounts
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-[#0d1c15]">
                  {summaryMetrics.highPriorityAccounts}
                </span>
                <span className="text-[11px] text-[#0d9467] font-semibold">
                  Score ≥ 75
                </span>
              </div>
              <div className="mt-2 text-[11px] text-[#73827a] flex items-center justify-between border-t border-[#0d1c15]/06 pt-2">
                <span>Total accounts:</span>
                <span className="font-mono font-semibold text-[#0d1c15]">{summaryMetrics.totalAccounts}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#73827a] block mb-1">
                Open Pipeline
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-[#0d1c15]">
                  ${summaryMetrics.totalPipeline.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-[#73827a] flex items-center justify-between border-t border-[#0d1c15]/06 pt-2">
                <span>Weighted pipeline:</span>
                <span className="font-mono font-semibold text-[#0d9467]">
                  ${Math.round(summaryMetrics.weightedPipeline).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#73827a] block mb-1">
                Territory Coverage
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-[#0d1c15]">
                  {summaryMetrics.totalTargets > 0 ? `${summaryMetrics.attainment}%` : 'N/A'}
                </span>
                <span className="text-[11px] text-[#73827a]">
                  vs Quota
                </span>
              </div>
              <div className="mt-2 text-[11px] text-[#73827a] flex items-center justify-between border-t border-[#0d1c15]/06 pt-2">
                <span>Total target quota:</span>
                <span className="font-mono font-semibold text-[#0d1c15]">
                  ${summaryMetrics.totalTargets.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Territory Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#0d1c15] font-display">Active Territory Distribution</h3>
              <button
                onClick={() => setActiveTab('territories')}
                className="text-xs text-[#0d9467] font-semibold hover:underline flex items-center gap-1"
              >
                <span>Manage All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {territories.slice(0, 3).map((t) => {
                const assigned = t.accounts_count || 0;
                const pipe = t.open_pipeline || 0;
                const tgt = t.targets?.[0]?.target_revenue || 0;
                const cov = tgt > 0 ? (pipe / tgt).toFixed(1) : 'N/A';

                return (
                  <div key={t.id} className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-[#0d9467] font-semibold uppercase">
                            {t.code || t.segment}
                          </span>
                          <h4 className="text-sm font-bold text-[#0d1c15]">{t.name}</h4>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#edf2ec] text-[#0d1c15] text-[10px] font-semibold">
                          {t.segment}
                        </span>
                      </div>

                      <p className="text-xs text-[#73827a] mt-1 line-clamp-2">
                        {t.description || 'No description provided.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#0d1c15]/06 text-[11px]">
                        <div>
                          <span className="text-[#73827a] block">Assigned Accounts</span>
                          <span className="font-mono font-semibold text-[#0d1c15]">{assigned}</span>
                        </div>
                        <div>
                          <span className="text-[#73827a] block">Open Pipeline</span>
                          <span className="font-mono font-semibold text-[#0d9467]">${pipe.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[#73827a] block">Target Quota</span>
                          <span className="font-mono font-semibold text-[#0d1c15]">
                            {tgt > 0 ? `$${tgt.toLocaleString()}` : 'Not set'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#73827a] block">Pipeline Coverage</span>
                          <span className={`font-mono font-semibold ${cov !== 'N/A' && Number(cov) < 3.0 ? 'text-amber-600' : 'text-[#0d9467]'}`}>
                            {cov !== 'N/A' ? `${cov}x` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#0d1c15]/06 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => handlePreviewAssignments(t.id)}
                        className="text-[#0d9467] font-semibold hover:underline"
                      >
                        Preview Matches
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTerritoryForTarget(t);
                          setShowTargetModal(true);
                        }}
                        className="text-[#73827a] hover:text-[#0d1c15] font-semibold"
                      >
                        Set Target
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* High Priority Grounded Account Preview */}
          <div className="p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0d1c15] font-display">
                  Top Priority Accounts Ready for Strategic Engagement
                </h3>
                <p className="text-xs text-[#73827a]">
                  Accounts ranked by deterministic 5-component scoring (Company Fit, Revenue Potential, Intent, Recency, Completeness).
                </p>
              </div>
              <button
                onClick={() => setActiveTab('accounts')}
                className="text-xs text-[#0d9467] font-semibold hover:underline flex items-center gap-1"
              >
                <span>View All Accounts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#0d1c15]/06">
              {accountPriorities.slice(0, 4).map((acc) => {
                const lead = acc.lead || {};
                return (
                  <div key={acc.lead_id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#edf2ec] text-[#0d1c15] font-bold text-xs flex items-center justify-center shrink-0">
                        {lead.company?.charAt(0)?.toUpperCase() || 'A'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0d1c15]">{lead.company || 'Unnamed Company'}</span>
                          <span className={`px-2 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                            acc.priority_category === 'High Priority'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {acc.priority_score}/100 • {acc.priority_category}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#73827a]">
                          {lead.industry || 'Unknown Industry'} • {lead.location || 'Unknown Location'} • Pipeline: ${Number(acc.deal_value || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAccountPlan(acc)}
                        className="px-2.5 py-1 rounded-lg bg-[#edf2ec] hover:bg-[#0d1c15] hover:text-white text-xs font-semibold text-[#0d1c15] transition-colors cursor-pointer"
                      >
                        Account Plan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TERRITORY MANAGEMENT */}
      {activeTab === 'territories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0d1c15] font-display">Sales Territories</h3>
              <p className="text-xs text-[#73827a]">
                Configure rule-based boundaries across Geography, Industry, Company Size, and Account Tiers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetTerritoryForm();
                setEditingTerritory(null);
                setShowTerritoryModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1c15] text-white text-xs font-semibold hover:bg-[#162b21] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#00e599]" />
              <span>Add Territory</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {territories.map((t) => {
              const ruleGeo = t.rules?.geography?.countries?.join(', ') || t.rules?.geography?.regions?.join(', ') || 'Any Geography';
              const ruleInd = t.rules?.industry?.included?.join(', ') || 'Any Industry';
              const minEmp = t.rules?.company_size?.min_employees;
              const maxEmp = t.rules?.company_size?.max_employees;
              const ruleSize = (minEmp || maxEmp) ? `${minEmp || 0} - ${maxEmp || '∞'} employees` : 'Any Size';

              return (
                <div key={t.id} className="p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#0d9467]">{t.code || 'TERR'}</span>
                      <h4 className="text-sm font-bold text-[#0d1c15]">{t.name}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-[#edf2ec] text-[#0d1c15] text-[10px] font-semibold">
                        {t.segment}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#73827a] mt-1">
                      {t.description || 'Configured deterministic territory matching rules.'}
                    </p>

                    {/* Rule Tags */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
                      <span className="px-2 py-0.8 rounded-md bg-[#edf2ec] text-[#0d1c15] font-mono">
                        🌍 Geo: {ruleGeo}
                      </span>
                      <span className="px-2 py-0.8 rounded-md bg-[#edf2ec] text-[#0d1c15] font-mono">
                        🏢 Industry: {ruleInd}
                      </span>
                      <span className="px-2 py-0.8 rounded-md bg-[#edf2ec] text-[#0d1c15] font-mono">
                        👥 Size: {ruleSize}
                      </span>
                    </div>
                  </div>

                  {/* Territory Stats */}
                  <div className="flex items-center gap-6 text-xs shrink-0 border-t md:border-t-0 md:border-l border-[#0d1c15]/06 pt-3 md:pt-0 md:pl-6">
                    <div>
                      <span className="text-[10px] font-mono text-[#73827a] uppercase block">Accounts</span>
                      <span className="text-sm font-bold text-[#0d1c15] font-mono">{t.accounts_count || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-[#73827a] uppercase block">Pipeline</span>
                      <span className="text-sm font-bold text-[#0d9467] font-mono">${(t.open_pipeline || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-[#73827a] uppercase block">Quota Target</span>
                      <span className="text-sm font-bold text-[#0d1c15] font-mono">
                        {t.targets?.[0]?.target_revenue ? `$${Number(t.targets[0].target_revenue).toLocaleString()}` : 'None'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        type="button"
                        onClick={() => handlePreviewAssignments(t.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#edf2ec] hover:bg-[#0d1c15] hover:text-white text-xs font-semibold text-[#0d1c15] transition-colors cursor-pointer"
                        title="Preview & match eligible CRM accounts"
                      >
                        Preview Matches
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditTerritory(t)}
                        className="p-1.5 rounded-lg hover:bg-[#edf2ec] text-[#73827a] hover:text-[#0d1c15] cursor-pointer"
                        title="Edit territory rules"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTerritory(t.id, t.name)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-[#73827a] hover:text-rose-600 cursor-pointer"
                        title="Archive territory"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNT EXPLORER & ASSIGNMENT HUB */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0d1c15] font-display">Account Explorer & Assignments</h3>
              <p className="text-xs text-[#73827a]">
                View accounts, review assigned territories, inspect priority scores, and reassign ownership with audit tracking.
              </p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-3 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search company, contact, or industry..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-xs outline-none focus:border-[#0d9467]"
              />
            </div>

            <select
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-xs outline-none focus:border-[#0d9467]"
            >
              <option value="all">All Territories</option>
              <option value="unassigned">Unassigned Only</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-xs outline-none focus:border-[#0d9467]"
            >
              <option value="all">All Account Tiers</option>
              <option value="tier_1">Tier 1 (Enterprise)</option>
              <option value="tier_2">Tier 2 (Mid-Market)</option>
              <option value="tier_3">Tier 3 (Growth/SMB)</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-xs outline-none focus:border-[#0d9467]"
            >
              <option value="all">All Priority Levels</option>
              <option value="High Priority">High Priority (75+)</option>
              <option value="Medium Priority">Medium Priority (50-74)</option>
              <option value="Low Priority">Low Priority (25-49)</option>
              <option value="Insufficient Data">Insufficient Data (&lt;25)</option>
            </select>
          </div>

          {/* Accounts Table */}
          <div className="bg-white rounded-2xl border border-[#0d1c15]/08 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#fcfbf9] border-b border-[#0d1c15]/06 text-[10px] font-mono uppercase text-[#73827a]">
                    <th className="py-3 px-4 font-semibold">Account / Company</th>
                    <th className="py-3 px-4 font-semibold">Territory</th>
                    <th className="py-3 px-4 font-semibold">Tier</th>
                    <th className="py-3 px-4 font-semibold">Priority Score</th>
                    <th className="py-3 px-4 font-semibold">Pipeline Value</th>
                    <th className="py-3 px-4 font-semibold">Stage</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1c15]/06">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-[#73827a]">
                        No accounts match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => {
                      const lead = acc.lead || {};
                      const territoryName = territories.find(t => t.id === acc.territory_id)?.name || 'Unassigned';

                      return (
                        <tr key={acc.lead_id} className="hover:bg-[#fcfbf9]/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#0d1c15]">{lead.company || 'Unnamed Company'}</div>
                            <div className="text-[11px] text-[#73827a]">{lead.name} • {lead.location || 'Location missing'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              acc.territory_id ? 'bg-[#edf2ec] text-[#0d1c15]' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {territoryName}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono uppercase text-[10px]">
                            {acc.account_tier || lead.account_tier || 'unassigned'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#0d1c15]">{acc.priority_score}/100</span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                                acc.priority_category === 'High Priority'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : acc.priority_category === 'Medium Priority'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {acc.priority_category}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-[#0d9467]">
                            ${Number(acc.deal_value || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-[#edf2ec] text-[#0d1c15] text-[10px] font-mono">
                              {lead.stage || 'lead'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenAccountPlan(acc)}
                                className="px-2 py-1 rounded-lg bg-[#edf2ec] hover:bg-[#0d1c15] hover:text-white text-[11px] font-semibold text-[#0d1c15] transition-colors cursor-pointer"
                              >
                                Plan
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReassignAccountTarget(acc);
                                  setReassignTargetTerritoryId(acc.territory_id || territories[0]?.id || '');
                                  setShowReassignModal(true);
                                }}
                                className="px-2 py-1 rounded-lg border border-[#0d1c15]/10 hover:bg-[#edf2ec] text-[11px] font-semibold text-[#73827a] hover:text-[#0d1c15] transition-colors cursor-pointer"
                              >
                                Reassign
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ACCOUNT PRIORITIZATION ENGINE */}
      {activeTab === 'prioritization' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#0d1c15] font-display">
                Deterministic Account Prioritization Engine (v1.0.0)
              </h3>
              <p className="text-xs text-[#73827a]">
                Auditable 100-point composite scoring across 5 weighted dimensions. No AI text hallucinations can alter mathematical scores.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRecalculatePriorities}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1c15] text-white text-xs font-semibold hover:bg-[#162b21] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00e599] ${refreshing ? 'animate-spin' : ''}`} />
              <span>Run Engine Recalculation</span>
            </button>
          </div>

          {/* Model Specification Legend */}
          <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
            <h4 className="text-xs font-bold text-[#0d1c15] font-mono uppercase mb-3">Model Dimension Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                <span className="font-bold text-[#0d1c15] block">Company Fit</span>
                <span className="text-[11px] font-mono text-[#0d9467] font-semibold">25 Max Points</span>
                <p className="text-[11px] text-[#73827a] mt-1">ICP industry, employee size, and domain legitimacy.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                <span className="font-bold text-[#0d1c15] block">Revenue Potential</span>
                <span className="text-[11px] font-mono text-[#0d9467] font-semibold">25 Max Points</span>
                <p className="text-[11px] text-[#73827a] mt-1">Verified deal values and enterprise tier qualifications.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                <span className="font-bold text-[#0d1c15] block">Intent & Signals</span>
                <span className="text-[11px] font-mono text-[#0d9467] font-semibold">25 Max Points</span>
                <p className="text-[11px] text-[#73827a] mt-1">Website visits, email engagement, and meeting readiness.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                <span className="font-bold text-[#0d1c15] block">Activity Recency</span>
                <span className="text-[11px] font-mono text-[#0d9467] font-semibold">15 Max Points</span>
                <p className="text-[11px] text-[#73827a] mt-1">Touchpoint freshness within 7, 30, or 60 days.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                <span className="font-bold text-[#0d1c15] block">Data Completeness</span>
                <span className="text-[11px] font-mono text-[#0d9467] font-semibold">10 Max Points</span>
                <p className="text-[11px] text-[#73827a] mt-1">Verified domain, phone, title, location, and headcount.</p>
              </div>
            </div>
          </div>

          {/* Account Detail Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accountPriorities.slice(0, 6).map((acc) => {
              const lead = acc.lead || {};
              const breakdown = acc.score_breakdown || {};
              const signals = acc.signals || {};

              return (
                <div key={acc.lead_id} className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#0d1c15]">{lead.company || 'Account'}</h4>
                        <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                          acc.priority_category === 'High Priority'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {acc.priority_score}/100
                        </span>
                      </div>
                      <span className="text-xs text-[#73827a]">
                        {lead.name} ({lead.title || 'Contact'}) • {lead.industry || 'General Industry'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAccountPlan(acc)}
                      className="px-2 py-1 rounded-lg bg-[#edf2ec] hover:bg-[#0d1c15] hover:text-white text-xs font-semibold text-[#0d1c15] transition-colors cursor-pointer"
                    >
                      Open Plan
                    </button>
                  </div>

                  {/* Component Score Progress Bars */}
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#73827a]">Company Fit:</span>
                      <span className="font-mono font-semibold text-[#0d1c15]">{breakdown.company_fit || 0} / 25</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#edf2ec] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0d9467]" style={{ width: `${((breakdown.company_fit || 0) / 25) * 100}%` }} />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[#73827a]">Revenue Potential:</span>
                      <span className="font-mono font-semibold text-[#0d1c15]">{breakdown.revenue_potential || 0} / 25</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#edf2ec] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00e599]" style={{ width: `${((breakdown.revenue_potential || 0) / 25) * 100}%` }} />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[#73827a]">Buying Intent:</span>
                      <span className="font-mono font-semibold text-[#0d1c15]">{breakdown.buying_intent || 0} / 25</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#edf2ec] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${((breakdown.buying_intent || 0) / 25) * 100}%` }} />
                    </div>
                  </div>

                  {/* Signals Badges */}
                  <div className="pt-2 border-t border-[#0d1c15]/06 flex flex-wrap gap-1.5 text-[10px]">
                    {signals.positive_signals?.map((sig, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-medium">
                        ✓ {sig}
                      </span>
                    ))}
                    {signals.missing_data?.map((mis, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium">
                        ⚠ Missing: {mis}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: ACCOUNT PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0d1c15] font-display">Grounded Account Strategy Plans</h3>
              <p className="text-xs text-[#73827a]">
                Verified facts, inferred signals, grounded AI recommendations, and tracked next action items.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accountPlans.length === 0 ? (
              <div className="col-span-3 py-12 text-center bg-white rounded-2xl border border-[#0d1c15]/08">
                <FileText className="w-8 h-8 text-[#73827a] mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-semibold text-[#0d1c15]">No Account Plans Created Yet</h4>
                <p className="text-xs text-[#73827a] mt-1 max-w-sm mx-auto">
                  Select any high-priority account from the Account Explorer or Overview to generate a grounded strategic plan.
                </p>
              </div>
            ) : (
              accountPlans.map((plan) => {
                const lead = plan.lead || {};
                const actions = plan.actions || [];
                const pendingActions = actions.filter(a => a.status === 'pending').length;

                return (
                  <div key={plan.id} className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-[#0d9467] font-semibold uppercase">
                            Target: ${Number(plan.target_revenue || 0).toLocaleString()}
                          </span>
                          <h4 className="text-sm font-bold text-[#0d1c15]">{lead.company || 'Enterprise Account'}</h4>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                          {plan.plan_status}
                        </span>
                      </div>

                      <p className="text-xs text-[#73827a] mt-2 line-clamp-2">
                        {plan.strategy_summary || 'Multi-stakeholder expansion and enterprise security alignment.'}
                      </p>

                      <div className="mt-3 pt-3 border-t border-[#0d1c15]/06 flex items-center justify-between text-[11px]">
                        <span className="text-[#73827a]">Pending Action Items:</span>
                        <span className="font-mono font-bold text-[#0d1c15]">{pendingActions}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#0d1c15]/06">
                      <button
                        type="button"
                        onClick={() => handleOpenAccountPlan({ lead_id: plan.lead_id, lead })}
                        className="w-full py-1.5 rounded-xl bg-[#edf2ec] hover:bg-[#0d1c15] hover:text-white text-xs font-semibold text-[#0d1c15] transition-colors cursor-pointer text-center"
                      >
                        View & Manage Plan
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 6: CAPACITY & BALANCING */}
      {activeTab === 'balancing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0d1c15] font-display">Territory Capacity & Balancing</h3>
              <p className="text-xs text-[#73827a]">
                Workload distribution, strategic account concentration, and automatic imbalance detection.
              </p>
            </div>
          </div>

          {/* Imbalance Alerts */}
          {balance?.workload_imbalance_warnings?.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Balancing & Workload Diagnostics:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-900">
                {balance.workload_imbalance_warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Territory Balance Table */}
          <div className="bg-white rounded-2xl border border-[#0d1c15]/08 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#0d1c15]/06">
              <h4 className="text-xs font-bold font-mono uppercase text-[#73827a]">
                Territory Workload Distribution
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#fcfbf9] border-b border-[#0d1c15]/06 text-[10px] font-mono uppercase text-[#73827a]">
                    <th className="py-3 px-4 font-semibold">Territory</th>
                    <th className="py-3 px-4 font-semibold">Assigned Accounts</th>
                    <th className="py-3 px-4 font-semibold">Open Pipeline</th>
                    <th className="py-3 px-4 font-semibold">Tier 1 Strategic Concentration</th>
                    <th className="py-3 px-4 font-semibold">Workload Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1c15]/06">
                  {balance?.territories?.map((bt) => (
                    <tr key={bt.territory_id} className="hover:bg-[#fcfbf9]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#0d1c15]">{bt.name}</td>
                      <td className="py-3 px-4 font-mono">{bt.account_count}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#0d9467]">
                        ${Number(bt.pipeline_value || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {bt.tier_1_count || 0} Tier 1 Accounts
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          bt.workload_status === 'overloaded'
                            ? 'bg-rose-50 text-rose-700'
                            : bt.workload_status === 'underloaded'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {bt.workload_status || 'Balanced'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TERRITORY MODAL */}
      {showTerritoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#0d1c15]/10 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#0d1c15]/08 pb-3">
              <h3 className="text-base font-bold text-[#0d1c15] font-display">
                {editingTerritory ? 'Edit Territory Rules' : 'Create Sales Territory'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTerritoryModal(false)}
                className="p-1 rounded-lg hover:bg-[#edf2ec] text-[#73827a] hover:text-[#0d1c15]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTerritory} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Territory Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. North America Enterprise"
                    value={territoryForm.name}
                    onChange={(e) => setTerritoryForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] outline-none focus:border-[#0d9467]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. NA-ENT"
                    value={territoryForm.code}
                    onChange={(e) => setTerritoryForm(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] outline-none focus:border-[#0d9467]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Segment</label>
                <select
                  value={territoryForm.segment}
                  onChange={(e) => setTerritoryForm(prev => ({ ...prev, segment: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] outline-none focus:border-[#0d9467]"
                >
                  <option value="Enterprise">Enterprise</option>
                  <option value="Mid-Market">Mid-Market</option>
                  <option value="SMB">SMB</option>
                  <option value="Strategic">Strategic Accounts</option>
                  <option value="International">International</option>
                </select>
              </div>

              {/* Rule Builder: Geography */}
              <div className="p-3 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/06 space-y-2">
                <span className="font-bold text-[#0d1c15] block">Geographic Rules (Countries / Regions)</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add Country (e.g. United States, United Kingdom, Canada)"
                    value={ruleGeoInput}
                    onChange={(e) => setRuleGeoInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-white outline-none focus:border-[#0d9467]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!ruleGeoInput.trim()) return;
                      setTerritoryForm(prev => ({
                        ...prev,
                        rules: {
                          ...prev.rules,
                          geography: {
                            ...prev.rules.geography,
                            countries: [...(prev.rules.geography?.countries || []), ruleGeoInput.trim()]
                          }
                        }
                      }));
                      setRuleGeoInput('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#0d1c15] text-white font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {territoryForm.rules?.geography?.countries?.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-[#0d1c15]/10 text-[10px] flex items-center gap-1 font-mono">
                      {c}
                      <button
                        type="button"
                        onClick={() => {
                          setTerritoryForm(prev => ({
                            ...prev,
                            rules: {
                              ...prev.rules,
                              geography: {
                                ...prev.rules.geography,
                                countries: prev.rules.geography.countries.filter((_, idx) => idx !== i)
                              }
                            }
                          }));
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Rule Builder: Industry */}
              <div className="p-3 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/06 space-y-2">
                <span className="font-bold text-[#0d1c15] block">Industry Rules</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add Industry (e.g. Software, Healthcare, FinTech, Manufacturing)"
                    value={ruleIndustryInput}
                    onChange={(e) => setRuleIndustryInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-white outline-none focus:border-[#0d9467]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!ruleIndustryInput.trim()) return;
                      setTerritoryForm(prev => ({
                        ...prev,
                        rules: {
                          ...prev.rules,
                          industry: {
                            ...prev.rules.industry,
                            included: [...(prev.rules.industry?.included || []), ruleIndustryInput.trim()]
                          }
                        }
                      }));
                      setRuleIndustryInput('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#0d1c15] text-white font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {territoryForm.rules?.industry?.included?.map((ind, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-[#0d1c15]/10 text-[10px] flex items-center gap-1 font-mono">
                      {ind}
                      <button
                        type="button"
                        onClick={() => {
                          setTerritoryForm(prev => ({
                            ...prev,
                            rules: {
                              ...prev.rules,
                              industry: {
                                ...prev.rules.industry,
                                included: prev.rules.industry.included.filter((_, idx) => idx !== i)
                              }
                            }
                          }));
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Rule Builder: Company Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Min Employees</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={territoryForm.rules?.company_size?.min_employees || ''}
                    onChange={(e) => setTerritoryForm(prev => ({
                      ...prev,
                      rules: {
                        ...prev.rules,
                        company_size: {
                          ...prev.rules.company_size,
                          min_employees: e.target.value ? Number(e.target.value) : null
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] outline-none focus:border-[#0d9467]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Max Employees</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={territoryForm.rules?.company_size?.max_employees || ''}
                    onChange={(e) => setTerritoryForm(prev => ({
                      ...prev,
                      rules: {
                        ...prev.rules,
                        company_size: {
                          ...prev.rules.company_size,
                          max_employees: e.target.value ? Number(e.target.value) : null
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] outline-none focus:border-[#0d9467]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0d1c15]/08">
                <button
                  type="button"
                  onClick={() => setShowTerritoryModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#0d1c15]/10 text-[#73827a] font-semibold hover:bg-[#edf2ec] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-[#00e599] font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {editingTerritory ? 'Update Territory' : 'Create Territory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW ASSIGNMENTS MODAL */}
      {showAssignPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#0d1c15]/10 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#0d1c15]/08 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0d1c15] font-display">
                  Assignment Preview for {territories.find(t => t.id === previewTerritoryId)?.name || 'Territory'}
                </h3>
                <p className="text-xs text-[#73827a]">
                  Preview matching CRM accounts before applying territory assignments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignPreviewModal(false)}
                className="p-1 rounded-lg hover:bg-[#edf2ec] text-[#73827a] hover:text-[#0d1c15]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!previewData ? (
              <div className="py-8 text-center">
                <RefreshCw className="w-6 h-6 text-[#0d9467] animate-spin mx-auto mb-2" />
                <span className="text-xs text-[#73827a]">Evaluating territory rules against CRM accounts...</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#edf2ec] text-[#0d1c15]">
                  <span>Eligible Matching Accounts:</span>
                  <span className="font-mono font-bold text-sm text-[#0d9467]">
                    {previewData.matching_count || 0}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-[#0d1c15]/06 border border-[#0d1c15]/08 rounded-2xl">
                  {previewData.matching_leads?.map((lead) => (
                    <div key={lead.id} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#0d1c15] block">{lead.company}</span>
                        <span className="text-[11px] text-[#73827a]">
                          {lead.industry || 'No Industry'} • {lead.location || 'No Location'}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-[#0d9467]">
                        ${Number(lead.deal_value || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0d1c15]/08">
                  <button
                    type="button"
                    onClick={() => setShowAssignPreviewModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#0d1c15]/10 text-[#73827a] font-semibold hover:bg-[#edf2ec]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAssignments}
                    disabled={!previewData.matching_count}
                    className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-[#00e599] font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Apply {previewData.matching_count || 0} Assignments
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REASSIGN ACCOUNT MODAL */}
      {showReassignModal && reassignAccountTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#0d1c15]/10 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#0d1c15]/08 pb-3">
              <h3 className="text-base font-bold text-[#0d1c15] font-display">
                Reassign Account
              </h3>
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="p-1 rounded-lg hover:bg-[#edf2ec] text-[#73827a] hover:text-[#0d1c15]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                <span className="text-[10px] font-mono text-[#73827a] uppercase block">Selected Account</span>
                <span className="text-sm font-bold text-[#0d1c15] block mt-0.5">
                  {reassignAccountTarget.lead?.company || 'Account'}
                </span>
                <span className="text-[11px] text-[#73827a]">
                  Contact: {reassignAccountTarget.lead?.name} • Pipeline: ${Number(reassignAccountTarget.deal_value || 0).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Target Territory</label>
                <select
                  value={reassignTargetTerritoryId}
                  onChange={(e) => setReassignTargetTerritoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] outline-none focus:border-[#0d9467]"
                >
                  {territories.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.segment})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Audit Reassignment Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Account rebalancing or rep re-alignment"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0d1c15]/08">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#0d1c15]/10 text-[#73827a] font-semibold hover:bg-[#edf2ec]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteReassign}
                  className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-[#00e599] font-semibold cursor-pointer"
                >
                  Confirm Reassignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TARGET QUOTA MODAL */}
      {showTargetModal && selectedTerritoryForTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#0d1c15]/10 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#0d1c15]/08 pb-3">
              <h3 className="text-base font-bold text-[#0d1c15] font-display">
                Set Target Quota for {selectedTerritoryForTarget.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="p-1 rounded-lg hover:bg-[#edf2ec] text-[#73827a] hover:text-[#0d1c15]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Target Revenue ($)</label>
                <input
                  type="number"
                  required
                  value={targetForm.target_revenue}
                  onChange={(e) => setTargetForm(prev => ({ ...prev, target_revenue: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Target New Logos</label>
                <input
                  type="number"
                  value={targetForm.target_new_logos}
                  onChange={(e) => setTargetForm(prev => ({ ...prev, target_new_logos: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Quota Period</label>
                <select
                  value={targetForm.period_type}
                  onChange={(e) => setTargetForm(prev => ({ ...prev, period_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] outline-none focus:border-[#0d9467]"
                >
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0d1c15]/08">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#0d1c15]/10 text-[#73827a] font-semibold hover:bg-[#edf2ec]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-[#00e599] font-semibold cursor-pointer"
                >
                  Save Quota Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACCOUNT STRATEGY PLAN DRAWER / MODAL */}
      {showPlanDrawer && selectedPlanAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-white border-l border-[#0d1c15]/10 shadow-2xl w-full max-w-2xl h-full p-6 space-y-5 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#0d1c15]/08 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-[#0d9467] uppercase">Account Strategy Plan</span>
                  <span className="px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                    Grounded AI
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#0d1c15] font-display mt-0.5">
                  {selectedPlanAccount.lead?.company || 'Enterprise Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanDrawer(false)}
                className="p-1 rounded-lg hover:bg-[#edf2ec] text-[#73827a] hover:text-[#0d1c15]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If no plan exists yet */}
            {!currentPlan && !draftPlan && (
              <div className="p-8 text-center bg-[#fcfbf9] rounded-2xl border border-[#0d1c15]/06 space-y-3">
                <Sparkles className="w-8 h-8 text-[#0d9467] mx-auto" />
                <h4 className="text-sm font-bold text-[#0d1c15]">Generate Grounded Account Strategy Plan</h4>
                <p className="text-xs text-[#73827a] max-w-sm mx-auto">
                  AI will analyze CRM signals, call intelligence transcripts, pain points, and buyer personas to formulate strategic objectives and stakeholder mapping.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateDraft}
                  disabled={generatingDraft}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-[#00e599] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${generatingDraft ? 'animate-spin' : ''}`} />
                  <span>{generatingDraft ? 'Analyzing CRM Data...' : 'Generate Grounded Plan Draft'}</span>
                </button>
              </div>
            )}

            {/* DRAFT REVIEW MODE (Explicit Confirmation Required) */}
            {draftPlan && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0d9467]" />
                    <span className="text-xs font-bold text-emerald-950">AI Strategy Plan Draft (Unsaved)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-semibold">
                    Review Required
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-950 block">Strategic Objectives:</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-emerald-900">
                      {draftPlan.strategic_objectives?.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-emerald-950 block">Strategy Summary:</span>
                    <p className="text-emerald-900 mt-0.5">{draftPlan.strategy_summary}</p>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-emerald-950 block">Pain Points Identified:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {draftPlan.pain_points?.map((pp, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white text-emerald-900 border border-emerald-200 text-[10px]">
                          {pp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200">
                  <button
                    type="button"
                    onClick={() => setDraftPlan(null)}
                    className="px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-900 font-semibold hover:bg-emerald-100 text-xs"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSavePlan}
                    className="px-4 py-1.5 rounded-xl bg-[#0d1c15] text-[#00e599] font-semibold hover:bg-[#162b21] text-xs cursor-pointer shadow-xs"
                  >
                    Confirm & Save to Account
                  </button>
                </div>
              </div>
            )}

            {/* ACTIVE SAVED PLAN */}
            {currentPlan && (
              <div className="space-y-5 text-xs">
                {/* Grounding Attribution Banner */}
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-medium">
                    ✓ Verified CRM Fact
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium">
                    🔍 Inferred from Signal
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-medium">
                    ✦ AI Recommendation
                  </span>
                </div>

                {/* Objectives */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold font-mono uppercase text-[#73827a]">Strategic Objectives</h4>
                  <ul className="list-disc list-inside space-y-1 text-[#0d1c15]">
                    {currentPlan.strategic_objectives?.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>

                {/* Strategy Summary */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold font-mono uppercase text-[#73827a]">Executive Strategy</h4>
                  <p className="text-[#0d1c15] leading-relaxed bg-[#fcfbf9] p-3 rounded-xl border border-[#0d1c15]/06">
                    {currentPlan.strategy_summary}
                  </p>
                </div>

                {/* Stakeholder Map */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold font-mono uppercase text-[#73827a]">Stakeholder Mapping</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentPlan.stakeholder_map?.map((stk, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                        <span className="font-bold text-[#0d1c15] block">{stk.role || 'Stakeholder'}</span>
                        <span className="text-[11px] text-[#0d9467] font-semibold">{stk.stance || 'Champion'}</span>
                        <p className="text-[10px] text-[#73827a] mt-0.5">{stk.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Items List */}
                <div className="space-y-3 pt-3 border-t border-[#0d1c15]/08">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono uppercase text-[#73827a]">
                      Next Action Items ({currentPlan.actions?.length || 0})
                    </h4>
                  </div>

                  <div className="space-y-1.5">
                    {currentPlan.actions?.map((act) => (
                      <div key={act.id} className="p-2.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={act.status === 'completed'}
                            onChange={() => handleToggleAction(act.id, act.status)}
                            className="rounded text-[#0d9467] focus:ring-[#0d9467] cursor-pointer"
                          />
                          <span className={`${act.status === 'completed' ? 'line-through text-[#73827a]' : 'text-[#0d1c15] font-medium'}`}>
                            {act.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono uppercase ${
                            act.priority === 'urgent' ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {act.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Action Item Form */}
                  <form onSubmit={handleAddAction} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add strategic follow-up action item..."
                      value={newActionTitle}
                      onChange={(e) => setNewActionTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-white outline-none focus:border-[#0d9467]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-[#0d1c15] text-[#00e599] font-semibold cursor-pointer"
                    >
                      Add Action
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
