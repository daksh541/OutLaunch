import React, { useState } from 'react';
import { Search, Globe, ExternalLink, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import AnalysisStageHeader from './AnalysisStageHeader';
import AnalysisErrorState from './AnalysisErrorState';

export default function CompetitorDiscoveryStage({
  competitors = [],
  queries = [],
  searchesUsed = 0,
  candidatesCount = 0,
  isLoading = false,
  error = null,
  onRetry = null,
  onContinue = null,
  onBack = null,
  onSelectCompetitor = null,
}) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const getFavicon = (domain) => {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 animate-fadeIn text-[#edf2ec]">
      <AnalysisStageHeader
        kicker="Stage 04"
        title="Market Competitor Discovery"
        subtitle="Identified commercial rivals and alternative platforms with verified keyword & customer overlap."
        status={isLoading ? 'Discovering…' : error ? 'Attention Required' : `${competitors.length} Found`}
        onBack={onBack}
        backLabel="Company Profile"
        onNext={competitors.length > 0 && !isLoading ? onContinue : null}
        nextLabel="Compare Offerings"
        nextDisabled={isLoading || competitors.length === 0}
      />

      {/* Error state if failure occurred */}
      {error && (
        <AnalysisErrorState
          title="Competitor discovery could not finish"
          message={error.message || 'The search queries or candidate crawl timed out. You can retry immediately without re-scanning the company profile.'}
          canRetry={Boolean(onRetry)}
          onRetry={onRetry}
          onBack={onBack}
          backLabel="Return to Profile"
          retryLabel="Retry Discovery"
        />
      )}

      {/* Loading Skeleton if in flight */}
      {isLoading && (
        <div className="bg-[#10221a] rounded-2xl sm:rounded-3xl border border-[#1f3f31] p-6 sm:p-8 shadow-xl space-y-6 animate-pulse">
          <div className="flex items-center justify-between pb-4 border-b border-[#1c382b]">
            <div className="space-y-2">
              <div className="h-4 w-48 bg-[#183527] rounded" />
              <div className="h-3 w-72 bg-[#142d21] rounded" />
            </div>
            <div className="h-6 w-24 bg-[#183527] rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 bg-[#0c1a14] border border-[#183527] rounded-xl" />
            ))}
          </div>

          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-4 bg-[#0b1812] border border-[#1c382b] rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-32 bg-[#183527] rounded" />
                  <div className="h-4 w-16 bg-[#183527] rounded" />
                </div>
                <div className="h-3 w-3/4 bg-[#142d21] rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Competitor Content */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Query & Search Breadcrumb */}
          {queries.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#10221a] border border-[#1f3f31] space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono text-[#a3b899]">
                <span className="uppercase tracking-wider font-semibold text-[#00e599] flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  <span>Market Discovery Queries Executed</span>
                </span>
                <span>{searchesUsed} of {queries.length} searches used</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {queries.map((q, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg bg-[#08130e] border border-[#1c382b] text-xs font-mono text-[#d8e3d6]"
                  >
                    "{q}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Zero Competitors Found State */}
          {competitors.length === 0 && (
            <div className="p-8 rounded-2xl sm:rounded-3xl bg-[#10221a] border border-[#1f3f31] text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#183527] text-[#a3b899] flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">No Direct Competitors Found</h3>
                <p className="text-xs text-[#a3b899] max-w-md mx-auto">
                  Our crawler found no public competitors matching the exact verified keywords within the search limit. You can retry with expanded criteria or proceed with the verified company profile.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Discovery</span>
                  </button>
                )}
                {onContinue && (
                  <button
                    type="button"
                    onClick={onContinue}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#183527] hover:bg-[#204432] text-[#edf2ec] text-xs font-semibold cursor-pointer"
                  >
                    <span>Continue to Positioning</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#00e599]" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List of Verified Competitor Cards */}
          {competitors.length > 0 && (
            <div className="space-y-3">
              {competitors.map((comp, idx) => {
                const domain = comp.domain || `competitor-${idx + 1}.com`;
                const name = comp.name || domain;
                const score = comp.relevance_score ?? comp.score ?? 75;
                const isDirect = comp.relationship === 'direct';
                const isExpanded = expandedIndex === idx;
                const href = comp.source_urls?.[0] || `https://${domain}`;

                return (
                  <div
                    key={domain}
                    className={`rounded-2xl border transition-all ${
                      isExpanded
                        ? 'bg-[#12281e] border-[#00e599]/40 shadow-lg'
                        : 'bg-[#10221a] border-[#1f3f31] hover:border-[#0d9467]/50'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={getFavicon(domain)}
                          alt=""
                          className="w-7 h-7 rounded-lg bg-[#08130e] p-0.5 border border-[#1f3f31] object-contain shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-bold text-sm sm:text-base text-white tracking-tight truncate">
                              {name}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                isDirect
                                  ? 'bg-[#00e599]/15 border-[#00e599]/30 text-[#00e599] font-bold'
                                  : 'bg-[#183527] border-[#25523d] text-[#a3b899]'
                              }`}
                            >
                              {isDirect ? 'Direct Rival' : 'Related Match'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-mono text-[#a3b899] mt-0.5">
                            <span className="truncate">{domain}</span>
                            <span>·</span>
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#00e599] hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>Website</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Right Details & Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[#1c382b]">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-mono text-[#a3b899] uppercase tracking-wider block">
                            Relevance Fit
                          </span>
                          <span className="text-sm font-mono font-bold text-[#00e599]">
                            {score}/100
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onSelectCompetitor && (
                            <button
                              type="button"
                              onClick={() => onSelectCompetitor(comp)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#183527] hover:bg-[#204432] text-xs font-semibold text-white transition-colors cursor-pointer"
                            >
                              Compare
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleExpand(idx)}
                            className="p-1.5 rounded-lg bg-[#08130e] hover:bg-[#142d21] text-[#a3b899] hover:text-white transition-colors cursor-pointer border border-[#1f3f31]"
                            aria-label={isExpanded ? 'Collapse competitor details' : 'Expand competitor details'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details Tray */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-[#1c382b] space-y-3.5 text-xs animate-fadeIn">
                        {comp.description && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono uppercase text-[#a3b899] font-semibold">
                              Business Overview
                            </span>
                            <p className="text-[#d8e3d6] leading-relaxed">{comp.description}</p>
                          </div>
                        )}

                        {comp.ranking_reason && (
                          <div className="p-3 rounded-xl bg-[#08130e] border border-[#1c382b] text-[11px] font-mono text-[#a3b899]">
                            <span className="text-[#00e599] font-bold block mb-0.5">Evidence Grounding:</span>
                            {comp.ranking_reason}
                          </div>
                        )}

                        {/* Products / Offerings list if available */}
                        {Array.isArray(comp.products) && comp.products.length > 0 && (
                          <div>
                            <span className="text-[10px] font-mono uppercase text-[#a3b899] font-semibold block mb-1.5">
                              Detected Offerings
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {comp.products.map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="px-2 py-0.5 rounded-md bg-[#183527] border border-[#234d39] text-[#edf2ec] text-[11px]"
                                >
                                  {p.name || p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Row */}
          {competitors.length > 0 && onContinue && (
            <div className="p-4 rounded-xl bg-[#091510] border border-[#183325] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#a3b899]">
                <ShieldCheck className="w-4 h-4 text-[#00e599] shrink-0" />
                <span>{competitors.length} competitors ready for side-by-side dimensional comparison.</span>
              </div>

              <button
                type="button"
                onClick={onContinue}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] text-white font-semibold transition-all shadow-md cursor-pointer shrink-0"
              >
                <span>Proceed to Comparison Matrix</span>
                <ArrowRight className="w-4 h-4 text-[#00e599]" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
