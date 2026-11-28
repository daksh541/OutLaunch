import React, { useState } from 'react';
import { Building2, Globe, CheckCircle2, Package, Users, Tag, ArrowRight, ArrowLeft, ExternalLink, ShieldCheck, Edit3 } from 'lucide-react';
import AnalysisStageHeader from './AnalysisStageHeader';

export default function CompanyProfileStage({
  profile = null,
  domain = '',
  onContinue = null,
  onBack = null,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const companyName = profile?.company_name || domain.split('.')[0].toUpperCase();
  const description = profile?.business_description || 'No business description was returned for this domain.';
  const products = Array.isArray(profile?.products) ? profile.products : [];
  const customers = Array.isArray(profile?.customers) ? profile.customers : [];
  const sourceUrls = Array.isArray(profile?.source_urls) ? profile.source_urls : [];

  return (
    <div className="w-full max-w-4xl mx-auto py-6 animate-fadeIn text-[#edf2ec]">
      <AnalysisStageHeader
        kicker="Stage 03"
        title="Verified Company Profile"
        subtitle="Review extracted business model, products, and target audiences before discovering competitors."
        status="Verified"
        onBack={onBack}
        backLabel="Scan Options"
        onNext={onContinue}
        nextLabel="Discover Competitors"
      />

      <div className="space-y-6">
        {/* Main Identity Banner */}
        <div className="bg-[#10221a] rounded-2xl sm:rounded-3xl border border-[#1f3f31] p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#1c382b]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#08130e] border border-[#234436] flex items-center justify-center text-[#00e599] text-xl font-bold font-mono shadow-inner">
                {companyName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
                    {companyName}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#00e599]/15 text-[#00e599] text-[11px] font-mono border border-[#00e599]/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <a
                  href={`https://${domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#a3b899] hover:text-[#00e599] font-mono inline-flex items-center gap-1 transition-colors mt-0.5"
                >
                  <span>{domain}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] font-mono text-[#a3b899] block uppercase tracking-wider">
                Sources Scanned
              </span>
              <span className="text-sm font-mono text-[#00e599] font-semibold">
                {sourceUrls.length > 0 ? `${sourceUrls.length} pages verified` : 'Primary Domain'}
              </span>
            </div>
          </div>

          {/* Description Section */}
          <div className="pt-6 space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#a3b899] font-semibold block">
              Core Business Description
            </span>
            <p className="text-sm sm:text-base text-[#d8e3d6] leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* 2-Column: Products & Customer Segments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Products & Capabilities */}
          <div className="bg-[#10221a] rounded-2xl border border-[#1f3f31] p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c382b]">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00e599] uppercase tracking-wider">
                <Package className="w-4 h-4" />
                <span>Products &amp; Capabilities</span>
              </div>
              <span className="text-xs font-mono text-[#a3b899]">{products.length} Identified</span>
            </div>

            {products.length === 0 ? (
              <p className="text-xs text-[#a3b899] italic">
                General services model detected without explicit sub-product SKU entries.
              </p>
            ) : (
              <div className="space-y-2.5">
                {products.map((prod, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#0b1812] border border-[#1c382b] space-y-1 hover:border-[#0d9467]/40 transition-colors"
                  >
                    <div className="text-xs font-semibold text-white flex items-center justify-between">
                      <span>{prod.name}</span>
                      <span className="text-[10px] font-mono text-[#00e599]">Fact #{idx + 1}</span>
                    </div>
                    {prod.description && (
                      <p className="text-xs text-[#a3b899] leading-relaxed">{prod.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Target Customers / Audience */}
          <div className="bg-[#10221a] rounded-2xl border border-[#1f3f31] p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c382b]">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00e599] uppercase tracking-wider">
                <Users className="w-4 h-4" />
                <span>Target Buyers &amp; Audience</span>
              </div>
              <span className="text-xs font-mono text-[#a3b899]">{customers.length} Segments</span>
            </div>

            {customers.length === 0 ? (
              <p className="text-xs text-[#a3b899] italic">
                Cross-industry enterprise &amp; commercial customer profile inferred from domain.
              </p>
            ) : (
              <div className="space-y-2.5">
                {customers.map((cust, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#0b1812] border border-[#1c382b] space-y-1 hover:border-[#0d9467]/40 transition-colors"
                  >
                    <div className="text-xs font-semibold text-white flex items-center justify-between">
                      <span>{cust.name}</span>
                      <span className="text-[10px] font-mono text-[#a3b899]">Segment</span>
                    </div>
                    {cust.description && (
                      <p className="text-xs text-[#a3b899] leading-relaxed">{cust.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Verification Footer Actions */}
        <div className="p-4 rounded-xl bg-[#091510] border border-[#183325] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#a3b899]">
            <ShieldCheck className="w-4 h-4 text-[#00e599] shrink-0" />
            <span>Profile locked. Ready to run competitive research against market alternatives.</span>
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] text-white font-semibold transition-all shadow-md cursor-pointer shrink-0"
          >
            <span>Proceed to Competitor Discovery</span>
            <ArrowRight className="w-4 h-4 text-[#00e599]" />
          </button>
        </div>
      </div>
    </div>
  );
}
