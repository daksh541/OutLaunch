import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllCountries } from '../../data/gm/countryData';
import { useNavigation } from '../../context/NavigationContext';

export default function GMCountriesSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { navigate } = useNavigation();
  const countriesData = getAllCountries();

  // Initial visible countries: 21 items
  const visibleCountries = isExpanded ? countriesData : countriesData.slice(0, 21);

  return (
    <section className="mb-24">
      <div className="container mx-auto max-w-[1200px] px-4">
        {/* Section Heading */}
        <h2 className="text-2xl md:text-3xl font-display font-bold text-[#0d1c15] mb-8 text-center">
          Browse the global places dataset across{' '}
          <span className="text-[#0d9467] italic font-editorial font-normal">244 countries</span>
        </h2>

        {/* Countries Grid Container */}
        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCountries.map((c) => (
              <a
                key={c.slug}
                href={`/gm-dataset/locations/${c.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/gm-dataset/locations/${c.slug}`);
                }}
                className="group flex items-center gap-4 bg-white rounded-2xl p-5 border border-[#0d1c15]/10 hover:border-[#0d9467]/40 hover:shadow-md transition-all duration-300 min-h-[90px] cursor-pointer"
              >
                {/* 2-letter Country Code */}
                <span className="font-bold text-lg md:text-xl font-mono text-[#0d9467] w-10 shrink-0 tracking-wide">
                  {c.code}
                </span>

                {/* Country Name & Location Count */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#0d1c15] group-hover:text-[#0d9467] transition-colors truncate">
                    {c.name}
                  </h3>
                  <p className="text-xs font-mono text-[#5a6962] mt-0.5">{c.locationCount || c.count}</p>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-4 w-4 text-[#0d9467] group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </a>
            ))}
          </div>

          {/* Collapsed State: Cream Fade & View All Button */}
          {!isExpanded && (
            <>
              <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[#f7f5f0] via-[#f7f5f0]/85 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-4">
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="inline-flex items-center gap-2 bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-md pointer-events-auto cursor-pointer"
                >
                  <span>View all 244 countries</span>
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
      </div>
    </section>
  );
}
