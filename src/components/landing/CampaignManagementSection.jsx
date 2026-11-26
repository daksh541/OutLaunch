import React from 'react';
import { LayoutDashboard, TrendingUp, Users, Mail, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';

export default function CampaignManagementSection() {
  return (
    <section className="py-20 md:py-28 bg-[#ffffff] border-y border-[#0d1c15]/08 relative">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="max-w-3xl mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>04 · CAMPAIGN MANAGEMENT</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-[1.12]">
            One simple workspace for your entire outbound engine
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4a5851] leading-relaxed">
            Manage multi-mailbox sending limits, track active conversations, inspect reply sentiment, and sync booked meetings with your CRM.
          </p>
        </div>

        {/* Campaign Metrics Dashboard Mockup */}
        <div className="bg-[#fcfbf9] rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.06)] p-6 sm:p-8 md:p-10">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#0d1c15]/08">
              <span className="text-xs font-mono text-[#73827a] uppercase font-bold">Active Prospects</span>
              <div className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] mt-1.5">1,248</div>
              <span className="text-xs font-mono text-[#0d9467] mt-1 block">+180 this week</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#0d1c15]/08">
              <span className="text-xs font-mono text-[#73827a] uppercase font-bold">Deliverability Health</span>
              <div className="text-2xl sm:text-3xl font-display font-bold text-[#0d9467] mt-1.5">99.4%</div>
              <span className="text-xs font-mono text-[#0d9467] mt-1 block">Zero bounce events</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#0d1c15]/08">
              <span className="text-xs font-mono text-[#73827a] uppercase font-bold">Reply Rate</span>
              <div className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] mt-1.5">18.2%</div>
              <span className="text-xs font-mono text-[#0d9467] mt-1 block">3.8x industry average</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#0d1c15]/08">
              <span className="text-xs font-mono text-[#73827a] uppercase font-bold">Meetings Booked</span>
              <div className="text-2xl sm:text-3xl font-display font-bold text-[#0d9467] mt-1.5">34</div>
              <span className="text-xs font-mono text-[#5a6962] mt-1 block">$184k pipeline value</span>
            </div>
          </div>

          {/* Active Campaigns Table */}
          <div className="bg-white rounded-xl border border-[#0d1c15]/08 overflow-hidden">
            <div className="px-5 py-3.5 bg-[#edf2ec]/60 border-b border-[#0d1c15]/08 flex items-center justify-between text-xs font-mono text-[#5a6962] font-semibold uppercase">
              <span>Active Campaign</span>
              <span>Sequence Stage</span>
              <span>Sent / Open / Reply</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-[#0d1c15]/06 text-xs sm:text-sm">
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fcfbf9] transition-colors">
                <div>
                  <div className="font-semibold text-[#0d1c15]">US SaaS Series A Founders</div>
                  <div className="text-xs text-[#5a6962]">Targeting 420 companies · SDR scaling angle</div>
                </div>
                <div className="font-mono text-xs text-[#4a5851]">Step 2 of 4 (LinkedIn Note)</div>
                <div className="font-mono text-xs font-medium text-[#0d1c15]">380 / 68% / 19.4%</div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#00e599]/15 text-[#0d9467] font-mono text-xs font-semibold border border-[#00e599]/30">
                    Active Sending
                  </span>
                </div>
              </div>

              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fcfbf9] transition-colors">
                <div>
                  <div className="font-semibold text-[#0d1c15]">Mid-Market RevOps Leaders</div>
                  <div className="text-xs text-[#5a6962]">Targeting 210 companies · CRM migration hook</div>
                </div>
                <div className="font-mono text-xs text-[#4a5851]">Step 1 of 3 (Initial Email)</div>
                <div className="font-mono text-xs font-medium text-[#0d1c15]">195 / 72% / 21.1%</div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#00e599]/15 text-[#0d9467] font-mono text-xs font-semibold border border-[#00e599]/30">
                    Active Sending
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
