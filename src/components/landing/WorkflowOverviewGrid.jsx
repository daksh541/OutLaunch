import React from 'react';
import { Search, Sparkles, Mail, Linkedin, UserCheck, ShieldCheck, CheckCircle2, ArrowRight, Database, Layers, SlidersHorizontal, Inbox } from 'lucide-react';

const PIPELINE_STAGES = [
  {
    step: 'STAGE 01',
    category: 'LEAD DISCOVERY',
    title: 'Pinpoint High-Intent Decision Makers',
    description: 'Filter across 250M+ verified global B2B profiles by exact buying criteria: departmental headcount, technology adoption, and active hiring sprees.',
    badge: 'Real-time Verification',
    highlights: ['250M+ Verified Contacts', 'Zero-Bounce Guarantee', 'Granular Role Filtering'],
    previewType: 'table',
  },
  {
    step: 'STAGE 02',
    category: 'ACCOUNT INTELLIGENCE',
    title: 'Autonomous Research Dossiers',
    description: 'Before a single word is drafted, our agents aggregate company news, quarterly earnings, tech stack shifts, and executive LinkedIn posts into an actionable dossier.',
    badge: 'Multi-Signal Aggregation',
    highlights: ['Funding & Growth Signals', 'Tech Stack Detection', 'Identified Pain Points'],
    previewType: 'signals',
  },
  {
    step: 'STAGE 03',
    category: 'ORCHESTRATION',
    title: 'Synchronized Email & LinkedIn Outreach',
    description: 'Dispatch personalized opening hooks across cold email and LinkedIn touchpoints with automatic message threading and sequence pauses on response.',
    badge: 'Multi-Channel Cadence',
    highlights: ['Secondary Domain Protection', 'Custom LinkedIn Notes', 'Smart Reply Collision Guard'],
    previewType: 'sequence',
  },
  {
    step: 'STAGE 04',
    category: 'CONTROL & SAFETY',
    title: 'Human-in-the-Loop Oversight',
    description: 'Keep full editorial control. Set safety thresholds to manually review drafts, tweak opening angles, or let high-confidence matches auto-queue.',
    badge: 'Delivery Governance',
    highlights: ['One-Click Draft Edits', 'Spam Score Defense (0.1/10)', 'Domain Health Monitor'],
    previewType: 'safety',
  },
];

