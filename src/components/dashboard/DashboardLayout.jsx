import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Send,
  Mail,
  Linkedin,
  Inbox,
  Sparkles,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Menu,
  X,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Check,
  LogOut,
  Loader2,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import {
  INITIAL_METRICS,
  INITIAL_LINKEDIN_TASKS,
  INITIAL_CONVERSATIONS,
  INITIAL_SEQUENCES
} from '../../data/dashboardMockData';
import {
  fetchLeads,
  createLead,
  updateLead,
  deleteLead,
  bulkCreateLeads,
  fetchCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign
} from '../../lib/outreachService';

import OverviewView from './OverviewView';
import LeadsView from './LeadsView';
import CampaignsView from './CampaignsView';
import SequencesView from './SequencesView';
import LinkedInTasksView from './LinkedInTasksView';
import InboxView from './InboxView';
import AiResearchView from './AiResearchView';
import AnalyticsView from './AnalyticsView';
import CampaignAnalyticsView from './CampaignAnalyticsView';
import SettingsView from './SettingsView';
import FindLeadsView from './FindLeadsView';
import AiPersonalizationModal from './AiPersonalizationModal';

export default function DashboardLayout() {
  const { navigate } = useNavigation();
  const { user, profile, signOut } = useAuth();

  const [currentTab, setCurrentTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Data Loading & Error States
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Reactive State Store
  const [prospects, setProspects] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [linkedinTasks, setLinkedinTasks] = useState(INITIAL_LINKEDIN_TASKS);
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [sequences] = useState(INITIAL_SEQUENCES);
  const [activeResearchLead, setActiveResearchLead] = useState(null);

  // Workspaces
  const companyName = profile?.company_name || 'Acme Outbound';
  const userDisplayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'Admin User');
  const userInitials = userDisplayName.substring(0, 2).toUpperCase();

  const [workspaces, setWorkspaces] = useState([
    { id: 'ws-1', name: companyName, plan: 'Growth Plan', tag: 'Primary', initial: companyName.charAt(0).toUpperCase() },
    { id: 'ws-2', name: `${companyName} EMEA`, plan: 'Scale Plan', tag: 'Secondary', initial: 'E' },
    { id: 'ws-3', name: `${companyName} Pilots`, plan: 'Starter Plan', tag: 'Sandbox', initial: 'P' }
  ]);
  const [selectedWorkspace, setSelectedWorkspace] = useState({
    id: 'ws-1',
    name: companyName,
    plan: 'Growth Plan',
    tag: 'Primary',
    initial: companyName.charAt(0).toUpperCase()
  });
  const [newWorkspaceModal, setNewWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  // Fetch real data from Supabase
  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingData(true);
    setDataError(null);
    try {
      const [leadsData, campaignsData] = await Promise.all([
        fetchLeads(user.id),
        fetchCampaigns(user.id)
      ]);
      setProspects(leadsData);
      setCampaigns(campaignsData);
    } catch (err) {
      console.error('Error loading Supabase dashboard data:', err);
      setDataError('Could not load data from Supabase. Please ensure migrations are applied.');
    } finally {
      setIsLoadingData(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Compute live overview metrics
  const totalProspectsCount = prospects.length;
  const activeCampaignsCount = campaigns.filter((c) => c.status === 'Active').length;
  const repliedProspectsCount = prospects.filter((p) => p.status === 'Replied').length;
  const bookedProspectsCount = prospects.filter((p) => p.status === 'Meeting Booked').length;
  const replyRate = totalProspectsCount > 0 ? ((repliedProspectsCount / totalProspectsCount) * 100).toFixed(1) : '0.0';

  const metrics = {
    totalProspects: totalProspectsCount,
    activeCampaigns: activeCampaignsCount,
    emailsSent: campaigns.reduce((acc, c) => acc + (c.emailsSent || 0), 0) || 0,
    replyRate: parseFloat(replyRate),
    positiveReplies: repliedProspectsCount,
    meetingsBooked: bookedProspectsCount,
    inboxPlacement: 99.4,
    spamScore: 0.1,
    chartData: INITIAL_METRICS.chartData
  };

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'High-intent reply received',
      desc: 'Marcus Reed from Nexar Systems asked for demo Thursday 2:30 PM.',
      time: '18 mins ago',
      read: false
    },
    {
      id: 2,
      title: 'LinkedIn Task ready for review',
      desc: 'AI generated personalized connection note for Sarah Jenkins.',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      title: 'Daily warmup completed',
      desc: 'outreach@get-hyperflow.com reached 100% deliverability health score.',
      time: '4 hours ago',
      read: true
    }
  ]);

  // Lead handlers
  const handleAddLead = async (newLeadData) => {
    try {
      const created = await createLead(user.id, newLeadData);
      setProspects((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add lead:', err);
      alert('Failed to save lead to Supabase: ' + err.message);
    }
  };

  const handleUpdateLead = async (leadId, updates) => {
    try {
      const updated = await updateLead(leadId, updates);
      setProspects((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
    } catch (err) {
      console.error('Failed to update lead:', err);
      alert('Failed to update lead in Supabase: ' + err.message);
    }
  };

  const handleDeleteLead = async (leadId) => {
    try {
      await deleteLead(leadId);
      setProspects((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err) {
      console.error('Failed to delete lead:', err);
      alert('Failed to delete lead from Supabase: ' + err.message);
    }
  };

  const handleImportLeads = async (importedList) => {
    try {
      const createdList = await bulkCreateLeads(user.id, importedList);
      setProspects((prev) => [...createdList, ...prev]);
    } catch (err) {
      console.error('Failed to import leads:', err);
      alert('Failed to import leads to Supabase: ' + err.message);
    }
  };

  // Campaign handlers
  const handleAddCampaign = async (newCampData) => {
    try {
      const created = await createCampaign(user.id, newCampData);
      setCampaigns((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to create campaign:', err);
      alert('Failed to create campaign in Supabase: ' + err.message);
    }
  };

  const handleUpdateCampaign = async (campaignId, updates) => {
    try {
      const updated = await updateCampaign(campaignId, updates);
      setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? { ...c, ...updated } : c)));
    } catch (err) {
      console.error('Failed to update campaign:', err);
      alert('Failed to update campaign in Supabase: ' + err.message);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    try {
      await deleteCampaign(campaignId);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (err) {
      console.error('Failed to delete campaign:', err);
      alert('Failed to delete campaign from Supabase: ' + err.message);
    }
  };

  const handleToggleCampaignStatus = async (campId) => {
    const target = campaigns.find((c) => c.id === campId);
    if (!target) return;
    const nextStatus = target.status === 'Active' ? 'Paused' : 'Active';
    try {
      await updateCampaign(campId, { status: nextStatus });
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campId ? { ...c, status: nextStatus } : c))
      );
    } catch (err) {
      console.error('Failed to toggle campaign status:', err);
    }
  };

  const handleCompleteLinkedInTask = (taskId) => {
    setLinkedinTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'Completed' } : t))
    );
  };

  const handleReplyToConversation = (convId, newMsg) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            unread: false,
            lastMessageTime: 'Just now',
            snippet: `You: ${newMsg.text}`,
            history: [...c.history, newMsg]
          };
        }
        return c;
      })
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(PRODUCT_ROUTES.SIGN_IN);
  };

  // Global search filtering
  const searchResults = globalSearchQuery.trim()
    ? {
        prospects: prospects.filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(globalSearchQuery.toLowerCase())) ||
            (p.company && p.company.toLowerCase().includes(globalSearchQuery.toLowerCase())) ||
            (p.email && p.email.toLowerCase().includes(globalSearchQuery.toLowerCase()))
        ).slice(0, 3),
        campaigns: campaigns.filter(
          (c) =>
            (c.name && c.name.toLowerCase().includes(globalSearchQuery.toLowerCase())) ||
            (c.audience && c.audience.toLowerCase().includes(globalSearchQuery.toLowerCase()))
        ).slice(0, 2)
      }
    : null;

  const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'find-leads', label: 'Find Leads', icon: Search, badge: 'New', highlight: true },
    { id: 'leads', label: 'Prospects', icon: Users, badge: prospects.length.toString() },
    { id: 'campaigns', label: 'Campaigns', icon: Send, badge: `${activeCampaignsCount} Active` },
    { id: 'sequences', label: 'Sequences', icon: Mail },
    { id: 'tasks', label: 'LinkedIn Tasks', icon: Linkedin, badge: '3 Review' },
    { id: 'inbox', label: 'Unified Inbox', icon: Inbox, badge: '2 New' },
    { id: 'research', label: 'AI Deep Research', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Workspace Settings', icon: Settings }
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f7f5f0] text-[#0d1c15] flex font-sans antialiased selection:bg-[#00e599]/30">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          role="presentation"
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 1. Sidebar Navigation (Fixed height, independent scroll, collapsible) */}
      <aside
        className={`fixed lg:relative top-0 bottom-0 left-0 z-50 h-screen bg-[#fcfbf9] border-r border-[#0d1c15]/08 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 select-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64 w-64'}`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo & Collapse Toggle */}
          <div className={`border-b border-[#0d1c15]/08 ${sidebarCollapsed ? 'p-3 flex flex-col items-center gap-3' : 'p-4'}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center w-full' : 'justify-between mb-3'}`}>
              <button
                type="button"
                onClick={() => navigate(PRODUCT_ROUTES.OUTREACH)}
                className={`flex items-center gap-2 group cursor-pointer text-left ${sidebarCollapsed ? 'justify-center' : ''}`}
                title="OutLaunch Outreach"
              >
                <div className="w-8 h-8 rounded-xl bg-[#0d1c15] flex items-center justify-center text-[#00e599] font-bold text-sm shrink-0 shadow-2xs group-hover:bg-[#162b21] transition-colors">
                  O
                </div>
                {!sidebarCollapsed && (
                  <span className="font-display font-bold tracking-tight text-lg text-[#0d1c15] group-hover:text-[#0d9467] transition-colors truncate">
                    OutLaunch
                  </span>
                )}
              </button>

              {/* Desktop Collapse / Expand Toggle Button */}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`hidden lg:flex p-1.5 rounded-lg text-[#73827a] hover:text-[#0d1c15] hover:bg-[#edf2ec] transition-colors cursor-pointer ${
                  sidebarCollapsed ? 'w-full justify-center mt-1' : ''
                }`}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-[#0d9467]" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>

              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-[#73827a] hover:text-[#0d1c15] hover:bg-[#edf2ec]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Workspace Selector */}
            {!sidebarCollapsed ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                  className="w-full p-2 rounded-xl bg-[#edf2ec] hover:bg-[#dbe5da] transition-colors flex items-center justify-between text-left cursor-pointer border border-[#dbe5da]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-[#0d1c15] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {selectedWorkspace.initial}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#0d1c15] truncate">
                        {selectedWorkspace.name}
                      </div>
                      <div className="text-[10px] text-[#5a6962] font-mono leading-none">
                        {selectedWorkspace.plan}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#5a6962] shrink-0" />
                </button>

                {/* Workspace Dropdown */}
                {workspaceMenuOpen && (
                  <div
                    role="presentation"
                    className="absolute left-0 right-0 top-full mt-1.5 p-1.5 bg-white rounded-2xl shadow-xl border border-[#0d1c15]/10 z-50 text-xs animate-scaleUp"
                  >
                    <div className="px-2 py-1 text-[10px] font-mono uppercase text-[#73827a] font-semibold">
                      Workspaces
                    </div>
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          setSelectedWorkspace(ws);
                          setWorkspaceMenuOpen(false);
                        }}
                        className="w-full p-2 rounded-xl hover:bg-[#edf2ec] flex items-center justify-between text-left cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-[#0d1c15] text-white text-[10px] font-bold flex items-center justify-center">
                            {ws.initial}
                          </div>
                          <span className="font-medium text-[#0d1c15] truncate">{ws.name}</span>
                        </div>
                        {selectedWorkspace.id === ws.id && (
                          <Check className="w-3.5 h-3.5 text-[#0d9467]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Minimized Workspace Avatar */
              <div
                title={`${selectedWorkspace.name} (${selectedWorkspace.plan})`}
                className="w-9 h-9 rounded-xl bg-[#edf2ec] text-[#0d1c15] font-bold text-xs flex items-center justify-center border border-[#dbe5da] cursor-pointer hover:bg-[#dbe5da] transition-colors"
                onClick={() => setSidebarCollapsed(false)}
              >
                {selectedWorkspace.initial}
              </div>
            )}
          </div>

          {/* Navigation Links List (Scrollable if viewport is small) */}
          <nav className="p-2 space-y-1 mt-1 overflow-y-auto flex-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  title={sidebarCollapsed ? `${item.label} ${item.badge ? `(${item.badge})` : ''}` : undefined}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center rounded-xl text-xs font-medium transition-all cursor-pointer relative group ${
                    sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-[#0d1c15] text-white font-semibold shadow-xs'
                      : 'text-[#4a5851] hover:text-[#0d1c15] hover:bg-[#edf2ec]/70'
                  }`}
                >
                  <div className={`flex items-center gap-2.5 min-w-0 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-[#00e599] scale-105' : 'text-[#73827a] group-hover:scale-105'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {/* Badge in full mode */}
                  {!sidebarCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-[#182e24] text-[#00e599]'
                          : item.highlight
                          ? 'bg-[#0077b5]/15 text-[#0077b5]'
                          : 'bg-[#edf2ec] text-[#5a6962]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Dot indicator when collapsed */}
                  {sidebarCollapsed && item.badge && (
                    <span
                      className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                        item.highlight ? 'bg-[#0077b5]' : 'bg-[#00e599]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Credits & User Profile */}
        <div className={`border-t border-[#0d1c15]/08 ${sidebarCollapsed ? 'p-2 space-y-2 flex flex-col items-center' : 'p-3 space-y-3'}`}>
          {/* Credit Status Bar */}
          {!sidebarCollapsed ? (
            <div className="p-3 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#182e24] font-semibold mb-1">
                <span>SUPABASE STATUS</span>
                <span className="text-[#0d9467] font-bold">CONNECTED</span>
              </div>
              <div className="w-full h-1.5 bg-[#dbe5da] rounded-full overflow-hidden">
                <div className="w-full h-full bg-[#0d9467] rounded-full" />
              </div>
              <span className="text-[10px] text-[#5a6962] block mt-1">RLS Protected Session Active</span>
            </div>
          ) : (
            <div
              title="Supabase: Connected (RLS Active)"
              className="w-2.5 h-2.5 rounded-full bg-[#0d9467] my-1 ring-4 ring-[#edf2ec]"
            />
          )}

          {/* User Profile Pill */}
          {!sidebarCollapsed ? (
            <div className="p-2 rounded-xl bg-white border border-[#0d1c15]/08 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#0d1c15] text-[#00e599] font-bold text-xs flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#0d1c15] truncate">{userDisplayName}</div>
                  <div className="text-[10px] text-[#0d9467] font-mono font-semibold truncate">{user?.email || 'Authenticated'}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out of Supabase"
                className="text-[10px] font-mono text-[#73827a] hover:text-[#0d1c15] cursor-pointer flex items-center gap-1 p-1 hover:bg-[#edf2ec] rounded"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Minimized Profile & Logout */
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${userDisplayName} (${user?.email})`}
                className="w-9 h-9 rounded-full bg-[#0d1c15] text-[#00e599] font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer"
              >
                {userInitials}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 rounded-lg text-[#73827a] hover:text-[#0d1c15] hover:bg-[#edf2ec] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </aside>

      {/* 2. Main Content Area (Independently scrollable) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-[#f7f5f0]/90 backdrop-blur-md border-b border-[#0d1c15]/08 px-4 sm:px-8 h-16 flex items-center justify-between gap-4 shrink-0">
          
          {/* Left Title / Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[#0d1c15] hover:bg-[#edf2ec] rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Toggle for Collapsed Sidebar on Desktop */}
            {sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="hidden lg:flex p-2 text-[#73827a] hover:text-[#0d1c15] hover:bg-[#edf2ec] rounded-lg cursor-pointer transition-colors"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4 text-[#0d9467]" />
              </button>
            )}

            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <span className="text-[#73827a] hidden sm:inline">Workspace</span>
              <span className="text-[#73827a] hidden sm:inline">/</span>
              <span className="font-semibold text-[#0d1c15] capitalize font-display text-base">
                {NAV_ITEMS.find((n) => n.id === currentTab)?.label || 'Overview'}
              </span>
            </div>
          </div>

          {/* Center Global Search with Live Dropdown */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search prospects or campaigns..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-[#0d1c15]/10 bg-white text-[#0d1c15] placeholder-[#73827a] outline-none focus:border-[#0d9467] font-medium"
            />

            {/* Live Search Dropdown */}
            {isSearchFocused && searchResults && (
              <div
                role="presentation"
                className="absolute left-0 right-0 top-full mt-2 p-3 bg-white rounded-2xl shadow-xl border border-[#0d1c15]/10 z-50 text-xs animate-scaleUp"
              >
                {searchResults.prospects.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[10px] font-mono uppercase text-[#73827a] font-semibold block mb-1">
                      Prospects
                    </span>
                    {searchResults.prospects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setCurrentTab('leads');
                          setGlobalSearchQuery('');
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#edf2ec] cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-medium text-[#0d1c15]">{p.name} ({p.company})</span>
                        <span className="text-[10px] font-mono text-[#0d9467]">{p.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.campaigns.length > 0 && (
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#73827a] font-semibold block mb-1">
                      Campaigns
                    </span>
                    {searchResults.campaigns.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setCurrentTab('campaigns');
                          setGlobalSearchQuery('');
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#edf2ec] cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-medium text-[#0d1c15]">{c.name}</span>
                        <span className="text-[10px] font-mono text-[#0d9467]">{c.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.prospects.length === 0 && searchResults.campaigns.length === 0 && (
                  <div className="text-center py-2 text-xs text-[#73827a]">
                    No matching prospects or campaigns found.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-3">
            {/* Notifications Popover Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-[#5a6962] hover:text-[#0d1c15] hover:bg-[#edf2ec] rounded-xl transition-colors relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-[#0d9467] absolute top-1.5 right-1.5 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <div
                  role="presentation"
                  className="absolute right-0 top-full mt-2 w-80 p-3 bg-white rounded-2xl shadow-2xl border border-[#0d1c15]/10 z-50 animate-scaleUp"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#0d1c15]/08">
                    <span className="font-display font-bold text-xs text-[#0d1c15]">Notifications</span>
                    <span className="text-[10px] font-mono text-[#0d9467]">3 New Alerts</span>
                  </div>
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border text-xs ${
                          n.read ? 'bg-[#fcfbf9] border-[#0d1c15]/06' : 'bg-[#edf2ec]/60 border-[#dbe5da]'
                        }`}
                      >
                        <div className="font-semibold text-xs flex items-center justify-between mb-0.5">
                          <span>{n.title}</span>
                          <span className="text-[10px] font-mono text-[#73827a]">{n.time}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-[#4a5851]">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            <button
              type="button"
              onClick={() => setCurrentTab('leads')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <span>+ Add Prospect</span>
            </button>
          </div>
        </header>

        {/* View Router */}
        <main className="p-4 sm:p-8 flex-1">
          {dataError && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{dataError}</span>
              </div>
              <button
                type="button"
                onClick={loadDashboardData}
                className="px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 font-semibold cursor-pointer text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {currentTab === 'overview' && (
            <OverviewView
              metrics={metrics}
              campaigns={campaigns}
              prospects={prospects}
              linkedinTasks={linkedinTasks}
              onNavigate={(tab) => setCurrentTab(tab)}
              onToggleCampaignStatus={handleToggleCampaignStatus}
            />
          )}

          {currentTab === 'find-leads' && (
            <FindLeadsView
              userId={user?.id}
              existingLeads={prospects}
              campaigns={campaigns}
              onLeadsSaved={(savedList) => {
                setProspects((prev) => [...savedList, ...prev]);
              }}
              onOpenAiResearch={(lead) => {
                setActiveResearchLead(lead);
              }}
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'leads' && (
            <LeadsView
              prospects={prospects}
              userId={user?.id}
              onAddLead={handleAddLead}
              onUpdateLead={handleUpdateLead}
              onDeleteLead={handleDeleteLead}
              onImportLeads={handleImportLeads}
              isLoading={isLoadingData}
              error={dataError}
            />
          )}

          {currentTab === 'campaigns' && (
            <CampaignsView
              campaigns={campaigns}
              prospects={prospects}
              sequenceSteps={sequences[0]?.steps || []}
              onAddCampaign={handleAddCampaign}
              onUpdateCampaign={handleUpdateCampaign}
              onDeleteCampaign={handleDeleteCampaign}
              onToggleStatus={handleToggleCampaignStatus}
              onNavigate={(tab) => setCurrentTab(tab)}
              isLoading={isLoadingData}
              error={dataError}
            />
          )}

          {currentTab === 'sequences' && (
            <SequencesView
              sequences={sequences}
            />
          )}

          {currentTab === 'tasks' && (
            <LinkedInTasksView
              tasks={linkedinTasks}
              onCompleteTask={handleCompleteLinkedInTask}
            />
          )}

          {currentTab === 'inbox' && (
            <InboxView
              conversations={conversations}
              onReplyToConversation={handleReplyToConversation}
            />
          )}

          {currentTab === 'research' && (
            <AiResearchView />
          )}

          {currentTab === 'analytics' && (
            <CampaignAnalyticsView
              onNavigateToCampaigns={() => setCurrentTab('campaigns')}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* AI Personalization Modal from Find Leads / Prospects */}
      {activeResearchLead && (
        <AiPersonalizationModal
          lead={activeResearchLead}
          userId={user?.id}
          onClose={() => setActiveResearchLead(null)}
        />
      )}

    </div>
  );
}
