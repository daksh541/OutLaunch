import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Info,
  RefreshCw,
  Download,
  Filter,
  Search,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  MessageSquare,
  UserX,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import {
  fetchAnalyticsOverview,
  fetchAnalyticsTrends,
  fetchAnalyticsCampaigns,
  fetchCampaignDetailAnalytics,
  fetchCampaignSequenceAnalytics,
  fetchCampaignRepliesAnalytics,
  downloadAnalyticsExportCsv,
} from '../../lib/outreachService';

export default function CampaignAnalyticsView({ onNavigateToCampaigns }) {
  // Filters & Controls
  const [period, setPeriod] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [interval, setInterval] = useState('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Overview Data
  const [overview, setOverview] = useState({
    metrics: {
      targeted_leads: 0,
      sent: 0,
      delivered: 0,
      delivery_rate: 0,
      replies: 0,
      reply_rate: 0,
      positive_replies: 0,
      positive_reply_rate: 0,
      bounces: 0,
      bounce_rate: 0,
      unsubscribes: 0,
      unsubscribe_rate: 0,
    },
    deltas: {
      sent_change: 0,
      sent_change_pct: 0,
      delivery_rate_change: 0,
      reply_rate_change: 0,
      positive_reply_rate_change: 0,
      bounce_rate_change: 0,
      unsubscribe_rate_change: 0,
    },
  });

  // Trends Data
  const [trends, setTrends] = useState([]);
  const [hoveredTrend, setHoveredTrend] = useState(null);

  // Campaigns Table Data
  const [campaigns, setCampaigns] = useState([]);
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, total_pages: 1 });

  // Detail Drawer / Modal
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [campaignDetail, setCampaignDetail] = useState(null);
  const [sequenceBreakdown, setSequenceBreakdown] = useState(null);
  const [repliesBreakdown, setRepliesBreakdown] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Active View Tab (Performance vs Deliverability / Compliance)
  const [activeTab, setActiveTab] = useState('performance');
  const [isExporting, setIsExporting] = useState(false);

  // Load Overview & Trends
  const loadOverviewAndTrends = async () => {
    try {
      setError(null);
      const [ovRes, trRes] = await Promise.all([
        fetchAnalyticsOverview({
          period,
          startDate: period === 'custom' ? customStart : null,
          endDate: period === 'custom' ? customEnd : null,
        }),
        fetchAnalyticsTrends({
          range: period,
          interval,
          startDate: period === 'custom' ? customStart : null,
          endDate: period === 'custom' ? customEnd : null,
        }),
      ]);

      if (ovRes && ovRes.metrics) {
        setOverview(ovRes);
      }
      if (trRes && Array.isArray(trRes.data)) {
        setTrends(trRes.data);
      }
    } catch (err) {
      console.error('Failed loading analytics overview/trends:', err);
      setError(err.message || 'Failed to load analytics data.');
    }
  };

  // Load Campaigns Table
  const loadCampaigns = async () => {
    try {
      const res = await fetchAnalyticsCampaigns({
        search: tableSearch,
        status: statusFilter,
        sortBy,
        sortOrder,
        page,
        limit: 10,
        startDate: period === 'custom' ? customStart : null,
        endDate: period === 'custom' ? customEnd : null,
      });

      if (res && res.campaigns) {
        setCampaigns(res.campaigns);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed loading campaigns analytics:', err);
    }
  };

  // Initial Load
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([loadOverviewAndTrends(), loadCampaigns()]);
      setIsLoading(false);
    }
    init();
  }, [period, interval, customStart, customEnd]);

  // Refetch table on table filter/sort changes
  useEffect(() => {
    loadCampaigns();
  }, [tableSearch, statusFilter, sortBy, sortOrder, page]);

  // Load campaign drilldown detail when a row is clicked
  useEffect(() => {
    if (!selectedCampaignId) return;

    let isMounted = true;
    async function fetchDetail() {
      setIsDetailLoading(true);
      try {
        const [detRes, seqRes, repRes] = await Promise.all([
          fetchCampaignDetailAnalytics(selectedCampaignId),
          fetchCampaignSequenceAnalytics(selectedCampaignId),
          fetchCampaignRepliesAnalytics(selectedCampaignId),
        ]);
        if (isMounted) {
          setCampaignDetail(detRes);
          setSequenceBreakdown(seqRes.steps || []);
          setRepliesBreakdown(repRes);
        }
      } catch (err) {
        console.error('Failed to load campaign drilldown:', err);
      } finally {
        if (isMounted) setIsDetailLoading(false);
      }
    }

    fetchDetail();
    return () => { isMounted = false; };
  }, [selectedCampaignId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadOverviewAndTrends(), loadCampaigns()]);
    if (selectedCampaignId) {
      const [detRes, seqRes, repRes] = await Promise.all([
        fetchCampaignDetailAnalytics(selectedCampaignId),
        fetchCampaignSequenceAnalytics(selectedCampaignId),
        fetchCampaignRepliesAnalytics(selectedCampaignId),
      ]);
      setCampaignDetail(detRes);
      setSequenceBreakdown(seqRes.steps || []);
      setRepliesBreakdown(repRes);
    }
    setIsRefreshing(false);
  };

  const handleExport = async (type = 'campaigns') => {
    setIsExporting(true);
    try {
      await downloadAnalyticsExportCsv({
        type,
        campaignId: selectedCampaignId,
        startDate: period === 'custom' ? customStart : null,
        endDate: period === 'custom' ? customEnd : null,
      });
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Helper for trend chart heights
  const maxTrendVal = useMemo(() => {
    if (!trends || trends.length === 0) return 10;
    const maxVal = Math.max(...trends.map(t => Math.max(t.sent || 0, t.delivered || 0, t.replies || 0)));
    return maxVal > 0 ? maxVal : 10;
  }, [trends]);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* 1. Header Bar with Actions & Period Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#0d1c15]/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#0d1c15]">
              Campaign Analytics & Performance
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#00e599]/15 text-[#0d9467] border border-[#00e599]/30">
              Live Telemetry
            </span>
          </div>
          <p className="text-sm text-[#0d1c15]/60 mt-1">
            Real-time delivery rates, response sentiment, sequence drop-offs, and conversion funnels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div className="inline-flex rounded-lg border border-[#0d1c15]/10 bg-white p-1 shadow-xs text-xs font-medium">
            {[
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === p.id
                    ? 'bg-[#0d1c15] text-white shadow-xs font-semibold'
                    : 'text-[#0d1c15]/70 hover:text-[#0d1c15] hover:bg-[#0d1c15]/5'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-[#0d1c15]/15 text-xs">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent border-none text-xs text-[#0d1c15] focus:outline-hidden"
              />
              <span className="text-[#0d1c15]/40">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent border-none text-xs text-[#0d1c15] focus:outline-hidden"
              />
            </div>
          )}

          {/* Export CSV Button */}
          <button
            onClick={() => handleExport('campaigns')}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-[#0d1c15]/15 rounded-lg text-[#0d1c15] hover:bg-[#0d1c15]/5 shadow-xs transition-colors disabled:opacity-50"
            title="Download CSV export with formula injection protection"
          >
            <Download className="w-3.5 h-3.5 text-[#0d9467]" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-xs font-medium bg-white border border-[#0d1c15]/15 rounded-lg text-[#0d1c15]/70 hover:text-[#0d1c15] hover:bg-[#0d1c15]/5 shadow-xs transition-colors"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0d9467]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Privacy & Open Tracking Disclaimer */}
      <div className="bg-[#00e599]/5 border border-[#00e599]/25 rounded-xl p-3.5 flex items-start gap-3 text-xs text-[#0d1c15]/80">
        <Info className="w-4 h-4 text-[#0d9467] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#0d1c15]">Deliverability & Privacy Guarantee:</span>{' '}
          OutLaunch prioritizes clean sender reputation over artificial engagement tracking. We do not inject misleading pixel traps that trip mail filters; delivery, reply rates, and sentiment are computed directly from cryptographic provider webhooks and authenticated replies.
        </div>
      </div>

      {/* 3. Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Sent */}
        <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 shadow-xs relative group hover:border-[#0d9467]/30 transition-all">
          <div className="flex items-center justify-between text-xs text-[#0d1c15]/60 mb-1">
            <span className="font-medium">Total Emails Sent</span>
            <div className="relative group/tip cursor-help">
              <HelpCircle className="w-3.5 h-3.5 text-[#0d1c15]/40" />
              <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/tip:block w-48 p-2 bg-[#0d1c15] text-white text-[11px] rounded-md shadow-lg z-20">
                Total emails dispatched to recipients via configured mail provider. Excludes queued or failed attempts.
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0d1c15] tracking-tight">
            {overview.metrics.sent.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            {overview.deltas.sent_change >= 0 ? (
              <span className="text-[#0d9467] font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +{overview.deltas.sent_change_pct}%
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" />
                {overview.deltas.sent_change_pct}%
              </span>
            )}
            <span className="text-[#0d1c15]/40">vs prior period</span>
          </div>
        </div>

        {/* Delivered & Delivery Rate */}
        <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 shadow-xs relative group hover:border-[#0d9467]/30 transition-all">
          <div className="flex items-center justify-between text-xs text-[#0d1c15]/60 mb-1">
            <span className="font-medium">Delivered (Rate)</span>
            <div className="relative group/tip cursor-help">
              <HelpCircle className="w-3.5 h-3.5 text-[#0d1c15]/40" />
              <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/tip:block w-52 p-2 bg-[#0d1c15] text-white text-[11px] rounded-md shadow-lg z-20">
                Provider-confirmed delivered messages. Formula: (Delivered / Sent) * 100.
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0d1c15] tracking-tight">
            {overview.metrics.delivery_rate}%
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-[#0d1c15]/60 font-mono">
              {overview.metrics.delivered.toLocaleString()} delivered
            </span>
            <span className={`font-semibold ${overview.deltas.delivery_rate_change >= 0 ? 'text-[#0d9467]' : 'text-rose-600'}`}>
              {overview.deltas.delivery_rate_change >= 0 ? `+${overview.deltas.delivery_rate_change}%` : `${overview.deltas.delivery_rate_change}%`}
            </span>
          </div>
        </div>

        {/* Total Replies & Reply Rate */}
        <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 shadow-xs relative group hover:border-[#0d9467]/30 transition-all">
          <div className="flex items-center justify-between text-xs text-[#0d1c15]/60 mb-1">
            <span className="font-medium">Replies (Reply Rate)</span>
            <div className="relative group/tip cursor-help">
              <HelpCircle className="w-3.5 h-3.5 text-[#0d1c15]/40" />
              <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/tip:block w-56 p-2 bg-[#0d1c15] text-white text-[11px] rounded-md shadow-lg z-20">
                Unique replied-to leads. Formula: (Unique Replied Leads / Delivered) * 100.
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0d1c15] tracking-tight">
            {overview.metrics.reply_rate}%
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-[#0d1c15]/60 font-mono">
              {overview.metrics.replies.toLocaleString()} leads
            </span>
            <span className={`font-semibold ${overview.deltas.reply_rate_change >= 0 ? 'text-[#0d9467]' : 'text-rose-600'}`}>
              {overview.deltas.reply_rate_change >= 0 ? `+${overview.deltas.reply_rate_change}%` : `${overview.deltas.reply_rate_change}%`}
            </span>
          </div>
        </div>

        {/* Positive Replies & Positive Rate */}
        <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 shadow-xs relative group hover:border-[#0d9467]/30 transition-all">
          <div className="flex items-center justify-between text-xs text-[#0d1c15]/60 mb-1">
            <span className="font-medium text-[#0d9467]">Positive Reply Rate</span>
            <div className="relative group/tip cursor-help">
              <HelpCircle className="w-3.5 h-3.5 text-[#0d1c15]/40" />
              <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/tip:block w-56 p-2 bg-[#0d1c15] text-white text-[11px] rounded-md shadow-lg z-20">
                Unique leads classified as Interested or Referral. Formula: (Positive Leads / Delivered) * 100.
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0d9467] tracking-tight">
            {overview.metrics.positive_reply_rate}%
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-[#0d1c15]/60 font-mono">
              {overview.metrics.positive_replies.toLocaleString()} positive
            </span>
            <span className={`font-semibold ${overview.deltas.positive_reply_rate_change >= 0 ? 'text-[#0d9467]' : 'text-rose-600'}`}>
              {overview.deltas.positive_reply_rate_change >= 0 ? `+${overview.deltas.positive_reply_rate_change}%` : `${overview.deltas.positive_reply_rate_change}%`}
            </span>
          </div>
        </div>

        {/* Bounces & Bounce Rate */}
        <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 shadow-xs relative group hover:border-[#0d9467]/30 transition-all">
          <div className="flex items-center justify-between text-xs text-[#0d1c15]/60 mb-1">
            <span className="font-medium">Bounce Rate</span>
            <div className="relative group/tip cursor-help">
              <HelpCircle className="w-3.5 h-3.5 text-[#0d1c15]/40" />
              <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/tip:block w-52 p-2 bg-[#0d1c15] text-white text-[11px] rounded-md shadow-lg z-20">
                Hard and soft bounces. Formula: (Bounces / Sent) * 100. Target below 2%.
              </div>
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${overview.metrics.bounce_rate > 3.0 ? 'text-rose-600' : 'text-[#0d1c15]'}`}>
            {overview.metrics.bounce_rate}%
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-[#0d1c15]/60 font-mono">
              {overview.metrics.bounces} bounced
            </span>
            <span className={`font-semibold ${overview.deltas.bounce_rate_change <= 0 ? 'text-[#0d9467]' : 'text-rose-600'}`}>
              {overview.deltas.bounce_rate_change >= 0 ? `+${overview.deltas.bounce_rate_change}%` : `${overview.deltas.bounce_rate_change}%`}
            </span>
          </div>
        </div>

        {/* Unsubscribes */}
        <div className="bg-white p-4 rounded-xl border border-[#0d1c15]/10 shadow-xs relative group hover:border-[#0d9467]/30 transition-all">
          <div className="flex items-center justify-between text-xs text-[#0d1c15]/60 mb-1">
            <span className="font-medium">Unsubscribe Rate</span>
            <div className="relative group/tip cursor-help">
              <HelpCircle className="w-3.5 h-3.5 text-[#0d1c15]/40" />
              <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/tip:block w-52 p-2 bg-[#0d1c15] text-white text-[11px] rounded-md shadow-lg z-20">
                Unique opt-outs. Formula: (Unique Unsubscribes / Delivered) * 100.
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#0d1c15] tracking-tight">
            {overview.metrics.unsubscribe_rate}%
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-[#0d1c15]/60 font-mono">
              {overview.metrics.unsubscribes} opt-outs
            </span>
            <span className="text-[#0d1c15]/40">
              {overview.deltas.unsubscribe_rate_change}%
            </span>
          </div>
        </div>
      </div>

      {/* 4. Performance Trend Chart Section */}
      <div className="bg-white p-6 rounded-2xl border border-[#0d1c15]/10 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-[#0d1c15] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0d9467]" />
              Outreach Performance Trends
            </h2>
            <p className="text-xs text-[#0d1c15]/60 mt-0.5">
              Time-series tracking sent volume, deliverability, and prospect replies.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Series Legend */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0d1c15]" />
                <span className="text-[#0d1c15]/70 font-medium">Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00e599]" />
                <span className="text-[#0d1c15]/70 font-medium">Delivered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0d9467]" />
                <span className="text-[#0d1c15]/70 font-medium">Replies</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-[#0d1c15]/70 font-medium">Positive</span>
              </div>
            </div>

            {/* Granularity Toggle */}
            <div className="inline-flex rounded-lg border border-[#0d1c15]/10 bg-[#f7f5f0] p-0.5 text-xs font-medium">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setInterval(g.id)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    interval === g.id
                      ? 'bg-white text-[#0d1c15] shadow-xs font-semibold'
                      : 'text-[#0d1c15]/60 hover:text-[#0d1c15]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Chart Bars */}
        <div className="h-56 w-full flex items-end gap-1.5 sm:gap-2.5 pt-8 pb-4 border-b border-[#0d1c15]/10 overflow-x-auto">
          {trends.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-xs text-[#0d1c15]/40">
              <BarChart3 className="w-8 h-8 stroke-1 mb-2 opacity-50" />
              No outreach telemetry recorded for this timeframe.
            </div>
          ) : (
            trends.map((item, idx) => {
              const sentHeight = Math.min(100, (item.sent / maxTrendVal) * 100);
              const repliesHeight = Math.min(100, (item.replies / maxTrendVal) * 100);
              const posHeight = Math.min(100, (item.positive_replies / maxTrendVal) * 100);

              const isHovered = hoveredTrend?.date === item.date;

              return (
                <div
                  key={item.date || idx}
                  className="flex-1 min-w-[20px] max-w-[48px] h-full flex flex-col justify-end items-center relative group cursor-pointer"
                  onMouseEnter={() => setHoveredTrend(item)}
                  onMouseLeave={() => setHoveredTrend(null)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-2 bg-[#0d1c15] text-white p-2.5 rounded-lg shadow-xl text-[11px] whitespace-nowrap z-30 pointer-events-none">
                      <div className="font-bold border-b border-white/10 pb-1 mb-1">
                        {item.label} ({item.date})
                      </div>
                      <div className="flex items-center justify-between gap-3 text-white/80">
                        <span>Sent:</span> <span className="font-mono font-semibold text-white">{item.sent}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-white/80">
                        <span>Delivered:</span> <span className="font-mono font-semibold text-[#00e599]">{item.delivered}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-white/80">
                        <span>Replies:</span> <span className="font-mono font-semibold text-[#0d9467]">{item.replies}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-white/80">
                        <span>Positive:</span> <span className="font-mono font-semibold text-amber-400">{item.positive_replies}</span>
                      </div>
                      {item.bounces > 0 && (
                        <div className="flex items-center justify-between gap-3 text-rose-300">
                          <span>Bounces:</span> <span className="font-mono font-semibold">{item.bounces}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grouped Bars */}
                  <div className="w-full flex items-end justify-center gap-0.5 h-full">
                    {/* Sent Bar */}
                    <div
                      style={{ height: `${Math.max(sentHeight, 4)}%` }}
                      className={`w-2 sm:w-2.5 rounded-t-xs transition-all ${
                        isHovered ? 'bg-[#0d1c15]' : 'bg-[#0d1c15]/80'
                      }`}
                    />
                    {/* Delivered Bar */}
                    <div
                      style={{ height: `${Math.max((item.delivered / maxTrendVal) * 100, 4)}%` }}
                      className={`w-2 sm:w-2.5 rounded-t-xs transition-all ${
                        isHovered ? 'bg-[#00e599]' : 'bg-[#00e599]/80'
                      }`}
                    />
                    {/* Replies Bar */}
                    <div
                      style={{ height: `${Math.max(repliesHeight, item.replies > 0 ? 6 : 0)}%` }}
                      className={`w-2 sm:w-2.5 rounded-t-xs transition-all ${
                        isHovered ? 'bg-[#0d9467]' : 'bg-[#0d9467]/80'
                      }`}
                    />
                  </div>

                  {/* Date label */}
                  <span className="text-[10px] text-[#0d1c15]/50 mt-2 truncate w-full text-center">
                    {item.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Campaign Performance Table */}
      <div className="bg-white rounded-2xl border border-[#0d1c15]/10 shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 border-b border-[#0d1c15]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#0d1c15]">Campaign Performance Breakdown</h2>
            <p className="text-xs text-[#0d1c15]/60 mt-0.5">
              Click any campaign row to open conversion funnel and sequence analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#0d1c15]/40" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs bg-[#f7f5f0] border border-transparent focus:border-[#0d9467]/30 rounded-lg text-[#0d1c15] focus:outline-hidden w-48 transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#0d1c15]/40" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-[#f7f5f0] border border-transparent focus:border-[#0d9467]/30 rounded-lg text-xs py-1.5 px-2.5 text-[#0d1c15] focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Completed">Completed</option>
                <option value="Draft">Draft</option>
                <option value="Scheduled">Scheduled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f7f5f0]/60 border-b border-[#0d1c15]/10 text-[#0d1c15]/60 font-medium">
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-[#0d1c15] transition-colors"
                >
                  Campaign Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer hover:text-[#0d1c15] transition-colors"
                >
                  Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('sent')}
                  className="py-3 px-3 cursor-pointer hover:text-[#0d1c15] transition-colors text-right"
                >
                  Sent {sortBy === 'sent' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('delivery_rate')}
                  className="py-3 px-3 cursor-pointer hover:text-[#0d1c15] transition-colors text-right"
                >
                  Delivered (Rate) {sortBy === 'delivery_rate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('reply_rate')}
                  className="py-3 px-3 cursor-pointer hover:text-[#0d1c15] transition-colors text-right"
                >
                  Replies (Rate) {sortBy === 'reply_rate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('positive_reply_rate')}
                  className="py-3 px-3 cursor-pointer hover:text-[#0d1c15] transition-colors text-right text-[#0d9467]"
                >
                  Positive (Rate) {sortBy === 'positive_reply_rate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('bounce_rate')}
                  className="py-3 px-3 cursor-pointer hover:text-[#0d1c15] transition-colors text-right"
                >
                  Bounce % {sortBy === 'bounce_rate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0d1c15]/5">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#0d1c15]/40 text-xs">
                    No campaigns found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr
                    key={camp.id}
                    onClick={() => setSelectedCampaignId(camp.id)}
                    className="hover:bg-[#00e599]/5 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0d1c15] group-hover:text-[#0d9467] transition-colors">
                        {camp.name}
                      </div>
                      <div className="text-[11px] text-[#0d1c15]/40">
                        {camp.targeted_leads || 0} leads targeted • Limit {camp.daily_limit || 35}/day
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          camp.status?.toLowerCase() === 'active'
                            ? 'bg-[#00e599]/15 text-[#0d9467] border border-[#00e599]/30'
                            : camp.status?.toLowerCase() === 'completed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : camp.status?.toLowerCase() === 'paused'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {camp.status || 'Active'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-[#0d1c15]">
                      {camp.sent?.toLocaleString() || 0}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="font-semibold font-mono text-[#0d1c15]">
                        {camp.delivery_rate || 0}%
                      </div>
                      <div className="text-[10px] text-[#0d1c15]/40">
                        {camp.delivered || 0} msgs
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="font-semibold font-mono text-[#0d1c15]">
                        {camp.reply_rate || 0}%
                      </div>
                      <div className="text-[10px] text-[#0d1c15]/40">
                        {camp.replies || 0} leads
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="font-semibold font-mono text-[#0d9467]">
                        {camp.positive_reply_rate || 0}%
                      </div>
                      <div className="text-[10px] text-[#0d9467]/70">
                        {camp.positive_replies || 0} leads
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <span className={camp.bounce_rate > 3.0 ? 'text-rose-600 font-semibold' : 'text-[#0d1c15]/70'}>
                        {camp.bounce_rate || 0}%
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCampaignId(camp.id);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0d9467] hover:text-[#0b7a54] bg-[#00e599]/10 hover:bg-[#00e599]/20 px-2.5 py-1 rounded-md transition-colors"
                      >
                        Drilldown <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-[#0d1c15]/10 bg-[#f7f5f0]/40 flex items-center justify-between text-xs text-[#0d1c15]/60">
          <div>
            Showing {campaigns.length} of {pagination.total} campaigns (Page {pagination.page} of {pagination.total_pages})
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-md border border-[#0d1c15]/10 bg-white hover:bg-[#0d1c15]/5 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs text-[#0d1c15] font-semibold">
              {page}
            </span>
            <button
              onClick={() => setPage(Math.min(pagination.total_pages, page + 1))}
              disabled={page >= pagination.total_pages}
              className="px-2.5 py-1 rounded-md border border-[#0d1c15]/10 bg-white hover:bg-[#0d1c15]/5 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Campaign Detail Modal / Drawer */}
      {selectedCampaignId && (
        <div className="fixed inset-0 bg-[#0d1c15]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#0d1c15]/15 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#0d1c15]/10 flex items-center justify-between bg-[#f7f5f0]/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#00e599]/15 text-[#0d9467]">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0d1c15]">
                    {campaignDetail?.campaign?.name || 'Campaign Deep Dive'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#0d1c15]/60 mt-0.5">
                    <span className="font-mono">ID: {selectedCampaignId.slice(0, 12)}...</span>
                    <span>•</span>
                    <span>Status: {campaignDetail?.campaign?.status || 'Active'}</span>
                    <span>•</span>
                    <span>Enrolled: {campaignDetail?.metrics?.targeted_leads || 0} leads</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport('campaign_leads')}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-[#0d1c15]/15 rounded-lg text-[#0d1c15] hover:bg-[#0d1c15]/5 shadow-xs transition-colors"
                  title="Export lead-level activity CSV"
                >
                  <Download className="w-3.5 h-3.5 text-[#0d9467]" />
                  Export Leads CSV
                </button>

                <button
                  onClick={() => setSelectedCampaignId(null)}
                  className="p-1.5 text-[#0d1c15]/40 hover:text-[#0d1c15] hover:bg-[#0d1c15]/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {isDetailLoading ? (
                <div className="py-16 text-center text-xs text-[#0d1c15]/40 flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#0d9467] mb-3" />
                  Aggregating sequence performance, conversion funnel, and reply sentiment...
                </div>
              ) : (
                <>
                  {/* A. Conversion Funnel */}
                  <div>
                    <h4 className="text-sm font-bold text-[#0d1c15] mb-3 flex items-center justify-between">
                      <span>Conversion Funnel</span>
                      <span className="text-xs text-[#0d9467] font-semibold">
                        Overall Conversion: {campaignDetail?.funnel?.overall_conversion_rate || 0}%
                      </span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {campaignDetail?.funnel?.stages?.map((stage, idx) => (
                        <div
                          key={stage.stage}
                          className="bg-[#f7f5f0] p-3 rounded-xl border border-[#0d1c15]/5 relative"
                        >
                          <div className="text-[11px] text-[#0d1c15]/60 mb-1 font-medium">
                            {stage.stage}
                          </div>
                          <div className="text-lg font-bold text-[#0d1c15]">
                            {stage.count.toLocaleString()}
                          </div>
                          <div className="mt-2 text-[10px] flex items-center justify-between">
                            <span className="text-[#0d9467] font-semibold">
                              {stage.conversion_rate}% conv.
                            </span>
                            {stage.drop_off_pct > 0 && (
                              <span className="text-rose-500 font-mono">
                                -{stage.drop_off_pct}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* B. Sequence Step Performance Breakdown */}
                  <div>
                    <h4 className="text-sm font-bold text-[#0d1c15] mb-3">
                      Sequence Step Performance Breakdown
                    </h4>

                    <div className="border border-[#0d1c15]/10 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#f7f5f0]/60 border-b border-[#0d1c15]/10 text-[#0d1c15]/60 font-medium">
                            <th className="py-2.5 px-3">Step</th>
                            <th className="py-2.5 px-3">Subject / Title</th>
                            <th className="py-2.5 px-3 text-right">Sent</th>
                            <th className="py-2.5 px-3 text-right">Delivered</th>
                            <th className="py-2.5 px-3 text-right">Replies (Rate)</th>
                            <th className="py-2.5 px-3 text-right text-[#0d9467]">Positive %</th>
                            <th className="py-2.5 px-3 text-right">Bounce %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0d1c15]/5">
                          {sequenceBreakdown?.map((step) => (
                            <tr key={step.step_number} className="hover:bg-[#00e599]/5 transition-colors">
                              <td className="py-2.5 px-3 font-bold font-mono">
                                #{step.step_number}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-[#0d1c15]">{step.title}</div>
                                <div className="text-[10px] text-[#0d1c15]/40 truncate max-w-xs">{step.subject}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">{step.sent}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{step.delivered}</td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                {step.replies} ({step.reply_rate}%)
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#0d9467]">
                                {step.positive_reply_rate}%
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-[#0d1c15]/70">
                                {step.bounce_rate}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* C. Reply Classification Sentiment Breakdown */}
                  <div>
                    <h4 className="text-sm font-bold text-[#0d1c15] mb-3">
                      Reply Classification & Intent Breakdown
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      {repliesBreakdown?.breakdown?.map((item) => (
                        <div
                          key={item.category}
                          className="bg-[#f7f5f0] p-3 rounded-xl border border-[#0d1c15]/5 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-[11px] text-[#0d1c15]/60 font-medium">
                              {item.label}
                            </div>
                            <div className="text-base font-bold text-[#0d1c15]">
                              {item.count}
                            </div>
                          </div>
                          <span className="text-xs font-mono font-semibold text-[#0d9467]">
                            {item.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Recent replies snippets */}
                    {repliesBreakdown?.recent_replies?.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <div className="text-xs font-semibold text-[#0d1c15]/70">
                          Recent Thread Summaries:
                        </div>
                        {repliesBreakdown.recent_replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="p-3 rounded-lg border border-[#0d1c15]/10 bg-white text-xs flex items-start justify-between gap-3"
                          >
                            <div>
                              <div className="font-semibold text-[#0d1c15]">
                                {reply.prospect_name} ({reply.prospect_email})
                              </div>
                              <div className="text-[#0d1c15]/60 text-[11px] mt-0.5">
                                "{reply.subject}"
                              </div>
                              {reply.summary && (
                                <p className="text-[11px] text-[#0d1c15]/80 mt-1 italic">
                                  {reply.summary}
                                </p>
                              )}
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00e599]/15 text-[#0d9467] border border-[#00e599]/30 shrink-0">
                              {reply.classification}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#0d1c15]/10 bg-[#f7f5f0]/40 flex justify-end">
              <button
                onClick={() => setSelectedCampaignId(null)}
                className="px-4 py-2 text-xs font-semibold bg-[#0d1c15] text-white rounded-lg hover:bg-[#0d1c15]/90 transition-colors shadow-xs"
              >
                Close Drilldown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
