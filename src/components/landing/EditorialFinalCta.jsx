import React, { useState, useEffect } from 'react';
import { ArrowRight, Search, Sparkles, CheckCircle2 } from 'lucide-react';
import FlowCanvas from '../FlowCanvas';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import { normalizeWebsite } from '../../lib/companyResearch';
import useAuthSession from '../../hooks/useAuthSession';

export default function EditorialFinalCta() {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [activeWordIndex, setActiveWordIndex] = useState(0);

  const { navigate } = useNavigation();
  const { session, loading: authLoading } = useAuthSession();

  const PHRASES = [
    "Find the right people.",
    "Start better conversations.",
    "Book qualified demos.",
    "Grow without hiring an SDR army."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWordIndex((prev) => (prev + 1) % PHRASES.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (authLoading) return;
    setError('');
    try {
      const { domain, website } = normalizeWebsite(inputValue);
      sessionStorage.setItem('autogtm-pending-domain', website);
      if (!session) {
        navigate(PRODUCT_ROUTES.SIGN_IN);
        return;
      }
      navigate(`/auto-gtm/company/${encodeURIComponent(domain)}/explore?src=landing&phase=research_company_loading`);
    } catch (err) {
      setError(err.message || 'Please enter a valid website address');
    }
  };

  return (
    <section className="py-24 md:py-32 bg-[#0f1714] text-white relative overflow-hidden">
      {/* Subtle organic particles background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <FlowCanvas />
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10 text-center">
        
        {/* Monospace Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#182a22] border border-[#233f33] text-xs font-mono text-[#00e599] font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>START YOUR OUTREACH IN 2 MINUTES</span>
        </div>

        {/* Animated Rotating Headline */}
        <div className="max-w-3xl mx-auto min-h-[140px] flex flex-col items-center justify-center">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight leading-[1.1] text-white">
            Ready to{' '}
            <span className="text-[#00e599] italic font-editorial font-normal transition-all duration-300">
              {PHRASES[activeWordIndex]}
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#8ba096] max-w-xl mx-auto leading-relaxed">
            Enter your website to generate your first research dossiers, tailored messages, and verified decision-makers free.
          </p>
        </div>

        {/* Launch Form */}
        <div className="max-w-[500px] mx-auto mt-8">
          <form
            onSubmit={handleSubmit}
            className="flex items-center bg-[#14221c] rounded-2xl p-2 border border-[#233f33] shadow-[0_8px_30px_rgba(0,0,0,0.3)] focus-within:border-[#00e599] transition-all"
          >
            <div className="pl-3.5 pr-2 text-[#73827a]">
              <Search className="w-5 h-5 text-[#8ba096]" />
            </div>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError('');
              }}
              placeholder="Your company website (e.g. stripe.com)"
              className="w-full bg-transparent text-white placeholder-[#73827a] text-sm sm:text-base font-medium outline-none py-2 px-1"
            />

            <button
              type="submit"
              disabled={authLoading}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 sm:py-3 rounded-xl bg-[#00e599] hover:bg-[#00c985] text-[#0d1c15] font-bold text-sm transition-all cursor-pointer shrink-0 shadow-sm"
            >
              <span>Get Leads</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {error && (
            <p role="alert" className="text-xs text-rose-400 mt-2 text-left px-2 font-medium">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono text-[#8ba096] mt-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00e599]" />
              $30 free trial credits included
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00e599]" />
              No credit card required
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
