import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Mail, Linkedin, UserCheck, Search, CornerDownRight, X, ExternalLink, SlidersHorizontal, ArrowUpRight, Check, Play } from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import { normalizeWebsite } from '../../lib/companyResearch';
import useAuthSession from '../../hooks/useAuthSession';
import { gsap, ScrollTrigger, prefersReducedMotion, triggerCircularTransition } from '../../lib/motion';
import TiltCard from '../ui/TiltCard';
import MagneticButton from '../ui/MagneticButton';
import AnimatedWordHighlight from './AnimatedWordHighlight';

export default function EditorialHero() {
  const [inputValue, setInputValue] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [activeWorkflowTab, setActiveWorkflowTab] = useState('prospect');
  const [isApproved, setIsApproved] = useState(false);
  const modalRef = useRef(null);
  const launchBtnRef = useRef(null);
  const heroCardRef = useRef(null);
  const heroBgGridRef = useRef(null);
  const badgeRef1 = useRef(null);
  const badgeRef2 = useRef(null);

  const { navigate } = useNavigation();
  const { session, loading: authLoading } = useAuthSession();

  // Multi-layer parallax with distinct depths
  useEffect(() => {
    if (prefersReducedMotion() || !heroCardRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Hero mock card floats slower than scroll
      gsap.to(heroCardRef.current, {
        y: 45,
        ease: 'none',
        scrollTrigger: {
          trigger: heroCardRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.8,
        },
      });

      // 2. Background grid lines move slowest
      if (heroBgGridRef.current) {
        gsap.to(heroBgGridRef.current, {
          y: 20,
          ease: 'none',
          scrollTrigger: {
            trigger: heroBgGridRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.4,
          },
        });
      }

      // 3. Floating upper badge drifts gently (clamped so it stays anchored to card at 1280, 1440, 1920)
      if (badgeRef1.current) {
        gsap.to(badgeRef1.current, {
          y: 14,
          ease: 'none',
          scrollTrigger: {
            trigger: heroCardRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
          },
        });
      }

      // 4. Floating lower badge counter-drifts gently (clamped)
      if (badgeRef2.current) {
        gsap.to(badgeRef2.current, {
          y: -12,
          ease: 'none',
          scrollTrigger: {
            trigger: heroCardRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
          },
        });
      }
    });

    return () => ctx.revert();
  }, []);

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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (authLoading) return;
    setError('');
    try {
      const { domain, website } = normalizeWebsite(inputValue);
      sessionStorage.setItem('autogtm-pending-domain', website);
      if (!session) {
        navigate(PRODUCT_ROUTES.SIGN_IN);
        return;
      }
      triggerCircularTransition(launchBtnRef.current, () => {
        navigate(`/analysis/${encodeURIComponent(domain)}`);
      });
    } catch (err) {
      setError(err.message || 'Please enter a valid website address');
    }
  };

  return (
    <section className="relative pt-8 sm:pt-14 pb-16 md:pb-24 bg-[#f7f5f0] text-[#0d1c15] overflow-hidden">
      {/* Subtle Architectural Grid Lines */}
      <div
        ref={heroBgGridRef}
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(13,28,21,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(13,28,21,0.03)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_15%,#000_70%,transparent_100%)] pointer-events-none will-change-transform"
      />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Split Hero Composition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Positioning, Headline & Form (6 cols) */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            
            {/* Category Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[12px] font-mono text-[#182e24] shadow-xs mb-6">
              <span className="w-2 h-2 rounded-full bg-[#00e599] animate-pulse" />
              <span className="font-semibold text-[#0d1c15]">AUTONOMOUS OUTBOUND</span>
              <span className="text-[#5a6962]">· v2.4 Engine</span>
            </div>

            {/* Clean Editorial Headline with Staggered Word Entrance */}
            <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-[56px] tracking-[-0.03em] text-[#0d1c15] leading-[1.08] mb-5">
              <AnimatedWordHighlight entrance={true} text="Precision outbound infrastructure for" />{' '}
              <span className="text-[#0d9467] italic font-editorial font-normal text-shimmer">
                B2B revenue teams.
              </span>
            </h1>

            {/* Concise Product Positioning */}
            <p className="text-base sm:text-lg text-[#4a5851] leading-relaxed mb-8 max-w-xl">
              Research verified accounts, generate hyper-tailored messaging from real buyer signals, and orchestrate email and LinkedIn sequences with human-in-the-loop safety.
            </p>

            {/* Direct Research Launch Form */}
            <div className="w-full max-w-lg mb-6">
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row items-stretch gap-2.5 bg-white p-2 rounded-2xl border border-[#0d1c15]/15 shadow-[0_8px_24px_rgba(13,28,21,0.06)] focus-within:border-[#0d9467] transition-all"
              >
                <div className="flex-1 flex items-center pl-3 pr-2 text-[#73827a]">
                  <Search className="w-4 h-4 text-[#0d9467] shrink-0 mr-2.5" />
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter company website (e.g. stripe.com)"
                    className="w-full bg-transparent text-[#0d1c15] placeholder-[#73827a] text-sm font-medium outline-none py-2"
                    autoComplete="off"
                  />
                </div>

                <div ref={launchBtnRef} className="shrink-0 flex items-stretch">
                  <MagneticButton
                    type="submit"
                    disabled={authLoading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] active:scale-[0.98] text-white font-semibold text-sm transition-all cursor-pointer shadow-xs shrink-0 group"
                  >
                    <span>Launch Engine</span>
                    <ArrowRight className="w-4 h-4 text-[#00e599] transition-transform duration-200 group-hover:translate-x-1" />
                  </MagneticButton>
                </div>
              </form>

              {error && (
                <p role="alert" className="text-xs text-rose-600 mt-2 text-left px-2 font-medium">
                  {error}
                </p>
              )}

              {/* Secondary Actions */}
              <div className="flex items-center justify-between gap-4 mt-3 px-1 text-xs text-[#5a6962]">
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="hover:text-[#0d1c15] transition-colors underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0 text-left"
                >
                  Don't have a website URL yet?
                </button>

                <button
                  type="button"
                  onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
                  className="inline-flex items-center gap-1 font-semibold text-[#0d9467] hover:text-[#0a7854] cursor-pointer"
                >
                  <span>Access Platform</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Verified Technical Capabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 border-t border-[#0d1c15]/08 text-xs font-mono text-[#4a5851]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0d9467] shrink-0" />
                <span>SPF / DKIM / DMARC</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0d9467] shrink-0" />
                <span>Human Approval Queue</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0d9467] shrink-0" />
                <span>Multi-Touch Sequences</span>
              </div>
            </div>

          </div>

          {/* Right Column: Original OutLaunch Interface Preview (6 cols) with 3D Tilt */}
          <div ref={heroCardRef} className="lg:col-span-6 w-full will-change-transform relative overflow-visible">
            {/* Floating Upper Badge with Depth Parallax */}
            <div
              ref={badgeRef1}
              className="hidden sm:flex absolute -top-3.5 -right-3.5 px-3 py-1.5 rounded-full bg-white/95 border border-[#0d1c15]/12 shadow-lg items-center gap-1.5 text-xs font-mono text-[#0d9467] font-semibold z-20 backdrop-blur-xs will-change-transform"
            >
              <ShieldCheck className="w-4 h-4 text-[#00e599]" />
              <span>SPF / DKIM / DMARC Aligned</span>
            </div>

            {/* Floating Lower Badge with Counter Parallax */}
            <div
              ref={badgeRef2}
              className="hidden sm:flex absolute -bottom-3.5 -left-3.5 px-3 py-1.5 rounded-full bg-[#0d1c15] text-[#00e599] border border-[#00e599]/30 shadow-xl items-center gap-2 text-xs font-mono font-semibold z-20 will-change-transform"
            >
              <span className="w-2 h-2 rounded-full bg-[#00e599] animate-ping" />
              <span>Human Approval Required</span>
            </div>

            <TiltCard className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/12 shadow-[0_20px_50px_rgba(13,28,21,0.08)] overflow-hidden">
              
              {/* Product Header Bar */}
              <div className="px-5 py-3.5 bg-[#fcfbf9] border-b border-[#0d1c15]/08 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0d9467]" />
                  <span className="font-mono text-xs font-semibold text-[#0d1c15]">
                    pipeline / q4-growth-tier1
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#edf2ec] border border-[#dbe5da] text-[11px] font-mono text-[#0d9467] font-semibold">
                  <span>OUTLAUNCH AGENT</span>
                </div>
              </div>

              {/* Interactive Tabs with Sliding Pill */}
              <div className="relative flex border-b border-[#0d1c15]/08 bg-[#f7f5f0]/60 p-1.5 gap-1 text-xs font-mono">
                {/* Sliding active pill indicator */}
                <div
                  className="absolute top-1.5 bottom-1.5 rounded-lg bg-white shadow-xs border border-[#0d1c15]/08 tab-pill-slider pointer-events-none"
                  style={{
                    width: 'calc(25% - 5px)',
                    transform: `translateX(${
                      activeWorkflowTab === 'prospect'
                        ? '0%'
                        : activeWorkflowTab === 'research'
                        ? '100%'
                        : activeWorkflowTab === 'email'
                        ? '200%'
                        : '300%'
                    })`,
                  }}
                />

                <button
                  type="button"
                  onClick={() => setActiveWorkflowTab('prospect')}
                  className={`relative z-10 flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                    activeWorkflowTab === 'prospect'
                      ? 'text-[#0d1c15] font-semibold scale-100'
                      : 'text-[#5a6962] hover:text-[#0d1c15]'
                  }`}
                >
                  1. Discovery
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkflowTab('research')}
                  className={`relative z-10 flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                    activeWorkflowTab === 'research'
                      ? 'text-[#0d1c15] font-semibold scale-100'
                      : 'text-[#5a6962] hover:text-[#0d1c15]'
                  }`}
                >
                  2. Dossier
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkflowTab('email')}
                  className={`relative z-10 flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                    activeWorkflowTab === 'email'
                      ? 'text-[#0d1c15] font-semibold scale-100'
                      : 'text-[#5a6962] hover:text-[#0d1c15]'
                  }`}
                >
                  3. Email Touch
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkflowTab('linkedin')}
                  className={`relative z-10 flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                    activeWorkflowTab === 'linkedin'
                      ? 'text-[#0d1c15] font-semibold scale-100'
                      : 'text-[#5a6962] hover:text-[#0d1c15]'
                  }`}
                >
                  4. LinkedIn
                </button>
              </div>

              {/* Panel Content Area */}
              <div className="p-5 sm:p-6 bg-white min-h-[320px] flex flex-col justify-between">
                
                {activeWorkflowTab === 'prospect' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-start justify-between pb-3 border-b border-[#0d1c15]/08">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#0d1c15] text-[#00e599] flex items-center justify-center font-bold text-base shadow-xs">
                          SJ
                        </div>
                        <div>
                          <h4 className="font-semibold text-base text-[#0d1c15]">Sarah Jenkins</h4>
                          <p className="text-xs text-[#5a6962]">VP of Growth · Hyperflow AI</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#00e599]/15 text-[#0d9467] font-mono text-xs font-bold border border-[#00e599]/30">
                        98.4% ICP Fit
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
                        <span className="text-[10px] font-mono uppercase text-[#73827a] block mb-1">Company Headcount</span>
                        <span className="font-semibold text-[#0d1c15]">65 employees · Series A</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
                        <span className="text-[10px] font-mono uppercase text-[#73827a] block mb-1">Location</span>
                        <span className="font-semibold text-[#0d1c15]">New York, NY (US)</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#edf2ec]/60 border border-[#dbe5da] text-xs font-mono text-[#182e24] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#0d9467]" />
                        <span>sarah@hyperflow.ai</span>
                      </div>
                      <span className="text-[#0d9467] font-semibold">VERIFIED SMTP</span>
                    </div>
                  </div>
                )}

                {activeWorkflowTab === 'research' && (
                  <div className="space-y-3 animate-fadeIn text-xs">
                    <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
                      <div className="flex items-center gap-1.5 text-[#0d9467] font-mono text-[10px] uppercase font-bold mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Funding Signal Detected</span>
                      </div>
                      <p className="text-[#33413a] leading-relaxed">
                        Hyperflow announced a $12M Series A round led by Scale Ventures. Actively recruiting 4 enterprise SDRs.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
                      <div className="flex items-center gap-1.5 text-[#5a6962] font-mono text-[10px] uppercase font-bold mb-1">
                        <Search className="w-3.5 h-3.5 text-[#0d9467]" />
                        <span>Identified Tech Stack</span>
                      </div>
                      <p className="text-[#33413a] leading-relaxed">
                        HubSpot CRM, Segment, Clearbit, Next.js, AWS.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
                      <div className="flex items-center gap-1.5 text-[#5a6962] font-mono text-[10px] uppercase font-bold mb-1">
                        <UserCheck className="w-3.5 h-3.5 text-[#0d9467]" />
                        <span>Executive Pain Point</span>
                      </div>
                      <p className="text-[#33413a] leading-relaxed">
                        SDR team spends 15+ hrs/week on manual research before sending first touches.
                      </p>
                    </div>
                  </div>
                )}

                {activeWorkflowTab === 'email' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-xs font-sans space-y-2">
                      <div className="font-mono text-[11px] text-[#5a6962] pb-2 border-b border-[#0d1c15]/08">
                        <span className="font-semibold text-[#0d1c15]">Subject:</span> Scaling outbound at Hyperflow without manual research
                      </div>
                      <p className="text-[#22332a] leading-relaxed">
                        Hi Sarah — noticed Hyperflow's recent Series A and that you're actively scaling your outbound sales pod.
                      </p>
                      <p className="text-[#22332a] leading-relaxed">
                        Most growth leads we talk to burn 15+ hours every week researching tech stacks and funding updates just to craft one relevant opening angle.
                      </p>
                      <p className="text-[#0d9467] font-medium leading-relaxed">
                        Would you be open to seeing how our automated research dossiers can save your team 10+ hours a week?
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-[#5a6962]">
                      <span className="text-[#0d9467]">SPF/DKIM/DMARC: Aligned</span>
                      <span>Spam Score: 0.1/10 (Safe)</span>
                    </div>
                  </div>
                )}

                {activeWorkflowTab === 'linkedin' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-xs font-sans space-y-2">
                      <div className="flex items-center justify-between font-mono text-[11px] text-[#0077b5] pb-2 border-b border-[#0d1c15]/08">
                        <span className="font-semibold flex items-center gap-1.5">
                          <Linkedin className="w-3.5 h-3.5" />
                          LinkedIn Connection Invitation
                        </span>
                        <span className="text-[#5a6962]">274 / 300 chars</span>
                      </div>
                      <p className="text-[#22332a] leading-relaxed font-sans">
                        "Hi Sarah — loved your recent insights on scaling outbound during Series A without sacrificing domain reputation. We automated the prospect research layer so SDRs get tailored angles instantly. Thought it might free up your team's hours this month. Open to connecting?"
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-[#5a6962]">
                      <span className="text-[#0077b5]">Safe Daily Limit: 20/day</span>
                      <span>Target: Sarah Jenkins</span>
                    </div>
                  </div>
                )}

                {/* Human-in-the-Loop Approval Action Bar */}
                <div className="mt-4 pt-3.5 border-t border-[#0d1c15]/08 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[#5a6962] font-medium">
                    <UserCheck className="w-4 h-4 text-[#0d9467]" />
                    <span>Human Approval Required</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert("Edit mode: Modify any message line before sending.")}
                      className="px-3 py-1.5 rounded-lg border border-[#0d1c15]/15 bg-white hover:bg-[#edf2ec] text-xs font-semibold text-[#0d1c15] transition-colors cursor-pointer"
                    >
                      Edit Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsApproved(!isApproved)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isApproved
                          ? 'bg-[#0d9467] text-white shadow-xs'
                          : 'bg-[#0d1c15] hover:bg-[#162b21] text-white shadow-xs'
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#00e599]" />
                          <span>Approved &amp; Scheduled</span>
                        </>
                      ) : (
                        <>
                          <span>Approve &amp; Queue</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00e599]" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* Status Ribbon */}
              <div className="px-5 py-2.5 bg-[#fcfbf9] border-t border-[#0d1c15]/08 flex items-center justify-between text-xs font-mono text-[#5a6962]">
                <span className="text-[#0d9467] font-semibold">● 99.2% Inbox Placement</span>
                <span>Secondary Domain Warm-up: 100%</span>
              </div>

            </TiltCard>
          </div>

        </div>

      </div>

      {/* Accessible Modal for Users without a website */}
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
            className="w-full max-w-[480px] bg-white rounded-2xl p-6 sm:p-7 border border-[#0d1c15]/10 shadow-2xl text-[#0d1c15] relative animate-scaleUp"
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
              No company website yet?
            </h3>
            <p className="text-sm text-[#4a5851] leading-relaxed mb-6">
              You can still test and launch outreach campaigns. Enter your LinkedIn profile, product documentation URL, or configure your value proposition in your OutLaunch dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDialogOpen(false);
                  navigate(PRODUCT_ROUTES.SIGN_IN);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white font-semibold text-sm transition-colors cursor-pointer text-center"
              >
                Continue to sign in
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
