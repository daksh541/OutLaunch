import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  Split,
  Plus,
  Play,
  Pause,
  Check,
  X,
  Eye,
  Sliders,
  ShieldAlert,
  Mail,
  Users,
  Send,
  MessageSquare,
  ThumbsUp,
  FileText,
  Copy
} from 'lucide-react';
import {
  fetchOptimizationOverview,
  fetchOptimizationRecommendations,
  reviewOptimizationRecommendation,
  applyOptimizationRecommendation,
  dismissOptimizationRecommendation,
  generateCampaignVariants,
  fetchCampaignOptimizationDetail,
  analyzeCampaignOptimization,
  createCampaignExperiment,
  fetchCampaignExperiments,
  pauseCampaignExperiment,
  completeCampaignExperiment,
  fetchAnalyticsCampaigns,
} from '../../lib/outreachService';

export default function CampaignOptimizationView({ onNavigateToCampaigns }) {
  // Tabs: 'recommendations' | 'campaigns' | 'experiments'
  const [activeTab, setActiveTab] = useState('recommendations');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Overview Data
  const [overview, setOverview] = useState({
    campaigns_analyzed: 0,
    health_distribution: {
      excellent: 0,
      healthy: 0,
      needs_attention: 0,
      critical: 0,
      insufficient_data: 0,
    },
    active_recommendations_count: 0,
    applied_recommendations_count: 0,
    active_experiments_count: 0,
    campaigns_needing_attention: 0,
  });

  // Recommendations Tab
  const [recommendations, setRecommendations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('new');

  // Campaigns Tab
  const [campaignsList, setCampaignsList] = useState([]);
  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState(null);
  const [isAnalyzingCampId, setIsAnalyzingCampId] = useState(null);

  // Experiments Tab
  const [experiments, setExperiments] = useState([]);
  const [showCreateExpModal, setShowCreateExpModal] = useState(false);

  // Action Modals
  const [diffModalRec, setDiffModalRec] = useState(null);
  const [variantModalRec, setVariantModalRec] = useState(null);
  const [generatedVariants, setGeneratedVariants] = useState([]);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [variantPrompt, setVariantPrompt] = useState('');

  // New Experiment Form State
  const [newExp, setNewExp] = useState({
    campaignId: '',
    name: '',
    experimentType: 'subject_line',
    primaryMetric: 'positive_reply_rate',
    trafficAllocation: 50,
    stepNumber: 1,
    variantA: { name: 'Variant A (Control)', subject: '', template_body: '' },
    variantB: { name: 'Variant B (Challenger)', subject: '', template_body: '' },
  });

  // Load Overview & Initial Tab Data
  const loadOverview = async () => {
    try {
      const data = await fetchOptimizationOverview();
      if (data && data.success) {
        setOverview(data);
      }
    } catch (err) {
      console.error('Failed to load optimization overview:', err);
    }
  };

  const loadRecommendations = async () => {
    try {
      const recs = await fetchOptimizationRecommendations({
        status: selectedStatus,
        category: selectedCategory,
      });
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    }
  };

  const loadCampaigns = async () => {
    try {
      const res = await fetchAnalyticsCampaigns({ limit: 50 });
      if (res && res.campaigns) {
        setCampaignsList(res.campaigns);
        if (res.campaigns.length > 0 && !newExp.campaignId) {
          setNewExp(prev => ({ ...prev, campaignId: res.campaigns[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    }
  };

  const loadExperiments = async () => {
    try {
      const exps = await fetchCampaignExperiments();
      setExperiments(exps);
    } catch (err) {
      console.error('Failed to load experiments:', err);
    }
  };

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([loadOverview(), loadRecommendations(), loadCampaigns(), loadExperiments()]);
      setIsLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [selectedCategory, selectedStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadOverview(), loadRecommendations(), loadCampaigns(), loadExperiments()]);
    if (selectedCampaignDetail) {
      const updated = await fetchCampaignOptimizationDetail(selectedCampaignDetail.campaign.id);
      setSelectedCampaignDetail(updated);
    }
    setIsRefreshing(false);
  };

  // Analyze Campaign with AI
  const handleAnalyzeCampaign = async (campaignId) => {
    setIsAnalyzingCampId(campaignId);
    try {
      const res = await analyzeCampaignOptimization(campaignId);
      if (res && res.success) {
        await Promise.all([loadOverview(), loadRecommendations(), loadCampaigns()]);
        const updated = await fetchCampaignOptimizationDetail(campaignId);
        setSelectedCampaignDetail(updated);
      }
    } catch (err) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzingCampId(null);
    }
  };

  // Recommendation Actions
  const handleReview = async (recId) => {
    try {
      await reviewOptimizationRecommendation(recId);
      await loadRecommendations();
      await loadOverview();
    } catch (err) {
      alert(`Failed to review recommendation: ${err.message}`);
    }
  };

  const handleApply = async (recId) => {
    try {
      await applyOptimizationRecommendation(recId);
      setDiffModalRec(null);
      await loadRecommendations();
      await loadOverview();
    } catch (err) {
      alert(`Failed to apply recommendation: ${err.message}`);
    }
  };

  const handleDismiss = async (recId) => {
    try {
      await dismissOptimizationRecommendation(recId, 'User dismissed from dashboard');
      await loadRecommendations();
      await loadOverview();
    } catch (err) {
      alert(`Failed to dismiss recommendation: ${err.message}`);
    }
  };

  // Generate Variants
  const handleOpenVariantModal = (rec) => {
    setVariantModalRec(rec);
    setGeneratedVariants([]);
    setVariantPrompt('');
  };

  const handleRunVariantGeneration = async () => {
    if (!variantModalRec) return;
    setIsGeneratingVariants(true);
    try {
      const type = variantModalRec.category === 'subject_line' ? 'subject' : 'cta';
      const res = await generateCampaignVariants(variantModalRec.campaign_id, {
        variantType: type,
        prompt: variantPrompt,
        context: {
          title: variantModalRec.title,
          original: variantModalRec.original_value,
        },
      });
      if (res && res.variants) {
        setGeneratedVariants(res.variants);
      }
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  // Create Experiment
  const handleCreateExperiment = async (e) => {
    e.preventDefault();
    try {
      await createCampaignExperiment(newExp);
      setShowCreateExpModal(false);
      await loadExperiments();
      await loadOverview();
      setNewExp({
        campaignId: campaignsList[0]?.id || '',
        name: '',
        experimentType: 'subject_line',
        primaryMetric: 'positive_reply_rate',
        trafficAllocation: 50,
        stepNumber: 1,
        variantA: { name: 'Variant A (Control)', subject: '', template_body: '' },
        variantB: { name: 'Variant B (Challenger)', subject: '', template_body: '' },
      });
    } catch (err) {
      alert(`Failed to create experiment: ${err.message}`);
    }
  };

  const handleTogglePauseExp = async (expId, currentStatus) => {
    try {
      if (currentStatus === 'active') {
        await pauseCampaignExperiment(expId);
      }
      await loadExperiments();
      await loadOverview();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleCompleteExp = async (expId) => {
    try {
      await completeCampaignExperiment(expId);
      await loadExperiments();
      await loadOverview();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* 1. Header & Quick Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#0d1c15]/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#0d1c15] flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-[#0d9467]" />
              AI Campaign Optimization & Recommendations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#00e599]/15 text-[#0d9467] border border-[#00e599]/30">
              Self-Optimizing Outbound
            </span>
          </div>
          <p className="text-sm text-[#0d1c15]/60 mt-1">
            Real-time health audits, intelligent sequence improvements, copy refinement, and controlled A/B experiments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateExpModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#0d1c15] text-white rounded-lg hover:bg-[#0d1c15]/90 shadow-xs transition-colors"
          >
            <Split className="w-3.5 h-3.5 text-[#00e599]" />
            New A/B Experiment
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-xs font-medium bg-white border border-[#0d1c15]/15 rounded-lg text-[#0d1c15]/70 hover:text-[#0d1c15] hover:bg-[#0d1c15]/5 shadow-xs transition-colors"
            title="Refresh optimization telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0d9467]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Overview Health & Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Analyzed Campaigns */}
        <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 shadow-xs">
          <div className="text-xs text-[#0d1c15]/60 font-medium mb-1">Campaigns Analyzed</div>
          <div className="text-2xl font-bold text-[#0d1c15]">{overview.campaigns_analyzed}</div>
          <div className="mt-2 text-[11px] text-[#0d1c15]/50 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00e599]" />
            {overview.health_distribution.healthy + overview.health_distribution.excellent} Healthy / Excellent
          </div>
        </div>

        {/* Needs Attention / Critical */}
        <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 shadow-xs">
          <div className="text-xs text-[#0d1c15]/60 font-medium mb-1">Needs Attention</div>
          <div className={`text-2xl font-bold ${overview.campaigns_needing_attention > 0 ? 'text-amber-600' : 'text-[#0d1c15]'}`}>
            {overview.campaigns_needing_attention}
          </div>
          <div className="mt-2 text-[11px] text-[#0d1c15]/50 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${overview.campaigns_needing_attention > 0 ? 'bg-amber-500' : 'bg-[#00e599]'}`} />
            {overview.health_distribution.critical} Critical • {overview.health_distribution.needs_attention} Warning
          </div>
        </div>

        {/* Active Recommendations */}
        <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 shadow-xs">
          <div className="text-xs text-[#0d1c15]/60 font-medium mb-1">Active Recommendations</div>
          <div className="text-2xl font-bold text-[#0d9467]">{overview.active_recommendations_count}</div>
          <div className="mt-2 text-[11px] text-[#0d1c15]/50">
            Across 5 performance categories
          </div>
        </div>

        {/* Applied Optimizations */}
        <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 shadow-xs">
          <div className="text-xs text-[#0d1c15]/60 font-medium mb-1">Optimizations Applied</div>
          <div className="text-2xl font-bold text-[#0d1c15]">{overview.applied_recommendations_count}</div>
          <div className="mt-2 text-[11px] text-[#0d1c15]/50 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#0d9467]" />
            Audited & safely merged
          </div>
        </div>

        {/* Active Experiments */}
        <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 shadow-xs">
          <div className="text-xs text-[#0d1c15]/60 font-medium mb-1">Active A/B Experiments</div>
          <div className="text-2xl font-bold text-[#0d1c15]">{overview.active_experiments_count}</div>
          <div className="mt-2 text-[11px] text-[#0d1c15]/50 flex items-center gap-1">
            <Split className="w-3 h-3 text-[#0d9467]" />
            Live traffic split
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="border-b border-[#0d1c15]/10 flex items-center gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'recommendations'
              ? 'text-[#0d9467] border-b-2 border-[#0d9467]'
              : 'text-[#0d1c15]/60 hover:text-[#0d1c15]'
          }`}
        >
          Optimization Recommendations ({overview.active_recommendations_count})
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'campaigns'
              ? 'text-[#0d9467] border-b-2 border-[#0d9467]'
              : 'text-[#0d1c15]/60 hover:text-[#0d1c15]'
          }`}
        >
          Campaign Health Diagnostics ({campaignsList.length})
        </button>

        <button
          onClick={() => setActiveTab('experiments')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'experiments'
              ? 'text-[#0d9467] border-b-2 border-[#0d9467]'
              : 'text-[#0d1c15]/60 hover:text-[#0d1c15]'
          }`}
        >
          A/B Experiments ({experiments.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RECOMMENDATIONS LIST & APPROVAL WORKFLOW                           */}
      {/* ========================================================================= */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-[#0d1c15]/10 text-xs">
            {/* Status Filter */}
            <div className="inline-flex rounded-lg border border-[#0d1c15]/10 bg-[#f7f5f0] p-1 font-medium">
              {[
                { id: 'new', label: 'New / Pending' },
                { id: 'reviewed', label: 'Reviewed' },
                { id: 'applied', label: 'Applied' },
                { id: 'dismissed', label: 'Dismissed' },
                { id: 'all', label: 'All' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStatus(s.id)}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedStatus === s.id
                      ? 'bg-white text-[#0d1c15] shadow-xs font-semibold'
                      : 'text-[#0d1c15]/60 hover:text-[#0d1c15]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[#0d1c15]/50">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#f7f5f0] border-none text-xs rounded-lg py-1 px-2.5 text-[#0d1c15] focus:outline-hidden font-medium"
              >
                <option value="all">All Categories</option>
                <option value="subject_line">Subject Lines</option>
                <option value="email_copy">Email Copy & CTA</option>
                <option value="follow_up">Sequence & Follow-ups</option>
                <option value="audience">Audience & ICP</option>
                <option value="deliverability">Deliverability & Reputation</option>
              </select>
            </div>
          </div>

          {/* Recommendations Cards Grid */}
          {recommendations.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#0d1c15]/10 text-center text-xs text-[#0d1c15]/50">
              <Sparkles className="w-8 h-8 text-[#0d9467] mx-auto mb-3 opacity-60" />
              <div className="font-semibold text-sm text-[#0d1c15] mb-1">No recommendations found</div>
              <p>
                {selectedStatus === 'new'
                  ? 'Your campaigns are performing well or waiting for initial dispatch volume. Run "Analyze with AI" in the Campaign Health tab to evaluate a specific campaign.'
                  : 'No recommendations matching the selected status and category.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {recommendations.map((rec) => {
                const confColor =
                  rec.confidence === 'high'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : rec.confidence === 'medium'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200';

                return (
                  <div
                    key={rec.id}
                    className="bg-white p-5 rounded-2xl border border-[#0d1c15]/10 shadow-xs hover:border-[#0d9467]/30 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0d1c15]/5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#0d1c15]/5 text-[#0d1c15]">
                          {rec.category?.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${confColor}`}>
                          {rec.confidence} Confidence
                        </span>
                        {rec.status === 'applied' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00e599]/15 text-[#0d9467] border border-[#00e599]/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Applied
                          </span>
                        )}
                        {rec.status === 'reviewed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Reviewed
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#0d1c15]/50">
                        {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : ''}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-[#0d1c15] mb-1">{rec.title}</h3>
                      <p className="text-xs text-[#0d1c15]/70 leading-relaxed">{rec.explanation}</p>
                    </div>

                    {/* Proposed action & diff preview */}
                    <div className="bg-[#f7f5f0] p-3.5 rounded-xl text-xs space-y-2 border border-[#0d1c15]/5">
                      <div className="font-semibold text-[#0d1c15] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#0d9467]" />
                        Suggested Action: {rec.suggested_action}
                      </div>

                      {rec.original_value && rec.proposed_value && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#0d1c15]/10">
                          <div className="bg-white p-2.5 rounded-lg border border-[#0d1c15]/5">
                            <span className="text-[10px] font-bold text-[#0d1c15]/50 uppercase tracking-wider block mb-1">
                              Current Value
                            </span>
                            <div className="text-xs text-[#0d1c15]/80 font-mono line-clamp-2">
                              {rec.original_value}
                            </div>
                          </div>
                          <div className="bg-[#00e599]/10 p-2.5 rounded-lg border border-[#00e599]/30">
                            <span className="text-[10px] font-bold text-[#0d9467] uppercase tracking-wider block mb-1">
                              Proposed Improvement
                            </span>
                            <div className="text-xs text-[#0d1c15] font-mono font-medium line-clamp-2">
                              {rec.proposed_value}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-[#0d1c15]/60 pt-1">
                        <div>
                          <span className="font-semibold text-[#0d1c15]">Expected Effect:</span> {rec.expected_impact}
                        </div>
                        <div className="italic text-[#0d1c15]/50">
                          {rec.evidence_limitations}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {/* Review Button */}
                      {rec.status === 'new' && (
                        <button
                          onClick={() => handleReview(rec.id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#0d1c15]/15 rounded-lg text-[#0d1c15] hover:bg-[#0d1c15]/5 transition-colors"
                        >
                          Mark as Reviewed
                        </button>
                      )}

                      {/* Generate Variants Button */}
                      <button
                        onClick={() => handleOpenVariantModal(rec)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-[#0d1c15]/15 rounded-lg text-[#0d1c15] hover:bg-[#0d1c15]/5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#0d9467]" />
                        Generate Variants
                      </button>

                      {/* Dismiss Button */}
                      {rec.status !== 'dismissed' && rec.status !== 'applied' && (
                        <button
                          onClick={() => handleDismiss(rec.id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#0d1c15]/15 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          Dismiss
                        </button>
                      )}

                      {/* Apply Button */}
                      {rec.status !== 'applied' && (
                        <button
                          onClick={() => setDiffModalRec(rec)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#0d1c15] text-white rounded-lg hover:bg-[#0d1c15]/90 transition-colors shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 text-[#00e599]" />
                          Review & Apply Change
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CAMPAIGN HEALTH DIAGNOSTICS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-2xl border border-[#0d1c15]/10 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#0d1c15]/10 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0d1c15]">Campaign Health Diagnostic Matrix</h2>
              <p className="text-xs text-[#0d1c15]/60 mt-0.5">
                Evaluates bounce rates, delivery performance, reply intent, and sequence health.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f7f5f0]/60 border-b border-[#0d1c15]/10 text-[#0d1c15]/60 font-medium">
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-3">Health Status</th>
                  <th className="py-3 px-3 text-right">Sent</th>
                  <th className="py-3 px-3 text-right">Delivered %</th>
                  <th className="py-3 px-3 text-right">Bounce %</th>
                  <th className="py-3 px-3 text-right">Reply %</th>
                  <th className="py-3 px-3 text-right text-[#0d9467]">Positive Reply %</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0d1c15]/5">
                {campaignsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#0d1c15]/40 text-xs">
                      No campaigns found.
                    </td>
                  </tr>
                ) : (
                  campaignsList.map((camp) => {
                    // Compute lightweight health tag
                    const sent = camp.sent || 0;
                    const bounceRate = camp.bounce_rate || 0;
                    const replyRate = camp.reply_rate || 0;
                    const posRate = camp.positive_reply_rate || 0;

                    let healthBadge = { label: 'Healthy', color: 'bg-blue-50 text-blue-700 border-blue-200' };
                    if (sent < 15) {
                      healthBadge = { label: 'Insufficient Data', color: 'bg-gray-100 text-gray-700 border-gray-200' };
                    } else if (bounceRate >= 5.0) {
                      healthBadge = { label: 'Critical', color: 'bg-rose-50 text-rose-700 border-rose-200' };
                    } else if (bounceRate >= 3.0 || replyRate < 1.5) {
                      healthBadge = { label: 'Needs Attention', color: 'bg-amber-50 text-amber-700 border-amber-200' };
                    } else if (posRate >= 2.0 && replyRate >= 4.0) {
                      healthBadge = { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                    }

                    return (
                      <tr key={camp.id} className="hover:bg-[#00e599]/5 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#0d1c15]">
                          {camp.name}
                          <div className="text-[11px] text-[#0d1c15]/40 font-normal">
                            Limit: {camp.daily_limit || 35}/day • Status: {camp.status}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${healthBadge.color}`}>
                            {healthBadge.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono">{sent.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-right font-mono">{camp.delivery_rate || 0}%</td>
                        <td className="py-3.5 px-3 text-right font-mono">
                          <span className={bounceRate > 3 ? 'text-rose-600 font-semibold' : ''}>
                            {bounceRate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono">{replyRate}%</td>
                        <td className="py-3.5 px-3 text-right font-mono font-semibold text-[#0d9467]">{posRate}%</td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAnalyzeCampaign(camp.id)}
                              disabled={isAnalyzingCampId === camp.id}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#0d1c15] text-white hover:bg-[#0d1c15]/90 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                            >
                              <Sparkles className={`w-3 h-3 text-[#00e599] ${isAnalyzingCampId === camp.id ? 'animate-spin' : ''}`} />
                              {isAnalyzingCampId === camp.id ? 'Auditing...' : 'Analyze with AI'}
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONTROLLED A/B EXPERIMENTS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'experiments' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[#0d1c15]/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0d1c15] flex items-center gap-2">
                <Split className="w-4 h-4 text-[#0d9467]" />
                Controlled Campaign Experiments
              </h2>
              <p className="text-xs text-[#0d1c15]/60 mt-0.5">
                Deterministic recipient traffic split with two-proportion Z-test statistical significance calculation.
              </p>
            </div>

            <button
              onClick={() => setShowCreateExpModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#0d1c15] text-white rounded-lg hover:bg-[#0d1c15]/90 shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-[#00e599]" />
              New Experiment
            </button>
          </div>

          {/* Experiments List */}
          {experiments.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#0d1c15]/10 text-center text-xs text-[#0d1c15]/50">
              <Split className="w-8 h-8 text-[#0d9467] mx-auto mb-3 opacity-60" />
              <div className="font-semibold text-sm text-[#0d1c15] mb-1">No experiments created yet</div>
              <p>Create an A/B test between two subject lines or email copies to measure positive response impact.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {experiments.map((item) => {
                const exp = item.experiment || item;
                const varA = item.variant_a || {};
                const varB = item.variant_b || {};
                const stats = item.statistics || {};

                return (
                  <div
                    key={exp.id}
                    className="bg-white p-5 rounded-2xl border border-[#0d1c15]/10 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0d1c15]/5 pb-3">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-[#0d1c15]">{exp.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            exp.status === 'active'
                              ? 'bg-[#00e599]/15 text-[#0d9467] border border-[#00e599]/30'
                              : exp.status === 'completed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {exp.status?.toUpperCase()}
                        </span>
                        <span className="text-xs text-[#0d1c15]/50 font-mono">
                          Metric: {exp.primary_metric?.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {exp.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleTogglePauseExp(exp.id, exp.status)}
                              className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#0d1c15]/15 rounded-md hover:bg-[#0d1c15]/5 transition-colors"
                            >
                              Pause
                            </button>
                            <button
                              onClick={() => handleCompleteExp(exp.id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-[#0d1c15] text-white rounded-md hover:bg-[#0d1c15]/90 transition-colors"
                            >
                              Declare Winner & Complete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Comparison Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Variant A (Control) */}
                      <div className="bg-[#f7f5f0] p-4 rounded-xl border border-[#0d1c15]/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#0d1c15]">{varA.name || 'Variant A (Control)'}</span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-[#0d1c15]">
                            {100 - (exp.traffic_allocation || 50)}% Traffic
                          </span>
                        </div>
                        {varA.subject && (
                          <div className="text-xs text-[#0d1c15]/80 font-mono bg-white p-2 rounded border border-[#0d1c15]/5">
                            Subj: {varA.subject}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                          <div className="bg-white p-2 rounded">
                            <span className="text-[10px] text-[#0d1c15]/50 block">Delivered</span>
                            <span className="font-mono font-bold text-xs text-[#0d1c15]">{varA.delivered_count || 0}</span>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <span className="text-[10px] text-[#0d1c15]/50 block">Replies</span>
                            <span className="font-mono font-bold text-xs text-[#0d1c15]">{varA.reply_count || 0}</span>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <span className="text-[10px] text-[#0d9467] font-semibold block">Pos Reply %</span>
                            <span className="font-mono font-bold text-xs text-[#0d9467]">
                              {stats.rate_a !== undefined ? `${stats.rate_a}%` : '0.0%'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Variant B (Challenger) */}
                      <div className="bg-[#00e599]/10 p-4 rounded-xl border border-[#00e599]/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#0d1c15]">{varB.name || 'Variant B (Challenger)'}</span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white text-[#0d9467]">
                            {exp.traffic_allocation || 50}% Traffic
                          </span>
                        </div>
                        {varB.subject && (
                          <div className="text-xs text-[#0d1c15]/80 font-mono bg-white p-2 rounded border border-[#00e599]/20">
                            Subj: {varB.subject}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                          <div className="bg-white p-2 rounded">
                            <span className="text-[10px] text-[#0d1c15]/50 block">Delivered</span>
                            <span className="font-mono font-bold text-xs text-[#0d1c15]">{varB.delivered_count || 0}</span>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <span className="text-[10px] text-[#0d1c15]/50 block">Replies</span>
                            <span className="font-mono font-bold text-xs text-[#0d1c15]">{varB.reply_count || 0}</span>
                          </div>
                          <div className="bg-white p-2 rounded">
                            <span className="text-[10px] text-[#0d9467] font-semibold block">Pos Reply %</span>
                            <span className="font-mono font-bold text-xs text-[#0d9467]">
                              {stats.rate_b !== undefined ? `${stats.rate_b}%` : '0.0%'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistical Confidence & Significance Statement */}
                    <div className="bg-[#f7f5f0] p-3 rounded-lg text-xs flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#0d1c15]">Significance:</span>
                        <span className={`font-semibold ${stats.is_significant ? 'text-[#0d9467]' : 'text-[#0d1c15]/70'}`}>
                          {stats.confidence_level || 'Insufficient Data'}
                        </span>
                        {stats.z_score !== undefined && stats.z_score > 0 && (
                          <span className="font-mono text-[#0d1c15]/50 text-[11px]">(Z = {stats.z_score})</span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#0d1c15]/60 italic">
                        {stats.message || 'Minimum 30 delivered messages per variant required.'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REVIEW & APPLY PROPOSED CHANGE (AUDIT WORKFLOW)                 */}
      {/* ========================================================================= */}
      {diffModalRec && (
        <div className="fixed inset-0 bg-[#0d1c15]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#0d1c15]/15 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-5 border-b border-[#0d1c15]/10 flex items-center justify-between bg-[#f7f5f0]/40">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-[#0d9467]" />
                <h3 className="text-base font-bold text-[#0d1c15]">Confirm Optimization Change</h3>
              </div>
              <button
                onClick={() => setDiffModalRec(null)}
                className="p-1 text-[#0d1c15]/40 hover:text-[#0d1c15] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="font-bold text-[#0d1c15] text-sm block mb-1">{diffModalRec.title}</span>
                <p className="text-[#0d1c15]/70 leading-relaxed">{diffModalRec.explanation}</p>
              </div>

              {/* Side-by-side or stacked diff */}
              <div className="space-y-3 pt-2">
                <div className="bg-[#f7f5f0] p-3 rounded-xl border border-[#0d1c15]/5">
                  <div className="font-bold text-[10px] text-[#0d1c15]/50 uppercase tracking-wider mb-1">
                    Current Sequence Value
                  </div>
                  <div className="font-mono text-[#0d1c15]/80 whitespace-pre-wrap">
                    {diffModalRec.original_value}
                  </div>
                </div>

                <div className="bg-[#00e599]/15 p-3 rounded-xl border border-[#00e599]/30">
                  <div className="font-bold text-[10px] text-[#0d9467] uppercase tracking-wider mb-1">
                    Proposed Change to Apply
                  </div>
                  <div className="font-mono text-[#0d1c15] font-semibold whitespace-pre-wrap">
                    {diffModalRec.proposed_value}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
                <span className="font-semibold">Compliance & Audit Safety:</span> Applying this change will update the sequence step or campaign configuration and write an immutable audit trail entry. Active queue worker jobs and suppression lists remain protected.
              </div>
            </div>

            <div className="p-4 border-t border-[#0d1c15]/10 bg-[#f7f5f0]/40 flex items-center justify-end gap-2">
              <button
                onClick={() => setDiffModalRec(null)}
                className="px-4 py-2 text-xs font-semibold bg-white border border-[#0d1c15]/15 rounded-lg text-[#0d1c15] hover:bg-[#0d1c15]/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApply(diffModalRec.id)}
                className="px-4 py-2 text-xs font-semibold bg-[#0d1c15] text-white rounded-lg hover:bg-[#0d1c15]/90 transition-colors shadow-xs"
              >
                Confirm & Apply Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: AI VARIANT GENERATOR (DRAFTS ONLY)                               */}
      {/* ========================================================================= */}
      {variantModalRec && (
        <div className="fixed inset-0 bg-[#0d1c15]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#0d1c15]/15 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#0d1c15]/10 flex items-center justify-between bg-[#f7f5f0]/40">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#0d9467]" />
                <h3 className="text-base font-bold text-[#0d1c15]">Generate AI Message Variants</h3>
              </div>
              <button
                onClick={() => setVariantModalRec(null)}
                className="p-1 text-[#0d1c15]/40 hover:text-[#0d1c15] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div>
                <span className="font-semibold text-[#0d1c15] block mb-1">
                  Context: {variantModalRec.title}
                </span>
                <p className="text-[#0d1c15]/60 text-[11px]">{variantModalRec.suggested_action}</p>
              </div>

              <div>
                <label className="font-semibold text-[#0d1c15] block mb-1">
                  Tone or Specific Angle (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Focus on peer problem angle, keep under 4 words..."
                  value={variantPrompt}
                  onChange={(e) => setVariantPrompt(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f7f5f0] border border-transparent focus:border-[#0d9467]/30 rounded-lg text-[#0d1c15] focus:outline-hidden"
                />
              </div>

              <button
                onClick={handleRunVariantGeneration}
                disabled={isGeneratingVariants}
                className="w-full py-2.5 bg-[#0d1c15] text-white text-xs font-semibold rounded-lg hover:bg-[#0d1c15]/90 transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-[#00e599] ${isGeneratingVariants ? 'animate-spin' : ''}`} />
                {isGeneratingVariants ? 'Generating High-Converting Drafts...' : 'Generate AI Variations'}
              </button>

              {/* Generated Variants List */}
              {generatedVariants.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-[#0d1c15]/10">
                  <span className="font-bold text-[#0d1c15] block">Draft Variations:</span>
                  {generatedVariants.map((v, i) => (
                    <div key={i} className="bg-[#f7f5f0] p-3.5 rounded-xl border border-[#0d1c15]/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#0d1c15]">{v.title}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(v.content);
                            alert('Copied to clipboard!');
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0d9467] hover:underline"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <div className="font-mono text-xs bg-white p-2.5 rounded-lg border border-[#0d1c15]/5 whitespace-pre-wrap">
                        {v.content}
                      </div>
                      <div className="text-[11px] text-[#0d1c15]/60 italic">
                        Why this works: {v.rationale}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#0d1c15]/10 bg-[#f7f5f0]/40 flex justify-end">
              <button
                onClick={() => setVariantModalRec(null)}
                className="px-4 py-2 text-xs font-semibold bg-white border border-[#0d1c15]/15 rounded-lg text-[#0d1c15] hover:bg-[#0d1c15]/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE NEW A/B EXPERIMENT                                       */}
      {/* ========================================================================= */}
      {showCreateExpModal && (
        <div className="fixed inset-0 bg-[#0d1c15]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#0d1c15]/15 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-[#0d1c15]/10 flex items-center justify-between bg-[#f7f5f0]/40">
              <div className="flex items-center gap-2.5">
                <Split className="w-5 h-5 text-[#0d9467]" />
                <h3 className="text-base font-bold text-[#0d1c15]">Create A/B Outreach Experiment</h3>
              </div>
              <button
                onClick={() => setShowCreateExpModal(false)}
                className="p-1 text-[#0d1c15]/40 hover:text-[#0d1c15] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExperiment} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div>
                <label className="font-semibold text-[#0d1c15] block mb-1">Experiment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question Subject vs Value Focus"
                  value={newExp.name}
                  onChange={(e) => setNewExp({ ...newExp, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#f7f5f0] border border-transparent focus:border-[#0d9467]/30 rounded-lg text-[#0d1c15] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#0d1c15] block mb-1">Target Campaign</label>
                  <select
                    value={newExp.campaignId}
                    onChange={(e) => setNewExp({ ...newExp, campaignId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#f7f5f0] border border-transparent focus:border-[#0d9467]/30 rounded-lg text-[#0d1c15] focus:outline-hidden font-medium"
                  >
                    {campaignsList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#0d1c15] block mb-1">Primary Success Metric</label>
                  <select
                    value={newExp.primaryMetric}
                    onChange={(e) => setNewExp({ ...newExp, primaryMetric: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#f7f5f0] border border-transparent focus:border-[#0d9467]/30 rounded-lg text-[#0d1c15] focus:outline-hidden font-medium"
                  >
                    <option value="positive_reply_rate">Positive Reply Rate (Recommended)</option>
                    <option value="reply_rate">Total Reply Rate</option>
                  </select>
                </div>
              </div>

              {/* Traffic Allocation Slider */}
              <div>
                <div className="flex items-center justify-between font-semibold text-[#0d1c15] mb-1">
                  <span>Traffic Split: Variant A ({100 - newExp.trafficAllocation}%) / Variant B ({newExp.trafficAllocation}%)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={newExp.trafficAllocation}
                  onChange={(e) => setNewExp({ ...newExp, trafficAllocation: Number(e.target.value) })}
                  className="w-full accent-[#0d9467]"
                />
              </div>

              {/* Variant A (Control) */}
              <div className="bg-[#f7f5f0] p-3.5 rounded-xl border border-[#0d1c15]/5 space-y-2">
                <span className="font-bold text-[#0d1c15] block">Variant A (Control)</span>
                <input
                  type="text"
                  placeholder="Subject Line (Variant A)"
                  value={newExp.variantA.subject}
                  onChange={(e) =>
                    setNewExp({
                      ...newExp,
                      variantA: { ...newExp.variantA, subject: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#0d1c15]/10 rounded-lg text-[#0d1c15]"
                />
              </div>

              {/* Variant B (Challenger) */}
              <div className="bg-[#00e599]/10 p-3.5 rounded-xl border border-[#00e599]/30 space-y-2">
                <span className="font-bold text-[#0d9467] block">Variant B (Challenger)</span>
                <input
                  type="text"
                  placeholder="Subject Line (Variant B)"
                  value={newExp.variantB.subject}
                  onChange={(e) =>
                    setNewExp({
                      ...newExp,
                      variantB: { ...newExp.variantB, subject: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#00e599]/30 rounded-lg text-[#0d1c15]"
                />
              </div>

              <div className="p-4 border-t border-[#0d1c15]/10 flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateExpModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-white border border-[#0d1c15]/15 rounded-lg text-[#0d1c15]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#0d1c15] text-white rounded-lg hover:bg-[#0d1c15]/90"
                >
                  Start Live Experiment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
