import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Check, CheckCircle2, ShieldCheck, Tag, Target, MessageSquare } from 'lucide-react';
import AnalysisStageHeader from './AnalysisStageHeader';

export default function PositioningStage({
  company = null,
  competitors = [],
  selectedAngles = [],
  onToggleAngle = null,
  onContinue = null,
  onBack = null,
}) {
  const companyName = company?.name || company?.domain?.split('.')[0] || 'Company';

  // Derived suggested messaging angles based on real company facts and competitors
  const defaultAngles = [
    {
      id: 'angle-velocity',
      title: 'Time-to-Value & Operational Velocity',
      target: 'VP Engineering & Growth Leaders',
      hook: `Most teams looking at alternatives to ${competitors[0]?.name || 'traditional tools'} spend weeks on custom integrations. With ${companyName}, teams automate setup and ship in minutes with zero maintenance overhead.`,
      category: 'Speed & Simplicity',
    },
    {
      id: 'angle-precision',
      title: 'Human-in-the-Loop Precision & Control',
      target: 'Heads of Revenue Operations',
      hook: `Unlike black-box automated suites, ${companyName} combines high-depth intelligence with strict human approval gates so every touchpoint remains verified and aligned.`,
      category: 'Trust & Governance',
    },
    {
      id: 'angle-consolidation',
      title: 'Unified Architecture & Cost Efficiency',
      target: 'Founders & Technical Directors',
      hook: `Consolidate disjointed research vendors and outreach tools into a single intelligence pipeline, reducing tool sprawl and total cost of ownership by up to 60%.`,
      category: 'Consolidation',
    },
  ];

  const [activeAngles, setActiveAngles] = useState(
    selectedAngles.length > 0 ? selectedAngles : [defaultAngles[0].id, defaultAngles[1].id]
  );

  const handleToggle = (id) => {
    const updated = activeAngles.includes(id)
      ? activeAngles.filter((a) => a !== id)
      : [...activeAngles, id];
    setActiveAngles(updated);
    if (onToggleAngle) {
      onToggleAngle(updated);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 animate-fadeIn text-[#edf2ec]">
      <AnalysisStageHeader
        kicker="Stage 06"
        title="Positioning & Differentiation"
        subtitle="AI-synthesized outreach angles and differentiators grounded in your verified company profile and competitor landscape."
        status="Angles Ready"
        onBack={onBack}
        backLabel="Competitor Comparison"
        onNext={onContinue}
        nextLabel="View Final Summary"
      />

      <div className="space-y-6">
        {/* Differentiation Callout (Inspired by reference site's distinct hero block) */}
        <div className="bg-[#10221a] rounded-2xl sm:rounded-3xl border border-[#1f3f31] p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#00e599] font-bold">
            <Sparkles className="w-4 h-4" />
            <span>Market Positioning Thesis</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            How {companyName} Wins Against Competitors
          </h2>

          <p className="text-sm text-[#d8e3d6] leading-relaxed">
            Based on competitive analysis of {competitors.length > 0 ? competitors.map(c => c.name).slice(0, 3).join(', ') : 'the market'}, your primary advantage lies in verified end-to-end workflows and integrated intelligence. These suggested angles below can be approved for outbound sequences.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[#08130e] border border-[#1f3f31]">
              <span className="text-[10px] font-mono uppercase text-[#a3b899] block mb-1">Differentiator 1</span>
              <span className="text-xs font-semibold text-white">Direct Evidence Grounding</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#08130e] border border-[#1f3f31]">
              <span className="text-[10px] font-mono uppercase text-[#a3b899] block mb-1">Differentiator 2</span>
              <span className="text-xs font-semibold text-white">Human-in-the-Loop Safety</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#08130e] border border-[#1f3f31]">
              <span className="text-[10px] font-mono uppercase text-[#a3b899] block mb-1">Differentiator 3</span>
              <span className="text-xs font-semibold text-white">Turnkey Time to Value</span>
            </div>
          </div>
        </div>

        {/* Suggested Outreach Angles (Selectable cards) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#a3b899] font-semibold tracking-wider flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-[#00e599]" />
              <span>Select High-Conviction Messaging Angles</span>
            </span>
            <span className="text-xs font-mono text-[#00e599]">
              {activeAngles.length} selected
            </span>
          </div>

          <div className="space-y-3.5">
            {defaultAngles.map((angle) => {
              const isSelected = activeAngles.includes(angle.id);

              return (
                <div
                  key={angle.id}
                  onClick={() => handleToggle(angle.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#12281e] border-[#00e599]/60 shadow-lg'
                      : 'bg-[#10221a] border-[#1f3f31] hover:border-[#0d9467]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1c382b]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-sm sm:text-base text-white">
                          {angle.title}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#183527] border border-[#234d39] text-[#a3b899]">
                          Target: {angle.target}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#00e599]">
                        Theme: {angle.category}
                      </span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-[#00e599] border-[#00e599] text-[#0d1c15]'
                          : 'border-gray-500 bg-[#08130e]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Hook Quote Box */}
                  <div className="pt-3">
                    <p className="text-xs sm:text-sm text-[#d8e3d6] leading-relaxed font-sans bg-[#08130e] p-3.5 rounded-xl border border-[#1c382b]">
                      "{angle.hook}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Handoff Bar */}
        <div className="p-4 rounded-xl bg-[#091510] border border-[#183325] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#a3b899]">
            <ShieldCheck className="w-4 h-4 text-[#00e599] shrink-0" />
            <span>Selected angles will be compiled into your executive outreach summary.</span>
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] text-white font-semibold transition-all shadow-md cursor-pointer shrink-0"
          >
            <span>Generate Executive Summary</span>
            <ArrowRight className="w-4 h-4 text-[#00e599]" />
          </button>
        </div>
      </div>
    </div>
  );
}
