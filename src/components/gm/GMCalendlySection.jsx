import React, { useState } from 'react';
import { MapPin, CheckCircle2, ArrowUpRight, Sparkles, Navigation } from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';

export default function GMCalendlySection() {
  const { navigate } = useNavigation();
  const [workEmail, setWorkEmail] = useState('');
  const [region, setRegion] = useState('North America');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!workEmail) return;
    setSubmitted(true);
  };

  return (
    <section className="pt-12 pb-20">
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-[#0d1c15]/10 p-8 sm:p-12 shadow-[0_4px_32px_rgba(13,28,21,0.06)]">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
          {/* Left Column: Value Prop */}
          <div className="lg:col-span-3 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[11px] font-mono font-semibold text-[#0d9467]">
              <MapPin className="w-3.5 h-3.5" />
              <span>CUSTOM LOCATION SAMPLE CUTS</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-display font-bold text-[#0d1c15] leading-[1.12] tracking-tight">
              Access the Complete Global Places Dataset
            </h2>

            <p className="text-base md:text-lg text-[#4a5851] leading-relaxed max-w-xl">
              Download clean geospatial POI samples for your target city, region, or vertical. Available in GeoJSON, Parquet, Snowflake, and streaming REST API.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2.5 text-sm font-medium text-[#162b21]">
                <CheckCircle2 className="w-4 h-4 text-[#00e599] shrink-0" />
                <span>Polygon bounding-box extracts and radius-based geographic queries</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm font-medium text-[#162b21]">
                <CheckCircle2 className="w-4 h-4 text-[#00e599] shrink-0" />
                <span>55 rich attributes: exact latitude/longitude, category hierarchy, hours, and direct contacts</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm font-medium text-[#162b21]">
                <CheckCircle2 className="w-4 h-4 text-[#00e599] shrink-0" />
                <span>Full licensing: zero third-party trademark risks with clean commercial terms</span>
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
                    Sample Request Received!
                  </h3>
                  <p className="text-sm text-[#4a5851] leading-relaxed">
                    Our geospatial data architects are preparing a sample dataset for <strong className="text-[#0d1c15]">{workEmail}</strong>.
                  </p>
                  <button
                    onClick={() => navigate(PRODUCT_ROUTES.DASHBOARD)}
                    className="inline-flex items-center gap-2 bg-[#0d1c15] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#162b21] transition-colors cursor-pointer"
                  >
                    <span>Enter Workspace</span>
                    <ArrowUpRight className="w-4 h-4 text-[#00e599]" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#0d1c15]/10">
                    <span className="font-display font-bold text-sm text-[#0d1c15]">Request Places Sample</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] font-semibold">FREE SAMPLE CUT</span>
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
                      Geographic Region
                    </label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#0d1c15]/15 text-sm text-[#0d1c15] focus:outline-none focus:border-[#00e599] transition-colors"
                    >
                      <option>North America (USA &amp; Canada)</option>
                      <option>European Union &amp; UK</option>
                      <option>Asia-Pacific (APAC)</option>
                      <option>Latin America (LATAM)</option>
                      <option>Middle East &amp; Africa (MEA)</option>
                      <option>Global Worldwide Bundle</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] active:scale-[0.99] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_2px_8px_rgba(13,28,21,0.12)] cursor-pointer group"
                    >
                      <Sparkles className="w-4 h-4 text-[#00e599]" />
                      <span>Request Sample Cut &amp; API Docs</span>
                      <ArrowUpRight className="w-4 h-4 text-[#00e599] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
                      className="text-xs text-[#0d9467] hover:underline font-medium cursor-pointer"
                    >
                      Or sign in to query the Places API directly &rarr;
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
