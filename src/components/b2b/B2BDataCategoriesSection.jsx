import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Calendar } from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import sectionsData from '../../data/b2bDatabaseSections.json';
import codeExamplesData from '../../data/codeExamples.json';

function FillRateBadge({ rate }) {
  const displayRate = rate % 1 === 0 ? `${rate}%` : `${rate.toFixed(1)}%`;
  return (
    <span className="relative group shrink-0 pt-0.5">
      <span className="inline-flex items-center justify-center min-w-[52px] px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-[#00e599]/20 text-[#0d9467] border border-[#00e599]/40 tracking-tight">
        {displayRate}
      </span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-[#0d1c15] text-white text-xs rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg pointer-events-none font-mono">
        Fill rate: percentage of records with this attribute
        <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#0d1c15]" />
      </span>
    </span>
  );
}

function CodeViewer({ sectionId }) {
  const example = codeExamplesData[sectionId];
  if (!example || !example.lines) {
    return null;
  }

  return (
    <div className="bg-[#0d1c15] text-white rounded-xl p-5 font-mono text-xs md:text-[13px] leading-relaxed border border-[#233f33] shadow-lg overflow-x-auto">
      <div className="text-[#5a6962] mb-1.5 select-none">// ...</div>
      {example.lines.map((line, i) => (
        <div
          key={i}
          className={`flex py-0.5 items-start ${
            line.highlight
              ? 'bg-[#182a22] -mx-3 px-3 rounded border-l-2 border-[#00e599]'
              : ''
          }`}
        >
          <span className="text-[#5a6962] select-none w-6 text-right mr-3 shrink-0">
            {i + 12}
          </span>
          <span className="flex-1 break-all">
            <span className={line.highlight ? 'text-[#00e599]' : 'text-[#7cd9ba]'}>
              "{line.key}"
            </span>
            <span className="text-white/60">: </span>
            <span className="text-[#fbbf24]">
              {line.value}
            </span>
            {i < example.lines.length - 1 && <span className="text-white/40">,</span>}
          </span>
        </div>
      ))}
      <div className="text-[#5a6962] mt-1.5 select-none">// ...</div>
    </div>
  );
}

export default function B2BDataCategoriesSection() {
  const { navigate } = useNavigation();
  const [activeCategory, setActiveCategory] = useState(sectionsData[0]?.id || 'general');
  const sectionRefs = useRef({});

  const OFFSET = 96;

  const scrollToCategory = (e, id) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveCategory(id);
    const el = sectionRefs.current[id];
    if (el) {
      const rect = el.getBoundingClientRect();
      const targetY = rect.top + window.scrollY - OFFSET;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const ids = sectionsData.map((s) => s.id);
        const threshold = 180;

        let current = ids[0];
        for (let i = 0; i < ids.length; i++) {
          const el = sectionRefs.current[ids[i]];
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= threshold) {
              current = ids[i];
            } else {
              break;
            }
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
      <h2 className="text-2xl md:text-3xl font-display font-bold text-[#0d1c15] mb-10 text-center tracking-[-0.02em]">
        What's Inside Our Company Database
      </h2>

      {/* Container */}
      <div className="flex flex-col lg:flex-row gap-6 relative">
        {/* Left Categories Sidebar */}
        <nav className="w-full lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-24 bg-white rounded-2xl border border-[#0d1c15]/10 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#0d1c15]/08 bg-[#fcfbf9]">
              <h3 className="font-semibold text-sm text-[#0d1c15] uppercase font-mono tracking-wider">
                Data Categories
              </h3>
            </div>
            <ul className="divide-y divide-[#0d1c15]/06">
              {sectionsData.map((sec) => {
                const isActive = activeCategory === sec.id;
                const count = sec.fields.length;
                return (
                  <li key={sec.id}>
                    <button
                      type="button"
                      onClick={(e) => scrollToCategory(e, sec.id)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-[#edf2ec] text-[#0d1c15] border-l-4 border-[#0d9467] font-semibold'
                          : 'hover:bg-[#f7f5f0] text-[#4a5851] hover:text-[#0d1c15] border-l-4 border-transparent'
                      }`}
                    >
                      {isActive ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-[#0d9467]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#73827a]" />
                      )}
                      <span className="flex-1 text-sm truncate">{sec.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                          isActive
                            ? 'bg-[#00e599]/20 text-[#0d9467] font-bold'
                            : 'bg-[#edf2ec] text-[#5a6962]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}

              {/* Add custom field */}
              <li>
                <button
                  type="button"
                  onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150 hover:bg-[#edf2ec] text-[#0d9467] border-l-4 border-transparent hover:border-[#0d9467] cursor-pointer"
                >
                  <Plus className="h-4 w-4 shrink-0 text-[#0d9467]" />
                  <span className="flex-1 text-sm font-medium">Add custom field</span>
                </button>
              </li>

              {/* Request Demo */}
              <li>
                <button
                  type="button"
                  onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150 hover:bg-[#edf2ec] text-[#0d9467] border-l-4 border-transparent hover:border-[#0d9467] cursor-pointer"
                >
                  <Calendar className="h-4 w-4 shrink-0 text-[#0d9467]" />
                  <span className="flex-1 text-sm font-medium">Request Dataset Access</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Right Categories Content */}
        <div className="flex-1 min-w-0 space-y-8">
          {sectionsData.map((sec) => (
            <section
              key={sec.id}
              id={sec.id}
              ref={(el) => (sectionRefs.current[sec.id] = el)}
              className="scroll-mt-24"
            >
              <div className="bg-white rounded-2xl border border-[#0d1c15]/10 shadow-sm overflow-hidden">
                {/* Category Card Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#0d1c15]/08 bg-[#fcfbf9]">
                  <p className="font-semibold text-sm md:text-base text-[#0d1c15]">{sec.name}</p>
                  <span className="text-xs text-[#5a6962] font-mono font-normal">{sec.fields.length} fields</span>
                </div>

                {/* 2-Column Content: Fields & Code */}
                <div className="flex flex-col lg:flex-row gap-6 p-6 items-start">
                  {/* Fields List */}
                  <div className="flex-1 min-w-0 space-y-0 divide-y divide-[#0d1c15]/06">
                    {sec.fields.map((field) => (
                      <div key={field.id} className="flex items-start gap-3.5 py-4 first:pt-0 last:pb-0">
                        <FillRateBadge rate={field.fillRate} />
                        <div className="flex-1 min-w-0 leading-relaxed">
                          <span className="font-semibold text-[#0d1c15] text-sm md:text-[15px]">{field.name}</span>
                          <span className="text-[#73827a] font-normal"> — </span>
                          <span className="text-[#4a5851] text-sm font-normal">
                            {field.description}
                          </span>
                          {field.link && (
                            <a
                              href={field.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline ml-1.5 text-[#0d9467] hover:text-[#0a7854] text-sm font-medium inline-flex items-center gap-0.5"
                            >
                              <span>{field.linkText || 'See full schema'}</span>
                              <span className="text-xs">→</span>
                            </a>
                          )}
                          {field.categories && field.categories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {field.categories.map((cat) => (
                                <span
                                  key={cat}
                                  className="inline-block px-2.5 py-1 text-xs rounded-md bg-[#edf2ec] text-[#182e24] font-mono border border-[#dbe5da]"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Code Snippet Box */}
                  <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0">
                    <CodeViewer sectionId={sec.id} />
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
