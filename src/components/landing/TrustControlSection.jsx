import React from 'react';
import { ShieldCheck, Lock, UserCheck, CheckCircle2, Zap, AlertCircle, Server } from 'lucide-react';
import AnimatedWordHighlight from './AnimatedWordHighlight';

export default function TrustControlSection() {
  const GUARANTEES = [
    {
      icon: <UserCheck className="w-5 h-5 text-[#0d9467]" />,
      title: 'Human Review Queue',
      desc: 'Nothing leaves your workspace without your approval. Inspect every generated message or approve entire verified batches in seconds.'
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#0d9467]" />,
      title: 'Primary Domain Shield',
      desc: 'We set up and configure secondary sending domains (SPF, DKIM, DMARC) so your primary business domain remains 100% protected.'
    },
    {
      icon: <Zap className="w-5 h-5 text-[#0d9467]" />,
      title: 'Gradual Inbox Warm-Up',
      desc: 'Automated 2-week peer-to-peer warm-up routines establish pristine sender reputation with Google and Outlook mail servers.'
    },
    {
      icon: <Lock className="w-5 h-5 text-[#0d9467]" />,
      title: 'Strict Rate Limits',
      desc: 'We cap daily sends at 25–40 emails per mailbox to mimic natural human behavior and prevent algorithmic spam filters from tripping.'
    }
  ];

  return (
    <section className="py-20 md:py-24 bg-transparent relative">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="max-w-3xl mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-[#dbe5da] text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>05 · DELIVERABILITY &amp; SAFETY</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-[1.12]">
            <AnimatedWordHighlight text="Built with rigorous safety and deliverability controls" />
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4a5851] leading-relaxed">
            Your brand reputation is everything. OutLaunch combines automated infrastructure isolation with human approval to guarantee safe, sustainable outreach.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {GUARANTEES.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white/90 backdrop-blur-sm border border-[#0d1c15]/08 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#edf2ec] border border-[#dbe5da] flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-display font-bold text-lg text-[#0d1c15] mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#4a5851] leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-[#0d1c15]/06 flex items-center gap-1.5 text-[11px] font-mono text-[#0d9467] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Safety Standard
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
