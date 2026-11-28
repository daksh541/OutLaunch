import React, { useState, useEffect, useMemo } from 'react';
import { RevenueIntelligenceSkeleton } from '../ui/DashboardSkeleton';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter,
  RefreshCw,
  Sliders,
  Target,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Info,
  Clock,
  Briefcase,
  Users,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Edit3,
  X,
  PieChart,
} from 'lucide-react';
import {
  fetchRevenueOverview,
  fetchStageBreakdown,
  fetchSalesVelocity,
  fetchRevenueTargets,
  setRevenueTarget,
  fetchRevenueAttribution,
  fetchCurrentForecast,
  generateForecastSnapshot,
  fetchForecastHistory,
  fetchDealRiskAnalysis,
  fetchForecastAccuracy,
  fetchPipelineHealthInsights,
  adjustForecast,
} from '../../lib/outreachService';

export default function RevenueIntelligenceView() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'forecast', 'risks', 'velocity', 'attribution'
  const [periodDays, setPeriodDays] = useState(30);
  const [forecastType, setForecastType] = useState('weighted_pipeline'); // 'weighted_pipeline', 'ai_predicted', 'pipeline_based'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [overview, setOverview] = useState(null);
  const [stages, setStages] = useState([]);
  const [velocity, setVelocity] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [dealRisks, setDealRisks] = useState(null);
  const [attribution, setAttribution] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [insights, setInsights] = useState([]);

  // Modals & Interactivity
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    dealId: '',
    category: 'Commit',
    reason: '',
  });
  const [targetForm, setTargetForm] = useState({
    targetRevenue: 100000,
    targetPipelineCoverage: 3.0,
    periodType: 'monthly',
  });
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filter & search for Deal Risk table
  const [riskFilter, setRiskFilter] = useState('all'); // 'all', 'high', 'slipping', 'commit'
  const [riskSearch, setRiskSearch] = useState('');

  // Initial load
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        ovRes,
        stgRes,
        velRes,
        fcRes,
        riskRes,
        attRes,
        accRes,
        insRes,
      ] = await Promise.all([
        fetchRevenueOverview().catch(() => null),
        fetchStageBreakdown().catch(() => []),
        fetchSalesVelocity({ days: periodDays }).catch(() => null),
        fetchCurrentForecast({ days: periodDays, forecastType }).catch(() => null),
        fetchDealRiskAnalysis().catch(() => null),
        fetchRevenueAttribution().catch(() => null),
        fetchForecastAccuracy().catch(() => null),
        fetchPipelineHealthInsights().catch(() => []),
      ]);

      setOverview(ovRes);
      setStages(stgRes);
      setVelocity(velRes);
      setForecast(fcRes);
      setDealRisks(riskRes);
      setAttribution(attRes);
      setAccuracy(accRes);
      setInsights(insRes);

      if (ovRes?.targetConfig) {
        setTargetForm({
          targetRevenue: ovRes.targetConfig.target_revenue || 100000,
          targetPipelineCoverage: ovRes.targetConfig.target_pipeline_coverage || 3.0,
          periodType: ovRes.targetConfig.period_type || 'monthly',
        });
      }
    } catch (err) {
      console.error('Failed to load revenue intelligence:', err);
      setError(err.message || 'Error loading revenue intelligence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [periodDays, forecastType]);

  // Handle Target Save
  const handleSaveTarget = async (e) => {
    e.preventDefault();
    try {
      await setRevenueTarget({
        targetRevenue: Number(targetForm.targetRevenue),
        targetPipelineCoverage: Number(targetForm.targetPipelineCoverage),
        periodType: targetForm.periodType,
      });
      setShowTargetModal(false);
      setActionSuccess('Revenue target updated successfully.');
      setTimeout(() => setActionSuccess(null), 3500);
      loadData();
    } catch (err) {
      alert(`Failed to save target: ${err.message}`);
    }
  };

  // Handle Manual Forecast Category Override
  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!forecast?.snapshot?.id) {
      alert('No active forecast snapshot available to adjust.');
      return;
    }
    try {
      await adjustForecast({
        snapshotId: forecast.snapshot.id,
        dealId: overrideForm.dealId,
        adjustmentType: 'category_override',
        originalValue: selectedDeal?.forecast_category || 'Pipeline',
        adjustedValue: overrideForm.category,
        reason: overrideForm.reason,
      });
      setShowOverrideModal(false);
      setActionSuccess(`Deal category overridden to "${overrideForm.category}".`);
      setTimeout(() => setActionSuccess(null), 3500);
      loadData();
    } catch (err) {
      alert(`Adjustment error: ${err.message}`);
    }
  };

  // Filtered deals for Risk table
  const filteredRiskDeals = useMemo(() => {
    const list = dealRisks?.deals || [];
    return list.filter((d) => {
      if (riskFilter === 'high' && d.riskCategory !== 'high') return false;
      if (riskFilter === 'slipping' && d.slippageLikelihood !== 'high') return false;
      if (riskFilter === 'commit' && d.forecastCategory !== 'Commit') return false;
      if (riskSearch) {
        const q = riskSearch.toLowerCase();
        const matchesName = (d.name || '').toLowerCase().includes(q);
        const matchesCompany = (d.company || '').toLowerCase().includes(q);
        const matchesStage = (d.stage || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCompany && !matchesStage) return false;
      }
      return true;
    });
  }, [dealRisks, riskFilter, riskSearch]);

  if (loading && !overview) {
    return <RevenueIntelligenceSkeleton />;
  }

  const cur = overview?.currency || 'USD';

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Revenue Intelligence & Forecasting</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full uppercase tracking-wider">
                  Deterministic AI
                </span>
              </div>
              <p className="text-xs text-emerald-300 mt-0.5">
                Expected revenue forecasting, sales velocity analytics, deal slippage detection, and pipeline coverage.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector */}
          <div className="flex items-center bg-[#0a1610] border border-emerald-900/60 rounded-lg p-1 text-xs">
            <span className="px-2 py-1 text-emerald-300 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Window:
            </span>
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setPeriodDays(d)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  periodDays === d ? 'bg-emerald-600 text-white font-medium shadow-sm' : 'text-emerald-300 hover:text-white'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Target Settings */}
          <button
            onClick={() => setShowTargetModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-200 bg-[#0a1610] hover:bg-emerald-950/80 border border-emerald-900/60 rounded-lg transition-colors"
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            Targets & Quotas
          </button>

          {/* Refresh Snapshot */}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="flex items-center gap-2 p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-200 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Disclaimer Notice: Distinction of Forecast vs Actual */}
      <div className="flex items-start gap-2.5 p-3 bg-[#0a1610] border border-emerald-900/50 rounded-lg text-emerald-300 text-xs">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-emerald-200">Revenue Terminology Integrity: </span>
          <span className="text-emerald-300">
            Closed-Won deal value represents realized revenue from contracted deals. Open Pipeline and Forecast Revenue represent
            statistical estimations derived from deal values, sales velocity, and stage close probabilities. Forecasts are never presented
            as guaranteed cash flows.
          </span>
        </div>
      </div>

      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Closed-Won */}
        <div className="bg-[#0a1610] border border-emerald-950/80 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-emerald-300 text-[11px] font-medium">
            <span>Closed-Won Deals</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            ${(overview?.closedWonDealValue || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-300 mt-0.5">
            {overview?.wonDealCount || 0} won deals ({overview?.winRate || 0}% win rate)
          </div>
        </div>

        {/* Open Pipeline */}
        <div className="bg-[#0a1610] border border-emerald-950/80 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-emerald-300 text-[11px] font-medium">
            <span>Open Pipeline</span>
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            ${(overview?.openPipelineValue || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-300 mt-0.5">
            {overview?.openDealCount || 0} active open deals
          </div>
        </div>

        {/* Weighted Pipeline */}
        <div className="bg-[#0a1610] border border-emerald-950/80 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-emerald-300 text-[11px] font-medium">
            <span>Weighted Pipeline</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-300 mt-1">
            ${(overview?.weightedPipelineValue || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-300 mt-0.5">
            Stage probability baseline
          </div>
        </div>

        {/* Forecast Revenue */}
        <div className="bg-[#0a1610] border border-emerald-500/30 p-3.5 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-emerald-300 text-[11px] font-medium">
            <span>Forecast ({periodDays}d)</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            ${(forecast?.summary?.forecastAmount || overview?.weightedPipelineValue || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-300 mt-0.5 flex items-center gap-1">
            <span className="capitalize">{forecastType.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Pipeline Coverage */}
        <div className="bg-[#0a1610] border border-emerald-950/80 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-emerald-300 text-[11px] font-medium">
            <span>Pipeline Coverage</span>
            <Target className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {overview?.pipelineCoverage !== null && overview?.pipelineCoverage !== undefined
              ? `${overview.pipelineCoverage}x`
              : 'Unset'}
          </div>
          <div className="text-[10px] text-emerald-300 mt-0.5">
            {overview?.revenueTarget
              ? `Target: $${(overview.revenueTarget).toLocaleString()}`
              : 'Configure target'}
          </div>
        </div>

        {/* Sales Velocity */}
        <div className="bg-[#0a1610] border border-emerald-950/80 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-emerald-300 text-[11px] font-medium">
            <span>Sales Velocity</span>
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            ${(velocity?.current?.velocityPerMonth || 0).toLocaleString()}
            <span className="text-[10px] text-emerald-300 font-normal">/mo</span>
          </div>
          <div className="text-[10px] text-emerald-300 mt-0.5 flex items-center gap-1">
            {velocity?.deltas?.velocityPerMonth >= 0 ? (
              <span className="text-emerald-400 flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +${velocity?.deltas?.velocityPerMonth.toLocaleString()}
              </span>
            ) : (
              <span className="text-rose-400 flex items-center">
                <ArrowDownRight className="w-3 h-3" /> -${Math.abs(velocity?.deltas?.velocityPerMonth).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-emerald-950/80 space-x-6 text-sm font-medium">
        {[
          { id: 'overview', label: 'Overview & Health' },
          { id: 'forecast', label: 'Forecast Modeling' },
          { id: 'risks', label: `Deal Slippage (${dealRisks?.slippingDealsCount || 0})` },
          { id: 'velocity', label: 'Sales Velocity' },
          { id: 'attribution', label: 'Revenue Attribution' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 transition-colors relative ${
              activeTab === tab.id
                ? 'text-emerald-400 font-semibold'
                : 'text-emerald-300 hover:text-emerald-100'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & HEALTH */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Actionable Health Alerts */}
          {insights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {insights.map((ins, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border ${
                    ins.severity === 'danger'
                      ? 'bg-rose-950/20 border-rose-900/50 text-rose-200'
                      : ins.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-900/50 text-amber-200'
                      : 'bg-[#0a1610] border-emerald-950/80 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {ins.severity === 'danger' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : ins.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>{ins.title}</span>
                  </div>
                  <p className="text-[11px] text-emerald-300 mt-1 leading-relaxed">{ins.description}</p>
                  <div className="mt-2.5 pt-2 border-t border-emerald-900/40 text-[10px] text-emerald-300">
                    <span className="font-medium text-emerald-200">Action: </span>
                    {ins.recommendedAction}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pipeline Stage Breakdown */}
          <div className="bg-[#0a1610] border border-emerald-950/80 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Pipeline Distribution by Sales Stage</h3>
                <p className="text-xs text-emerald-300 mt-0.5">
                  Current distribution of deals across stages, showing nominal vs probability-weighted values.
                </p>
              </div>
              <div className="text-xs text-emerald-300">
                Total Open: ${(overview?.openPipelineValue || 0).toLocaleString()}
              </div>
            </div>

            <div className="space-y-3">
              {stages.map((stg) => {
                const totalOpen = overview?.openPipelineValue || 1;
                const pctOfPipeline = Math.round((stg.totalValue / totalOpen) * 100);

                return (
                  <div key={stg.stage} className="p-3 bg-black/30 rounded-lg border border-emerald-950/40">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-200">{stg.stage}</span>
                        <span className="px-1.5 py-0.5 text-[10px] bg-emerald-950/60 text-emerald-300 rounded border border-emerald-900/50">
                          {stg.dealCount} deals
                        </span>
                        <span className="text-[11px] text-emerald-300">
                          ({stg.averageProbability}% avg probability)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white">${stg.totalValue.toLocaleString()}</span>
                        <span className="text-emerald-300 text-[11px] ml-2">
                          (Weighted: ${stg.weightedValue.toLocaleString()})
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-emerald-950/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, pctOfPipeline))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FORECAST MODELING */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Forecast Type Selector & Assumptions Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-[#0a1610] border border-emerald-950/80 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-300">Forecasting Model:</span>
              {[
                { id: 'weighted_pipeline', label: 'Deterministic Weighted Pipeline' },
                { id: 'ai_predicted', label: 'AI Risk-Adjusted Prediction' },
                { id: 'pipeline_based', label: 'Full Unweighted Pipeline' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setForecastType(m.id)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors border ${
                    forecastType === m.id
                      ? 'bg-emerald-600 text-white font-medium border-emerald-500 shadow-sm'
                      : 'bg-black/30 text-emerald-300 hover:text-white border-emerald-950/60'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-emerald-300 flex items-center gap-1.5">
              <span>Model Version:</span>
              <span className="font-mono text-emerald-300 font-semibold">{forecast?.snapshot?.model_version || 'v1.0.0'}</span>
            </div>
          </div>

          {/* Forecast Category Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-[#0a1610] border border-emerald-950/80 p-4 rounded-xl">
              <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Commit</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                ${(forecast?.summary?.committedAmount || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-300 mt-1">
                Deals with 75%+ probability, active stakeholder engagement, and clear close path.
              </p>
            </div>

            <div className="bg-[#0a1610] border border-emerald-950/80 p-4 rounded-xl">
              <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Best Case</div>
              <div className="text-2xl font-bold text-white mt-1">
                ${(forecast?.summary?.bestCaseAmount || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-300 mt-1">
                Committed opportunities plus high-upside deals in evaluation with minimal slippage.
              </p>
            </div>

            <div className="bg-[#0a1610] border border-emerald-950/80 p-4 rounded-xl">
              <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Weighted Baseline</div>
              <div className="text-2xl font-bold text-white mt-1">
                ${(forecast?.summary?.weightedPipelineAmount || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-300 mt-1">
                Statistical expectation: Sum of (Value × CRM Stage Probability).
              </p>
            </div>

            <div className="bg-[#0a1610] border border-emerald-500/40 p-4 rounded-xl bg-emerald-950/10">
              <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> AI Predicted
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                ${(forecast?.summary?.aiPredictedAmount || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-300 mt-1">
                Risk-decayed expectation accounting for inactivity, pushed dates, and meeting signals.
              </p>
            </div>
          </div>

          {/* Historical Forecast Accuracy Card */}
          {accuracy && (
            <div className="p-4 bg-[#0a1610] border border-emerald-950/80 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-semibold text-white">Historical Forecast Accuracy</h4>
                </div>
                <div className="text-xs font-bold text-emerald-400">
                  {accuracy.averageAccuracyPercentage}% Average Realization Accuracy
                </div>
              </div>
              <p className="text-xs text-emerald-300 leading-relaxed">
                Calculated by comparing prior snapshot projections against verified Closed-Won deals in those periods:
                <code className="ml-1 px-1.5 py-0.5 bg-black/40 rounded text-emerald-300 text-[11px]">{accuracy.formula}</code>
              </p>
            </div>
          )}

          {/* Deal Prediction Roster */}
          <div className="bg-[#0a1610] border border-emerald-950/80 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-emerald-950/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Deal Forecast Predictions ({periodDays}d Window)</h3>
                <p className="text-xs text-emerald-300 mt-0.5">
                  Individual opportunity breakdown with base probability, AI predicted probability, and forecast category.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 text-emerald-300 uppercase text-[10px] tracking-wider border-b border-emerald-950/60">
                  <tr>
                    <th className="py-3 px-4">Deal / Company</th>
                    <th className="py-3 px-4">Nominal Value</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4">Base Prob</th>
                    <th className="py-3 px-4">AI Prob</th>
                    <th className="py-3 px-4">Predicted Rev</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-950/40">
                  {(forecast?.dealPredictions || []).map((pred) => (
                    <tr key={pred.id} className="hover:bg-emerald-950/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">
                        <div>{pred.deal_name}</div>
                        <div className="text-[10px] text-emerald-300">{pred.company}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-200">
                        ${pred.deal_value.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-emerald-300">{pred.stage}</td>
                      <td className="py-3 px-4 text-emerald-300">{pred.base_probability}%</td>
                      <td className="py-3 px-4 font-semibold text-emerald-400">
                        {pred.predicted_close_probability}%
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        ${pred.predicted_revenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                            pred.forecast_category === 'Commit'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                              : pred.forecast_category === 'Best Case'
                              ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/40'
                              : 'bg-black/40 text-emerald-300 border-emerald-950/60'
                          }`}
                        >
                          {pred.forecast_category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedDeal(pred);
                            setOverrideForm({
                              dealId: pred.deal_id,
                              category: pred.forecast_category,
                              reason: '',
                            });
                            setShowOverrideModal(true);
                          }}
                          className="px-2 py-1 text-[11px] font-medium text-emerald-300 hover:text-white bg-black/40 hover:bg-emerald-950/60 border border-emerald-900/40 rounded transition-colors"
                        >
                          Override
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEAL RISK & SLIPPAGE TABLE */}
      {activeTab === 'risks' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-[#0a1610] border border-emerald-950/80 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-300 font-medium">Filter By:</span>
              {[
                { id: 'all', label: 'All Deals' },
                { id: 'slipping', label: 'Imminent Slippage' },
                { id: 'high', label: 'High Risk' },
                { id: 'commit', label: 'Committed Deals' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setRiskFilter(f.id)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    riskFilter === f.id
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'text-emerald-300 hover:text-white bg-black/30'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search deal or company..."
                value={riskSearch}
                onChange={(e) => setRiskSearch(e.target.value)}
                className="px-3 py-1.5 pl-8 text-xs bg-black/40 border border-emerald-900/60 rounded-lg text-white placeholder-emerald-800 focus:outline-none focus:border-emerald-500 w-64"
              />
              <Filter className="w-3.5 h-3.5 text-emerald-300 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#0a1610] border border-emerald-950/80 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-emerald-300 uppercase text-[10px] tracking-wider border-b border-emerald-950/60">
                <tr>
                  <th className="py-3 px-4">Deal</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Slippage Likelihood</th>
                  <th className="py-3 px-4">Primary Risk Factor</th>
                  <th className="py-3 px-4">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/40">
                {filteredRiskDeals.map((deal) => (
                  <tr key={deal.dealId} className="hover:bg-emerald-950/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">
                      <div>{deal.name}</div>
                      <div className="text-[10px] text-emerald-300">{deal.company}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-200">
                      ${deal.value.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-emerald-300">{deal.stage}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-black/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              deal.riskScore > 65
                                ? 'bg-rose-500'
                                : deal.riskScore > 35
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${deal.riskScore}%` }}
                          />
                        </div>
                        <span
                          className={`font-mono text-xs font-semibold ${
                            deal.riskScore > 65
                              ? 'text-rose-400'
                              : deal.riskScore > 35
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {deal.riskScore}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                          deal.slippageLikelihood === 'high'
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                            : deal.slippageLikelihood === 'possible'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                            : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                        }`}
                      >
                        {deal.slippageLikelihood}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-emerald-300">
                      {deal.riskFactors[0]?.factor || 'Healthy engagement'}
                    </td>
                    <td className="py-3 px-4 text-emerald-300 max-w-xs truncate" title={deal.recommendedAction}>
                      {deal.recommendedAction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SALES VELOCITY ANALYTICS */}
      {activeTab === 'velocity' && velocity && (
        <div className="space-y-6">
          {/* Formula Explanation Card */}
          <div className="p-4 bg-[#0a1610] border border-emerald-950/80 rounded-xl">
            <h4 className="text-xs font-semibold text-white mb-1">Sales Velocity Calculation Formula</h4>
            <div className="p-2.5 bg-black/40 rounded border border-emerald-900/40 font-mono text-emerald-300 text-xs">
              {velocity.formula}
            </div>
            <p className="text-xs text-emerald-300 mt-2">
              Measures how fast your sales pipeline converts leads into realized revenue, combining volume, average deal size, conversion rate, and pipeline duration.
            </p>
          </div>

          {/* Velocity Four Factors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Qualified Opps */}
            <div className="bg-[#0a1610] border border-emerald-950/80 p-4 rounded-xl">
              <div className="text-xs text-emerald-300 font-medium">Qualified Opportunities</div>
              <div className="text-2xl font-bold text-white mt-1">
                {velocity.current.qualifiedOpportunities}
              </div>
              <div className="text-[11px] text-emerald-300 mt-0.5">
                vs {velocity.previous.qualifiedOpportunities} in previous window
              </div>
            </div>

            {/* Average Deal Value */}
            <div className="bg-[#0a1610] border border-emerald-950/80 p-4 rounded-xl">
              <div className="text-xs text-emerald-300 font-medium">Average Deal Value</div>
              <div className="text-2xl font-bold text-white mt-1">
                ${velocity.current.averageDealValue.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-300 mt-0.5">
                Mean qualified opportunity size
              </div>
            </div>

            {/* Win Rate */}
            <div className="bg-[#0a1610] border border-emerald-950/80 p-4 rounded-xl">
              <div className="text-xs text-emerald-300 font-medium">Win Rate</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {velocity.current.winRate}%
              </div>
              <div className="text-[11px] text-emerald-300 mt-0.5">
                Closed-Won / Total Closed Opps
              </div>
            </div>

            {/* Sales Cycle Length */}
            <div className="bg-[#0a1610] border border-emerald-950/80 p-4 rounded-xl">
              <div className="text-xs text-emerald-300 font-medium">Average Sales Cycle</div>
              <div className="text-2xl font-bold text-white mt-1">
                {velocity.current.averageSalesCycleDays} <span className="text-xs text-emerald-300 font-normal">days</span>
              </div>
              <div className="text-[11px] text-emerald-300 mt-0.5">
                From creation to close
              </div>
            </div>
          </div>

          {/* Resulting Velocity Banner */}
          <div className="p-5 bg-[#0a1610] border border-emerald-500/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Monthly Revenue Velocity</div>
              <div className="text-3xl font-extrabold text-white mt-1">
                ${velocity.current.velocityPerMonth.toLocaleString()}
                <span className="text-sm font-normal text-emerald-300 ml-1">expected per 30 days</span>
              </div>
              <p className="text-xs text-emerald-300 mt-1">
                Daily velocity rate: ${velocity.current.velocityPerDay.toLocaleString()} / day
              </p>
            </div>

            <div className="p-3 bg-black/40 rounded-lg border border-emerald-900/60 text-right">
              <div className="text-xs text-emerald-300">Period-over-Period Delta</div>
              <div className="text-lg font-bold mt-0.5">
                {velocity.deltas.velocityPerMonth >= 0 ? (
                  <span className="text-emerald-400">
                    +${velocity.deltas.velocityPerMonth.toLocaleString()} / mo
                  </span>
                ) : (
                  <span className="text-rose-400">
                    -${Math.abs(velocity.deltas.velocityPerMonth).toLocaleString()} / mo
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REVENUE ATTRIBUTION */}
      {activeTab === 'attribution' && attribution && (
        <div className="space-y-6">
          {/* Warning banner if partial attribution */}
          {attribution.attributionWarning && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-950/20 border border-amber-900/50 rounded-xl text-amber-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-100">Attribution Coverage Notice: </span>
                <span>{attribution.attributionWarning}</span>
              </div>
            </div>
          )}

          {/* Campaign Revenue Table */}
          <div className="bg-[#0a1610] border border-emerald-950/80 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-emerald-950/60">
              <h3 className="text-sm font-semibold text-white">Revenue Attribution by Outreach Campaign</h3>
              <p className="text-xs text-emerald-300 mt-0.5">
                Tracks Closed-Won deal values, open pipeline, and opportunity-to-won conversion rates generated by campaigns.
              </p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-emerald-300 uppercase text-[10px] tracking-wider border-b border-emerald-950/60">
                <tr>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4">Opportunities</th>
                  <th className="py-3 px-4">Won Deals</th>
                  <th className="py-3 px-4">Closed-Won Revenue</th>
                  <th className="py-3 px-4">Open Pipeline</th>
                  <th className="py-3 px-4">Opp-to-Won %</th>
                  <th className="py-3 px-4">Average Deal Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/40">
                {attribution.campaigns.map((c, i) => (
                  <tr key={i} className="hover:bg-emerald-950/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">{c.campaign}</td>
                    <td className="py-3 px-4 text-emerald-200">{c.dealCount}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">{c.wonDeals}</td>
                    <td className="py-3 px-4 font-bold text-white">${c.closedWonRevenue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-300">${c.openPipeline.toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-200">{c.opportunityToWonRate}%</td>
                    <td className="py-3 px-4 text-emerald-300">${c.averageDealSize.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lead Source Revenue Table */}
          <div className="bg-[#0a1610] border border-emerald-950/80 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-emerald-950/60">
              <h3 className="text-sm font-semibold text-white">Revenue Attribution by Lead Acquisition Source</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-emerald-300 uppercase text-[10px] tracking-wider border-b border-emerald-950/60">
                <tr>
                  <th className="py-3 px-4">Lead Source</th>
                  <th className="py-3 px-4">Deals Generated</th>
                  <th className="py-3 px-4">Won Deals</th>
                  <th className="py-3 px-4">Closed-Won Revenue</th>
                  <th className="py-3 px-4">Open Pipeline</th>
                  <th className="py-3 px-4">Source Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/40">
                {attribution.sources.map((s, i) => (
                  <tr key={i} className="hover:bg-emerald-950/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">{s.source}</td>
                    <td className="py-3 px-4 text-emerald-200">{s.dealCount}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">{s.wonDeals}</td>
                    <td className="py-3 px-4 font-bold text-white">${s.closedWonRevenue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-300">${s.openPipeline.toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-200">{s.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: SET REVENUE TARGETS */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d1c15] border border-emerald-900/80 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-950/80 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Configure Revenue Target & Quotas</h3>
              </div>
              <button
                onClick={() => setShowTargetModal(false)}
                className="text-emerald-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div>
                <label className="block text-emerald-300 font-medium mb-1">Target Revenue ({cur})</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={targetForm.targetRevenue}
                  onChange={(e) => setTargetForm({ ...targetForm, targetRevenue: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-emerald-900/60 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300 font-medium mb-1">Target Pipeline Coverage Ratio</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  value={targetForm.targetPipelineCoverage}
                  onChange={(e) => setTargetForm({ ...targetForm, targetPipelineCoverage: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-emerald-900/60 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                <span className="text-[10px] text-emerald-300">Recommended: 3.0x to 4.0x open pipeline relative to quota</span>
              </div>

              <div>
                <label className="block text-emerald-300 font-medium mb-1">Period Cadence</label>
                <select
                  value={targetForm.periodType}
                  onChange={(e) => setTargetForm({ ...targetForm, periodType: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-emerald-900/60 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="monthly">Monthly Target</option>
                  <option value="quarterly">Quarterly Target</option>
                  <option value="annual">Annual Target</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-950/80">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-3 py-1.5 text-xs text-emerald-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL FORECAST CATEGORY OVERRIDE */}
      {showOverrideModal && selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d1c15] border border-emerald-900/80 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-950/80 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Override Forecast Category</h3>
              </div>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-emerald-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-black/40 rounded-lg border border-emerald-900/40">
              <div className="font-semibold text-white">{selectedDeal.deal_name}</div>
              <div className="text-[11px] text-emerald-300">
                Company: {selectedDeal.company} | Value: ${selectedDeal.deal_value.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-300 mt-1">
                Current AI Category: <span className="font-medium text-emerald-200">{selectedDeal.forecast_category}</span>
              </div>
            </div>

            <form onSubmit={handleSaveOverride} className="space-y-4">
              <div>
                <label className="block text-emerald-300 font-medium mb-1">New Forecast Category</label>
                <select
                  value={overrideForm.category}
                  onChange={(e) => setOverrideForm({ ...overrideForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-emerald-900/60 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Commit">Commit (Expected to close this period)</option>
                  <option value="Best Case">Best Case (High probability opportunity)</option>
                  <option value="Pipeline">Pipeline (Early evaluation stage)</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-emerald-300 font-medium mb-1">
                  Manager Justification Reason (Required for Audit Trail)
                </label>
                <textarea
                  rows={3}
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  placeholder="e.g. Verbal agreement from VP of Eng confirmed during follow-up call."
                  className="w-full px-3 py-2 bg-black/40 border border-emerald-900/60 rounded-lg text-white placeholder-emerald-800 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/50 rounded text-[11px] text-emerald-300">
                Audit integrity: This action records a manager adjustment on the forecast snapshot and does not alter the customer's CRM deal stage.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-950/80">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-3 py-1.5 text-xs text-emerald-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
                >
                  Confirm Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
