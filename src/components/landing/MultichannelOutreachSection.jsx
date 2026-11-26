import React, { useState } from 'react';
import { Mail, Linkedin, ArrowRight, ShieldCheck, Clock, CheckCircle2, RotateCw, Send, MessageSquare } from 'lucide-react';

const EMAIL_SEQUENCE = [
  {
    step: 'STEP 1 · DAY 1',
    time: '9:15 AM EST',
    title: 'The Specific Research Hook',
    description: 'Sent from your dedicated warmed secondary domain with verified SPF, DKIM, and DMARC headers.',
    preview: '"Noticed your team is hiring 4 SDRs following your Series A announcement yesterday..."',
    metric: '64.2% Open Rate',
    badge: 'Email Dispatch #1',
    accentColor: '#0d9467',
    icon: Mail,
  },
  {
    step: 'STEP 2 · DAY 4',
    time: '11:30 AM EST',
    title: 'Value-First Benchmark Follow-up',
    description: 'Replies in the same email thread with relevant ICP teardowns and benchmarks without pushy attachments.',
    preview: '"Sharing how similar B2B SaaS teams ramped outbound volume from 0 to 18 booked demos/month..."',
    metric: '24.8% Direct Reply Rate',
    badge: 'Threaded Bump #2',
    accentColor: '#0d9467',
    icon: Send,
  },
  {
    step: 'STEP 3 · DAY 8',
    time: '2:00 PM EST',
    title: 'Frictionless Permission CTA',
    description: 'A crisp 2-sentence closing note asking for permission to send a 2-minute video walkthrough.',
    preview: '"Worth a quick 5-min look, or should I circle back next quarter once the new hires are in seat?"',
    metric: '19.2% Cumulative Conversion',
    badge: 'Short Closing Note #3',
    accentColor: '#0d9467',
    icon: Clock,
  },
];

const LINKEDIN_SEQUENCE = [
  {
    step: 'STEP 1 · DAY 1',
    time: '10:45 AM EST',
    title: 'Context-Rich Connection Note',
    description: 'Tailored invitation note (< 300 chars) referencing their recent post, keynote, or mutual connections.',
    preview: '"Hi Sarah — loved your recent post on scaling outbound without burning domain rep. Would love to connect and follow along!"',
    metric: '48.6% Acceptance Rate',
    badge: 'Invitation Note #1',
    accentColor: '#0077b5',
    icon: Linkedin,
  },
  {
    step: 'STEP 2 · DAY 3',
    time: '3:15 PM EST',
    title: 'Post-Acceptance Welcome DM',
    description: 'Dispatched 24-48 hours after connection acceptance. Engages naturally on recent company milestones.',
    preview: '"Thanks for connecting, Sarah! Congrats on Hyperflow\'s EMEA expansion. How is the outbound hiring pod shaping up?"',
    metric: '36.2% Conversation Start Rate',
    badge: 'Conversational DM #2',
    accentColor: '#0077b5',
    icon: MessageSquare,
  },
  {
    step: 'STEP 3 · DAY 7',
    time: '1:30 PM EST',
    title: 'Value-Led Audio / Video Touch',
    description: 'Shares an executive insight or personalized 60-second video without pitch-slapping in the DMs.',
    preview: '"Put together a brief 60-second Loom showing how modern growth leads automate lead research. Drop a \'yes\' if you\'d like the link!"',
    metric: '28.4% Qualified Reply Rate',
    badge: 'Micro-Video Touch #3',
    accentColor: '#0077b5',
    icon: Clock,
  },
];

export default function MultichannelOutreachSection() {
  const [activeTab, setActiveTab] = useState('email');
  const activeSequence = activeTab === 'email' ? EMAIL_SEQUENCE : LINKEDIN_SEQUENCE;

  return (
    <section className="py-20 md:py-28 bg-[#f7f5f0] relative">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="max-w-3xl mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3">
            <Mail className="w-3.5 h-3.5" />
            <span>03 · MULTI-CHANNEL ORCHESTRATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-[1.12]">
            Synchronized Email and LinkedIn sequences
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4a5851] leading-relaxed">
            Reach prospects where they actually pay attention. Coordinate personalized cold emails with custom LinkedIn invitation notes and gentle follow-ups.
          </p>
        </div>

        {/* Multi-channel Interface Card */}
        <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_12px_40px_rgba(13,28,21,0.06)] p-6 sm:p-8 md:p-10">
          
          {/* Channel Selector Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-[#0d1c15]/08">
            <div className="flex items-center gap-2 p-1 rounded-xl bg-[#edf2ec] border border-[#dbe5da]">
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'email'
                    ? 'bg-white text-[#0d1c15] shadow-xs'
                    : 'text-[#4a5851] hover:text-[#0d1c15]'
                }`}
              >
                <Mail className="w-4 h-4 text-[#0d9467]" />
                <span>Cold Email Sequence</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('linkedin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'linkedin'
                    ? 'bg-white text-[#0d1c15] shadow-xs'
                    : 'text-[#4a5851] hover:text-[#0d1c15]'
                }`}
              >
                <Linkedin className="w-4 h-4 text-[#0077b5]" />
                <span>LinkedIn Touchpoints</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#5a6962]">
              <RotateCw className="w-3.5 h-3.5 text-[#0d9467]" />
              <span>
                {activeTab === 'email'
                  ? 'Smart collision defense: Auto-pauses email if reply received on LinkedIn'
                  : 'Social safety compliance: Honors LinkedIn daily invitation and buffer limits'}
              </span>
            </div>
          </div>

          {/* Sequence Steps Grid */}
          <div key={activeTab} className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            {activeSequence.map((item) => {
              const Icon = item.icon;
              const isLinkedin = activeTab === 'linkedin';

              return (
                <div
                  key={item.step}
                  className="p-5 sm:p-6 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex flex-col justify-between hover:border-[#0d1c15]/15 transition-all shadow-2xs group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-[#73827a] pb-3 mb-3 border-b border-[#0d1c15]/06">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${isLinkedin ? 'text-[#0077b5]' : 'text-[#0d9467]'}`} />
                        <span>{item.step}</span>
                      </div>
                      <span className={`font-semibold ${isLinkedin ? 'text-[#0077b5]' : 'text-[#0d9467]'}`}>
                        {item.time}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-base font-bold text-[#0d1c15] group-hover:text-[#0d9467] transition-colors">
                        {item.title}
                      </h4>
                    </div>

                    <p className="text-xs text-[#5a6962] leading-relaxed mb-4">
                      {item.description}
                    </p>

                    <div className="p-3.5 rounded-xl bg-white border border-[#0d1c15]/08 text-xs font-mono text-[#33413a] leading-relaxed shadow-2xs">
                      {item.preview}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#0d1c15]/06 text-[11px] font-mono flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 font-semibold ${isLinkedin ? 'text-[#0077b5]' : 'text-[#0d9467]'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{item.metric}</span>
                    </span>
                    <span className="text-[10px] text-[#73827a] bg-[#edf2ec] px-2 py-0.5 rounded-md font-mono">
                      {item.badge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
