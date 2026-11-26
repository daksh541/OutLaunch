import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import EditorialNavbar from '../landing/EditorialNavbar';
import EditorialFooter from '../landing/EditorialFooter';
import GMCalendlySection from './GMCalendlySection';
import { getRegionBySlug, getCountriesForRegion } from '../../data/gm/regionData';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';

export default function RegionLocationPage({ regionSlug }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { navigate } = useNavigation();

  const region = getRegionBySlug(regionSlug);
  const countries = region ? getCountriesForRegion(regionSlug) : [];

  // Update browser tab title: "Largest {demonym} Commercial Places"
  useEffect(() => {
    if (region) {
      document.title = `Largest ${region.demonym} Places & Commercial Locations`;
    } else {
      document.title = 'Region Not Found - Global Places Directory';
    }
  }, [region]);

  // If unknown region slug, render helpful Not Found screen
  if (!region) {
    return (
      <div className="landing-editorial-root min-h-screen flex flex-col bg-[#f7f5f0] text-[#0d1c15]">
        <EditorialNavbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-[#0d1c15]/10 shadow-xl">
            <h1 className="text-3xl font-display font-bold mb-3 text-[#0d1c15]">Region Not Found</h1>
            <p className="text-sm text-[#4a5851] mb-6">
              The geographic region "<span className="text-[#0d1c15] font-mono">{regionSlug}</span>" does not exist in the Global Places directory.
            </p>
            <button
              type="button"
              onClick={() => navigate(PRODUCT_ROUTES.GM)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#00e599]" />
              <span>Back to Places Dataset</span>
            </button>
          </div>
        </main>
        <EditorialFooter />
      </div>
    );
  }

  const hasExpandableCountries = countries.length > 21;
  const visibleCountries = (!hasExpandableCountries || isExpanded)
    ? countries
    : countries.slice(0, 21);

  return (
    <div className="landing-editorial-root min-h-screen flex flex-col bg-[#f7f5f0] text-[#0d1c15] antialiased">
      {/* Header */}
      <EditorialNavbar />

      <main className="flex-1 container mx-auto max-w-[1200px] px-4 py-8 md:py-12">
        {/* Navigation Breadcrumb / Back Link */}
        <div className="mb-6">
          <a
            href="/gm-dataset"
            onClick={(e) => {
              e.preventDefault();
              navigate(PRODUCT_ROUTES.GM);
            }}
            className="inline-flex items-center gap-2 text-sm text-[#73827a] hover:text-[#0d9467] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Global Places Dataset</span>
          </a>
        </div>

        {/* Region Section Heading */}
        <div className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono text-[#0d9467] font-semibold mb-4">
            <MapPin className="w-3.5 h-3.5 text-[#0d9467]" />
            <span>{region.name} &bull; {region.locations} &bull; {region.countries}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight leading-tight text-[#0d1c15]">
            <span>Browse the Most Comprehensive Places dataset across </span>
            <span className="text-[#0d9467]">{region.name}</span>
          </h1>

          <p className="text-[#4a5851] mt-4 text-base md:text-lg">
            Explore {region.locations} across {region.countries} in {region.name}
          </p>
        </div>

        {/* 3-Column Country Cards Grid for this Region */}
        <div className="relative mb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCountries.map((c) => (
              <a
                key={c.slug}
                href={`/gm-dataset/locations/${c.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/gm-dataset/locations/${c.slug}`);
                }}
                className="group flex items-center gap-4 bg-white rounded-2xl p-5 border border-[#0d1c15]/10 hover:border-[#0d9467]/40 hover:shadow-[0_4px_20px_rgba(13,28,21,0.06)] transition-all duration-300 min-h-[90px] cursor-pointer"
              >
                {/* 2-letter Country Code */}
                <span className="font-bold text-xl md:text-2xl text-[#0d9467] w-10 shrink-0 font-mono tracking-wide">
                  {c.code}
                </span>

                {/* Country Name & Location Count */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#0d1c15] group-hover:text-[#0d9467] transition-colors truncate">
                    {c.name}
                  </h3>
                  <p className="text-sm text-[#4a5851]">{c.locationCount || c.count}</p>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-4 w-4 text-[#0d9467] group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </a>
            ))}
          </div>

          {/* Collapsed State: Cream Fade & View All Button */}
          {hasExpandableCountries && !isExpanded && (
            <>
              <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#f7f5f0] via-[#f7f5f0]/80 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-4">
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="inline-flex items-center gap-2 bg-[#0d1c15] hover:bg-[#162b21] text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-md pointer-events-auto cursor-pointer"
                >
                  <span>View all {countries.length} countries</span>
                  <ChevronDown className="h-4 w-4 text-[#00e599]" />
                </button>
              </div>
            </>
          )}

          {/* Expanded State: Show Less Button */}
          {hasExpandableCountries && isExpanded && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="inline-flex items-center gap-2 bg-[#0d1c15] hover:bg-[#162b21] text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
              >
                <span>Show less</span>
                <ChevronUp className="h-4 w-4 text-[#00e599]" />
              </button>
            </div>
          )}
        </div>

        {/* Demo / Calendly Booking */}
        <GMCalendlySection />
      </main>

      {/* Footer */}
      <EditorialFooter />
    </div>
  );
}
