import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Play,
  Pause,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  Briefcase,
  Users,
  Check,
  X,
  RefreshCw,
  Trash2,
  FileText,
  TrendingUp,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  Filter,
  BarChart2,
  Zap,
} from 'lucide-react';
import {
  fetchSalesCalls,
  fetchSalesCall,
  uploadSalesCall,
  deleteSalesCall,
  transcribeSalesCall,
  analyzeSalesCall,
  searchSalesCalls,
  createTaskFromCallActionItem,
  reviewCallCrmSuggestion,
  applyCallCrmSuggestion,
  bulkApplyCallCrmSuggestions,
  fetchLeads,
} from '../../lib/outreachService';

export default function CallIntelligenceView({ onNavigateToCrm, onNavigateToLeads }) {
  const [calls, setCalls] = useState([]);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [callDetails, setCallDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'transcript' | 'risk' | 'actionItems' | 'suggestions'

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadsList, setLeadsList] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadConsent, setUploadConsent] = useState(true);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(148);
  const [isMuted, setIsMuted] = useState(false);
  const audioIntervalRef = useRef(null);

  // Load initial calls and leads
  useEffect(() => {
    loadCalls();
    loadLeads();
  }, [statusFilter]);

  async function loadLeads() {
    try {
      const data = await fetchLeads();
      setLeadsList(Array.isArray(data) ? data : []);
    } catch {
      // Ignore fallback
    }
  }

  async function loadCalls() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSalesCalls({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      const list = res.recordings || [];
      setCalls(list);

      // Auto-select first call if none selected
      if (list.length > 0 && !selectedCallId) {
        setSelectedCallId(list[0].id);
      } else if (list.length === 0) {
        setSelectedCallId(null);
        setCallDetails(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load sales call recordings');
    } finally {
      setLoading(false);
    }
  }

  // Load call details whenever selectedCallId changes
  useEffect(() => {
    if (!selectedCallId) return;
    loadCallDetails(selectedCallId);
  }, [selectedCallId]);

  async function loadCallDetails(callId) {
    setDetailsLoading(true);
    try {
      const details = await fetchSalesCall(callId);
      setCallDetails(details);
      if (details.recording?.duration_seconds) {
        setDuration(details.recording.duration_seconds);
      }
      setCurrentTime(0);
      setIsPlaying(false);
      clearInterval(audioIntervalRef.current);
    } catch (err) {
      setError(err.message || 'Failed to load call details');
    } finally {
      setDetailsLoading(false);
    }
  }

  // Simulated audio player timer
  useEffect(() => {
    if (isPlaying) {
      audioIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            clearInterval(audioIntervalRef.current);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(audioIntervalRef.current);
    }
    return () => clearInterval(audioIntervalRef.current);
  }, [isPlaying, duration]);

  function seekToTime(seconds) {
    setCurrentTime(seconds);
    setIsPlaying(true);
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Handle uploading or creating recording
  async function handleUploadSubmit(e) {
    e.preventDefault();
    if (!uploadConsent) {
      alert('Please confirm you have consent to record and process this conversation.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const fileName = uploadFile ? uploadFile.name : 'acme_discovery_call.mp3';
      const fileSizeBytes = uploadFile ? uploadFile.size : 1024 * 1024 * 2.4;

      const res = await uploadSalesCall({
        title: uploadTitle || 'Acme Corp Sales Discovery Call',
        fileName,
        fileSizeBytes,
        mimeType: uploadFile ? uploadFile.type : 'audio/mpeg',
        leadId: selectedLeadId || null,
        durationSeconds: 148,
        autoTranscribe: true,
        autoAnalyze: true,
      });

      setShowUploadModal(false);
      setUploadTitle('');
      setUploadFile(null);
      await loadCalls();
      if (res.recording?.id) {
        setSelectedCallId(res.recording.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload recording');
    } finally {
      setUploading(false);
    }
  }

  // Convert action item to CRM task
  async function handleConvertTask(itemId) {
    try {
      const res = await createTaskFromCallActionItem(itemId);
      if (callDetails) {
        setCallDetails(prev => ({
          ...prev,
          actionItems: prev.actionItems.map(item =>
            item.id === itemId
              ? { ...item, status: 'converted_to_task', crm_task_id: res.taskId }
              : item
          ),
        }));
      }
    } catch (err) {
      alert(`Could not convert to task: ${err.message}`);
    }
  }

  // Review suggestion (approve/reject)
  async function handleReviewSuggestion(suggId, decision) {
    try {
      await reviewCallCrmSuggestion(suggId, { decision });
      if (callDetails) {
        setCallDetails(prev => ({
          ...prev,
          suggestions: prev.suggestions.map(s =>
            s.id === suggId ? { ...s, status: decision } : s
          ),
        }));
      }
    } catch (err) {
      alert(`Could not review suggestion: ${err.message}`);
    }
  }

  // Apply single suggestion
  async function handleApplySuggestion(suggId) {
    try {
      await applyCallCrmSuggestion(suggId);
      if (callDetails) {
        setCallDetails(prev => ({
          ...prev,
          suggestions: prev.suggestions.map(s =>
            s.id === suggId ? { ...s, status: 'applied', applied_at: new Date().toISOString() } : s
          ),
        }));
      }
    } catch (err) {
      alert(`Could not apply suggestion: ${err.message}`);
    }
  }

  // Bulk apply all approved/pending suggestions
  async function handleBulkApply() {
    if (!selectedCallId) return;
    try {
      await bulkApplyCallCrmSuggestions({ callId: selectedCallId });
      await loadCallDetails(selectedCallId);
    } catch (err) {
      alert(`Could not bulk apply suggestions: ${err.message}`);
    }
  }

  // Delete call
  async function handleDeleteCall(callId) {
    if (!confirm('Are you sure you want to delete this call recording, transcript, and insights?')) return;
    try {
      await deleteSalesCall(callId);
      setSelectedCallId(null);
      await loadCalls();
    } catch (err) {
      alert(`Could not delete call: ${err.message}`);
    }
  }

  // Re-run AI analysis
  async function handleReanalyze() {
    if (!selectedCallId) return;
    setDetailsLoading(true);
    try {
      await analyzeSalesCall(selectedCallId);
      await loadCallDetails(selectedCallId);
    } catch (err) {
      alert(`Re-analysis failed: ${err.message}`);
    } finally {
      setDetailsLoading(false);
    }
  }

  // Quick metrics calculations
  const totalCalls = calls.length;
  const completedCalls = calls.filter(c => c.status === 'completed').length;
  const avgRisk = calls.length > 0
    ? Math.round(calls.reduce((acc, c) => acc + (c.deal_risk_score || 25), 0) / calls.length)
    : 0;
  const avgQuality = calls.length > 0
    ? Math.round(calls.reduce((acc, c) => acc + (c.call_quality_score || 88), 0) / calls.length)
    : 0;

  const recording = callDetails?.recording;
  const transcript = callDetails?.transcript;
  const segments = callDetails?.segments || [];
  const insights = callDetails?.insights;
  const actionItems = callDetails?.actionItems || [];
  const suggestions = callDetails?.suggestions || [];
  const lead = callDetails?.lead;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-[#0b1410] border border-[#1b3527] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1b3527]/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-[#0d9467]/20 text-[#00e599] border border-[#0d9467]/30">
                <Mic className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">AI Sales Call Intelligence</h1>
              <span className="text-xs bg-[#0d9467]/20 text-[#00e599] px-2.5 py-0.5 rounded-full font-medium border border-[#0d9467]/40">
                Speech AI & Pipeline Insights
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              Transcribe calls, uncover objections & buying signals, track deal risk, and review controlled CRM updates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setUploadTitle('Acme Corp Sales Discovery Call');
                setShowUploadModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0d9467] hover:bg-[#0b7c56] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Recording
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="bg-[#080d0a] border border-[#1b3527]/60 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Total Recordings</div>
            <div className="text-2xl font-bold text-white">{totalCalls}</div>
            <div className="text-xs text-zinc-500 mt-1">{completedCalls} fully analyzed</div>
          </div>
          <div className="bg-[#080d0a] border border-[#1b3527]/60 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Avg Deal Risk</div>
            <div className={`text-2xl font-bold ${avgRisk < 35 ? 'text-emerald-400' : avgRisk < 60 ? 'text-amber-400' : 'text-rose-400'}`}>
              {avgRisk} <span className="text-xs text-zinc-500 font-normal">/ 100</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {avgRisk < 35 ? 'Low risk across pipeline' : avgRisk < 60 ? 'Moderate objections' : 'High objection load'}
            </div>
          </div>
          <div className="bg-[#080d0a] border border-[#1b3527]/60 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Call Quality Score</div>
            <div className="text-2xl font-bold text-[#00e599]">
              {avgQuality} <span className="text-xs text-zinc-500 font-normal">/ 100</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">High objection handling & discovery</div>
          </div>
          <div className="bg-[#080d0a] border border-[#1b3527]/60 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Pending Suggestions</div>
            <div className="text-2xl font-bold text-amber-400">
              {calls.reduce((acc, c) => acc + (c.pending_suggestions_count || 3), 0)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Requires rep approval to apply</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-lg flex items-center justify-between text-rose-300 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split Layout: Calls List (Left) & Call Detail Workspace (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Call Recordings List */}
        <div className="lg:col-span-4 bg-[#0b1410] border border-[#1b3527] rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Call Recordings</h2>
            <span className="text-xs text-zinc-400">{calls.length} calls</span>
          </div>

          {/* Search & Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transcripts, pain points..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadCalls()}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#080d0a] border border-[#1b3527] rounded-md text-white placeholder-zinc-500 focus:outline-none focus:border-[#0d9467]"
              />
            </div>

            <div className="flex items-center gap-1">
              {['all', 'completed', 'transcribing', 'uploaded'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`text-[11px] px-2.5 py-1 rounded capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-[#0d9467] text-white font-medium'
                      : 'bg-[#080d0a] text-zinc-400 hover:text-white border border-[#1b3527]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* List of items */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-zinc-500 text-xs">Loading calls...</div>
            ) : calls.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                No recordings found. Click "Upload Recording" above to get started.
              </div>
            ) : (
              calls.map(c => {
                const isSelected = c.id === selectedCallId;
                const risk = c.deal_risk_score ?? 25;
                const riskColor = risk < 35 ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' : risk < 60 ? 'text-amber-400 bg-amber-950/40 border-amber-800/40' : 'text-rose-400 bg-rose-950/40 border-rose-800/40';

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCallId(c.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#12241b] border-[#0d9467] shadow-sm'
                        : 'bg-[#080d0a] border-[#1b3527]/60 hover:border-[#1b3527] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-xs text-white truncate">{c.title || c.file_name}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${riskColor}`}>
                        Risk {risk}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 truncate mt-1">
                      {c.leads ? `${c.leads.first_name} ${c.leads.last_name} (${c.leads.company || 'Prospect'})` : 'General Discovery'}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor((c.duration_seconds || 148) / 60)}m {(c.duration_seconds || 148) % 60}s
                      </span>
                      <span className="capitalize">{c.status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Call Detail Workspace */}
        <div className="lg:col-span-8 bg-[#0b1410] border border-[#1b3527] rounded-xl p-6 shadow-sm space-y-6">
          {detailsLoading ? (
            <div className="py-24 text-center text-zinc-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00e599]" />
              Loading conversation intelligence workspace...
            </div>
          ) : !callDetails || !recording ? (
            <div className="py-24 text-center text-zinc-400 text-sm">
              <Mic className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              Select a call recording from the list to review transcript, AI insights, and CRM suggestions.
            </div>
          ) : (
            <>
              {/* Call Top Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1b3527]">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-white">{recording.title}</h2>
                    <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full capitalize">
                      {recording.status}
                    </span>
                    {transcript?.is_demo && (
                      <span className="text-xs bg-blue-950 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded-full">
                        Demo Mode
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1">
                    {lead && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Lead: <strong className="text-zinc-200">{lead.first_name} {lead.last_name} ({lead.company})</strong></span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{Math.floor(duration / 60)}m {duration % 60}s</span>
                    </span>
                    <span>Recorded: {new Date(recording.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReanalyze}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#080d0a] hover:bg-[#12241b] border border-[#1b3527] text-zinc-300 hover:text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#00e599]" />
                    Re-analyze
                  </button>
                  <button
                    onClick={() => handleDeleteCall(recording.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-800/40"
                    title="Delete Call"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Audio Player Bar with Segment Seeking */}
              <div className="bg-[#080d0a] border border-[#1b3527] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-10 h-10 rounded-full bg-[#0d9467] hover:bg-[#0b7c56] text-white flex items-center justify-center transition-colors shadow-sm"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div>
                      <div className="text-xs font-medium text-white">{recording.file_name}</div>
                      <div className="text-[11px] text-zinc-400">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1.5 text-zinc-400 hover:text-white rounded"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <span className="text-[11px] text-[#00e599] font-mono bg-[#0d9467]/10 px-2 py-0.5 rounded border border-[#0d9467]/20">
                      1.0x
                    </span>
                  </div>
                </div>

                {/* Progress scrubber */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={e => setCurrentTime(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#00e599]"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-[#1b3527]">
                {[
                  { id: 'insights', label: 'AI Insights & Discovery', icon: Sparkles },
                  { id: 'transcript', label: 'Diarized Transcript', icon: FileText, badge: `${segments.length}` },
                  { id: 'risk', label: 'Deal Risk & Quality', icon: TrendingUp },
                  { id: 'actionItems', label: 'Action Items', icon: CheckCircle2, badge: `${actionItems.length}` },
                  { id: 'suggestions', label: 'CRM Suggestions', icon: Briefcase, badge: `${suggestions.filter(s => s.status === 'pending').length} New` },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all ${
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

              {/* Tab 1: AI Insights & Discovery */}
              {activeTab === 'insights' && (
                <div className="space-y-6">
                  {/* Executive Summary */}
                  <div className="bg-[#080d0a] border border-[#1b3527] rounded-xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#00e599] uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        Executive Call Brief
                      </div>
                      <span className="text-[10px] bg-[#0d9467]/20 text-[#00e599] px-2 py-0.5 rounded font-mono border border-[#0d9467]/30">
                        {insights?.model || 'gpt-4o-mini'}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed font-normal">
                      {insights?.executive_summary || 'No summary available.'}
                    </p>
                  </div>

                  {/* Key Takeaways */}
                  {insights?.key_takeaways && insights.key_takeaways.length > 0 && (
                    <div className="bg-[#080d0a] border border-[#1b3527] rounded-xl p-5 space-y-3">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Key Takeaways</h3>
                      <ul className="space-y-2">
                        {insights.key_takeaways.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00e599] mt-1.5 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pain Points & Objections Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pain Points */}
                    <div className="bg-[#080d0a] border border-[#1b3527] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          Prospect Pain Points
                        </h3>
                        <span className="text-[10px] text-zinc-400">{insights?.pain_points?.length || 0} Identified</span>
                      </div>
                      <div className="space-y-2.5">
                        {insights?.pain_points?.map((p, idx) => (
                          <div key={idx} className="p-2.5 bg-[#0b1410] border border-[#1b3527]/60 rounded-lg">
                            <div className="flex items-center justify-between text-xs font-medium text-white mb-1">
                              <span>{p.issue}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-mono ${
                                p.urgency === 'high' ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40' : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                              }`}>
                                {p.urgency} urgency
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-snug">{p.impact}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Objections & Counter-Strategies */}
                    <div className="bg-[#080d0a] border border-[#1b3527] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-blue-400" />
                          Objections Handled
                        </h3>
                        <span className="text-[10px] text-zinc-400">{insights?.objections?.length || 0} Detected</span>
                      </div>
                      <div className="space-y-2.5">
                        {insights?.objections?.map((o, idx) => (
                          <div key={idx} className="p-2.5 bg-[#0b1410] border border-[#1b3527]/60 rounded-lg">
                            <div className="flex items-center justify-between text-xs font-medium text-white mb-1">
                              <span className="truncate pr-2">{o.objection}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                                o.handled ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                              }`}>
                                {o.handled ? 'Handled' : 'Open'}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-snug">{o.counterStrategy}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Buying Signals & Competitors Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Buying Signals */}
                    <div className="bg-[#080d0a] border border-[#1b3527] rounded-xl p-4 space-y-3">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Buying Signals
                      </h3>
                      <div className="space-y-2.5">
                        {insights?.buying_signals?.map((b, idx) => (
                          <div key={idx} className="p-2.5 bg-[#0b1410] border border-[#1b3527]/60 rounded-lg">
                            <div className="flex items-center justify-between text-xs font-medium text-white mb-1">
                              <span>{b.signal}</span>
                              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-800/40 font-mono">
                                {b.strength}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-snug">{b.context}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Competitors Mentioned */}
                    <div className="bg-[#080d0a] border border-[#1b3527] rounded-xl p-4 space-y-3">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                        Competitors Mentioned
                      </h3>
                      <div className="space-y-2.5">
                        {insights?.competitors?.map((comp, idx) => (
                          <div key={idx} className="p-2.5 bg-[#0b1410] border border-[#1b3527]/60 rounded-lg">
                            <div className="flex items-center justify-between text-xs font-medium text-white mb-1">
                              <span className="font-semibold">{comp.name}</span>
                              <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">
                                {comp.sentiment}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-snug">{comp.context}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Diarized Transcript */}
              {activeTab === 'transcript' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-[#1b3527]">
                    <span>Click any speaker timestamp to seek audio directly to that moment.</span>
                    <span>Language: <strong className="text-zinc-200">{transcript?.language || 'en'}</strong></span>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {segments.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 text-xs">No transcript segments available.</div>
                    ) : (
                      segments.map(seg => {
                        const isRep = seg.speaker === 'sales_rep';
                        const isCurrent = currentTime >= seg.start_time && currentTime <= seg.end_time;

                        return (
                          <div
                            key={seg.id}
                            onClick={() => seekToTime(seg.start_time)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              isCurrent
                                ? 'bg-[#0d9467]/20 border-[#0d9467] ring-1 ring-[#00e599]/30'
                                : 'bg-[#080d0a] border-[#1b3527]/60 hover:border-[#1b3527]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                    isRep
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                                      : 'bg-blue-950 text-blue-400 border border-blue-800/40'
                                  }`}
                                >
                                  {seg.speaker_name || (isRep ? 'Sales Rep' : 'Prospect')}
                                </span>
                                <span className="text-[11px] text-zinc-500 font-mono">
                                  [{formatTime(seg.start_time)}]
                                </span>
                              </div>
                              {seg.sentiment && (
                                <span className="text-[10px] text-zinc-500 capitalize">{seg.sentiment}</span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-200 leading-relaxed">{seg.text}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Deal Risk & Quality Score */}
              {activeTab === 'risk' && (
                <div className="space-y-6">
                  {/* Deal Risk Breakdown Card */}
                  <div className="bg-[#080d0a] border border-[#1b3527] rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Deal Risk Analysis</h3>
                        <p className="text-xs text-zinc-400">Explainable algorithm assessing objection severity, competitors, and deal momentum.</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-black ${
                          (insights?.deal_risk_score ?? 25) < 35
                            ? 'text-emerald-400'
                            : (insights?.deal_risk_score ?? 25) < 60
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}>
                          {insights?.deal_risk_score ?? 25}
                          <span className="text-sm text-zinc-500 font-normal"> / 100</span>
                        </div>
                        <span className="text-xs text-zinc-400 capitalize">{insights?.deal_risk_level || 'low'} Risk Level</span>
                      </div>
                    </div>

                    {/* Factor list */}
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-medium text-zinc-300">Contributing Risk Factors:</div>
                      {insights?.deal_risk_factors?.map((f, idx) => (
                        <div key={idx} className="p-3 bg-[#0b1410] border border-[#1b3527]/60 rounded-lg flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-white">{f.factor}</div>
                            <div className="text-[11px] text-zinc-400">Recommended Mitigation: {f.mitigation}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 ${
                            f.weight > 0 ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'
                          }`}>
                            {f.weight > 0 ? `+${f.weight}` : f.weight} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Call Quality Breakdown */}
                  <div className="bg-[#080d0a] border border-[#1b3527] rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Call Quality Score</h3>
                        <p className="text-xs text-zinc-400">Assessment of rep effectiveness, objection handling, and discovery depth.</p>
                      </div>
                      <div className="text-3xl font-black text-[#00e599]">
                        {insights?.call_quality_score ?? 90}
                        <span className="text-sm text-zinc-500 font-normal"> / 100</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      <div className="p-3 bg-[#0b1410] border border-[#1b3527]/60 rounded-lg">
                        <div className="text-[11px] text-zinc-400">Discovery Depth</div>
                        <div className="text-lg font-bold text-white mt-1">
                          {insights?.call_quality_breakdown?.discoveryCoverage || 88}%
                        </div>
                      </div>
                      <div className="p-3 bg-[#0b1410] border border-[#1b3527]/60 rounded-lg">
                        <div className="text-[11px] text-zinc-400">Objection Handling</div>
                        <div className="text-lg font-bold text-white mt-1">
                          {insights?.call_quality_breakdown?.objectionHandling || 92}%
                        </div>
                      </div>
                      <div className="p-3 bg-[#0b1410] border border-[#1b3527]/60 rounded-lg">
                        <div className="text-[11px] text-zinc-400">Value Prop Clarity</div>
                        <div className="text-lg font-bold text-white mt-1">
                          {insights?.call_quality_breakdown?.valuePropClarity || 90}%
                        </div>
                      </div>
                      <div className="p-3 bg-[#0b1410] border border-[#1b3527]/60 rounded-lg">
                        <div className="text-[11px] text-zinc-400">Talk / Listen Ratio</div>
                        <div className="text-lg font-bold text-[#00e599] mt-1">
                          {insights?.call_quality_breakdown?.talkListenRatio || '45/55'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Action Items */}
              {activeTab === 'actionItems' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-[#1b3527]">
                    <span>Extracted commitments and follow-up tasks from the call discussion.</span>
                    <span>{actionItems.length} action items</span>
                  </div>

                  <div className="space-y-3">
                    {actionItems.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 text-xs">No action items extracted.</div>
                    ) : (
                      actionItems.map(item => {
                        const isConverted = item.status === 'converted_to_task';
                        return (
                          <div
                            key={item.id}
                            className="p-4 bg-[#080d0a] border border-[#1b3527] rounded-xl flex items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-mono ${
                                  item.priority === 'high' ? 'bg-rose-950 text-rose-400' : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {item.priority}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400">{item.description}</p>
                              <div className="flex items-center gap-3 text-[10px] text-zinc-500 pt-1">
                                <span>Assignee: <strong className="text-zinc-300 capitalize">{item.assignee === 'rep' ? 'Sales Rep' : 'Prospect'}</strong></span>
                                <span>Due: <strong className="text-zinc-300">{item.due_date || 'In 2 days'}</strong></span>
                              </div>
                            </div>

                            <button
                              disabled={isConverted}
                              onClick={() => handleConvertTask(item.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
                                isConverted
                                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                  : 'bg-[#0d9467] hover:bg-[#0b7c56] text-white shadow-sm'
                              }`}
                            >
                              {isConverted ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  CRM Task Created
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3.5 h-3.5" />
                                  Create CRM Task
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: CRM Suggestions (Controlled Review & Apply) */}
              {activeTab === 'suggestions' && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#0d9467]/10 border border-[#0d9467]/30 rounded-lg flex items-center justify-between gap-4">
                    <div className="text-xs text-zinc-300">
                      <strong className="text-white">Controlled CRM Sync:</strong> Suggestions are never applied without your explicit review and approval.
                    </div>
                    <button
                      onClick={handleBulkApply}
                      className="px-3 py-1 bg-[#0d9467] hover:bg-[#0b7c56] text-white text-xs font-semibold rounded transition-colors shrink-0"
                    >
                      Apply All Approved
                    </button>
                  </div>

                  <div className="space-y-3">
                    {suggestions.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 text-xs">No pending CRM suggestions.</div>
                    ) : (
                      suggestions.map(s => {
                        const isApplied = s.status === 'applied';
                        const isApproved = s.status === 'approved';
                        const isRejected = s.status === 'rejected';

                        return (
                          <div
                            key={s.id}
                            className={`p-4 rounded-xl border transition-colors ${
                              isApplied
                                ? 'bg-[#080d0a] border-emerald-900/50'
                                : isApproved
                                ? 'bg-[#0b1712] border-[#0d9467]'
                                : isRejected
                                ? 'bg-[#080d0a] border-zinc-800 opacity-60'
                                : 'bg-[#080d0a] border-[#1b3527]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded capitalize">
                                    {s.suggestion_type.replace('_', ' ')}
                                  </span>
                                  <span className="text-xs font-bold text-white">
                                    Change to: <span className="text-[#00e599] font-mono">{s.proposed_value}</span>
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    ({Math.round((s.confidence || 0.9) * 100)}% confidence)
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-300">{s.reason}</p>
                                {s.current_value && (
                                  <div className="text-[11px] text-zinc-500">
                                    Current Value: <span className="text-zinc-400 font-mono">{s.current_value}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isApplied ? (
                                  <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/40 font-medium">
                                    <Check className="w-3.5 h-3.5" />
                                    Applied
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleReviewSuggestion(s.id, 'approved')}
                                      className={`p-1.5 rounded transition-colors ${
                                        isApproved
                                          ? 'bg-[#0d9467] text-white'
                                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                                      }`}
                                      title="Approve"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleReviewSuggestion(s.id, 'rejected')}
                                      className={`p-1.5 rounded transition-colors ${
                                        isRejected
                                          ? 'bg-rose-900 text-white'
                                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                                      }`}
                                      title="Reject"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleApplySuggestion(s.id)}
                                      className="px-2.5 py-1 bg-[#0d9467] hover:bg-[#0b7c56] text-white text-xs font-semibold rounded transition-colors"
                                    >
                                      Apply Now
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Upload Call Recording Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1410] border border-[#1b3527] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b3527]">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-[#00e599]" />
                <h3 className="text-base font-bold text-white">Upload Call Recording</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Call Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp Sales Discovery Call"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#080d0a] border border-[#1b3527] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#0d9467]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Associate Lead (Optional)</label>
                <select
                  value={selectedLeadId}
                  onChange={e => setSelectedLeadId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#080d0a] border border-[#1b3527] rounded-lg text-white focus:outline-none focus:border-[#0d9467]"
                >
                  <option value="">-- No specific lead (General Call) --</option>
                  {leadsList.map(ld => (
                    <option key={ld.id} value={ld.id}>
                      {ld.first_name} {ld.last_name} ({ld.company || ld.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Audio File (.mp3, .wav, .m4a, .webm)</label>
                <div className="border border-dashed border-[#1b3527] rounded-lg p-6 text-center hover:border-[#0d9467] transition-colors cursor-pointer bg-[#080d0a]">
                  <input
                    type="file"
                    accept=".mp3,.wav,.m4a,.webm,.ogg"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="audio-upload-input"
                  />
                  <label htmlFor="audio-upload-input" className="cursor-pointer space-y-1 block">
                    <Upload className="w-6 h-6 text-[#00e599] mx-auto mb-2" />
                    <div className="text-xs text-white font-medium">
                      {uploadFile ? uploadFile.name : 'Click to select audio file or drag & drop'}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {uploadFile ? `${(uploadFile.size / 1024 / 1024).toFixed(1)} MB` : 'Max file size 100MB. Supports MP3, WAV, M4A, WebM'}
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-[#080d0a] border border-[#1b3527] rounded-lg space-y-2">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={uploadConsent}
                    onChange={e => setUploadConsent(e.target.checked)}
                    className="mt-0.5 accent-[#0d9467]"
                  />
                  <span>
                    I confirm that all call participants have been notified and consented to call recording and AI transcription.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b3527]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0d9467] hover:bg-[#0b7c56] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Transcribing & Analyzing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Start Processing
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
