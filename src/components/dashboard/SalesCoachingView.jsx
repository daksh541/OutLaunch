import React, { useState, useEffect } from 'react';
import {
  Award,
  TrendingUp,
  Target,
  Sparkles,
  BookOpen,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Briefcase,
  Play,
  RotateCcw,
  Check,
  X,
  Plus,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  BarChart2,
  Lock,
} from 'lucide-react';
import {
  fetchRepScorecard,
  fetchPerformanceTrends,
  recalculateRepScorecard,
  fetchCoachingRecommendations,
  generateCoachingRecommendations,
  updateCoachingRecommendationStatus,
  fetchCoachingPlans,
  createCoachingPlan,
  completeCoachingPlanAction,
  createTaskFromCoachingAction,
  fetchCoachingExercises,
  fetchTeamCoachingOverview,
  fetchTeamRepDrilldown,
} from '../../lib/outreachService';

export default function SalesCoachingView({ onNavigateToCalls, onNavigateToCrm }) {
  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard' | 'recommendations' | 'plans' | 'exercises' | 'team'
  const [periodDays, setPeriodDays] = useState(30);
  const [scorecard, setScorecard] = useState(null);
  const [trends, setTrends] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [teamOverview, setTeamOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal & action state
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [newPlanSkill, setNewPlanSkill] = useState('discovery');
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanTargetScore, setNewPlanTargetScore] = useState(90);
  const [newPlanTargetDate, setNewPlanTargetDate] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState('ex-discovery-01');
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [isManagerView, setIsManagerView] = useState(false);
  const [selectedRepDrilldown, setSelectedRepDrilldown] = useState(null);

  useEffect(() => {
    loadData();
  }, [periodDays]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [sc, tr, recs, pl, ex] = await Promise.all([
        fetchRepScorecard({ days: periodDays }).catch(() => null),
        fetchPerformanceTrends({ days: periodDays }).catch(() => null),
        fetchCoachingRecommendations({ status: 'all' }).catch(() => []),
        fetchCoachingPlans({ status: 'all' }).catch(() => []),
        fetchCoachingExercises().catch(() => []),
      ]);

      setScorecard(sc);
      setTrends(tr);
      setRecommendations(recs);
      setPlans(pl);
      setExercises(ex);

      // Attempt to load team overview if user has manager permissions
      try {
        const team = await fetchTeamCoachingOverview({ days: periodDays });
        setTeamOverview(team);
        setIsManagerView(true);
      } catch {
        setIsManagerView(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load sales coaching data');
    } finally {
      setLoading(false);
    }
  }

  async function handleRecalculate() {
    setLoading(true);
    try {
      const updated = await recalculateRepScorecard({ days: periodDays });
      setScorecard(updated);
      const updatedTrends = await fetchPerformanceTrends({ days: periodDays });
      setTrends(updatedTrends);
    } catch (err) {
      alert(`Recalculation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateRecommendations() {
    try {
      const res = await generateCoachingRecommendations({ days: periodDays });
      setRecommendations(res.recommendations || []);
    } catch (err) {
      alert(`Could not generate recommendations: ${err.message}`);
    }
  }

  async function handleUpdateRecStatus(recId, status, reason = '') {
    try {
      await updateCoachingRecommendationStatus(recId, { status, reason });
      setRecommendations(prev =>
        prev.map(r => (r.id === recId ? { ...r, status, dismissed_reason: reason } : r))
      );
    } catch (err) {
      alert(`Could not update recommendation: ${err.message}`);
    }
  }

  async function handleCreatePlanFromRec(rec) {
    setNewPlanSkill(rec.skill_key || 'discovery');
    setNewPlanTitle(`Improve ${rec.title}`);
    setNewPlanTargetScore(90);
    setShowCreatePlanModal(true);
  }

  async function handleSavePlan(e) {
    e.preventDefault();
    try {
      const res = await createCoachingPlan({
        title: newPlanTitle || `Skill Development Plan - ${newPlanSkill}`,
        targetSkill: newPlanSkill,
        baselineScore: scorecard?.skill_breakdown?.[newPlanSkill] || 75,
        targetScore: Number(newPlanTargetScore) || 90,
        targetDate: newPlanTargetDate || null,
      });

      setShowCreatePlanModal(false);
      setNewPlanTitle('');
      setPlans(prev => [res.plan, ...prev]);
      setActiveTab('plans');
    } catch (err) {
      alert(`Failed to create coaching plan: ${err.message}`);
    }
  }

  async function handleCompleteAction(actionId) {
    try {
      const updatedAction = await completeCoachingPlanAction(actionId);
      setPlans(prev =>
        prev.map(plan => ({
          ...plan,
          actions: plan.actions?.map(a => (a.id === actionId ? updatedAction : a)),
        }))
      );
    } catch (err) {
      alert(`Could not complete action step: ${err.message}`);
    }
  }

  async function handleCreateTaskFromAction(actionId) {
    try {
      const res = await createTaskFromCoachingAction(actionId);
      alert('Coaching action converted into CRM task successfully!');
      setPlans(prev =>
        prev.map(plan => ({
          ...plan,
          actions: plan.actions?.map(a =>
            a.id === actionId ? { ...a, crm_task_id: res.taskId } : a
          ),
        }))
      );
    } catch (err) {
      alert(`Could not create task: ${err.message}`);
    }
  }

  const selectedExercise = exercises.find(ex => ex.id === selectedExerciseId) || exercises[0];

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-[#0b1410] border border-[#1b3527] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1b3527]/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-[#0d9467]/20 text-[#00e599] border border-[#0d9467]/30">
                <Award className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">AI Sales Coaching & Skill Analytics</h1>
              <span className="text-xs bg-[#0d9467]/20 text-[#00e599] px-2.5 py-0.5 rounded-full font-medium border border-[#0d9467]/40">
                Multi-Call Intelligence
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              Transform sales call insights into measurable skill progress, recurring pattern detection, and personalized development plans.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center bg-[#080d0a] border border-[#1b3527] rounded-lg p-0.5 text-xs">
              {[
                { label: 'Last 7 Days', value: 7 },
                { label: 'Last 30 Days', value: 30 },
                { label: 'Last 90 Days', value: 90 },
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriodDays(p.value)}
                  className={`px-3 py-1.5 rounded font-medium transition-colors ${
                    periodDays === p.value
                      ? 'bg-[#0d9467] text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleRecalculate}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#080d0a] hover:bg-[#12241b] border border-[#1b3527] text-zinc-300 hover:text-white text-xs font-semibold rounded-lg transition-colors"
              title="Recalculate with updated call data"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#00e599]" />
              Recalculate
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-6">
          <div className="bg-[#080d0a] border border-[#1b3527]/60 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Calls Analyzed</div>
            <div className="text-2xl font-bold text-white">{scorecard?.calls_analyzed ?? 0}</div>
            <div className="text-xs text-zinc-500 mt-1">Across past {periodDays} days</div>
          </div>

          <div className="bg-[#080d0a] border border-[#1b3527]/60 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Overall Skill Score</div>
            <div className="text-2xl font-bold text-[#00e599] flex items-baseline gap-2">
              <span>{scorecard?.overall_score ?? 0}</span>
              <span className="text-xs text-zinc-500 font-normal">/ 100</span>
              {trends?.deltas?.overall !== undefined && (
                <span className={`text-xs font-mono font-medium ${
                  trends.deltas.overall >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {trends.deltas.overall >= 0 ? `+${trends.deltas.overall}` : trends.deltas.overall} pts
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Weighted skill performance</div>
          </div>

          <div className="bg-[#080d0a] border border-[#1b3527]/60 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Confidence Rating</div>
            <div className="text-lg font-bold text-white capitalize flex items-center gap-2 mt-0.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                scorecard?.confidence_level === 'high' ? 'bg-emerald-400' : scorecard?.confidence_level === 'medium' ? 'bg-amber-400' : 'bg-rose-400'
              }`} />
              <span>{scorecard?.confidence_level || 'Low'} Confidence</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {scorecard?.is_reliable ? 'Reliable statistical sample' : 'Sample < 3 calls'}
            </div>
          </div>

          <div className="bg-[#080d0a] border border-[#1b3527]/60 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Active Coaching Plans</div>
            <div className="text-2xl font-bold text-white">
              {plans.filter(p => p.status === 'active').length}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Milestones in progress</div>
          </div>

          <div className="bg-[#080d0a] border border-[#1b3527]/60 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Pending Recommendations</div>
            <div className="text-2xl font-bold text-amber-400">
              {recommendations.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-xs text-zinc-500 mt-1">AI suggestions to review</div>
          </div>
        </div>
      </div>

      {/* Low Sample Warning Banner */}
      {scorecard && !scorecard.is_reliable && (
        <div className="p-4 bg-amber-950/40 border border-amber-800/50 rounded-xl flex items-center justify-between gap-4 text-amber-200 text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="text-white block font-semibold mb-0.5">Sample Size Notice:</strong>
              {scorecard.warning || 'Not enough call data to establish a reliable performance trend. Minimum 3 analyzed calls required.'}
            </div>
          </div>
          {onNavigateToCalls && (
            <button
              onClick={onNavigateToCalls}
              className="px-3 py-1.5 bg-amber-900/60 hover:bg-amber-800 text-white rounded text-xs font-semibold shrink-0 transition-colors"
            >
              Analyze More Calls
            </button>
          )}
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#1b3527]">
        {[
          { id: 'scorecard', label: 'Rep Scorecard & Skills', icon: Award },
          { id: 'recommendations', label: 'Coaching Recommendations', icon: Sparkles, badge: `${recommendations.filter(r => r.status === 'pending').length} New` },
          { id: 'plans', label: 'Coaching Plans', icon: Target, badge: `${plans.length}` },
          { id: 'exercises', label: 'Practice Exercises', icon: BookOpen },
          ...(isManagerView ? [{ id: 'team', label: 'Team Dashboard', icon: Users, badge: 'Manager' }] : []),
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                isActive
                  ? 'border-[#00e599] text-[#00e599] bg-[#0d9467]/10'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] bg-zinc-800 px-1.5 py-0.2 rounded text-zinc-300">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Rep Scorecard & Skill Breakdown */}
      {activeTab === 'scorecard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Overall Score & Component Weights */}
          <div className="lg:col-span-5 bg-[#0b1410] border border-[#1b3527] rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1b3527]">
              <div>
                <h3 className="text-sm font-semibold text-white">Overall Skill Performance</h3>
                <p className="text-xs text-zinc-400">Explainable composite score based on multi-call dataset.</p>
              </div>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 font-mono px-2 py-0.5 rounded">
                {scorecard?.calculation_version || 'v1.0.0'}
              </span>
            </div>

            {/* Score Ring Display */}
            <div className="text-center py-4 bg-[#080d0a] border border-[#1b3527]/60 rounded-xl space-y-2">
              <div className="text-4xl font-black text-[#00e599] tracking-tight">
                {scorecard?.overall_score ?? 0}
                <span className="text-lg text-zinc-500 font-normal"> / 100</span>
              </div>
              <div className="text-xs text-zinc-400 font-medium">
                {scorecard?.overall_score >= 85 ? 'Top Performer (Strong execution across all skills)' : scorecard?.overall_score >= 70 ? 'Proficient (Minor coaching opportunities)' : 'Developing (Needs structured coaching)'}
              </div>
            </div>

            {/* Component Contributions Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Component Weight Contributions</h4>
              <div className="space-y-2">
                {scorecard?.component_contributions && Object.entries(scorecard.component_contributions).map(([skill, comp]) => (
                  <div key={skill} className="p-2.5 bg-[#080d0a] border border-[#1b3527]/60 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="capitalize font-medium text-white">{skill.replace('_', ' ')}</span>
                      <span className="text-[10px] text-zinc-500 ml-2 font-mono">({Math.round(comp.weight * 100)}% weight)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 font-mono">{comp.score}/100</span>
                      <span className="text-[#00e599] font-mono font-bold">+{comp.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Individual Skill Progress & Supporting Calls */}
          <div className="lg:col-span-7 bg-[#0b1410] border border-[#1b3527] rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1b3527]">
              <div>
                <h3 className="text-sm font-semibold text-white">Individual Skill Metrics & Deltas</h3>
                <p className="text-xs text-zinc-400">Comparing current period with previous {periodDays} days.</p>
              </div>
            </div>

            {/* Skill Bars */}
            <div className="space-y-4">
              {[
                { key: 'discovery', label: 'Discovery Depth', desc: 'Root cause uncovering & pain quantification' },
                { key: 'objection_handling', label: 'Objection Handling', desc: 'Resolving security, CRM & pricing concerns' },
                { key: 'value_proposition', label: 'Value Proposition Clarity', desc: 'Differentiating vs static sequencers' },
                { key: 'active_listening', label: 'Active Listening', desc: 'Optimal talk-to-listen ratio & customer engagement' },
                { key: 'qualification', label: 'Requirements Qualification', desc: 'Verifying mandatory technical needs' },
                { key: 'next_step_clarity', label: 'Next-Step Clarity', desc: 'Securing firm calendar commitments' },
              ].map(skill => {
                const score = scorecard?.skill_breakdown?.[skill.key] ?? 75;
                const delta = trends?.deltas?.[skill.key] ?? 0;
                return (
                  <div key={skill.key} className="p-3 bg-[#080d0a] border border-[#1b3527]/60 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-white">{skill.label}</div>
                        <div className="text-[11px] text-zinc-500">{skill.desc}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#00e599] font-mono">{score}/100</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          delta >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}>
                          {delta >= 0 ? `+${delta}` : delta} pts
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#00e599] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(10, score))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Supporting Calls Evidence Box */}
            <div className="p-4 bg-[#080d0a] border border-[#1b3527] rounded-xl flex items-center justify-between text-xs text-zinc-300">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[#00e599]" />
                <span>
                  Calculated from <strong>{scorecard?.calls_analyzed || 0} calls</strong>. All call recordings and transcripts available in Call Intelligence.
                </span>
              </div>
              {onNavigateToCalls && (
                <button
                  onClick={onNavigateToCalls}
                  className="px-3 py-1 bg-[#0d9467] hover:bg-[#0b7c56] text-white rounded text-xs font-semibold shrink-0 transition-colors"
                >
                  View Recordings
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI Coaching Recommendations */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b3527]">
            <p className="text-xs text-zinc-400">
              Personalized recommendations generated across multiple sales conversations with direct transcript evidence quotes.
            </p>
            <button
              onClick={handleGenerateRecommendations}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d9467] hover:bg-[#0b7c56] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Fresh Insights
            </button>
          </div>

          <div className="space-y-4">
            {recommendations.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                No coaching recommendations currently pending. Click "Generate Fresh Insights" to analyze recent calls.
              </div>
            ) : (
              recommendations.map(rec => (
                <div
                  key={rec.id}
                  className="bg-[#0b1410] border border-[#1b3527] rounded-xl p-5 space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-[#0d9467]/20 text-[#00e599] border border-[#0d9467]/40 px-2 py-0.5 rounded capitalize">
                          {rec.skill_key.replace('_', ' ')}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                          rec.priority === 'high' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                        }`}>
                          {rec.priority} Priority
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {Math.round((rec.confidence_score || 0.9) * 100)}% confidence
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{rec.title}</h3>
                      <p className="text-xs text-zinc-300 leading-relaxed">{rec.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {rec.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleUpdateRecStatus(rec.id, 'accepted')}
                            className="px-3 py-1 bg-[#0d9467] hover:bg-[#0b7c56] text-white text-xs font-semibold rounded transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleCreatePlanFromRec(rec)}
                            className="px-3 py-1 bg-[#080d0a] hover:bg-[#12241b] border border-[#1b3527] text-zinc-200 text-xs font-semibold rounded transition-colors"
                          >
                            Create Plan
                          </button>
                          <button
                            onClick={() => handleUpdateRecStatus(rec.id, 'dismissed', 'Not relevant right now')}
                            className="p-1 text-zinc-500 hover:text-rose-400"
                            title="Dismiss"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded capitalize font-medium">
                          {rec.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pattern & Action Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-[#080d0a] border border-[#1b3527]/60 rounded-lg space-y-1">
                      <div className="text-[11px] font-semibold text-amber-400">Observed Pattern:</div>
                      <p className="text-xs text-zinc-300">{rec.observed_pattern}</p>
                      <div className="text-[10px] text-zinc-500 pt-1">Why it matters: {rec.why_it_matters}</div>
                    </div>

                    <div className="p-3 bg-[#080d0a] border border-[#1b3527]/60 rounded-lg space-y-1">
                      <div className="text-[11px] font-semibold text-[#00e599]">Suggested Behavior & Example:</div>
                      <p className="text-xs text-zinc-300">{rec.suggested_behavior}</p>
                      {rec.example_improvement && (
                        <p className="text-[11px] text-zinc-400 italic font-mono pt-1">
                          {rec.example_improvement}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Transcript Evidence Quotes */}
                  {rec.evidence_segments && rec.evidence_segments.length > 0 && (
                    <div className="p-3 bg-[#080d0a] border border-[#1b3527]/60 rounded-lg space-y-2">
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#00e599]" />
                        Verbatim Transcript Evidence ({rec.evidence_segments.length} calls)
                      </div>
                      <div className="space-y-1.5">
                        {rec.evidence_segments.map((ev, idx) => (
                          <div key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                            <span className="text-[10px] bg-zinc-800 font-mono px-1.5 py-0.2 rounded text-zinc-400 shrink-0 mt-0.5">
                              {ev.callTitle || 'Discovery Call'} [{Math.floor(ev.startTime / 60)}:{String(Math.floor(ev.startTime % 60)).padStart(2, '0')}]
                            </span>
                            <span className="italic">"{ev.quote}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Coaching Plans & Action Milestones */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b3527]">
            <p className="text-xs text-zinc-400">
              Structured skill development roadmaps with actionable milestones, practice exercises, and CRM task integration.
            </p>
            <button
              onClick={() => {
                setNewPlanSkill('discovery');
                setNewPlanTitle('Master Root Cause Discovery');
                setShowCreatePlanModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d9467] hover:bg-[#0b7c56] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Coaching Plan
            </button>
          </div>

          <div className="space-y-6">
            {plans.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                No active coaching plans. Click "Create Coaching Plan" to set a skill target.
              </div>
            ) : (
              plans.map(plan => (
                <div
                  key={plan.id}
                  className="bg-[#0b1410] border border-[#1b3527] rounded-xl p-5 space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#1b3527]/60">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono bg-[#0d9467]/20 text-[#00e599] border border-[#0d9467]/40 px-2 py-0.5 rounded capitalize">
                          {plan.target_skill.replace('_', ' ')}
                        </span>
                        <span className="text-xs bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded capitalize font-medium">
                          {plan.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{plan.title}</h3>
                      <p className="text-xs text-zinc-400">{plan.description}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-zinc-400">Target Score</div>
                      <div className="text-lg font-black text-[#00e599]">
                        {plan.target_score} <span className="text-xs text-zinc-500 font-normal">/ 100</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">Target Date: {plan.target_date}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Action Steps Completion</span>
                      <span className="font-mono text-white font-medium">{plan.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#00e599] h-full rounded-full transition-all duration-500"
                        style={{ width: `${plan.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Steps Checklist */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Milestones & Action Steps</h4>
                    <div className="space-y-2">
                      {plan.actions?.map(action => {
                        const isCompleted = action.status === 'completed';
                        const hasCrmTask = Boolean(action.crm_task_id);
                        return (
                          <div
                            key={action.id}
                            className={`p-3 rounded-lg border flex items-center justify-between gap-4 transition-colors ${
                              isCompleted
                                ? 'bg-[#080d0a] border-emerald-900/40 opacity-70'
                                : 'bg-[#080d0a] border-[#1b3527]/60'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                <span className={`text-xs font-semibold ${isCompleted ? 'line-through text-zinc-400' : 'text-white'}`}>
                                  {action.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 pl-4">{action.description}</p>
                              {action.due_date && (
                                <div className="text-[10px] text-zinc-500 pl-4">Due: {action.due_date}</div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                disabled={isCompleted}
                                onClick={() => handleCompleteAction(action.id)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                                  isCompleted
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'bg-[#0d9467] hover:bg-[#0b7c56] text-white'
                                }`}
                              >
                                {isCompleted ? 'Completed' : 'Mark Done'}
                              </button>

                              <button
                                disabled={hasCrmTask}
                                onClick={() => handleCreateTaskFromAction(action.id)}
                                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                                  hasCrmTask
                                    ? 'border-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'border-[#1b3527] bg-[#0b1410] text-zinc-300 hover:text-white'
                                }`}
                                title="Convert to CRM Task"
                              >
                                <Zap className="w-3 h-3 text-[#00e599]" />
                                {hasCrmTask ? 'Task Synced' : 'Sync Task'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Practice Exercises */}
      {activeTab === 'exercises' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Exercises List (Left) */}
          <div className="lg:col-span-4 bg-[#0b1410] border border-[#1b3527] rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-white">Skill Practice Scenarios</h3>
            <div className="space-y-2">
              {exercises.map(ex => (
                <div
                  key={ex.id}
                  onClick={() => {
                    setSelectedExerciseId(ex.id);
                    setShowModelAnswer(false);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedExerciseId === ex.id
                      ? 'bg-[#12241b] border-[#0d9467]'
                      : 'bg-[#080d0a] border-[#1b3527]/60 hover:border-[#1b3527]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                    <span className="uppercase font-mono">{ex.category}</span>
                    <span className="text-zinc-500">{ex.difficulty}</span>
                  </div>
                  <div className="text-xs font-semibold text-white">{ex.title}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Exercise Detail Workspace (Right) */}
          <div className="lg:col-span-8 bg-[#0b1410] border border-[#1b3527] rounded-xl p-6 shadow-sm space-y-6">
            {selectedExercise && (
              <>
                <div className="pb-4 border-b border-[#1b3527]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono bg-[#0d9467]/20 text-[#00e599] border border-[#0d9467]/40 px-2 py-0.5 rounded capitalize">
                      {selectedExercise.skillKey.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      Difficulty: {selectedExercise.difficulty}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white">{selectedExercise.title}</h2>
                  <p className="text-xs text-zinc-400 mt-1">{selectedExercise.scenario}</p>
                </div>

                {/* Prospect Statement Prompt */}
                <div className="p-4 bg-[#080d0a] border border-[#1b3527] rounded-xl space-y-2">
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    Prospect Statement:
                  </div>
                  <p className="text-sm text-zinc-100 font-medium italic">
                    "{selectedExercise.prospectStatement}"
                  </p>
                </div>

                {/* Response Framework Guidelines */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Suggested Response Framework</h4>
                  <ul className="space-y-1.5">
                    {selectedExercise.suggestedStructure?.map((step, idx) => (
                      <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-[#00e599] shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Evaluation Criteria */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Scoring Evaluation Criteria</h4>
                  <ul className="space-y-1.5">
                    {selectedExercise.evaluationCriteria?.map((crit, idx) => (
                      <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1.5 shrink-0" />
                        <span>{crit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Model Response Toggle */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowModelAnswer(!showModelAnswer)}
                    className="px-4 py-2 bg-[#080d0a] hover:bg-[#12241b] border border-[#1b3527] text-zinc-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span>{showModelAnswer ? 'Hide Model Response' : 'Reveal Model Response'}</span>
                    {showModelAnswer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showModelAnswer && (
                    <div className="mt-3 p-4 bg-[#0d9467]/10 border border-[#0d9467]/30 rounded-xl space-y-1.5">
                      <div className="text-xs font-semibold text-[#00e599] uppercase tracking-wider">
                        High-Performing Model Response:
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed font-mono">
                        "{selectedExercise.modelResponse}"
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Team Dashboard (Manager View) */}
      {activeTab === 'team' && isManagerView && (
        <div className="space-y-6">
          <div className="bg-[#0b1410] border border-[#1b3527] rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1b3527]">
              <div>
                <h3 className="text-sm font-semibold text-white">Team Coaching & Performance Overview</h3>
                <p className="text-xs text-zinc-400">Aggregated team metrics across representatives with role-based access control.</p>
              </div>
              <span className="text-xs bg-purple-950 text-purple-300 border border-purple-800/40 px-2.5 py-1 rounded-full font-medium">
                Manager Workspace Access
              </span>
            </div>

            {/* Team Skill Averages Grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {teamOverview?.teamSkillAverages && Object.entries(teamOverview.teamSkillAverages).map(([skill, avg]) => (
                <div key={skill} className="p-3 bg-[#080d0a] border border-[#1b3527]/60 rounded-lg text-center space-y-1">
                  <div className="text-[10px] text-zinc-400 uppercase font-mono truncate">{skill.replace('_', ' ')}</div>
                  <div className="text-lg font-bold text-[#00e599]">{avg}</div>
                </div>
              ))}
            </div>

            {/* Rep Performance Roster */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Sales Representative Scorecards</h4>
              <div className="space-y-2">
                {teamOverview?.reps?.map(rep => (
                  <div
                    key={rep.repId}
                    className="p-4 bg-[#080d0a] border border-[#1b3527]/60 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{rep.repId}</span>
                        <span className={`text-[10px] px-2 py-0.2 rounded font-mono ${
                          rep.isReliable ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                        }`}>
                          {rep.confidenceLevel} confidence
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {rep.callsAnalyzed} calls analyzed • {rep.activePlansCount} active coaching plans
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-zinc-500">Overall Score</div>
                        <div className="text-lg font-bold text-[#00e599]">{rep.overallScore}/100</div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedRepDrilldown(rep.repId);
                          fetchTeamRepDrilldown(rep.repId).then(res => {
                            setScorecard(res.scorecard);
                            setActiveTab('scorecard');
                          });
                        }}
                        className="px-3 py-1.5 bg-[#0b1410] hover:bg-[#12241b] border border-[#1b3527] text-zinc-200 text-xs font-medium rounded transition-colors"
                      >
                        Drill Down
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Team Objections & Discovery Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-[#080d0a] border border-[#1b3527]/60 rounded-xl space-y-2">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Common Objections Across Team</h4>
                <div className="space-y-2">
                  {teamOverview?.commonObjectionsAcrossTeam?.map((obj, idx) => (
                    <div key={idx} className="p-2.5 bg-[#0b1410] border border-[#1b3527]/40 rounded-lg text-xs space-y-0.5">
                      <div className="font-medium text-white">{obj.objection}</div>
                      <div className="text-[11px] text-zinc-400 flex justify-between">
                        <span>{obj.frequency}</span>
                        <span className="text-emerald-400">{obj.resolutionRate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-[#080d0a] border border-[#1b3527]/60 rounded-xl space-y-2">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Recurring Discovery Gaps</h4>
                <div className="space-y-2">
                  {teamOverview?.commonDiscoveryGaps?.map((gap, idx) => (
                    <div key={idx} className="p-2.5 bg-[#0b1410] border border-[#1b3527]/40 rounded-lg text-xs space-y-0.5">
                      <div className="font-medium text-white">{gap.gap}</div>
                      <div className="text-[11px] text-zinc-400">{gap.recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Coaching Plan Modal */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1410] border border-[#1b3527] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b3527]">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#00e599]" />
                <h3 className="text-base font-bold text-white">Create Coaching Development Plan</h3>
              </div>
              <button onClick={() => setShowCreatePlanModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Target Skill</label>
                <select
                  value={newPlanSkill}
                  onChange={e => setNewPlanSkill(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#080d0a] border border-[#1b3527] rounded-lg text-white focus:outline-none focus:border-[#0d9467]"
                >
                  <option value="discovery">Discovery Depth</option>
                  <option value="objection_handling">Objection Handling</option>
                  <option value="value_proposition">Value Proposition Clarity</option>
                  <option value="active_listening">Active Listening</option>
                  <option value="qualification">Requirements Qualification</option>
                  <option value="next_step_clarity">Next-Step Clarity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Plan Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Discovery Root Cause Questioning"
                  value={newPlanTitle}
                  onChange={e => setNewPlanTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#080d0a] border border-[#1b3527] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Target Score (0-100)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={newPlanTargetScore}
                    onChange={e => setNewPlanTargetScore(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#080d0a] border border-[#1b3527] rounded-lg text-white focus:outline-none focus:border-[#0d9467]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Target Completion Date</label>
                  <input
                    type="date"
                    value={newPlanTargetDate}
                    onChange={e => setNewPlanTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#080d0a] border border-[#1b3527] rounded-lg text-white focus:outline-none focus:border-[#0d9467]"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#080d0a] border border-[#1b3527] rounded-lg text-[11px] text-zinc-400 space-y-1">
                <div className="font-semibold text-zinc-200">Automatically provisions 4 actionable milestones:</div>
                <div>1. Call review & transcript reflection</div>
                <div>2. Interactive skill practice exercise</div>
                <div>3. Live application in next 3 discovery calls</div>
                <div>4. Manager/coach milestone check-in</div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b3527]">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0d9467] hover:bg-[#0b7c56] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Save Coaching Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
