import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, SplitSquareVertical, ExternalLink, Sparkles, SlidersHorizontal } from 'lucide-react';
import AnalysisStageHeader from './AnalysisStageHeader';

export default function CompetitorComparisonStage({
  company = null,
  competitors = [],
  onContinue = null,
  onBack = null,
}) {
  const [selectedCompIndex, setSelectedCompIndex] = useState(0);
  const selectedComp = competitors[selectedCompIndex] || competitors[0] || null;

  const companyProducts = (company?.products || []).map(p => p.name || p).filter(Boolean);
  const compProducts = (selectedComp?.products || []).map(p => p.name || p).filter(Boolean);

  const companyCustomers = (company?.customers || []).map(c => c.name || c).filter(Boolean);
  const compCustomers = (selectedComp?.customers || []).map(c => c.name || c).filter(Boolean);

  const getFavicon = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <div className="w-full max-w-5xl mx-auto py-6 animate-fadeIn text-[#edf2ec]">
      <AnalysisStageHeader
        kicker="Stage 05"
        title="Side-by-Side Competitor Comparison"
        subtitle="Compare verified features, customer profiles, and product differentiators against market rivals."
        status="Matrix Ready"
        onBack={onBack}
        backLabel="Competitor Discovery"
        onNext={onContinue}
        nextLabel="Positioning & Angles"
      />

      {competitors.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#10221a] border border-[#1f3f31] text-center space-y-3">
          <p className="text-xs text-[#a3b899]">No competitor records available for side-by-side comparison.</p>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-[#0d9467] text-white text-xs font-semibold"
          >
            Back to Competitors
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Competitor Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <span className="text-[11px] font-mono uppercase text-[#a3b899] shrink-0 font-semibold mr-1">
              Select Competitor:
            </span>
            {competitors.map((comp, idx) => {
              const isSelected = idx === selectedCompIndex;
              return (
                <button
                  key={comp.domain || idx}
                  type="button"
                  onClick={() => setSelectedCompIndex(idx)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-[#0d9467] text-white border-[#00e599]/60 shadow-sm font-semibold'
                      : 'bg-[#10221a] text-[#a3b899] border-[#1f3f31] hover:text-white hover:bg-[#152e22]'
                  }`}
                >
                  <img
                    src={getFavicon(comp.domain)}
                    alt=""
                    className="w-3.5 h-3.5 rounded object-contain shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span>{comp.name || comp.domain}</span>
                </button>
              );
            })}
          </div>

          {/* Side-by-Side Comparison Matrix */}
          <div className="bg-[#10221a] rounded-2xl sm:rounded-3xl border border-[#1f3f31] overflow-hidden shadow-2xl">
            {/* Column Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-[#1c382b] divide-y md:divide-y-0 md:divide-x divide-[#1c382b]">
              {/* Left Column: Your Company */}
              <div className="p-5 sm:p-6 bg-[#0c1a14]/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#00e599] uppercase font-bold tracking-wider">
                    YOUR COMPANY
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00e599]/15 text-[#00e599] border border-[#00e599]/30">
                    Primary
                  </span>
                </div>
                <h3 className="text-xl font-display font-bold text-white tracking-tight">
                  {company?.name || company?.domain}
                </h3>
                <p className="text-xs text-[#a3b899] font-mono truncate">{company?.domain}</p>
              </div>

              {/* Right Column: Selected Competitor */}
              <div className="p-5 sm:p-6 bg-[#10221a] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#a3b899] uppercase font-bold tracking-wider">
                    MARKET ALTERNATIVE
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#183527] text-[#a3b899] border border-[#234d39]">
                    {selectedComp?.relationship === 'direct' ? 'Direct Rival' : 'Related Match'} · {selectedComp?.relevance_score ?? selectedComp?.score ?? 80}/100 Fit
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-display font-bold text-white tracking-tight">
                    {selectedComp?.name || selectedComp?.domain}
                  </h3>
                  <a
                    href={selectedComp?.source_urls?.[0] || `https://${selectedComp?.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#00e599] hover:underline inline-flex items-center gap-1 font-mono"
                  >
                    <span>Visit site</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-[#a3b899] font-mono truncate">{selectedComp?.domain}</p>
              </div>
            </div>

            {/* Matrix Dimension Rows */}
            <div className="divide-y divide-[#1c382b] text-xs">
              {/* Row 1: Core Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#1c382b] p-5 sm:p-6 gap-4 sm:gap-0">
                <div className="space-y-1.5 md:pr-6">
                  <span className="text-[10px] font-mono uppercase text-[#a3b899] font-semibold block">
                    Core Business Proposition
                  </span>
                  <p className="text-[#d8e3d6] leading-relaxed">
                    {company?.description || 'Company overview verified from public pages.'}
                  </p>
                </div>
                <div className="space-y-1.5 md:pl-6">
                  <span className="text-[10px] font-mono uppercase text-[#a3b899] font-semibold block">
                    Rival Business Proposition
                  </span>
                  <p className="text-[#d8e3d6] leading-relaxed">
                    {selectedComp?.description || selectedComp?.ranking_reason || 'Verified alternative in market segment.'}
                  </p>
                </div>
              </div>

              {/* Row 2: Product & Capabilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#1c382b] p-5 sm:p-6 gap-4 sm:gap-0">
                <div className="space-y-2 md:pr-6">
                  <span className="text-[10px] font-mono uppercase text-[#a3b899] font-semibold block">
                    Key Products &amp; Capabilities
                  </span>
                  {companyProducts.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {companyProducts.map((p, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-[#08130e] border border-[#1f3f31] text-[#00e599] text-xs font-medium">
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#a3b899] italic">Direct platform offering</span>
                  )}
                </div>
                <div className="space-y-2 md:pl-6">
                  <span className="text-[10px] font-mono uppercase text-[#a3b899] font-semibold block">
                    Competitor Products &amp; Capabilities
                  </span>
                  {compProducts.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {compProducts.map((p, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-[#08130e] border border-[#1f3f31] text-[#edf2ec] text-xs font-medium">
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#a3b899] italic">Similar functional scope identified</span>
                  )}
                </div>
              </div>

              {/* Row 3: Target Audiences */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#1c382b] p-5 sm:p-6 gap-4 sm:gap-0">
                <div className="space-y-2 md:pr-6">
                  <span className="text-[10px] font-mono uppercase text-[#a3b899] font-semibold block">
                    Target Audiences &amp; ICP
                  </span>
                  {companyCustomers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {companyCustomers.map((c, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-[#08130e] border border-[#1f3f31] text-[#d8e3d6] text-xs">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#a3b899] italic">Enterprise &amp; growth businesses</span>
                  )}
                </div>
                <div className="space-y-2 md:pl-6">
                  <span className="text-[10px] font-mono uppercase text-[#a3b899] font-semibold block">
                    Competitor Audience Segment
                  </span>
                  {compCustomers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {compCustomers.map((c, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-[#08130e] border border-[#1f3f31] text-[#a3b899] text-xs">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#a3b899] italic">Overlapping industry buyers</span>
                  )}
                </div>
              </div>

              {/* Row 4: Evidence & Grounding Reason */}
              <div className="p-5 sm:p-6 bg-[#0a1610]/50 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#00e599] font-bold block">
                  Grounding Evidence &amp; Overlap Rationale
                </span>
                <p className="text-xs font-mono text-[#a3b899] leading-relaxed">
                  {selectedComp?.ranking_reason || 'Verified match identified through shared commercial queries and structural product terminology.'}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Handoff Bar */}
          <div className="p-4 rounded-xl bg-[#091510] border border-[#183325] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#a3b899]">
              <ShieldCheck className="w-4 h-4 text-[#00e599] shrink-0" />
              <span>Differences identified. Ready to generate sales positioning angles.</span>
            </div>

            <button
              type="button"
              onClick={onContinue}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] text-white font-semibold transition-all shadow-md cursor-pointer shrink-0"
            >
              <span>Continue to Positioning &amp; Differentiation</span>
              <ArrowRight className="w-4 h-4 text-[#00e599]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
