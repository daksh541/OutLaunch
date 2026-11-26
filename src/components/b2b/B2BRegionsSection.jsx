import React from 'react';
import { ArrowRight } from 'lucide-react';
import regionsData from '../../data/b2bRegions.json';

export default function B2BRegionsSection() {
  return (
    <section className="mb-32 md:mb-48">
      <h2 className="text-2xl md:text-3xl font-display font-bold text-[#0d1c15] mb-8 text-center tracking-[-0.02em]">
        Explore 105M+ companies across{' '}
        <span className="text-[#0d9467] italic font-editorial font-normal">
          all geographic regions
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regionsData.map((region) => (
          <a
            key={region.title}
            href={region.href}
            className="group relative overflow-hidden rounded-2xl bg-white border border-[#0d1c15]/10 p-6 transition-all duration-300 hover:border-[#0d9467]/40 hover:shadow-md cursor-pointer block"
          >
            {region.mapSvg && (
              <div
                className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none overflow-hidden flex items-center justify-end text-[#0d1c15]"
                dangerouslySetInnerHTML={{ __html: region.mapSvg }}
              />
            )}
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-lg md:text-xl font-semibold text-[#0d1c15] group-hover:text-[#0d9467] transition-colors">
                  {region.title}
                </h3>
                <ArrowRight className="h-4 w-4 text-[#0d9467] group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
              </div>
              <div className="flex gap-6 text-xs sm:text-sm font-mono text-[#5a6962]">
                <span className="px-2 py-0.5 rounded bg-[#edf2ec] border border-[#dbe5da] text-[#182e24]">
                  {region.countries}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#edf2ec] border border-[#dbe5da] text-[#0d9467] font-semibold">
                  {region.companies}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
