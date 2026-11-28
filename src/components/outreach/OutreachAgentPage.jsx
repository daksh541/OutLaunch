import React, { useState, useEffect, useRef } from 'react';
import EditorialNavbar from '../landing/EditorialNavbar';
import EditorialHero from '../landing/EditorialHero';
import OutLaunchScrollytellingWorkflow from '../landing/OutLaunchScrollytellingWorkflow';
import ShiftingGradientMesh from '../landing/ShiftingGradientMesh';
import SmoothScrollProvider from '../navigation/SmoothScrollProvider';
import InitialPreloader from '../ui/InitialPreloader';
import HumanApprovalSection from '../landing/HumanApprovalSection';
import LeadDiscoverySection from '../landing/LeadDiscoverySection';
import PersonalisationSection from '../landing/PersonalisationSection';
import MultichannelOutreachSection from '../landing/MultichannelOutreachSection';
import CampaignManagementSection from '../landing/CampaignManagementSection';
import TrustControlSection from '../landing/TrustControlSection';
import OutboundSequenceSimulator from '../landing/OutboundSequenceSimulator';
import EditorialFaqSection from '../landing/EditorialFaqSection';
import EditorialFinalCta from '../landing/EditorialFinalCta';
import EditorialFooter from '../landing/EditorialFooter';
import { MessageSquare, X, Send } from 'lucide-react';

export default function OutreachAgentPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const chatDialogRef = useRef(null);

  // Esc key and outside click to dismiss chat dialog (Modern Web Guidance compliance)
  useEffect(() => {
    if (!chatOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setChatOpen(false);
    };
    const handleClickOutside = (e) => {
      if (chatDialogRef.current && !chatDialogRef.current.contains(e.target)) {
        setChatOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [chatOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    alert(`Thanks for reaching out! A support engineer will review: "${chatMessage}"`);
    setChatMessage('');
    setChatOpen(false);
  };

  return (
    <SmoothScrollProvider>
      <InitialPreloader />
      <div className="landing-editorial-root min-h-screen flex flex-col bg-[#f7f5f0] text-[#0d1c15] antialiased selection:bg-[#00e599]/30 selection:text-[#0d1c15] relative overflow-hidden">
        {/* Subtle Canvas Shifting Gradient Mesh */}
        <ShiftingGradientMesh />

        {/* 1. Navigation */}
        <EditorialNavbar />

        <main className="flex-1 flex flex-col relative z-10">
          {/* 2. Hero Section */}
          <EditorialHero />

          {/* 3. Scrollytelling Pinned Workflow Section (Lead Discovery -> Dossier -> Sequences -> Governance) */}
          <OutLaunchScrollytellingWorkflow />

          {/* 4. Product Explanation (Human-in-the-Loop Review) */}
          <HumanApprovalSection />

          {/* 5. Lead Discovery Deep Dive */}
          <LeadDiscoverySection />

          {/* 6. AI Research and Personalisation */}
          <PersonalisationSection />

          {/* 7. Email and LinkedIn Outreach */}
          <MultichannelOutreachSection />

          {/* 8. Campaign Management */}
          <CampaignManagementSection />

          {/* 9. Trust, Safety and Control */}
          <TrustControlSection />

          {/* 10. Interactive Cadence Simulator */}
          <OutboundSequenceSimulator />

          {/* 11. FAQ */}
          <EditorialFaqSection />

          {/* 12. Final CTA */}
          <EditorialFinalCta />
        </main>

        {/* 13. Footer */}
        <EditorialFooter />

        {/* Floating Support Chat Widget with Light Dismiss */}
        <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setChatOpen(!chatOpen)}
          aria-label="Open support chat"
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#0d1c15] hover:bg-[#162b21] text-[#00e599] flex items-center justify-center shadow-[0_8px_25px_rgba(13,28,21,0.25)] transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-[#233f33]"
        >
          {chatOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6" />}
        </button>

        {chatOpen && (
          <div
            ref={chatDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-title"
            className="absolute bottom-16 sm:bottom-18 right-0 w-[calc(100vw-3rem)] sm:w-88 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-[#0d1c15]/12 p-5 mb-2 animate-scaleUp text-[#0d1c15]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#0d1c15]/08">
              <div id="chat-title" className="font-semibold text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00e599] animate-pulse" />
                OutLaunch Support Concierge
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
                className="text-xs text-[#73827a] hover:text-[#0d1c15] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 text-xs text-[#4a5851] leading-relaxed">
              Hi there! 👋 Have questions about deliverability, prospect data, or setting up your review queue? Ask our team here:
            </div>

            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Write a message..."
                className="w-full bg-[#fcfbf9] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#0d1c15] placeholder-[#73827a] outline-none border border-[#0d1c15]/12 focus:border-[#0d9467] font-medium"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#0d1c15] text-[#00e599] hover:bg-[#162b21] transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      </div>
    </SmoothScrollProvider>
  );
}
