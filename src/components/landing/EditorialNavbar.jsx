import React, { useState, useEffect } from 'react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import ProductsDropdown from '../navigation/ProductsDropdown';
import { Menu, X, ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function EditorialNavbar() {
  const { navigate } = useNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-[#f7f5f0]/90 backdrop-blur-md border-b border-[#0d1c15]/[0.08] shadow-[0_2px_12px_rgba(13,28,21,0.03)]'
          : 'bg-[#f7f5f0]/70 backdrop-blur-sm border-b border-transparent'
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate(PRODUCT_ROUTES.OUTREACH);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            {/* Geometric Editorial Mark */}
            <div className="w-8 h-8 rounded-lg bg-[#0d1c15] text-[#00e599] flex items-center justify-center font-mono font-bold text-sm tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#00e599" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.8" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" fillOpacity="0.4" />
                <path d="M14 17.5L21 17.5M17.5 14L21 17.5L17.5 21" stroke="#00e599" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-tight text-[#0d1c15] leading-none">
                OutLaunch
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#4a5851] leading-tight font-medium mt-0.5">
                Outreach Workspace
              </span>
            </div>
          </a>

          {/* Products Dropdown (Desktop) */}
          <div className="hidden lg:block pl-2 border-l border-[#0d1c15]/10">
            <ProductsDropdown />
          </div>
        </div>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-7 text-[14px] font-medium text-[#4a5851]">
          <a
            href="#workflow"
            className="hover:text-[#0d1c15] transition-colors relative py-1"
          >
            Workflow
          </a>
          <a
            href="#human-in-the-loop"
            className="hover:text-[#0d1c15] transition-colors relative py-1 flex items-center gap-1.5"
          >
            <span>Control &amp; Review</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] font-semibold border border-[#dbe5da]">
              HUMAN
            </span>
          </a>
          <a
            href="#features"
            className="hover:text-[#0d1c15] transition-colors relative py-1"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="hover:text-[#0d1c15] transition-colors relative py-1"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hover:text-[#0d1c15] transition-colors relative py-1"
          >
            FAQ
          </a>
          <button
            type="button"
            onClick={() => navigate(PRODUCT_ROUTES.DASHBOARD)}
            className="hover:text-[#0d9467] text-[#0d1c15] font-semibold transition-colors relative py-1 cursor-pointer flex items-center gap-1"
          >
            <span>Dashboard</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e599]" />
          </button>
        </nav>

        {/* Right CTA cluster */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(PRODUCT_ROUTES.DASHBOARD)}
            className="hidden sm:inline-flex text-[14px] font-medium text-[#0d1c15] hover:text-[#0d9467] px-3.5 py-2 transition-colors cursor-pointer"
          >
            Workspace
          </button>

          <a
            href="#hero-cta"
            onClick={(e) => {
              const el = document.getElementById('hero-cta') || document.querySelector('input[type="text"]');
              if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth' });
                el.focus();
              }
            }}
            className="inline-flex items-center gap-1.5 text-[13px] sm:text-[14px] font-semibold bg-[#0d1c15] hover:bg-[#162b21] active:scale-[0.98] text-white px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-xl transition-all shadow-[0_2px_8px_rgba(13,28,21,0.12)] cursor-pointer group"
          >
            <span>Start Free</span>
            <ArrowUpRight className="w-4 h-4 text-[#00e599] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden p-2 text-[#0d1c15] hover:bg-[#0d1c15]/5 rounded-lg transition-colors cursor-pointer ml-1"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-label="Mobile Navigation"
          className="md:hidden fixed inset-x-0 top-16 bg-[#f7f5f0] border-b border-[#0d1c15]/10 p-6 shadow-xl flex flex-col gap-4 animate-fadeIn"
        >
          <div className="flex flex-col gap-3 font-medium text-base text-[#0d1c15]">
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-[#0d1c15]/5 transition-colors"
            >
              Outreach Workflow
            </a>
            <a
              href="#human-in-the-loop"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-[#0d1c15]/5 transition-colors flex items-center justify-between"
            >
              <span>Human in the Loop</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] font-semibold border border-[#dbe5da]">
                REVIEW
              </span>
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-[#0d1c15]/5 transition-colors"
            >
              Core Capabilities
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-[#0d1c15]/5 transition-colors"
            >
              Transparent Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-lg hover:bg-[#0d1c15]/5 transition-colors"
            >
              FAQ
            </a>
          </div>

          <div className="pt-4 border-t border-[#0d1c15]/10 flex flex-col gap-2.5">
            <div className="text-xs font-mono uppercase tracking-wider text-[#73827a] px-3 pb-1">
              OutLaunch Products
            </div>
            <button
              onClick={() => {
                navigate(PRODUCT_ROUTES.DATABASE);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#0d1c15]/5 text-sm text-[#0d1c15] flex items-center justify-between"
            >
              <span>B2B Company Database</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#73827a]" />
            </button>
            <button
              onClick={() => {
                navigate(PRODUCT_ROUTES.GM);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#0d1c15]/5 text-sm text-[#0d1c15] flex items-center justify-between"
            >
              <span>Google Maps Dataset</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#73827a]" />
            </button>
            <button
              onClick={() => {
                navigate(PRODUCT_ROUTES.API);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#0d1c15]/5 text-sm text-[#0d1c15] flex items-center justify-between"
            >
              <span>Developer API Docs</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#73827a]" />
            </button>
            <button
              onClick={() => {
                navigate(PRODUCT_ROUTES.EXPLORER);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-[#0d1c15]/5 text-sm text-[#0d1c15] flex items-center justify-between"
            >
              <span>Company Graph Explorer</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#73827a]" />
            </button>

            <button
              onClick={() => {
                navigate(PRODUCT_ROUTES.DASHBOARD);
                setMobileMenuOpen(false);
              }}
              className="w-full mt-2 py-3 rounded-xl bg-[#0d1c15] text-[#00e599] font-semibold text-sm text-center flex items-center justify-center gap-2"
            >
              <span>Open Outreach Dashboard</span>
              <ArrowUpRight className="w-4 h-4 text-[#00e599]" />
            </button>
            <button
              onClick={() => {
                navigate(PRODUCT_ROUTES.SIGN_IN);
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 rounded-xl bg-[#edf2ec] text-[#0d1c15] font-semibold text-sm text-center"
            >
              Sign In
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
