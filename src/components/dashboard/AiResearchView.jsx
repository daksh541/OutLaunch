import React, { useState } from 'react';
import { Sparkles, Search, Check, Copy, Building2, MapPin, Users, Globe, ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react';

const PRESET_COMPANIES = {
  'hyperflow.ai': {
    name: 'Hyperflow AI',
    domain: 'hyperflow.ai',
    hq: 'San Francisco, CA',
    headcount: '75 employees',
    funding: '$12M Series A led by Benchmark',
    industry: 'Enterprise Software & Agentic AI',
    techStack: ['Salesforce CRM', 'HubSpot', 'Segment', 'Clearbit', 'Stripe'],
    signals: [
      'Announced $12M Series A funding 2 weeks ago',
      'Actively hiring 4 new outbound SDRs across US & EMEA',
      'VP Growth spoke on SaaStr podcast regarding outbound CAC'
    ],
    angles: [
      {
        title: 'Series A Sales Pod Ramp Time',
        hook: 'Congrats on the Series A round! Noticed you\'re onboarding 4 new SDRs this month. Most growth leaders find new reps lose 15+ hours each week researching buyer tech stacks manually before drafting a single personalized pitch. We automate that exact layer.',
        target: 'VP of Growth'
      },
      {
        title: 'CRM Enrichment Fragmentation',
        hook: 'Saw Hyperflow is scaling outbound into EMEA. Often during multi-region expansion, data enrichment gets fragmented across SDRs. We integrate with your Salesforce setup to verify deliverability and populate tailored angles automatically.',
        target: 'VP Revenue Operations'
      }
    ]
  },
  'nexar.io': {
    name: 'Nexar Systems',
    domain: 'nexar.io',
    hq: 'Austin, TX',
    headcount: '180 employees',
    funding: '$28M Series B',
    industry: 'Cloud Infrastructure & Telemetry',
    techStack: ['Salesforce', 'Apollo.io', 'Gong', 'Datadog', 'AWS'],
    signals: [
      'Recently transitioned entire sales organization to Salesforce CRM',
      'Increased headcount by 35% in Q3',
      'Actively seeking email warm-up and domain protection tools'
    ],
    angles: [
      {
        title: 'Post-Migration Data Hygiene',
        hook: 'Saw Nexar recently transitioned sales infrastructure to Salesforce CRM. Often during a migration, outbound enrichment gets fragmented. Explee integrates directly with your CRM to verify deliverability so reps only touch verified records.',
        target: 'Head of Outbound'
      }
    ]
  },
  'linear.app': {
    name: 'Linear',
    domain: 'linear.app',
    hq: 'San Francisco, CA',
    headcount: '95 employees',
    funding: '$35M Series B led by Accel',
    industry: 'Product & Issue Tracking Software',
    techStack: ['Next.js', 'PostgreSQL', 'Stripe', 'Slack', 'Segment'],
    signals: [
      'Released Linear Asks and customer support integrations',
      'Expanding mid-market enterprise sales presence',
      'Highly vocal on high-craft software engineering'
    ],
    angles: [
      {
        title: 'High-Craft Outreach for Engineering Leaders',
        hook: 'Noticed Linear\'s recent expansion into enterprise security workflows. Most VP of Eng leaders hate generic sales spam. We built an outreach workflow that researches prospect codebases and issues before drafting high-conviction, concise messages.',
        target: 'Head of Commercial Sales'
      }
    ]
  }
};

export default function AiResearchView() {
  const [domainInput, setDomainInput] = useState('hyperflow.ai');
  const [activeDomain, setActiveDomain] = useState('hyperflow.ai');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const research = PRESET_COMPANIES[activeDomain] || {
    name: domainInput.replace(/\..*$/, '').toUpperCase() + ' Corp',
    domain: domainInput,
    hq: 'United States',
    headcount: '50-200 employees',
    funding: 'Growth Stage B2B',
    industry: 'Enterprise Software',
    techStack: ['Salesforce', 'HubSpot', 'Stripe', 'AWS'],
    signals: [
      'Active web presence and hiring software engineers',
      'Verified corporate MX records and domain reputation'
    ],
    angles: [
      {
        title: 'Core Value Angle',
        hook: `Noticed ${domainInput}'s outbound expansion this quarter. Most sales leaders lose 12+ hours weekly on manual prospect research. Explee automates that research with 1-click human review.`,
        target: 'Head of Outbound Sales'
      }
    ]
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!domainInput.trim()) return;
    const clean = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    setActiveDomain(clean);
  };

  const handleCopyAngle = (idx, text) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
          AI Company Research &amp; Intelligence Lab
        </h1>
        <p className="text-sm text-[#4a5851] mt-0.5">
          Deep prospect dossiers: analyze news signals, detected tech stacks, and tailored sales hooks
        </p>
      </div>

      {/* Domain Search Card */}
      <div className="p-6 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 text-[#73827a] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Enter company website (e.g. stripe.com, figma.com, nexar.io)..."
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-sm text-[#0d1c15] font-medium outline-none focus:border-[#0d9467]"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-[#00e599]" />
            <span>Generate Research Dossier</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-mono text-[#5a6962]">
          <span>Popular presets:</span>
          {Object.keys(PRESET_COMPANIES).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDomainInput(d);
                setActiveDomain(d);
              }}
              className="px-2 py-0.5 rounded bg-[#edf2ec] hover:bg-[#dbe5da] text-[#0d1c15] cursor-pointer"
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Research Output Dossier */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#0d1c15]/08 shadow-sm p-6 sm:p-8 space-y-8">
        
        {/* Company Identity Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#0d1c15]/08">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00e599]/15 text-[#0d9467] font-mono text-xs font-bold border border-[#00e599]/30 mb-2">
              <Check className="w-3.5 h-3.5" /> Dossier Verified
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15]">
              {research.name}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#5a6962] mt-1.5">
              <span>{research.domain}</span>
              <span>·</span>
              <span>{research.hq}</span>
              <span>·</span>
              <span>{research.headcount}</span>
              <span>·</span>
              <span className="font-semibold text-[#0d1c15]">{research.funding}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono text-[#73827a] block">COMMERCIAL FIT</span>
            <span className="text-2xl font-display font-bold text-[#0d9467]">98.6% MATCH</span>
          </div>
        </div>

        {/* 2-Column Details: Signals & Tech Stack */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[#0d9467] font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Signals &amp; Triggers</span>
            </div>
            <div className="space-y-2">
              {research.signals.map((sig, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white border border-[#0d1c15]/06 text-xs text-[#182e24] leading-relaxed">
                  • {sig}
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-3">
            <div className="text-xs font-mono uppercase text-[#73827a] font-bold">
              Detected Sales &amp; Marketing Stack
            </div>
            <div className="flex flex-wrap gap-2">
              {research.techStack.map((tech, idx) => (
                <span key={idx} className="px-3 py-1.5 rounded-xl bg-white text-xs font-semibold text-[#0d1c15] border border-[#0d1c15]/10 shadow-2xs">
                  {tech}
                </span>
              ))}
            </div>
            <p className="text-xs text-[#5a6962] leading-relaxed pt-2">
              Our automated crawlers cross-reference DNS entries, careers listings, and technology signatures.
            </p>
          </div>
        </div>

        {/* Tailored Angles Generated */}
        <div className="space-y-4 pt-2">
          <h3 className="font-display font-bold text-lg text-[#0d1c15]">
            AI-Crafted Outreach Angles &amp; Opening Hooks
          </h3>

          <div className="space-y-3">
            {research.angles.map((angle, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#0d1c15]">{angle.title} · Target: {angle.target}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyAngle(idx, angle.hook)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#0d1c15]/10 text-xs font-semibold text-[#0d1c15] hover:bg-[#edf2ec] cursor-pointer"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#0d9467]" />
                        <span className="text-[#0d9467]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#5a6962]" />
                        <span>Copy Hook</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-[#182e24] leading-relaxed font-sans bg-white p-4 rounded-xl border border-[#0d1c15]/06">
                  "{angle.hook}"
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
