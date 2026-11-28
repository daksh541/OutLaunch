import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function AnalysisErrorState({
  title = 'Analysis step could not complete',
  message = 'A temporary issue occurred while processing this stage. Your existing profile and research data are preserved.',
  canRetry = true,
  onRetry = null,
  onBack = null,
  backLabel = 'Back to previous stage',
  retryLabel = 'Retry analysis',
}) {
  return (
    <div
      role="alert"
      className="w-full max-w-xl mx-auto my-8 p-6 rounded-2xl bg-[#13271e]/90 border border-rose-500/30 text-[#edf2ec] shadow-xl animate-fadeIn"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-[#a3b899] leading-relaxed">{message}</p>

          <div className="flex flex-wrap items-center gap-2.5 pt-3">
            {canRetry && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{retryLabel}</span>
              </button>
            )}

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a3328] hover:bg-[#234436] text-[#edf2ec] text-xs font-semibold border border-[#2e5744] transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#00e599]" />
                <span>{backLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
