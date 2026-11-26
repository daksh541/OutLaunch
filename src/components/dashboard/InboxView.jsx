import React, { useState, useRef, useEffect } from 'react';
import { Inbox, Search, Mail, Send, CheckCircle2, Clock, Calendar, Sparkles, UserCheck } from 'lucide-react';

export default function InboxView({ conversations, onReplyToConversation }) {
  const [selectedConvId, setSelectedConvId] = useState(conversations[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sentToast, setSentToast] = useState(null);
  const messagesEndRef = useRef(null);

  const currentConv = conversations.find(c => c.id === selectedConvId) || conversations[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConv?.history]);

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.leadName.toLowerCase().includes(q) || c.leadRole.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q);
  });

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !currentConv) return;

    const textToSend = replyText.trim();
    onReplyToConversation(currentConv.id, {
      sender: 'You (Explee Workspace)',
      time: 'Just now',
      text: textToSend
    });
    setReplyText('');
    setSentToast(`Reply successfully dispatched to ${currentConv.leadName}`);
    setTimeout(() => {
      setSentToast(null);
    }, 4000);
  };

  const handleUseAiSuggestion = () => {
    if (currentConv?.suggestedReply) {
      setReplyText(currentConv.suggestedReply);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
          Unified Outbound Inbox
        </h1>
        <p className="text-sm text-[#4a5851] mt-0.5">
          Prospect replies, conversation history, and AI suggested response drafts
        </p>
      </div>

      {/* Main Inbox Workspace Grid */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#0d1c15]/08 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] divide-y lg:divide-y-0 lg:divide-x divide-[#0d1c15]/08">
        
        {/* Left Column: Conversation List (4 cols) */}
        <div className="lg:col-span-4 p-4 sm:p-5 flex flex-col justify-between bg-[#fcfbf9]/60">
          <div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#0d1c15]/10 bg-white text-[#0d1c15] placeholder-[#73827a] outline-none focus:border-[#0d9467]"
              />
            </div>

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
                      <div className="font-semibold text-xs text-[#0d1c15] flex items-center gap-1.5">
                        {c.unread && <span className="w-2 h-2 rounded-full bg-[#00e599]" />}
                        <span>{c.leadName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#73827a]">{c.lastMessageTime}</span>
                    </div>

                    <div className="text-xs text-[#5a6962] font-medium truncate mb-1">
                      {c.subject}
                    </div>

                    <p className="text-[11px] text-[#73827a] line-clamp-1">
                      {c.snippet}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] font-mono text-[10px] font-bold border border-[#dbe5da]">
                        {c.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#0d1c15]/08 text-[11px] font-mono text-[#5a6962] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0d9467]" />
            <span>2-way email sync active</span>
          </div>
        </div>

        {/* Right Column: Conversation Thread (8 cols) */}
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
                    {currentConv.leadName} · {currentConv.leadRole} ({currentConv.leadEmail})
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-[#00e599]/15 text-[#0d9467] font-mono text-xs font-bold border border-[#00e599]/30 self-start sm:self-auto">
                  {currentConv.status}
                </span>
              </div>

              {/* Message Transcript */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                {currentConv.history.map((msg, idx) => {
                  const isUser = msg.sender.includes('You');

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
                        <span>{msg.time}</span>
                      </div>
                      <p className="whitespace-pre-line font-sans">{msg.text}</p>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* AI Suggested Response Ribbon & Composer */}
            <div className="mt-6 pt-4 border-t border-[#0d1c15]/08 space-y-3">
              {sentToast && (
                <div className="p-2.5 rounded-xl bg-[#edf2ec] border border-[#00e599]/40 text-xs text-[#0d9467] font-semibold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-[#0d9467] shrink-0" />
                  <span>{sentToast}</span>
                </div>
              )}

              {currentConv.suggestedReply && (
                <div className="p-3 rounded-xl bg-[#edf2ec] border border-[#dbe5da] flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#0d1c15] min-w-0">
                    <Sparkles className="w-4 h-4 text-[#0d9467] shrink-0" />
                    <span className="truncate">
                      <strong>AI Suggestion:</strong> "{currentConv.suggestedReply}"
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseAiSuggestion}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#0d1c15]/10 text-xs font-semibold text-[#0d1c15] hover:bg-[#fcfbf9] shrink-0 cursor-pointer"
                  >
                    Insert Draft
                  </button>
                </div>
              )}

              <form onSubmit={handleSendReply} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Reply to ${currentConv.leadName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-xs sm:text-sm text-[#0d1c15] outline-none focus:border-[#0d9467] font-medium"
                />
                <button
                  type="submit"
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5 text-[#00e599]" />
                </button>
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
