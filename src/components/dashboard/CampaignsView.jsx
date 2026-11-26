import React, { useState } from 'react';
import { Send, Plus, Pause, Play, Users, Mail, Linkedin, ArrowUpRight, CheckCircle2, Clock, X, Sparkles, AlertCircle, Edit2, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import CampaignReviewModal from './CampaignReviewModal';

export default function CampaignsView({
  campaigns = [],
  prospects = [],
  sequenceSteps = [],
  senderSettings = null,
  onAddCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onToggleStatus,
  onNavigate,
  isLoading = false,
  error = null
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [reviewCampaign, setReviewCampaign] = useState(null);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    audience: '',
    status: 'Draft',
    schedule: 'Mon–Fri, 9:00 AM – 4:30 PM EST',
    channels: ['Email', 'LinkedIn'],
    dailyLimit: 35
  });

  const [editForm, setEditForm] = useState({
    name: '',
    audience: '',
    status: 'Active',
    schedule: 'Mon–Fri, 9:00 AM – 4:30 PM EST',
    dailyLimit: 35
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newCampaign.name) return;

    if (onAddCampaign) {
      // By default new campaigns start in Draft status and require explicit review
      await onAddCampaign({
        ...newCampaign,
        status: 'Draft'
      });
    }

    setNewCampaign({
      name: '',
      audience: '',
      status: 'Draft',
      schedule: 'Mon–Fri, 9:00 AM – 4:30 PM EST',
      channels: ['Email', 'LinkedIn'],
      dailyLimit: 35
    });
    setIsCreateModalOpen(false);
  };

  const handleStartEdit = (camp, e) => {
    if (e) e.stopPropagation();
    setEditingCampaign(camp);
    setEditForm({
      name: camp.name || '',
      audience: camp.audience || '',
      status: camp.status || 'Active',
      schedule: camp.schedule || 'Mon–Fri, 9:00 AM – 4:30 PM EST'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingCampaign || !editForm.name) return;

    if (onUpdateCampaign) {
      await onUpdateCampaign(editingCampaign.id, editForm);
    }

    setIsEditModalOpen(false);
    setEditingCampaign(null);
  };

  const handleDelete = async (campaignId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this campaign? All enrolled lead links will also be removed.')) return;
    setDeletingId(campaignId);
    try {
      if (onDeleteCampaign) {
        await onDeleteCampaign(campaignId);
      }
    } finally {
      setDeletingId(null);
    }
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

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Campaigns Grid */}
      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-[#0d1c15]/08 shadow-sm">
          <Loader2 className="w-8 h-8 text-[#0d9467] animate-spin mb-3" />
          <p className="text-sm font-mono text-[#5a6962]">Loading campaigns from Supabase...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-[#0d1c15]/08 shadow-sm">
          <Send className="w-12 h-12 text-[#73827a]/40 mb-3" />
          <h3 className="font-display font-bold text-lg text-[#0d1c15]">No campaigns created yet</h3>
          <p className="text-sm text-[#5a6962] max-w-sm mt-1">
            Create your first outreach campaign to start sequencing contacts and tracking conversions.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-[#0d1c15] text-white text-xs font-semibold cursor-pointer"
          >
            Create Campaign
          </button>
        </div>
      ) : (
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

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold shrink-0 border ${
                      c.status === 'Active'
                        ? 'bg-[#00e599]/15 text-[#0d9467] border-[#00e599]/30'
                        : 'bg-[#f2efe9] text-[#73827a] border-[#0d1c15]/10'
                    }`}>
                      {c.status}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleStartEdit(c, e)}
                      title="Edit campaign"
                      className="p-1 rounded-lg text-[#5a6962] hover:text-[#0d1c15] hover:bg-[#edf2ec]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === c.id}
                      onClick={(e) => handleDelete(c.id, e)}
                      title="Delete campaign"
                      className="p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-4 gap-2 my-5 text-center">
                  <div className="p-2.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                    <span className="text-[10px] font-mono uppercase text-[#73827a] block">Enrolled</span>
                    <span className="text-base font-bold text-[#0d1c15] font-display">{c.prospectsCount || 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                    <span className="text-[10px] font-mono uppercase text-[#73827a] block">Sent</span>
                    <span className="text-base font-bold text-[#0d1c15] font-display">{c.emailsSent || 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/06">
                    <span className="text-[10px] font-mono uppercase text-[#73827a] block">Open %</span>
                    <span className="text-base font-bold text-[#0d1c15] font-display">{c.openRate || 0}%</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#edf2ec] border border-[#dbe5da]">
                    <span className="text-[10px] font-mono uppercase text-[#0d9467] font-bold block">Reply %</span>
                    <span className="text-base font-bold text-[#0d9467] font-display">{c.replyRate || 0}%</span>
                  </div>
                </div>

                {/* Channels & Schedule */}
                <div className="space-y-1.5 text-xs font-mono text-[#5a6962]">
                  <div className="flex items-center gap-2">
                    <span>Channels:</span>
                    <div className="flex items-center gap-1.5 text-[#0d1c15]">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f2efe9] text-[11px]">
                        <Mail className="w-3 h-3 text-[#0d9467]" /> Email
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f2efe9] text-[11px]">
                        <Linkedin className="w-3 h-3 text-[#0077b5]" /> LinkedIn (Manual)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Schedule:</span>
                    <span className="text-[#0d1c15]">{c.schedule || 'Mon–Fri 9am-5pm'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-5 mt-5 border-t border-[#0d1c15]/08">
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('sequences')}
                  className="text-xs font-semibold text-[#0d9467] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Edit Sequences</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  {c.status === 'Draft' || c.status === 'Scheduled' ? (
                    <button
                      type="button"
                      onClick={() => setReviewCampaign(c)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-xs font-mono font-medium text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00e599]" />
                      <span>Review &amp; Launch</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleStatus && onToggleStatus(c.id)}
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
                          <span>Resume</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                <strong>Multi-channel sync:</strong> Sequences coordinate emails with LinkedIn connection notes. LinkedIn tasks require manual user approval and review.
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

      {/* Edit Campaign Modal */}
      {isEditModalOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-camp-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#0d1c15]/10 text-[#0d1c15] animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d1c15]/08">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#0d9467]" />
                <h3 id="edit-camp-title" className="font-display font-bold text-xl text-[#0d1c15]">
                  Edit Campaign
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-[#73827a] hover:text-[#0d1c15]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Target Audience &amp; Description</label>
                <textarea
                  rows={3}
                  value={editForm.audience}
                  onChange={(e) => setEditForm({ ...editForm, audience: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Schedule</label>
                  <input
                    type="text"
                    value={editForm.schedule}
                    onChange={(e) => setEditForm({ ...editForm, schedule: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#0d1c15]/08">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a6962] hover:bg-[#edf2ec]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Launch Modal */}
      {reviewCampaign && (
        <CampaignReviewModal
          campaign={reviewCampaign}
          leads={prospects}
          sequenceSteps={sequenceSteps}
          senderSettings={senderSettings}
          onClose={() => setReviewCampaign(null)}
          onActivated={() => {
            if (onUpdateCampaign) {
              onUpdateCampaign(reviewCampaign.id, { status: 'Active' });
            }
          }}
        />
      )}

    </div>
  );
}
