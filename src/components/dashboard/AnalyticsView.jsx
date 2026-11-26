import React from 'react';
import { BarChart3, TrendingUp, ShieldCheck, Mail, Linkedin, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';

export default function AnalyticsView({ metrics }) {
  const FUNNEL = [
    { stage: 'Prospects Identified', count: 1248, percent: '100%' },
    { stage: 'Emails Dispatched', count: 3842, percent: '100%' },
    { stage: 'Emails Opened', count: 2628, percent: '68.4%' },
    { stage: 'Replies Received', count: 707, percent: '18.4%' },
    { stage: 'Positive Conversations', count: 452, percent: '11.8%' },
    { stage: 'Qualified Meetings Booked', count: 34, percent: '0.9%' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
          Deliverability &amp; Outbound Analytics
        </h1>
        <p className="text-sm text-[#4a5851] mt-0.5">
          Real-time deliverability health, funnel metrics, and channel conversion breakdowns
        </p>
      </div>

      {/* Deliverability Health Card */}
      <div className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-[#0d1c15]/08">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0d9467]" />
              <h3 className="font-display font-bold text-lg text-[#0d1c15]">
                Mailbox &amp; Domain Reputation Status
              </h3>
            </div>
            <p className="text-xs text-[#5a6962] mt-0.5">
              Live automated DNS telemetry monitored across all auxiliary sending inboxes
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1 rounded-full bg-[#00e599]/15 text-[#0d9467] font-bold border border-[#00e599]/30">
              PRISTINE HEALTH · 99.4%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
            <span className="text-[10px] font-mono uppercase text-[#73827a] block">SPF Authentication</span>
            <span className="text-base font-bold text-[#0d9467] flex items-center gap-1 mt-1 font-mono">
              <CheckCircle2 className="w-4 h-4" /> PASS · Verified
            </span>
            <span className="text-xs text-[#5a6962] mt-1 block">v=spf1 include:_spf.google.com</span>
          </div>

          <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
            <span className="text-[10px] font-mono uppercase text-[#73827a] block">DKIM 2048-bit Signature</span>
            <span className="text-base font-bold text-[#0d9467] flex items-center gap-1 mt-1 font-mono">
              <CheckCircle2 className="w-4 h-4" /> PASS · Valid
            </span>
            <span className="text-xs text-[#5a6962] mt-1 block">2048-bit cryptographic key</span>
          </div>

          <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
            <span className="text-[10px] font-mono uppercase text-[#73827a] block">DMARC Policy Enforcement</span>
            <span className="text-base font-bold text-[#0d9467] flex items-center gap-1 mt-1 font-mono">
              <CheckCircle2 className="w-4 h-4" /> PASS · Quarantine
            </span>
            <span className="text-xs text-[#5a6962] mt-1 block">Strict reject protection active</span>
          </div>

          <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
            <span className="text-[10px] font-mono uppercase text-[#73827a] block">Spam Test Score</span>
            <span className="text-base font-bold text-[#0d9467] flex items-center gap-1 mt-1 font-mono">
              0.1 / 10 · Ultra Safe
            </span>
            <span className="text-xs text-[#5a6962] mt-1 block">Zero blacklisted IP addresses</span>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm">
        <h3 className="font-display font-bold text-lg text-[#0d1c15] mb-1">
          Full-Funnel Outbound Conversion Rates
        </h3>
        <p className="text-xs text-[#5a6962] mb-6">
          Step-by-step conversion pipeline from initial lead identification to confirmed sales meetings
        </p>

        <div className="space-y-3">
          {FUNNEL.map((f, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#edf2ec] text-[#0d1c15] font-mono text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="font-semibold text-sm text-[#0d1c15]">{f.stage}</span>
              </div>

              <div className="flex items-center gap-4 font-mono text-xs">
                <span className="text-base font-bold text-[#0d1c15]">{f.count.toLocaleString()}</span>
                <span className="px-2.5 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] font-semibold w-16 text-right">
                  {f.percent}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
