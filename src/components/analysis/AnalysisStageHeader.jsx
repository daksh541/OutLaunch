import React from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

export default function AnalysisStageHeader({
  kicker = 'Stage',
  title = '',
  subtitle = '',
  status = null,
  onBack = null,
  backLabel = 'Back',
  onNext = null,
  nextLabel = 'Continue',
  nextDisabled = false,
  extraAction = null,
}) {
  return (
    <div className="w-full pb-6 pt-2 border-b border-[#1c382b]/80 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div className="space-y-1.5 max-w-2xl">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#00e599] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e599] animate-pulse" />
            {kicker}
          </span>
          {status && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#13271e] border border-[#234436] text-[#a3b899]">
              {status}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#edf2ec] tracking-tight">
          {title}
        </h1>

        {subtitle && (
          <p className="text-xs sm:text-sm text-[#a3b899] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#13271e] hover:bg-[#1a3529] text-[#edf2ec] text-xs font-semibold border border-[#234436] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#00e599]" />
            <span>{backLabel}</span>
          </button>
        )}

        {extraAction}

        {onNext && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <span>{nextLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
