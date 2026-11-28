import React from 'react';
import { Search, Sparkles, Mail, Linkedin, UserCheck, ShieldCheck, CheckCircle2, ArrowRight, Database, Check } from 'lucide-react';

export default function WorkflowOverviewGrid() {
  return (
    <section id="workflow" className="pt-16 pb-24 md:pt-20 md:pb-32 bg-[#f7f5f0] relative">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        
        {/* Section Header (Natural flow, gives full viewport room for card stacking) */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[11px] font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-2.5">
            <span>[ STAGE_01 — STAGE_04 ]</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-tight">
            How the OutLaunch pipeline operates
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#4a5851] leading-relaxed">
            Every step is modular, transparent, and structured for maximum inbox delivery and response rates.
          </p>
        </div>

        {/* Interactive Sticky Scrolling Pipeline Stack */}
        <div className="relative">
          
          {/* ============================================================ */}
          {/* STAGE 01: Lead Discovery */}
          {/* ============================================================ */}
          <div
            className="sticky transition-all duration-200"
            style={{ top: '88px', zIndex: 10 }}
          >
            <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.06)] overflow-hidden">
              {/* Header Ribbon (Stays visible as tier 1 tab when stacked) */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-[#fcfbf9] border-b border-[#0d1c15]/08 h-10">
                <span className="text-xs font-mono font-bold text-[#0d9467] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[#0d9467] flex items-center justify-center text-[10px] font-bold">01</span>
                  LEAD DISCOVERY
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#edf2ec] text-[#182e24] border border-[#dbe5da] font-medium">
                  250M+ Contacts
                </span>
              </div>

              {/* Card Body (Compact & High-Contrast) */}
              <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div className="md:col-span-5">
                  <h3 className="text-lg sm:text-xl font-display font-bold text-[#0d1c15] mb-1.5 leading-snug">
                    Pinpoint high-intent decision makers
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4a5851] leading-relaxed mb-3">
                    Filter across 250M+ verified global B2B profiles by exact buying criteria: headcount, tech stack, and hiring momentum.
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono text-[#5a6962]">
                    <span className="px-2 py-0.5 rounded bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Zero-Bounce Guarantee</span>
                    <span className="px-2 py-0.5 rounded bg-[#f7f5f0] border border-[#0d1c15]/08">✓ SMTP Live Ping</span>
                  </div>
                </div>

                <div className="md:col-span-7">
                  <div className="bg-[#fcfbf9] rounded-xl border border-[#0d1c15]/08 p-3 text-xs font-mono space-y-1.5 shadow-inner">
                    <div className="flex items-center justify-between text-[#73827a] pb-1 border-b border-[#0d1c15]/06 text-[10px] uppercase font-semibold">
                      <span>Verified Contact</span>
                      <span>Company</span>
                      <span className="text-right">Fit Score</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-[#0d1c15]/04">
                      <span className="font-semibold text-[#0d1c15]">Sarah Jenkins (VP Growth)</span>
                      <span className="text-[#5a6962]">Hyperflow AI</span>
                      <span className="text-[#0d9467] font-bold text-right">98.4%</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-[#0d1c15]/04">
                      <span className="font-semibold text-[#0d1c15]">David Marcus (Head of Sales)</span>
                      <span className="text-[#5a6962]">DataPrime Corp</span>
                      <span className="text-[#0d9467] font-bold text-right">96.1%</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-[#0d1c15]">Elena Rostova (RevOps Dir)</span>
                      <span className="text-[#5a6962]">CloudSphere</span>
                      <span className="text-[#0d9467] font-bold text-right">94.8%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* In-flow scroll runway between Stage 01 and 02 */}
          <div className="h-28 sm:h-36" aria-hidden="true" />

          {/* ============================================================ */}
          {/* STAGE 02: Account Dossiers */}
          {/* ============================================================ */}
          <div
            className="sticky transition-all duration-200"
            style={{ top: '128px', zIndex: 20 }}
          >
            <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.08)] overflow-hidden">
              {/* Header Ribbon (Stays visible as tier 2 tab when stacked) */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-[#fcfbf9] border-b border-[#0d1c15]/08 h-10">
                <span className="text-xs font-mono font-bold text-[#0d9467] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[#0d9467] flex items-center justify-center text-[10px] font-bold">02</span>
                  ACCOUNT DOSSIERS
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#edf2ec] text-[#182e24] border border-[#dbe5da] font-medium">
                  Signal Engine
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div className="md:col-span-5">
                  <h3 className="text-lg sm:text-xl font-display font-bold text-[#0d1c15] mb-1.5 leading-snug">
                    Automated account intelligence
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4a5851] leading-relaxed mb-3">
                    Our models analyze funding rounds, executive appointments, job openings, and product releases to uncover high-converting buying signals.
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono text-[#5a6962]">
                    <span className="px-2 py-0.5 rounded bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Real-time News Feeds</span>
                    <span className="px-2 py-0.5 rounded bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Tech Stack Signatures</span>
                  </div>
                </div>

                <div className="md:col-span-7">
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-start gap-2.5 shadow-inner">
                      <Sparkles className="w-4 h-4 text-[#0d9467] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#0d1c15] block text-xs">Series A Growth Spike</span>
                        <span className="text-[#5a6962] text-[11px]">Raised $12M; opening 4 regional SDR positions and expanding EMEA footprint.</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-start gap-2.5 shadow-inner">
                      <Database className="w-4 h-4 text-[#0d9467] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#0d1c15] block text-xs">Tech Stack Compatibility</span>
                        <span className="text-[#5a6962] text-[11px]">Active instances of HubSpot CRM, Segment, Clearbit, and AWS cloud detected.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* In-flow scroll runway between Stage 02 and 03 */}
          <div className="h-28 sm:h-36" aria-hidden="true" />

          {/* ============================================================ */}
          {/* STAGE 03: Multi-Channel Sequences */}
          {/* ============================================================ */}
          <div
            className="sticky transition-all duration-200"
            style={{ top: '168px', zIndex: 30 }}
          >
            <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_14px_45px_rgba(13,28,21,0.09)] overflow-hidden">
              {/* Header Ribbon (Stays visible as tier 3 tab when stacked) */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-[#fcfbf9] border-b border-[#0d1c15]/08 h-10">
                <span className="text-xs font-mono font-bold text-[#0d9467] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[#0d9467] flex items-center justify-center text-[10px] font-bold">03</span>
                  MULTI-CHANNEL SEQUENCES
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#edf2ec] text-[#182e24] border border-[#dbe5da] font-medium">
                  Email &amp; LinkedIn
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div className="md:col-span-5">
                  <h3 className="text-lg sm:text-xl font-display font-bold text-[#0d1c15] mb-1.5 leading-snug">
                    Coordinated email &amp; social touches
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4a5851] leading-relaxed mb-3">
                    Pair verified cold email threads with tailored LinkedIn notes. If a prospect replies anywhere, subsequent cadence steps pause immediately.
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono text-[#5a6962]">
                    <span className="px-2 py-0.5 rounded bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Smart Collision Defense</span>
                    <span className="px-2 py-0.5 rounded bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Domain Warm-Up Protocol</span>
                  </div>
                </div>

                <div className="md:col-span-7">
                  <div className="p-3.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-xs space-y-2 shadow-inner">
                    <div className="flex items-center justify-between font-mono text-[10px] text-[#5a6962] pb-1.5 border-b border-[#0d1c15]/06">
                      <span className="flex items-center gap-1.5 font-bold text-[#0d1c15]">
                        <Mail className="w-3.5 h-3.5 text-[#0d9467]" />
                        DAY 1 · COLD EMAIL 01
                      </span>
                      <span className="text-[#0d9467] font-semibold bg-[#edf2ec] px-1.5 py-0.5 rounded text-[9px]">
                        SPF / DKIM / DMARC PASS
                      </span>
                    </div>
                    <p className="text-[#22332a] leading-relaxed text-xs font-sans">
                      "Hi Sarah — noticed Hyperflow's recent Series A and SDR hiring push. Built an AI workflow that researches prospect tech stacks before generating 1st lines. Thought it might free up your team's hours..."
                    </p>
                    <div className="pt-1.5 border-t border-[#0d1c15]/06 flex items-center justify-between text-[10px] font-mono text-[#5a6962]">
                      <span className="flex items-center gap-1 text-[#0077b5] font-semibold">
                        <Linkedin className="w-3 h-3" /> Day 3 LinkedIn note synced
                      </span>
                      <span className="text-[#0d9467] font-semibold">Auto-pauses on reply</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* In-flow scroll runway between Stage 03 and 04 */}
          <div className="h-28 sm:h-36" aria-hidden="true" />

          {/* ============================================================ */}
          {/* STAGE 04: Human Oversight & Governance */}
          {/* ============================================================ */}
          <div
            className="sticky transition-all duration-200"
            style={{ top: '208px', zIndex: 40 }}
          >
            <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_16px_50px_rgba(13,28,21,0.1)] overflow-hidden">
              {/* Header Ribbon (Stays visible as tier 4 tab when stacked) */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-[#fcfbf9] border-b border-[#0d1c15]/08 h-10">
                <span className="text-xs font-mono font-bold text-[#0d9467] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[#0d9467] flex items-center justify-center text-[10px] font-bold">04</span>
                  HUMAN OVERSIGHT &amp; GOVERNANCE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] border border-[#dbe5da] font-bold">
                  Safe Sending
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div className="md:col-span-5">
                  <h3 className="text-lg sm:text-xl font-display font-bold text-[#0d1c15] mb-1.5 leading-snug">
                    Human-in-the-loop review queue
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4a5851] leading-relaxed mb-3">
                    Never send AI-generated spam. Your revenue team can review, edit, or approve all outgoing messages with one click before dispatch.
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono text-[#5a6962]">
                    <span className="px-2 py-0.5 rounded bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Inline Tone Correction</span>
                    <span className="px-2 py-0.5 rounded bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Strict Rate Limits (35/day)</span>
                  </div>
                </div>

                <div className="md:col-span-7">
                  <div className="p-3.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-2.5 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#0d1c15]">
                        <UserCheck className="w-4 h-4 text-[#0d9467]" />
                        <span>Review Mode: Active</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#0d9467] bg-[#00e599]/15 px-2 py-0.5 rounded border border-[#00e599]/30 font-bold">
                        100% PRE-DISPATCH CHECK
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 rounded-lg bg-white border border-[#0d1c15]/06">
                        <span className="text-[10px] text-[#73827a] block">Spam Score</span>
                        <span className="font-bold text-[#0d9467]">0.1 / 10 (Safe)</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-[#0d1c15]/06">
                        <span className="text-[10px] text-[#73827a] block">Secondary Domain</span>
                        <span className="font-bold text-[#0d1c15]">100% Warmed</span>
                      </div>
                    </div>

                    <div className="pt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-[#5a6962] font-mono">Verified Leads: 48</span>
                      <button
                        type="button"
                        className="px-3 py-1 rounded-lg bg-[#0d1c15] text-[#00e599] text-xs font-semibold hover:bg-[#162b21] transition-colors shadow-xs"
                      >
                        Approve &amp; Queue Batch &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* End Runway in-flow spacer: allows all 4 cards to sit simultaneously stacked in view */}
          <div className="h-72 sm:h-96" aria-hidden="true" />

        </div>

      </div>
    </section>
  );
}
