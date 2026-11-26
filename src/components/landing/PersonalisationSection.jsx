import React from 'react';
import { Sparkles, FileText, Check, X, ShieldAlert, Zap, Globe, MessageSquareQuote } from 'lucide-react';

export default function PersonalisationSection() {
  return (
    <section className="py-20 md:py-28 bg-[#ffffff] border-y border-[#0d1c15]/08 relative">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="max-w-3xl mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>02 · RESEARCH &amp; PERSONALISATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-[1.12]">
            Never send a generic template again
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4a5851] leading-relaxed">
            Our agent reads company press releases, podcast appearances, LinkedIn posts, job vacancies, and tech stacks to write emails that feel like a thoughtful colleague reaching out.
          </p>
        </div>

        {/* Side-by-Side Comparison: Bad Generic vs Explee Deep Research */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Card 1: The Generic Way */}
          <div className="p-6 sm:p-8 rounded-2xl md:rounded-3xl border border-rose-200 bg-[#fffbfa] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-rose-100">
                <div className="flex items-center gap-2 text-rose-700 font-mono text-xs font-bold uppercase tracking-wider">
                  <X className="w-4 h-4" />
                  <span>The Generic AI Template (Spam Flagged)</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                  0.8% Reply Rate
                </span>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-[#4a5851] font-mono leading-relaxed bg-white p-4 rounded-xl border border-rose-100">
                <p className="text-rose-950 font-semibold">Subject: Synergy &amp; quick question for {`{FirstName}`}</p>
                <p>Hi {`{FirstName}`},</p>
                <p>
                  Hope this email finds you well! I noticed you are the {`{JobTitle}`} at {`{Company}`}. We are a leading AI agency providing best-in-class automated outreach solutions.
                </p>
                <p>
                  Are you free for a quick 15-minute sync this Tuesday at 2 PM to see if we have synergy?
                </p>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-rose-800">
                <div className="flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>Instant deletion; reads like automated mass outreach</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hurts domain reputation &amp; lands future emails in spam</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-rose-100 text-xs font-mono text-rose-600">
              Trigger detected: None · Confidence: 12%
            </div>
          </div>

          {/* Card 2: Explee Bespoke Angle */}
          <div className="p-6 sm:p-8 rounded-2xl md:rounded-3xl border border-[#0d9467]/30 bg-[#f7fbf8] shadow-[0_12px_40px_rgba(13,148,103,0.06)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d9467]/20">
                <div className="flex items-center gap-2 text-[#0d9467] font-mono text-xs font-bold uppercase tracking-wider">
                  <Check className="w-4 h-4" />
                  <span>Explee Bespoke Research Angle</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00e599]/20 text-[#0d9467] font-bold border border-[#00e599]/30">
                  18.4% Reply Rate
                </span>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-[#0d1c15] leading-relaxed bg-white p-4 rounded-xl border border-[#0d9467]/20 shadow-2xs font-sans">
                <p className="text-[#0d1c15] font-semibold font-mono text-xs pb-1 border-b border-[#0d1c15]/06">
                  Subject: Quick observation on Hyperflow's outbound pod scaling
                </p>
                <p>Hi Sarah,</p>
                <p>
                  Congrats on Hyperflow's Series A announcement yesterday. Noticed you're actively scaling your sales team with 4 new SDRs this month.
                </p>
                <p>
                  Most growth leaders we chat with find that new reps lose 15+ hours each week manually researching buyer tech stacks just to draft one tailored opening line.
                </p>
                <p>
                  We built Explee to automate that exact research layer while leaving your team with 1-click human approval before anything sends.
                </p>
                <p className="font-semibold text-[#0d9467]">
                  Would you be open to a 5-minute look at how this cuts SDR ramp time?
                </p>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-[#182e24]">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#0d9467]" />
                  <span>Mentions exact Series A funding signal &amp; 4 SDR open roles</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#0d9467]" />
                  <span>Soft, low-friction ask tailored to VP of Growth pain points</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#0d9467]/20 text-xs font-mono text-[#0d9467] flex items-center justify-between">
              <span>Verified Triggers: Crunchbase + LinkedIn Jobs</span>
              <span className="font-bold">Confidence: 98.6%</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
