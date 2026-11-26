import React from 'react';

const insights = [
  {
    title: 'Lead Generation',
    description:
      'Find local businesses by category, location, ratings, and more. Build targeted prospect lists for any industry or geography.',
    icon: (
      <svg
        className="w-6 h-6 text-[#10b981]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
        <path d="M11 8v6"></path>
        <path d="M8 11h6"></path>
      </svg>
    ),
  },
  {
    title: 'Market Research',
    description:
      'Analyze competitive landscapes, identify market gaps, and understand local business ecosystems with comprehensive place data.',
    icon: (
      <svg
        className="w-6 h-6 text-[#10b981]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"></path>
        <rect width="18" height="18" x="3" y="4" rx="2"></rect>
        <circle cx="12" cy="10" r="2"></circle>
        <line x1="8" x2="8" y1="2" y2="4"></line>
        <line x1="16" x2="16" y1="2" y2="4"></line>
      </svg>
    ),
  },
  {
    title: 'Location Intelligence',
    description:
      'Power your analytics with rich POI data including ratings, reviews, operating hours, and customer sentiment.',
    icon: (
      <svg
        className="w-6 h-6 text-[#10b981]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18"></path>
        <path d="m19 9-5 5-4-4-3 3"></path>
      </svg>
    ),
  },
];

export default function GMBusinessInsightsSection() {
  return (
    <section className="py-16 md:py-24 bg-[#f7f5f0]">
      <div className="container mx-auto max-w-[1200px] px-4">
        {/* Section Heading */}
        <h2 className="text-2xl md:text-4xl font-bold text-[#0d1c15] text-center mb-12">
          From locations database to{' '}
          <span className="text-[#0d9467]">business insights</span>
        </h2>

        {/* 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insights.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-[#0d1c15]/10 shadow-[0_4px_20px_rgba(13,28,21,0.03)] hover:border-[#0d9467]/40 transition-colors"
            >
              <div className="w-12 h-12 mb-5 rounded-xl bg-[#edf2ec] border border-[#dbe5da] flex items-center justify-center text-[#0d9467]">
                {item.icon}
              </div>
              <h3 className="text-lg font-semibold text-[#0d1c15] mb-2">
                {item.title}
              </h3>
              <p className="text-[#4a5851] text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
