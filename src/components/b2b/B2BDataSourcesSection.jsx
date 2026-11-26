import React, { useRef, useState, useEffect } from 'react';
import { Globe2, Users, MapPin, Building2, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';

const sources = [
  {
    icon: (
      <div className="p-2.5 bg-[#edf2ec] text-[#0d9467] rounded-xl flex items-center justify-center">
        <Globe2 className="h-6 w-6" />
      </div>
    ),
    value: "310M+",
    label: "active business websites",
  },
  {
    icon: (
      <div className="p-2.5 bg-[#edf2ec] text-[#0d9467] rounded-xl flex items-center justify-center">
        <Users className="h-6 w-6" />
      </div>
    ),
    value: "74M+",
    label: "professional social profiles",
  },
  {
    icon: (
      <div className="p-2.5 bg-[#edf2ec] text-[#0d9467] rounded-xl flex items-center justify-center">
        <MapPin className="h-6 w-6" />
      </div>
    ),
    value: "200M+",
    label: "verified commercial locations",
  },
  {
    icon: (
      <div className="p-2.5 bg-[#edf2ec] text-[#0d9467] rounded-xl flex items-center justify-center">
        <Building2 className="h-6 w-6" />
      </div>
    ),
    value: "100M+",
    label: "official registry records",
  },
];

export default function B2BDataSourcesSection() {
  const { navigate } = useNavigation();
  const sectionRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const height = el.offsetHeight;
      const vh = window.innerHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / (height - vh)));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="bg-[#f7f5f0]"
      style={{ height: '160vh' }}
    >
      <div className="sticky top-0 min-h-screen flex flex-col justify-center pt-16 pb-16">
        <div className="container mx-auto max-w-[1200px] px-4">
          <span className="block text-2xl md:text-3xl font-normal text-foreground tracking-[-0.02em] text-center mb-16">
            The first{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(0.283turn, rgba(5, 172, 130, 1) 0%, rgba(21, 173, 220, 1) 100%)',
              }}
            >
              all-in-one
            </span>{' '}
            company database
          </span>

          <div className="relative max-w-[1000px] mx-auto">
            {/* 4 Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-12">
              {sources.map((item, i) => {
                const m = scrollProgress;
                const n = Math.max(0, Math.min(1, (m - 0.4) / 0.08));
                const s = Math.max(0, (m - 0.48) / 0.52);
                const t = 10 * Math.sin(n * Math.PI);
                const r = [-120, -40, 40, 120][i] * s;

                const style = {
                  transform: `translate(${r}px, ${t + 80 * s}px) scale(${1 - 0.4 * s})`,
                  opacity: Math.max(0.1, 1 - 0.9 * s),
                  boxShadow: `0 ${10 + 10 * n}px ${20 + 20 * n}px rgba(34, 197, 94, ${
                    0.2 * n * (1 - s) + 0.15 * s
                  })`,
                  transition: 'transform 0.15s ease-out, opacity 0.15s ease-out, box-shadow 0.2s ease-out',
                };

                return (
                  <div
                    key={item.label}
                    className="text-center glass-window glass-window--inset"
                    style={style}
                  >
                    <div className="glass-window-inner p-5">
                      <div className="w-11 h-11 mx-auto mb-3 flex items-center justify-center">
                        {item.icon}
                      </div>
                      <div className="text-2xl font-bold text-[#0d1c15]">{item.value}</div>
                      <div className="text-sm text-[#4a5851] font-medium">{item.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ultimate Business Profile Card */}
            <div className="flex justify-center">
              {(() => {
                const m = scrollProgress;
                const s = Math.max(0, (m - 0.42) / 0.58);
                const ultimateStyle = {
                  transform: `translateY(${-(100 * s)}px) scale(${Math.min(1.05, 0.95 + 0.1 * s)})`,
                  opacity: 1,
                  boxShadow: `0 12px 40px rgba(13, 28, 21, 0.08)`,
                  transition: 'transform 0.15s ease-out, box-shadow 0.2s ease-out',
                  zIndex: 10,
                  position: 'relative',
                };

                return (
                  <div
                    className="max-w-[620px] w-full text-center bg-white rounded-2xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.06)] p-8 sm:p-10"
                    style={ultimateStyle}
                  >
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold mb-4 text-[#0d1c15] tracking-tight">
                        ✨ Comprehensive OutLaunch Account Profile
                      </h3>
                      <p className="leading-relaxed mb-6 text-[#4a5851] text-sm sm:text-base">
                        Reveals what{' '}
                        <span className="text-[#0d9467] font-semibold">each company truly does and who to contact</span>{' '}
                        — generated by
                        <br className="hidden md:block" />
                        OutLaunch AI synthesizing digital footprints, executive hiring signals,
                        <br className="hidden md:block" />
                        verified locations, and corporate filings.
                      </p>
                      <button
                        onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
                        className="gtm-demo-cta inline-flex items-center gap-2 bg-[#0d1c15] hover:bg-[#162b21] text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-200 text-white shadow-md cursor-pointer hover:shadow-lg"
                      >
                        <Sparkles className="w-4 h-4 text-[#00e599]" />
                        <span>Explore Company Graph</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
