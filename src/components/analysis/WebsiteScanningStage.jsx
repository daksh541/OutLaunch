import React, { useState, useEffect } from 'react';
import { Globe, Search, Database, Cpu, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import AnalysisStageHeader from './AnalysisStageHeader';

export default function WebsiteScanningStage({
  domain = '',
  statusMessage = 'Scanning website infrastructure…',
  error = null,
  onRetry = null,
  isCompleted = false,
  onContinue = null,
}) {
  const [substep, setSubstep] = useState(0);

  const scanSteps = [
    { label: `Connecting to ${domain}…`, desc: 'Resolving DNS, SSL certificates, and server endpoints' },
    { label: 'Inspecting landing page & public routes…', desc: 'Fetching /about, /pricing, and product documentation' },
    { label: 'Synthesizing business description & core offering…', desc: 'Parsing target buyers, problem statements, and capabilities' },
    { label: 'Compiling structured company knowledge graph…', desc: 'Validating verified facts against public citations' },
  ];

  useEffect(() => {
    if (isCompleted) {
      setSubstep(scanSteps.length);
      return;
    }
    const interval = setInterval(() => {
      setSubstep((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(interval);
  }, [isCompleted, scanSteps.length]);

  return (
    <div className="w-full max-w-3xl mx-auto py-6 animate-fadeIn text-[#edf2ec]">
      <AnalysisStageHeader
        kicker="Stage 02"
        title={`Scanning ${domain}`}
        subtitle="Our autonomous agent is extracting verifiable company information directly from public pages."
        status={isCompleted ? 'Scan Complete' : error ? 'Scan Paused' : 'Scanning'}
        onNext={isCompleted ? onContinue : null}
        nextLabel="View Company Profile"
      />

      {/* Main Terminal Mockup (Inspired by taskaway reference visual cards) */}
      <div className="bg-[#10221a] rounded-2xl sm:rounded-3xl border border-[#1f3f31] p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Animated Scanning Beam */}
        {!isCompleted && !error && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00e599] to-transparent animate-pulse" />
        )}

        {/* Live URL Target Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1c382b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#08130e] border border-[#234436] flex items-center justify-center text-[#00e599] shadow-inner font-bold font-mono">
              {domain.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-white font-mono">{domain}</div>
              <div className="text-xs text-[#a3b899]">Target Endpoint Verified</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCompleted && !error ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d9467]/20 border border-[#00e599]/30 text-[#00e599] text-xs font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Crawling in progress</span>
              </span>
            ) : isCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00e599]/20 border border-[#00e599]/40 text-[#00e599] text-xs font-mono font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Profile Extracted</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Step-by-Step Scan Tracker */}
        <div className="space-y-3 pt-2">
          {scanSteps.map((step, idx) => {
            const isFinished = isCompleted || substep > idx;
            const isCurrent = !isCompleted && substep === idx;

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border transition-all ${
                  isFinished
                    ? 'bg-[#0b1812] border-[#1f3f31] text-[#edf2ec]'
                    : isCurrent
                    ? 'bg-[#142d22] border-[#00e599]/40 text-white shadow-sm'
                    : 'bg-[#08130e]/40 border-transparent text-gray-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {isFinished ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00e599] shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-[#0d9467] animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-600 shrink-0 flex items-center justify-center text-[9px] font-mono">
                        {idx + 1}
                      </div>
                    )}
                    <span className="text-xs sm:text-sm font-medium font-sans">{step.label}</span>
                  </div>

                  <span className="text-[11px] font-mono text-[#a3b899]">
                    {isFinished ? 'Completed' : isCurrent ? 'Active' : 'Queued'}
                  </span>
                </div>
                <p className="text-[11px] text-[#a3b899] pl-6 pt-1 font-mono">{step.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Scan Status Notice */}
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs space-y-2">
            <p className="font-semibold">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Retry Crawl
              </button>
            )}
          </div>
        )}

        {isCompleted && onContinue && (
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] text-white text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer"
            >
              <span>Explore Company Profile</span>
              <ArrowRight className="w-4 h-4 text-[#00e599]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
