import React, { useState } from 'react';
import { Calendar, CheckCircle2, ArrowUpRight, Sparkles, Database } from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';

export default function B2BCalendlySection() {
  const { navigate } = useNavigation();
  const [workEmail, setWorkEmail] = useState('');
  const [industry, setIndustry] = useState('SaaS & Software');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!workEmail) return;
    setSubmitted(true);
  };

  return (
    <section className="pt-16 md:pt-24 pb-20">
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-[#0d1c15]/10 p-8 sm:p-12 shadow-[0_4px_32px_rgba(13,28,21,0.06)]">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
          {/* Left Column: Value Prop */}
          <div className="lg:col-span-3 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[11px] font-mono font-semibold text-[#0d9467]">
              <Database className="w-3.5 h-3.5" />
              <span>CUSTOM DATASET EXPLORATION</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-display font-bold text-[#0d1c15] leading-[1.12] tracking-tight">
              Explore the Largest B2B Company Dataset
            </h2>

            <p className="text-base md:text-lg text-[#4a5851] leading-relaxed max-w-xl">
              Access 105M+ verified company profiles, 500M+ decision-maker records, and custom firmographic cuts tailored to your addressable market.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2.5 text-sm font-medium text-[#162b21]">
                <CheckCircle2 className="w-4 h-4 text-[#00e599] shrink-0" />
                <span>Custom sample extracts filtered by NACE sector, headcount, and country</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm font-medium text-[#162b21]">
                <CheckCircle2 className="w-4 h-4 text-[#00e599] shrink-0" />
                <span>Delivered via high-throughput REST API, Snowflake share, or raw Parquet/CSV</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm font-medium text-[#162b21]">
                <CheckCircle2 className="w-4 h-4 text-[#00e599] shrink-0" />
                <span>Zero scraped gating: verified contact deliverability and compliance guarantee</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Consultation Card */}
          <div className="lg:col-span-2">
            <div className="bg-[#f7f5f0] border border-[#0d1c15]/10 rounded-2xl p-6 sm:p-7 shadow-xs">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#edf2ec] text-[#0d9467] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-[#0d1c15]">
                    Request Received!
                  </h3>
                  <p className="text-sm text-[#4a5851] leading-relaxed">
                    Our data engineering team is generating a sample cut for <strong className="text-[#0d1c15]">{workEmail}</strong>. We'll be in touch shortly.
                  </p>
                  <button
                    onClick={() => navigate(PRODUCT_ROUTES.DASHBOARD)}
                    className="inline-flex items-center gap-2 bg-[#0d1c15] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#162b21] transition-colors"
                  >
                    <span>Enter Workspace</span>
                    <ArrowUpRight className="w-4 h-4 text-[#00e599]" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#0d1c15]/10">
                    <span className="font-display font-bold text-sm text-[#0d1c15]">Request Sample Cut</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] font-semibold">15-MIN DEMO</span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-[#73827a] mb-1.5 font-medium">
                      Work Email
                    </label>
                    <input
                      type="email"
                      required
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#0d1c15]/15 text-sm text-[#0d1c15] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#00e599] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-[#73827a] mb-1.5 font-medium">
                      Target Sector
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#0d1c15]/15 text-sm text-[#0d1c15] focus:outline-none focus:border-[#00e599] transition-colors"
                    >
                      <option>SaaS &amp; Software</option>
                      <option>Fintech &amp; Financial Services</option>
                      <option>Healthcare &amp; Life Sciences</option>
                      <option>Manufacturing &amp; Logistics</option>
                      <option>Retail &amp; E-commerce</option>
                      <option>Professional &amp; Legal Services</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_2px_8px_rgba(13,28,21,0.12)] cursor-pointer group"
                    >
                      <Sparkles className="w-4 h-4 text-[#00e599]" />
                      <span>Request Sample &amp; Walkthrough</span>
                      <ArrowUpRight className="w-4 h-4 text-[#00e599] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
                      className="text-xs text-[#0d9467] hover:underline font-medium cursor-pointer"
                    >
                      Or sign in directly to access the database API &rarr;
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