export default function WorkflowOverviewGrid() {
  return (
    <section id="workflow" className="py-20 md:py-28 bg-[#f7f5f0] relative">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-[11px] font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3">
            <span>[ STAGE_01 — STAGE_04 ]</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-tight">
            How the OutLaunch pipeline operates
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4a5851] leading-relaxed">
            Every step is modular, transparent, and structured for maximum inbox delivery and response rates.
          </p>
        </div>

        {/* 2x2 Non-Overlapping Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card 1: Lead Discovery */}
          <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 p-6 sm:p-8 shadow-[0_8px_30px_rgba(13,28,21,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d1c15]/08">
                <span className="text-xs font-mono font-semibold text-[#0d9467] uppercase tracking-wider">
                  01 · LEAD DISCOVERY
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-[#edf2ec] text-[#182e24] border border-[#dbe5da]">
                  250M+ Contacts
                </span>
              </div>
              <h3 className="text-2xl font-display font-bold text-[#0d1c15] mb-2">
                Pinpoint high-intent decision makers
              </h3>
              <p className="text-sm text-[#4a5851] leading-relaxed mb-6">
                Filter across verified B2B profiles by exact buying criteria: departmental headcount, technology stack, and hiring momentum.
              </p>

              {/* Discovery Table UI Preview */}
              <div className="bg-[#fcfbf9] rounded-xl border border-[#0d1c15]/08 p-3 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-[#73827a] pb-1 border-b border-[#0d1c15]/06 text-[10px] uppercase">
                  <span>Contact</span>
                  <span>Company</span>
                  <span>Fit Score</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#0d1c15]/04">
                  <span className="font-semibold text-[#0d1c15]">Sarah Jenkins (VP Growth)</span>
                  <span className="text-[#5a6962]">Hyperflow AI</span>
                  <span className="text-[#0d9467] font-bold">98.4%</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#0d1c15]/04">
                  <span className="font-semibold text-[#0d1c15]">David Marcus (Head of Sales)</span>
                  <span className="text-[#5a6962]">DataPrime Corp</span>
                  <span className="text-[#0d9467] font-bold">96.1%</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="font-semibold text-[#0d1c15]">Elena Rostova (RevOps Dir)</span>
                  <span className="text-[#5a6962]">CloudSphere</span>
                  <span className="text-[#0d9467] font-bold">94.8%</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#0d1c15]/08 flex flex-wrap gap-2 text-xs font-mono text-[#5a6962]">
              <span className="px-2.5 py-1 rounded-md bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Zero-Bounce Guarantee</span>
              <span className="px-2.5 py-1 rounded-md bg-[#f7f5f0] border border-[#0d1c15]/08">✓ SMTP Live Ping</span>
            </div>
          </div>

          {/* Card 2: Account Intelligence */}
          <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 p-6 sm:p-8 shadow-[0_8px_30px_rgba(13,28,21,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d1c15]/08">
                <span className="text-xs font-mono font-semibold text-[#0d9467] uppercase tracking-wider">
                  02 · ACCOUNT DOSSIERS
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-[#edf2ec] text-[#182e24] border border-[#dbe5da]">
                  Signal Engine
                </span>
              </div>
              <h3 className="text-2xl font-display font-bold text-[#0d1c15] mb-2">
                Automated account intelligence
              </h3>
              <p className="text-sm text-[#4a5851] leading-relaxed mb-6">
                Our models analyze recent funding, executive moves, open job posts, and quarterly releases to extract genuine buying triggers.
              </p>

              {/* Signal Dossier Preview */}
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#0d9467] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#0d1c15] block">Series A Growth Spike</span>
                    <span className="text-[#5a6962] text-[11px]">Raised $12M; opening 4 regional SDR positions in Q4.</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-start gap-2.5">
                  <Database className="w-4 h-4 text-[#0d9467] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#0d1c15] block">Tech Stack Fit</span>
                    <span className="text-[#5a6962] text-[11px]">HubSpot CRM, Segment, Clearbit, AWS infrastructure.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#0d1c15]/08 flex flex-wrap gap-2 text-xs font-mono text-[#5a6962]">
              <span className="px-2.5 py-1 rounded-md bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Real-time News Feeds</span>
              <span className="px-2.5 py-1 rounded-md bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Tech Stack Signatures</span>
            </div>
          </div>

          {/* Card 3: Multi-Channel Outreach */}
          <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 p-6 sm:p-8 shadow-[0_8px_30px_rgba(13,28,21,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d1c15]/08">
                <span className="text-xs font-mono font-semibold text-[#0d9467] uppercase tracking-wider">
                  03 · MULTI-CHANNEL SEQUENCES
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-[#edf2ec] text-[#182e24] border border-[#dbe5da]">
                  Email &amp; LinkedIn
                </span>
              </div>
              <h3 className="text-2xl font-display font-bold text-[#0d1c15] mb-2">
                Coordinated email &amp; social touches
              </h3>
              <p className="text-sm text-[#4a5851] leading-relaxed mb-6">
                Pair verified email threads with tailored LinkedIn connection notes. If a prospect replies anywhere, subsequent steps pause automatically.
              </p>

              {/* Message Preview */}
              <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-xs space-y-2">
                <div className="flex items-center justify-between font-mono text-[10px] text-[#5a6962] pb-1.5 border-b border-[#0d1c15]/06">
                  <span>DAY 1 · EMAIL 01</span>
                  <span className="text-[#0d9467]">SPF / DKIM PASS</span>
                </div>
                <p className="text-[#33413a] leading-relaxed">
                  "Hi Sarah — noticed Hyperflow's recent Series A and your SDR hiring push. Built an AI workflow that researches prospect tech stacks before generating 1st lines..."
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#0d1c15]/08 flex flex-wrap gap-2 text-xs font-mono text-[#5a6962]">
              <span className="px-2.5 py-1 rounded-md bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Smart Collision Defense</span>
              <span className="px-2.5 py-1 rounded-md bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Secondary Domain Warm-up</span>
            </div>
          </div>

          {/* Card 4: Human-in-the-Loop & Safety */}
          <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 p-6 sm:p-8 shadow-[0_8px_30px_rgba(13,28,21,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d1c15]/08">
                <span className="text-xs font-mono font-semibold text-[#0d9467] uppercase tracking-wider">
                  04 · HUMAN OVERSIGHT &amp; GOVERNANCE
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-[#edf2ec] text-[#0d9467] font-bold border border-[#dbe5da]">
                  Safe Sending
                </span>
              </div>
              <h3 className="text-2xl font-display font-bold text-[#0d1c15] mb-2">
                Human-in-the-loop review queue
              </h3>
              <p className="text-sm text-[#4a5851] leading-relaxed mb-6">
                Never send AI-generated spam. Your revenue team can review, edit, or approve all outgoing messages with one click before dispatch.
              </p>

              {/* Governance Bar UI */}
              <div className="p-3.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#0d9467]" />
                  <span className="font-semibold text-[#0d1c15]">Review Mode: Active</span>
                </div>
                <span className="font-mono text-[11px] text-[#0d9467] bg-[#00e599]/15 px-2 py-0.5 rounded border border-[#00e599]/30 font-bold">
                  100% PRE-DISPATCH CHECK
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#0d1c15]/08 flex flex-wrap gap-2 text-xs font-mono text-[#5a6962]">
              <span className="px-2.5 py-1 rounded-md bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Inline Tone Correction</span>
              <span className="px-2.5 py-1 rounded-md bg-[#f7f5f0] border border-[#0d1c15]/08">✓ Daily Volume Limits</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
