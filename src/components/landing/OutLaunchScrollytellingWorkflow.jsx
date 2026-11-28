import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Database, Mail, ShieldCheck, CheckCircle2, ArrowRight, UserCheck, Search, Users, ExternalLink } from 'lucide-react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion';
import TiltCard from '../ui/TiltCard';
import AnimatedCounter from './AnimatedCounter';

const SCROLLY_STEPS = [
  {
    num: '01',
    eyebrow: '01 · LEAD DISCOVERY',
    title: 'Find high-fit enterprise accounts with real signals',
    description: 'Filter across 250M+ verified commercial contacts. Identify tech stack signatures, recent funding announcements, and hiring SDRs.',
    metric: '250M+ verified records',
    previewType: 'contacts',
  },
  {
    num: '02',
    eyebrow: '02 · DEEP DOSSIER & PERSONALISATION',
    title: 'Never send a generic template again',
    description: 'Our agent analyzes company press releases, podcast interviews, and vacancies to craft executive-level opening hooks.',
    metric: '18.4% average reply rate',
    previewType: 'dossier',
  },
  {
    num: '03',
    eyebrow: '03 · MULTI-TOUCH SEQUENCE ORCHESTRATION',
    title: 'Coordinated cold email and LinkedIn sequences',
    description: 'Automated multi-channel cadences with intelligent collision prevention: auto-pause email threads when leads reply on LinkedIn.',
    metric: '99.2% inbox placement',
    previewType: 'sequence',
  },
  {
    num: '04',
    eyebrow: '04 · GOVERNANCE & HUMAN APPROVAL',
    title: 'Human-in-the-loop review and domain shield',
    description: 'Nothing leaves your workspace without your approval. Isolated secondary sending domains protect your primary brand reputation.',
    metric: '100% domain protection',
    previewType: 'governance',
  },
];

