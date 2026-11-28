import React, { useState } from 'react';
import { SlidersHorizontal, Mail, Linkedin, CheckCircle2, UserCheck, ShieldCheck, Sparkles, Send, Clock, ArrowRight } from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import AnimatedWordHighlight from './AnimatedWordHighlight';

const SCENARIOS = {
  growth: {
    label: 'Series A/B Scale-up',
    target: 'VP of Growth & Sales Leadership',
    weeklyLeads: 250,
    estimatedReplies: '18 - 26 qualified conversations/mo',
    signals: ['Recent $10M+ Capital Raise', 'Scaling Sales Headcount > 30%'],
    day1Email: 'Hi [First_Name] — congratulations on the recent funding round. Noticed your team is hiring 4 outbound SDRs this quarter...',
    day3LinkedIn: 'Hi [First_Name] — loved your recent post on scaling outbound without burning domain health. Would love to connect!',
    day7Email: 'Sharing a brief 2-page teardown on how similar SaaS companies structured their initial outbound sequences...'
  },
  enterprise: {
    label: 'Enterprise Infrastructure',
    target: 'CTO, VP Engineering, DevOps Directors',
    weeklyLeads: 150,
    estimatedReplies: '12 - 18 technical meetings/mo',
    signals: ['Multi-Cloud Migration', 'Kubernetes / SOC-2 Compliance Push'],
    day1Email: 'Hi [First_Name] — saw [Company] is expanding its distributed cluster architecture across AWS and GCP...',
    day3LinkedIn: 'Hi [First_Name] — noticed your engineering blog post on latency optimization in distributed clusters. Great read!',
    day7Email: 'Put together benchmark metrics comparing API response times across enterprise cloud providers. Open to a look?'
  },
  fintech: {
    label: 'B2B FinTech & Payments',
    target: 'Head of Risk, Compliance & Product',
    weeklyLeads: 200,
    estimatedReplies: '15 - 22 discovery calls/mo',
    signals: ['Payment Gateway Integration', 'New State Licensing Approvals'],
    day1Email: 'Hi [First_Name] — noticed [Company]\'s recent payment gateway expansion and focus on real-time transaction reconciliation...',
    day3LinkedIn: 'Hi [First_Name] — congrats on the new compliance accreditation. Exciting milestone for [Company]!',
    day7Email: 'Quick follow-up on streamlining transaction dispute workflows. Would this be relevant for your team this quarter?'
  }
};

