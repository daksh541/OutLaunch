import React, { useState } from 'react';
import { UserCheck, CheckCircle2, Edit3, Linkedin, Mail, ArrowRight, ShieldCheck, Sparkles, Check, AlertCircle, RefreshCw } from 'lucide-react';

const TASKS = [
  {
    id: 'task-1',
    name: 'Sarah Jenkins',
    title: 'VP of Growth',
    company: 'Hyperflow AI',
    avatar: 'SJ',
    channel: 'Email + LinkedIn',
    email: 'sarah@hyperflow.ai',
    linkedin: 'linkedin.com/in/sarah-jenkins-growth',
    trigger: 'Series A announced + hiring 4 SDRs',
    subject: 'Quick question about Hyperflow\'s outbound pod scaling',
    body: 'Hi Sarah, noticed you\'re actively onboarding 4 new SDRs following your Series A round. Most growth leaders we talk with find that new reps lose 15+ hours each week researching prospect tech stacks before writing a single tailored email.\n\nWe built Explee to automate that research and draft high-conviction messages while keeping your team in full control with 1-click human approval.\n\nOpen to a 5-minute look at how this cuts ramp time?',
  },
  {
    id: 'task-2',
    name: 'David Vance',
    title: 'VP Revenue Operations',
    company: 'Kinetix Cloud',
    avatar: 'DV',
    channel: 'Cold Email',
    email: 'david@kinetix.com',
    linkedin: 'linkedin.com/in/david-vance-revops',
    trigger: 'Recent migration from HubSpot to Salesforce CRM',
    subject: 'Idea on reducing duplicate research during Kinetix\'s CRM shift',
    body: 'Hi David, saw Kinetix recently transitioned your sales infrastructure to Salesforce. Often during a migration, outbound data enrichment gets fragmented and reps spend more time verifying contacts than booking demos.\n\nExplee integrates directly with your CRM to verify deliverability and ensure only clean, research-backed prospects enter your reps\' queues.\n\nWould it make sense to share a quick benchmark report for cloud software?',
  },
  {
    id: 'task-3',
    name: 'Amara Lin',
    title: 'Chief Commercial Officer',
    company: 'Prism Analytics',
    avatar: 'AL',
    channel: 'LinkedIn Touchpoint',
    email: 'amara@prismdata.co',
    linkedin: 'linkedin.com/in/amara-lin-prism',
    trigger: 'Speaker at SaaStr Annual 2026 on B2B expansion',
    subject: 'Loved your keynote on mid-market outbound economics',
    body: 'Hi Amara, your keynote at SaaStr on lowering customer acquisition costs through personalized sales touchpoints was spot on. Our team built an AI workspace specifically for sales leaders looking to scale personalized outreach without hiring an army of SDRs.\n\nThought this would resonate with Prism\'s European growth goals. Open to connecting here on LinkedIn?',
  }
];

