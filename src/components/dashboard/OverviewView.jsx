import React from 'react';
import { Users, Send, MessageSquare, Calendar, TrendingUp, Sparkles, ArrowUpRight, CheckCircle2, Clock, ShieldCheck, Linkedin, Play, Pause } from 'lucide-react';

export default function OverviewView({ metrics, campaigns, prospects, linkedinTasks, onNavigate, onToggleCampaignStatus }) {
  const pendingTasks = linkedinTasks.filter(t => t.status === 'Pending');
  const upcomingTasks = pendingTasks.slice(0, 3);
  const activeCampaigns = campaigns.filter(c => c.status === 'Active');

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Welcome Banner */}
      <div className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#edf2ec] text-[#0d9467] font-mono text-xs font-semibold uppercase tracking-wider mb-2 border border-[#dbe5da]">
            <Sparkles className="w-3.5 h-3.5" /> Workspace Active
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
            Outreach Overview &amp; Pipeline
          </h1>
          <p className="text-sm text-[#4a5851] mt-1">
            {activeCampaigns.length} active {activeCampaigns.length === 1 ? 'campaign' : 'campaigns'} across Email &amp; LinkedIn. {pendingTasks.length} pending LinkedIn {pendingTasks.length === 1 ? 'task' : 'tasks'} ready for human review.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="px-4 py-2.5 rounded-xl border border-[#0d1c15]/15 hover:bg-[#fcfbf9] text-xs sm:text-sm font-semibold text-[#0d1c15] transition-colors cursor-pointer flex items-center gap-2"
          >
            <Linkedin className="w-4 h-4 text-[#0077b5]" />
            <span>Review Tasks ({upcomingTasks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('leads')}
            className="px-4 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Users className="w-4 h-4 text-[#00e599]" />
            <span>Explore Leads</span>
          </button>
        </div>
      </div>

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-mono uppercase text-[#73827a] font-bold">Total Prospects</span>
          <div className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] mt-2 tabular-nums">
            {metrics.totalProspects.toLocaleString()}
          </div>
          <span className="text-[11px] font-mono text-[#0d9467] mt-1.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +140 this week
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-mono uppercase text-[#73827a] font-bold">Active Campaigns</span>
          <div className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] mt-2 tabular-nums">
            {campaigns.filter(c => c.status === 'Active').length}
          </div>
          <span className="text-[11px] font-mono text-[#5a6962] mt-1.5">
            4 sequences loaded
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-mono uppercase text-[#73827a] font-bold">Emails Sent</span>
          <div className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] mt-2 tabular-nums">
            {metrics.emailsSent.toLocaleString()}
          </div>
          <span className="text-[11px] font-mono text-[#0d9467] mt-1.5">
            99.4% inbox placement
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-mono uppercase text-[#73827a] font-bold">Reply Rate</span>
          <div className="text-2xl sm:text-3xl font-display font-bold text-[#0d9467] mt-2 tabular-nums">
            {metrics.replyRate}%
          </div>
          <span className="text-[11px] font-mono text-[#0d9467] mt-1.5">
            3.8x industry avg
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-mono uppercase text-[#73827a] font-bold">Positive Replies</span>
          <div className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] mt-2 tabular-nums">
            {metrics.positiveReplies}
          </div>
          <span className="text-[11px] font-mono text-[#0d9467] mt-1.5">
            64.2% intent score
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-mono uppercase text-[#73827a] font-bold">Meetings Booked</span>
          <div className="text-2xl sm:text-3xl font-display font-bold text-[#0d9467] mt-2 tabular-nums">
            {metrics.meetingsBooked}
          </div>
          <span className="text-[11px] font-mono text-[#0d1c15] font-semibold mt-1.5">
            Google Meet synced ✓
          </span>
        </div>
      </div>

      {/* Main Grid: Performance Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left 8 cols: Campaign Performance Visual Chart */}
        <div className="lg:col-span-8 p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d1c15]/08">
              <div>
                <h3 className="font-display font-bold text-lg text-[#0d1c15]">
                  Weekly Outbound Volume &amp; Responses
                </h3>
                <p className="text-xs text-[#5a6962]">
                  Daily volume across verified primary mailboxes and synchronized LinkedIn touches
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0d1c15]" /> Sent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0d9467]" /> Replies
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#00e599]" /> Meetings
                </span>
              </div>
            </div>

            {/* Custom Bar Graph Visualization */}
            <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2">
              {metrics.chartData.map((d, idx) => {
                const heightPercent = Math.round((d.sent / 750) * 100);
                const replyPercent = Math.round((d.replied / 140) * 60);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[#0d1c15] text-white text-[10px] font-mono px-2 py-1 rounded shadow-md whitespace-nowrap z-20">
                      {d.sent} sent · {d.replied} replies · {d.meetings} mtgs
                    </div>

                    <div className="w-full max-w-[42px] h-44 flex items-end justify-center gap-1 bg-[#edf2ec]/40 rounded-t-lg p-1">
                      {/* Sent bar */}
                      <div
                        className="w-1/2 bg-[#0d1c15] rounded-t-sm transition-all duration-300 group-hover:bg-[#182e24]"
                        style={{ height: `${heightPercent}%` }}
                      />
                      {/* Replies bar */}
                      <div
                        className="w-1/2 bg-[#0d9467] rounded-t-sm transition-all duration-300 group-hover:bg-[#00e599]"
                        style={{ height: `${replyPercent}%` }}
                      />
                    </div>

                    <span className="text-[11px] font-mono text-[#73827a] font-medium">
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#0d1c15]/08 flex flex-wrap items-center justify-between text-xs font-mono text-[#5a6962]">
            <span>Average response latency: 2.4 hours</span>
            <span className="text-[#0d9467] font-semibold">Zero deliverability flags or bounces this week</span>
          </div>
        </div>

        {/* Right 4 cols: Upcoming Human LinkedIn Tasks */}
        <div className="lg:col-span-4 p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-[#fcfbf9] border border-[#0d1c15]/08 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#0d1c15]/08">
              <div className="flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-[#0077b5]" />
                <h3 className="font-display font-bold text-base text-[#0d1c15]">
                  LinkedIn Tasks
                </h3>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0077b5]/10 text-[#0077b5] font-bold">
                {upcomingTasks.length} Pending
              </span>
            </div>

            <div className="space-y-3">
              {upcomingTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl bg-white border border-[#0d1c15]/08 hover:border-[#0d9467]/30 transition-all text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-[#0d1c15] mb-1">
                    <span>{t.leadName}</span>
                    <span className="text-[10px] font-mono text-[#73827a]">{t.scheduledFor}</span>
                  </div>
                  <p className="text-[#5a6962] line-clamp-2 leading-relaxed font-sans mb-2.5">
                    "{t.draft}"
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#0d1c15]/06">
                    <span className="text-[10px] font-mono text-[#0077b5] font-semibold">
                      {t.taskType}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('tasks')}
                      className="text-[11px] font-semibold text-[#0d9467] hover:underline"
                    >
                      Review &amp; Copy →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="w-full mt-4 py-2.5 rounded-xl bg-[#edf2ec] hover:bg-[#dbe5da] text-xs font-semibold text-[#0d1c15] text-center transition-colors cursor-pointer"
          >
            View All LinkedIn Tasks
          </button>
        </div>

      </div>

      {/* Active Campaigns Table Widget */}
      <div className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d1c15]/08">
          <div>
            <h3 className="font-display font-bold text-lg text-[#0d1c15]">
              Active Campaigns
            </h3>
            <p className="text-xs text-[#5a6962]">
              Live multi-touch sequences operating with human approval queues
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('campaigns')}
            className="text-xs font-semibold text-[#0d9467] hover:underline flex items-center gap-1"
          >
            <span>Manage All Campaigns</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#edf2ec]/60 border-b border-[#0d1c15]/08 text-[#5a6962] font-mono text-[11px] uppercase">
                <th className="py-3 px-4 font-semibold">Campaign Name</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Enrolled</th>
                <th className="py-3 px-4 font-semibold">Open Rate</th>
                <th className="py-3 px-4 font-semibold">Reply Rate</th>
                <th className="py-3 px-4 font-semibold">Meetings</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0d1c15]/06">
              {activeCampaigns.map((c) => (
                <tr key={c.id} className="hover:bg-[#fcfbf9] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#0d1c15]">
                    <div>{c.name}</div>
                    <div className="text-xs text-[#5a6962] font-normal">{c.audience}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold border ${
                      c.status === 'Active'
                        ? 'bg-[#00e599]/15 text-[#0d9467] border-[#00e599]/30'
                        : 'bg-[#f2efe9] text-[#73827a] border-[#0d1c15]/10'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">{c.prospectsCount}</td>
                  <td className="py-3.5 px-4 font-mono font-medium text-[#0d1c15]">{c.openRate}%</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#0d9467]">{c.replyRate}%</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#0d1c15]">{c.meetingsBooked}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleCampaignStatus(c.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium border border-[#0d1c15]/10 hover:bg-[#edf2ec] text-[#0d1c15] transition-colors cursor-pointer"
                    >
                      {c.status === 'Active' ? 'Pause' : 'Resume'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
