import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import EditorialNavbar from '../landing/EditorialNavbar';
import EditorialFooter from '../landing/EditorialFooter';
import GMHeroSection from './GMHeroSection';
import GMRegionsSection from './GMRegionsSection';
import GMCountriesSection from './GMCountriesSection';
import GMDataCategoriesSection from './GMDataCategoriesSection';
import GMCustomAttributesSection from './GMCustomAttributesSection';
import GMBusinessInsightsSection from './GMBusinessInsightsSection';
import GMCalendlySection from './GMCalendlySection';
import '../../gm.css';

export default function GMPage() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="landing-editorial-root min-h-screen flex flex-col bg-[#f7f5f0] text-[#0d1c15] antialiased selection:bg-[#00e599]/30 selection:text-[#0d1c15]">
      {/* 1. Header (Unified OutLaunch Editorial Navbar) */}
      <EditorialNavbar />

      {/* Main Content */}
      <main className="flex-1">
        {/* 2. Hero Section (Title, Subtitle, 3 Metrics) */}
        <GMHeroSection />

        {/* 3. Geographic Regions (9 cards with exact map silhouette SVGs) */}
        <GMRegionsSection />

        {/* 4. Countries Grid (Top 21 countries + expandable view for 244 countries) */}
        <GMCountriesSection />

        {/* 5. What's Inside Our Database (Sticky category sidebar, 54 fields, code preview) */}
        <GMDataCategoriesSection />

        {/* 6. Custom Place Attributes (Typewriter prompt, floating squares) */}
        <GMCustomAttributesSection />

        {/* 7. Business Insights (Lead Gen, Market Research, Location Intelligence) */}
        <GMBusinessInsightsSection />

        {/* 8. OutLaunch Places Sample Consultation */}
        <GMCalendlySection />
      </main>

      {/* 9. Footer (Unified OutLaunch Editorial Footer) */}
      <EditorialFooter />

      {/* Floating Chat Support Widget */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setChatOpen(!chatOpen)}
          aria-label="Chat support"
          className="w-14 h-14 rounded-full bg-[#0d1c15] hover:bg-[#162b21] text-white flex items-center justify-center shadow-[0_8px_25px_rgba(13,28,21,0.25)] transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-[#233f33]"
        >
          {chatOpen ? <X className="w-5 h-5 text-[#00e599]" /> : <MessageSquare className="w-5 h-5 text-[#00e599]" />}
        </button>

        {chatOpen && (
          <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-[#0d1c15]/10 p-5 mb-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-3 border-b border-[#0d1c15]/10">
              <div className="font-semibold text-[#0d1c15] text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00e599]" />
                OutLaunch Places Support
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-xs text-[#73827a] hover:text-[#0d1c15] cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-[#4a5851] mt-3 leading-relaxed">
              Have questions about POI coverage, data schemas, or custom sample extractions? Our team is available 24/7.
            </p>
            <div className="mt-4 pt-3 border-t border-[#0d1c15]/06 flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#0d9467] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e599] animate-pulse" />
                Team Online
              </span>
              <a
                href="mailto:support@outlaunch.io"
                className="text-xs font-semibold text-[#0d1c15] hover:text-[#0d9467] transition-colors"
              >
                support@outlaunch.io &rarr;
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
