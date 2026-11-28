import React, { useEffect, useRef } from 'react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import { ArrowUpRight } from 'lucide-react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '../../lib/motion';

export default function EditorialFooter() {
  const { navigate } = useNavigation();
  const footerRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion() || !footerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.footer-col',
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: footerRef.current,
            start: 'top 85%',
            once: true,
          },
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={footerRef} className="bg-[#08120e] text-[#8ba096] border-t border-[#162920] pt-16 pb-12 font-sans">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#162920]">
          
          {/* Col 1 & 2: Brand & Mission */}
          <div className="footer-col lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00e599] text-[#08120e] flex items-center justify-center font-mono font-bold text-sm shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#08120e" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#08120e" fillOpacity="0.7" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#08120e" fillOpacity="0.4" />
                  <path d="M14 17.5L21 17.5M17.5 14L21 17.5L17.5 21" stroke="#08120e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-white">
                OutLaunch
              </span>
            </div>

            <p className="text-sm text-[#8ba096] leading-relaxed max-w-sm">
              The AI-powered outreach platform for founders, agencies, and sales teams. Research prospects, personalise outreach, and manage conversations from one workspace.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#11221a] border border-[#1d3529] text-xs font-mono text-[#00e599]">
                <span className="w-2 h-2 rounded-full bg-[#00e599] animate-pulse" />
                <span>All systems operational · 99.98%</span>
              </div>
            </div>
          </div>

          {/* Col 3: Products */}
          <div className="footer-col space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
              Products
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(PRODUCT_ROUTES.OUTREACH);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Outreach Agent
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate(PRODUCT_ROUTES.DATABASE)}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  B2B Company Database
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate(PRODUCT_ROUTES.GM)}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Google Maps Dataset
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate(PRODUCT_ROUTES.API)}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Developer API
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate(PRODUCT_ROUTES.EXPLORER)}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Graph Explorer
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform */}
          <div className="footer-col space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
              Platform
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#workflow" className="hover:text-white transition-colors">
                  Outreach Workflow
                </a>
              </li>
              <li>
                <a href="#human-in-the-loop" className="hover:text-white transition-colors">
                  Human-in-the-Loop Review
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Pay-as-you-go Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  Deliverability FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Col 5: Account & Support */}
          <div className="footer-col space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
              Access
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
                  className="hover:text-white transition-colors text-left cursor-pointer flex items-center gap-1"
                >
                  <span>Sign In</span>
                  <ArrowUpRight className="w-3 h-3 text-[#00e599]" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate(PRODUCT_ROUTES.REGISTER)}
                  className="hover:text-white transition-colors text-left cursor-pointer flex items-center gap-1"
                >
                  <span>Create Account</span>
                  <ArrowUpRight className="w-3 h-3 text-[#00e599]" />
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5a6962] font-mono">
          <div>
            &copy; {new Date().getFullYear()} OutLaunch Inc. Find the right people. Start better conversations.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-white cursor-pointer transition-colors">Security</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
