import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Mail, Linkedin, Calendar, Check, ArrowRight, BarChart3, Clock, AlertCircle, Shield, ChevronRight, UserCheck, Inbox } from 'lucide-react';

const COMPETITORS = [
  { domain: 'hubspot.com', name: 'HubSpot', favicon: 'https://www.google.com/s2/favicons?domain=hubspot.com&sz=64' },
  { domain: 'salesforce.com', name: 'Salesforce', favicon: 'https://www.google.com/s2/favicons?domain=salesforce.com&sz=64' },
  { domain: 'apollo.io', name: 'Apollo.io', favicon: 'https://www.google.com/s2/favicons?domain=apollo.io&sz=64' },
  { domain: 'lemlist.com', name: 'Lemlist', favicon: 'https://www.google.com/s2/favicons?domain=lemlist.com&sz=64' }
];

export default function StackedWorkflowPipeline() {
  const [activeCompetitorIndex, setActiveCompetitorIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCompetitorIndex((prev) => (prev + 1) % COMPETITORS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="workflow" className="py-20 md:py-32 bg-[#f7f5f0] relative">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Sticky Section Header */}
        <div className="text-center max-w-xl mx-auto mb-8 md:mb-10 sticky top-[68px] sm:top-[76px] z-10 py-2.5 px-4 bg-[#f7f5f0]/95 backdrop-blur-md rounded-2xl border border-[#0d1c15]/08 shadow-xs transition-all">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[10px] font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-1">
            [ STAGE_01 — STAGE_05 ]
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-[#0d1c15] tracking-tight leading-tight">
            We run the entire outreach pipeline
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#4a5851] font-normal">
            Every step is automated, verified, and orchestrated into one seamless flow.
          </p>
        </div>

        {/* Stacked Cards Container */}
        <div className="space-y-10 md:space-y-12">

          {/* CARD 1: Find Prospects */}
          <div
            className="sticky transition-all duration-300"
            style={{ top: '165px', zIndex: 1 }}
          >
            <div className="bg-[#ffffff] rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.08)] overflow-hidden">
              <div className="p-6 sm:p-8 md:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#0d1c15]/08">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-1">
                      <span>STAGE 01</span>
                      <span>·</span>
                      <span>LEAD DISCOVERY</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15]">
                      Find your exact decision-makers
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-[#edf2ec] text-[#182e24] border border-[#dbe5da]">
                      Target: VP Sales &amp; Growth
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#edf2ec] text-[#182e24] border border-[#dbe5da]">
                      HQ: US, UK, Canada
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#00e599]/15 text-[#0d9467] font-bold border border-[#00e599]/30">
                      250M+ Profiles
                    </span>
                  </div>
                </div>

                {/* Realistic Prospect Table UI */}
                <div className="bg-[#fcfbf9] rounded-xl border border-[#0d1c15]/10 overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#edf2ec]/60 border-b border-[#0d1c15]/08 text-[#5a6962] font-mono text-[11px] uppercase">
                        <th className="py-3 px-4 font-semibold">Prospect</th>
                        <th className="py-3 px-4 font-semibold">Company &amp; Size</th>
                        <th className="py-3 px-4 font-semibold">Verified Contact</th>
                        <th className="py-3 px-4 font-semibold">Signals</th>
                        <th className="py-3 px-4 font-semibold text-right">Fit Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0d1c15]/06">
                      <tr className="hover:bg-white transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#0d1c15]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#0d9467] text-white flex items-center justify-center font-bold text-xs">
                              MR
                            </div>
                            <div>
                              <div className="font-semibold text-[#0d1c15]">Marcus Reed</div>
                              <div className="text-xs text-[#5a6962]">Head of Outbound</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#4a5851]">
                          <span className="font-medium text-[#0d1c15]">Nexar Systems</span> · 120-250 emp
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <span className="inline-flex items-center gap-1 text-[#0d9467]">
                            <Check className="w-3.5 h-3.5" /> m.reed@nexar.io
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="px-2 py-0.5 rounded bg-[#f2efe9] text-[#182e24]">
                            Hiring 3 SDRs
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0d9467]">
                          98.6%
                        </td>
                      </tr>

                      <tr className="hover:bg-white transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#0d1c15]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#182e24] text-[#00e599] flex items-center justify-center font-bold text-xs">
                              AL
                            </div>
                            <div>
                              <div className="font-semibold text-[#0d1c15]">Amara Lin</div>
                              <div className="text-xs text-[#5a6962]">Chief Commercial Officer</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#4a5851]">
                          <span className="font-medium text-[#0d1c15]">Prism Analytics</span> · 50-100 emp
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <span className="inline-flex items-center gap-1 text-[#0d9467]">
                            <Check className="w-3.5 h-3.5" /> amara@prismdata.co
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="px-2 py-0.5 rounded bg-[#f2efe9] text-[#182e24]">
                            Series A Announced
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0d9467]">
                          96.2%
                        </td>
                      </tr>

                      <tr className="hover:bg-white transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#0d1c15]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#273831] text-white flex items-center justify-center font-bold text-xs">
                              DV
                            </div>
                            <div>
                              <div className="font-semibold text-[#0d1c15]">David Vance</div>
                              <div className="text-xs text-[#5a6962]">VP Revenue Operations</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#4a5851]">
                          <span className="font-medium text-[#0d1c15]">Kinetix Cloud</span> · 250-500 emp
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <span className="inline-flex items-center gap-1 text-[#0d9467]">
                            <Check className="w-3.5 h-3.5" /> david@kinetix.com
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="px-2 py-0.5 rounded bg-[#f2efe9] text-[#182e24]">
                            New CRM deployed
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0d9467]">
                          94.9%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Research Companies */}
          <div
            className="sticky transition-all duration-300"
            style={{ top: '180px', zIndex: 2 }}
          >
            <div className="bg-[#ffffff] rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.08)] overflow-hidden">
              <div className="p-6 sm:p-8 md:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#0d1c15]/08">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-1">
                      <span>STAGE 02</span>
                      <span>·</span>
                      <span>DEEP COMPANY RESEARCH</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15]">
                      Learns everything about their business
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono bg-[#edf2ec] px-3 py-1.5 rounded-lg border border-[#dbe5da]">
                    <span>Monitoring competitor:</span>
                    <span className="font-bold text-[#0d9467]">{COMPETITORS[activeCompetitorIndex].name}</span>
                  </div>
                </div>

                {/* Company Research Panels UI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#fcfbf9] p-4 rounded-xl border border-[#0d1c15]/08">
                    <div className="text-xs font-mono uppercase text-[#73827a] font-bold mb-2">
                      01. Tech Stack Detected
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-white text-xs font-medium border border-[#0d1c15]/10">Salesforce</span>
                      <span className="px-2 py-0.5 rounded bg-white text-xs font-medium border border-[#0d1c15]/10">Marketo</span>
                      <span className="px-2 py-0.5 rounded bg-white text-xs font-medium border border-[#0d1c15]/10">Gong.io</span>
                      <span className="px-2 py-0.5 rounded bg-white text-xs font-medium border border-[#0d1c15]/10">Stripe Billing</span>
                    </div>
                    <p className="text-xs text-[#5a6962] mt-3">
                      Confirmed enterprise CRM setup; good fit for automated outbound sync.
                    </p>
                  </div>

                  <div className="bg-[#fcfbf9] p-4 rounded-xl border border-[#0d1c15]/08">
                    <div className="text-xs font-mono uppercase text-[#73827a] font-bold mb-2">
                      02. Hiring &amp; Expansion
                    </div>
                    <div className="space-y-1.5 text-xs text-[#0d1c15]">
                      <div className="flex items-center justify-between">
                        <span>Open BDR Roles:</span>
                        <span className="font-mono font-bold text-[#0d9467]">4 Active</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>New VP Onboarded:</span>
                        <span className="font-mono">2 months ago</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#5a6962] mt-3">
                      High outbound growth priority; rapid sales pod onboarding.
                    </p>
                  </div>

                  <div className="bg-[#fcfbf9] p-4 rounded-xl border border-[#0d1c15]/08">
                    <div className="text-xs font-mono uppercase text-[#73827a] font-bold mb-2">
                      03. Commercial Fit
                    </div>
                    <div className="text-2xl font-display font-bold text-[#0d9467] mb-1">
                      Tier 1 Target
                    </div>
                    <p className="text-xs text-[#5a6962]">
                      Meets 100% of ICP criteria with high deal size velocity (&gt;$25k ACV).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: Personalise Messages */}
          <div
            className="sticky transition-all duration-300"
            style={{ top: '195px', zIndex: 3 }}
          >
            <div className="bg-[#ffffff] rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.08)] overflow-hidden">
              <div className="p-6 sm:p-8 md:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#0d1c15]/08">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-1">
                      <span>STAGE 03</span>
                      <span>·</span>
                      <span>AI PERSONALISATION</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15]">
                      Writes genuine, high-conviction messages
                    </h3>
                  </div>
                  <div className="text-xs font-mono text-[#5a6962]">
                    Zero generic templates · 100% bespoke research angles
                  </div>
                </div>

                {/* Message Customization UI */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5 space-y-3">
                    <div className="text-xs font-mono text-[#73827a] uppercase font-bold">
                      Identified Angles &amp; Hooks
                    </div>
                    <div className="p-3 rounded-lg bg-[#edf2ec] border border-[#dbe5da] text-xs">
                      <span className="font-semibold text-[#0d1c15] block mb-0.5">Hook 1: Series A Sales Scaling</span>
                      <span className="text-[#4a5851]">References their recent funding round and SDR hiring velocity.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-[#0d1c15]/10 text-xs">
                      <span className="font-semibold text-[#0d1c15] block mb-0.5">Hook 2: HubSpot Migration</span>
                      <span className="text-[#4a5851]">Addresses data deduplication and sales rep prospecting overhead.</span>
                    </div>
                  </div>

                  <div className="lg:col-span-7 bg-[#fcfbf9] p-5 rounded-xl border border-[#0d1c15]/10">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0d1c15]/08 text-xs font-mono">
                      <span className="text-[#5a6962]">Subject: Quick observation on Nexar's outbound pod</span>
                      <span className="text-[#0d9467] font-semibold">Ready for Review</span>
                    </div>
                    <div className="text-xs sm:text-sm text-[#182e24] leading-relaxed space-y-2">
                      <p>
                        Hi Marcus, noticed Nexar is expanding the sales team with 3 new SDRs this month.
                      </p>
                      <p>
                        Most outbound leaders we chat with say their new reps burn 15+ hours each week manually researching buyer tech stacks instead of having conversations with buyers.
                      </p>
                      <p>
                        We built OutLaunch to automate that pre-call company research and generate personalized opening lines while leaving your team with 1-click human approval before anything sends.
                      </p>
                      <p className="font-medium text-[#0d9467]">
                        Open to a quick 5-min look at our benchmark reply rates?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 4: Reach Out Email + LinkedIn */}
          <div
            className="sticky transition-all duration-300"
            style={{ top: '210px', zIndex: 4 }}
          >
            <div className="bg-[#ffffff] rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.08)] overflow-hidden">
              <div className="p-6 sm:p-8 md:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#0d1c15]/08">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-1">
                      <span>STAGE 04</span>
                      <span>·</span>
                      <span>MULTI-CHANNEL OUTREACH</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15]">
                      Synchronized Email &amp; LinkedIn touches
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#0d9467]">
                    <Shield className="w-4 h-4" />
                    <span>Safe sending intervals &amp; mailbox rotation</span>
                  </div>
                </div>

                {/* Multi-channel sequence timeline */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-[#fcfbf9] p-4 rounded-xl border border-[#0d1c15]/10">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#0d9467] mb-2 font-bold">
                      <Mail className="w-4 h-4" />
                      <span>DAY 01 · EMAIL</span>
                    </div>
                    <div className="text-sm font-semibold text-[#0d1c15] mb-1">Personalized Pitch</div>
                    <p className="text-xs text-[#5a6962]">
                      Sent from warmed domain with custom research hook.
                    </p>
                  </div>

                  <div className="bg-[#fcfbf9] p-4 rounded-xl border border-[#0d1c15]/10">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#0077b5] mb-2 font-bold">
                      <Linkedin className="w-4 h-4" />
                      <span>DAY 03 · LINKEDIN</span>
                    </div>
                    <div className="text-sm font-semibold text-[#0d1c15] mb-1">Connection Note</div>
                    <p className="text-xs text-[#5a6962]">
                      Soft touch mentioning email topic &amp; common industry network.
                    </p>
                  </div>

                  <div className="bg-[#fcfbf9] p-4 rounded-xl border border-[#0d1c15]/10">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#0d9467] mb-2 font-bold">
                      <Mail className="w-4 h-4" />
                      <span>DAY 06 · EMAIL</span>
                    </div>
                    <div className="text-sm font-semibold text-[#0d1c15] mb-1">Value-Add Follow-up</div>
                    <p className="text-xs text-[#5a6962]">
                      Shares relevant customer case study or benchmark metrics.
                    </p>
                  </div>

                  <div className="bg-[#fcfbf9] p-4 rounded-xl border border-[#0d1c15]/10">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#0077b5] mb-2 font-bold">
                      <Linkedin className="w-4 h-4" />
                      <span>DAY 09 · INMAIL</span>
                    </div>
                    <div className="text-sm font-semibold text-[#0d1c15] mb-1">Direct Touchpoint</div>
                    <p className="text-xs text-[#5a6962]">
                      Auto-pauses instantly if reply is detected on email!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 5: Track Replies and Meetings */}
          <div
            className="sticky transition-all duration-300"
            style={{ top: '225px', zIndex: 5 }}
          >
            <div className="bg-[#0f1714] text-white rounded-2xl md:rounded-3xl border border-[#1b2b25] shadow-[0_20px_60px_-15px_rgba(13,28,21,0.4)] overflow-hidden">
              <div className="p-6 sm:p-8 md:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#1b2b25]">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#00e599] font-semibold uppercase tracking-wider mb-1">
                      <span>STAGE 05</span>
                      <span>·</span>
                      <span>REPLY HANDLING &amp; MEETINGS</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-display font-bold text-white">
                      Handles replies and books qualified meetings
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-[#00e599]/15 text-[#00e599] font-mono text-xs font-bold border border-[#00e599]/30">
                      18.4% Average Reply Rate
                    </span>
                  </div>
                </div>

                {/* Reply Inbox & Sentiment UI */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-7 bg-[#13221c] p-5 rounded-xl border border-[#1d3127]">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1d3127] text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <Inbox className="w-4 h-4 text-[#00e599]" />
                        <span>Recent Inbound Reply</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#00e599]/20 text-[#00e599] font-semibold">
                        HIGH INTENT
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-[#dce5da] leading-relaxed space-y-2">
                      <p className="font-semibold text-white">
                        From: Marcus Reed &lt;m.reed@nexar.io&gt;
                      </p>
                      <p>
                        "Hey team, this arrived right as we were evaluating outbound tooling for our new reps. Your note actually hit on our exact bottleneck with research. Do you have 15 minutes this Thursday afternoon to show us how the human-in-the-loop review queue works?"
                      </p>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-[#14231d] p-5 rounded-xl border border-[#1d3127] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-[#00e599] mb-2 font-bold">
                        <Calendar className="w-4 h-4" />
                        <span>MEETING SCHEDULED</span>
                      </div>
                      <div className="text-base font-semibold text-white">
                        Demo: OutLaunch &times; Nexar Systems
                      </div>
                      <div className="text-xs text-[#8ba096] mt-1 font-mono">
                        Thursday, 2:30 PM EST · Google Meet
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#1d3127] flex items-center justify-between text-xs font-mono text-[#8ba096]">
                      <span>Calendar synced</span>
                      <span className="text-[#00e599] font-semibold">CRM Logged ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
