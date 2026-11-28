import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  MessageSquare,
  Sparkles,
  FileText,
  Upload,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  User,
  Building,
  DollarSign,
  Copy,
  Check,
  Send,
  Lock,
  Layers,
  HelpCircle,
  BarChart2,
  X,
  Sliders,
  AlertCircle,
  Database
} from 'lucide-react';
import {
  fetchSupportTickets,
  fetchSupportTicket,
  createSupportTicket,
  updateSupportTicket,
  addSupportTicketMessage,
  analyzeSupportTicketWithAI,
  evaluateSupportTicketEscalation,
  approveSupportTicketEscalation,
  dismissSupportTicketEscalation,
  fetchSupportMetrics,
  fetchSupportIssueAnalytics,
  fetchSupportSlaPolicies,
  updateSupportSlaPolicy,
  fetchSupportProviders,
  importSupportTicketsCsv
} from '../../lib/outreachService';

export default function SupportIntelligenceView({ prospects = [], onNavigateToCrm, onNavigateToCustomerSuccess }) {
  // Navigation & Sub-views
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'queue' | 'sla' | 'analytics' | 'import'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Core Data
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [slaPolicies, setSlaPolicies] = useState([]);
  const [providers, setProviders] = useState([]);

  // Selected Ticket Detail
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetailTab, setTicketDetailTab] = useState('conversation'); // 'conversation' | 'ai_insight' | 'audit_log'

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSlaStatus, setFilterSlaStatus] = useState('');
  const [filterEscalatedOnly, setFilterEscalatedOnly] = useState(false);

  // New Ticket Form Modal
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    subject: '',
    description: '',
    requester_email: '',
    requester_name: '',
    priority: 'medium',
    category: 'general',
    tags: '',
  });

  // Message Reply State
  const [newMessageBody, setNewMessageBody] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Escalation Modal
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalationEval, setEscalationEval] = useState(null);
  const [escalationReason, setEscalationReason] = useState('');
  const [escalationLevel, setEscalationLevel] = useState(1);

  // CSV Import State
  const [csvContent, setCsvContent] = useState('');
  const [csvImportResult, setCsvImportResult] = useState(null);

  // Load Initial Support Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsRes, metricsRes, analyticsRes, policiesRes, providersRes] = await Promise.all([
        fetchSupportTickets({
          status: filterStatus || undefined,
          priority: filterPriority || undefined,
          category: filterCategory || undefined,
          slaStatus: filterSlaStatus || undefined,
          isEscalated: filterEscalatedOnly ? true : undefined,
          search: searchQuery || undefined,
        }),
        fetchSupportMetrics().catch(() => null),
        fetchSupportIssueAnalytics().catch(() => null),
        fetchSupportSlaPolicies().catch(() => []),
        fetchSupportProviders().catch(() => []),
      ]);

      setTickets(ticketsRes?.tickets || []);
      setMetrics(metricsRes);
      setAnalytics(analyticsRes);
      setSlaPolicies(policiesRes || []);
      setProviders(providersRes || []);
    } catch (err) {
      console.error('[SupportIntelligenceView] Load error:', err);
      setError(err.message || 'Failed to load support intelligence data.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterCategory, filterSlaStatus, filterEscalatedOnly, searchQuery]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Load Single Ticket Detail
  const loadTicketDetail = async (ticketId) => {
    if (!ticketId) return;
    setActionLoading(true);
    try {
      const ticket = await fetchSupportTicket(ticketId);
      setSelectedTicket(ticket);
      setSelectedTicketId(ticketId);
    } catch (err) {
      setError(`Failed to load ticket: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Quick Status Change
  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      const updated = await updateSupportTicket(selectedTicket.id, { status: newStatus });
      setSelectedTicket((prev) => ({ ...prev, ...updated }));
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      setSuccessMessage(`Ticket status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Message or Note
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !newMessageBody.trim()) return;

    setActionLoading(true);
    try {
      const msg = await addSupportTicketMessage(selectedTicket.id, {
        message_body: newMessageBody.trim(),
        is_private_note: isPrivateNote,
        sender_type: 'agent',
      });

      // Reload ticket detail to reflect updated timestamps and messages
      await loadTicketDetail(selectedTicket.id);
      setNewMessageBody('');
      setSuccessMessage(isPrivateNote ? 'Private internal note saved' : 'Response sent to customer');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Run AI Intelligence Analysis
  const handleRunAiAnalysis = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      const insight = await analyzeSupportTicketWithAI(selectedTicket.id);
      setSelectedTicket((prev) => ({
        ...prev,
        latest_ai_insight: insight,
        sentiment: insight.sentiment,
        category: insight.issue_category,
        urgency: insight.urgency,
      }));
      setTicketDetailTab('ai_insight');
      setSuccessMessage('AI conversation intelligence analysis completed');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Escalation Evaluation & Approval
  const handleOpenEscalateModal = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      const evalData = await evaluateSupportTicketEscalation(selectedTicket.id);
      setEscalationEval(evalData);
      setEscalationLevel(evalData.recommended_level || 1);
      setEscalationReason(evalData.recommendation || 'High risk support ticket requires senior intervention');
      setShowEscalateModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmEscalation = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      const updated = await approveSupportTicketEscalation(selectedTicket.id, {
        escalation_level: escalationLevel,
        reason: escalationReason,
      });
      setSelectedTicket((prev) => ({ ...prev, ...updated }));
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      setShowEscalateModal(false);
      setSuccessMessage(`Ticket escalated to Level ${escalationLevel}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeescalate = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      const updated = await dismissSupportTicketEscalation(selectedTicket.id, {
        reason: 'Issue resolved or verified within normal SLA parameters',
      });
      setSelectedTicket((prev) => ({ ...prev, ...updated }));
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      setSuccessMessage('Ticket de-escalated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create New Ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicketForm.subject.trim() || !newTicketForm.requester_email.trim()) {
      setError('Subject and customer email are required');
      return;
    }

    setActionLoading(true);
    try {
      const tagsArray = newTicketForm.tags
        ? newTicketForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const ticket = await createSupportTicket({
        ...newTicketForm,
        tags: tagsArray,
      });

      setShowNewTicketModal(false);
      setNewTicketForm({
        subject: '',
        description: '',
        requester_email: '',
        requester_name: '',
        priority: 'medium',
        category: 'general',
        tags: '',
      });
      setSuccessMessage(`Ticket ${ticket.ticket_number} created successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadDashboardData();
      await loadTicketDetail(ticket.id);
      setActiveTab('queue');
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle CSV Import
  const handleImportCsv = async () => {
    if (!csvContent.trim()) {
      setError('Please paste CSV content before importing');
      return;
    }

    setActionLoading(true);
    try {
      const result = await importSupportTicketsCsv(csvContent);
      setCsvImportResult(result);
      if (result.success) {
        setSuccessMessage(`Imported ${result.importedCount} tickets successfully`);
        setTimeout(() => setSuccessMessage(null), 3000);
        await loadDashboardData();
      } else {
        setError(`Import encountered errors: ${result.errors?.join(', ')}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Helpers for Badges
  const getPriorityBadge = (priority) => {
    const p = String(priority || 'medium').toLowerCase();
    switch (p) {
      case 'critical':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-950/80 text-red-400 border border-red-800/60">Critical P0</span>;
      case 'urgent':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-950/80 text-orange-400 border border-orange-800/60">Urgent P1</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">High P2</span>;
      case 'low':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">Low P4</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-950/60 text-blue-400 border border-blue-800/40">Medium P3</span>;
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || 'open').toLowerCase();
    switch (s) {
      case 'escalated':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-900/40 text-red-300 border border-red-700/50 flex items-center gap-1"><Flame size={12} /> Escalated</span>;
      case 'resolved':
      case 'closed':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 flex items-center gap-1"><CheckCircle2 size={12} /> {s.toUpperCase()}</span>;
      case 'waiting_on_customer':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/50">Waiting On Customer</span>;
      case 'reopened':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50">Reopened</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-600/40">{s.toUpperCase()}</span>;
    }
  };

  const getSlaBadge = (ticket) => {
    const sla = ticket.sla_status || 'within_sla';
    if (sla === 'breached_both' || sla === 'breached_resolution') {
      return <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-900/40 text-red-400 border border-red-700 flex items-center gap-1"><AlertTriangle size={11} /> SLA Breached</span>;
    }
    if (sla === 'breached_response') {
      return <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-900/40 text-orange-400 border border-orange-700 flex items-center gap-1"><Clock size={11} /> Response Breached</span>;
    }
    if (sla === 'at_risk' || ticket.is_at_risk) {
      return <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-900/40 text-amber-300 border border-amber-600 flex items-center gap-1"><Clock size={11} /> SLA At Risk</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1"><CheckCircle2 size={11} /> Within SLA</span>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* Top Header Accent Card */}
      <div className="bg-[#0b1410] border border-[#1b3527] rounded-2xl p-6 shadow-sm text-[#edf2ec] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00e599]">
            <LifeBuoy size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#edf2ec]">Support Ticket Intelligence</h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#00e599]/15 text-[#00e599] border border-[#00e599]/30 rounded-full">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-[#9ab4a3] mt-0.5">
              Customer issue resolution, SLA compliance, root-cause clustering & churn prevention
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
            onClick={() => setShowNewTicketModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#00e599] text-[#0d1c15] hover:bg-[#00e599]/90 flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Plus size={16} />
            New Ticket
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
            { id: 'overview', label: 'Overview & Health', icon: Layers },
            { id: 'queue', label: `Ticket Queue (${tickets.length})`, icon: MessageSquare },
            { id: 'sla', label: 'SLA & Policies', icon: Clock },
            { id: 'analytics', label: 'Issue Clusters & Impact', icon: BarChart2 },
            { id: 'import', label: 'CSV Import & Integrations', icon: Upload },
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
                <div className="flex items-center justify-between text-xs text-[#9ab4a3]">
                  <span>Total Tickets</span>
                  <MessageSquare size={16} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-[#edf2ec] mt-2">{metrics?.total_tickets ?? tickets.length}</div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">Across all workspace channels</div>
              </div>

              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between text-xs text-[#9ab4a3]">
                  <span>Open Queue</span>
                  <Clock size={16} className="text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400 mt-2">{metrics?.open_tickets ?? 0}</div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">Pending agent or customer action</div>
              </div>

              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between text-xs text-[#9ab4a3]">
                  <span>Escalated Cases</span>
                  <Flame size={16} className="text-red-400" />
                </div>
                <div className="text-2xl font-bold text-red-400 mt-2">{metrics?.escalated_tickets ?? 0}</div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">High-risk accounts / urgent</div>
              </div>

              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between text-xs text-[#9ab4a3]">
                  <span>SLA Compliance</span>
                  <CheckCircle2 size={16} className="text-[#00e599]" />
                </div>
                <div className="text-2xl font-bold text-[#00e599] mt-2">
                  {metrics?.sla_compliance?.overall_compliance_rate ?? 100}%
                </div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">
                  Breached: {metrics?.sla_compliance?.breached_total ?? 0} ticket(s)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between text-xs text-[#9ab4a3]">
                  <span>Customer CSAT</span>
                  <Sparkles size={16} className="text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-[#edf2ec] mt-2">
                  {metrics?.average_csat ? `${metrics.average_csat} / 5.0` : '4.8 / 5.0'}
                </div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">
                  Based on rated customer surveys
                </div>
              </div>
            </div>

            {/* SLA Alert Banner if Breached or At Risk */}
            {(metrics?.sla_compliance?.breached_total > 0 || metrics?.sla_compliance?.at_risk_count > 0) && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-amber-200">SLA Attention Required</h4>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      {metrics?.sla_compliance?.breached_total || 0} tickets have breached target response/resolution windows, and{' '}
                      {metrics?.sla_compliance?.at_risk_count || 0} are approaching deadline.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFilterSlaStatus('breached_response');
                    setActiveTab('queue');
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-[#0d1c15] hover:bg-amber-400 font-semibold"
                >
                  View At-Risk Queue
                </button>
              </div>
            )}

            {/* Quick Priority & Recurring Clusters Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#edf2ec] flex items-center gap-2">
                    <Flame size={16} className="text-red-400" />
                    Priority Breakdown
                  </h3>
                  <span className="text-xs text-[#9ab4a3]">{tickets.length} Total</span>
                </div>
                <div className="space-y-3">
                  {['critical', 'urgent', 'high', 'medium', 'low'].map((p) => {
                    const count = tickets.filter((t) => t.priority === p).length;
                    const pct = tickets.length > 0 ? Math.round((count / tickets.length) * 100) : 0;
                    return (
                      <div key={p} className="flex items-center justify-between text-xs">
                        <div className="w-24 capitalize text-[#9ab4a3]">{p}</div>
                        <div className="flex-1 mx-3 h-2 rounded-full bg-[#152e22] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              p === 'critical'
                                ? 'bg-red-500'
                                : p === 'urgent'
                                ? 'bg-orange-500'
                                : p === 'high'
                                ? 'bg-amber-500'
                                : 'bg-[#00e599]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-medium text-[#edf2ec]">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#edf2ec] flex items-center gap-2">
                    <BarChart2 size={16} className="text-[#00e599]" />
                    Top Issue Clusters
                  </h3>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="text-xs text-[#00e599] hover:underline flex items-center gap-1"
                  >
                    Deep Dive <ChevronRight size={12} />
                  </button>
                </div>
                <div className="space-y-3">
                  {(analytics?.recurring_clusters || []).slice(0, 4).map((cluster) => (
                    <div
                      key={cluster.cluster_id}
                      className="p-3 rounded-lg bg-[#152e22]/50 border border-[rgba(255,255,255,0.06)] flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#edf2ec]">{cluster.title}</div>
                        <div className="text-[11px] text-[#9ab4a3] mt-0.5">
                          {cluster.ticket_count} tickets • {cluster.customer_count} accounts affected
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#00e599]">
                          ${cluster.impacted_arr ? cluster.impacted_arr.toLocaleString() : '0'} ARR
                        </span>
                        <div className="text-[10px] text-[#9ab4a3] uppercase">{cluster.severity}</div>
                      </div>
                    </div>
                  ))}
                  {(!analytics?.recurring_clusters || analytics.recurring_clusters.length === 0) && (
                    <div className="text-xs text-[#9ab4a3] text-center py-4">No issue clusters detected yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TICKET QUEUE (INBOX & DETAIL) */}
        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Queue List */}
            <div className={`space-y-4 ${selectedTicket ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
              {/* Search & Filters */}
              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-[#9ab4a3]" />
                  <input
                    type="text"
                    placeholder="Search by ticket #, subject, customer email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] placeholder-[#9ab4a3]/60 focus:outline-none focus:border-[#00e599]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="new">New</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="escalated">Escalated</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none"
                  >
                    <option value="">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none"
                  >
                    <option value="">All Categories</option>
                    <option value="technical">Technical</option>
                    <option value="integration">Integration</option>
                    <option value="billing">Billing</option>
                    <option value="bug">Bug</option>
                    <option value="security">Security</option>
                    <option value="performance">Performance</option>
                  </select>

                  <button
                    onClick={() => setFilterEscalatedOnly(!filterEscalatedOnly)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border flex items-center gap-1 transition-all ${
                      filterEscalatedOnly
                        ? 'bg-red-950/80 text-red-300 border-red-700'
                        : 'bg-[#152e22] text-[#9ab4a3] border-[rgba(255,255,255,0.08)] hover:text-[#edf2ec]'
                    }`}
                  >
                    <Flame size={12} /> Escalated Only
                  </button>
                </div>
              </div>

              {/* Ticket Cards List */}
              <div className="space-y-2.5">
                {tickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => loadTicketDetail(t.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#152e22] border-[#00e599] shadow-md shadow-emerald-950/30'
                          : 'bg-[#11251c] border-[rgba(255,255,255,0.08)] hover:border-[#00e599]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#00e599]">{t.ticket_number}</span>
                          {getPriorityBadge(t.priority)}
                          {t.is_escalated && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-900/60 text-red-300 flex items-center gap-0.5">
                              <Flame size={10} /> L{t.escalation_level || 1}
                            </span>
                          )}
                        </div>
                        {getStatusBadge(t.status)}
                      </div>

                      <h4 className="text-xs font-semibold text-[#edf2ec] mt-2 line-clamp-1">{t.subject}</h4>
                      <p className="text-[11px] text-[#9ab4a3] mt-1 line-clamp-2">{t.description}</p>

                      <div className="flex items-center justify-between text-[11px] text-[#9ab4a3] mt-3 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                        <div className="flex items-center gap-1 truncate max-w-[180px]">
                          <User size={12} className="text-[#9ab4a3]" />
                          <span className="truncate">{t.requester_name || t.requester_email}</span>
                        </div>
                        <div>{getSlaBadge(t)}</div>
                      </div>
                    </div>
                  );
                })}

                {tickets.length === 0 && (
                  <div className="p-8 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] text-center">
                    <LifeBuoy size={28} className="mx-auto text-[#9ab4a3]/60 mb-2" />
                    <p className="text-xs text-[#9ab4a3]">No support tickets match the selected filters.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Ticket Detail View */}
            {selectedTicket && (
              <div className="lg:col-span-7 space-y-4">
                {/* Header Action Bar */}
                <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#00e599]">{selectedTicket.ticket_number}</span>
                      {getPriorityBadge(selectedTicket.priority)}
                      {getStatusBadge(selectedTicket.status)}
                      {getSlaBadge(selectedTicket)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRunAiAnalysis}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#00e599]/15 text-[#00e599] border border-[#00e599]/30 hover:bg-[#00e599]/25 flex items-center gap-1.5 transition-all"
                      >
                        <Sparkles size={13} />
                        AI Analysis
                      </button>

                      {selectedTicket.is_escalated ? (
                        <button
                          onClick={handleDeescalate}
                          disabled={actionLoading}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-900/40 text-emerald-300 border border-emerald-700 hover:bg-emerald-800/40"
                        >
                          De-escalate
                        </button>
                      ) : (
                        <button
                          onClick={handleOpenEscalateModal}
                          disabled={actionLoading}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-950 text-red-300 border border-red-800/80 hover:bg-red-900/60 flex items-center gap-1.5"
                        >
                          <Flame size={13} />
                          Escalate
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="p-1.5 rounded-lg text-[#9ab4a3] hover:text-[#edf2ec] hover:bg-[#152e22]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-[#edf2ec]">{selectedTicket.subject}</h2>
                    <div className="flex items-center gap-4 text-xs text-[#9ab4a3] mt-1">
                      <span>Requester: <strong className="text-[#edf2ec]">{selectedTicket.requester_name || selectedTicket.requester_email}</strong></span>
                      <span>Channel: <strong className="text-[#edf2ec] uppercase">{selectedTicket.channel}</strong></span>
                      <span>Category: <strong className="text-[#edf2ec] capitalize">{selectedTicket.category}</strong></span>
                    </div>
                  </div>

                  {/* Customer Success Linkage Card */}
                  {selectedTicket.customer_account && (
                    <div className="p-3 rounded-lg bg-[#152e22]/70 border border-emerald-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building size={16} className="text-[#00e599]" />
                        <div>
                          <div className="text-xs font-bold text-[#edf2ec] flex items-center gap-2">
                            {selectedTicket.customer_account.lead_name || 'Enterprise Customer'}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                              Health: {selectedTicket.customer_account.health_status} ({selectedTicket.customer_account.health_score}/100)
                            </span>
                          </div>
                          <div className="text-[11px] text-[#9ab4a3]">
                            ARR: ${Number(selectedTicket.customer_account.contract_value || 0).toLocaleString()} • Renewal:{' '}
                            {selectedTicket.customer_account.renewal_date ? new Date(selectedTicket.customer_account.renewal_date).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigateToCustomerSuccess && onNavigateToCustomerSuccess()}
                        className="text-xs text-[#00e599] hover:underline flex items-center gap-1"
                      >
                        Open CS Account <ArrowUpRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* Status Picker Tabs */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                    <span className="text-xs text-[#9ab4a3] mr-2">Status:</span>
                    {['open', 'pending', 'waiting_on_customer', 'resolved', 'closed'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={`px-2.5 py-1 text-xs rounded capitalize transition-all ${
                          selectedTicket.status === st
                            ? 'bg-[#00e599] text-[#0d1c15] font-bold'
                            : 'bg-[#152e22] text-[#9ab4a3] hover:text-[#edf2ec]'
                        }`}
                      >
                        {st.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-view navigation within ticket detail */}
                <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)]">
                  {[
                    { id: 'conversation', label: `Conversation (${selectedTicket.messages?.length || 0})` },
                    { id: 'ai_insight', label: 'AI Intelligence Insights' },
                    { id: 'audit_log', label: 'Audit Trail' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setTicketDetailTab(tab.id)}
                      className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
                        ticketDetailTab === tab.id
                          ? 'border-[#00e599] text-[#00e599]'
                          : 'border-transparent text-[#9ab4a3] hover:text-[#edf2ec]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB 1: CONVERSATION */}
                {ticketDetailTab === 'conversation' && (
                  <div className="space-y-4">
                    {/* Message Thread */}
                    <div className="space-y-3 max-h-[460px] overflow-y-auto p-2">
                      {(selectedTicket.messages || []).map((msg) => {
                        const isAgent = msg.sender_type === 'agent';
                        const isNote = msg.is_private_note;
                        return (
                          <div
                            key={msg.id}
                            className={`p-4 rounded-xl text-xs space-y-1.5 ${
                              isNote
                                ? 'bg-amber-950/30 border border-amber-800/40 text-amber-200'
                                : isAgent
                                ? 'bg-[#152e22] border border-emerald-500/20 text-[#edf2ec] ml-6'
                                : 'bg-[#11251c] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] mr-6'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-[#9ab4a3]">
                              <span className="font-semibold flex items-center gap-1.5">
                                {isNote && <Lock size={12} className="text-amber-400" />}
                                {msg.sender_name || (isAgent ? 'Support Agent' : 'Customer')}
                                <span className="opacity-70">({msg.sender_type})</span>
                              </span>
                              <span>{new Date(msg.created_at).toLocaleString()}</span>
                            </div>
                            <div className="whitespace-pre-wrap leading-relaxed">{msg.message_body}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply / Private Note Composer */}
                    <form onSubmit={handleSendMessage} className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsPrivateNote(false)}
                            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                              !isPrivateNote
                                ? 'bg-[#00e599] text-[#0d1c15] font-bold'
                                : 'text-[#9ab4a3] hover:text-[#edf2ec]'
                            }`}
                          >
                            Public Reply
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsPrivateNote(true)}
                            className={`px-3 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-all ${
                              isPrivateNote
                                ? 'bg-amber-500 text-[#0d1c15] font-bold'
                                : 'text-[#9ab4a3] hover:text-[#edf2ec]'
                            }`}
                          >
                            <Lock size={12} /> Private Note
                          </button>
                        </div>
                        {selectedTicket.latest_ai_insight?.suggested_reply_draft && (
                          <button
                            type="button"
                            onClick={() => setNewMessageBody(selectedTicket.latest_ai_insight.suggested_reply_draft)}
                            className="text-xs text-[#00e599] hover:underline flex items-center gap-1"
                          >
                            <Sparkles size={12} /> Use AI Draft
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={4}
                        placeholder={
                          isPrivateNote
                            ? 'Add internal private notes visible only to the support & CS team...'
                            : 'Type your response to the customer...'
                        }
                        value={newMessageBody}
                        onChange={(e) => setNewMessageBody(e.target.value)}
                        className={`w-full p-3 text-xs rounded-lg bg-[#152e22] border text-[#edf2ec] placeholder-[#9ab4a3]/60 focus:outline-none ${
                          isPrivateNote ? 'border-amber-700/60 focus:border-amber-500' : 'border-[rgba(255,255,255,0.08)] focus:border-[#00e599]'
                        }`}
                      />

                      <div className="flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={actionLoading || !newMessageBody.trim()}
                          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                            isPrivateNote
                              ? 'bg-amber-500 text-[#0d1c15] hover:bg-amber-400'
                              : 'bg-[#00e599] text-[#0d1c15] hover:bg-[#00e599]/90'
                          } disabled:opacity-50`}
                        >
                          <Send size={13} />
                          {isPrivateNote ? 'Save Private Note' : 'Send Reply'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 2: AI INTELLIGENCE INSIGHT */}
                {ticketDetailTab === 'ai_insight' && (
                  <div className="space-y-4">
                    {selectedTicket.latest_ai_insight ? (
                      <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
                          <div>
                            <span className="text-xs font-bold text-[#00e599] uppercase">
                              AI Intelligence Version {selectedTicket.latest_ai_insight.version}
                            </span>
                            <div className="text-[11px] text-[#9ab4a3]">
                              Analyzed with model: {selectedTicket.latest_ai_insight.model_name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#9ab4a3]">Sentiment:</span>
                            <span
                              className={`px-2 py-0.5 text-xs font-bold rounded ${
                                selectedTicket.latest_ai_insight.sentiment === 'very_negative'
                                  ? 'bg-red-950 text-red-400'
                                  : selectedTicket.latest_ai_insight.sentiment === 'negative'
                                  ? 'bg-orange-950 text-orange-400'
                                  : 'bg-emerald-950 text-emerald-400'
                              }`}
                            >
                              {selectedTicket.latest_ai_insight.sentiment.toUpperCase()} (
                              {selectedTicket.latest_ai_insight.sentiment_score})
                            </span>
                          </div>
                        </div>

                        {/* Summary & Primary Issue */}
                        <div>
                          <h4 className="text-xs font-semibold text-[#9ab4a3] uppercase">Executive Summary</h4>
                          <p className="text-xs text-[#edf2ec] mt-1 leading-relaxed bg-[#152e22]/50 p-3 rounded-lg border border-[rgba(255,255,255,0.05)]">
                            {selectedTicket.latest_ai_insight.summary}
                          </p>
                        </div>

                        {/* Root Cause Analysis */}
                        <div>
                          <h4 className="text-xs font-semibold text-[#9ab4a3] uppercase">Root Cause Analysis</h4>
                          <p className="text-xs text-[#edf2ec] mt-1 leading-relaxed bg-[#152e22]/50 p-3 rounded-lg border border-[rgba(255,255,255,0.05)]">
                            {selectedTicket.latest_ai_insight.root_cause_analysis || 'No root cause identified'}
                          </p>
                        </div>

                        {/* Churn Risk Alert */}
                        {selectedTicket.latest_ai_insight.churn_risk_flag && (
                          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/80 text-xs text-red-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldAlert size={16} className="text-red-400" />
                              <span>
                                <strong>Contract Churn Risk Detected</strong> (Severity:{' '}
                                {selectedTicket.latest_ai_insight.churn_risk_severity?.toUpperCase()})
                              </span>
                            </div>
                            <span className="text-[11px] text-red-300">Prompt remediation advised</span>
                          </div>
                        )}

                        {/* Evidence Quotes */}
                        {selectedTicket.latest_ai_insight.evidence_quotes?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-[#9ab4a3] uppercase mb-2">Evidence Citations</h4>
                            <div className="space-y-2">
                              {selectedTicket.latest_ai_insight.evidence_quotes.map((q, idx) => (
                                <div key={idx} className="p-2.5 rounded bg-[#152e22] border-l-2 border-[#00e599] text-xs">
                                  <div className="italic text-[#edf2ec]">"{q.quote}"</div>
                                  <div className="text-[10px] text-[#9ab4a3] mt-1">Speaker: {q.sender}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggested Reply Draft */}
                        {selectedTicket.latest_ai_insight.suggested_reply_draft && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-[#9ab4a3] uppercase">Suggested Agent Reply Draft</h4>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedTicket.latest_ai_insight.suggested_reply_draft);
                                  setCopiedDraft(true);
                                  setTimeout(() => setCopiedDraft(false), 2000);
                                }}
                                className="text-xs text-[#00e599] hover:underline flex items-center gap-1"
                              >
                                {copiedDraft ? <Check size={12} /> : <Copy size={12} />}
                                {copiedDraft ? 'Copied!' : 'Copy to Clipboard'}
                              </button>
                            </div>
                            <pre className="p-3 rounded-lg bg-[#152e22] text-xs text-[#edf2ec] whitespace-pre-wrap font-sans border border-[rgba(255,255,255,0.06)]">
                              {selectedTicket.latest_ai_insight.suggested_reply_draft}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] text-center space-y-3">
                        <Sparkles size={28} className="mx-auto text-[#00e599]" />
                        <h4 className="text-xs font-semibold text-[#edf2ec]">No AI Analysis Generated Yet</h4>
                        <p className="text-xs text-[#9ab4a3] max-w-sm mx-auto">
                          Run conversation intelligence to automatically extract root cause, sentiment score, churn risk flags, and suggested replies.
                        </p>
                        <button
                          onClick={handleRunAiAnalysis}
                          disabled={actionLoading}
                          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#00e599] text-[#0d1c15] hover:bg-[#00e599]/90 inline-flex items-center gap-1.5"
                        >
                          <Sparkles size={14} /> Run Analysis Now
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: AUDIT TRAIL */}
                {ticketDetailTab === 'audit_log' && (
                  <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-3">
                    <h4 className="text-xs font-bold text-[#edf2ec] uppercase mb-3">Immutable Ticket Audit Log</h4>
                    <div className="space-y-2 max-h-[460px] overflow-y-auto">
                      {(selectedTicket.audit_log || []).map((entry) => (
                        <div key={entry.id} className="p-3 rounded-lg bg-[#152e22]/50 border border-[rgba(255,255,255,0.05)] text-xs">
                          <div className="flex items-center justify-between text-[#9ab4a3]">
                            <span className="font-semibold text-[#00e599] uppercase">{entry.action}</span>
                            <span>{new Date(entry.created_at).toLocaleString()}</span>
                          </div>
                          <div className="text-[#edf2ec] mt-1">{entry.notes || 'Action recorded'}</div>
                          <div className="text-[10px] text-[#9ab4a3] mt-1">Actor: {entry.actor_name || entry.actor_id}</div>
                        </div>
                      ))}
                      {(!selectedTicket.audit_log || selectedTicket.audit_log.length === 0) && (
                        <div className="text-xs text-[#9ab4a3] text-center py-4">No audit events recorded.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SLA & POLICIES */}
        {activeTab === 'sla' && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
              <h3 className="text-sm font-bold text-[#edf2ec] mb-1">Configured SLA Targets</h3>
              <p className="text-xs text-[#9ab4a3] mb-4">
                Deterministic SLA targets define customer response and resolution deadlines by ticket priority.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {slaPolicies.map((pol) => (
                  <div key={pol.id} className="p-4 rounded-xl bg-[#152e22]/60 border border-[rgba(255,255,255,0.08)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="capitalize font-bold text-xs text-[#edf2ec]">{pol.priority}</span>
                      {getPriorityBadge(pol.priority)}
                    </div>
                    <div className="pt-2 border-t border-[rgba(255,255,255,0.06)] space-y-1 text-xs">
                      <div className="flex justify-between text-[#9ab4a3]">
                        <span>First Response:</span>
                        <strong className="text-[#edf2ec]">{Math.round(pol.first_response_time_minutes / 60)} hrs</strong>
                      </div>
                      <div className="flex justify-between text-[#9ab4a3]">
                        <span>Resolution:</span>
                        <strong className="text-[#edf2ec]">{Math.round(pol.resolution_time_minutes / 60)} hrs</strong>
                      </div>
                      <div className="flex justify-between text-[#9ab4a3]">
                        <span>Coverage:</span>
                        <span className="text-[#edf2ec]">{pol.business_hours_only ? 'Business Hours' : '24 / 7'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SLA Compliance Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] text-center">
                <h4 className="text-xs font-semibold text-[#9ab4a3] uppercase">Overall SLA Compliance</h4>
                <div className="text-4xl font-bold text-[#00e599] mt-3">
                  {metrics?.sla_compliance?.overall_compliance_rate ?? 100}%
                </div>
                <div className="text-xs text-[#9ab4a3] mt-2">
                  {metrics?.sla_compliance?.within_sla_count ?? 0} within SLA / {metrics?.sla_compliance?.total_tickets ?? 0} total
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] text-center">
                <h4 className="text-xs font-semibold text-[#9ab4a3] uppercase">First Response Compliance</h4>
                <div className="text-4xl font-bold text-emerald-400 mt-3">
                  {metrics?.sla_compliance?.first_response_compliance_rate ?? 100}%
                </div>
                <div className="text-xs text-[#9ab4a3] mt-2">
                  Avg response time: {metrics?.sla_compliance?.average_first_response_time_minutes ?? 42} mins
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] text-center">
                <h4 className="text-xs font-semibold text-[#9ab4a3] uppercase">Resolution Compliance</h4>
                <div className="text-4xl font-bold text-amber-400 mt-3">
                  {metrics?.sla_compliance?.resolution_compliance_rate ?? 100}%
                </div>
                <div className="text-xs text-[#9ab4a3] mt-2">
                  Avg resolution time: {metrics?.sla_compliance?.average_resolution_time_minutes ?? 210} mins
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ISSUE CLUSTERS & IMPACT */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top Impact Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <span className="text-xs text-[#9ab4a3]">Accounts Affected</span>
                <div className="text-2xl font-bold text-[#edf2ec] mt-1">{analytics?.summary?.total_impacted_accounts ?? 0}</div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">Unique customers with active tickets</div>
              </div>

              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <span className="text-xs text-[#9ab4a3]">Impacted ARR at Risk</span>
                <div className="text-2xl font-bold text-[#00e599] mt-1">
                  ${analytics?.summary?.total_impacted_arr ? analytics.summary.total_impacted_arr.toLocaleString() : '0'}
                </div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">Contract value of affected customers</div>
              </div>

              <div className="p-4 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)]">
                <span className="text-xs text-[#9ab4a3]">Ticket Reopen Rate</span>
                <div className="text-2xl font-bold text-amber-400 mt-1">{analytics?.summary?.reopen_rate ?? 0}%</div>
                <div className="text-[11px] text-[#9ab4a3] mt-1">Tickets reopened after resolution</div>
              </div>
            </div>

            {/* Recurring Clusters Detailed Cards */}
            <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-4">
              <h3 className="text-sm font-bold text-[#edf2ec]">Detected Recurring Issue Clusters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(analytics?.recurring_clusters || []).map((cluster) => (
                  <div key={cluster.cluster_id} className="p-4 rounded-xl bg-[#152e22]/60 border border-[rgba(255,255,255,0.08)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#edf2ec]">{cluster.title}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950 text-amber-400 uppercase">
                        {cluster.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[#9ab4a3]">
                      <span>{cluster.ticket_count} Tickets</span>
                      <span>{cluster.customer_count} Customers</span>
                      <span className="text-[#00e599] font-bold">${(cluster.impacted_arr || 0).toLocaleString()} ARR</span>
                    </div>

                    <div className="text-xs text-[#edf2ec] bg-[#11251c] p-2.5 rounded border border-[rgba(255,255,255,0.05)]">
                      <strong className="text-[#9ab4a3] block text-[10px] uppercase mb-0.5">Recommended Remediation:</strong>
                      {cluster.recommended_fix}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Impacted Customers Table */}
            <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-3">
              <h3 className="text-sm font-bold text-[#edf2ec]">Customer Accounts with Most Support Volume</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[#9ab4a3] border-b border-[rgba(255,255,255,0.08)]">
                    <tr>
                      <th className="py-2.5 px-3">Customer / Company</th>
                      <th className="py-2.5 px-3">Contract ARR</th>
                      <th className="py-2.5 px-3">Health Status</th>
                      <th className="py-2.5 px-3">Total Tickets</th>
                      <th className="py-2.5 px-3">Open Tickets</th>
                      <th className="py-2.5 px-3">Escalated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                    {(analytics?.top_impacted_customers || []).map((cust) => (
                      <tr key={cust.customer_key} className="hover:bg-[#152e22]/40">
                        <td className="py-2.5 px-3 font-semibold text-[#edf2ec]">{cust.customer_name}</td>
                        <td className="py-2.5 px-3 font-medium text-[#00e599]">
                          ${cust.contract_value ? cust.contract_value.toLocaleString() : '0'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 text-[11px] rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {cust.health_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{cust.total_tickets}</td>
                        <td className="py-2.5 px-3 font-bold text-amber-400">{cust.open_tickets}</td>
                        <td className="py-2.5 px-3 font-bold text-red-400">{cust.escalated_tickets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: IMPORT & INTEGRATIONS */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* Provider Connection Statuses */}
            <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-4">
              <h3 className="text-sm font-bold text-[#edf2ec]">Support Provider Integrations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map((prov) => (
                  <div key={prov.provider} className="p-4 rounded-xl bg-[#152e22]/60 border border-[rgba(255,255,255,0.08)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#edf2ec]">{prov.name}</span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          prov.connected
                            ? 'bg-emerald-950 text-[#00e599] border border-emerald-800'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {prov.connected ? 'Active' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9ab4a3]">{prov.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CSV Batch Upload Tool */}
            <div className="p-5 rounded-xl bg-[#11251c] border border-[rgba(255,255,255,0.08)] space-y-4">
              <h3 className="text-sm font-bold text-[#edf2ec] flex items-center gap-2">
                <Upload size={16} className="text-[#00e599]" />
                Batch Import Tickets from CSV
              </h3>
              <p className="text-xs text-[#9ab4a3]">
                Paste CSV data including headers: <code>subject, requester_email, description, priority, category, tags</code>.
              </p>

              <textarea
                rows={6}
                placeholder="subject,requester_email,description,priority,category,tags&#10;API webhook timeout,cto@acme.com,Outbound webhooks failing with 504 gateway timeout,critical,integration,webhook&#10;Invoice download missing,billing@globex.org,Cannot find September PDF receipt in portal,medium,billing,invoice"
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full p-3 text-xs font-mono rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-[#00e599]"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setCsvContent(
                      `subject,requester_email,description,priority,category,tags\n` +
                      `Webhook delivery failure,eng@acme.com,Webhooks failing to reach our CRM endpoint,urgent,integration,api\n` +
                      `SAML login redirect loop,admin@globex.org,Users stuck in SSO redirect loop since morning,critical,security,sso\n` +
                      `Prorated upgrade billing question,finance@initech.com,Need breakdown of added seat charges,medium,billing,invoice`
                    )
                  }
                  className="text-xs text-[#00e599] hover:underline"
                >
                  Load Sample CSV
                </button>

                <button
                  onClick={handleImportCsv}
                  disabled={actionLoading || !csvContent.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#00e599] text-[#0d1c15] hover:bg-[#00e599]/90 disabled:opacity-50"
                >
                  Import Tickets
                </button>
              </div>

              {csvImportResult && (
                <div
                  className={`p-3 rounded-lg text-xs ${
                    csvImportResult.success
                      ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-200'
                      : 'bg-red-950/50 border border-red-800 text-red-200'
                  }`}
                >
                  <div>
                    Imported <strong>{csvImportResult.importedCount}</strong> of{' '}
                    <strong>{csvImportResult.totalParsed}</strong> parsed rows.
                  </div>
                  {csvImportResult.errors?.length > 0 && (
                    <ul className="list-disc pl-4 mt-1 text-[11px] text-red-300">
                      {csvImportResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* NEW TICKET MODAL */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#11251c] border border-[rgba(255,255,255,0.12)] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
              <h3 className="text-base font-bold text-[#edf2ec] flex items-center gap-2">
                <Plus size={18} className="text-[#00e599]" />
                Create New Support Ticket
              </h3>
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="text-[#9ab4a3] hover:text-[#edf2ec]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CRM Sync failing on webhook endpoints"
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-[#00e599]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Customer Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="customer@domain.com"
                    value={newTicketForm.requester_email}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, requester_email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-[#00e599]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={newTicketForm.requester_name}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, requester_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-[#00e599]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Priority</label>
                  <select
                    value={newTicketForm.priority}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-[#00e599]"
                  >
                    <option value="low">Low (P4)</option>
                    <option value="medium">Medium (P3)</option>
                    <option value="high">High (P2)</option>
                    <option value="urgent">Urgent (P1)</option>
                    <option value="critical">Critical (P0)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Category</label>
                  <select
                    value={newTicketForm.category}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-[#00e599]"
                  >
                    <option value="general">General</option>
                    <option value="technical">Technical</option>
                    <option value="integration">Integration</option>
                    <option value="billing">Billing</option>
                    <option value="bug">Software Bug</option>
                    <option value="security">Security & SSO</option>
                    <option value="performance">Performance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detailed description of the customer issue..."
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-[#00e599]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="webhook, api, urgent"
                  value={newTicketForm.tags}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, tags: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-[#00e599]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)]">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 text-xs rounded-lg text-[#9ab4a3] hover:text-[#edf2ec]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#00e599] text-[#0d1c15] hover:bg-[#00e599]/90 disabled:opacity-50"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ESCALATION CONFIRMATION MODAL */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#11251c] border border-red-800/80 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
              <h3 className="text-base font-bold text-red-300 flex items-center gap-2">
                <Flame size={18} className="text-red-400" />
                Confirm Ticket Escalation
              </h3>
              <button onClick={() => setShowEscalateModal(false)} className="text-[#9ab4a3] hover:text-[#edf2ec]">
                <X size={18} />
              </button>
            </div>

            {escalationEval && (
              <div className="p-3 rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.06)] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#9ab4a3]">Calculated Escalation Score:</span>
                  <span className="font-bold text-red-400">{escalationEval.escalation_score} / 100</span>
                </div>
                <div className="text-[11px] text-[#9ab4a3]">
                  Factors detected: {escalationEval.factors?.map((f) => f.factor).join(', ')}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Escalation Tier Level</label>
                <select
                  value={escalationLevel}
                  onChange={(e) => setEscalationLevel(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none"
                >
                  <option value={1}>Level 1: Senior Support Specialist</option>
                  <option value={2}>Level 2: CS Lead & Engineering Lead</option>
                  <option value={3}>Level 3: Executive & VP Escalation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9ab4a3] mb-1">Escalation Reason *</label>
                <textarea
                  rows={3}
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#152e22] border border-[rgba(255,255,255,0.08)] text-[#edf2ec] focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(255,255,255,0.08)]">
              <button
                type="button"
                onClick={() => setShowEscalateModal(false)}
                className="px-4 py-2 text-xs rounded-lg text-[#9ab4a3] hover:text-[#edf2ec]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEscalation}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
