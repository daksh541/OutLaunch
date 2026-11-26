import React from 'react';
import { ArrowRight } from 'lucide-react';
import industriesData from '../../data/b2bIndustries.json';

export default function B2BIndustriesSection() {
  return (
    <section className="mb-32 md:mb-48 pt-6">
      {/* Centered Heading */}
      <h2 className="text-2xl md:text-3xl font-display font-bold text-[#0d1c15] mb-10 md:mb-12 text-center tracking-[-0.02em]">
        Explore companies across{' '}
        <span className="text-[#0d9467] italic font-editorial font-normal">
          21 NACE industry sectors
        </span>
      </h2>

      {/* 3-column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {industriesData.map((ind) => (
          <a
            key={ind.code}
            href={ind.href}
            className="group bg-white rounded-2xl border border-[#0d1c15]/10 p-5 md:p-6 transition-all duration-300 hover:border-[#0d9467]/40 hover:shadow-md block cursor-pointer"
          >
            <div className="flex items-center gap-4">
              {/* Left Industry Icon */}
              <span
                className="text-3xl shrink-0 w-10 flex items-center justify-center select-none"
                style={{
                  fontFamily:
                    '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
                }}
                aria-hidden="true"
              >
                {ind.icon}
              </span>

              {/* Center Industry Title & Secondary NACE / company count */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-base text-[#0d1c15] group-hover:text-[#0d9467] transition-colors leading-snug truncate">
                  {ind.title}
                </h3>
                <p className="text-xs md:text-sm text-[#5a6962] mt-1 flex items-center gap-2 font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-[#edf2ec] text-[#182e24] font-semibold text-[11px] border border-[#dbe5da]">
                    {ind.code}
                  </span>
                  <span>·</span>
                  <span className="text-[#0d9467] font-semibold">{ind.count}</span>
                </p>
              </div>

              {/* Right Arrow */}
              <ArrowRight className="h-4 w-4 text-[#0d9467] group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