export default function OutLaunchScrollytellingWorkflow() {
  const containerRef = useRef(null);
  const pinSectionRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion() || !containerRef.current || !pinSectionRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        pin: pinSectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        anticipatePin: 1,
        pinSpacing: true,
        scrub: 0.5,
        onUpdate: (self) => {
          const stepIndex = Math.min(
            SCROLLY_STEPS.length - 1,
            Math.floor(self.progress * SCROLLY_STEPS.length)
          );
          setActiveStep(stepIndex);
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const current = SCROLLY_STEPS[activeStep];

  return (
    <section ref={containerRef} id="workflow" className="relative h-[2400px] bg-transparent">
      {/* Sticky Container */}
      <div
        ref={pinSectionRef}
        className="sticky top-0 h-screen w-full flex flex-col justify-center px-4 sm:px-6 overflow-hidden py-12 md:py-16"
      >
        <div className="max-w-[1240px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Narrative steps 01 -> 04 */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              {SCROLLY_STEPS.map((step, idx) => {
                const isActive = idx === activeStep;
                return (
                  <div
                    key={step.num}
                    onClick={() => setActiveStep(idx)}
                    className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'bg-white border-[#0d9467]/40 shadow-sm scale-[1.02]'
                        : 'bg-white/40 border-transparent opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-[#0d9467]">
                        {step.eyebrow}
                      </span>
                      <span className="font-mono text-xs text-[#5a6962]">{step.metric}</span>
                    </div>
                    <h3 className="font-display font-bold text-base sm:text-lg text-[#0d1c15]">
                      {step.title}
                    </h3>
                    {isActive && (
                      <p className="text-xs sm:text-sm text-[#4a5851] leading-relaxed mt-2 animate-fadeIn">
                        {step.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Dynamic Morphed UI Mockup */}
          <div className="lg:col-span-7 w-full">
            <TiltCard className="bg-white rounded-3xl border border-[#0d1c15]/10 shadow-[0_20px_60px_rgba(13,28,21,0.08)] overflow-hidden transition-all duration-400">
              {/* Product Chrome Header */}
              <div className="px-6 py-3.5 bg-[#fcfbf9] border-b border-[#0d1c15]/08 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00e599] animate-pulse" />
                  <span className="font-mono text-xs text-[#0d1c15] font-semibold">
                    outlaunch-orchestrator / {current.previewType}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#0d9467] font-semibold px-2 py-0.5 rounded bg-[#edf2ec]">
                  STEP {current.num} ACTIVE
                </div>
              </div>

              {/* Dynamic Step View */}
              <div className="p-6 sm:p-8 min-h-[360px] flex flex-col justify-center bg-white transition-opacity duration-300">
                {/* 01. Contacts View */}
                {current.previewType === 'contacts' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-[#0d1c15]/08">
                      <span className="text-xs font-mono text-[#5a6962] uppercase font-bold">Verified Account Prospects</span>
                      <span className="text-xs font-mono text-[#0d9467] font-semibold">2,480 Matches</span>
                    </div>

                    {[
                      { name: 'Sarah Jenkins', role: 'VP of Growth', co: 'Hyperflow AI', fit: '98.4%', status: 'Verified SMTP' },
                      { name: 'Julian Thorne', role: 'Head of Outbound', co: 'Nexar Systems', fit: '97.2%', status: 'Verified SMTP' },
                      { name: 'Elena Rostova', role: 'Commercial Director', co: 'Veloce Data', fit: '96.8%', status: 'Verified SMTP' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#0d1c15] text-[#00e599] font-bold flex items-center justify-center font-mono">
                            {row.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-[#0d1c15]">{row.name}</div>
                            <div className="text-[#5a6962] text-[11px]">{row.role} · {row.co}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[#0d9467] font-bold">{row.fit} Fit</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#00e599]/15 text-[#0d9467] text-[10px] font-mono font-semibold">
                            {row.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 02. Dossier View */}
                {current.previewType === 'dossier' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-mono pb-2 border-b border-[#0d1c15]/08">
                        <span className="font-bold text-[#0d1c15]">Hyperflow AI · Series A Trigger</span>
                        <span className="text-[#0d9467] font-semibold">Confidence 96%</span>
                      </div>
                      <p className="text-[#182e24] leading-relaxed">
                        "Congrats on the Series A round! Noticed you're onboarding 4 new SDRs this month. Most growth leaders find new reps lose 15+ hours weekly researching tech stacks before drafting pitches. We automated that exact layer."
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#edf2ec]/60 border border-[#dbe5da] text-[11px]">
                        <span className="text-[#5a6962] block mb-0.5">Detected Stack:</span>
                        <span className="font-semibold text-[#0d1c15]">Salesforce, Segment, Apollo</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#edf2ec]/60 border border-[#dbe5da] text-[11px]">
                        <span className="text-[#5a6962] block mb-0.5">Spam Score:</span>
                        <span className="font-semibold text-[#0d9467]">0.1 / 10 (Pristine)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 03. Sequence View */}
                {current.previewType === 'sequence' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-[#0d1c15]/08">
                      <span className="text-xs font-mono font-bold text-[#0d1c15]">Cadence Progression</span>
                      <span className="text-xs font-mono text-[#0d9467]">Smart Collision Safe</span>
                    </div>

                    <div className="space-y-2.5 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-center justify-between">
                        <span className="font-semibold text-[#0d1c15]">Touch 1: Tailored Cold Email</span>
                        <span className="text-[#0d9467]">Delivered (SPF/DKIM)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-center justify-between">
                        <span className="font-semibold text-[#0d1c15]">Touch 2: LinkedIn Profile Visit &amp; Invite</span>
                        <span className="text-[#0077b5]">Safe Limit: 20/day</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#edf2ec]/60 border border-[#dbe5da] flex items-center justify-between text-[#0d9467]">
                        <span>Touch 3: Contextual Case Study Follow-up</span>
                        <span>Auto-pauses on reply</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 04. Governance View */}
                {current.previewType === 'governance' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="p-4 rounded-xl bg-[#f7fbf8] border border-[#0d9467]/30 text-xs space-y-2">
                      <div className="flex items-center justify-between font-semibold text-[#0d9467]">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#0d9467]" />
                          Secondary Domain Shield Active
                        </span>
                        <span>100% Reputation</span>
                      </div>
                      <p className="text-[#33413a] leading-relaxed font-sans">
                        Sending infrastructure is completely isolated from your primary business domain. Automated warm-up and rate-limiting routines protect inbox deliverability.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-[#4a5851]">
                        <UserCheck className="w-4 h-4 text-[#0d9467]" />
                        <span>Human-in-the-Loop Batch Queue</span>
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-[#0d1c15] text-[#00e599] font-mono font-semibold">
                        Ready to Approve
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TiltCard>
          </div>

        </div>
      </div>
    </section>
  );
}
