import React, { useState, useEffect } from 'react';

/**
 * Layout-accurate skeleton screens for dashboard views with shimmer effect
 * and staggered entrance crossfade.
 */
export function DashboardHeaderSkeleton({ subtitle = true, actions = 2 }) {
  return (
    <div className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
      <div className="space-y-3">
        {/* Eyebrow badge skeleton */}
        <div className="w-32 h-5 rounded-full skeleton-shimmer" />
        {/* Title skeleton */}
        <div className="w-72 sm:w-96 h-8 rounded-lg skeleton-shimmer" />
        {subtitle && (
          <div className="w-56 sm:w-80 h-4 rounded skeleton-shimmer opacity-75" />
        )}
      </div>

      {actions > 0 && (
        <div className="flex items-center gap-3">
          {Array.from({ length: actions }).map((_, i) => (
            <div key={i} className="w-28 sm:w-36 h-10 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      )}
    </div>
  );
}

export function MetricCardsSkeleton({ count = 6 }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${count} gap-3.5 animate-fadeIn`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-xs flex flex-col justify-between h-28 space-y-2"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="w-20 h-3 rounded skeleton-shimmer" />
          <div className="w-24 h-7 rounded-md skeleton-shimmer" />
          <div className="w-16 h-2.5 rounded skeleton-shimmer opacity-60" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 6 }) {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#0d1c15]/08 shadow-sm overflow-hidden animate-fadeIn">
      {/* Table Header skeleton */}
      <div className="p-4 border-b border-[#0d1c15]/08 flex items-center justify-between gap-4">
        <div className="w-48 h-5 rounded skeleton-shimmer" />
        <div className="flex gap-2">
          <div className="w-28 h-8 rounded-lg skeleton-shimmer" />
          <div className="w-20 h-8 rounded-lg skeleton-shimmer" />
        </div>
      </div>

      <div className="divide-y divide-[#0d1c15]/06">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="p-4 flex items-center justify-between gap-4"
            style={{ animationDelay: `${r * 50}ms` }}
          >
            <div className="flex items-center gap-3 w-1/3">
              <div className="w-9 h-9 rounded-full skeleton-shimmer shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="w-3/4 h-4 rounded skeleton-shimmer" />
                <div className="w-1/2 h-3 rounded skeleton-shimmer opacity-70" />
              </div>
            </div>

            <div className="w-20 h-6 rounded-full skeleton-shimmer" />
            <div className="w-16 h-4 rounded skeleton-shimmer" />
            <div className="w-20 h-4 rounded skeleton-shimmer" />
            <div className="w-16 h-8 rounded-lg skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerSuccessSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      <DashboardHeaderSkeleton actions={2} />
      <MetricCardsSkeleton count={6} />
      
      {/* Tabs Skeleton */}
      <div className="flex gap-2 pb-2 border-b border-[#0d1c15]/08">
        {['Overview', 'Account Health', 'Renewals', 'Churn Risk', 'Expansion'].map((_, i) => (
          <div key={i} className="w-24 h-9 rounded-xl skeleton-shimmer" />
        ))}
      </div>

      {/* 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <TableSkeleton rows={4} />
        </div>
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-[#0d1c15]/08 space-y-4">
          <div className="w-36 h-5 rounded skeleton-shimmer" />
          <div className="h-40 rounded-xl skeleton-shimmer" />
          <div className="space-y-2">
            <div className="w-full h-12 rounded-lg skeleton-shimmer" />
            <div className="w-full h-12 rounded-lg skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TerritorySkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      <DashboardHeaderSkeleton actions={2} />
      <MetricCardsSkeleton count={6} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <TableSkeleton rows={5} />
        </div>
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-[#0d1c15]/08 space-y-4">
          <div className="w-40 h-5 rounded skeleton-shimmer" />
          <div className="h-48 rounded-xl skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

/**
 * Determinate progress bar and rotating status text for AI Research steps
 */
export function AiResearchProgressBar({
  durationMs = 2400,
  steps = [
    'Scanning site & company data…',
    'Analyzing role context & tech stack…',
    'Finding competitors & positioning angles…',
    'Synthesizing verified outreach thesis…',
  ],
  onComplete = null,
}) {
  const [progress, setProgress] = useState(12);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const stepDuration = durationMs / steps.length;
    const intervalTime = 60;
    const increment = (100 / (durationMs / intervalTime));

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(progressTimer);
          if (onComplete) onComplete();
          return 100;
        }
        return next;
      });
    }, intervalTime);

    const stepTimer = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1 < steps.length ? prev + 1 : prev));
    }, stepDuration);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
    };
  }, [durationMs, steps, onComplete]);

  return (
    <div className="p-7 sm:p-9 flex flex-col items-center justify-center text-center bg-[#fcfbf9] rounded-2xl border border-[#0d1c15]/08 shadow-xs space-y-4 animate-fadeIn">
      {/* Rotating status pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] text-[#0d9467] font-mono text-xs font-semibold border border-[#dbe5da]">
        <div className="w-2 h-2 rounded-full bg-[#00e599] animate-ping" />
        <span className="transition-all duration-300">
          {steps[currentStepIndex]}
        </span>
      </div>

      {/* Determinate Progress Track */}
      <div className="w-full max-w-md space-y-2">
        <div className="w-full h-2 rounded-full bg-[#edf2ec] overflow-hidden p-0.5 border border-[#0d1c15]/06">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0d9467] to-[#00e599] transition-all duration-150 ease-out"
            style={{ width: `${Math.min(100, Math.round(progress))}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] font-mono text-[#73827a]">
          <span>Processing model inputs</span>
          <span className="tabular-nums font-bold text-[#0d1c15]">
            {Math.min(100, Math.round(progress))}%
          </span>
        </div>
      </div>

      <p className="text-xs text-[#5a6962] max-w-sm">
        Gathering structured evidence and computing personalization hooks without hallucinating facts.
      </p>
    </div>
  );
}

export function MeetingsSkeleton() {
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Search and Tabs Bar Skeleton */}
      <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          {['Upcoming', 'Completed', 'Cancelled', 'All'].map((_, i) => (
            <div key={i} className="w-20 h-8 rounded-lg skeleton-shimmer" />
          ))}
        </div>
        <div className="w-48 h-8 rounded-lg skeleton-shimmer" />
      </div>

      {/* Meeting Cards List Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full skeleton-shimmer shrink-0" />
              <div className="space-y-1.5">
                <div className="w-40 sm:w-56 h-4 rounded skeleton-shimmer" />
                <div className="w-28 sm:w-36 h-3 rounded skeleton-shimmer opacity-70" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-24 h-6 rounded-full skeleton-shimmer" />
              <div className="w-32 h-6 rounded-full skeleton-shimmer" />
              <div className="w-20 h-8 rounded-lg skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueIntelligenceSkeleton() {
  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      <DashboardHeaderSkeleton actions={2} />
      <MetricCardsSkeleton count={4} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="w-44 h-5 rounded skeleton-shimmer" />
            <div className="w-24 h-7 rounded-lg skeleton-shimmer" />
          </div>
          <AnalyticsChartSkeleton />
        </div>

        <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-sm space-y-4">
          <div className="w-36 h-5 rounded skeleton-shimmer" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-xl border border-[#0d1c15]/06 space-y-2">
                <div className="w-3/4 h-3.5 rounded skeleton-shimmer" />
                <div className="w-1/2 h-3 rounded skeleton-shimmer opacity-70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsChartSkeleton({ height = 240 }) {
  const barHeights = [45, 68, 52, 85, 74, 92, 60, 78, 95, 82, 63, 88];

  return (
    <div className="w-full rounded-xl bg-[#faf9f5] border border-[#0d1c15]/06 p-4 sm:p-6 animate-fadeIn">
      {/* Y-axis grid lines with shimmering bars */}
      <div className="relative w-full" style={{ height: `${height}px` }}>
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-[#0d1c15]/10 w-full" />
          <div className="border-b border-[#0d1c15]/10 w-full" />
          <div className="border-b border-[#0d1c15]/10 w-full" />
          <div className="border-b border-[#0d1c15]/10 w-full" />
        </div>

        {/* Shimmering Bars Container */}
        <div className="absolute inset-x-2 bottom-0 top-4 flex items-end justify-between gap-1 sm:gap-2 px-2">
          {barHeights.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div
                className="w-full max-w-[28px] rounded-t-md skeleton-shimmer"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* X-axis labels skeleton */}
      <div className="flex justify-between items-center pt-3 mt-2 border-t border-[#0d1c15]/08 px-2">
        {['W1', 'W2', 'W3', 'W4', 'W5', 'W6'].map((_, i) => (
          <div key={i} className="w-6 h-2.5 rounded skeleton-shimmer opacity-60" />
        ))}
      </div>
    </div>
  );
}
