import React, { useState } from 'react';
import { Search, Filter, CheckCircle2, Building2, MapPin, Users, Database, Sparkles, ArrowRight } from 'lucide-react';

const SAMPLE_PROSPECTS = [
  {
    name: 'Elena Rostova',
    role: 'VP Sales & Partnerships',
    company: 'CloudVector Labs',
    category: 'saas',
    hiring: true,
    hq: 'Austin, TX',
    employees: '180 employees',
    tech: 'Salesforce, Hubspot, Segment',
    email: 'elena@cloudvector.io',
    verified: true,
    score: 99.1
  },
  {
    name: 'Julian Thorne',
    role: 'Head of Growth',
    company: 'Synthetix Media',
    category: 'saas',
    hiring: false,
    hq: 'London, UK',
    employees: '65 employees',
    tech: 'Marketo, Stripe, PostgreSQL',
    email: 'julian@synthetix.co.uk',
    verified: true,
    score: 97.4
  },
  {
    name: 'Kavita Patel',
    role: 'Founder & CEO',
    company: 'Nexus Flow',
    category: 'agency',
    hiring: true,
    hq: 'San Francisco, CA',
    employees: '45 employees',
    tech: 'AWS, Mixpanel, Zendesk',
    email: 'kavita@nexusflow.com',
    verified: true,
    score: 96.8
  },
  {
    name: 'Liam O\'Connor',
    role: 'VP of Outbound',
    company: 'Veloce Data',
    category: 'saas',
    hiring: true,
    hq: 'Boston, MA',
    employees: '110 employees',
    tech: 'Apollo, Salesforce, ZoomInfo',
    email: 'liam@velocedata.com',
    verified: true,
    score: 98.2
  }
];

export default function LeadDiscoverySection() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProspects = SAMPLE_PROSPECTS.filter((p) => {
    if (selectedFilter === 'saas' && p.category !== 'saas') return false;
    if (selectedFilter === 'hiring' && !p.hiring) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.tech.toLowerCase().includes(q) ||
        p.hq.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <section id="features" className="py-20 md:py-28 bg-[#f7f5f0] relative">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="max-w-3xl mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3">
            <Database className="w-3.5 h-3.5" />
            <span>01 · PRECISION DISCOVERY</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-[1.12]">
            Find the exact people who need your product today
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4a5851] leading-relaxed">
            Filter through over 250 million verified decision-maker records. Search by current tech stack, recent funding, headcount growth, or hiring intent.
          </p>
        </div>

        {/* Discovery Mockup Card */}
        <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.06)] p-6 sm:p-8 md:p-10">
          
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 pb-6 mb-6 border-b border-[#0d1c15]/08">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#73827a] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by job title, company name, industry, or tech stack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-sm text-[#0d1c15] placeholder-[#73827a] outline-none focus:border-[#0d9467] focus:ring-2 focus:ring-[#0d9467]/15 transition-all font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-2 rounded-xl transition-colors ${
                  selectedFilter === 'all'
                    ? 'bg-[#0d1c15] text-white font-bold'
                    : 'bg-[#edf2ec] text-[#4a5851] hover:text-[#0d1c15]'
                }`}
              >
                All Filters (250M)
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('saas')}
                className={`px-3 py-2 rounded-xl transition-colors ${
                  selectedFilter === 'saas'
                    ? 'bg-[#0d1c15] text-white font-bold'
                    : 'bg-[#edf2ec] text-[#4a5851] hover:text-[#0d1c15]'
                }`}
              >
                SaaS &amp; Tech
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('hiring')}
                className={`px-3 py-2 rounded-xl transition-colors ${
                  selectedFilter === 'hiring'
                    ? 'bg-[#0d1c15] text-white font-bold'
                    : 'bg-[#edf2ec] text-[#4a5851] hover:text-[#0d1c15]'
                }`}
              >
                Hiring SDRs
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-3">
            {filteredProspects.length > 0 ? (
              filteredProspects.map((prospect, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl border border-[#0d1c15]/08 bg-[#fcfbf9] hover:bg-white hover:border-[#0d9467]/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#edf2ec] text-[#0d9467] flex items-center justify-center font-bold text-sm shrink-0 border border-[#dbe5da]">
                    {prospect.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-[#0d1c15]">{prospect.name}</span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#00e599]/15 text-[#0d9467] font-bold border border-[#00e599]/30">
                        {prospect.score}% FIT
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-[#5a6962] mt-0.5">
                      {prospect.role} at <span className="font-medium text-[#0d1c15]">{prospect.company}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#73827a] mt-1.5 font-mono">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {prospect.hq}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {prospect.employees}
                      </span>
                      <span>·</span>
                      <span>Tech: {prospect.tech}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#0d1c15]/06">
                  <span className="font-mono text-xs text-[#0d9467] flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> {prospect.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => alert(`Selected ${prospect.name} for research dossier generation.`)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Generate Angle
                  </button>
                </div>
              </div>
            ))
            ) : (
              <div className="p-8 text-center text-sm text-[#73827a] font-mono bg-[#fcfbf9] rounded-2xl border border-dashed border-[#0d1c15]/15">
                No prospects match the filter "{searchQuery}". Try searching "Salesforce", "Marketo", or switching filter pills above.
              </div>
            )}
          </div>

          {/* Bottom Stats Footer */}
          <div className="mt-6 pt-5 border-t border-[#0d1c15]/08 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#5a6962]">
            <span>Showing verified active decision-makers with zero bounce risk</span>
            <span className="text-[#0d9467] font-semibold">Live MX record verification active ✓</span>
          </div>

        </div>

      </div>
    </section>
  );
}
