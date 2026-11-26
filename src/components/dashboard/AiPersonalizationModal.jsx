import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Mail,
  Linkedin,
  Copy,
  Check,
  RotateCw,
  Save,
  AlertCircle,
  X,
  ExternalLink,
  CheckCircle2,
  Building2,
  MapPin,
  Briefcase,
  Globe,
  Loader2,
  FileText
} from 'lucide-react';
import {
  fetchLeadResearch,
  saveLeadResearch,
  fetchLeadDrafts,
  saveLeadDrafts,
  requestAiResearch,
  requestAiEmail,
  requestAiLinkedIn
} from '../../lib/outreachService';

export default function AiPersonalizationModal({ lead, userId, onClose }) {
  const [activeTab, setActiveTab] = useState('research'); // 'research' | 'email' | 'linkedin'

  // Research State
  const [researchData, setResearchData] = useState(null);
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState(null);

  // Email Draft State
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState(null);

  // LinkedIn Draft State
  const [connectionNote, setConnectionNote] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [secondFollowUp, setSecondFollowUp] = useState('');
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);
  const [linkedInError, setLinkedInError] = useState(null);

  // General Status
  const [saveStatus, setSaveStatus] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // Load existing saved research and drafts from Supabase on mount
  useEffect(() => {
    let isMounted = true;

    async function loadSavedData() {
      if (!lead?.id) return;
      try {
        const [savedResearch, savedDrafts] = await Promise.all([
          fetchLeadResearch(lead.id),
          fetchLeadDrafts(lead.id)
        ]);

        if (!isMounted) return;

        if (savedResearch) {
          setResearchData(savedResearch.raw_research || {
            professional_overview: savedResearch.professional_overview,
            company_overview: savedResearch.company_overview,
            likely_priorities: savedResearch.likely_priorities,
            potential_challenges: savedResearch.potential_challenges,
            relevance_reasons: savedResearch.relevance_reasons,
            suggested_angle: savedResearch.suggested_angle,
          });
        }

        if (savedDrafts) {
          setEmailSubject(savedDrafts.email_subject || '');
          setEmailBody(savedDrafts.email_body || '');
          setConnectionNote(savedDrafts.linkedin_connection_note || '');
          setFollowUp(savedDrafts.linkedin_follow_up || '');
          setSecondFollowUp(savedDrafts.linkedin_second_follow_up || '');
        }
      } catch (err) {
        console.warn('Error loading saved research/drafts:', err);
      }
    }

    loadSavedData();
    return () => { isMounted = false; };
  }, [lead?.id]);

  // Handle Copy to clipboard
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Trigger Research
  const handleRunResearch = async () => {
    setIsResearchLoading(true);
    setResearchError(null);
    try {
      const generated = await requestAiResearch(lead);
      setResearchData(generated);

      // Auto-save generated research to Supabase
      if (userId && lead?.id) {
        await saveLeadResearch(userId, lead.id, generated);
      }
    } catch (err) {
      console.error('Research error:', err);
      setResearchError(err.message || 'Failed to complete research.');
    } finally {
      setIsResearchLoading(false);
    }
  };

  // Trigger Email Generation
  const handleGenerateEmail = async () => {
    setIsEmailLoading(true);
    setEmailError(null);
    try {
      const result = await requestAiEmail(lead, researchData);
      setEmailSubject(result.subject || '');
      setEmailBody(result.full_body || '');

      // Auto-save drafts state to Supabase
      if (userId && lead?.id) {
        await saveLeadDrafts(userId, lead.id, {
          email_subject: result.subject,
          email_body: result.full_body,
          email_opening: result.personalized_opening,
          email_value_prop: result.value_prop,
          email_cta: result.call_to_action,
          linkedin_connection_note: connectionNote,
          linkedin_follow_up: followUp,
          linkedin_second_follow_up: secondFollowUp,
        });
      }
    } catch (err) {
      console.error('Email generation error:', err);
      setEmailError(err.message || 'Failed to generate email.');
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Trigger LinkedIn Generation
  const handleGenerateLinkedIn = async () => {
    setIsLinkedInLoading(true);
    setLinkedInError(null);
    try {
      const result = await requestAiLinkedIn(lead, researchData);
      setConnectionNote(result.connection_note || '');
      setFollowUp(result.follow_up || '');
      setSecondFollowUp(result.second_follow_up || '');

      // Auto-save drafts state to Supabase
      if (userId && lead?.id) {
        await saveLeadDrafts(userId, lead.id, {
          email_subject: emailSubject,
          email_body: emailBody,
          linkedin_connection_note: result.connection_note,
          linkedin_follow_up: result.follow_up,
          linkedin_second_follow_up: result.second_follow_up,
        });
      }
    } catch (err) {
      console.error('LinkedIn generation error:', err);
      setLinkedInError(err.message || 'Failed to generate LinkedIn drafts.');
    } finally {
      setIsLinkedInLoading(false);
    }
  };

  // Save changes to Supabase manually
  const handleSaveAllDrafts = async () => {
    if (!userId || !lead?.id) return;
    setSaveStatus('Saving...');
    try {
      await saveLeadDrafts(userId, lead.id, {
        email_subject: emailSubject,
        email_body: emailBody,
        linkedin_connection_note: connectionNote,
        linkedin_follow_up: followUp,
        linkedin_second_follow_up: secondFollowUp,
      });

      if (researchData) {
        await saveLeadResearch(userId, lead.id, researchData);
      }

      setSaveStatus('Saved to Supabase!');
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('Failed to save.');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[840px] max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-[#0d1c15]/10 flex flex-col overflow-hidden text-[#0d1c15] animate-scaleUp"
      >
        {/* Modal Top Bar */}
        <div className="p-5 sm:p-6 border-b border-[#0d1c15]/08 bg-[#fcfbf9] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0d1c15] text-[#00e599] flex items-center justify-center font-bold text-sm shrink-0">
              <Sparkles className="w-5 h-5 text-[#00e599]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="ai-modal-title" className="font-display font-bold text-lg sm:text-xl text-[#0d1c15]">
                  AI Lead Research &amp; Personalization
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#00e599]/15 text-[#0d9467] font-mono text-[11px] font-bold">
                  GPT-4o Mini
                </span>
              </div>
              <p className="text-xs text-[#5a6962] mt-0.5">
                Target: <strong>{lead.name}</strong> · {lead.title} at <strong>{lead.company}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#73827a] hover:text-[#0d1c15] hover:bg-[#edf2ec] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-[#0d1c15]/08 bg-[#fcfbf9]/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('research')}
              className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'research'
                  ? 'border-[#0d9467] text-[#0d9467]'
                  : 'border-transparent text-[#5a6962] hover:text-[#0d1c15]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>1. Lead Research</span>
              {researchData && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0d9467]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'email'
                  ? 'border-[#0d9467] text-[#0d9467]'
                  : 'border-transparent text-[#5a6962] hover:text-[#0d1c15]'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>2. Personalized Email</span>
              {emailBody && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0d9467]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('linkedin')}
              className={`py-3 px-3.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'linkedin'
                  ? 'border-[#0d9467] text-[#0d9467]'
                  : 'border-transparent text-[#5a6962] hover:text-[#0d1c15]'
              }`}
            >
              <Linkedin className="w-3.5 h-3.5 text-[#0077b5]" />
              <span>3. LinkedIn Drafts</span>
              {connectionNote && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0077b5]" />
              )}
            </button>
          </div>

          {/* Save Status pill */}
          {saveStatus && (
            <span className="text-xs font-mono text-[#0d9467] font-semibold animate-fadeIn">
              {saveStatus}
            </span>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: LEAD RESEARCH */}
          {activeTab === 'research' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Context Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-xs font-mono">
                <div>
                  <span className="text-[10px] uppercase text-[#73827a] block">Full Name</span>
                  <span className="font-semibold text-[#0d1c15]">{lead.name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#73827a] block">Title</span>
                  <span className="font-semibold text-[#0d1c15]">{lead.title || 'Decision Maker'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#73827a] block">Company</span>
                  <span className="font-semibold text-[#0d1c15]">{lead.company}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#73827a] block">Location</span>
                  <span className="font-semibold text-[#0d1c15]">{lead.location || 'United States'}</span>
                </div>
              </div>

              {/* Research Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-[#5a6962] max-w-lg leading-relaxed">
                  Generates an objective analysis of likely business priorities, role challenges, and recommended outreach angles based on available lead data.
                </p>

                <button
                  type="button"
                  disabled={isResearchLoading}
                  onClick={handleRunResearch}
                  className="px-4 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs shrink-0"
                >
                  {isResearchLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 text-[#00e599] animate-spin" />
                      <span>Synthesizing Intelligence...</span>
                    </>
                  ) : researchData ? (
                    <>
                      <RotateCw className="w-4 h-4 text-[#00e599]" />
                      <span>Regenerate Research</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#00e599]" />
                      <span>Research with AI</span>
                    </>
                  )}
                </button>
              </div>

              {researchError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{researchError}</span>
                </div>
              )}

              {/* Research Output Panel */}
              {isResearchLoading ? (
                <div className="p-12 flex flex-col items-center justify-center text-center bg-[#fcfbf9] rounded-2xl border border-[#0d1c15]/08">
                  <Loader2 className="w-8 h-8 text-[#0d9467] animate-spin mb-3" />
                  <p className="text-sm font-semibold text-[#0d1c15]">Conducting AI Lead Research</p>
                  <p className="text-xs text-[#5a6962] mt-1">
                    Analyzing role context, priorities, and verified signals...
                  </p>
                </div>
              ) : researchData ? (
                <div className="space-y-4">
                  {/* Overview Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-1.5">
                      <span className="text-[11px] font-mono uppercase text-[#0d9467] font-bold block">
                        Professional Overview
                      </span>
                      <p className="text-xs sm:text-sm text-[#182e24] leading-relaxed">
                        {researchData.professional_overview}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-1.5">
                      <span className="text-[11px] font-mono uppercase text-[#0d9467] font-bold block">
                        Company Context
                      </span>
                      <p className="text-xs sm:text-sm text-[#182e24] leading-relaxed">
                        {researchData.company_overview}
                      </p>
                    </div>
                  </div>

                  {/* Priorities & Challenges */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 space-y-2">
                      <span className="text-[11px] font-mono uppercase text-[#73827a] font-bold block">
                        Likely Business Priorities
                      </span>
                      <ul className="space-y-1.5">
                        {(researchData.likely_priorities || []).map((item, idx) => (
                          <li key={idx} className="text-xs text-[#182e24] flex items-start gap-1.5">
                            <span className="text-[#0d9467] font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 space-y-2">
                      <span className="text-[11px] font-mono uppercase text-[#73827a] font-bold block">
                        Potential Role Challenges
                      </span>
                      <ul className="space-y-1.5">
                        {(researchData.potential_challenges || []).map((item, idx) => (
                          <li key={idx} className="text-xs text-[#182e24] flex items-start gap-1.5">
                            <span className="text-[#c2410c] font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Product Relevance & Conversation Angle */}
                  <div className="p-4 rounded-2xl bg-[#edf2ec]/50 border border-[#dbe5da] space-y-3">
                    <div>
                      <span className="text-[11px] font-mono uppercase text-[#0d9467] font-bold block mb-1">
                        Relevance to OutLaunch Outreach
                      </span>
                      <ul className="space-y-1">
                        {(researchData.relevance_reasons || []).map((reason, idx) => (
                          <li key={idx} className="text-xs text-[#182e24] flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-[#0d9467] shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-[#dbe5da]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono uppercase text-[#0d1c15] font-bold">
                          Suggested Conversation Angle
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(researchData.suggested_angle, 'angle')}
                          className="text-xs font-mono text-[#0d9467] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === 'angle' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'angle' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-[#182e24] font-medium leading-relaxed italic">
                        "{researchData.suggested_angle}"
                      </p>
                    </div>
                  </div>

                  {/* Proceed CTA */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('email')}
                      className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Draft Personalized Email</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-12 flex flex-col items-center justify-center text-center bg-[#fcfbf9] rounded-2xl border border-dashed border-[#0d1c15]/15">
                  <Sparkles className="w-8 h-8 text-[#73827a]/50 mb-3" />
                  <h3 className="font-display font-bold text-base text-[#0d1c15]">No research generated yet</h3>
                  <p className="text-xs text-[#5a6962] max-w-sm mt-1">
                    Click "Research with AI" to summarize the prospect's likely challenges, priorities, and conversation angles.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PERSONALIZED EMAIL */}
          {activeTab === 'email' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-[#5a6962] leading-relaxed max-w-md">
                  Generates a crisp, human-written cold email referencing the prospect's actual context. You can edit the subject and body before saving.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isEmailLoading}
                    onClick={handleGenerateEmail}
                    className="px-4 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    {isEmailLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 text-[#00e599] animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 text-[#00e599]" />
                        <span>{emailBody ? 'Regenerate Email' : 'Generate Email'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {emailError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}

              {/* Editable Subject & Body */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono text-[#5a6962] font-semibold">Subject Line</label>
                    {emailSubject && (
                      <button
                        type="button"
                        onClick={() => handleCopy(emailSubject, 'subject')}
                        className="text-xs font-mono text-[#0d9467] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'subject' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'subject' ? 'Copied' : 'Copy Subject'}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={emailSubject}
                    placeholder="e.g. quick question regarding outbound at Acme"
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] text-xs sm:text-sm font-medium outline-none focus:border-[#0d9467]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono text-[#5a6962] font-semibold">Email Body</label>
                    {emailBody && (
                      <button
                        type="button"
                        onClick={() => handleCopy(emailBody, 'body')}
                        className="text-xs font-mono text-[#0d9467] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'body' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'body' ? 'Copied' : 'Copy Body'}</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={8}
                    value={emailBody}
                    placeholder="Click 'Generate Email' to create a personalized, high-conviction email draft..."
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] text-xs sm:text-sm font-sans leading-relaxed outline-none focus:border-[#0d9467]"
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-mono text-[#73827a]">
                  Changes persist to your Supabase account.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAllDrafts}
                    className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5 text-[#00e599]" />
                    <span>Save Draft</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LINKEDIN DRAFTS */}
          {activeTab === 'linkedin' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[#5a6962] leading-relaxed max-w-md">
                    Generate personalized connection notes and follow-ups. In accordance with safety rules, all messages remain drafts for manual user review and sending.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isLinkedInLoading}
                  onClick={handleGenerateLinkedIn}
                  className="px-4 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs shrink-0"
                >
                  {isLinkedInLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 text-[#00e599] animate-spin" />
                      <span>Generating Notes...</span>
                    </>
                  ) : (
                    <>
                      <Linkedin className="w-4 h-4 text-[#0077b5]" />
                      <span>{connectionNote ? 'Regenerate Drafts' : 'Generate LinkedIn Drafts'}</span>
                    </>
                  )}
                </button>
              </div>

              {linkedInError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{linkedInError}</span>
                </div>
              )}

              {/* Drafts List */}
              <div className="space-y-4">
                {/* 1. Connection Request Note */}
                <div className="p-4 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase font-bold text-[#0077b5]">
                        Connection Request Note
                      </span>
                      <span className="text-[10px] font-mono text-[#73827a]">
                        ({connectionNote.length} / 300 chars)
                      </span>
                    </div>
                    {connectionNote && (
                      <button
                        type="button"
                        onClick={() => handleCopy(connectionNote, 'conn')}
                        className="text-xs font-mono text-[#0d9467] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'conn' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'conn' ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={connectionNote}
                    placeholder="Click 'Generate LinkedIn Drafts' to create an invitation note under 300 characters..."
                    onChange={(e) => setConnectionNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/10 bg-white text-xs sm:text-sm text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>

                {/* 2. First Follow-up */}
                <div className="p-4 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase font-bold text-[#0d1c15]">
                      Post-Connection Follow-up
                    </span>
                    {followUp && (
                      <button
                        type="button"
                        onClick={() => handleCopy(followUp, 'f1')}
                        className="text-xs font-mono text-[#0d9467] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'f1' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'f1' ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={followUp}
                    placeholder="Value-first message sent once the prospect accepts..."
                    onChange={(e) => setFollowUp(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/10 bg-white text-xs sm:text-sm text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>

                {/* 3. Second Follow-up (Optional) */}
                <div className="p-4 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase font-bold text-[#73827a]">
                      Second Follow-up (Optional)
                    </span>
                    {secondFollowUp && (
                      <button
                        type="button"
                        onClick={() => handleCopy(secondFollowUp, 'f2')}
                        className="text-xs font-mono text-[#0d9467] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'f2' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'f2' ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={secondFollowUp}
                    placeholder="Short check-in after 5-7 days..."
                    onChange={(e) => setSecondFollowUp(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/10 bg-white text-xs sm:text-sm text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] font-mono text-[#73827a] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0d9467]" />
                  <span>Manual dispatch only — LinkedIn credentials are never accessed.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAllDrafts}
                    className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5 text-[#00e599]" />
                    <span>Save Drafts</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
