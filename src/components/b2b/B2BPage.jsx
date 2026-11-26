import React, { useState } from 'react';
import EditorialNavbar from '../landing/EditorialNavbar';
import EditorialFooter from '../landing/EditorialFooter';
import B2BHeroSection from './B2BHeroSection';
import B2BDataSourcesSection from './B2BDataSourcesSection';
import B2BRegionsSection from './B2BRegionsSection';
import B2BIndustriesSection from './B2BIndustriesSection';
import B2BCountriesSection from './B2BCountriesSection';
import B2BDataCategoriesSection from './B2BDataCategoriesSection';
import B2BRevenueDriverSection from './B2BRevenueDriverSection';
import B2BCalendlySection from './B2BCalendlySection';
import { MessageSquare, X } from 'lucide-react';
import '../../b2b.css';

export default function B2BPage() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="landing-editorial-root min-h-screen flex flex-col bg-[#f7f5f0] text-[#0d1c15] antialiased selection:bg-[#00e599]/30 selection:text-[#0d1c15] relative z-10">
      {/* 1. Header (Unified OutLaunch Editorial Navbar) */}
      <EditorialNavbar />

      <main className="flex-1 flex flex-col">
        {/* 2. Hero Section */}
        <B2BHeroSection />

        {/* 3. Data Sources & AI Synthesis */}
        <B2BDataSourcesSection />

        {/* Main Sections Container */}
        <div className="max-w-[1200px] mx-auto px-4 w-full">
          {/* 4. Geographic Regions */}
          <B2BRegionsSection />

          {/* 5. NACE Industry Sectors */}
          <B2BIndustriesSection />

          {/* 6. 238 Countries Directory */}
          <B2BCountriesSection />

          {/* 7. What's Inside Our Database / Data Categories Explorer */}
          <B2BDataCategoriesSection />

          {/* 8. Revenue Driver */}
          <B2BRevenueDriverSection />

          {/* 9. OutLaunch Dataset Consultation & Walkthrough */}
          <B2BCalendlySection />
        </div>
      </main>

      {/* 10. Footer (Unified OutLaunch Editorial Footer) */}
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
                OutLaunch Data Support
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-xs text-[#73827a] hover:text-[#0d1c15] cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="py-4 text-xs text-[#4a5851] leading-relaxed">
              Hi there! 👋 Need a custom slice of the 105M+ company dataset, or API pricing? Leave us a note and an engineer will reply.
            </div>
            <form onSubmit={(e) => { e.preventDefault(); alert('Message sent to data engineering.'); setChatOpen(false); }}>
              <input
                type="text"
                placeholder="Ask a question or enter your email..."
                className="w-full bg-[#f7f5f0] rounded-xl px-3.5 py-2 text-xs text-[#0d1c15] placeholder:text-[#9ca3af] outline-none border border-[#0d1c15]/10 focus:border-[#00e599]"
              />
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
