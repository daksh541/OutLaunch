import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CustomerSuccessSkeleton } from '../ui/DashboardSkeleton';
import {
  HeartHandshake,
  ShieldAlert,
  TrendingUp,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  FileText,
  Plus,
  Search,
  ChevronRight,
  Clock,
  DollarSign,
  Target,
  Activity,
  Users,
  Layers,
  X,
  Check,
  Edit3,
  ArrowUpRight,
  History
} from 'lucide-react';
import {
  fetchCustomerSuccessAccounts,
  createCustomerSuccessAccount,
  updateCustomerSuccessAccount,
  fetchCustomerSuccessTimeline,
  fetchCustomerHealth,
  recalculateCustomerHealth,
  fetchCustomerHealthHistory,
  fetchCustomerRenewals,
  createCustomerRenewal,
  updateCustomerRenewal,
  fetchRenewalForecast,
  fetchChurnRisks,
  fetchRenewalForecastAccuracy,
  fetchExpansionOpportunities,
  createExpansionOpportunity,
  updateExpansionOpportunity,
  approveExpansionOpportunity,
  dismissExpansionOpportunity,
  fetchCustomerSuccessPlans,
  createCustomerSuccessPlan,
  updateCustomerSuccessPlan,
  generateCustomerSuccessPlanDraft,
  approveCustomerSuccessPlan
} from '../../lib/outreachService';

