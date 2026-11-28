import React, { useState } from 'react';
import { Linkedin, Copy, Check, ExternalLink, Clock, CheckCircle2, UserCheck, Calendar, Filter, Sparkles } from 'lucide-react';

export default function LinkedInTasksView({ tasks, onCompleteTask }) {
  const [copiedTaskId, setCopiedTaskId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'All') return true;
    return t.status === filterStatus;
  });

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedTaskId(id);
    setTimeout(() => setCopiedTaskId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
            LinkedIn Touchpoint Tasks
          </h1>
          <p className="text-sm text-[#4a5851] mt-0.5">
            Human-in-the-loop task manager. Review AI-crafted notes and copy directly into LinkedIn.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs font-mono">
          {['All', 'Pending', 'Completed'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#0d1c15] text-white font-bold'
                  : 'text-[#4a5851] hover:text-[#0d1c15]'
              }`}
            >
              {st} ({tasks.filter(t => st === 'All' ? true : t.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 rounded-2xl bg-white border border-[#0077b5]/20 shadow-xs flex items-center justify-between gap-3 text-xs leading-relaxed text-[#182e24]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0077b5]/10 text-[#0077b5] flex items-center justify-center shrink-0">
            <Linkedin className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#0d1c15]">LinkedIn Safe Workflow Guarantee:</span> We never scrape, automate headless browser logins, or trigger bot restrictions on your LinkedIn account. You review and paste tailored messages directly.
          </div>
        </div>
        <span className="hidden sm:inline-block font-mono text-[11px] text-[#0d9467] font-semibold bg-[#edf2ec] px-2.5 py-1 rounded-md border border-[#dbe5da] shrink-0">
          Max 15 Tasks / Day Recommended
        </span>
      </div>

      {/* Task Cards List */}
      <div className="space-y-4">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'Completed';

            return (
              <div
                key={task.id}
                className={`p-6 rounded-2xl sm:rounded-3xl border transition-all ${
                  isCompleted
                    ? 'bg-[#fcfbf9] border-[#0d1c15]/06 opacity-75'
                    : 'bg-white border-[#0d1c15]/10 shadow-sm hover:border-[#0d9467]/30'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#0d1c15]/08">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#edf2ec] text-[#0077b5] font-bold text-sm flex items-center justify-center shrink-0 border border-[#dbe5da]">
                      {task.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-base text-[#0d1c15]">{task.leadName}</span>
                        <span className="text-xs text-[#73827a]">· {task.leadTitle}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-[#5a6962] mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Scheduled: {task.scheduledFor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full font-mono text-xs font-bold border ${
                      isCompleted
                        ? 'bg-[#edf2ec] text-[#0d9467] border-[#dbe5da]'
                        : 'bg-[#0077b5]/10 text-[#0077b5] border-[#0077b5]/20'
                    }`}>
                      {task.taskType}
                    </span>

                    <a
                      href={task.leadLinkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#0d1c15]/15 hover:bg-[#edf2ec] text-xs font-semibold text-[#0077b5] transition-colors"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      <span>Open LinkedIn Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Message Draft Box */}
                <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-[#73827a]">
                    <span>AI-Generated Invitation Note</span>
                    <span>{task.characterCount} / 300 characters</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#0d1c15] leading-relaxed font-sans select-all">
                    "{task.draft}"
                  </p>
                </div>

                {/* Actions Ribbon */}
                <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleCopy(task.id, task.draft)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#0d1c15]/15 hover:bg-[#fcfbf9] text-xs font-semibold text-[#0d1c15] transition-colors cursor-pointer"
                  >
                    <div className="relative w-3.5 h-3.5">
                      <Copy
                        className={`w-3.5 h-3.5 text-[#5a6962] transition-all duration-200 absolute inset-0 ${
                          copiedTaskId === task.id ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
                        }`}
                      />
                      <Check
                        className={`w-3.5 h-3.5 text-[#0d9467] transition-all duration-200 absolute inset-0 ${
                          copiedTaskId === task.id ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                        }`}
                      />
                    </div>
                    <span className={copiedTaskId === task.id ? 'text-[#0d9467] font-bold' : ''}>
                      {copiedTaskId === task.id ? 'Copied to Clipboard!' : 'Copy Message Draft'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert(`Reminder scheduled for ${task.leadName} tomorrow 9 AM.`)}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-[#5a6962] hover:text-[#0d1c15] hover:bg-[#edf2ec] transition-colors cursor-pointer"
                    >
                      Schedule Reminder
                    </button>

                    <button
                      type="button"
                      onClick={() => onCompleteTask(task.id)}
                      disabled={isCompleted}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        isCompleted
                          ? 'bg-[#edf2ec] text-[#0d9467] border border-[#dbe5da] cursor-default'
                          : 'bg-[#0d9467] hover:bg-[#0a7854] text-white shadow-xs'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isCompleted ? 'Completed ✓' : 'Mark Task as Completed'}</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-sm font-mono text-[#73827a] bg-white rounded-3xl border border-dashed border-[#0d1c15]/15">
            No LinkedIn tasks found for filter "{filterStatus}".
          </div>
        )}
      </div>

    </div>
  );
}
