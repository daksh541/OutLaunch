import React from 'react';
import { ChevronRight } from 'lucide-react';

export const STAGES = [
  { id: 'input', label: 'Website Input', short: 'Input', number: '01' },
  { id: 'scanning', label: 'Domain Scan', short: 'Scan', number: '02' },
  { id: 'profile', label: 'Company Profile', short: 'Profile', number: '03' },
  { id: 'competitor_discovery', label: 'Competitor Discovery', short: 'Discovery', number: '04' },
  { id: 'competitor_comparison', label: 'Competitor Comparison', short: 'Comparison', number: '05' },
  { id: 'positioning', label: 'Positioning & Differentiation', short: 'Positioning', number: '06' },
  { id: 'summary', label: 'Executive Summary', short: 'Summary', number: '07' },
];

export default function AnalysisProgressTimeline({
  currentStage = 'input',
  completedStages = [],
  onStageClick = null,
}) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="w-full bg-[#0a1610]/95 border-b border-[#1c382b] backdrop-blur-md sticky top-0 z-30 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1">
        {STAGES.map((stage, idx) => {
          const isDone = completedStages.includes(stage.id) || idx < currentIndex;
          const isCurrent = stage.id === currentStage;
          const isClickable = isDone && Boolean(onStageClick);

          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                onClick={() => isClickable && onStageClick(stage.id)}
                disabled={!isClickable && !isCurrent}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 select-none ${
                  isCurrent
                    ? 'bg-[#0d9467]/25 text-[#00e599] border border-[#00e599]/40 shadow-xs'
                    : isDone
                    ? 'text-[#a3b899] hover:text-white hover:bg-[#13271e] cursor-pointer'
                    : 'text-gray-500 opacity-60 cursor-not-allowed'
                }`}
                title={stage.label}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors ${
                    isDone
                      ? 'bg-[#00e599] text-[#0d1c15]'
                      : isCurrent
                      ? 'bg-[#0d9467] text-white animate-pulse'
                      : 'bg-[#183125] text-gray-400'
                  }`}
                >
                  {isDone ? (
                    <svg
                      className="w-3 h-3 text-[#0d1c15]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" className="animate-check-draw" />
                    </svg>
                  ) : (
                    stage.number
                  )}
                </div>

                <span className="hidden sm:inline font-sans text-xs font-medium">
                  {stage.short}
                </span>
                <span className="sm:hidden font-mono text-[11px]">
                  {stage.number}
                </span>
              </button>

              {idx < STAGES.length - 1 && (
                <div className="hidden lg:flex items-center w-6 shrink-0 justify-center">
                  <svg className="w-full h-2" viewBox="0 0 24 4" fill="none">
                    <line
                      x1="0"
                      y1="2"
                      x2="24"
                      y2="2"
                      stroke={isDone ? '#00e599' : '#1c382b'}
                      strokeWidth="2"
                      strokeDasharray={isDone ? 'none' : '3 3'}
                      style={{ transition: 'stroke 0.4s ease' }}
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
