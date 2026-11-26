import React, { useState } from 'react';
import { Send, Plus, Pause, Play, Users, Mail, Linkedin, ArrowUpRight, CheckCircle2, Clock, X, Sparkles, AlertCircle } from 'lucide-react';

export default function CampaignsView({ campaigns, onAddCampaign, onToggleStatus, onNavigate }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    audience: '',
    schedule: 'Mon–Fri, 9:00 AM – 4:30 PM EST',
    channels: ['Email', 'LinkedIn']
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newCampaign.name) return;

    const created = {
      id: `camp-${Date.now()}`,
      name: newCampaign.name,
      status: 'Active',
      audience: newCampaign.audience || 'Target ICP decision-makers',
      prospectsCount: 150,
      emailsSent: 0,
      openRate: 0,
      replyRate: 0,
      positiveRate: 0,
      meetingsBooked: 0,
      channels: newCampaign.channels,
      createdAt: new Date().toISOString().split('T')[0],
      schedule: newCampaign.schedule
    };

    onAddCampaign(created);
    setNewCampaign({
      name: '',
      audience: '',
      schedule: 'Mon–Fri, 9:00 AM – 4:30 PM EST',
      channels: ['Email', 'LinkedIn']
    });
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
            Outreach Campaigns
          </h1>
          <p className="text-sm text-[#4a5851] mt-0.5">
            Orchestrate email sequences and synchronized LinkedIn touchpoints
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4 text-[#00e599]" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="p-6 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm flex flex-col justify-between hover:border-[#0d9467]/30 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#0d1c15]/08">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${c.status === 'Active' ? 'bg-[#00e599] animate-pulse' : 'bg-[#73827a]'}`} />
                    <h3 className="text-lg font-display font-bold text-[#0d1c15]">
                      {c.name}
                    </h3>
                  </div>
                  <p className="text-xs text-[#5a6962] mt-1 leading-relaxed">
                    {c.audience}
                  </p>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold shrink-0 border ${
                  c.status === 'Active'
                    ? 'bg-[#00e599]/15 text-[#0d9467] border-[#00e599]/30'
                    : 'bg-[#f2efe9] text-[#73827a] border-[#0d1c15]/10'
                }`}>
                  {c.status}
                </span>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-2 my-5 text-center">
                <div className="p-2.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                  <span className="text-[10px] font-mono uppercase text-[#73827a] block">Enrolled</span>
                  <span className="text-base font-bold text-[#0d1c15] font-display">{c.prospectsCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                  <span className="text-[10px] font-mono uppercase text-[#73827a] block">Sent</span>
                  <span className="text-base font-bold text-[#0d1c15] font-display">{c.emailsSent}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                  <span className="text-[10px] font-mono uppercase text-[#73827a] block">Open %</span>
                  <span className="text-base font-bold text-[#0d1c15] font-display">{c.openRate}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#edf2ec] border border-[#dbe5da]">
                  <span className="text-[10px] font-mono uppercase text-[#0d9467] font-bold block">Reply %</span>
                  <span className="text-base font-bold text-[#0d9467] font-display">{c.replyRate}%</span>
                </div>
              </div>

              {/* Channels & Schedule */}
              <div className="space-y-1.5 text-xs font-mono text-[#5a6962]">
                <div className="flex items-center gap-2">
                  <span>Channels:</span>
                  <div className="flex items-center gap-1 text-[#0d1c15]">
                    <span className="px-2 py-0.5 rounded bg-[#edf2ec] text-[11px] font-semibold">Email</span>
                    <span className="px-2 py-0.5 rounded bg-[#0077b5]/10 text-[#0077b5] text-[11px] font-semibold">LinkedIn</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[#73827a]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{c.schedule}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-4 border-t border-[#0d1c15]/08 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onNavigate('sequences')}
                className="text-xs font-semibold text-[#0d9467] hover:underline flex items-center gap-1"
              >
                <span>Edit Sequences</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleStatus(c.id)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#0d1c15]/15 hover:bg-[#fcfbf9] text-xs font-mono font-medium text-[#0d1c15] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {c.status === 'Active' ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-[#c2410c]" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-[#0d9467]" />
                      <span>Activate</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Campaign Modal */}
      {isCreateModalOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-camp-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#0d1c15]/10 text-[#0d1c15] animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d1c15]/08">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0d9467]" />
                <h3 id="create-camp-title" className="font-display font-bold text-xl text-[#0d1c15]">
                  Create Outreach Campaign
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-[#73827a] hover:text-[#0d1c15]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 FinTech CTOs &amp; Heads of Risk"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Target Audience &amp; Criteria</label>
                <textarea
                  rows={3}
                  placeholder="e.g. US &amp; European FinTech companies ($10M+ raised, hiring compliance SDRs)"
                  value={newCampaign.audience}
                  onChange={(e) => setNewCampaign({ ...newCampaign, audience: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Sending Schedule</label>
                <input
                  type="text"
                  value={newCampaign.schedule}
                  onChange={(e) => setNewCampaign({ ...newCampaign, schedule: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#edf2ec] border border-[#dbe5da] text-xs text-[#182e24]">
                <strong>Multi-channel sync:</strong> Sequences automatically coordinate cold emails with LinkedIn connection notes. If a lead replies to an email, their LinkedIn task is paused automatically.
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#0d1c15]/08">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a6962] hover:bg-[#edf2ec]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold cursor-pointer"
                >
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
