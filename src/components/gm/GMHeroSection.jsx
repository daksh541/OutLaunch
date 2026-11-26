import React from 'react';
import { Zap, Sparkles, RefreshCw, MapPin, Building, Globe2 } from 'lucide-react';

export default function GMHeroSection() {
  return (
    <div className="pt-24 pb-12">
      <div className="container mx-auto max-w-[1200px] px-4 relative z-10">
        {/* Hero title & badge */}
        <section className="text-center mb-12 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[12px] font-mono font-semibold text-[#0d9467] mb-6">
            <Zap className="h-3.5 w-3.5 text-[#0d9467]" />
            <span>GLOBAL PLACES DIRECTORY • 200M+ POIs</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 tracking-tight text-[#0d1c15] max-w-4xl mx-auto leading-[1.1]">
            Global Places &amp; Commercial Venues Dataset
          </h1>

          <p className="text-base md:text-lg text-[#4a5851] max-w-2xl mx-auto leading-relaxed font-normal">
            Access <span className="font-semibold text-[#0d1c15]">200M+ verified local business profiles</span> with precise geocoordinates, operating hours, amenities, and verified contact intelligence across <span className="font-semibold text-[#0d1c15]">244+ countries</span>.
          </p>
        </section>

        {/* 3 Metric Cards */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: 200M+ */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 md:p-8 border border-[#0d1c15]/10 shadow-[0_4px_24px_rgba(13,28,21,0.04)] text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[#edf2ec] text-[#0d9467] flex items-center justify-center mb-5">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="text-3xl font-display font-bold text-[#0d1c15] mb-1">200M+</div>
              <div className="text-base font-semibold text-[#162b21] mb-2">Commercial Places &amp; POIs</div>
              <p className="text-xs text-[#4a5851] leading-relaxed">
                Worldwide point-of-interest coverage cross-verified across satellite registries and commercial mapping networks.
              </p>
            </div>

            {/* Card 2: 55 Fields */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 md:p-8 border border-[#0d1c15]/10 shadow-[0_4px_24px_rgba(13,28,21,0.04)] text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[#edf2ec] text-[#0d9467] flex items-center justify-center mb-5">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="text-3xl font-display font-bold text-[#0d1c15] mb-1">55 Fields</div>
              <div className="text-base font-semibold text-[#162b21] mb-2">Rich Location Attributes</div>
              <p className="text-xs text-[#4a5851] leading-relaxed">
                Operating schedules, category hierarchies, direct phone &amp; website, amenities, and place metadata.
              </p>
            </div>

            {/* Card 3: 4 Weeks */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 md:p-8 border border-[#0d1c15]/10 shadow-[0_4px_24px_rgba(13,28,21,0.04)] text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[#edf2ec] text-[#0d9467] flex items-center justify-center mb-5">
                <RefreshCw className="h-6 w-6" />
              </div>
              <div className="text-3xl font-display font-bold text-[#0d1c15] mb-1">4 Weeks</div>
              <div className="text-base font-semibold text-[#162b21] mb-2">Automated Refresh Cycle</div>
              <p className="text-xs text-[#4a5851] leading-relaxed">
                Continuous geocoding checks and entity resolution ensure zero stale or relocated business entries.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
