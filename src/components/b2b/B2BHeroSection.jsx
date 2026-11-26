import React from 'react';
import { Zap, Sparkles, RefreshCw, Globe2, Building2, MapPin, FileCheck2, Database, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function B2BHeroSection() {
  return (
    <div className="max-w-[1200px] mx-auto px-4">
      <section className="text-center pt-20 md:pt-28 flex flex-col items-center">
        {/* Editorial Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[12px] font-mono font-semibold text-[#0d9467] mb-6">
          <Zap className="h-3.5 w-3.5 text-[#0d9467]" />
          <span>GLOBAL B2B DIRECTORY · 105M+ PROFILES</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-display font-bold mb-4 tracking-[-0.03em] leading-[1.12] text-[#0d1c15] max-w-4xl mx-auto">
          Largest Global B2B Company Database
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-[#4a5851] max-w-2xl mx-auto pb-10 leading-relaxed font-normal">
          Access{' '}
          <span className="font-semibold text-[#0d1c15]">105M+ verified company profiles</span>{' '}
          with AI-synthesized firmographics, tech stacks, decision-maker attributes, and official corporate registries.
        </p>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 w-full mb-12">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#0d1c15]/10 p-6 md:p-8 text-center shadow-[0_4px_24px_rgba(13,28,21,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2 h-10">
                  <div className="p-2 bg-[#edf2ec] text-[#0d9467] rounded-xl flex items-center justify-center">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <span className="text-[#73827a] text-sm font-bold">+</span>
                  <div className="p-2 bg-[#edf2ec] text-[#0d9467] rounded-xl flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="text-[#73827a] text-sm font-bold">+</span>
                  <div className="p-2 bg-[#edf2ec] text-[#0d9467] rounded-xl flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <h2 className="text-xl font-bold font-display text-[#0d1c15] mb-2">238 Countries Covered</h2>
              <p className="text-sm text-[#4a5851] leading-relaxed">
                Global entity coverage spanning North America, EMEA, LATAM, and APAC with local corporate registry matching.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#0d1c15]/08 text-xs font-mono text-[#0d9467] font-semibold">
              Global Registry Verification
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#0d1c15]/10 p-6 md:p-8 text-center shadow-[0_4px_24px_rgba(13,28,21,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex justify-center mb-4">
                <div className="p-2.5 bg-[#edf2ec] text-[#0d9467] rounded-2xl flex items-center justify-center">
                  <Database className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-xl font-bold font-display text-[#0d1c15] mb-2">Multi-Source Verification</h2>
              <p className="text-sm text-[#4a5851] leading-relaxed">
                Data reconciled across official gazettes, SEC filings, hiring portals, DNS records, and commercial registers.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#0d1c15]/08 text-xs font-mono text-[#0d9467] font-semibold">
              Triangulated Accuracy
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#0d1c15]/10 p-6 md:p-8 text-center shadow-[0_4px_24px_rgba(13,28,21,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex justify-center mb-4">
                <div className="p-2.5 bg-[#edf2ec] text-[#0d9467] rounded-2xl flex items-center justify-center">
                  <RefreshCw className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-xl font-bold font-display text-[#0d1c15] mb-2">Continuous Freshness</h2>
              <p className="text-sm text-[#4a5851] leading-relaxed">
                Weekly incremental scans tracking executive moves, tech stack adoption, domain status, and headcounts.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#0d1c15]/08 text-xs font-mono text-[#0d9467] font-semibold">
              Continuous Pipeline Scans
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
