import React from 'react';
import { Search, Users, BarChart3 } from 'lucide-react';

export default function B2BRevenueDriverSection() {
  return (
    <section className="py-16 md:py-24">
      <h2 className="text-2xl md:text-3xl font-bold text-[#0d1c15] text-center mb-12 tracking-[-0.02em]">
        From company database to{' '}
        <span className="text-[#0d9467]">
          revenue driver
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Targeted Prospecting */}
        <div className="glass-window glass-window--inset">
          <div className="glass-window-inner p-6">
            <div className="w-12 h-12 mb-5 rounded-xl bg-[#edf2ec] border border-[#dbe5da] flex items-center justify-center text-[#0d9467]">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-[#0d1c15] mb-2">
              Targeted Prospecting
            </h3>
            <p className="text-[#4a5851] text-sm leading-relaxed">
              Find the right companies in any state, industry, or revenue range. Save hours of
              research and fill your sales pipeline with highly qualified leads.
            </p>
          </div>
        </div>

        {/* Card 2: Personalized Outreach */}
        <div className="glass-window glass-window--inset">
          <div className="glass-window-inner p-6">
            <div className="w-12 h-12 mb-5 rounded-xl bg-[#edf2ec] border border-[#dbe5da] flex items-center justify-center text-[#0d9467]">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-[#0d1c15] mb-2">
              Personalized Outreach
            </h3>
            <p className="text-[#4a5851] text-sm leading-relaxed">
              Enrich your CRM with detailed company data to craft personalized emails, LinkedIn
              campaigns, and outreach sequences that actually convert.
            </p>
          </div>
        </div>

        {/* Card 3: Market Segmentation & Insights */}
        <div className="glass-window glass-window--inset">
          <div className="glass-window-inner p-6">
            <div className="w-12 h-12 mb-5 rounded-xl bg-[#edf2ec] border border-[#dbe5da] flex items-center justify-center text-[#0d9467]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-[#0d1c15] mb-2">
              Market Segmentation &amp; Insights
            </h3>
            <p className="text-[#4a5851] text-sm leading-relaxed">
              Analyze industries, company sizes to identify new market opportunities and refine
              your marketing campaigns for maximum impact.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
