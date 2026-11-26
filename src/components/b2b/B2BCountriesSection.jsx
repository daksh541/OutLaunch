import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import countriesData from '../../data/b2bCountries.json';

export default function B2BCountriesSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleCountries = isExpanded ? countriesData : countriesData.slice(0, 21);

  return (
    <section className="mb-32 md:mb-48">
      <h2 className="text-2xl md:text-3xl font-display font-bold text-[#0d1c15] mb-8 text-center tracking-[-0.02em]">
        Browse company records across{' '}
        <span className="text-[#0d9467] italic font-editorial font-normal">
          {countriesData.length} countries
        </span>
      </h2>

      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCountries.map((country) => (
            <a
              key={country.code + '-' + country.name}
              href={country.href}
              className="group bg-white rounded-2xl border border-[#0d1c15]/10 p-5 md:py-5 md:px-6 transition-all duration-300 hover:border-[#0d9467]/40 hover:shadow-md block cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg md:text-xl font-mono text-[#0d9467] w-10 shrink-0 tracking-wide text-left">
                  {country.code}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm md:text-base text-[#0d1c15] group-hover:text-[#0d9467] transition-colors truncate">
                    {country.name}
                  </h3>
                  <p className="text-xs font-mono text-[#5a6962] mt-0.5">
                    {country.count}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#0d9467] group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2" />
              </div>
            </a>
          ))}
        </div>

        {!isExpanded && (
          <>
            <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[#f7f5f0] via-[#f7f5f0]/85 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-4">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="inline-flex items-center gap-2 bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-md pointer-events-auto cursor-pointer"
              >
                <span>View all {countriesData.length} countries</span>
                <ChevronDown className="h-4 w-4 text-[#00e599]" />
              </button>
            </div>
          </>
        )}

        {isExpanded && (
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="inline-flex items-center gap-2 bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <span>Show less</span>
              <ChevronUp className="h-4 w-4 text-[#00e599]" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
