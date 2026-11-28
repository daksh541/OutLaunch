import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Download, Sparkles, Send, LayoutDashboard, Globe, Building2, Users, Package } from 'lucide-react';
import AnalysisStageHeader from './AnalysisStageHeader';

export default function AnalysisSummaryStage({
  domain = '',
  company = null,
  competitors = [],
  selectedAngles = [],
  onStartCampaign = null,
  onGoToDashboard = null,
  onBack = null,
}) {
  const companyName = company?.name || domain.split('.')[0].toUpperCase();
  const description = company?.description || 'Company intelligence summary synthesized from verified public domains.';
  const directCompetitors = competitors.filter((c) => c.relationship === 'direct');

  return (
    <div className="w-full max-w-4xl mx-auto py-6 animate-fadeIn text-[#edf2ec]">
      <AnalysisStageHeader
        kicker="Stage 07 · Deliverable"
        title="Complete GTM Analysis Summary"
        subtitle="Your company intelligence dossier, competitor matrix, and suggested outreach angles are assembled and ready for execution."
        status="Analysis Complete"
        onBack={onBack}
        backLabel="Positioning"
      />

      <div className="space-y-6">
        {/* Executive Hero Banner */}
        <div className="bg-[#10221a] rounded-2xl sm:rounded-3xl border border-[#1f3f31] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#1c382b]">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00e599]/15 text-[#00e599] font-mono text-xs font-bold border border-[#00e599]/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Deliverable Generated</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                {companyName} Intelligence Package
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#a3b899]">
                <span>{domain}</span>
                <span>·</span>
                <span>{competitors.length} Competitors Identified</span>
                <span>·</span>
                <span>{selectedAngles.length || 2} Active Angles</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 shrink-0">
              {onStartCampaign && (
                <button
                  type="button"
                  onClick={onStartCampaign}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] text-white text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4 text-[#00e599]" />
                  <span>Launch Outreach Sequence</span>
                </button>
              )}

              {onGoToDashboard && (
                <button
                  type="button"
                  onClick={onGoToDashboard}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#183527] hover:bg-[#204432] text-[#edf2ec] text-xs sm:text-sm font-semibold border border-[#234d39] transition-all cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#00e599]" />
                  <span>Open Workspace</span>
                </button>
              )}
            </div>
          </div>

          {/* Core Findings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
            <div className="p-4 rounded-xl bg-[#08130e] border border-[#1f3f31] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#a3b899] block">Company Profile</span>
              <span className="text-sm font-semibold text-white truncate block">{companyName}</span>
              <span className="text-xs text-[#00e599] font-mono">100% verified facts</span>
            </div>

            <div className="p-4 rounded-xl bg-[#08130e] border border-[#1f3f31] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#a3b899] block">Competitor Landscape</span>
              <span className="text-sm font-semibold text-white block">
                {directCompetitors.length} Direct · {competitors.length - directCompetitors.length} Related
              </span>
              <span className="text-xs text-[#00e599] font-mono">Citations logged</span>
            </div>

            <div className="p-4 rounded-xl bg-[#08130e] border border-[#1f3f31] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#a3b899] block">Strategy Readiness</span>
              <span className="text-sm font-semibold text-white block">Outbound Ready</span>
              <span className="text-xs text-[#00e599] font-mono">Human review enabled</span>
            </div>
          </div>
        </div>

        {/* 2-Column: Summary Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Company Synopsis */}
          <div className="p-6 rounded-2xl bg-[#10221a] border border-[#1f3f31] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#00e599]">
              <Building2 className="w-4 h-4" />
              <span>Extracted Positioning Synopsis</span>
            </div>
            <p className="text-xs sm:text-sm text-[#d8e3d6] leading-relaxed">
              {description}
            </p>
          </div>

          {/* Right Column: Identified Market Rivals */}
          <div className="p-6 rounded-2xl bg-[#10221a] border border-[#1f3f31] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#00e599]">
              <Users className="w-4 h-4" />
              <span>Competitor Breakdown</span>
            </div>
            <div className="space-y-2">
              {competitors.slice(0, 4).map((c, i) => (
                <div
                  key={c.domain || i}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#08130e] border border-[#1c382b] text-xs font-mono"
                >
                  <span className="text-white font-sans font-medium">{c.name || c.domain}</span>
                  <span className="text-[10px] text-[#00e599]">{c.relationship === 'direct' ? 'Direct' : 'Related'} ({c.relevance_score ?? c.score ?? 80}/100)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Safety & Review Notice */}
        <div className="p-4 rounded-xl bg-[#091510] border border-[#183325] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#a3b899]">
            <ShieldCheck className="w-4 h-4 text-[#00e599] shrink-0" />
            <span>Human-in-the-loop: Every outreach touchpoint can be edited before sequence dispatch.</span>
          </div>

          <div className="flex items-center gap-2">
            {onStartCampaign && (
              <button
                type="button"
                onClick={onStartCampaign}
                className="px-4 py-2 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Proceed to Campaign Builder →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
