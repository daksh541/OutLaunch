import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Plus, Calendar } from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import categoriesData from '../../data/gm/gmCategories.json';
import structuredCode from '../../data/gm/gm_code_preview_structured.json';

export default function GMDataCategoriesSection() {
  const { navigate } = useNavigation();
  const [activeCategory, setActiveCategory] = useState('general');
  const sectionRefs = useRef({});
  const isClickingRef = useRef(false);
  const OFFSET = 96;

  // Scroll to selected category
  const scrollToCategory = (e, id) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveCategory(id);
    isClickingRef.current = true;

    const el = sectionRefs.current[id];
    if (el) {
      const rect = el.getBoundingClientRect();
      const targetY = rect.top + window.scrollY - OFFSET;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
      setTimeout(() => {
        isClickingRef.current = false;
      }, 700);
    }
  };

  // Scrollspy to track which category section is currently in view
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking || isClickingRef.current) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const ids = categoriesData.map((c) => c.id);
        const threshold = 180;

        let current = ids[0];
        for (let i = 0; i < ids.length; i++) {
          const el = sectionRefs.current[ids[i]];
          if (el && el.getBoundingClientRect().top <= threshold) {
            current = ids[i];
          } else {
            break;
          }
        }
        setActiveCategory(current);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="mb-24">
      <div className="container mx-auto max-w-[1200px] px-4">
        {/* Section Heading */}
        <h2 className="text-2xl md:text-3xl font-display font-bold text-[#0d1c15] mb-8 text-center">
          What's Inside Our Places Dataset
        </h2>

        {/* Showcase Container */}
        <div className="flex flex-col lg:flex-row gap-6 relative">
          {/* Left Sticky Sidebar */}
          <nav className="lg:w-72 shrink-0">
            <div className="lg:sticky lg:top-24 bg-white rounded-2xl border border-[#0d1c15]/10 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#0d1c15]/08 bg-[#fcfbf9]">
                <h3 className="font-semibold text-[#0d1c15] text-sm uppercase font-mono tracking-wider">
                  Location Categories
                </h3>
              </div>

              <ul className="divide-y divide-[#0d1c15]/06 max-h-[60vh] overflow-y-auto lg:max-h-none lg:overflow-visible">
                {categoriesData.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={(e) => scrollToCategory(e, cat.id)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150 border-l-4 cursor-pointer ${
                          isActive
                            ? 'bg-[#edf2ec] text-[#0d1c15] border-[#0d9467] font-semibold'
                            : 'hover:bg-[#f7f5f0] text-[#4a5851] hover:text-[#0d1c15] border-transparent'
                        }`}
                      >
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                            isActive ? 'rotate-90 text-[#0d9467]' : 'text-[#73827a]'
                          }`}
                        />
                        <span className="flex-1 text-sm font-medium truncate">{cat.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                            isActive
                              ? 'bg-[#00e599]/20 text-[#0d9467] font-bold'
                              : 'bg-[#edf2ec] text-[#5a6962]'
                          }`}
                        >
                          {cat.fields.length}
                        </span>
                      </button>
                    </li>
                  );
                })}

                {/* Additional Sidebar Actions */}
                <li>
                  <button
                    type="button"
                    onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 text-[#0d9467] hover:bg-[#edf2ec] transition-colors border-l-4 border-transparent hover:border-[#0d9467] cursor-pointer"
                  >
                    <Plus className="h-4 w-4 shrink-0 text-[#0d9467]" />
                    <span className="flex-1 text-sm font-medium">Add custom POI field</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 text-[#0d9467] hover:bg-[#edf2ec] transition-colors border-l-4 border-transparent hover:border-[#0d9467] cursor-pointer"
                  >
                    <Calendar className="h-4 w-4 shrink-0 text-[#0d9467]" />
                    <span className="flex-1 text-sm font-medium">Request Dataset Access</span>
                  </button>
                </li>
              </ul>
            </div>
          </nav>

          {/* Right Scrolling Content Showcase */}
          <div className="flex-1 min-w-0 space-y-8">
            {categoriesData.map((cat) => {
              const codeLines = structuredCode[cat.id] || [];

              return (
                <section
                  key={cat.id}
                  id={cat.id}
                  ref={(el) => (sectionRefs.current[cat.id] = el)}
                  className="scroll-mt-24"
                >
                  <div className="bg-white rounded-2xl border border-[#0d1c15]/10 shadow-sm overflow-hidden">
                    {/* Category Header */}
                    <div className="px-6 py-4 flex items-center justify-between border-b border-[#0d1c15]/08 bg-[#fcfbf9]">
                      <h3 className="font-semibold text-[#0d1c15] text-sm md:text-base">{cat.name}</h3>
                      <span className="text-xs font-mono text-[#5a6962]">{cat.count}</span>
                    </div>

                    {/* Category Content: Two Columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                      {/* Left: Fields List */}
                      <div className="space-y-1 divide-y divide-[#0d1c15]/06">
                        {cat.fields.map((f, idx) => (
                          <div key={idx} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                            {/* Fill Rate Badge with Tooltip */}
                            <span className="relative group shrink-0 pt-0.5">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-[#00e599]/20 text-[#0d9467] min-w-[50px] text-center border border-[#00e599]/40">
                                {f.pct}
                              </span>
                              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-[#0d1c15] text-white text-xs px-2.5 py-1 rounded shadow-lg whitespace-nowrap z-30 font-mono">
                                Fill rate: percentage of records with this attribute
                              </span>
                            </span>

                            {/* Field Name & Description */}
                            <div className="flex-1 min-w-0 text-sm leading-relaxed">
                              <span className="font-semibold text-[#0d1c15]">{f.name}</span>
                              <span className="text-[#4a5851] ml-1.5">— {f.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Right: Syntax-Highlighted Code Preview Box */}
                      <div className="h-fit">
                        <div className="bg-[#0d1c15] text-white rounded-xl p-4 font-mono text-xs md:text-sm overflow-x-auto border border-[#233f33] shadow-inner">
                          {codeLines.map((line, lIdx) => {
                            if (line.type === 'comment') {
                              return (
                                <div key={lIdx} className="text-[#5a6962] mb-1 select-none">
                                  {line.text}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={lIdx}
                                className={`flex items-baseline py-0.5 ${
                                  line.highlight
                                    ? 'bg-[#182a22] -mx-2 px-2 rounded border border-[#00e599]/40'
                                    : ''
                                }`}
                              >
                                <span className="text-[#5a6962] select-none w-6 text-right mr-3 shrink-0">
                                  {line.lineNum}
                                </span>
                                <span className="text-[#00e599]">"{line.key}"</span>
                                <span className="text-white/60 mr-1.5">:</span>
                                <span className="text-[#fbbf24] break-all">{line.val}</span>
                                <span className="text-white/40">,</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
