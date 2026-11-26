import React, { useState } from 'react';
import { Mail, Linkedin, ArrowRight, ShieldCheck, Clock, CheckCircle2, RotateCw } from 'lucide-react';

export default function MultichannelOutreachSection() {
  const [activeTab, setActiveTab] = useState('email');

  return (
    <section className="py-20 md:py-28 bg-[#f7f5f0] relative">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="max-w-3xl mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3">
            <Mail className="w-3.5 h-3.5" />
            <span>03 · MULTI-CHANNEL ORCHESTRATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-[1.12]">
            Synchronized Email and LinkedIn sequences
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4a5851] leading-relaxed">
            Reach prospects where they actually pay attention. Coordinate personalized cold emails with custom LinkedIn invitation notes and gentle follow-ups.
          </p>
        </div>

        {/* Multi-channel Interface Card */}
        <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.06)] p-6 sm:p-8 md:p-10">
          
          {/* Channel Selector Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-[#0d1c15]/08">
            <div className="flex items-center gap-2 p-1 rounded-xl bg-[#edf2ec] border border-[#dbe5da]">
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'linkedin'
                    ? 'bg-white text-[#0d1c15] shadow-xs'
                    : 'text-[#4a5851] hover:text-[#0d1c15]'
                }`}
              >
                <Linkedin className="w-4 h-4 text-[#0077b5]" />
                <span>LinkedIn Touchpoints</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#5a6962]">
              <RotateCw className="w-3.5 h-3.5 text-[#0d9467]" />
              <span>Smart collision defense: Auto-pauses if reply received anywhere</span>
            </div>
          </div>

          {/* Sequence Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-5 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-[#73827a] pb-3 mb-3 border-b border-[#0d1c15]/06">
                  <span>STEP 1 · DAY 1</span>
                  <span className="text-[#0d9467] font-semibold">9:15 AM EST</span>
                </div>
                <div className="text-base font-bold text-[#0d1c15] mb-1">
                  The Specific Research Hook
                </div>
                <p className="text-xs text-[#5a6962] leading-relaxed mb-4">
                  Sent from your dedicated warmed secondary domain with verified SPF/DKIM/DMARC headers.
                </p>
                <div className="p-3 rounded-lg bg-white border border-[#0d1c15]/08 text-xs font-mono text-[#4a5851]">
                  "Noticed your team is hiring 4 SDRs following your Series A..."
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#0d1c15]/06 text-[11px] font-mono text-[#0d9467] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Average Open: 64.2%
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-[#73827a] pb-3 mb-3 border-b border-[#0d1c15]/06">
                  <span>STEP 2 · DAY 3</span>
                  <span className="text-[#0077b5] font-semibold">2:45 PM EST</span>
                </div>
                <div className="text-base font-bold text-[#0d1c15] mb-1">
                  LinkedIn Connection Note
                </div>
                <p className="text-xs text-[#5a6962] leading-relaxed mb-4">
                  Soft social touchpoint referencing mutual peers and the earlier email context.
                </p>
                <div className="p-3 rounded-lg bg-white border border-[#0d1c15]/08 text-xs font-mono text-[#4a5851]">
                  "Hi Sarah, loved your keynote on outbound ramp time. Sent a brief note to your inbox..."
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#0d1c15]/06 text-[11px] font-mono text-[#0077b5] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 42.8% Acceptance Rate
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-[#73827a] pb-3 mb-3 border-b border-[#0d1c15]/06">
                  <span>STEP 3 · DAY 7</span>
                  <span className="text-[#0d9467] font-semibold">10:00 AM EST</span>
                </div>
                <div className="text-base font-bold text-[#0d1c15] mb-1">
                  Value-First Follow-up
                </div>
                <p className="text-xs text-[#5a6962] leading-relaxed mb-4">
                  Offers a benchmark report or competitor tech teardown without aggressive pushiness.
                </p>
                <div className="p-3 rounded-lg bg-white border border-[#0d1c15]/08 text-xs font-mono text-[#4a5851]">
                  "Put together a 2-page teardown on how similar SaaS companies structured their outbound..."
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#0d1c15]/06 text-[11px] font-mono text-[#0d9467] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 18.4% Cumulative Reply Rate
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