export default function HumanApprovalSection() {
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [taskStatuses, setTaskStatuses] = useState({
    'task-1': 'ready', // 'ready', 'approved', 'completed'
    'task-2': 'ready',
    'task-3': 'ready'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState('');

  const currentTask = TASKS[selectedTaskIndex];
  const currentStatus = taskStatuses[currentTask.id] || 'ready';

  const handleApprove = () => {
    setTaskStatuses((prev) => ({
      ...prev,
      [currentTask.id]: 'approved'
    }));
    setIsEditing(false);
  };

  const handleComplete = () => {
    setTaskStatuses((prev) => ({
      ...prev,
      [currentTask.id]: 'completed'
    }));
    setIsEditing(false);
  };

  const handleReset = () => {
    setTaskStatuses((prev) => ({
      ...prev,
      [currentTask.id]: 'ready'
    }));
    setIsEditing(false);
  };

  const startEdit = () => {
    setEditedBody(currentTask.body);
    setIsEditing(true);
  };

  return (
    <section id="human-in-the-loop" className="py-20 md:py-28 bg-[#edf2ec]/50 border-y border-[#0d1c15]/08 relative">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Section Headline */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#dbe5da] text-xs font-mono text-[#0d9467] font-semibold uppercase tracking-wider mb-3 shadow-2xs">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Taskaway-Inspired Human-in-the-Loop</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-[#0d1c15] tracking-tight leading-[1.12]">
            AI prepares the outreach.{' '}
            <span className="text-[#0d9467] italic font-editorial font-normal">
              You stay in control.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#4a5851] max-w-2xl mx-auto leading-relaxed">
            Nothing gets sent without your eyes on it. Review prepared drafts, tweak personalized angles in one click, or approve entire batches in seconds.
          </p>
        </div>

        {/* Interactive Workspace Panel */}
        <div className="bg-white rounded-2xl md:rounded-3xl border border-[#0d1c15]/10 shadow-[0_16px_50px_rgba(13,28,21,0.06)] overflow-hidden">
          
          {/* Header Bar */}
          <div className="px-6 py-4 bg-[#fcfbf9] border-b border-[#0d1c15]/08 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e599]" />
              <span className="font-mono text-xs font-bold text-[#0d1c15] uppercase tracking-wider">
                Approval Queue ({Object.values(taskStatuses).filter(s => s === 'ready').length} Pending Review)
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#5a6962]">
              <ShieldCheck className="w-4 h-4 text-[#0d9467]" />
              <span>Safety policy: Zero unapproved emails dispatched</span>
            </div>
          </div>

          {/* Main Grid: Left Task Selector, Right Detail View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#0d1c15]/08">
            
            {/* Left 4 cols: Task List */}
            <div className="lg:col-span-4 p-4 sm:p-5 space-y-2.5 bg-[#fcfbf9]/60">
              <div className="text-xs font-mono uppercase tracking-wider text-[#73827a] font-bold px-2 mb-2">
                Prepared Contacts
              </div>

              {TASKS.map((task, idx) => {
                const status = taskStatuses[task.id];
                const isSelected = selectedTaskIndex === idx;

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      setSelectedTaskIndex(idx);
                      setIsEditing(false);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-white border-[#0d9467] shadow-sm ring-1 ring-[#0d9467]/20'
                        : 'bg-white/70 hover:bg-white border-[#0d1c15]/08 hover:border-[#0d1c15]/15'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#edf2ec] text-[#0d9467] font-bold text-xs flex items-center justify-center shrink-0">
                        {task.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#0d1c15] truncate">
                          {task.name}
                        </div>
                        <div className="text-xs text-[#5a6962] truncate">
                          {task.company}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {status === 'completed' ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#edf2ec] text-[#0d9467] font-mono text-[10px] font-bold border border-[#dbe5da]">
                          COMPLETED
                        </span>
                      ) : status === 'approved' ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#00e599]/15 text-[#0d9467] font-mono text-[10px] font-bold border border-[#00e599]/30">
                          APPROVED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-[#fff7ed] text-[#c2410c] font-mono text-[10px] font-bold border border-[#ffedd5]">
                          REVIEW
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              <div className="p-3 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs text-[#4a5851] mt-4 leading-relaxed">
                <span className="font-semibold text-[#0d1c15] block mb-0.5">💡 Interactive Demonstration:</span>
                Try clicking <strong>Approve email</strong> or <strong>Edit message</strong> on the right to see the live status transition.
              </div>
            </div>

            {/* Right 8 cols: Active Task Review Interface */}
            <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between bg-white">
              <div>
                {/* Contact Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-[#0d1c15]/08">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold font-display text-[#0d1c15]">
                        {currentTask.name}
                      </h3>
                      <span className="text-sm text-[#5a6962]">
                        · {currentTask.title} at <strong>{currentTask.company}</strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#5a6962] font-mono">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-[#0d9467]" />
                        {currentTask.email}
                      </span>
                      <span>·</span>
                      <a
                        href={`https://${currentTask.linkedin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[#0077b5] hover:underline"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                        Open LinkedIn Profile
                      </a>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {currentStatus === 'completed' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#edf2ec] text-[#0d9467] font-mono text-xs font-semibold border border-[#dbe5da]">
                        <Check className="w-3.5 h-3.5" /> Task Completed
                      </span>
                    ) : currentStatus === 'approved' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00e599]/20 text-[#0d9467] font-mono text-xs font-semibold border border-[#00e599]/40">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved · Queued for 9:15 AM
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff7ed] text-[#c2410c] font-mono text-xs font-semibold border border-[#ffedd5]">
                        <Sparkles className="w-3.5 h-3.5" /> Message prepared · Ready for review
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Research Justification */}
                <div className="p-3.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 mb-5 text-xs leading-relaxed">
                  <div className="font-mono text-[10px] uppercase font-bold text-[#0d9467] mb-0.5">
                    Why this angle was generated:
                  </div>
                  <p className="text-[#4a5851]">
                    {currentTask.trigger}. The draft connects their immediate scaling bottleneck to your platform's core capability without sounding like an automated pitch.
                  </p>
                </div>

                {/* Message Editor / Preview */}
                <div className="space-y-3">
                  <div className="text-xs font-mono font-semibold text-[#5a6962] flex items-center justify-between">
                    <span>Subject: {currentTask.subject}</span>
                    <span className="text-[#0d9467]">{currentTask.channel}</span>
                  </div>

                  {isEditing ? (
                    <textarea
                      rows={6}
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      className="w-full p-4 rounded-xl border border-[#0d9467] bg-[#fcfbf9] text-sm text-[#0d1c15] leading-relaxed outline-none focus:ring-2 focus:ring-[#0d9467]/20 font-sans"
                    />
                  ) : (
                    <div className="p-4 sm:p-5 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-sm text-[#0d1c15] leading-relaxed whitespace-pre-line font-sans">
                      {editedBody || currentTask.body}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="mt-6 pt-5 border-t border-[#0d1c15]/08 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {currentStatus !== 'ready' && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-[#5a6962] hover:text-[#0d1c15] hover:bg-[#edf2ec] transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Reset Demo
                    </button>
                  )}

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={startEdit}
                      className="px-3.5 py-2 rounded-xl border border-[#0d1c15]/15 hover:bg-[#fcfbf9] text-xs font-semibold text-[#0d1c15] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#5a6962]" /> Edit Message
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-2 rounded-xl bg-[#0d1c15] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Save Changes
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="px-4 py-2 rounded-xl border border-[#0d1c15]/15 hover:bg-[#fcfbf9] text-xs font-semibold text-[#0d1c15] transition-colors cursor-pointer"
                  >
                    Mark Task Complete
                  </button>

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={currentStatus === 'approved'}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm inline-flex items-center gap-1.5 ${
                      currentStatus === 'approved'
                        ? 'bg-[#edf2ec] text-[#0d9467] border border-[#dbe5da] cursor-default'
                        : 'bg-[#0d9467] hover:bg-[#0a7854] text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{currentStatus === 'approved' ? 'Approved ✓' : 'Approve Email'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