export default function OutboundSequenceSimulator() {
  const { navigate } = useNavigation();
  const [selectedScenario, setSelectedScenario] = useState('growth');
  const [channelMix, setChannelMix] = useState('omnichannel'); // 'omnichannel' | 'email' | 'linkedin'
  const [reviewMode, setReviewMode] = useState('manual'); // 'manual' | 'confidence'

  const current = SCENARIOS[selectedScenario];

  return (
    <section id="demo" className="py-20 md:py-24 bg-transparent relative">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#dbe5da] text-[11px] font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3 shadow-xs">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>INTERACTIVE WORKFLOW SIMULATOR</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-tight">
            <AnimatedWordHighlight text="Configure your outbound cadence" />
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4a5851] leading-relaxed">
            Test different buyer personas, channel mixes, and governance workflows to see how OutLaunch prepares your pipeline.
          </p>
        </div>

        {/* Interactive Configuration Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.06)] overflow-hidden">
          
          {/* Controls Bar */}
          <div className="p-6 sm:p-8 bg-[#fcfbf9] border-b border-[#0d1c15]/08 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Target ICP */}
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#5a6962] mb-2.5">
                Target Market / ICP
              </label>
              <div className="flex flex-col gap-1.5">
                {Object.entries(SCENARIOS).map(([key, data]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedScenario(key)}
                    className={`px-3 py-2 rounded-xl text-left text-xs font-medium transition-all cursor-pointer border ${
                      selectedScenario === key
                        ? 'bg-[#0d1c15] text-white border-[#0d1c15] shadow-xs'
                        : 'bg-white text-[#4a5851] border-[#0d1c15]/10 hover:border-[#0d1c15]/25'
                    }`}
                  >
                    <div className="font-semibold">{data.label}</div>
                    <div className="text-[11px] opacity-80">{data.target}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Channel Strategy */}
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#5a6962] mb-2.5">
                Channel Orchestration
              </label>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setChannelMix('omnichannel')}
                  className={`px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                    channelMix === 'omnichannel'
                      ? 'bg-[#0d1c15] text-white border-[#0d1c15] shadow-xs'
                      : 'bg-white text-[#4a5851] border-[#0d1c15]/10 hover:border-[#0d1c15]/25'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#00e599]" />
                    <span>+</span>
                    <Linkedin className="w-3.5 h-3.5 text-[#00e599]" />
                    <span>Synchronized (Email + LinkedIn)</span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">Highest conversion with collision guard</div>
                </button>

                <button
                  type="button"
                  onClick={() => setChannelMix('email')}
                  className={`px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                    channelMix === 'email'
                      ? 'bg-[#0d1c15] text-white border-[#0d1c15] shadow-xs'
                      : 'bg-white text-[#4a5851] border-[#0d1c15]/10 hover:border-[#0d1c15]/25'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#0d9467]" />
                    <span>Email Outbound Only</span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">Dedicated secondary domain warm-up</div>
                </button>

                <button
                  type="button"
                  onClick={() => setChannelMix('linkedin')}
                  className={`px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                    channelMix === 'linkedin'
                      ? 'bg-[#0d1c15] text-white border-[#0d1c15] shadow-xs'
                      : 'bg-white text-[#4a5851] border-[#0d1c15]/10 hover:border-[#0d1c15]/25'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
                    <span>LinkedIn Social Touches Only</span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">Connection invitations &amp; follow-up DMs</div>
                </button>
              </div>
            </div>

            {/* 3. Human Governance */}
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#5a6962] mb-2.5">
                Human Oversight Level
              </label>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setReviewMode('manual')}
                  className={`px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                    reviewMode === 'manual'
                      ? 'bg-[#0d1c15] text-white border-[#0d1c15] shadow-xs'
                      : 'bg-white text-[#4a5851] border-[#0d1c15]/10 hover:border-[#0d1c15]/25'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#00e599]" />
                    <span>100% Pre-Dispatch Review</span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">Every message requires manual approval</div>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewMode('confidence')}
                  className={`px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                    reviewMode === 'confidence'
                      ? 'bg-[#0d1c15] text-white border-[#0d1c15] shadow-xs'
                      : 'bg-white text-[#4a5851] border-[#0d1c15]/10 hover:border-[#0d1c15]/25'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0d9467]" />
                    <span>Confidence Filter (&gt;95% Fit)</span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">Auto-queue top tier; review edge cases</div>
                </button>
              </div>
            </div>

          </div>

          {/* Real-time Cadence Preview */}
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Top Metric Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-[#0d1c15]/08 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-[#f7f5f0] border border-[#0d1c15]/08">
                <span className="text-[#5a6962] block mb-1">WEEKLY VERIFIED PROSPECTS</span>
                <span className="text-lg font-bold text-[#0d1c15]">{current.weeklyLeads} Contacts</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#f7f5f0] border border-[#0d1c15]/08">
                <span className="text-[#5a6962] block mb-1">CONVERSATION PROJECTION</span>
                <span className="text-lg font-bold text-[#0d9467]">{current.estimatedReplies}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#f7f5f0] border border-[#0d1c15]/08">
                <span className="text-[#5a6962] block mb-1">DELIVERABILITY HEALTH</span>
                <span className="text-lg font-bold text-[#0d1c15]">99.2% (SPF/DKIM/DMARC)</span>
              </div>
            </div>

            {/* Generated Cadence Steps */}
            <div>
              <h4 className="text-sm font-mono font-semibold uppercase tracking-wider text-[#0d1c15] mb-4">
                Simulated Multi-Touch Sequence
              </h4>

              <div className="space-y-3">
                {/* Touch 1 */}
                {(channelMix === 'omnichannel' || channelMix === 'email') && (
                  <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#edf2ec] text-[#0d9467] flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] font-bold text-[#0d9467]">STEP 01 · DAY 1 (EMAIL)</span>
                          <span className="text-[#73827a] font-mono text-[10px]">9:30 AM EST</span>
                        </div>
                        <p className="text-[#33413a] leading-relaxed max-w-2xl font-mono text-[11px]">
                          {current.day1Email}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-[#edf2ec] text-[#182e24] font-mono text-[10px] shrink-0 self-start md:self-center">
                      Hook: Funding Signal
                    </span>
                  </div>
                )}

                {/* Touch 2 */}
                {(channelMix === 'omnichannel' || channelMix === 'linkedin') && (
                  <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#edf2ec] text-[#0077b5] flex items-center justify-center shrink-0">
                        <Linkedin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] font-bold text-[#0077b5]">STEP 02 · DAY 3 (LINKEDIN)</span>
                          <span className="text-[#73827a] font-mono text-[10px]">2:15 PM EST</span>
                        </div>
                        <p className="text-[#33413a] leading-relaxed max-w-2xl font-mono text-[11px]">
                          "{current.day3LinkedIn}"
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-[#edf2ec] text-[#182e24] font-mono text-[10px] shrink-0 self-start md:self-center">
                      Social Context Note
                    </span>
                  </div>
                )}

                {/* Touch 3 */}
                {(channelMix === 'omnichannel' || channelMix === 'email') && (
                  <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#edf2ec] text-[#0d9467] flex items-center justify-center shrink-0">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] font-bold text-[#0d9467]">STEP 03 · DAY 7 (EMAIL FOLLOW-UP)</span>
                          <span className="text-[#73827a] font-mono text-[10px]">11:00 AM EST</span>
                        </div>
                        <p className="text-[#33413a] leading-relaxed max-w-2xl font-mono text-[11px]">
                          {current.day7Email}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-[#edf2ec] text-[#182e24] font-mono text-[10px] shrink-0 self-start md:self-center">
                      Threaded Benchmark
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Launch CTA */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[#5a6962] font-mono">
                <span>Governance Mode: </span>
                <span className="font-semibold text-[#0d1c15]">
                  {reviewMode === 'manual' ? '100% Pre-Dispatch Manual Approval' : 'Auto-queue >95% ICP fit'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                <span>Launch This Cadence</span>
                <ArrowRight className="w-4 h-4 text-[#00e599]" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
