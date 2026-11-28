import React, { useState, useEffect } from 'react';
import { prefersReducedMotion } from '../../lib/motion';

export default function InitialPreloader({ onFinish }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('outlaunch_preloader_seen');
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) {
      if (onFinish) onFinish();
      return;
    }

    sessionStorage.setItem('outlaunch_preloader_seen', '1');

    if (prefersReducedMotion()) {
      setVisible(false);
      if (onFinish) onFinish();
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setVisible(false);
            if (onFinish) onFinish();
          }, 250);
          return 100;
        }
        return prev + 12;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [visible, onFinish]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 bg-[#0d1c15] text-[#edf2ec] flex flex-col items-center justify-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] select-none"
    >
      <div className="flex flex-col items-center gap-5">
        {/* Animated Brand Mark */}
        <div className="w-14 h-14 rounded-2xl bg-[#0a1610] border border-[#00e599]/40 text-[#00e599] flex items-center justify-center shadow-[0_0_30px_rgba(0,229,153,0.25)]">
          <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
            <rect
              x="3"
              y="3"
              width="26"
              height="26"
              rx="7"
              stroke="#00e599"
              strokeWidth="2.5"
              className="svg-draw-path"
            />
            <path
              d="M11 16L15 20L22 12"
              stroke="#00e599"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-check-draw"
            />
          </svg>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="font-display font-bold text-xl tracking-tight text-white">
            OutLaunch
          </span>
          <span className="font-mono text-[10px] text-[#00e599] uppercase tracking-widest">
            Autonomous Outreach Infrastructure
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-[#1a382b] rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-[#0d9467] to-[#00e599] transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
