import React, { useState } from 'react';
import { Search, Filter, Plus, Upload, CheckCircle2, Linkedin, Mail, ExternalLink, X, Sparkles, Building2, MapPin, Users, Copy, Check, ArrowRight, UserPlus, Phone } from 'lucide-react';

export default function LeadsView({ prospects, onAddLead, onImportLeads }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('fitScore');
  const [selectedLead, setSelectedLead] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // New Lead Form State
  const [newLead, setNewLead] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    linkedin: '',
    location: '',
    seniority: 'Executive',
    techStack: 'Salesforce, HubSpot'
  });

  // CSV Import State
  const [csvText, setCsvText] = useState(
    'Name,Title,Company,Email,LinkedIn\nAlex Chen,VP Engineering,Voxel Labs,alex@voxellabs.io,linkedin.com/in/alex-chen\nSophie Taylor,Director of Growth,Acuity Flow,sophie@acuityflow.com,linkedin.com/in/sophie-taylor'
  );

  // Filter & Sort Logic
  const filteredLeads = prospects.filter((lead) => {
    if (statusFilter !== 'All' && lead.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        lead.name.toLowerCase().includes(q) ||
        lead.company.toLowerCase().includes(q) ||
        lead.title.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.location.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'fitScore') return b.fitScore - a.fitScore;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'company') return a.company.localeCompare(b.company);
    return 0;
  });

  const handleCreateLeadSubmit = (e) => {
    e.preventDefault();
    if (!newLead.name || !newLead.email) return;

    const created = {
      id: `lead-${Date.now()}`,
      name: newLead.name,
      title: newLead.title || 'Decision Maker',
      company: newLead.company || 'Enterprise Target',
      domain: newLead.email.split('@')[1] || 'company.com',
      industry: 'Software / Technology',
      headcount: '50-200',
      location: newLead.location || 'United States',
      email: newLead.email,
      phone: '+1 (555) 012-3456',
      linkedin: newLead.linkedin || `linkedin.com/in/${newLead.name.toLowerCase().replace(/\s+/g, '-')}`,
      status: 'Researched',
      fitScore: 96.5,
      seniority: newLead.seniority,
      techStack: newLead.techStack.split(',').map(s => s.trim()),
      signals: [
        'Added via manual prospect creation',
        'Verified MX records and corporate domain'
      ],
      lastContacted: 'Never',
      campaign: 'US SaaS Series A Founders'
    };

    onAddLead(created);
    setNewLead({
      name: '',
      title: '',
      company: '',
      email: '',
      linkedin: '',
      location: '',
      seniority: 'Executive',
      techStack: 'Salesforce, HubSpot'
    });
    setIsAddModalOpen(false);
  };

  const handleCsvImportSubmit = (e) => {
    e.preventDefault();
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) return;

    const newEntries = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length >= 4) {
        newEntries.push({
          id: `lead-csv-${Date.now()}-${i}`,
          name: parts[0],
          title: parts[1] || 'Leader',
          company: parts[2] || 'Tech Corp',
          domain: parts[3].split('@')[1] || 'domain.com',
          industry: 'B2B Software',
          headcount: '50-100',
          location: 'United States',
          email: parts[3],
          phone: '+1 (555) 789-0123',
          linkedin: parts[4] || 'linkedin.com',
          status: 'Researched',
          fitScore: 97.0,
          seniority: 'Director',
          techStack: ['Salesforce', 'Stripe'],
          signals: ['Imported via CSV batch upload', 'Email verified'],
          lastContacted: 'Never',
          campaign: 'US SaaS Series A Founders'
        });
      }
    }

    if (newEntries.length > 0) {
      onImportLeads(newEntries);
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#edf2ec]/60 border-b border-[#0d1c15]/08 text-[#5a6962] font-mono text-[11px] uppercase">
                <th className="py-3 px-4 font-semibold">Prospect</th>
                <th className="py-3 px-4 font-semibold">Company &amp; Industry</th>
                <th className="py-3 px-4 font-semibold">Contact Details</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Fit Score</th>
                <th className="py-3 px-4 font-semibold text-right">Details</th>
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
                        {lead.name.split(' ').map(n => n[0]).join('')}
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
                    <div className="text-xs text-[#73827a]">{lead.industry} · {lead.location}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-mono text-xs text-[#0d9467]">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{lead.email}</span>
                    </div>
                    <a
                      href={`https://${lead.linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#0077b5] hover:underline mt-0.5"
                    >
                      <Linkedin className="w-3 h-3" />
                      <span>Profile</span>
                    </a>
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
                    {lead.fitScore}%
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span className="text-xs font-semibold text-[#0d9467] group-hover:underline flex items-center justify-end gap-1">
                      <span>View Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-Over Prospect Detail Panel */}
      {selectedLead && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedLead(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-drawer-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[560px] h-full bg-white shadow-2xl border-l border-[#0d1c15]/10 flex flex-col justify-between overflow-y-auto animate-scaleUp text-[#0d1c15]"
          >
            {/* Header */}
            <div>
              <div className="p-6 bg-[#fcfbf9] border-b border-[#0d1c15]/08 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#0d1c15] text-[#00e599] font-bold text-sm flex items-center justify-center">
                    {selectedLead.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h2 id="lead-drawer-title" className="text-xl font-display font-bold text-[#0d1c15]">
                      {selectedLead.name}
                    </h2>
                    <p className="text-xs text-[#5a6962]">
                      {selectedLead.title} @ <strong>{selectedLead.company}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="p-1.5 rounded-lg text-[#73827a] hover:text-[#0d1c15] hover:bg-[#edf2ec]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Coordinates Ribbon */}
              <div className="px-6 py-3.5 bg-[#edf2ec]/50 border-b border-[#0d1c15]/08 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-[#0d9467] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{selectedLead.email}</span>
                </div>
                <a
                  href={`https://${selectedLead.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[#0077b5] hover:underline"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>Open Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-6">
                
                {/* AI Research Signals */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#0d9467] font-bold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Company Signals &amp; Triggers</span>
                  </div>
                  <div className="space-y-2">
                    {selectedLead.signals.map((sig, idx) => (
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
                    {selectedLead.techStack.map((tech, idx) => (
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
              <span className="text-xs font-mono text-[#73827a]">Campaign: {selectedLead.campaign}</span>
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
                    placeholder="e.g. VP of Sales"
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
                  Save &amp; Generate Research
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
                    Import &amp; Verify MX
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
