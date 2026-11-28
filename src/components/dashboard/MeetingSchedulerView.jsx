import React, { useState, useEffect, useMemo } from 'react';
import { MeetingsSkeleton } from '../ui/DashboardSkeleton';
import {
  Calendar,
  Clock,
  Video,
  User,
  Building,
  Mail,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  X,
  Sparkles,
  Link as LinkIcon,
  Copy,
  Check,
  Settings,
  ShieldCheck,
  CalendarDays,
  CalendarCheck,
  PhoneCall,
  ChevronRight,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Award,
} from 'lucide-react';
import {
  fetchMeetings,
  fetchCalendarSettings,
  updateCalendarSettings,
  fetchCalendarConnections,
  connectCalendar,
  disconnectCalendar,
  cancelMeeting,
  rescheduleMeeting,
  recordMeetingOutcome,
  fetchCalendarAvailability,
  aiSuggestMeetingSlots,
  aiParseSchedulingIntent,
} from '../../lib/outreachService';

export default function MeetingSchedulerView({ onNavigateToCrm }) {
  // Tabs: 'meetings' | 'availability' | 'connections' | 'ai-assistant'
  const [activeTab, setActiveTab] = useState('meetings');

  // Meeting Filters: 'upcoming' | 'today' | 'week' | 'completed' | 'cancelled' | 'all'
  const [meetingFilter, setMeetingFilter] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Data states
  const [meetings, setMeetings] = useState([]);
  const [totalMeetings, setTotalMeetings] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Settings & Connections
  const [rules, setRules] = useState(null);
  const [bookingPages, setBookingPages] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Copied booking link feedback
  const [copiedSlug, setCopiedSlug] = useState(false);

  // Action Modals
  const [outcomeModalMeeting, setOutcomeModalMeeting] = useState(null);
  const [outcomeType, setOutcomeType] = useState('Interested');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [outcomeNextAction, setOutcomeNextAction] = useState('');
  const [outcomeDealValue, setOutcomeDealValue] = useState('');
  const [outcomeNewStage, setOutcomeNewStage] = useState('Qualified');

  const [rescheduleModalMeeting, setRescheduleModalMeeting] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().split('T')[0];
  });
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [cancelModalMeeting, setCancelModalMeeting] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // AI Assistant Tab state
  const [aiTestReply, setAiTestReply] = useState(
    'Hi! I would love to see a demo of your outreach automation. Can we meet next Tuesday afternoon? I am in EST.'
  );
  const [aiDetectedIntent, setAiDetectedIntent] = useState(null);
  const [aiSuggestedSlots, setAiSuggestedSlots] = useState([]);
  const [aiDraftedMessage, setAiDraftedMessage] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // 1. Load Meetings
  const loadMeetings = async () => {
    setIsLoading(true);
    try {
      const res = await fetchMeetings({
        filter: meetingFilter,
        search: searchQuery,
        page,
        limit: 15,
      });
      setMeetings(res.meetings || []);
      setTotalMeetings(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 2. Load Calendar Settings & Connections
  const loadCalendarData = async () => {
    try {
      const [settingsRes, connRes] = await Promise.all([
        fetchCalendarSettings(),
        fetchCalendarConnections(),
      ]);
      setRules(settingsRes.rules);
      setBookingPages(settingsRes.bookingPages || []);
      setConnections(connRes.connections || []);
      setIsDemoMode(connRes.isDemoMode !== undefined ? connRes.isDemoMode : true);
    } catch (err) {
      console.error('Failed to load calendar settings:', err);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [meetingFilter, searchQuery, page]);

  useEffect(() => {
    loadCalendarData();
  }, []);

  // Quick stats
  const stats = useMemo(() => {
    const upcoming = meetings.filter(m => m.status === 'confirmed').length;
    const completed = meetings.filter(m => m.status === 'completed').length;
    return { upcoming, completed };
  }, [meetings]);

  // Copy Booking Link helper
  const primarySlug = bookingPages[0]?.slug || 'demo';
  const publicBookingUrl = `${window.location.origin}/book/${primarySlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicBookingUrl);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2500);
  };

  // Action: Save Availability Settings
  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    if (!rules) return;
    try {
      const updated = await updateCalendarSettings(rules);
      setRules(updated);
      setStatusMessage('Availability settings successfully saved.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  // Action: Connect Calendar (Demo Mode / Real OAuth)
  const handleConnectGoogleCalendar = async () => {
    try {
      const res = await connectCalendar({
        code: isDemoMode ? 'demo_auth_code' : undefined,
        redirectUri: window.location.href,
      });

      if (res.url) {
        window.location.href = res.url;
      } else {
        await loadCalendarData();
        setStatusMessage('Google Calendar connected successfully!');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      alert('Calendar connection error: ' + err.message);
    }
  };

  // Action: Cancel Meeting
  const handleConfirmCancel = async () => {
    if (!cancelModalMeeting) return;
    try {
      await cancelMeeting(cancelModalMeeting.id, cancelReason);
      setCancelModalMeeting(null);
      setCancelReason('');
      loadMeetings();
    } catch (err) {
      alert('Failed to cancel meeting: ' + err.message);
    }
  };

  // Action: Reschedule Meeting
  const handleLoadRescheduleSlots = async (targetDate) => {
    setRescheduleDate(targetDate);
    setSelectedRescheduleSlot(null);
    try {
      const data = await fetchCalendarAvailability({
        date: targetDate,
        timeZone: rules?.time_zone || 'UTC',
        duration: rules?.meeting_duration || 30,
      });
      setRescheduleSlots(data.slots || []);
    } catch {
      setRescheduleSlots([]);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleModalMeeting || !selectedRescheduleSlot) return;
    try {
      await rescheduleMeeting(rescheduleModalMeeting.id, {
        newStartTime: selectedRescheduleSlot.start_time,
        newEndTime: selectedRescheduleSlot.end_time,
        reason: rescheduleReason,
      });
      setRescheduleModalMeeting(null);
      setSelectedRescheduleSlot(null);
      setRescheduleReason('');
      loadMeetings();
    } catch (err) {
      alert('Failed to reschedule: ' + err.message);
    }
  };

  // Action: Record Outcome
  const handleConfirmOutcome = async () => {
    if (!outcomeModalMeeting) return;
    try {
      await recordMeetingOutcome(outcomeModalMeeting.id, {
        outcome: outcomeType,
        notes: outcomeNotes,
        nextAction: outcomeNextAction,
        dealValue: Number(outcomeDealValue) || 0,
        newStage: outcomeNewStage,
      });
      setOutcomeModalMeeting(null);
      setOutcomeNotes('');
      setOutcomeNextAction('');
      setOutcomeDealValue('');
      loadMeetings();
    } catch (err) {
      alert('Failed to record outcome: ' + err.message);
    }
  };

  // AI Assistant Testing Runner
  const handleRunAiAssistant = async () => {
    if (!aiTestReply.trim()) return;
    setIsAiProcessing(true);
    try {
      // 1. Parse intent
      const intent = await aiParseSchedulingIntent(aiTestReply);
      setAiDetectedIntent(intent);

      // 2. Suggest slots based on real availability
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 2); // Sample upcoming date
      const dateStr = targetDate.toISOString().split('T')[0];

      const suggestions = await aiSuggestMeetingSlots({
        targetDate: dateStr,
        timeOfDay: intent.timeOfDay || 'afternoon',
        timeZone: intent.detectedTimeZone || 'UTC',
        prospectName: 'Prospect',
      });

      setAiSuggestedSlots(suggestions.suggestedSlots || []);
      setAiDraftedMessage(suggestions.draftedMessage || '');
    } catch (err) {
      console.error('AI assistant error:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Live Scheduling Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#0d1c15]/08">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-[#0d1c15]">
              AI Meeting Booking & Calendar
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#0d9467]/15 text-[#0d9467] border border-[#0d9467]/20">
              Live Google Sync
            </span>
          </div>
          <p className="text-xs text-[#5a6962]">
            Convert interested prospects into booked meetings with automated calendar conflict checking and CRM synchronization.
          </p>
        </div>

        {/* Public Booking Link Card */}
        <div className="flex items-center gap-2 bg-[#edf2ec] border border-[#dbe5da] p-1.5 rounded-2xl">
          <div className="px-3 py-1 text-xs font-mono text-[#0d1c15] truncate max-w-[200px]">
            /book/{primarySlug}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-1.5 rounded-xl bg-white hover:bg-[#edf2ec] text-[#0d1c15] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-2xs border border-[#0d1c15]/06"
            title="Copy Public Booking Link"
          >
            {copiedSlug ? (
              <Check className="w-3.5 h-3.5 text-[#0d9467]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#5a6962]" />
            )}
            <span className="text-[11px] font-semibold">{copiedSlug ? 'Copied' : 'Copy'}</span>
          </button>
          <a
            href={`/book/${primarySlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white transition-colors cursor-pointer"
            title="Preview Public Booking Page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="p-3 rounded-2xl bg-[#00e599]/15 border border-[#00e599]/40 text-[#0d1c15] text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#0d9467]" />
          <span className="font-medium">{statusMessage}</span>
        </div>
      )}

      {/* 2. Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[#0d1c15]/08 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'meetings', label: 'Meetings List', icon: Calendar },
            { id: 'availability', label: 'Working Hours & Buffers', icon: Clock },
            { id: 'connections', label: 'Calendar Accounts', icon: ShieldCheck },
            { id: 'ai-assistant', label: 'AI Scheduling Assistant', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0d1c15] text-[#00e599] shadow-xs'
                    : 'text-[#5a6962] hover:text-[#0d1c15] hover:bg-[#edf2ec]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setIsRefreshing(true);
            loadMeetings();
            loadCalendarData();
          }}
          className="p-2 rounded-xl text-[#5a6962] hover:text-[#0d1c15] hover:bg-[#edf2ec] transition-colors cursor-pointer"
          title="Refresh calendar state"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* TAB 1: MEETINGS LIST */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-[#edf2ec] p-1 rounded-2xl overflow-x-auto">
              {[
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'completed', label: 'Completed' },
                { id: 'cancelled', label: 'Cancelled' },
                { id: 'all', label: 'All' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setMeetingFilter(f.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    meetingFilter === f.id
                      ? 'bg-white text-[#0d1c15] shadow-xs'
                      : 'text-[#5a6962] hover:text-[#0d1c15]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search prospect or company..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-[#0d1c15]/10 text-xs text-[#0d1c15] placeholder-[#73827a] outline-none focus:border-[#0d9467]"
              />
            </div>
          </div>

          {/* Meetings Cards Grid / List */}
          {isLoading ? (
            <MeetingsSkeleton />
          ) : meetings.length === 0 ? (
            <div className="p-12 text-center text-xs bg-white rounded-3xl border border-[#0d1c15]/06 text-[#73827a]">
              <CalendarDays className="w-10 h-10 text-[#dbe5da] mx-auto mb-2" />
              <div className="font-semibold text-sm text-[#0d1c15] mb-1">No Meetings Found</div>
              <p className="max-w-md mx-auto text-xs text-[#5a6962] mb-4">
                Share your public booking link with prospects or trigger AI scheduling from inbound replies.
              </p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0d1c15] text-[#00e599] text-xs font-bold cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Copy Public Booking Link</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {meetings.map((meeting) => {
                const startObj = new Date(meeting.start_time);
                const isConfirmed = meeting.status === 'confirmed';
                const isCompleted = meeting.status === 'completed';
                const isCancelled = meeting.status === 'cancelled';

                return (
                  <div
                    key={meeting.id}
                    className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 hover:border-[#0d9467]/30 transition-all flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      {/* Status & Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                            isConfirmed
                              ? 'bg-[#00e599]/20 text-[#0d9467] border border-[#00e599]/40'
                              : isCompleted
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : isCancelled
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {meeting.status}
                        </span>

                        <span className="text-[10px] font-mono text-[#73827a] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          30m
                        </span>
                      </div>

                      {/* Prospect Info */}
                      <h3 className="font-bold text-sm text-[#0d1c15] leading-tight mb-0.5">
                        {meeting.prospect_name}
                      </h3>
                      <div className="text-xs text-[#5a6962] font-medium flex items-center gap-1 mb-2">
                        <Building className="w-3 h-3 text-[#73827a]" />
                        <span>{meeting.prospect_company || 'Inbound Prospect'}</span>
                      </div>

                      {/* Meeting Time */}
                      <div className="p-2.5 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs text-[#0d1c15] mb-3">
                        <div className="font-semibold text-xs">
                          {startObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[11px] text-[#5a6962] font-mono">
                          {startObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({meeting.time_zone || 'UTC'})
                        </div>
                      </div>

                      {/* Video Link */}
                      {meeting.meeting_link && (
                        <div className="mb-3">
                          <a
                            href={meeting.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#0d9467] hover:underline font-semibold"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Join Video Call</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-[#0d1c15]/06 flex items-center justify-between gap-2">
                      {isConfirmed && (
                        <>
                          <button
                            type="button"
                            onClick={() => setOutcomeModalMeeting(meeting)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#0d9467] hover:bg-[#0b7c56] text-white text-[11px] font-semibold transition-colors cursor-pointer flex-1"
                          >
                            Record Outcome
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleModalMeeting(meeting);
                              handleLoadRescheduleSlots(rescheduleDate);
                            }}
                            className="px-2 py-1.5 rounded-xl bg-[#edf2ec] hover:bg-[#dbe5da] text-[#0d1c15] text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelModalMeeting(meeting)}
                            className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Cancel Meeting"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {isCompleted && (
                        <div className="text-[11px] text-[#0d9467] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Outcome Recorded</span>
                        </div>
                      )}

                      {isCancelled && (
                        <div className="text-[11px] text-red-600 italic truncate">
                          {meeting.cancellation_reason || 'Cancelled'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-[#5a6962]">
              <div>
                Showing page {page} of {totalPages} ({totalMeetings} meetings)
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 rounded-xl bg-white border border-[#0d1c15]/10 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 rounded-xl bg-white border border-[#0d1c15]/10 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AVAILABILITY SETTINGS */}
      {activeTab === 'availability' && rules && (
        <form onSubmit={handleSaveAvailability} className="max-w-3xl bg-white p-6 sm:p-8 rounded-3xl border border-[#0d1c15]/08 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-[#0d1c15]">Working Days & Scheduling Horizon</h2>
            <p className="text-xs text-[#5a6962]">
              Configure when prospects are permitted to schedule meetings on your calendar.
            </p>
          </div>

          {/* Working Days */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-[#73827a] font-semibold mb-2">
              Working Days
            </label>
            <div className="flex flex-wrap gap-2">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                const isChecked = (rules.working_days || []).includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const cur = rules.working_days || [];
                      const next = isChecked ? cur.filter(d => d !== day) : [...cur, day];
                      setRules({ ...rules, working_days: next });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                      isChecked
                        ? 'bg-[#0d1c15] text-[#00e599] shadow-xs'
                        : 'bg-[#edf2ec] text-[#73827a] hover:bg-[#dbe5da]'
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Working Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Day Start Time
              </label>
              <input
                type="time"
                value={rules.working_hours_start || '09:00'}
                onChange={(e) => setRules({ ...rules, working_hours_start: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono font-medium outline-none focus:border-[#0d9467]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Day End Time
              </label>
              <input
                type="time"
                value={rules.working_hours_end || '17:00'}
                onChange={(e) => setRules({ ...rules, working_hours_end: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono font-medium outline-none focus:border-[#0d9467]"
              />
            </div>
          </div>

          {/* Durations & Buffers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Default Duration
              </label>
              <select
                value={rules.meeting_duration || 30}
                onChange={(e) => setRules({ ...rules, meeting_duration: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs outline-none focus:border-[#0d9467] cursor-pointer"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Buffer Before (Mins)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={rules.buffer_before !== undefined ? rules.buffer_before : 10}
                onChange={(e) => setRules({ ...rules, buffer_before: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs outline-none focus:border-[#0d9467]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Buffer After (Mins)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={rules.buffer_after !== undefined ? rules.buffer_after : 10}
                onChange={(e) => setRules({ ...rules, buffer_after: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs outline-none focus:border-[#0d9467]"
              />
            </div>
          </div>

          {/* Minimum notice & Horizon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Minimum Scheduling Notice (Hours)
              </label>
              <input
                type="number"
                min="1"
                value={rules.min_notice_hours || 4}
                onChange={(e) => setRules({ ...rules, min_notice_hours: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs outline-none focus:border-[#0d9467]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Max Booking Horizon (Days)
              </label>
              <input
                type="number"
                min="1"
                value={rules.max_horizon_days || 30}
                onChange={(e) => setRules({ ...rules, max_horizon_days: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs outline-none focus:border-[#0d9467]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#0d1c15]/08 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0d1c15] text-[#00e599] font-bold text-xs hover:bg-[#162b21] transition-colors cursor-pointer"
            >
              Save Availability Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: CALENDAR ACCOUNTS */}
      {activeTab === 'connections' && (
        <div className="max-w-3xl space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-[#0d1c15]/08">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0d1c15]">Google Calendar Integration</h3>
                  <p className="text-xs text-[#5a6962]">
                    Sync free/busy intervals, generate Google Meet video links, and create invites automatically.
                  </p>
                </div>
              </div>

              {isDemoMode && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Demo Mode Active
                </span>
              )}
            </div>

            {connections.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#edf2ec] border border-[#dbe5da] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-[#5a6962]">
                  No calendar connected. Connect Google Calendar to enable live availability lookups.
                </div>
                <button
                  type="button"
                  onClick={handleConnectGoogleCalendar}
                  className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Connect Google Calendar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="p-4 rounded-2xl bg-[#edf2ec] border border-[#dbe5da] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-[#0d1c15]/10 flex items-center justify-center text-[#0d9467]">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[#0d1c15]">
                          {conn.account_email}
                        </div>
                        <div className="text-[10px] font-mono text-[#5a6962]">
                          Calendar: {conn.calendar_name || 'Primary'} • Status: {conn.status}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        await disconnectCalendar(conn.id);
                        loadCalendarData();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 text-xs font-medium border border-[#0d1c15]/10 transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AI SCHEDULING ASSISTANT */}
      {activeTab === 'ai-assistant' && (
        <div className="max-w-3xl bg-white p-6 sm:p-8 rounded-3xl border border-[#0d1c15]/08 space-y-6 shadow-xs">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-[#0d9467]" />
              <h2 className="text-base font-bold text-[#0d1c15]">AI Reply Intent & Slot Recommender</h2>
            </div>
            <p className="text-xs text-[#5a6962]">
              The AI assistant scans incoming emails, detects requested dates/times, checks your actual calendar availability, and drafts ready-to-review replies.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#73827a] font-semibold mb-1">
              Inbound Email Reply Text
            </label>
            <textarea
              rows="3"
              value={aiTestReply}
              onChange={(e) => setAiTestReply(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#edf2ec] border border-[#dbe5da] text-xs text-[#0d1c15] outline-none focus:border-[#0d9467] font-medium"
            />
          </div>

          <button
            type="button"
            disabled={isAiProcessing}
            onClick={handleRunAiAssistant}
            className="px-5 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] disabled:opacity-40 text-[#00e599] font-bold text-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            {isAiProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#00e599] border-t-transparent rounded-full animate-spin" />
                <span>Scanning Availability...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Parse Intent & Suggest Slots</span>
              </>
            )}
          </button>

          {aiDetectedIntent && (
            <div className="p-4 rounded-2xl bg-[#edf2ec] border border-[#dbe5da] space-y-3 animate-fadeIn text-xs">
              <div className="font-semibold text-xs text-[#0d1c15] flex items-center justify-between pb-2 border-b border-[#0d1c15]/08">
                <span>Detected Scheduling Intent</span>
                <span className="font-mono text-[#0d9467]">
                  Confidence: {Math.round(aiDetectedIntent.confidence * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-[#73827a] block">Target Day:</span>
                  <span className="font-semibold capitalize text-[#0d1c15]">
                    {aiDetectedIntent.proposedDay || 'Any Day'}
                  </span>
                </div>
                <div>
                  <span className="text-[#73827a] block">Time of Day:</span>
                  <span className="font-semibold capitalize text-[#0d1c15]">
                    {aiDetectedIntent.timeOfDay}
                  </span>
                </div>
                <div>
                  <span className="text-[#73827a] block">Timezone:</span>
                  <span className="font-semibold text-[#0d1c15]">
                    {aiDetectedIntent.detectedTimeZone || 'UTC'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {aiDraftedMessage && (
            <div className="space-y-2 animate-fadeIn">
              <label className="block text-[11px] font-mono uppercase text-[#73827a] font-semibold">
                Drafted Reply for Sales Rep Review (Not Auto-Sent)
              </label>
              <div className="p-4 rounded-2xl bg-white border border-[#0d9467]/40 shadow-xs font-mono text-xs text-[#0d1c15] whitespace-pre-wrap leading-relaxed">
                {aiDraftedMessage}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: RECORD OUTCOME */}
      {outcomeModalMeeting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#0d1c15]/10 shadow-2xl animate-scaleUp space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#0d1c15]/08">
              <div>
                <h3 className="font-bold text-sm text-[#0d1c15]">Record Meeting Outcome</h3>
                <p className="text-xs text-[#5a6962]">{outcomeModalMeeting.prospect_name} ({outcomeModalMeeting.prospect_company || 'Lead'})</p>
              </div>
              <button
                type="button"
                onClick={() => setOutcomeModalMeeting(null)}
                className="p-1 rounded-lg text-[#73827a] hover:bg-[#edf2ec]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Outcome Category *
              </label>
              <select
                value={outcomeType}
                onChange={(e) => setOutcomeType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs font-semibold"
              >
                <option value="Interested">Interested</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal Requested">Proposal Requested</option>
                <option value="Follow-up Required">Follow-up Required</option>
                <option value="Not Interested">Not Interested</option>
                <option value="No Show">No Show</option>
                <option value="Rescheduled">Rescheduled</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Meeting Notes & Feedback
              </label>
              <textarea
                rows="2"
                placeholder="Key requirements, objections, or decision criteria discussed..."
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                  Next Action (Creates Task)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Send custom pricing proposal"
                  value={outcomeNextAction}
                  onChange={(e) => setOutcomeNextAction(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                  Estimated Deal Value ($)
                </label>
                <input
                  type="number"
                  placeholder="25000"
                  value={outcomeDealValue}
                  onChange={(e) => setOutcomeDealValue(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Pipeline Stage Move
              </label>
              <select
                value={outcomeNewStage}
                onChange={(e) => setOutcomeNewStage(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs font-semibold"
              >
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
                <option value="Engaged">Engaged</option>
                <option value="Won">Won (Confirmed Payment)</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            <div className="pt-3 border-t border-[#0d1c15]/08 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOutcomeModalMeeting(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#5a6962] hover:bg-[#edf2ec]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOutcome}
                className="px-4 py-2 rounded-xl bg-[#0d1c15] text-[#00e599] font-bold text-xs"
              >
                Save Outcome & Sync CRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RESCHEDULE */}
      {rescheduleModalMeeting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#0d1c15]/10 shadow-2xl animate-scaleUp space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#0d1c15]/08">
              <h3 className="font-bold text-sm text-[#0d1c15]">Reschedule Meeting</h3>
              <button
                type="button"
                onClick={() => setRescheduleModalMeeting(null)}
                className="p-1 rounded-lg text-[#73827a] hover:bg-[#edf2ec]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Pick New Date
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => handleLoadRescheduleSlots(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Available Slots ({rescheduleDate})
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                {rescheduleSlots.map((slot) => {
                  const isPicked = selectedRescheduleSlot?.start_time === slot.start_time;
                  return (
                    <button
                      key={slot.start_time}
                      type="button"
                      onClick={() => setSelectedRescheduleSlot(slot)}
                      className={`p-2 rounded-xl text-xs font-semibold text-center border cursor-pointer ${
                        isPicked
                          ? 'bg-[#0d1c15] text-[#00e599] border-[#0d1c15]'
                          : 'bg-[#edf2ec] text-[#0d1c15] border-[#dbe5da]'
                      }`}
                    >
                      {slot.display_time}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Prospect requested later time"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs"
              />
            </div>

            <div className="pt-3 border-t border-[#0d1c15]/08 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleModalMeeting(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#5a6962]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedRescheduleSlot}
                onClick={handleConfirmReschedule}
                className="px-4 py-2 rounded-xl bg-[#0d1c15] text-[#00e599] font-bold text-xs disabled:opacity-40"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCEL */}
      {cancelModalMeeting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#0d1c15]/10 shadow-2xl animate-scaleUp space-y-4">
            <h3 className="font-bold text-sm text-[#0d1c15]">Cancel Scheduled Meeting</h3>
            <p className="text-xs text-[#5a6962]">
              Are you sure you want to cancel the meeting with {cancelModalMeeting.prospect_name}? This will remove the calendar event and cancel scheduled reminders without marking the lead as Lost.
            </p>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                Cancellation Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Prospect scheduling conflict"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs"
              />
            </div>

            <div className="pt-3 border-t border-[#0d1c15]/08 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModalMeeting(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#5a6962]"
              >
                Keep Meeting
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                Yes, Cancel Meeting
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
