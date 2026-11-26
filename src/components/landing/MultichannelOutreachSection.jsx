import React, { useState } from 'react';
import { Mail, Linkedin, ArrowRight, ShieldCheck, Clock, CheckCircle2, RotateCw, Send, MessageSquare, UserCheck, Shield, ExternalLink, Play } from 'lucide-react';

export default function MultichannelOutreachSection() {
  const [activeTab, setActiveTab] = useState('email');

  return (
    <section className="py-20 md:py-28 bg-[#f7f5f0] border-t border-[#0d1c15]/08 relative">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="max-w-3xl mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3">
            <Mail className="w-3.5 h-3.5" />
            <span>03 · MULTI-CHANNEL ORCHESTRATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-[1.12]">
            Coordinated Email and LinkedIn sequences
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4a5851] leading-relaxed">
            Reach prospects across channels without confusing them. Tailored cold emails and social touchpoints work together with smart reply collision defense.
          </p>
        </div>

        {/* Channel Mode Switcher */}
        <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.06)] p-6 sm:p-8 md:p-10">
          
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-[#0d1c15]/08">
            <div className="flex items-center gap-2 p-1 rounded-xl bg-[#edf2ec] border border-[#dbe5da]">
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'email'
                    ? 'bg-white text-[#0d1c15] shadow-xs'
                    : 'text-[#4a5851] hover:text-[#0d1c15]'
                }`}
              >
                <Mail className="w-4 h-4 text-[#0d9467]" />
                <span>Cold Email Sequence</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('linkedin')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'linkedin'
                    ? 'bg-white text-[#0077b5] shadow-xs'
                    : 'text-[#4a5851] hover:text-[#0d1c15]'
                }`}
              >
                <Linkedin className="w-4 h-4 text-[#0077b5]" />
                <span>LinkedIn Touchpoints</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#5a6962]">
              <RotateCw className="w-3.5 h-3.5 text-[#0d9467]" />
              <span>
                {activeTab === 'email'
                  ? 'Auto-pauses email thread if prospect responds on LinkedIn'
                  : 'Social safety compliance: Honors LinkedIn daily rate limits'}
              </span>
            </div>
          </div>

          {/* DIVERGENT PRESENTATION BY CHANNEL */}

          {/* 1. COLD EMAIL SEQUENCE LAYOUT */}
          {activeTab === 'email' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Delivery Health Ribbon */}
              <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[#0d9467] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#0d9467]" />
                    SPF / DKIM / DMARC Aligned
                  </span>
                  <span className="text-[#0d1c15]/20">|</span>
                  <span className="text-[#5a6962]">Sender: alex@growth-outlaunch.com (Secondary Domain)</span>
                </div>
                <div className="flex items-center gap-2 text-[#0d9467] font-semibold">
                  <span>99.2% Inbox Placement Rate</span>
                </div>
              </div>

              {/* Threaded Email Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Email Step 1 */}
                <div className="p-6 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0d1c15]/08 font-mono text-xs">
                      <span className="font-bold text-[#0d9467]">STEP 1 · DAY 1</span>
                      <span className="text-[#5a6962]">9:15 AM EST</span>
                    </div>
                    <div className="text-xs font-mono text-[#5a6962] mb-2">
                      <span className="font-semibold text-[#0d1c15]">Subject:</span> Hyperflow's Series A &amp; outbound ramp
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-[#0d1c15]/08 text-xs text-[#22332a] leading-relaxed shadow-2xs font-sans space-y-2">
                      <p>Hi Sarah,</p>
                      <p>Congrats on the recent Series A round. Noticed your team is hiring 4 outbound SDRs this quarter.</p>
                      <p>We built an AI research engine that feeds your reps verified prospect pain points so they don't spend 15 hrs/week digging through LinkedIn manually.</p>
                      <p className="text-[#0d9467] font-medium">Worth a 5-minute look this Thursday?</p>
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-[#0d1c15]/06 flex items-center justify-between text-[11px] font-mono text-[#5a6962]">
                    <span className="text-[#0d9467] font-semibold">64.2% Open Rate</span>
                    <span className="px-2 py-0.5 rounded bg-[#edf2ec] text-[#182e24]">Initial Dispatch</span>
                  </div>
                </div>

                {/* Email Step 2 */}
                <div className="p-6 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0d1c15]/08 font-mono text-xs">
                      <span className="font-bold text-[#0d9467]">STEP 2 · DAY 4</span>
                      <span className="text-[#5a6962]">11:30 AM EST</span>
                    </div>
                    <div className="text-xs font-mono text-[#5a6962] mb-2">
                      <span className="font-semibold text-[#0d1c15]">Thread:</span> Re: Hyperflow's Series A &amp; outbound ramp
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-[#0d1c15]/08 text-xs text-[#22332a] leading-relaxed shadow-2xs font-sans space-y-2">
                      <p>Sarah — quick follow-up with concrete numbers.</p>
                      <p>We recently helped another Series A SaaS team cut prospect research time by 72% while increasing booked discovery meetings from 6 to 19/month.</p>
                      <p>Happy to share the teardown report if helpful for your new SDR hires.</p>
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-[#0d1c15]/06 flex items-center justify-between text-[11px] font-mono text-[#5a6962]">
                    <span className="text-[#0d9467] font-semibold">24.8% Direct Reply</span>
                    <span className="px-2 py-0.5 rounded bg-[#edf2ec] text-[#182e24]">Threaded Bump</span>
                  </div>
                </div>

                {/* Email Step 3 */}
                <div className="p-6 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0d1c15]/08 font-mono text-xs">
                      <span className="font-bold text-[#0d9467]">STEP 3 · DAY 8</span>
                      <span className="text-[#5a6962]">2:00 PM EST</span>
                    </div>
                    <div className="text-xs font-mono text-[#5a6962] mb-2">
                      <span className="font-semibold text-[#0d1c15]">Thread:</span> Re: Hyperflow's Series A &amp; outbound ramp
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-[#0d1c15]/08 text-xs text-[#22332a] leading-relaxed shadow-2xs font-sans space-y-2">
                      <p>Should I circle back next quarter once the new sales reps are onboarded, or is outbound pipeline still on your radar this month?</p>
                      <p className="text-[#73827a] text-[11px]">Best,<br />Alex</p>
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-[#0d1c15]/06 flex items-center justify-between text-[11px] font-mono text-[#5a6962]">
                    <span className="text-[#0d9467] font-semibold">19.2% Conversion</span>
                    <span className="px-2 py-0.5 rounded bg-[#edf2ec] text-[#182e24]">Permission CTA</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 2. LINKEDIN TOUCHPOINTS LAYOUT */}
          {activeTab === 'linkedin' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Safety & Compliance Ribbon */}
              <div className="p-4 rounded-xl bg-[#f0f7fc] border border-[#0077b5]/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[#0077b5] font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#0077b5]" />
                    Social Safety Engine: Active
                  </span>
                  <span className="text-[#0077b5]/30">|</span>
                  <span className="text-[#4a5851]">Smart Daily Limit: 20 Connection Invites / Account</span>
                </div>
                <div className="flex items-center gap-2 text-[#0077b5] font-semibold">
                  <span>Zero Automation Risk Flags</span>
                </div>
              </div>

              {/* LinkedIn Interaction Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* LinkedIn Step 1: Connection Request Note */}
                <div className="p-6 rounded-2xl bg-[#fcfbf9] border border-[#0077b5]/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0d1c15]/08 font-mono text-xs">
                      <span className="font-bold text-[#0077b5]">TOUCH 1 · DAY 1</span>
                      <span className="text-[#5a6962]">Profile Visit &amp; Invite</span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-[#0077b5]/20 text-xs shadow-2xs font-sans space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#0d1c15]/06">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#0077b5] text-white flex items-center justify-center font-bold text-xs">
                            IN
                          </div>
                          <span className="font-semibold text-[#0d1c15]">Connection Note</span>
                        </div>
                        <span className="font-mono text-[10px] text-[#0077b5] font-semibold">274 / 300 chars</span>
                      </div>
                      <p className="text-[#22332a] leading-relaxed italic bg-[#fcfbf9] p-2.5 rounded-lg border border-[#0d1c15]/06">
                        "Hi Sarah — loved your recent post on scaling outbound during Series A without sacrificing domain health. We built an AI workflow that researches tech stacks before drafting first lines. Thought it might free up your team's hours this month. Open to connecting?"
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#0d1c15]/06 flex items-center justify-between text-[11px] font-mono text-[#5a6962]">
                    <span className="text-[#0077b5] font-semibold">48.6% Acceptance Rate</span>
                    <span className="px-2 py-0.5 rounded bg-[#edf2ec] text-[#182e24]">Tailored Invitation</span>
                  </div>
                </div>

                {/* LinkedIn Step 2: Post-Acceptance Conversational DM */}
                <div className="p-6 rounded-2xl bg-[#fcfbf9] border border-[#0077b5]/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0d1c15]/08 font-mono text-xs">
                      <span className="font-bold text-[#0077b5]">TOUCH 2 · DAY 3</span>
                      <span className="text-[#5a6962]">Direct Message</span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-[#0077b5]/20 text-xs shadow-2xs font-sans space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#0d1c15]/06">
                        <span className="font-semibold text-[#0d1c15] flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-[#0077b5]" />
                          Conversational DM
                        </span>
                        <span className="text-[10px] text-[#73827a]">Delivered · 3:15 PM</span>
                      </div>
                      <div className="bg-[#f0f7fc] p-3 rounded-xl rounded-tr-none text-[#22332a] leading-relaxed space-y-1">
                        <p>Thanks for connecting, Sarah!</p>
                        <p>Saw Hyperflow is ramping its SDR pod for EMEA expansion. How has the outbound ramp time looked so far?</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#0d1c15]/06 flex items-center justify-between text-[11px] font-mono text-[#5a6962]">
                    <span className="text-[#0077b5] font-semibold">36.2% Conversation Rate</span>
                    <span className="px-2 py-0.5 rounded bg-[#edf2ec] text-[#182e24]">Organic Welcome</span>
                  </div>
                </div>

                {/* LinkedIn Step 3: Executive Micro-Teardown */}
                <div className="p-6 rounded-2xl bg-[#fcfbf9] border border-[#0077b5]/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0d1c15]/08 font-mono text-xs">
                      <span className="font-bold text-[#0077b5]">TOUCH 3 · DAY 7</span>
                      <span className="text-[#5a6962]">Value-Led Touch</span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-[#0077b5]/20 text-xs shadow-2xs font-sans space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#0d1c15]/06">
                        <span className="font-semibold text-[#0d1c15]">Executive Benchmark</span>
                        <span className="text-[10px] text-[#0077b5] font-mono">60s Loom Link</span>
                      </div>
                      <div className="bg-[#fcfbf9] p-3 rounded-xl border border-[#0d1c15]/06 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#0d1c15] text-[#00e599] flex items-center justify-center shrink-0">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[11px] text-[#0d1c15] truncate">Hyperflow Outbound Benchmark</div>
                          <div className="text-[10px] text-[#5a6962]">60-second video walkthrough</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#5a6962]">
                        "Put together a quick 60-second visual comparison. Drop a reply if you'd like me to send the clip!"
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#0d1c15]/06 flex items-center justify-between text-[11px] font-mono text-[#5a6962]">
                    <span className="text-[#0077b5] font-semibold">28.4% Meeting Rate</span>
                    <span className="px-2 py-0.5 rounded bg-[#edf2ec] text-[#182e24]">Micro-Video Touch</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
}
