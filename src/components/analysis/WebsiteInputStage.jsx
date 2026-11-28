import React, { useState } from 'react';
import { Search, Globe, ArrowRight, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import { normalizeWebsite } from '../../lib/companyResearch';

export default function WebsiteInputStage({
  initialUrl = '',
  onStart = null,
  isAnalyzing = false,
}) {
  const [urlInput, setUrlInput] = useState(initialUrl || '');
  const [error, setError] = useState('');

  const sampleCompanies = [
    { label: 'stripe.com', name: 'Stripe' },
    { label: 'linear.app', name: 'Linear' },
    { label: 'supabase.com', name: 'Supabase' },
    { label: 'vercel.com', name: 'Vercel' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setError('Enter your company website to start analysis.');
      return;
    }
    setError('');
    try {
      const normalized = normalizeWebsite(urlInput);
      if (onStart) {
        onStart(normalized.website, normalized.domain);
      }
    } catch (err) {
      setError(err.message || 'Please enter a valid company website.');
    }
  };

  const handleSelectSample = (sample) => {
    setUrlInput(sample);
    setError('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-8 sm:py-12 animate-fadeIn text-[#edf2ec]">
      {/* Intro Header */}
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#13271e] border border-[#234436] text-[11px] font-mono text-[#00e599] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#00e599] animate-pulse" />
          <span>OUTLAUNCH INTELLIGENCE ENGINE</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tight leading-tight">
          Analyze Any Company's{' '}
          <span className="text-[#00e599] font-normal italic">
            GTM Landscape
          </span>
        </h1>

        <p className="text-sm sm:text-base text-[#a3b899] max-w-xl mx-auto leading-relaxed">
          Input a website URL. Our autonomous engine scans company positioning, discovers real verified competitors, and formulates high-conviction outreach messaging.
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-[#10221a] rounded-2xl sm:rounded-3xl border border-[#1f3f31] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0d9467]/10 rounded-full blur-3xl pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="relative">
            <label htmlFor="website-url-input" className="block text-xs font-mono uppercase tracking-wider text-[#a3b899] mb-2 font-medium">
              Company Website or Domain
            </label>
            <div className="relative flex items-center">
              <Globe className="w-5 h-5 text-[#0d9467] absolute left-4 pointer-events-none" />
              <input
                id="website-url-input"
                type="text"
                autoFocus
                placeholder="e.g. acme.com or https://company.io"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (error) setError('');
                }}
                disabled={isAnalyzing}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#08130e] border border-[#234436] text-sm sm:text-base text-white placeholder-gray-500 font-sans focus:outline-none focus:border-[#00e599] focus:ring-1 focus:ring-[#00e599] transition-all shadow-inner"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-mono text-rose-400 pl-1">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-[#a3b899]">
              <ShieldCheck className="w-4 h-4 text-[#00e599] shrink-0" />
              <span>Safe public scan · No tracking cookies deposited</span>
            </div>

            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer shadow-md shrink-0"
            >
              <span>{isAnalyzing ? 'Initiating Scan…' : 'Start Full Analysis'}</span>
              <ArrowRight className="w-4 h-4 text-[#00e599]" />
            </button>
          </div>
        </form>

        {/* Examples / Presets */}
        <div className="mt-6 pt-5 border-t border-[#1a382b] flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-[#a3b899]">Quick presets:</span>
          {sampleCompanies.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => handleSelectSample(sample.label)}
              className="px-2.5 py-1 rounded-lg bg-[#162e23] hover:bg-[#1d3d2f] text-[#00e599] border border-[#234436] transition-colors cursor-pointer"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="p-4 rounded-xl bg-[#10221a]/60 border border-[#1f3f31] space-y-1.5">
          <div className="text-[11px] font-mono uppercase text-[#00e599] font-semibold flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#00e599]" />
            1. Profile Extraction
          </div>
          <p className="text-xs text-[#a3b899] leading-relaxed">
            Extracts company description, products, core value propositions, and customer segments.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#10221a]/60 border border-[#1f3f31] space-y-1.5">
          <div className="text-[11px] font-mono uppercase text-[#00e599] font-semibold flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#00e599]" />
            2. Competitor Graph
          </div>
          <p className="text-xs text-[#a3b899] leading-relaxed">
            Identifies verified direct and related market alternatives with supporting evidence.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#10221a]/60 border border-[#1f3f31] space-y-1.5">
          <div className="text-[11px] font-mono uppercase text-[#00e599] font-semibold flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#00e599]" />
            3. Positioning Angles
          </div>
          <p className="text-xs text-[#a3b899] leading-relaxed">
            Derives competitive differentiators and outreach angles ready for automated sequences.
          </p>
        </div>
      </div>
    </div>
  );
}
