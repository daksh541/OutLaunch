import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import {
  INITIAL_METRICS,
  INITIAL_PROSPECTS,
  INITIAL_CAMPAIGNS,
  INITIAL_LINKEDIN_TASKS,
  INITIAL_CONVERSATIONS,
  INITIAL_SEQUENCES
} from '../../data/dashboardMockData';

import OverviewView from './OverviewView';
import LeadsView from './LeadsView';
import CampaignsView from './CampaignsView';
import SequencesView from './SequencesView';
import LinkedInTasksView from './LinkedInTasksView';
import InboxView from './InboxView';
import AiResearchView from './AiResearchView';
import AnalyticsView from './AnalyticsView';
import SettingsView from './SettingsView';

export default function DashboardLayout() {
  const { navigate } = useNavigation();
  const [currentTab, setCurrentTab] = useState('overview'); // overview, leads, campaigns, sequences, tasks, inbox, research, analytics, settings
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Workspace Switcher State
  const [workspaces, setWorkspaces] = useState([
    { id: 'ws-1', name: 'Acme Outbound', plan: 'Growth Plan', tag: 'Primary', initial: 'A' },
    { id: 'ws-2', name: 'Acme EMEA Expansion', plan: 'Scale Plan', tag: 'Secondary', initial: 'E' },
    { id: 'ws-3', name: 'Acme Founder Pilots', plan: 'Starter Plan', tag: 'Sandbox', initial: 'F' }
  ]);
  const [selectedWorkspace, setSelectedWorkspace] = useState({
    id: 'ws-1',
    name: 'Acme Outbound',
    plan: 'Growth Plan',
    tag: 'Primary',
    initial: 'A'
  });
  const [newWorkspaceModal, setNewWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  // Reactive State Store
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [prospects, setProspects] = useState(INITIAL_PROSPECTS);
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [linkedinTasks, setLinkedinTasks] = useState(INITIAL_LINKEDIN_TASKS);
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [sequences] = useState(INITIAL_SEQUENCES);

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

  // Handlers
  const handleAddLead = (newLead) => {
    setProspects((prev) => [newLead, ...prev]);
    setMetrics((prev) => ({
      ...prev,
      totalProspects: prev.totalProspects + 1
    }));
  };

  const handleImportLeads = (newLeads) => {
    setProspects((prev) => [...newLeads, ...prev]);
    setMetrics((prev) => ({
      ...prev,
      totalProspects: prev.totalProspects + newLeads.length
    }));
  };

  const handleAddCampaign = (newCamp) => {
    setCampaigns((prev) => [newCamp, ...prev]);
    setMetrics((prev) => ({
      ...prev,
      activeCampaigns: prev.activeCampaigns + 1
    }));
  };

  const handleToggleCampaignStatus = (campId) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === campId) {
          const nextStatus = c.status === 'Active' ? 'Paused' : 'Active';
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const handleCompleteLinkedInTask = (taskId) => {
    setLinkedinTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return { ...t, status: 'Completed' };
        }
        return t;
      })
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

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
  };

  const pendingTaskCount = linkedinTasks.filter(t => t.status === 'Pending').length;
  const unreadInboxCount = conversations.filter(c => c.unread).length;
  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users, badge: prospects.length },
    { id: 'campaigns', label: 'Campaigns', icon: Send, badge: campaigns.filter(c => c.status === 'Active').length },
    { id: 'sequences', label: 'Email sequences', icon: Mail },
    { id: 'tasks', label: 'LinkedIn tasks', icon: Linkedin, badge: pendingTaskCount > 0 ? `${pendingTaskCount} pending` : null, highlight: true },
    { id: 'inbox', label: 'Inbox', icon: Inbox, badge: unreadInboxCount > 0 ? unreadInboxCount : null },
    { id: 'research', label: 'AI research', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Global search matching
  const searchResults = globalSearchQuery.trim().length > 1
    ? prospects.filter(p => p.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || p.company.toLowerCase().includes(globalSearchQuery.toLowerCase())).slice(0, 4)
    : [];

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#0d1c15] flex font-sans antialiased">
      
      {/* 1. Persistent Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col justify-between w-64 bg-white border-r border-[#0d1c15]/08 h-screen sticky top-0 z-40 select-none">
        
        {/* Top: Logo & Workspace Selector */}
        <div>
          {/* Brand Wordmark */}
          <div className="px-5 py-4 border-b border-[#0d1c15]/08 flex items-center justify-between">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate(PRODUCT_ROUTES.OUTREACH);
              }}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#0d1c15] text-[#00e599] flex items-center justify-center font-mono font-bold text-xs shadow-2xs group-hover:scale-105 transition-transform">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#00e599" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.8" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-base tracking-tight text-[#0d1c15] leading-none">
                  Explee
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#73827a] leading-tight font-medium">
                  Outreach Workspace
                </span>
              </div>
            </a>

            <button
              type="button"
              onClick={() => navigate(PRODUCT_ROUTES.OUTREACH)}
              title="Return to Landing Page"
              className="p-1 rounded-md text-[#73827a] hover:text-[#0d1c15] hover:bg-[#edf2ec] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Workspace Switcher */}
          <div className="p-3 relative">
            <button
              type="button"
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="w-full p-2.5 rounded-xl bg-[#fcfbf9] hover:bg-[#edf2ec] border border-[#0d1c15]/08 transition-colors flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-md bg-[#0d1c15] text-white flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                  {selectedWorkspace.initial}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#0d1c15] truncate">{selectedWorkspace.name}</div>
                  <div className="text-[10px] text-[#73827a] truncate font-mono">{selectedWorkspace.tag} · {selectedWorkspace.plan}</div>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-[#73827a] group-hover:text-[#0d1c15] transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Workspace Dropdown Menu */}
            {workspaceMenuOpen && (
              <div className="absolute top-16 left-3 right-3 bg-white rounded-2xl shadow-xl border border-[#0d1c15]/10 p-2 z-50 animate-scaleUp space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-mono text-[#73827a] uppercase font-bold">
                  Switch Workspace
                </div>
                {workspaces.map((ws) => {
                  const isSelected = ws.id === selectedWorkspace.id;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        setSelectedWorkspace(ws);
                        setWorkspaceMenuOpen(false);
                      }}
                      className={`w-full p-2 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#edf2ec] font-semibold text-[#0d1c15]' : 'hover:bg-[#fcfbf9] text-[#4a5851]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded bg-[#0d1c15] text-white flex items-center justify-center font-mono text-[9px] font-bold shrink-0">
                          {ws.initial}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-semibold">{ws.name}</div>
                          <div className="text-[10px] text-[#73827a] font-mono">{ws.plan}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#0d9467] shrink-0" />}
                    </button>
                  );
                })}

                <div className="pt-1 mt-1 border-t border-[#0d1c15]/08">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      setNewWorkspaceModal(true);
                    }}
                    className="w-full p-2 text-left text-xs font-semibold text-[#0d9467] hover:bg-[#edf2ec] rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>+ Add New Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links List */}
          <nav className="px-3 space-y-1 mt-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0d1c15] text-white font-semibold shadow-xs'
                      : 'text-[#4a5851] hover:text-[#0d1c15] hover:bg-[#edf2ec]/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#00e599]' : 'text-[#73827a]'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
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
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Credits & User Profile */}
        <div className="p-3 border-t border-[#0d1c15]/08 space-y-3">
          {/* Free Credit Status Bar */}
          <div className="p-3 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#182e24] font-semibold mb-1">
              <span>CREDITS REMAINING</span>
              <span className="text-[#0d9467] font-bold">$24.60</span>
            </div>
            <div className="w-full h-1.5 bg-[#dbe5da] rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-[#0d9467] rounded-full" />
            </div>
            <span className="text-[10px] text-[#5a6962] block mt-1">~820 verified emails left</span>
          </div>

          {/* User Profile Pill */}
          <div className="p-2 rounded-xl bg-white border border-[#0d1c15]/08 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0d1c15] text-[#00e599] font-bold text-xs flex items-center justify-center shrink-0">
                AD
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#0d1c15] truncate">admin@company.com</div>
                <div className="text-[10px] text-[#0d9467] font-mono font-semibold">Growth Tier · Verified</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
              title="Sign out / Switch account"
              className="text-[10px] font-mono text-[#73827a] hover:text-[#0d1c15] cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>

      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-[#f7f5f0]/90 backdrop-blur-md border-b border-[#0d1c15]/08 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left Title / Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[#0d1c15] hover:bg-[#edf2ec] rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <span className="text-[#73827a] hidden sm:inline">Workspace</span>
              <span className="text-[#73827a] hidden sm:inline">/</span>
              <span className="font-semibold text-[#0d1c15] capitalize font-display text-base">
                {NAV_ITEMS.find(n => n.id === currentTab)?.label || 'Overview'}
              </span>
            </div>
          </div>

          {/* Center Global Search with Live Dropdown */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search prospects, campaigns, or domains (e.g. Sarah, Series A)..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-[#0d1c15]/10 bg-white text-[#0d1c15] placeholder-[#73827a] outline-none focus:border-[#0d9467] font-medium"
            />

            {/* Live Search Results Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-10 left-0 right-0 bg-white rounded-2xl shadow-xl border border-[#0d1c15]/10 p-2 space-y-1 z-50">
                <div className="px-3 py-1 text-[10px] font-mono text-[#73827a] uppercase font-bold">Matching Prospects</div>
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setCurrentTab('leads');
                      setGlobalSearchQuery('');
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-[#edf2ec] text-xs flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-[#0d1c15]">{p.name}</div>
                      <div className="text-[11px] text-[#5a6962]">{p.title} @ {p.company}</div>
                    </div>
                    <span className="font-mono text-[10px] text-[#0d9467] font-bold">{p.fitScore}% FIT</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Controls: Notifications & Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="View notifications"
                className="relative p-2 rounded-xl text-[#0d1c15] hover:bg-[#edf2ec] transition-colors cursor-pointer border border-[#0d1c15]/08"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00e599] ring-2 ring-white" />
                )}
              </button>

              {notificationsOpen && (
                <div
                  role="dialog"
                  aria-label="Notifications"
                  className="absolute right-0 top-12 w-80 sm:w-92 bg-white rounded-2xl shadow-2xl border border-[#0d1c15]/10 p-4 space-y-3 z-50 animate-scaleUp text-[#0d1c15]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#0d1c15]/08">
                    <span className="font-semibold text-xs font-mono uppercase text-[#0d1c15]">Notifications</span>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-[11px] font-mono text-[#0d9467] hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border text-xs ${
                          n.read ? 'bg-[#fcfbf9] border-[#0d1c15]/06 text-[#5a6962]' : 'bg-[#edf2ec]/50 border-[#dbe5da] text-[#0d1c15] font-medium'
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
              <span>+ Add Lead</span>
            </button>
          </div>
        </header>

        {/* View Router */}
        <main className="p-4 sm:p-8 flex-1">
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

          {currentTab === 'leads' && (
            <LeadsView
              prospects={prospects}
              onAddLead={handleAddLead}
              onImportLeads={handleImportLeads}
            />
          )}

          {currentTab === 'campaigns' && (
            <CampaignsView
              campaigns={campaigns}
              onAddCampaign={handleAddCampaign}
              onToggleStatus={handleToggleCampaignStatus}
              onNavigate={(tab) => setCurrentTab(tab)}
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
            <AnalyticsView
              metrics={metrics}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            onClick={(e) => e.stopPropagation()}
            className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-2xl animate-scaleUp"
          >
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0d1c15]/08">
                <span className="font-display font-bold text-base text-[#0d1c15]">Explee Workspace</span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-[#73827a] hover:text-[#0d1c15]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCurrentTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                        isActive
                          ? 'bg-[#0d1c15] text-white shadow-xs'
                          : 'text-[#4a5851] hover:text-[#0d1c15] hover:bg-[#edf2ec]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#00e599]' : 'text-[#73827a]'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#edf2ec] text-[#0d1c15]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#0d1c15]/08">
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  navigate(PRODUCT_ROUTES.OUTREACH);
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#edf2ec] text-[#0d1c15] font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Landing Page</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Workspace Modal */}
      {newWorkspaceModal && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
          onClick={() => setNewWorkspaceModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create Workspace"
            className="w-full max-w-md bg-white rounded-3xl border border-[#0d1c15]/10 shadow-2xl p-6 sm:p-7 space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#0d1c15]/08 pb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-[#0d1c15]">Create Workspace</h3>
                <p className="text-xs text-[#73827a] mt-0.5">Separate campaigns, prospects, and sender mailboxes</p>
              </div>
              <button
                type="button"
                onClick={() => setNewWorkspaceModal(false)}
                className="p-1 rounded-lg text-[#73827a] hover:text-[#0d1c15]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newWorkspaceName.trim()) return;
                const newWs = {
                  id: `ws-${Date.now()}`,
                  name: newWorkspaceName.trim(),
                  plan: 'Starter Plan',
                  tag: 'Sandbox',
                  initial: newWorkspaceName.trim().charAt(0).toUpperCase()
                };
                setWorkspaces(prev => [...prev, newWs]);
                setSelectedWorkspace(newWs);
                setNewWorkspaceName('');
                setNewWorkspaceModal(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-mono font-semibold text-[#0d1c15] uppercase tracking-wide">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Enterprise Outbound"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#0d1c15]/15 bg-white text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewWorkspaceModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#0d1c15]/15 text-xs sm:text-sm font-semibold text-[#0d1c15] hover:bg-[#fcfbf9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm"
                >
                  Create &amp; Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
