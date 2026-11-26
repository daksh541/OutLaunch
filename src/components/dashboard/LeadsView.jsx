import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Upload,
  CheckCircle2,
  Linkedin,
  Mail,
  ExternalLink,
  X,
  Sparkles,
  Building2,
  MapPin,
  Users,
  Copy,
  Check,
  ArrowRight,
  UserPlus,
  Phone,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import AiPersonalizationModal from './AiPersonalizationModal';

export default function LeadsView({
  prospects = [],
  userId,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  onImportLeads,
  isLoading = false,
  error = null
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('fitScore');
  const [selectedLead, setSelectedLead] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // AI Personalization Modal State
  const [aiModalLead, setAiModalLead] = useState(null);

  // New Lead Form State
  const [newLead, setNewLead] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    linkedin: '',
    website: '',
    location: '',
    notes: ''
  });

  // Edit Lead Form State
  const [editForm, setEditForm] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    linkedin: '',
    website: '',
    location: '',
    status: 'Researched',
    notes: ''
  });

  // CSV Import State
  const [csvText, setCsvText] = useState(
    'Name,Title,Company,Email,LinkedIn\nAlex Chen,VP Engineering,Voxel Labs,alex@voxellabs.io,linkedin.com/in/alex-chen\nSophie Taylor,Director of Growth,Acuity Flow,sophie@acuityflow.com,linkedin.com/in/sophie-taylor'
  );

  // Filter & Sort Logic
  const filteredLeads = (prospects || []).filter((lead) => {
    if (statusFilter !== 'All' && lead.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        (lead.name && lead.name.toLowerCase().includes(q)) ||
        (lead.company && lead.company.toLowerCase().includes(q)) ||
        (lead.title && lead.title.toLowerCase().includes(q)) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        (lead.location && lead.location.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'fitScore') return (b.fitScore || 0) - (a.fitScore || 0);
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'company') return (a.company || '').localeCompare(b.company || '');
    return 0;
  });

  const handleCreateLeadSubmit = async (e) => {
    e.preventDefault();
    if (!newLead.name || !newLead.email) return;

    if (onAddLead) {
      await onAddLead(newLead);
    }

    setNewLead({
      name: '',
      title: '',
      company: '',
      email: '',
      linkedin: '',
      website: '',
      location: '',
      notes: ''
    });
    setIsAddModalOpen(false);
  };

  const handleStartEdit = (lead, e) => {
    if (e) e.stopPropagation();
    setEditingLead(lead);
    setEditForm({
      name: lead.name || '',
      title: lead.title || '',
      company: lead.company || '',
      email: lead.email || '',
      linkedin: lead.linkedin || lead.linkedin_url || '',
      website: lead.website || '',
      location: lead.location || '',
      status: lead.status || 'Researched',
      notes: (lead.signals && lead.signals[0]) || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingLead || !editForm.name || !editForm.email) return;

    if (onUpdateLead) {
      await onUpdateLead(editingLead.id, editForm);
    }

    setIsEditModalOpen(false);
    setEditingLead(null);
  };

  const handleDelete = async (leadId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this prospect?')) return;
    setDeletingId(leadId);
    try {
      if (onDeleteLead) {
        await onDeleteLead(leadId);
      }
      if (selectedLead?.id === leadId) {
        setSelectedLead(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleCsvImportSubmit = async (e) => {
    e.preventDefault();
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) return;

    const newEntries = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length >= 4 && parts[3]) {
        newEntries.push({
          name: parts[0] || 'Unknown',
          title: parts[1] || 'Decision Maker',
          company: parts[2] || 'Enterprise Target',
          email: parts[3],
          linkedin: parts[4] || '',
          location: 'United States',
          status: 'Researched',
          notes: 'Imported via CSV batch upload',
        });
      }
    }

    if (newEntries.length > 0 && onImportLeads) {
      await onImportLeads(newEntries);
    }
    setIsCsvModalOpen(false);
  };

  const handleCopyDraft = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
            Prospects &amp; Decision Makers
          </h1>
          <p className="text-sm text-[#4a5851] mt-0.5">
            {filteredLeads.length} prospects identified across active outbound cadences
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-[#0d1c15]/15 hover:bg-white text-xs sm:text-sm font-semibold text-[#0d1c15] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Upload className="w-4 h-4 text-[#5a6962]" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#00e599]" />
            <span>Add Prospect</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#0d1c15]/08 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#73827a] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, company, email, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-sm text-[#0d1c15] placeholder-[#73827a] outline-none focus:border-[#0d9467] font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-[#73827a] px-1">Status:</span>
            {['All', 'In Sequence', 'Replied', 'Meeting Booked', 'Researched'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === s
                    ? 'bg-[#0d1c15] text-white font-bold'
                    : 'bg-[#edf2ec] text-[#4a5851] hover:text-[#0d1c15]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 text-xs font-mono pl-2 border-l border-[#0d1c15]/10">
            <span className="text-[#73827a]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#edf2ec] text-[#0d1c15] font-medium py-1.5 px-2 rounded-lg outline-none cursor-pointer border border-[#dbe5da]"
            >
              <option value="fitScore">Fit Score (High-to-Low)</option>
              <option value="name">Name (A–Z)</option>
              <option value="company">Company (A–Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Leads Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#0d1c15]/08 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-[#0d9467] animate-spin mb-3" />
            <p className="text-sm font-mono text-[#5a6962]">Loading prospects from Supabase...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Users className="w-12 h-12 text-[#73827a]/40 mb-3" />
            <h3 className="font-display font-bold text-lg text-[#0d1c15]">No prospects found</h3>
            <p className="text-sm text-[#5a6962] max-w-sm mt-1">
              {searchQuery || statusFilter !== 'All'
                ? 'Try adjusting your search terms or filters.'
                : 'Get started by adding your first prospect or importing from CSV.'}
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0d1c15] text-white text-xs font-semibold cursor-pointer"
            >
              Add Prospect
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#edf2ec]/60 border-b border-[#0d1c15]/08 text-[#5a6962] font-mono text-[11px] uppercase">
                  <th className="py-3 px-4 font-semibold">Prospect</th>
                  <th className="py-3 px-4 font-semibold">Company &amp; Industry</th>
                  <th className="py-3 px-4 font-semibold">Contact Details</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Fit Score</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0d1c15]/06">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-[#fcfbf9] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#edf2ec] text-[#0d9467] font-bold text-xs flex items-center justify-center shrink-0 border border-[#dbe5da]">
                          {(lead.name || 'U').split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-[#0d1c15] group-hover:text-[#0d9467] transition-colors">
                            {lead.name}
                          </div>
                          <div className="text-xs text-[#5a6962] font-normal">{lead.title}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#0d1c15]">{lead.company}</div>
                      <div className="text-xs text-[#73827a]">{lead.industry || 'B2B'} · {lead.location}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-[#0d9467]">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{lead.email}</span>
                      </div>
                      {lead.linkedin && (
                        <a
                          href={lead.linkedin.startsWith('http') ? lead.linkedin : `https://${lead.linkedin}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#0077b5] hover:underline mt-0.5"
                        >
                          <Linkedin className="w-3 h-3" />
                          <span>Profile</span>
                        </a>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold border ${
                        lead.status === 'Meeting Booked'
                          ? 'bg-[#00e599]/20 text-[#0d9467] border-[#00e599]/40'
                          : lead.status === 'Replied'
                          ? 'bg-[#edf2ec] text-[#0d9467] border-[#dbe5da]'
                          : lead.status === 'In Sequence'
                          ? 'bg-[#f2efe9] text-[#182e24] border-[#0d1c15]/10'
                          : 'bg-white text-[#73827a] border-[#0d1c15]/10'
                      }`}>
                        {lead.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#0d9467]">
                      {lead.fitScore || 95}%
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Research with AI Action Button */}
                        <button
                          type="button"
                          onClick={() => setAiModalLead(lead)}
                          title="Research with AI"
                          className="px-2.5 py-1 rounded-lg bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-[#00e599]" />
                          <span>Research with AI</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(lead, e)}
                          title="Edit prospect"
                          className="p-1.5 rounded-lg text-[#5a6962] hover:text-[#0d1c15] hover:bg-[#edf2ec] transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === lead.id}
                          onClick={(e) => handleDelete(lead.id, e)}
                          title="Delete prospect"
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          className="text-xs font-semibold text-[#0d9467] group-hover:underline flex items-center gap-1 pl-1"
                        >
                          <span>Dossier</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Dossier Drawer */}
      {selectedLead && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedLead(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dossier-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[560px] bg-white h-full shadow-2xl border-l border-[#0d1c15]/10 flex flex-col justify-between overflow-y-auto animate-slideLeft text-[#0d1c15]"
          >
            <div>
              {/* Drawer Top Header */}
              <div className="p-6 border-b border-[#0d1c15]/08 flex items-start justify-between gap-4 bg-[#fcfbf9]">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#0d1c15] text-[#00e599] font-bold text-base flex items-center justify-center shrink-0">
                    {(selectedLead.name || 'U').split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h2 id="dossier-title" className="font-display font-bold text-xl text-[#0d1c15]">
                      {selectedLead.name}
                    </h2>
                    <p className="text-xs text-[#5a6962] mt-0.5">
                      {selectedLead.title} at <strong>{selectedLead.company}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleStartEdit(selectedLead, e)}
                    className="p-1.5 rounded-lg text-[#5a6962] hover:text-[#0d1c15] hover:bg-[#edf2ec]"
                    title="Edit lead"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="p-1.5 rounded-lg text-[#73827a] hover:text-[#0d1c15] hover:bg-[#edf2ec]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Coordinates Ribbon */}
              <div className="px-6 py-3.5 bg-[#edf2ec]/50 border-b border-[#0d1c15]/08 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-[#0d9467] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{selectedLead.email}</span>
                </div>
                {selectedLead.linkedin && (
                  <a
                    href={selectedLead.linkedin.startsWith('http') ? selectedLead.linkedin : `https://${selectedLead.linkedin}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[#0077b5] hover:underline"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    <span>Open Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-6">
                
                {/* AI Research Action Box inside Dossier */}
                <div className="p-4 rounded-2xl bg-[#0d1c15] text-white flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[#00e599] font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Research with AI</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">
                      Synthesize company context, role priorities, and draft personalized email + LinkedIn notes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAiModalLead(selectedLead);
                      setSelectedLead(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#00e599] hover:bg-[#00fbbc] text-black text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    Research with AI
                  </button>
                </div>

                {/* AI Research Signals */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#0d9467] font-bold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Company Signals &amp; Triggers</span>
                  </div>
                  <div className="space-y-2">
                    {(selectedLead.signals || ['Verified prospect in target ICP']).map((sig, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-xs text-[#182e24] leading-relaxed">
                        • {sig}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tech Stack Detected */}
                <div>
                  <div className="text-xs font-mono uppercase text-[#73827a] font-bold mb-2">
                    Detected Tech Stack
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedLead.techStack || ['Salesforce', 'HubSpot']).map((tech, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#edf2ec] text-[#0d1c15] text-xs font-medium border border-[#dbe5da]">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Generated Message Draft */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-[#0d9467] font-bold uppercase">Tailored Email Opening Line</span>
                    <button
                      type="button"
                      onClick={() => handleCopyDraft(`Hi ${selectedLead.name.split(' ')[0]}, saw ${selectedLead.company} is scaling outbound across your team...`)}
                      className="text-[#0d1c15] hover:text-[#0d9467] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedDraft ? <Check className="w-3.5 h-3.5 text-[#0d9467]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDraft ? 'Copied' : 'Copy Draft'}</span>
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/10 text-xs sm:text-sm text-[#182e24] leading-relaxed font-sans">
                    "Hi {selectedLead.name.split(' ')[0]}, saw {selectedLead.company} recently expanded your outbound team. Most {selectedLead.title}s we speak with find reps burn 12+ hours each week researching prospect tech stacks before writing. We automated that pre-call research while keeping 1-click human approval."
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="p-6 bg-[#fcfbf9] border-t border-[#0d1c15]/08 flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-[#73827a]">Campaign: {selectedLead.campaign || 'Default Cadence'}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alert(`Enrolled ${selectedLead.name} into the active cadence.`)}
                  className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold cursor-pointer"
                >
                  Enroll in Sequence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Personalization Modal */}
      {aiModalLead && (
        <AiPersonalizationModal
          lead={aiModalLead}
          userId={userId}
          onClose={() => setAiModalLead(null)}
        />
      )}

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-lead-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[500px] bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#0d1c15]/10 text-[#0d1c15] animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d1c15]/08">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0d9467]" />
                <h3 id="add-lead-title" className="font-display font-bold text-xl text-[#0d1c15]">
                  Add New Prospect
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#73827a] hover:text-[#0d1c15]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. VP Engineering"
                    value={newLead.title}
                    onChange={(e) => setNewLead({ ...newLead, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={newLead.company}
                    onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="alex@acme.com"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Company Website</label>
                  <input
                    type="text"
                    placeholder="acme.com"
                    value={newLead.website}
                    onChange={(e) => setNewLead({ ...newLead, website: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. San Francisco, CA"
                    value={newLead.location}
                    onChange={(e) => setNewLead({ ...newLead, location: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">LinkedIn URL</label>
                <input
                  type="text"
                  placeholder="linkedin.com/in/alex-morgan"
                  value={newLead.linkedin}
                  onChange={(e) => setNewLead({ ...newLead, linkedin: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#0d1c15]/08">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a6962] hover:bg-[#edf2ec]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {isEditModalOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-lead-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[500px] bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#0d1c15]/10 text-[#0d1c15] animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d1c15]/08">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#0d9467]" />
                <h3 id="edit-lead-title" className="font-display font-bold text-xl text-[#0d1c15]">
                  Edit Prospect
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

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Job Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Company</label>
                  <input
                    type="text"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Company Website</label>
                  <input
                    type="text"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  >
                    <option value="Researched">Researched</option>
                    <option value="In Sequence">In Sequence</option>
                    <option value="Replied">Replied</option>
                    <option value="Meeting Booked">Meeting Booked</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={editForm.linkedin}
                    onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })}
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

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsCsvModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[540px] bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#0d1c15]/10 text-[#0d1c15] animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#0d1c15]/08">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#0d9467]" />
                <h3 id="csv-modal-title" className="font-display font-bold text-xl text-[#0d1c15]">
                  Import Leads from CSV
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1 rounded-lg text-[#73827a] hover:text-[#0d1c15]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5a6962] mb-3 leading-relaxed">
              Paste comma-separated rows with columns: <code>Name, Title, Company, Email, LinkedIn</code>.
            </p>

            <form onSubmit={handleCsvImportSubmit} className="space-y-4">
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full p-3 font-mono text-xs rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-mono text-[#0d9467]">
                  {csvText.trim().split('\n').length - 1} records ready for import
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCsvModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a6962] hover:bg-[#edf2ec]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold cursor-pointer"
                  >
                    Import to Supabase
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
