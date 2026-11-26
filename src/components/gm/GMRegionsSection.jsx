import React from 'react';
import { ArrowRight } from 'lucide-react';
import regionsData from '../../data/gm/gmRegions.json';
import { useNavigation } from '../../context/NavigationContext';

export default function GMRegionsSection() {
  const { navigate } = useNavigation();

  return (
    <section className="mb-24">
      <div className="container mx-auto max-w-[1200px] px-4">
        {/* Section Heading */}
        <h2 className="text-2xl md:text-3xl font-display font-bold text-[#0d1c15] mb-8 text-center">
          Explore 218M+ locations across{' '}
          <span className="text-[#0d9467] italic font-editorial font-normal">
            all geographic regions
          </span>
        </h2>

        {/* 9 Region Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regionsData.map((region) => (
            <a
              key={region.id}
              href={region.href}
              onClick={(e) => {
                e.preventDefault();
                navigate(region.href);
              }}
              className="group relative bg-white rounded-2xl p-6 border border-[#0d1c15]/10 hover:border-[#0d9467]/40 hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer block"
            >
              {/* Silhouette SVG map in background */}
              {region.svgHtml && (
                <div
                  className="absolute -right-6 top-1/2 -translate-y-1/2 w-56 h-56 text-[#0d1c15]/10 group-hover:text-[#0d9467]/20 transition-colors opacity-70 pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: region.svgHtml }}
                />
              )}

              {/* Card Foreground Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-[#0d1c15] group-hover:text-[#0d9467] transition-colors">
                    {region.name}
                  </h3>
                  <ArrowRight className="h-5 w-5 text-[#0d9467] group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="flex gap-4 text-xs sm:text-sm font-mono text-[#5a6962]">
                  <span className="px-2 py-0.5 rounded bg-[#edf2ec] border border-[#dbe5da] text-[#182e24]">
                    {region.countries}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#edf2ec] border border-[#dbe5da] text-[#0d9467] font-semibold">
                    {region.locations}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
