import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'How does OutLaunch protect my company email domain from landing in spam?',
    a: 'We never send cold outreach from your primary corporate email domain. We configure dedicated secondary domains with full SPF, DKIM, and DMARC authentication and run them through a 2-week peer-to-peer warm-up routine before sending. Daily sends are strictly capped at 25–40 emails per inbox to mimic natural human behavior.'
  },
  {
    q: 'How does the human-in-the-loop review queue work?',
    a: 'By default, OutLaunch operates in "Review Mode." The AI discovers prospects, researches company signals, and drafts tailored messages into your approval queue. You can review each draft, edit any line, approve in 1 click, or approve entire batches before anything is dispatched. You can also turn on auto-pilot once you trust the AI\'s output.'
  },
  {
    q: 'Is LinkedIn outreach safe with my personal LinkedIn account?',
    a: 'Yes. OutLaunch connects via safe, session-managed API protocols that observe official LinkedIn rate limits (maximum 15–20 connection requests per day). We space touchpoints with organic intervals and avoid mass automated scraping that could trigger account restrictions.'
  },
  {
    q: 'Where does the prospect and company data come from?',
    a: 'We pull from our proprietary database of over 250 million verified B2B profiles and 70 million global companies. Every email address is verified via real-time MX record checks before writing to ensure zero-bounce delivery.'
  },
  {
    q: 'How does the pay-as-you-go pricing work?',
    a: 'There are no mandatory monthly software subscriptions or setup fees. You pay $0.03 per verified dispatched email. When you sign up, your account is credited with $30 in free credits so you can experience full end-to-end pipeline results before spending a single dollar.'
  },
  {
    q: 'What do I need to get started?',
    a: 'Just your company website. Enter your URL on the landing page, and our AI immediately analyzes what you sell, identifies your primary competitors, discovers your ideal customer profiles, and drafts your first campaign within minutes.'
  }
];

export default function EditorialFaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#ffffff] border-y border-[#0d1c15]/08 relative scroll-mt-20">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>COMMON QUESTIONS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-[1.12]">
            Everything you need to know
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4a5851] leading-relaxed">
            Clear, honest answers about deliverability, data sources, and how our human review queue works.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="max-w-[760px] mx-auto divide-y divide-[#0d1c15]/08">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div key={idx} className="py-5">
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  className="w-full text-left flex items-center justify-between gap-4 font-display font-bold text-base sm:text-lg text-[#0d1c15] hover:text-[#0d9467] transition-colors cursor-pointer py-1"
                >
                  <span>{faq.q}</span>
                  <div
                    className={`w-7 h-7 rounded-full bg-[#edf2ec] flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-[#0d9467] text-white' : 'text-[#0d1c15]'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="pt-3 pb-1 text-sm sm:text-base text-[#4a5851] leading-relaxed font-sans animate-fadeIn">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
