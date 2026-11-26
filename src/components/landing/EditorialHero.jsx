import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Mail, Linkedin, UserCheck, Search, CornerDownRight, X, ExternalLink } from 'lucide-react';
import FlowCanvas from '../FlowCanvas';
import LogosCarousel from '../LogosCarousel';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import { normalizeWebsite } from '../../lib/companyResearch';
import useAuthSession from '../../hooks/useAuthSession';

export default function EditorialHero() {
  const [inputValue, setInputValue] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [activeWorkflowTab, setActiveWorkflowTab] = useState('prospect');
  const modalRef = useRef(null);

  const { navigate } = useNavigation();
  const { session, loading: authLoading } = useAuthSession();

  // Handle modal outside click & Esc key (Modern Web Guidance compliance)
  useEffect(() => {
    if (!dialogOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDialogOpen(false);
    };
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setDialogOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dialogOpen]);

  // Tab auto-rotation in hero visual
  useEffect(() => {
    const tabs = ['prospect', 'research', 'email', 'linkedin'];
    const timer = setInterval(() => {
      setActiveWorkflowTab((prev) => {
        const nextIdx = (tabs.indexOf(prev) + 1) % tabs.length;
        return tabs[nextIdx];
      });
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (authLoading) return;
    setError('');
    try {
      const { domain, website } = normalizeWebsite(inputValue);
      sessionStorage.setItem('autogtm-pending-domain', website);
      if (!session) {
        navigate('/sign-in');
        return;
      }
      navigate(`/auto-gtm/company/${encodeURIComponent(domain)}/explore?src=landing&phase=research_company_loading`);
    } catch (err) {
      setError(err.message || 'Please enter a valid website address');
    }
  };

  return (
    <section className="relative pt-6 sm:pt-12 pb-16 md:pb-24 overflow-hidden bg-[#f7f5f0]">
      {/* Background Architectural Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(13,28,21,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(13,28,21,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Top Monospace Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[12px] sm:text-[13px] font-mono text-[#182e24] shadow-[0_1px_3px_rgba(13,28,21,0.04)]">
            <span className="w-2 h-2 rounded-full bg-[#00e599] animate-pulse" />
            <span className="font-semibold text-[#0d1c15]">122,044 hot leads</span>
            <span className="text-[#5a6962]">researched across 10,980+ companies</span>
          </div>
        </div>

        {/* Hero Editorial Headline */}
        <div className="text-center max-w-[920px] mx-auto">
          <h1 className="font-display font-bold text-4xl sm:text-6xl md:text-[68px] lg:text-[76px] tracking-[-0.03em] text-[#0d1c15] leading-[1.05] mb-5 sm:mb-6">
            Find the right people.{' '}
            <span className="text-[#0d9467] italic font-editorial font-normal">
              Start better conversations.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="text-lg sm:text-xl md:text-[21px] text-[#4a5851] max-w-[680px] mx-auto leading-relaxed font-normal mb-8 sm:mb-10">
            Research prospects, personalise your outreach, and manage email and LinkedIn conversations from one simple workspace.
          </p>

          {/* Input & Launch Form (Preserving OutLaunch input flow with Flow streams) */}
          <div id="hero-cta" className="max-w-[540px] mx-auto mb-6 relative">
            {/* Desktop Left/Right Flow Streams */}
            <div className="hidden lg:block absolute -left-48 top-1/2 -translate-y-1/2 w-44 h-16 pointer-events-none opacity-60">
              <FlowCanvas />
            </div>
            <div className="hidden lg:block absolute -right-48 top-1/2 -translate-y-1/2 w-44 h-16 pointer-events-none opacity-60 scale-x-[-1]">
              <FlowCanvas isReversed={true} />
            </div>

            <form
              onSubmit={handleSubmit}
              className="relative flex items-center bg-white rounded-2xl p-1.5 sm:p-2 border border-[#0d1c15]/15 shadow-[0_4px_24px_rgba(13,28,21,0.08)] hover:border-[#0d9467]/40 focus-within:border-[#0d9467] focus-within:ring-3 focus-within:ring-[#0d9467]/15 transition-all"
            >
              <div className="pl-3.5 pr-2 text-[#73827a]">
                <Search className="w-5 h-5 text-[#5a6962]" />
              </div>

              <input
                id="hero-website-input"
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your website (e.g. stripe.com)"
                className="w-full bg-transparent text-[#0d1c15] placeholder-[#73827a] text-sm sm:text-base font-medium outline-none py-2 px-1"
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={authLoading}
                aria-label="Launch project research"
                className={`flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer shrink-0 ${
                  inputValue.trim().length > 0
                    ? 'bg-[#0d1c15] hover:bg-[#162b21] text-white shadow-md'
                    : 'bg-[#edf2ec] text-[#4a5851] hover:text-[#0d1c15]'
                }`}
              >
                <span>Launch</span>
                <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${inputValue.trim().length > 0 ? 'text-[#00e599] translate-x-0.5' : ''}`} />
              </button>
            </form>

            {error && (
              <p role="alert" className="text-xs text-rose-600 mt-2 text-left px-2 font-medium">
                {error}
              </p>
            )}

            {/* Secondary Option: No Website */}
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[#5a6962]">
              <span>Don't have a website yet?</span>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="text-[#0d9467] hover:text-[#0a7854] font-medium underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0"
              >
                I don't have a website
              </button>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm text-[#4a5851] font-medium pt-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#0d9467]" />
              No SDRs or email infra needed
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#0d9467]" />
              $30 free credits on sign-up
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0d9467]" />
              Human review before sending
            </span>
          </div>
        </div>

        {/* Hero Interactive Outreach Workflow Visual (Realistic Product Mockup) */}
        <div className="mt-12 sm:mt-16 max-w-[1080px] mx-auto">
          <div className="bg-[#0f1714] rounded-2xl md:rounded-3xl border border-[#1b2b25] shadow-[0_20px_60px_-15px_rgba(13,28,21,0.35)] overflow-hidden text-white">
            
            {/* Top Window Bar */}
            <div className="px-4 py-3.5 bg-[#14221c] border-b border-[#1b2b25] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#273831]" />
                <span className="w-3 h-3 rounded-full bg-[#273831]" />
                <span className="w-3 h-3 rounded-full bg-[#273831]" />
                <span className="ml-3 font-mono text-xs text-[#73827a] hidden sm:inline">
                  workspace / active-pipeline / q4-growth
                </span>
              </div>

              {/* Workflow Phase Tabs */}
              <div className="flex items-center gap-1 bg-[#0b1310] p-1 rounded-lg border border-[#1b2b25] text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveWorkflowTab('prospect')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activeWorkflowTab === 'prospect'
                      ? 'bg-[#1a2f26] text-[#00e599] font-semibold'
                      : 'text-[#8ba096] hover:text-white'
                  }`}
                >
                  1. Discovery
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkflowTab('research')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activeWorkflowTab === 'research'
                      ? 'bg-[#1a2f26] text-[#00e599] font-semibold'
                      : 'text-[#8ba096] hover:text-white'
                  }`}
                >
                  2. Deep Research
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkflowTab('email')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activeWorkflowTab === 'email'
                      ? 'bg-[#1a2f26] text-[#00e599] font-semibold'
                      : 'text-[#8ba096] hover:text-white'
                  }`}
                >
                  3. Personalised Email
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkflowTab('linkedin')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activeWorkflowTab === 'linkedin'
                      ? 'bg-[#1a2f26] text-[#00e599] font-semibold'
                      : 'text-[#8ba096] hover:text-white'
                  }`}
                >
                  4. LinkedIn Touch
                </button>
              </div>
            </div>

            {/* Main Stage Grid */}
            <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column: Live Prospect Card & Dossier (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-[#13221c] rounded-xl p-5 border border-[#1d3127]">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-[#1d3127]">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#0d9467] to-[#00e599] p-[1.5px] flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-[#13221c] flex items-center justify-center font-bold text-sm text-white">
                          SJ
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-base leading-tight">Sarah Jenkins</h4>
                        <p className="text-xs text-[#8ba096] leading-tight mt-0.5">VP of Growth @ Hyperflow AI</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#00e599]/10 text-[#00e599] font-mono text-[11px] font-semibold border border-[#00e599]/30">
                      98.4% FIT
                    </span>
                  </div>

                  {/* Research Insights Tagged */}
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="bg-[#0b1310] p-2.5 rounded-lg border border-[#1d3127]">
                      <div className="flex items-center gap-1.5 text-[#00e599] font-mono text-[10px] uppercase font-bold">
                        <Sparkles className="w-3 h-3" />
                        <span>Recent Company Signal</span>
                      </div>
                      <p className="text-[#cad8c9] mt-1 text-[11.5px] leading-relaxed">
                        Hyperflow just raised $12M Series A; actively hiring 4 outbound SDRs and expanding into EMEA markets.
                      </p>
                    </div>

                    <div className="bg-[#0b1310] p-2.5 rounded-lg border border-[#1d3127]">
                      <div className="flex items-center gap-1.5 text-[#73827a] font-mono text-[10px] uppercase font-bold">
                        <Search className="w-3 h-3 text-[#00e599]" />
                        <span>Identified Pain Point</span>
                      </div>
                      <p className="text-[#cad8c9] mt-1 text-[11.5px] leading-relaxed">
                        Manual LinkedIn prospecting is taking 15+ hours/week with low response rates (&lt;1.8%).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verified Data Coordinates */}
                <div className="mt-5 pt-3.5 border-t border-[#1d3127] flex items-center justify-between text-xs text-[#8ba096] font-mono">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00e599]" />
                    <span>sarah@hyperflow.ai</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
                    <span>in/sarah-jenkins-growth</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Generated Multi-Channel Message (7 cols) */}
              <div className="lg:col-span-7 bg-[#14231d] rounded-xl p-5 border border-[#1d3127] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1d3127]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00e599]" />
                      <span className="font-mono text-xs uppercase tracking-wider text-[#8ba096]">
                        {activeWorkflowTab === 'linkedin' ? 'Channel: LinkedIn Connection Note' : 'Channel: Direct Cold Email'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#00e599] bg-[#00e599]/10 px-2 py-0.5 rounded border border-[#00e599]/20">
                      Prepared · Ready for review
                    </span>
                  </div>

                  {activeWorkflowTab === 'linkedin' ? (
                    /* LinkedIn Preview */
                    <div className="bg-[#0b1310] p-4 rounded-lg border border-[#1d3127]">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                        <Linkedin className="w-4 h-4 text-[#0077b5]" />
                        <span>Custom LinkedIn Invitation Note (274 / 300 chars)</span>
                      </div>
                      <p className="text-xs sm:text-[13px] text-[#dce5da] leading-relaxed font-sans">
                        "Hi Sarah — loved your recent post on scaling outbound during Series A without burning domain rep. We built an AI workflow that researches prospect tech stacks before generating hyper-tailored 1st lines. Thought it might free up your team's hours this month. Open to connecting?"
                      </p>
                    </div>
                  ) : (
                    /* Email Preview */
                    <div className="bg-[#0b1310] p-4 rounded-lg border border-[#1d3127]">
                      <div className="text-xs text-[#73827a] font-mono mb-2 pb-2 border-b border-[#1d3127]/60">
                        <div className="text-white font-medium mb-0.5">
                          Subject: Quick question about Hyperflow's EMEA expansion
                        </div>
                        <div>To: sarah@hyperflow.ai</div>
                      </div>
                      <div className="text-xs sm:text-[13px] text-[#dce5da] leading-relaxed space-y-2 font-sans">
                        <p>
                          Hi Sarah, congrats on Hyperflow's Series A announcement yesterday.
                        </p>
                        <p>
                          Noticed you're actively scaling your outbound sales pod. Most growth leads we chat with spend 12+ hours every week manually digging through prospects' tech stacks just to draft one authentic opening line.
                        </p>
                        <p>
                          We built OutLaunch to automate that exact research layer — pulling recent company triggers and drafting tailored angles while leaving final approval in your team's hands.
                        </p>
                        <p className="text-[#00e599] font-medium">
                          Would you be open to a 5-minute look at how this works for SaaS founders?
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Human Approval Bar (Taskaway Style) */}
                <div className="mt-4 pt-3 border-t border-[#1d3127] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#8ba096]">
                    <UserCheck className="w-4 h-4 text-[#00e599]" />
                    <span>Human in the loop: Review before sending</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert("Demo mode: You can edit the message anytime in your project dashboard.")}
                      className="px-3 py-1.5 rounded-lg bg-[#1a2f26] hover:bg-[#233f33] text-xs font-medium text-white transition-colors cursor-pointer"
                    >
                      Edit Message
                    </button>
                    <button
                      type="button"
                      onClick={() => alert("Message approved! Queued in your safe sending sequence.")}
                      className="px-3.5 py-1.5 rounded-lg bg-[#00e599] hover:bg-[#00c985] text-xs font-semibold text-[#0d1c15] transition-colors cursor-pointer shadow-sm"
                    >
                      Approve &amp; Queue
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status Ribbon */}
            <div className="px-6 py-3 bg-[#0d1713] border-t border-[#1b2b25] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#73827a]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[#00e599]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e599]" />
                  99.2% Inbox Placement
                </span>
                <span>Spam check score: 0.1/10 (Safe)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Domain Warm-up: 100% Complete</span>
                <span className="text-[#3b5247]">|</span>
                <span>Verified Leads In Queue: 48</span>
              </div>
            </div>
          </div>
        </div>

        {/* Brand & Partner Logos Carousel */}
        <div className="mt-12 sm:mt-16">
          <LogosCarousel />
        </div>
      </div>

      {/* Accessible "I don't have a website" Modal with Light-Dismiss */}
      {dialogOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="no-website-title"
            className="w-full max-w-[480px] bg-[#ffffff] rounded-2xl p-6 sm:p-7 border border-[#0d1c15]/10 shadow-[0_25px_60px_rgba(0,0,0,0.2)] text-[#0d1c15] relative animate-scaleUp"
          >
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#5a6962] hover:text-[#0d1c15] hover:bg-[#edf2ec] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-[#edf2ec] text-[#0d9467] flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>

            <h3 id="no-website-title" className="text-xl font-bold font-display text-[#0d1c15] mb-2">
              No website yet?
            </h3>
            <p className="text-sm text-[#4a5851] leading-relaxed mb-6">
              You can still test and launch outreach campaigns. Enter your LinkedIn company page, a Notion product doc, or describe what you sell inside your account dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDialogOpen(false);
                  navigate(PRODUCT_ROUTES.REGISTER);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white font-semibold text-sm transition-colors cursor-pointer text-center"
              >
                Continue to sign up
              </button>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-[#edf2ec] hover:bg-[#dbe5da] text-[#0d1c15] font-semibold text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
