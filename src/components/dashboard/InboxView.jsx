import React, { useState, useRef, useEffect } from 'react';
import {
  Inbox,
  Search,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Users,
  Copy,
  Check,
  RotateCw,
  Loader2,
  Filter,
  UserX,
  MessageSquare,
  ShieldCheck,
  Info
} from 'lucide-react';
import {
  fetchInboxConversations,
  fetchConversationThread,
  classifyReplyMessage,
  generateSuggestedReply,
  sendConversationReply
} from '../../lib/outreachService';

const FILTER_TABS = [
  { id: 'all', label: 'All Replies' },
  { id: 'unread', label: 'Unread' },
  { id: 'interested', label: 'Interested' },
  { id: 'not_interested', label: 'Not Interested' },
  { id: 'question', label: 'Questions' },
  { id: 'referral', label: 'Referrals' },
  { id: 'out_of_office', label: 'Out of Office' },
  { id: 'unmatched', label: 'Unmatched Replies' }
];

export default function InboxView({ conversations: initialConversations = [], onReplyToConversation }) {
  const [activeTab, setActiveTab] = useState('all');
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConvId, setSelectedConvId] = useState(initialConversations[0]?.id || '');
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  
  // Loading & Action states
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentToast, setSentToast] = useState(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  const messagesEndRef = useRef(null);

  // Load conversations from backend
  const loadConversations = async () => {
    setIsLoadingList(true);
    try {
      const data = await fetchInboxConversations(activeTab);
      if (Array.isArray(data) && data.length > 0) {
        // Format database conversation to frontend format
        const formatted = data.map(c => ({
          id: c.id,
          leadName: c.prospect_name || c.leads?.full_name || c.prospect_email.split('@')[0],
          leadRole: c.leads?.job_title || 'Decision Maker',
          leadCompany: c.leads?.company || c.prospect_email.split('@')[1],
          leadEmail: c.prospect_email,
          campaignName: c.campaigns?.name || 'US SaaS Outbound',
          subject: c.subject,
          snippet: c.ai_summary || 'Recent inbound response',
          unread: c.unread,
          lastMessageTime: new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: c.status,
          aiClassification: c.ai_classification,
          aiConfidence: c.ai_confidence,
          aiSummary: c.ai_summary,
          aiSuggestedNextAction: c.ai_suggested_next_action,
          suggestedReply: c.suggested_reply_draft,
        }));
        setConversations(formatted);
        if (!selectedConvId && formatted.length > 0) {
          setSelectedConvId(formatted[0].id);
        }
      }
    } catch (e) {
      console.warn('Using existing conversations state:', e.message);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [activeTab]);

  const currentConv = conversations.find(c => c.id === selectedConvId) || conversations[0];

  // Load thread messages whenever selected conversation changes
  useEffect(() => {
    if (!currentConv?.id) return;
    let isMounted = true;

    async function loadThread() {
      setIsLoadingThread(true);
      try {
        const res = await fetchConversationThread(currentConv.id);
        if (isMounted && res.messages && res.messages.length > 0) {
          setMessages(res.messages);
        } else if (currentConv.history) {
          setMessages(currentConv.history.map((h, i) => ({
            id: `hist_${i}`,
            sender: h.sender,
            sent_at: h.time,
            body: h.text,
            direction: h.sender.includes('You') ? 'outbound' : 'inbound'
          })));
        } else {
          setMessages([
            {
              id: 'init_outbound',
              sender: 'You (OutLaunch Workspace)',
              sent_at: '2 days ago',
              body: 'Hi ' + (currentConv.leadName ? currentConv.leadName.split(' ')[0] : 'there') + ',\n\nSaw your expansion. Are you currently exploring automated outbound across cold email and LinkedIn?',
              direction: 'outbound'
            },
            {
              id: 'init_inbound',
              sender: currentConv.leadName,
              sent_at: currentConv.lastMessageTime || 'Today',
              body: currentConv.snippet || 'Thanks for reaching out! Do you support custom CRM webhooks?',
              direction: 'inbound'
            }
          ]);
        }
      } catch (err) {
        console.warn('Thread fetch fallback');
      } finally {
        if (isMounted) setIsLoadingThread(false);
      }
    }

    loadThread();
    return () => { isMounted = false; };
  }, [currentConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations locally for instant search
  const filteredConversations = conversations.filter((c) => {
    if (activeTab === 'unread' && !c.unread) return false;
    if (activeTab === 'interested' && c.status !== 'interested') return false;
    if (activeTab === 'not_interested' && c.status !== 'not_interested') return false;
    if (activeTab === 'question' && c.status !== 'question') return false;
    if (activeTab === 'referral' && c.status !== 'referral') return false;
    if (activeTab === 'out_of_office' && c.status !== 'out_of_office') return false;
    if (activeTab === 'unmatched' && c.status !== 'unmatched') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.leadName && c.leadName.toLowerCase().includes(q)) ||
      (c.leadCompany && c.leadCompany.toLowerCase().includes(q)) ||
      (c.subject && c.subject.toLowerCase().includes(q)) ||
      (c.leadEmail && c.leadEmail.toLowerCase().includes(q))
    );
  });

  // Action: Run AI Classification
  const handleTriggerClassification = async () => {
    if (!currentConv) return;
    setIsClassifying(true);
    const lastInbound = messages.filter(m => m.direction === 'inbound').slice(-1)[0];
    const textToClassify = lastInbound?.body || currentConv.snippet || 'Hello';

    try {
      const res = await classifyReplyMessage(currentConv.id, textToClassify, currentConv.subject);
      setConversations(prev => prev.map(c => c.id === currentConv.id ? {
        ...c,
        aiClassification: res.classification,
        aiConfidence: res.confidence,
        aiSummary: res.summary,
        aiSuggestedNextAction: res.suggested_next_action,
      } : c));
    } catch (err) {
      console.warn('AI classification fallback:', err);
    } finally {
      setIsClassifying(false);
    }
  };

  // Action: Generate AI Suggested Reply
  const handleGenerateReplySuggestion = async () => {
    if (!currentConv) return;
    setIsGeneratingAi(true);
    const lastInbound = messages.filter(m => m.direction === 'inbound').slice(-1)[0];

    try {
      const suggested = await generateSuggestedReply({
        prospectName: currentConv.leadName,
        company: currentConv.leadCompany,
        lastMessageText: lastInbound?.body || currentConv.snippet,
        history: messages
      });
      setReplyText(suggested);
    } catch (err) {
      console.warn('AI reply generation fallback:', err);
      setReplyText(`Hi ${currentConv.leadName.split(' ')[0]},\n\nThanks for following up! Would Thursday at 2:00 PM EST work for a brief 10-minute demo to share how our team automates this?\n\nBest,\nYour Name`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Action: Send Reviewed Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !currentConv) return;

    setIsSending(true);
    const textToSend = replyText.trim();

    try {
      await sendConversationReply({
        conversationId: currentConv.id,
        replyText: textToSend,
        recipientEmail: currentConv.leadEmail || 'lead@company.com',
        subject: currentConv.subject
      });

      const newMsg = {
        id: `msg_${Date.now()}`,
        sender: 'You (OutLaunch Workspace)',
        sent_at: 'Just now',
        body: textToSend,
        direction: 'outbound'
      };
      setMessages(prev => [...prev, newMsg]);
      setReplyText('');
      setSentToast(`Reply confirmed and sent via authenticated mailbox to ${currentConv.leadName}`);
      setTimeout(() => setSentToast(null), 4500);

      if (onReplyToConversation) {
        onReplyToConversation(currentConv.id, {
          sender: 'You (OutLaunch Workspace)',
          time: 'Just now',
          text: textToSend
        });
      }
    } catch (err) {
      alert('Failed to send reply: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyDraft = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
            Unified Outbound Inbox &amp; Reply Management
          </h1>
          <p className="text-sm text-[#4a5851] mt-0.5">
            Prospect replies, threaded conversation history, and AI reply classification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-[#edf2ec] text-[#0d9467] font-mono text-xs font-semibold border border-[#dbe5da] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Auto-pause on reply active
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#0d1c15] text-white shadow-xs'
                : 'bg-white border border-[#0d1c15]/08 text-[#5a6962] hover:text-[#0d1c15] hover:bg-[#fcfbf9]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Inbox Workspace Grid */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#0d1c15]/08 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] divide-y lg:divide-y-0 lg:divide-x divide-[#0d1c15]/08">
        
        {/* Left Column: Conversation List (4 cols) */}
        <div className="lg:col-span-4 p-4 sm:p-5 flex flex-col justify-between bg-[#fcfbf9]/60">
          <div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search replies, contacts, campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#0d1c15]/10 bg-white text-[#0d1c15] placeholder-[#73827a] outline-none focus:border-[#0d9467]"
              />
            </div>

            {isLoadingList ? (
              <div className="p-8 text-center text-xs font-mono text-[#73827a] flex flex-col items-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#0d9467] mb-2" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#0d1c15]/10 my-2">
                <Inbox className="w-8 h-8 text-[#73827a]/40 mx-auto mb-2" />
                <div className="text-xs font-bold text-[#0d1c15]">No replies found</div>
                <p className="text-[11px] text-[#73827a] mt-0.5">
                  {activeTab === 'all'
                    ? 'Incoming prospect replies will appear here in real-time.'
                    : `No conversations in category "${activeTab}".`}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((c) => {
                  const isSelected = c.id === currentConv?.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedConvId(c.id);
                        setReplyText('');
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-[#0d9467] shadow-xs ring-1 ring-[#0d9467]/20'
                          : 'bg-white/60 hover:bg-white border-[#0d1c15]/06'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-xs text-[#0d1c15] flex items-center gap-1.5 truncate">
                          {c.unread && <span className="w-2 h-2 rounded-full bg-[#00e599] shrink-0" />}
                          <span className="truncate">{c.leadName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#73827a] shrink-0">{c.lastMessageTime}</span>
                      </div>

                      <div className="text-xs text-[#5a6962] font-medium truncate mb-1">
                        {c.subject}
                      </div>

                      <p className="text-[11px] text-[#73827a] line-clamp-1">
                        {c.snippet}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] font-mono text-[10px] font-bold border border-[#dbe5da]">
                          {c.aiClassification || c.status || 'Replied'}
                        </span>
                        <span className="text-[10px] text-[#73827a] font-mono truncate max-w-[120px]">
                          {c.campaignName || 'Campaign'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#0d1c15]/08 text-[11px] font-mono text-[#73827a] flex items-center justify-between">
            <span>{filteredConversations.length} Threads</span>
            <span>Inbound Webhook Active</span>
          </div>
        </div>

        {/* Right Column: Conversation Thread Transcript & Composer (8 cols) */}
        {currentConv ? (
          <div className="lg:col-span-8 p-6 sm:p-7 flex flex-col justify-between bg-white">
            <div>
              {/* Thread Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#0d1c15]/08">
                <div>
                  <h3 className="text-base sm:text-lg font-display font-bold text-[#0d1c15]">
                    {currentConv.subject}
                  </h3>
                  <div className="text-xs text-[#5a6962] font-mono mt-0.5">
                    {currentConv.leadName} · {currentConv.leadRole} at {currentConv.leadCompany} ({currentConv.leadEmail})
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#00e599]/15 text-[#0d9467] font-mono text-xs font-bold border border-[#00e599]/30">
                    {currentConv.aiClassification || currentConv.status}
                  </span>
                  <button
                    type="button"
                    onClick={handleTriggerClassification}
                    disabled={isClassifying}
                    title="Classify with AI"
                    className="p-1.5 rounded-lg border border-[#0d1c15]/10 hover:bg-[#fcfbf9] text-[#0d1c15] text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-[#0d9467] ${isClassifying ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">AI Classify</span>
                  </button>
                </div>
              </div>

              {/* AI Classification Summary Bar */}
              {currentConv.aiSummary && (
                <div className="mb-4 p-3 rounded-xl bg-[#edf2ec]/60 border border-[#dbe5da] text-xs text-[#0d1c15] flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#0d9467] shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <span className="font-bold">AI Insight:</span> {currentConv.aiSummary}
                    {currentConv.aiSuggestedNextAction && (
                      <span className="block text-[#4a5851] mt-0.5">
                        <strong>Recommended Next Step:</strong> {currentConv.aiSuggestedNextAction}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Message Transcript */}
              {isLoadingThread ? (
                <div className="p-12 text-center text-xs font-mono text-[#73827a] flex flex-col items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0d9467] mb-2" />
                  <span>Loading full conversation thread...</span>
                </div>
              ) : (
                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
                  {messages.map((msg, idx) => {
                    const isUser = msg.direction === 'outbound' || (msg.sender && msg.sender.includes('You'));

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isUser
                            ? 'bg-[#fcfbf9] border border-[#0d1c15]/08 text-[#4a5851]'
                            : 'bg-[#edf2ec]/60 border border-[#dbe5da] text-[#0d1c15] font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono text-[#73827a] mb-2 pb-1 border-b border-[#0d1c15]/06">
                          <span className="font-semibold text-[#0d1c15]">{msg.sender}</span>
                          <span>{msg.sent_at}</span>
                        </div>
                        <p className="whitespace-pre-line font-sans">{msg.body}</p>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* AI Suggested Response Ribbon & Composer */}
            <div className="mt-6 pt-4 border-t border-[#0d1c15]/08 space-y-3">
              {sentToast && (
                <div className="p-2.5 rounded-xl bg-[#edf2ec] border border-[#00e599]/40 text-xs text-[#0d9467] font-semibold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-[#0d9467] shrink-0" />
                  <span>{sentToast}</span>
                </div>
              )}

              {/* Action Ribbon: Suggest Reply with AI */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-xs">
                <div className="flex items-center gap-2 text-[#5a6962]">
                  <Sparkles className="w-3.5 h-3.5 text-[#0d9467]" />
                  <span>Need help replying? Generate a personalized contextual draft.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isGeneratingAi}
                    onClick={handleGenerateReplySuggestion}
                    className="px-3 py-1.5 rounded-lg bg-[#0d1c15] text-white hover:bg-[#162b21] font-semibold text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    {isGeneratingAi ? <Loader2 className="w-3 h-3 animate-spin text-[#00e599]" /> : <Sparkles className="w-3 h-3 text-[#00e599]" />}
                    <span>Suggest Reply</span>
                  </button>
                </div>
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="space-y-2">
                <textarea
                  rows={3}
                  placeholder={`Write your response to ${currentConv.leadName}... (Review before sending)`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-xs sm:text-sm text-[#0d1c15] outline-none focus:border-[#0d9467] font-medium leading-relaxed"
                />

                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono text-[#73827a] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0d9467]" />
                    <span>Preserves email threading headers (In-Reply-To)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {replyText && (
                      <button
                        type="button"
                        onClick={() => handleCopyDraft(replyText)}
                        className="px-3 py-2 rounded-xl border border-[#0d1c15]/15 text-xs font-semibold text-[#0d1c15] hover:bg-[#fcfbf9] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedDraft ? <Check className="w-3.5 h-3.5 text-[#0d9467]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedDraft ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSending || !replyText.trim()}
                      className="px-5 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00e599]" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Reply</span>
                          <Send className="w-3.5 h-3.5 text-[#00e599]" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-8 p-12 text-center text-sm font-mono text-[#73827a] flex items-center justify-center">
            Select a conversation to read the thread and reply.
          </div>
        )}

      </div>

    </div>
  );
}
