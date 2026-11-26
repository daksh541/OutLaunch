import React, { useState } from 'react';
import { ArrowRight, HelpCircle, Send, Calendar, UserPlus, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';

const emailPriceUsd = 0.03;
const meetingsRate = { low: 0.0009, high: 0.0018 };
const leadsRate = { low: 0.002, high: 0.008 };

export default function EditorialCalculatorSection() {
  const [budget, setBudget] = useState(30);
  const [showInfo, setShowInfo] = useState(false);
  const { navigate } = useNavigation();

  const emails = Math.round(budget / emailPriceUsd);
  const hasEmails = emails > 0;

  const formatRange = (rate) => {
    if (!hasEmails) return '0';
    const low = Math.max(1, Math.round(emails * rate.low));
    const high = Math.max(low, Math.round(emails * rate.high));
    return low === high ? `~${low}` : `~${low}–${high}`;
  };

  const warmLeads = formatRange(leadsRate);
  const meetings = formatRange(meetingsRate);
  const costPerLead = hasEmails ? `$1–$${Math.round(emailPriceUsd / leadsRate.low)}` : '0';

  const metrics = [
    {
      label: 'Emails',
      value: emails.toLocaleString(),
      icon: Send,
      info: false
    },
    {
      label: 'Warm leads',
      value: warmLeads,
      icon: UserPlus,
      info: false
    },
    {
      label: 'Meetings',
      value: meetings,
      icon: Calendar,
      info: false
    },
    {
      label: 'Cost per lead',
      value: costPerLead,
      icon: HelpCircle,
      info: true
    }
  ];

  const handleCtaClick = () => {
    const input = document.getElementById('hero-website-input');
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    } else {
      navigate(PRODUCT_ROUTES.REGISTER);
    }
  };

  return (
    <section id="pricing" className="py-20 md:py-28 bg-[#f7f5f0] relative scroll-mt-20">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3">
            <span>TRANSPARENT ECONOMICS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-[1.12]">
            Pay as you go with no subscription
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4a5851] leading-relaxed">
            No mandatory $1,500/mo retainer. No lock-in contracts. Slide your budget below to see estimated volume and meetings.
          </p>
        </div>

        {/* Calculator Card */}
        <div className="p-6 sm:p-10 max-w-[720px] mx-auto bg-white rounded-3xl border border-[#0d1c15]/10 shadow-[0_16px_50px_rgba(13,28,21,0.06)]">
          
          {/* Slider Container */}
          <div className="mb-10">
            <div className="flex items-center justify-between text-xs font-mono text-[#73827a] mb-8">
              <span>MONTHLY BUDGET ALLOCATION</span>
              <span className="text-[#0d9467] font-bold">$0.03 PER VERIFIED EMAIL</span>
            </div>

            <div className="relative pt-10">
              {/* Floating budget label */}
              <span
                className="absolute top-0 -translate-x-1/2 text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tabular-nums select-none transition-all duration-75 px-3 py-1 rounded-xl bg-[#edf2ec] border border-[#dbe5da]"
                style={{
                  left: `clamp(36px, calc((100% - 48px) * ${budget / 100} + 24px), calc(100% - 48px))`
                }}
              >
                ${budget.toLocaleString()}
              </span>

              {/* Slider Input */}
              <div className="relative flex items-center w-full">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full h-2.5 bg-[#edf2ec] rounded-lg appearance-none cursor-pointer accent-[#0d9467] focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #0d9467 0%, #0d9467 ${budget}%, #edf2ec ${budget}%, #edf2ec 100%)`
                  }}
                />
              </div>

              <div className="flex justify-between items-center text-xs font-mono text-[#73827a] mt-3">
                <span>$0</span>
                <span>$25</span>
                <span>$50</span>
                <span>$75</span>
                <span>$100</span>
              </div>
            </div>
          </div>

          {/* Computed Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {metrics.map((m, idx) => {
              const Icon = m.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-[#73827a] font-semibold">{m.label}</span>
                    <Icon className="w-4 h-4 text-[#0d9467]" />
                  </div>
                  <div className="text-xl sm:text-2xl font-display font-bold text-[#0d1c15] tabular-nums">
                    {m.value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Inclusions Banner */}
          <div className="p-4 rounded-2xl bg-[#edf2ec] border border-[#dbe5da] mb-8 space-y-2 text-xs sm:text-[13px] text-[#182e24]">
            <div className="flex items-center gap-2 font-semibold text-[#0d1c15]">
              <Sparkles className="w-4 h-4 text-[#0d9467]" />
              <span>What's included in every plan:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0d9467]" /> 250M+ Verified B2B Database
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0d9467]" /> Company Tech &amp; News Research
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0d9467]" /> Synchronized LinkedIn Outreach
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0d9467]" /> Human Review &amp; Approval Queue
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleCtaClick}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#0d1c15] hover:bg-[#162b21] active:scale-[0.99] text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(13,28,21,0.12)] cursor-pointer group"
          >
            <span>Get your first 3 leads free</span>
            <ArrowRight className="w-4 h-4 text-[#00e599] group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="text-center text-xs text-[#73827a] mt-3 font-mono">
            Includes $30 in free credits · No credit card required to start
          </p>

        </div>

      </div>
    </section>
  );
}