export default function CustomerSuccessView({ prospects = [], onNavigateToCrm }) {
  // Sub-views: 'overview', 'health', 'renewals', 'churn', 'expansion', 'plans'
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState(null);

  // Core Data States
  const [accounts, setAccounts] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [churnRisks, setChurnRisks] = useState([]);
  const [expansions, setExpansions] = useState([]);
  const [plans, setPlans] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState('all');
  const [renewalStatusFilter, setRenewalStatusFilter] = useState('all');
  const [expansionStatusFilter, setExpansionStatusFilter] = useState('all');

  // Selected Account Detail & Health Inspector
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountHealthDetail, setAccountHealthDetail] = useState(null);
  const [accountHealthHistory, setAccountHealthHistory] = useState([]);
  const [accountTimeline, setAccountTimeline] = useState([]);

  // Modals
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    lead_id: '',
    customer_status: 'active',
    contract_value: 36000,
    currency: 'USD',
    renewal_date: new Date(Date.now() + 86400000 * 90).toISOString().split('T')[0],
    renewal_probability: 85,
    objective_1: 'Complete team onboarding and outbound workflow automation',
    objective_2: 'Achieve 3x qualified pipeline velocity within 60 days'
  });

  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [editingRenewal, setEditingRenewal] = useState(null);
  const [renewalForm, setRenewalForm] = useState({
    customer_success_account_id: '',
    renewal_date: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0],
    contract_value: 36000,
    currency: 'USD',
    renewal_status: 'upcoming',
    renewal_probability: 80,
    renewal_strategy: '',
    next_action: ''
  });

  // Expansion Edit Modal
  const [editingExpansion, setEditingExpansion] = useState(null);
  const [expansionEditForm, setExpansionEditForm] = useState({
    opportunity_type: 'upsell',
    estimated_value: '',
    probability: 60,
    recommended_action: ''
  });

  // Grounded Success Plan Draft & Review Drawer
  const [selectedPlanAccountId, setSelectedPlanAccountId] = useState('');
  const [draftPlan, setDraftPlan] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const notify = (msg, type = 'success') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 4500);
  };

  const loadAllCustomerSuccessData = useCallback(async () => {
    try {
      setLoading(true);
      const [acctList, renList, fcData, accData, riskList, expList, planList] = await Promise.all([
        fetchCustomerSuccessAccounts({ autoSeed: true }).catch(() => []),
        fetchCustomerRenewals().catch(() => []),
        fetchRenewalForecast({ currency: 'USD' }).catch(() => null),
        fetchRenewalForecastAccuracy({ currency: 'USD' }).catch(() => null),
        fetchChurnRisks().catch(() => []),
        fetchExpansionOpportunities().catch(() => []),
        fetchCustomerSuccessPlans().catch(() => [])
      ]);

      setAccounts(acctList);
      setRenewals(renList);
      setForecast(fcData);
      setAccuracy(accData);
      setChurnRisks(riskList);
      setExpansions(expList);
      setPlans(planList);

      if (acctList.length > 0 && !selectedAccount) {
        setSelectedAccount(acctList[0]);
        setSelectedPlanAccountId(acctList[0].id);
      }
    } catch (err) {
      console.error('Error loading Customer Success data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    loadAllCustomerSuccessData();
  }, [loadAllCustomerSuccessData]);

  // Load detailed health, history, and timeline when selectedAccount changes
  const inspectAccountHealth = useCallback(async (acct) => {
    if (!acct?.id) return;
    setSelectedAccount(acct);
    try {
      const [hDetail, hHistory, tl] = await Promise.all([
        fetchCustomerHealth(acct.id).catch(() => null),
        fetchCustomerHealthHistory(acct.id).catch(() => []),
        fetchCustomerSuccessTimeline(acct.id).catch(() => [])
      ]);
      setAccountHealthDetail(hDetail);
      setAccountHealthHistory(hHistory);
      setAccountTimeline(tl);
    } catch {}
  }, []);

  useEffect(() => {
    if (selectedAccount?.id) {
      inspectAccountHealth(selectedAccount);
    }
  }, [selectedAccount?.id, inspectAccountHealth]);

  // Recalculate account health
  const handleRecalculateHealth = async (accountId) => {
    const targetId = accountId || selectedAccount?.id;
    if (!targetId) return;
    try {
      setRefreshing(true);
      const res = await recalculateCustomerHealth(targetId);
      notify(`Health recalculated (${res.health_score}/100 • ${res.health_status}). Immutable snapshot saved.`);
      await loadAllCustomerSuccessData();
      if (selectedAccount?.id === targetId) {
        await inspectAccountHealth(selectedAccount);
      }
    } catch (err) {
      notify('Failed to recalculate health: ' + err.message, 'error');
      setRefreshing(false);
    }
  };

  // Create Customer Success Account
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAccountForm.lead_id) {
      notify('Please select a CRM account/lead.', 'error');
      return;
    }
    try {
      const objectives = [];
      if (newAccountForm.objective_1.trim()) {
        objectives.push({ id: 'obj_1', title: newAccountForm.objective_1.trim(), status: 'in_progress', progress: 50 });
      }
      if (newAccountForm.objective_2.trim()) {
        objectives.push({ id: 'obj_2', title: newAccountForm.objective_2.trim(), status: 'pending', progress: 0 });
      }

      const created = await createCustomerSuccessAccount({
        lead_id: newAccountForm.lead_id,
        customer_status: newAccountForm.customer_status,
        contract_value: Number(newAccountForm.contract_value),
        currency: newAccountForm.currency,
        renewal_date: new Date(newAccountForm.renewal_date).toISOString(),
        renewal_probability: Number(newAccountForm.renewal_probability),
        success_objectives: objectives
      });

      notify(`Customer Success profile created for ${created.company}.`);
      setShowCreateAccountModal(false);
      await loadAllCustomerSuccessData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Create or Update Renewal Opportunity
  const handleSaveRenewal = async (e) => {
    e.preventDefault();
    try {
      if (editingRenewal) {
        await updateCustomerRenewal(editingRenewal.id, {
          renewal_date: new Date(renewalForm.renewal_date).toISOString(),
          contract_value: Number(renewalForm.contract_value),
          currency: renewalForm.currency,
          renewal_status: renewalForm.renewal_status,
          renewal_probability: Number(renewalForm.renewal_probability),
          renewal_strategy: renewalForm.renewal_strategy,
          next_action: renewalForm.next_action
        });
        notify('Renewal opportunity updated.');
      } else {
        await createCustomerRenewal({
          customer_success_account_id: renewalForm.customer_success_account_id || accounts[0]?.id,
          renewal_date: new Date(renewalForm.renewal_date).toISOString(),
          contract_value: Number(renewalForm.contract_value),
          currency: renewalForm.currency,
          renewal_status: renewalForm.renewal_status,
          renewal_probability: Number(renewalForm.renewal_probability),
          renewal_strategy: renewalForm.renewal_strategy,
          next_action: renewalForm.next_action
        });
        notify('Renewal opportunity created.');
      }
      setShowRenewalModal(false);
      setEditingRenewal(null);
      await loadAllCustomerSuccessData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Quick Renewal Status Transition
  const handleRenewalStatusTransition = async (renewalId, nextStatus) => {
    try {
      await updateCustomerRenewal(renewalId, { renewal_status: nextStatus });
      notify(`Renewal status updated to "${nextStatus}".`);
      await loadAllCustomerSuccessData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Scan / Identify Expansion Opportunities from Evidence
  const handleIdentifyExpansion = async (accountId) => {
    const targetId = accountId || selectedAccount?.id || accounts[0]?.id;
    if (!targetId) return;
    try {
      const res = await createExpansionOpportunity({
        identifyFromSignals: true,
        accountId: targetId,
        explicitRequest: 'Customer requested seat rollout evaluation for additional regional SDR pod'
      });
      const count = Array.isArray(res) ? res.length : 1;
      notify(`Identified ${count} evidence-backed expansion suggestion(s). Review and approve before execution.`);
      await loadAllCustomerSuccessData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleApproveExpansion = async (expansionId) => {
    try {
      await approveExpansionOpportunity(expansionId);
      notify('Expansion opportunity explicitly approved.');
      await loadAllCustomerSuccessData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleDismissExpansion = async (expansionId) => {
    try {
      await dismissExpansionOpportunity(expansionId, { reason: 'Deferred by Customer Success Manager' });
      notify('Expansion suggestion dismissed.');
      await loadAllCustomerSuccessData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleSaveExpansionEdit = async (e) => {
    e.preventDefault();
    if (!editingExpansion) return;
    try {
      await updateExpansionOpportunity(editingExpansion.id, {
        opportunity_type: expansionEditForm.opportunity_type,
        estimated_value:
          expansionEditForm.estimated_value === '' || expansionEditForm.estimated_value === null
            ? null
            : Number(expansionEditForm.estimated_value),
        probability: Number(expansionEditForm.probability),
        recommended_action: expansionEditForm.recommended_action
      });
      notify('Expansion opportunity updated.');
      setEditingExpansion(null);
      await loadAllCustomerSuccessData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Generate Grounded Customer Success Plan Draft
  const handleGeneratePlanDraft = async () => {
    const targetAcctId = selectedPlanAccountId || selectedAccount?.id || accounts[0]?.id;
    if (!targetAcctId) {
      notify('Select a Customer Success account first.', 'error');
      return;
    }
    try {
      setGeneratingPlan(true);
      const draft = await generateCustomerSuccessPlanDraft(targetAcctId, {
        customer_success_account_id: targetAcctId
      });
      setDraftPlan(draft);
      notify('Grounded Customer Success Plan draft generated. Review and confirm before saving.');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Confirm & Save Draft Plan
  const handleConfirmSaveDraftPlan = async () => {
    if (!draftPlan) return;
    try {
      const saved = await createCustomerSuccessPlan({
        customer_success_account_id: draftPlan.customer_success_account_id,
        plan_period_start: draftPlan.plan_period_start,
        plan_period_end: draftPlan.plan_period_end,
        objectives: draftPlan.objectives,
        success_metrics: draftPlan.success_metrics,
        business_outcomes: draftPlan.business_outcomes,
        stakeholders: draftPlan.stakeholders,
        renewal_milestones: draftPlan.renewal_milestones,
        engagement_strategy: draftPlan.engagement_strategy,
        risk_mitigation_plan: draftPlan.risk_mitigation_plan,
        expansion_strategy: draftPlan.expansion_strategy,
        recommended_tasks: draftPlan.recommended_tasks,
        grounding: draftPlan.grounding,
        review_date: draftPlan.review_date,
        status: 'review'
      });
      setDraftPlan(null);
      notify(`Success Plan saved in "${saved.status}" status. Click Approve to activate.`);
      await loadAllCustomerSuccessData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleApprovePlan = async (planId) => {
    try {
      await approveCustomerSuccessPlan(planId);
      notify('Customer Success Plan approved and activated.');
      await loadAllCustomerSuccessData();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Summary Overview KPIs
  const overviewMetrics = useMemo(() => {
    const activeCustomers = accounts.filter((a) => a.customer_status !== 'churned');
    const healthyCustomers = activeCustomers.filter((a) => a.health_status === 'Healthy').length;
    const stableCustomers = activeCustomers.filter((a) => a.health_status === 'Stable').length;
    const atRiskCustomers = activeCustomers.filter((a) => a.health_status === 'At Risk').length;
    const criticalCustomers = activeCustomers.filter((a) => a.health_status === 'Critical').length;

    const upcomingRenewalsCount = renewals.filter(
      (r) => r.renewal_status === 'upcoming' || r.renewal_status === 'in_progress'
    ).length;

    const upcomingRenewalValue =
      forecast?.total_upcoming_renewal_value ??
      renewals
        .filter((r) => r.renewal_status === 'upcoming' || r.renewal_status === 'in_progress')
        .reduce((s, r) => s + (Number(r.contract_value) || 0), 0);

    const atRiskRevenue =
      forecast?.at_risk_renewal_value ??
      activeCustomers
        .filter((a) => a.health_status === 'At Risk' || a.health_status === 'Critical')
        .reduce((s, a) => s + (Number(a.contract_value) || 0), 0);

    const expansionPipeline = expansions
      .filter((e) => e.status !== 'dismissed')
      .reduce((s, e) => s + (Number(e.estimated_value) || 0), 0);

    return {
      totalActiveCustomers: activeCustomers.length,
      healthyCustomers,
      stableCustomers,
      atRiskCustomers,
      criticalCustomers,
      upcomingRenewalsCount,
      upcomingRenewalValue,
      atRiskRevenue,
      expansionPipeline
    };
  }, [accounts, renewals, forecast, expansions]);

  const filteredAccounts = useMemo(() => {
    const seen = new Set();
    return accounts.filter((a) => {
      // Deduplicate mock/seeded duplicate company records
      const dedupKey = (a.company || a.id || '').toLowerCase().trim();
      if (dedupKey && seen.has(dedupKey)) return false;
      if (dedupKey) seen.add(dedupKey);

      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (a.company && a.company.toLowerCase().includes(q)) ||
        (a.contact_name && a.contact_name.toLowerCase().includes(q));
      const matchHealth = healthFilter === 'all' ? true : a.health_status === healthFilter;
      return matchSearch && matchHealth;
    });
  }, [accounts, searchQuery, healthFilter]);

  const healthBadgeClass = (status) => {
    if (status === 'Healthy') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (status === 'Stable') return 'bg-[#edf2ec] text-[#0d1c15] border border-[#0d1c15]/10';
    if (status === 'At Risk') return 'bg-amber-50 text-amber-800 border border-amber-200';
    if (status === 'Critical') return 'bg-rose-50 text-rose-700 border border-rose-200';
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  };

  if (loading) {
    return <CustomerSuccessSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Notification Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl flex items-center justify-between text-xs font-medium border shadow-2xs ${
            notice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-[#edf2ec] border-[#0d9467]/30 text-[#0d1c15]'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#0d9467] shrink-0" />
            )}
            <span>{notice.msg}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#0d1c15]/08 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0d1c15] text-[#00e599] flex items-center justify-center shrink-0 shadow-xs">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#0d1c15] tracking-tight font-display">
                Customer Success & Renewal Intelligence
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#00e599]/20 text-[#0d9467] text-[10px] font-mono font-bold">
                HEALTH MODEL v1.0.0
              </span>
            </div>
            <p className="text-xs text-[#73827a] mt-0.5">
              Deterministic customer health scoring, evidence-backed churn risk detection, renewal revenue forecasting, and grounded success plans.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setEditingRenewal(null);
              setRenewalForm((prev) => ({
                ...prev,
                customer_success_account_id: accounts[0]?.id || ''
              }));
              setShowRenewalModal(true);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#0d1c15]/10 text-xs font-semibold text-[#0d1c15] hover:bg-[#edf2ec] transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#0d9467]" />
            <span>+ Log Renewal</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateAccountModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-[#00e599] text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer Account</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#0d1c15]/08 text-xs font-medium">
        {[
          { id: 'overview', label: 'Customer Overview', icon: Layers },
          { id: 'health', label: 'Customer Health', icon: Activity, count: accounts.length },
          { id: 'renewals', label: 'Renewal Management', icon: Calendar, count: renewals.length },
          { id: 'churn', label: 'Churn Risk', icon: ShieldAlert, count: churnRisks.length },
          { id: 'expansion', label: 'Expansion Opportunities', icon: TrendingUp, count: expansions.length },
          { id: 'plans', label: 'Success Plans', icon: FileText, count: plans.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
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
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    isActive ? 'bg-[#00e599]/20 text-[#00e599]' : 'bg-[#0d1c15]/06 text-[#73827a]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: CUSTOMER OVERVIEW                                             */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 8 Core KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#73827a] block">
                Total Active Customers
              </span>
              <div className="text-2xl font-bold font-display text-[#0d1c15] mt-1">
                {overviewMetrics.totalActiveCustomers}
              </div>
              <div className="text-[11px] text-[#73827a] mt-2 pt-2 border-t border-[#0d1c15]/06 flex justify-between">
                <span>Stable accounts:</span>
                <span className="font-mono font-semibold text-[#0d1c15]">{overviewMetrics.stableCustomers}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#73827a] block">
                Healthy Customers (80+)
              </span>
              <div className="text-2xl font-bold font-display text-[#0d9467] mt-1">
                {overviewMetrics.healthyCustomers}
              </div>
              <div className="text-[11px] text-[#73827a] mt-2 pt-2 border-t border-[#0d1c15]/06 flex justify-between">
                <span>Health threshold:</span>
                <span className="font-mono text-[#0d9467]">80–100 pts</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#73827a] block">
                At-Risk Customers
              </span>
              <div className="text-2xl font-bold font-display text-amber-600 mt-1">
                {overviewMetrics.atRiskCustomers}
              </div>
              <div className="text-[11px] text-[#73827a] mt-2 pt-2 border-t border-[#0d1c15]/06 flex justify-between">
                <span>Score bracket:</span>
                <span className="font-mono text-amber-700">40–59 pts</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#73827a] block">
                Critical Customers
              </span>
              <div className="text-2xl font-bold font-display text-rose-600 mt-1">
                {overviewMetrics.criticalCustomers}
              </div>
              <div className="text-[11px] text-[#73827a] mt-2 pt-2 border-t border-[#0d1c15]/06 flex justify-between">
                <span>Score bracket:</span>
                <span className="font-mono text-rose-700">0–39 pts</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#73827a] block">
                Upcoming Renewals
              </span>
              <div className="text-2xl font-bold font-display text-[#0d1c15] mt-1">
                {overviewMetrics.upcomingRenewalsCount}
              </div>
              <div className="text-[11px] text-[#73827a] mt-2 pt-2 border-t border-[#0d1c15]/06 flex justify-between">
                <span>Active pipeline:</span>
                <span className="font-mono font-semibold text-[#0d9467]">Open</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#73827a] block">
                Upcoming Renewal Value
              </span>
              <div className="text-2xl font-bold font-display text-[#0d1c15] mt-1">
                ${Number(overviewMetrics.upcomingRenewalValue || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#73827a] mt-2 pt-2 border-t border-[#0d1c15]/06 flex justify-between">
                <span>Weighted expected:</span>
                <span className="font-mono font-semibold text-[#0d9467]">
                  ${Number(forecast?.weighted_renewal_value || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#73827a] block">
                At-Risk Revenue
              </span>
              <div className="text-2xl font-bold font-display text-rose-600 mt-1">
                ${Number(overviewMetrics.atRiskRevenue || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#73827a] mt-2 pt-2 border-t border-[#0d1c15]/06 flex justify-between">
                <span>Requires mitigation:</span>
                <span className="font-mono font-semibold text-rose-700">{churnRisks.length} accounts</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#73827a] block">
                Expansion Pipeline
              </span>
              <div className="text-2xl font-bold font-display text-[#0d9467] mt-1">
                ${Number(overviewMetrics.expansionPipeline || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#73827a] mt-2 pt-2 border-t border-[#0d1c15]/06 flex justify-between">
                <span>Opportunities:</span>
                <span className="font-mono font-semibold text-[#0d1c15]">{expansions.length} tracked</span>
              </div>
            </div>
          </div>

          {/* Customer Portfolio Table */}
          <div className="bg-white rounded-2xl border border-[#0d1c15]/08 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#0d1c15]/06 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#0d1c15] font-display">Customer Portfolio Health & Renewal Roster</h3>
                <p className="text-xs text-[#73827a]">
                  Click any customer account to inspect 6-factor health diagnostics, immutable snapshots, or success plans.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-xs outline-none focus:border-[#0d9467]"
                  />
                </div>
                <select
                  value={healthFilter}
                  onChange={(e) => setHealthFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-xs outline-none focus:border-[#0d9467]"
                >
                  <option value="all">All Health Tiers</option>
                  <option value="Healthy">Healthy (80–100)</option>
                  <option value="Stable">Stable (60–79)</option>
                  <option value="At Risk">At Risk (40–59)</option>
                  <option value="Critical">Critical (0–39)</option>
                  <option value="Insufficient Data">Insufficient Data</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#fcfbf9] border-b border-[#0d1c15]/06 text-[10px] font-mono uppercase text-[#73827a]">
                    <th className="py-3 px-4 font-semibold">Customer Account</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Health Score</th>
                    <th className="py-3 px-4 font-semibold">Contract Value</th>
                    <th className="py-3 px-4 font-semibold">Renewal Date</th>
                    <th className="py-3 px-4 font-semibold">Renewal Prob.</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1c15]/06">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-[#73827a]">
                        <div className="flex flex-col items-center justify-center space-y-3 animate-fadeIn">
                          <div className="w-12 h-12 rounded-2xl bg-[#edf2ec] text-[#0d9467] flex items-center justify-center">
                            <HeartHandshake className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-[#0d1c15]">No Customer Accounts Found</div>
                            <p className="text-xs text-[#5a6962] mt-0.5">
                              Onboard your CRM clients to monitor health scores, contract renewals, and churn risks.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCreateAccountModal(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0d1c15] text-[#00e599] text-xs font-semibold hover:bg-[#162b21] transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Onboard Customer Account</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acct) => (
                      <tr key={acct.id} className="hover:bg-[#fcfbf9]/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#0d1c15]">{acct.company}</div>
                          <div className="text-[11px] text-[#73827a]">
                            {acct.contact_name || 'Primary Contact'} • {acct.industry || 'B2B'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-[#edf2ec] text-[#0d1c15] font-mono text-[10px] uppercase">
                            {acct.customer_status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#0d1c15]">{acct.health_score}/100</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${healthBadgeClass(acct.health_status)}`}>
                              {acct.health_status}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-[#0d9467]">
                          ${Number(acct.contract_value || 0).toLocaleString()} {acct.currency || 'USD'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#0d1c15]">
                          {acct.renewal_date ? new Date(acct.renewal_date).toISOString().split('T')[0] : 'Unset'}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          {acct.renewal_probability}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAccount(acct);
                                setActiveTab('health');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#edf2ec] hover:bg-[#0d1c15] hover:text-white text-[11px] font-semibold text-[#0d1c15] transition-colors cursor-pointer"
                            >
                              Inspect Health
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPlanAccountId(acct.id);
                                setActiveTab('plans');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-[#0d1c15]/10 hover:bg-[#edf2ec] text-[11px] font-semibold text-[#73827a] hover:text-[#0d1c15] transition-colors cursor-pointer"
                            >
                              Success Plan
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: CUSTOMER HEALTH SCORING ENGINE                                */}
      {/* ===================================================================== */}
      {activeTab === 'health' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Account Selector */}
          <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs space-y-3">
            <h3 className="text-xs font-mono uppercase font-bold text-[#73827a]">Select Customer Account</h3>
            <div className="space-y-2 max-h-[540px] overflow-y-auto">
              {accounts.map((acct) => {
                const isSelected = selectedAccount?.id === acct.id;
                return (
                  <button
                    key={acct.id}
                    type="button"
                    onClick={() => inspectAccountHealth(acct)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0d1c15] text-white border-[#0d1c15]'
                        : 'bg-[#fcfbf9] text-[#0d1c15] border-[#0d1c15]/08 hover:bg-[#edf2ec]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs truncate">{acct.company}</span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isSelected ? 'bg-[#00e599]/20 text-[#00e599]' : healthBadgeClass(acct.health_status)
                        }`}
                      >
                        {acct.health_score}/100
                      </span>
                    </div>
                    <div className={`text-[11px] mt-1 ${isSelected ? 'text-white/75' : 'text-[#73827a]'}`}>
                      {acct.health_status} • ${Number(acct.contract_value || 0).toLocaleString()} {acct.currency}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Health Breakdown & History */}
          <div className="lg:col-span-2 space-y-4">
            {selectedAccount ? (
              <>
                <div className="p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0d1c15]/08 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#0d1c15] font-display">{selectedAccount.company}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${healthBadgeClass(accountHealthDetail?.health_status || selectedAccount.health_status)}`}>
                          {accountHealthDetail?.health_score ?? selectedAccount.health_score}/100 •{' '}
                          {accountHealthDetail?.health_status || selectedAccount.health_status}
                        </span>
                      </div>
                      <p className="text-xs text-[#73827a] mt-1">
                        {accountHealthDetail?.explanation || 'Deterministic 6-component customer health evaluation.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRecalculateHealth(selectedAccount.id)}
                      disabled={refreshing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1c15] text-[#00e599] text-xs font-semibold hover:bg-[#162b21] cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                      <span>Recalculate & Snapshot</span>
                    </button>
                  </div>

                  {/* 6 Component Score Progress Bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      {
                        key: 'relationship_engagement',
                        label: 'Relationship Engagement',
                        max: 25,
                        val: accountHealthDetail?.component_scores?.relationship_engagement ?? 0
                      },
                      {
                        key: 'meeting_and_communication',
                        label: 'Meetings & Communication',
                        max: 20,
                        val: accountHealthDetail?.component_scores?.meeting_and_communication ?? 0
                      },
                      {
                        key: 'renewal_readiness',
                        label: 'Renewal Readiness',
                        max: 20,
                        val: accountHealthDetail?.component_scores?.renewal_readiness ?? 0
                      },
                      {
                        key: 'commercial_stability',
                        label: 'Commercial Stability',
                        max: 15,
                        val: accountHealthDetail?.component_scores?.commercial_stability ?? 0
                      },
                      {
                        key: 'success_objective_progress',
                        label: 'Success Objective Progress',
                        max: 10,
                        val: accountHealthDetail?.component_scores?.success_objective_progress ?? 0
                      },
                      {
                        key: 'data_completeness',
                        label: 'Data Completeness',
                        max: 10,
                        val: accountHealthDetail?.component_scores?.data_completeness ?? 0
                      }
                    ].map((comp) => (
                      <div key={comp.key} className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-[#0d1c15]">{comp.label}</span>
                          <span className="font-mono font-bold text-[#0d9467]">
                            {comp.val} / {comp.max} pts
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#edf2ec] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0d9467]"
                            style={{ width: `${Math.min(100, (comp.val / comp.max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Positive Signals, Risk Signals, Missing Data */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                      <span className="text-[10px] font-mono uppercase font-bold text-emerald-900 block mb-1.5">
                        Positive Signals ({accountHealthDetail?.positive_signals?.length || 0})
                      </span>
                      <ul className="space-y-1 text-[11px] text-emerald-900">
                        {(accountHealthDetail?.positive_signals || []).map((s, idx) => (
                          <li key={idx}>✓ {s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/80">
                      <span className="text-[10px] font-mono uppercase font-bold text-rose-900 block mb-1.5">
                        Risk Signals ({accountHealthDetail?.risk_signals?.length || 0})
                      </span>
                      <ul className="space-y-1 text-[11px] text-rose-900">
                        {(accountHealthDetail?.risk_signals || []).map((s, idx) => (
                          <li key={idx}>⚠ {s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                      <span className="text-[10px] font-mono uppercase font-bold text-amber-900 block mb-1.5">
                        Unavailable / Missing Data ({accountHealthDetail?.missing_data?.length || 0})
                      </span>
                      <ul className="space-y-1 text-[11px] text-amber-900">
                        {(accountHealthDetail?.missing_data || []).map((m, idx) => (
                          <li key={idx}>• {m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Immutable Health Snapshot History & Activity Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0d1c15] font-display flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-[#0d9467]" />
                        <span>Immutable Health Snapshots ({accountHealthHistory.length})</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#73827a]">Model v1.0.0</span>
                    </div>
                    <div className="divide-y divide-[#0d1c15]/06 max-h-48 overflow-y-auto text-xs">
                      {accountHealthHistory.map((snap) => (
                        <div key={snap.id} className="py-2 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-[#0d1c15]">{snap.health_score}/100</span>
                            <span className="ml-2 text-[11px] text-[#73827a]">{snap.health_status}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#73827a]">
                            {new Date(snap.snapshot_date).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-[#0d1c15] font-display block">
                      Synced Engagement Timeline ({accountTimeline.length})
                    </span>
                    <div className="divide-y divide-[#0d1c15]/06 max-h-48 overflow-y-auto text-xs">
                      {accountTimeline.length === 0 ? (
                        <p className="text-[#73827a] py-4 text-center">No customer activities recorded yet.</p>
                      ) : (
                        accountTimeline.map((act) => (
                          <div key={act.id} className="py-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#0d1c15]">{act.title}</span>
                              <span className="px-1.5 py-0.2 rounded bg-[#edf2ec] text-[10px] font-mono">
                                {act.activity_type}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#73827a]">{act.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl border border-[#0d1c15]/08 text-xs text-[#73827a]">
                Select a Customer Success account on the left to inspect its health score breakdown.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: RENEWAL MANAGEMENT & FORECASTING                              */}
      {/* ===================================================================== */}
      {activeTab === 'renewals' && (
        <div className="space-y-6">
          {/* Currency Mismatch Warning */}
          {forecast?.currency_mismatch_warning && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{forecast.currency_mismatch_warning}</span>
            </div>
          )}

          {/* Renewal Forecast Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-[#0d1c15]/08">
              <span className="text-[10px] font-mono uppercase text-[#73827a] block">Upcoming Renewal Value</span>
              <span className="text-lg font-bold font-display text-[#0d1c15]">
                ${Number(forecast?.total_upcoming_renewal_value || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-[#0d1c15]/08">
              <span className="text-[10px] font-mono uppercase text-[#73827a] block">Weighted Renewal Value</span>
              <span className="text-lg font-bold font-display text-[#0d9467]">
                ${Number(forecast?.weighted_renewal_value || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-[#0d1c15]/08">
              <span className="text-[10px] font-mono uppercase text-[#73827a] block">At-Risk Renewal Value</span>
              <span className="text-lg font-bold font-display text-rose-600">
                ${Number(forecast?.at_risk_renewal_value || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-[#0d1c15]/08">
              <span className="text-[10px] font-mono uppercase text-[#73827a] block">Realized Renewed Value</span>
              <span className="text-lg font-bold font-display text-emerald-700">
                ${Number(forecast?.realized_renewed_value || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-[#0d1c15]/08">
              <span className="text-[10px] font-mono uppercase text-[#73827a] block">Expected Retained Rev.</span>
              <span className="text-lg font-bold font-display text-[#0d1c15]">
                ${Number(forecast?.expected_retained_revenue || 0).toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-[#0d1c15]/08">
              <span className="text-[10px] font-mono uppercase text-[#73827a] block">Churned / Renewal Rate</span>
              <span className="text-sm font-bold font-mono text-[#0d1c15]">
                ${Number(forecast?.churned_contract_value || 0).toLocaleString()} •{' '}
                {forecast?.renewal_rate_pct !== null && forecast?.renewal_rate_pct !== undefined
                  ? `${forecast.renewal_rate_pct}%`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Quarterly Forecast Breakdown */}
          {forecast?.by_quarter?.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs">
              <h4 className="text-xs font-mono uppercase font-bold text-[#73827a] mb-3">
                Renewal Forecast by Quarter ({forecast.currency})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                {forecast.by_quarter.map((q) => (
                  <div key={q.period} className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                    <div className="flex items-center justify-between font-bold text-[#0d1c15]">
                      <span>{q.period}</span>
                      <span className="text-[10px] font-mono text-[#73827a]">{q.count} renewals</span>
                    </div>
                    <div className="mt-2 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-[#73827a]">Upcoming:</span>
                        <span className="font-mono font-semibold">${q.upcoming_value.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73827a]">Weighted:</span>
                        <span className="font-mono font-semibold text-[#0d9467]">${q.weighted_value.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#73827a]">Realized:</span>
                        <span className="font-mono font-semibold text-emerald-700">
                          ${q.realized_renewed_value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Renewal Pipeline Table */}
          <div className="bg-white rounded-2xl border border-[#0d1c15]/08 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#0d1c15]/06 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0d1c15] font-display">Renewal Opportunities Pipeline</h3>
              <select
                value={renewalStatusFilter}
                onChange={(e) => setRenewalStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-xs outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="in_progress">In Progress</option>
                <option value="renewed">Renewed</option>
                <option value="lost">Lost</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#fcfbf9] border-b border-[#0d1c15]/06 text-[10px] font-mono uppercase text-[#73827a]">
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Renewal Date</th>
                    <th className="py-3 px-4 font-semibold">Contract Value</th>
                    <th className="py-3 px-4 font-semibold">Probability</th>
                    <th className="py-3 px-4 font-semibold">Risk Score</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Next Action</th>
                    <th className="py-3 px-4 font-semibold text-right">Transition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d1c15]/06">
                  {renewals
                    .filter((r) => (renewalStatusFilter === 'all' ? true : r.renewal_status === renewalStatusFilter))
                    .map((ren) => (
                      <tr key={ren.id} className="hover:bg-[#fcfbf9]/60">
                        <td className="py-3 px-4 font-bold text-[#0d1c15]">{ren.company}</td>
                        <td className="py-3 px-4 font-mono">
                          {new Date(ren.renewal_date).toISOString().split('T')[0]}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-[#0d9467]">
                          ${Number(ren.contract_value || 0).toLocaleString()} {ren.currency}
                        </td>
                        <td className="py-3 px-4 font-mono">{ren.renewal_probability}%</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              ren.risk_score >= 40
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {ren.risk_score}/100
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-[#edf2ec] text-[#0d1c15] font-mono text-[10px] uppercase">
                            {ren.renewal_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-[#73827a] max-w-xs truncate">
                          {ren.next_action}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {ren.renewal_status !== 'renewed' && (
                              <button
                                type="button"
                                onClick={() => handleRenewalStatusTransition(ren.id, 'renewed')}
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold cursor-pointer"
                              >
                                Mark Renewed
                              </button>
                            )}
                            {ren.renewal_status === 'upcoming' && (
                              <button
                                type="button"
                                onClick={() => handleRenewalStatusTransition(ren.id, 'in_progress')}
                                className="px-2 py-1 rounded-lg bg-[#edf2ec] hover:bg-[#0d1c15] hover:text-white text-[10px] font-semibold cursor-pointer"
                              >
                                In Progress
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 4: CHURN RISK INTELLIGENCE                                       */}
      {/* ===================================================================== */}
      {activeTab === 'churn' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#0d1c15] font-display">
              Evidence-Backed Churn Risk Register
            </h3>
            <p className="text-xs text-[#73827a]">
              Every churn risk factor cites concrete source records (approaching renewals without discussion, postponed meetings, unresolved call objections, uncompleted objectives). Low email activity alone never triggers a churn flag.
            </p>
          </div>

          {churnRisks.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-[#0d1c15]/08 text-xs text-[#73827a]">
              No active churn risks detected across workspace customer accounts.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {churnRisks.map((cr) => (
                <div
                  key={cr.account_id}
                  className="p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-mono font-bold text-xs">
                        Risk Score: {cr.risk_score}/100
                      </span>
                      <h4 className="text-sm font-bold text-[#0d1c15]">{cr.company}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${healthBadgeClass(cr.health_status)}`}>
                        Health: {cr.health_score}/100 ({cr.health_status})
                      </span>
                    </div>
                    <div className="text-xs font-mono text-[#73827a]">
                      Contract: ${Number(cr.contract_value || 0).toLocaleString()} {cr.currency} • Renewal:{' '}
                      {cr.renewal_date ? new Date(cr.renewal_date).toISOString().split('T')[0] : 'N/A'}
                    </div>
                  </div>

                  {/* Risk Factors with Evidence & Source */}
                  <div className="space-y-2">
                    {(cr.risk_factors || []).map((rf, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-900">{rf.title}</span>
                          <span className="px-2 py-0.2 rounded bg-rose-100 text-rose-800 font-mono text-[10px] uppercase">
                            {rf.severity} (+{rf.points} risk pts)
                          </span>
                        </div>
                        <p className="text-[#0d1c15]">
                          <span className="font-semibold">Evidence:</span> {rf.evidence}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#73827a] pt-1 border-t border-[#0d1c15]/06">
                          <span className="font-mono">Source: {rf.source}</span>
                          <span className="text-[#0d9467] font-semibold">
                            Mitigation: {rf.recommended_mitigation}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 5: EXPANSION OPPORTUNITIES                                       */}
      {/* ===================================================================== */}
      {activeTab === 'expansion' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0d1c15] font-display">
                Expansion Revenue Intelligence
              </h3>
              <p className="text-xs text-[#73827a]">
                Evidence-backed upsell, cross-sell, and seat expansion signals. AI suggestions require explicit approval and never create unsolicited CRM deals.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={expansionStatusFilter}
                onChange={(e) => setExpansionStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-white text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="suggested">Suggested (Pending Approval)</option>
                <option value="approved">Approved</option>
                <option value="in_progress">In Progress</option>
                <option value="won">Won</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <button
                type="button"
                onClick={() => handleIdentifyExpansion(selectedAccount?.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1c15] text-[#00e599] text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Detect Expansion Signals</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expansions
              .filter((e) => (expansionStatusFilter === 'all' ? true : e.status === expansionStatusFilter))
              .map((exp) => (
                <div
                  key={exp.id}
                  className="p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-[#0d9467]">
                          {exp.opportunity_type} • Confidence: {exp.confidence_level || 'medium'}
                        </span>
                        <h4 className="text-sm font-bold text-[#0d1c15]">{exp.company}</h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          exp.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : exp.status === 'dismissed'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs pt-1">
                      <div>
                        <span className="text-[#73827a] block text-[10px]">Estimated Value</span>
                        <span className="font-mono font-bold text-[#0d1c15]">
                          {exp.estimated_value !== null && exp.estimated_value !== undefined
                            ? `$${Number(exp.estimated_value).toLocaleString()} ${exp.currency}`
                            : 'Evidence-Pending Estimate'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#73827a] block text-[10px]">Probability</span>
                        <span className="font-mono font-bold text-[#0d9467]">{exp.probability}%</span>
                      </div>
                    </div>

                    {/* Evidence items */}
                    <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06 space-y-1 text-[11px]">
                      <span className="text-[10px] font-mono uppercase font-bold text-[#73827a] block">
                        Supporting Evidence ({exp.evidence?.length || 0})
                      </span>
                      {(exp.evidence || []).map((ev, i) => (
                        <div key={i} className="text-[#0d1c15]">
                          • {ev.detail || ev.text || JSON.stringify(ev)}{' '}
                          {ev.source && <span className="text-[10px] font-mono text-[#73827a]">({ev.source})</span>}
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-[#0d1c15]">
                      <span className="font-semibold">Recommended Action:</span> {exp.recommended_action}
                    </p>
                  </div>

                  {/* Approve / Edit / Dismiss Controls */}
                  <div className="pt-3 border-t border-[#0d1c15]/06 flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingExpansion(exp);
                        setExpansionEditForm({
                          opportunity_type: exp.opportunity_type,
                          estimated_value: exp.estimated_value ?? '',
                          probability: exp.probability,
                          recommended_action: exp.recommended_action || ''
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[#0d1c15]/10 hover:bg-[#edf2ec] text-[#0d1c15] font-semibold cursor-pointer"
                    >
                      Edit
                    </button>
                    {exp.status === 'suggested' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDismissExpansion(exp.id)}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveExpansion(exp.id)}
                          className="px-3 py-1 rounded-lg bg-[#0d1c15] text-[#00e599] hover:bg-[#162b21] font-semibold cursor-pointer"
                        >
                          Approve Opportunity
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 6: CUSTOMER SUCCESS PLANS                                        */}
      {/* ===================================================================== */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#0d1c15]/08">
            <div>
              <h3 className="text-base font-bold text-[#0d1c15] font-display">
                Grounded Customer Success Plans
              </h3>
              <p className="text-xs text-[#73827a]">
                Separates verified CRM facts from AI-recommended strategies. Generated drafts require explicit confirmation before saving or activation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedPlanAccountId}
                onChange={(e) => setSelectedPlanAccountId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-xs"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.company} ({a.health_score}/100)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleGeneratePlanDraft}
                disabled={generatingPlan}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0d1c15] text-[#00e599] text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${generatingPlan ? 'animate-spin' : ''}`} />
                <span>{generatingPlan ? 'Generating Draft...' : 'Generate Success Plan Draft'}</span>
              </button>
            </div>
          </div>

          {/* Unsaved Draft Confirmation Panel */}
          {draftPlan && (
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0d9467]" />
                  <h4 className="font-bold text-sm text-[#0d1c15]">
                    Unsaved AI Success Plan Draft — {draftPlan.company}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono text-[10px] font-bold">
                    STATUS: {draftPlan.status.toUpperCase()} (CONFIRMATION REQUIRED)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftPlan(null)}
                    className="px-3 py-1.5 rounded-xl border border-[#0d1c15]/15 text-[#0d1c15] font-semibold cursor-pointer"
                  >
                    Discard Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSaveDraftPlan}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0d1c15] text-[#00e599] font-semibold cursor-pointer"
                  >
                    Confirm & Save Plan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-white border border-emerald-200 space-y-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-mono font-bold">
                    ✓ VERIFIED CRM & ACCOUNT FACTS
                  </span>
                  <ul className="space-y-1 text-[11px] text-[#0d1c15]">
                    {(draftPlan.grounding?.verified_facts || []).map((vf, i) => (
                      <li key={i}>
                        <span className="font-semibold">{vf.label}:</span> {vf.value}{' '}
                        <span className="text-[10px] font-mono text-[#73827a]">({vf.source})</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-emerald-200 space-y-2">
                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 text-[10px] font-mono font-bold">
                    ✦ AI-RECOMMENDED STRATEGY & MITIGATION
                  </span>
                  <p className="text-[11px] text-[#0d1c15]">
                    <span className="font-semibold">Engagement Strategy:</span> {draftPlan.engagement_strategy}
                  </p>
                  <p className="text-[11px] text-[#0d1c15]">
                    <span className="font-semibold">Risk Mitigation:</span> {draftPlan.risk_mitigation_plan}
                  </p>
                  <p className="text-[11px] text-[#0d1c15]">
                    <span className="font-semibold">Expansion Strategy:</span> {draftPlan.expansion_strategy}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Saved Customer Success Plans */}
          <div className="grid grid-cols-1 gap-4">
            {plans.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-2xl border border-[#0d1c15]/08 text-xs text-[#73827a]">
                No saved Customer Success Plans yet. Click &ldquo;Generate Success Plan Draft&rdquo; above to create one.
              </div>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} className="p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-2xs space-y-4 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0d1c15]/08 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#0d1c15]">{plan.company}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            plan.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {plan.status}
                        </span>
                        <span className="text-[11px] font-mono text-[#0d9467]">
                          Progress: {plan.current_progress_pct || 0}%
                        </span>
                      </div>
                      <span className="text-[11px] text-[#73827a]">
                        Next Review Date:{' '}
                        {plan.review_date ? new Date(plan.review_date).toISOString().split('T')[0] : 'Unscheduled'}
                      </span>
                    </div>

                    {plan.status !== 'active' && (
                      <button
                        type="button"
                        onClick={() => handleApprovePlan(plan.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0d1c15] text-[#00e599] font-semibold cursor-pointer"
                      >
                        Approve & Activate Plan
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase font-bold text-[#73827a] block">
                        Customer Objectives ({plan.objectives?.length || 0})
                      </span>
                      {(plan.objectives || []).map((obj, idx) => (
                        <div key={idx} className="text-[11px] text-[#0d1c15] flex items-center justify-between">
                          <span>• {obj.title || String(obj)}</span>
                          <span className="font-mono text-[10px] text-[#0d9467]">{obj.progress ?? 0}%</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase font-bold text-[#73827a] block">
                        Success Metrics
                      </span>
                      {(plan.success_metrics || []).map((sm, idx) => (
                        <div key={idx} className="text-[11px] text-[#0d1c15]">
                          <span className="font-semibold">{sm.metric || 'Metric'}:</span> {sm.current} (Target: {sm.target})
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase font-bold text-[#73827a] block">
                        Engagement & Risk Mitigation
                      </span>
                      <p className="text-[11px] text-[#0d1c15]">{plan.engagement_strategy}</p>
                      <p className="text-[11px] text-[#73827a]">{plan.risk_mitigation_plan}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE CUSTOMER SUCCESS ACCOUNT                                */}
      {/* ===================================================================== */}
      {showCreateAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#0d1c15]/10 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#0d1c15]/08 pb-3">
              <h3 className="text-base font-bold text-[#0d1c15] font-display">Add Customer Success Profile</h3>
              <button
                type="button"
                onClick={() => setShowCreateAccountModal(false)}
                className="p-1 rounded-lg hover:bg-[#edf2ec] text-[#73827a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">CRM Account / Lead *</label>
                <select
                  required
                  value={newAccountForm.lead_id}
                  onChange={(e) => setNewAccountForm((p) => ({ ...p, lead_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                >
                  <option value="">Select CRM Account...</option>
                  {prospects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.company || p.name} ({p.email || 'Lead'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Contract Value</label>
                  <input
                    type="number"
                    min="0"
                    value={newAccountForm.contract_value}
                    onChange={(e) => setNewAccountForm((p) => ({ ...p, contract_value: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Currency</label>
                  <select
                    value={newAccountForm.currency}
                    onChange={(e) => setNewAccountForm((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Renewal Date</label>
                  <input
                    type="date"
                    value={newAccountForm.renewal_date}
                    onChange={(e) => setNewAccountForm((p) => ({ ...p, renewal_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Customer Status</label>
                  <select
                    value={newAccountForm.customer_status}
                    onChange={(e) => setNewAccountForm((p) => ({ ...p, customer_status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                  >
                    <option value="onboarding">Onboarding</option>
                    <option value="active">Active</option>
                    <option value="at_risk">At Risk</option>
                    <option value="renewal_due">Renewal Due</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#0d1c15]/08">
                <button
                  type="button"
                  onClick={() => setShowCreateAccountModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#0d1c15]/10 text-[#73827a] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0d1c15] text-[#00e599] font-semibold cursor-pointer"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: LOG RENEWAL OPPORTUNITY                                        */}
      {/* ===================================================================== */}
      {showRenewalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#0d1c15]/10 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#0d1c15]/08 pb-3">
              <h3 className="text-base font-bold text-[#0d1c15] font-display">Log Renewal Opportunity</h3>
              <button
                type="button"
                onClick={() => setShowRenewalModal(false)}
                className="p-1 rounded-lg hover:bg-[#edf2ec] text-[#73827a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRenewal} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Customer Account</label>
                <select
                  value={renewalForm.customer_success_account_id}
                  onChange={(e) => setRenewalForm((p) => ({ ...p, customer_success_account_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.company}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Renewal Date</label>
                  <input
                    type="date"
                    value={renewalForm.renewal_date}
                    onChange={(e) => setRenewalForm((p) => ({ ...p, renewal_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Contract Value</label>
                  <input
                    type="number"
                    min="0"
                    value={renewalForm.contract_value}
                    onChange={(e) => setRenewalForm((p) => ({ ...p, contract_value: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#0d1c15]/08">
                <button
                  type="button"
                  onClick={() => setShowRenewalModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#0d1c15]/10 text-[#73827a] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0d1c15] text-[#00e599] font-semibold cursor-pointer"
                >
                  Save Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT EXPANSION OPPORTUNITY                                     */}
      {/* ===================================================================== */}
      {editingExpansion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#0d1c15]/10 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#0d1c15]/08 pb-3">
              <h3 className="text-base font-bold text-[#0d1c15] font-display">
                Edit Expansion Opportunity — {editingExpansion.company}
              </h3>
              <button
                type="button"
                onClick={() => setEditingExpansion(null)}
                className="p-1 rounded-lg hover:bg-[#edf2ec] text-[#73827a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpansionEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Opportunity Type</label>
                <select
                  value={expansionEditForm.opportunity_type}
                  onChange={(e) => setExpansionEditForm((p) => ({ ...p, opportunity_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                >
                  <option value="upsell">Upsell</option>
                  <option value="cross_sell">Cross-Sell</option>
                  <option value="seat_expansion">Seat Expansion</option>
                  <option value="usage_expansion">Usage Expansion</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Estimated Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Leave blank if unconfirmed"
                    value={expansionEditForm.estimated_value}
                    onChange={(e) => setExpansionEditForm((p) => ({ ...p, estimated_value: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Probability (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={expansionEditForm.probability}
                    onChange={(e) => setExpansionEditForm((p) => ({ ...p, probability: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#0d1c15] mb-1">Recommended Next Action</label>
                <input
                  type="text"
                  value={expansionEditForm.recommended_action}
                  onChange={(e) => setExpansionEditForm((p) => ({ ...p, recommended_action: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#0d1c15]/08">
                <button
                  type="button"
                  onClick={() => setEditingExpansion(null)}
                  className="px-4 py-2 rounded-xl border border-[#0d1c15]/10 text-[#73827a] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0d1c15] text-[#00e599] font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
