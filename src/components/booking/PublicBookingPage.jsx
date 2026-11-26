import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Globe,
  User,
  Mail,
  Building,
  FileText,
  CheckCircle2,
  AlertCircle,
  Video,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  fetchPublicBookingPage,
  fetchPublicAvailability,
  bookMeetingPublic,
} from '../../lib/outreachService';

export default function PublicBookingPage({ bookingSlug }) {
  const [pageData, setPageData] = useState(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [pageError, setPageError] = useState(null);

  // Time zone
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );

  // Date selection
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Default to tomorrow if today is past working hours or weekend
    const target = new Date(today);
    target.setDate(target.getDate() + 1);
    return target.toISOString().split('T')[0];
  });

  const [monthOffset, setMonthOffset] = useState(0);

  // Slots
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Form inputs
  const [prospectName, setProspectName] = useState('');
  const [prospectEmail, setProspectEmail] = useState('');
  const [prospectCompany, setProspectCompany] = useState('');
  const [prospectNotes, setProspectNotes] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Anti-spam

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // 1. Load Page Data
  useEffect(() => {
    let isMounted = true;
    async function loadPage() {
      setIsLoadingPage(true);
      setPageError(null);
      try {
        const slug = bookingSlug || 'demo';
        const page = await fetchPublicBookingPage(slug);
        if (isMounted) setPageData(page);
      } catch (err) {
        if (isMounted) setPageError(err.message || 'Booking page not found.');
      } finally {
        if (isMounted) setIsLoadingPage(false);
      }
    }
    loadPage();
    return () => { isMounted = false; };
  }, [bookingSlug]);

  // 2. Load Available Slots when Date, Slug, or TimeZone changes
  useEffect(() => {
    if (!selectedDate || !bookingSlug) return;
    let isMounted = true;
    async function loadSlots() {
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const data = await fetchPublicAvailability(bookingSlug, {
          date: selectedDate,
          timeZone,
        });
        if (isMounted) {
          setAvailableSlots(data.slots || []);
        }
      } catch (err) {
        if (isMounted) {
          setAvailableSlots([]);
        }
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    }
    loadSlots();
    return () => { isMounted = false; };
  }, [bookingSlug, selectedDate, timeZone]);

  // Handle Booking Submit
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (honeypot) return; // Silent discard for bot submission

    if (!selectedSlot) {
      setSubmitError('Please choose an available time slot.');
      return;
    }
    if (!prospectName.trim() || !prospectEmail.trim()) {
      setSubmitError('Name and email are required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await bookMeetingPublic(bookingSlug, {
        name: prospectName.trim(),
        email: prospectEmail.toLowerCase().trim(),
        company: prospectCompany.trim(),
        notes: prospectNotes.trim(),
        startTime: selectedSlot.start_time,
        endTime: selectedSlot.end_time,
        timeZone,
        idempotencyKey: `pub_book_${prospectEmail.toLowerCase().trim()}_${new Date(selectedSlot.start_time).getTime()}`,
      });

      setBookingConfirmed(res.booking || res);
    } catch (err) {
      setSubmitError(err.message || 'Could not complete booking. Please try another slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate Calendar Days for Current Month View
  const calendarDays = (() => {
    const today = new Date();
    const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding before month starts
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(`${dateStr}T12:00:00Z`);
      const isPast = dayDate.getTime() < new Date().setHours(0, 0, 0, 0);
      days.push({
        dayNumber: d,
        dateString: dateStr,
        isPast,
      });
    }
    return days;
  })();

  const currentMonthName = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + monthOffset,
    1
  ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (isLoadingPage) {
    return (
      <div className="min-h-screen bg-[#0d1c15] text-[#fcfbf9] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-3 border-[#00e599] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-[#a1b0a8]">Loading meeting scheduler...</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen bg-[#0d1c15] text-[#fcfbf9] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#162b21] border border-white/10 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Scheduling Page Unavailable</h2>
          <p className="text-xs text-[#a1b0a8] mb-6">{pageError}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00e599] text-[#0d1c15] font-semibold text-xs hover:bg-[#00c885] transition-colors"
          >
            Return to OutLaunch
          </a>
        </div>
      </div>
    );
  }

  // Confirmation Success View
  if (bookingConfirmed) {
    const bookingStart = new Date(bookingConfirmed.start_time);
    return (
      <div className="min-h-screen bg-[#0d1c15] text-[#fcfbf9] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-lg w-full bg-[#162b21] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl animate-scaleUp">
          <div className="w-14 h-14 rounded-2xl bg-[#00e599]/20 border border-[#00e599]/40 flex items-center justify-center text-[#00e599] mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-center text-white mb-1">
            Meeting Confirmed!
          </h1>
          <p className="text-xs text-center text-[#a1b0a8] mb-6">
            A calendar invitation and confirmation email have been sent to{' '}
            <span className="text-[#00e599] font-medium">{bookingConfirmed.prospect_email}</span>.
          </p>

          <div className="p-4 rounded-2xl bg-black/30 border border-white/06 space-y-3 mb-6 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/06">
              <span className="text-[#73827a] font-medium">Session</span>
              <span className="text-white font-semibold">{pageData?.title}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-white/06">
              <span className="text-[#73827a] font-medium">Date & Time</span>
              <span className="text-[#00e599] font-medium">
                {bookingStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                {bookingStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({timeZone})
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-white/06">
              <span className="text-[#73827a] font-medium">Duration</span>
              <span className="text-white">{pageData?.duration_minutes || 30} minutes</span>
            </div>
            {bookingConfirmed.meeting_link && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[#73827a] font-medium">Video Call</span>
                <a
                  href={bookingConfirmed.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00e599] hover:underline flex items-center gap-1 font-medium"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Join Google Meet</span>
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setBookingConfirmed(null);
                setSelectedSlot(null);
              }}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Book Another Meeting
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[#00e599] hover:bg-[#00c885] text-[#0d1c15] font-semibold text-xs transition-colors cursor-pointer"
            >
              Done
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09140f] text-[#fcfbf9] font-sans flex flex-col justify-between selection:bg-[#00e599]/30">
      
      {/* Top Brand Bar */}
      <header className="border-b border-white/08 bg-[#0d1c15]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#00e599] text-[#0d1c15] font-bold text-xs flex items-center justify-center">
            O
          </div>
          <span className="font-bold text-sm tracking-tight text-white">OutLaunch Scheduler</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#73827a]">
          <ShieldCheck className="w-4 h-4 text-[#00e599]" />
          <span>Verified Calendar Sync</span>
        </div>
      </header>

      {/* Main Booking Container */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-8 my-auto">
        <div className="bg-[#11231a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
          
          {/* Left Column: Meeting Info (4 cols) */}
          <div className="lg:col-span-4 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-white/08 flex flex-col justify-between bg-[#0d1c15]/60">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00e599]/15 text-[#00e599] text-[11px] font-mono font-medium mb-4">
                <Sparkles className="w-3 h-3" />
                <span>Executive Strategy</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
                {pageData?.title || 'Product Demo & Strategy'}
              </h1>

              <div className="flex items-center gap-3 text-xs text-[#a1b0a8] mb-4">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#00e599]" />
                  {pageData?.duration_minutes || 30} mins
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-[#00e599]" />
                  Google Meet
                </span>
              </div>

              <p className="text-xs text-[#829289] leading-relaxed mb-6">
                {pageData?.description || 'Select an available time slot on the calendar to discuss pipeline acceleration with our team.'}
              </p>

              {selectedSlot && (
                <div className="p-3.5 rounded-2xl bg-[#00e599]/10 border border-[#00e599]/30 text-xs text-white animate-fadeIn">
                  <div className="text-[10px] font-mono uppercase text-[#00e599] font-semibold mb-1">
                    Selected Time
                  </div>
                  <div className="font-semibold text-sm">
                    {new Date(selectedSlot.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-[#a1b0a8]">
                    {selectedSlot.display_time} ({timeZone})
                  </div>
                </div>
              )}
            </div>

            {/* Timezone picker */}
            <div className="pt-6 border-t border-white/08 mt-6">
              <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1.5">
                Your Time Zone
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-[#00e599] cursor-pointer"
                >
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Denver">Mountain Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="Europe/London">London / GMT</option>
                  <option value="Europe/Paris">Paris / Central European</option>
                  <option value="Asia/Kolkata">India Standard Time (IST)</option>
                  <option value="Asia/Tokyo">Tokyo / JST</option>
                  <option value="Australia/Sydney">Sydney / AEST</option>
                </select>
              </div>
            </div>
          </div>

          {/* Middle Column: Date & Slot Picker (4 cols) */}
          <div className="lg:col-span-4 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-white/08">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-sm text-white">{currentMonthName}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMonthOffset((prev) => Math.max(0, prev - 1))}
                  disabled={monthOffset === 0}
                  className="p-1 rounded-lg text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMonthOffset((prev) => prev + 1)}
                  className="p-1 rounded-lg text-white hover:bg-white/10 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-6">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx} className="py-1 text-[11px] font-mono text-[#73827a] font-semibold">
                  {day}
                </div>
              ))}
              {calendarDays.map((d, idx) => {
                if (!d) {
                  return <div key={`empty-${idx}`} className="h-9" />;
                }
                const isSelected = selectedDate === d.dateString;
                return (
                  <button
                    key={d.dateString}
                    type="button"
                    disabled={d.isPast}
                    onClick={() => setSelectedDate(d.dateString)}
                    className={`h-9 w-9 rounded-xl mx-auto flex items-center justify-center font-medium text-xs transition-colors cursor-pointer ${
                      d.isPast
                        ? 'text-white/20 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#00e599] text-[#0d1c15] font-bold shadow-md'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {d.dayNumber}
                  </button>
                );
              })}
            </div>

            {/* Slots section */}
            <div className="border-t border-white/08 pt-4">
              <div className="text-[11px] font-mono uppercase text-[#73827a] font-semibold mb-2.5">
                Available Times ({selectedDate})
              </div>

              {isLoadingSlots ? (
                <div className="py-8 text-center text-xs text-[#73827a]">
                  <div className="w-5 h-5 border-2 border-[#00e599] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Checking calendar availability...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#73827a] bg-black/20 rounded-2xl border border-white/06">
                  No slots available on this date. Please select another day.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {availableSlots.map((slot) => {
                    const isPicked = selectedSlot?.start_time === slot.start_time;
                    return (
                      <button
                        key={slot.start_time}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                          isPicked
                            ? 'bg-[#00e599] text-[#0d1c15] border-[#00e599] shadow-sm'
                            : 'bg-black/30 hover:bg-white/08 text-white border-white/10'
                        }`}
                      >
                        {slot.display_time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Prospect Contact Form (4 cols) */}
          <div className="lg:col-span-4 p-6 sm:p-8 bg-[#0d1c15]/40 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-white mb-1">Enter Your Details</h2>
              <p className="text-[11px] text-[#73827a] mb-4">
                We'll email you a calendar invite and video link.
              </p>

              {submitError && (
                <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{submitError}</span>
                </div>
              )}

              <form id="booking-form" onSubmit={handleBookingSubmit} className="space-y-3">
                {/* Honeypot hidden input */}
                <input
                  type="text"
                  name="user_token_check"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="hidden"
                  tabIndex="-1"
                  autoComplete="off"
                />

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                    Your Name *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Elena Rostova"
                      value={prospectName}
                      onChange={(e) => setProspectName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-[#00e599]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                    Work Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="elena@company.com"
                      value={prospectEmail}
                      onChange={(e) => setProspectEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-[#00e599]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="NovaTech AI"
                      value={prospectCompany}
                      onChange={(e) => setProspectCompany(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-[#00e599]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#73827a] font-semibold mb-1">
                    Meeting Goals or Notes
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Topics you'd like to discuss..."
                    value={prospectNotes}
                    onChange={(e) => setProspectNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-[#00e599] resize-none"
                  />
                </div>
              </form>
            </div>

            <div className="pt-4 mt-4 border-t border-white/08">
              <button
                type="submit"
                form="booking-form"
                disabled={isSubmitting || !selectedSlot}
                className="w-full py-3 rounded-xl bg-[#00e599] hover:bg-[#00c885] disabled:opacity-40 disabled:cursor-not-allowed text-[#0d1c15] font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0d1c15] border-t-transparent rounded-full animate-spin" />
                    <span>Confirming Booking...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-[#5a6962] font-mono">
        Powered by OutLaunch AI Meeting Booking
      </footer>

    </div>
  );
}
