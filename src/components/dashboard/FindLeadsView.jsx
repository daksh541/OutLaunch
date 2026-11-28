import React, { useState, useEffect } from 'react';
import { TableSkeleton } from '../ui/DashboardSkeleton';
import {
  Search,
  Filter,
  Users,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Plus,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Check,
  Send,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  X,
  Mail,
  ShieldCheck,
  Briefcase,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import {
  searchProspects,
  enrichProspectLead,
  qualifyProspectLead,
  bulkCreateLeads,
  createCampaign
} from '../../lib/outreachService';

const ROLE_PILLS = [
  'Founder',
  'CEO',
  'Sales Manager',
  'Marketing Manager',
  'Head of Growth',
  'VP of Sales',
  'CTO'
];

const INDUSTRY_OPTIONS = [
  'All Industries',
  'Enterprise Software / AI',
  'Cloud Infrastructure / DevOps',
  'FinTech / SaaS',
  'Cybersecurity',
  'Software / Productivity',
  'Supply Chain & Logistics',
  'HealthTech / Digital Health',
  'Developer Tools / Databases'
];

const SIZE_OPTIONS = [
  'All Sizes',
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees'
];

export default function FindLeadsView({
  userId,
  existingLeads = [],
  campaigns = [],
  onLeadsSaved,
  onOpenAiResearch,
  onNavigate
}) {
  // Search parameters
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('All Industries');
  const [companySize, setCompanySize] = useState('All Sizes');
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState('');

  // Results & Pagination
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [setupMessage, setSetupMessage] = useState(null);
  const [providerName, setProviderName] = useState('B2B Data');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Sorting
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals & Actions
  const [isEnrichingId, setIsEnrichingId] = useState(null);
  const [isQualifyingLead, setIsQualifyingLead] = useState(null);
  const [qualificationModal, setQualificationModal] = useState(null);
  const [actionSuccessToast, setActionSuccessToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Campaign Dropdown modal for adding selected leads
  const [isAddToCampaignOpen, setIsAddToCampaignOpen] = useState(false);
  const [targetCampaignId, setTargetCampaignId] = useState(campaigns[0]?.id || '');
  const [newCampaignName, setNewCampaignName] = useState('');

  // Initial load
  const runSearch = async (targetPage = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await searchProspects({
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        domain: domain.trim(),
        industry: industry === 'All Industries' ? '' : industry,
        companySize: companySize === 'All Sizes' ? '' : companySize,
        location: location.trim(),
        keywords: keywords.trim(),
        page: targetPage,
        perPage: 10
      });

      setResults(data.leads || []);
      setTotalResults(data.total || 0);
      setPage(data.page || 1);
      setIsDemoMode(data.isDemoMode || false);
      setSetupMessage(data.setupMessage || null);
      setProviderName(data.provider || 'B2B Data');
      setSelectedIds(new Set());
    } catch (err) {
      setError(err.message || 'Failed to search leads.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runSearch(1);
  }, []);

  // Quick Filter Pill Click
  const handlePillClick = (role) => {
    setJobTitle(role);
  };

  // Toggle Single Selection
  const handleToggleSelect = (id) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    setSelectedIds(updated);
  };

  // Select / Deselect All visible
  const handleToggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(r => r.id)));
    }
  };

  // Enrich single lead
  const handleEnrichLead = async (lead) => {
    setIsEnrichingId(lead.id);
    try {
      const res = await enrichProspectLead(lead);
      if (res.success && res.enrichedData) {
        setResults(prev => prev.map(item => {
          if (item.id === lead.id) {
            return {
              ...item,
              ...res.enrichedData,
              enrichedAt: res.enrichedAt,
              enrichmentSource: res.source,
            };
          }
          return item;
        }));
        showToast(`Enriched ${lead.name} via ${res.source}`);
      }
    } catch (err) {
      alert('Enrichment error: ' + err.message);
    } finally {
      setIsEnrichingId(null);
    }
  };

  // AI Qualify Lead
  const handleQualifyLead = async (lead) => {
    setIsQualifyingLead(lead.id);
    try {
      const qual = await qualifyProspectLead(lead, {
        productDescription: 'Outbound sales intelligence, automated lead research, and verified campaign sequence execution',
        targetRoles: 'Founders, VP Growth, VP Sales, Head of Marketing',
        companyCriteria: 'B2B Tech & SaaS companies 10-500 employees',
        exclusions: 'B2C, retail'
      });
      setQualificationModal({ lead, qualification: qual });
    } catch (err) {
      alert('Qualification error: ' + err.message);
    } finally {
      setIsQualifyingLead(null);
    }
  };

  // Save selected leads to existing Supabase Leads table with deduplication
  const handleSaveSelectedLeads = async (campaignIdToAttach = null) => {
    const leadsToSave = results.filter(r => selectedIds.has(r.id));
    if (leadsToSave.length === 0) return;

    setIsSaving(true);
    try {
      // Deduplicate against existing leads by normalized email and domain
      const existingEmails = new Set((existingLeads || []).map(l => (l.email || '').toLowerCase().trim()));
      const uniqueNewLeads = leadsToSave.filter(l => !l.email || !existingEmails.has(l.email.toLowerCase().trim()));

      if (uniqueNewLeads.length === 0) {
        alert('All selected leads already exist in your prospects database (duplicates avoided).');
        setIsSaving(false);
        return;
      }

      const formatted = uniqueNewLeads.map(l => ({
        name: l.name,
        title: l.title,
        company: l.company,
        email: l.email || `${l.name.toLowerCase().replace(/\s+/g, '.')}@${l.domain || 'company.com'}`,
        linkedin: l.linkedin,
        website: l.website || (l.domain ? `https://${l.domain}` : null),
        location: l.location,
        status: 'Researched',
        company_domain: l.domain,
        company_size: l.companySize,
        industry: l.industry,
        data_source: l.source || 'Apollo B2B Data',
        verification_status: l.verificationStatus || 'unverified',
        notes: l.description || 'Imported via Lead Discovery'
      }));

      const created = await bulkCreateLeads(userId, formatted);
      if (onLeadsSaved) onLeadsSaved(created);

      showToast(`Saved ${created.length} new prospects to Supabase database!`);
      setSelectedIds(new Set());
      setIsAddToCampaignOpen(false);
    } catch (err) {
      alert('Failed to save leads: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Export selected leads to CSV
  const handleExportCsv = () => {
    const leadsToExport = results.filter(r => selectedIds.has(r.id));
    if (leadsToExport.length === 0) return;

    const headers = ['Name', 'Title', 'Company', 'Domain', 'Email', 'Location', 'Industry', 'Size', 'Verification'];
    const rows = leadsToExport.map(l => [
      `"${l.name || ''}"`,
      `"${l.title || ''}"`,
      `"${l.company || ''}"`,
      `"${l.domain || ''}"`,
      `"${l.email || ''}"`,
      `"${l.location || ''}"`,
      `"${l.industry || ''}"`,
      `"${l.companySize || ''}"`,
      `"${l.verificationStatus || 'unverified'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `outlaunch_leads_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${leadsToExport.length} leads to CSV`);
  };

  const showToast = (msg) => {
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  // Sorting logic
  const sortedResults = [...results].sort((a, b) => {
    let valA = a[sortBy] || '';
    let valB = b[sortBy] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
              Find Leads &amp; Prospect Discovery
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#00e599]/15 text-[#0d9467] font-mono text-xs font-bold border border-[#00e599]/30">
              {providerName}
            </span>
          </div>
          <p className="text-sm text-[#4a5851] mt-0.5">
            Target decision-makers across industry, seniority, company headcount, and location
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl border border-[#0d1c15]/15 bg-white hover:bg-[#fcfbf9] text-xs font-semibold text-[#0d1c15] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#0d9467]" />
                <span>Export CSV ({selectedIds.size})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveSelectedLeads()}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00e599]" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[#00e599]" />}
                <span>Save to Prospects ({selectedIds.size})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessToast && (
        <div className="p-3 rounded-2xl bg-[#edf2ec] border border-[#00e599]/40 text-xs sm:text-sm text-[#0d9467] font-semibold flex items-center gap-2.5 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#0d9467] shrink-0" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* Provider Setup Notice (if API key not configured) */}
      {setupMessage && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start justify-between gap-3 text-xs leading-relaxed text-[#0d1c15]">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900 block mb-0.5">
                Provider Setup Notice: Live B2B API Key Not Configured
              </span>
              {setupMessage} To connect your production Apollo API, provide <code>APOLLO_API_KEY</code> in your server <code>.env</code> file.
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Controls Bar */}
      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm space-y-4">
        
        {/* Row 1: Search Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-[#5a6962] font-semibold uppercase mb-1">
              Job Title
            </label>
            <div className="relative">
              <Briefcase className="w-3.5 h-3.5 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. VP Growth, CTO..."
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#5a6962] font-semibold uppercase mb-1">
              Company Name / Domain
            </label>
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. Voxel Labs, datavantage.ai"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#5a6962] font-semibold uppercase mb-1">
              Industry
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
            >
              {INDUSTRY_OPTIONS.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#5a6962] font-semibold uppercase mb-1">
              Company Headcount
            </label>
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
            >
              {SIZE_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Location & Keywords + Submit Button */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-4">
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Location (e.g. San Francisco, US, London)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
              />
            </div>
          </div>

          <div className="sm:col-span-5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#73827a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Keywords (e.g. machine learning, series a, b2b saas)"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#0d1c15]/10 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
              />
            </div>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => runSearch(1)}
              disabled={isLoading}
              className="w-full py-2 px-4 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00e599]" /> : <Search className="w-3.5 h-3.5 text-[#00e599]" />}
              <span>Find Prospects</span>
            </button>
          </div>
        </div>

        {/* Quick Title Filter Pills */}
        <div className="pt-2 border-t border-[#0d1c15]/06 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-[#73827a] font-semibold mr-1">Quick Titles:</span>
          {ROLE_PILLS.map(role => (
            <button
              key={role}
              type="button"
              onClick={() => handlePillClick(role)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                jobTitle === role
                  ? 'bg-[#0d1c15] text-white border-[#0d1c15]'
                  : 'bg-[#edf2ec]/60 border-[#dbe5da] text-[#0d9467] hover:bg-[#dbe5da]'
              }`}
            >
              {role}
            </button>
          ))}
          {jobTitle && (
            <button
              type="button"
              onClick={() => setJobTitle('')}
              className="text-[11px] text-[#73827a] hover:text-[#0d1c15] underline ml-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results Table Section */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#0d1c15]/08 shadow-sm overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[#0d1c15]/08 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#fcfbf9]/50">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={results.length > 0 && selectedIds.size === results.length}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-[#0d9467] focus:ring-[#0d9467] cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-[#0d1c15]">
              {totalResults} Decision-Makers Found
            </span>
            {selectedIds.size > 0 && (
              <span className="px-2 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] font-mono text-[11px] font-bold">
                {selectedIds.size} Selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-[#73827a]">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-1 rounded-lg border border-[#0d1c15]/10 bg-white text-[#0d1c15] outline-none"
            >
              <option value="name">Name</option>
              <option value="company">Company</option>
              <option value="title">Title</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded hover:bg-[#edf2ec] cursor-pointer"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Results List */}
        {isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : sortedResults.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-10 h-10 text-[#73827a]/30 mx-auto mb-3" />
            <h3 className="font-display font-bold text-base text-[#0d1c15]">No matching prospects found</h3>
            <p className="text-xs text-[#5a6962] mt-1 max-w-sm mx-auto">
              Try adjusting your title, industry, or location filters to broaden your lead discovery.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#0d1c15]/06 text-[11px] font-mono uppercase text-[#73827a] bg-[#fcfbf9]/80">
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Company &amp; Domain</th>
                  <th className="py-3 px-4">Business Email</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Data Source</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0d1c15]/06 text-xs sm:text-sm">
                {sortedResults.map((lead) => {
                  const isSelected = selectedIds.has(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-[#fcfbf9] transition-colors ${
                        isSelected ? 'bg-[#edf2ec]/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(lead.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#0d9467] focus:ring-[#0d9467] cursor-pointer"
                        />
                      </td>

                      {/* Contact & Title */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#0d1c15] flex items-center gap-1.5">
                          <span>{lead.name}</span>
                          {lead.linkedin && (
                            <a
                              href={`https://${lead.linkedin.replace(/^https?:\/\//, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Declared LinkedIn profile"
                              className="text-[#0077b5] hover:opacity-75"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-xs text-[#5a6962] font-mono mt-0.5">
                          {lead.title}
                        </div>
                      </td>

                      {/* Company & Domain */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#0d1c15]">{lead.company}</div>
                        <div className="text-xs text-[#73827a] font-mono mt-0.5">
                          {lead.domain || lead.website || 'corporate domain'}
                        </div>
                        {lead.industry && (
                          <span className="text-[10px] text-[#5a6962] block mt-0.5">
                            {lead.industry}
                          </span>
                        )}
                      </td>

                      {/* Business Email & Verification Badge */}
                      <td className="py-3.5 px-4">
                        {lead.email ? (
                          <div>
                            <span className="font-mono text-xs text-[#0d1c15] block">
                              {lead.email}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold mt-1 border ${
                              lead.verificationStatus === 'verified'
                                ? 'bg-[#00e599]/15 text-[#0d9467] border-[#00e599]/30'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {lead.verificationStatus === 'verified' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" /> Verified by Provider
                                </>
                              ) : (
                                <>
                                  <HelpCircle className="w-3 h-3" /> Unverified (Catch-all)
                                </>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#f2efe9] text-[#73827a] font-mono text-[10px] border border-[#0d1c15]/10">
                            Not available
                          </span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 font-mono text-xs text-[#5a6962]">
                        {lead.location || 'United States'}
                      </td>

                      {/* Data Source */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#73827a]">
                        <span>{lead.source}</span>
                        {lead.enrichedAt && (
                          <span className="block text-[10px] text-[#0d9467]">
                            Enriched {new Date(lead.enrichedAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* AI Qualify */}
                          <button
                            type="button"
                            onClick={() => handleQualifyLead(lead)}
                            disabled={isQualifyingLead === lead.id}
                            title="AI ICP Qualification & Scoring"
                            className="px-2.5 py-1 rounded-lg border border-[#0d1c15]/10 hover:bg-[#edf2ec] text-[#0d1c15] text-xs font-mono flex items-center gap-1 cursor-pointer"
                          >
                            {isQualifyingLead === lead.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-[#0d9467]" />
                            ) : (
                              <Sparkles className="w-3 h-3 text-[#0d9467]" />
                            )}
                            <span className="hidden sm:inline">Qualify</span>
                          </button>

                          {/* Enrich Action */}
                          <button
                            type="button"
                            onClick={() => handleEnrichLead(lead)}
                            disabled={isEnrichingId === lead.id}
                            title="Enrich company intelligence"
                            className="px-2.5 py-1 rounded-lg border border-[#0d1c15]/10 hover:bg-[#edf2ec] text-[#0d1c15] text-xs font-mono flex items-center gap-1 cursor-pointer"
                          >
                            {isEnrichingId === lead.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-[#0d9467]" />
                            ) : (
                              <RefreshCw className="w-3 h-3 text-[#0d9467]" />
                            )}
                            <span className="hidden sm:inline">Enrich</span>
                          </button>

                          {/* AI Research Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => onOpenAiResearch && onOpenAiResearch(lead)}
                            title="Open AI Lead Research & Personalization"
                            className="px-2.5 py-1 rounded-lg bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Sparkles className="w-3 h-3 text-[#00e599]" />
                            <span>AI Drafts</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#0d1c15]/08 flex items-center justify-between bg-[#fcfbf9]/60 text-xs font-mono text-[#5a6962]">
          <span>Page {page} of {Math.max(1, Math.ceil(totalResults / 10))}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => runSearch(page - 1)}
              className="p-1.5 rounded-lg border border-[#0d1c15]/10 disabled:opacity-40 hover:bg-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= Math.ceil(totalResults / 10) || isLoading}
              onClick={() => runSearch(page + 1)}
              className="p-1.5 rounded-lg border border-[#0d1c15]/10 disabled:opacity-40 hover:bg-white cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Qualification Modal */}
      {qualificationModal && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setQualificationModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-qual-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#0d1c15]/10 text-[#0d1c15] animate-scaleUp space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#0d1c15]/08">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0d9467]" />
                <h3 id="ai-qual-title" className="font-display font-bold text-lg text-[#0d1c15]">
                  AI ICP Qualification Result
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQualificationModal(null)}
                className="p-1 rounded-lg text-[#73827a] hover:text-[#0d1c15]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fit Score Display */}
            <div className="p-4 rounded-2xl bg-[#edf2ec]/60 border border-[#dbe5da] flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase text-[#73827a] font-bold block">
                  ICP Fit Score
                </span>
                <span className="text-2xl font-bold font-display text-[#0d1c15]">
                  {qualificationModal.lead.name}
                </span>
                <span className="text-xs text-[#5a6962] font-mono block">
                  {qualificationModal.lead.title} at {qualificationModal.lead.company}
                </span>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold font-display text-[#0d9467]">
                  {qualificationModal.qualification.fit_score}
                </span>
                <span className="text-xs text-[#73827a] font-mono block">/ 100</span>
              </div>
            </div>

            {/* Explanation & Rationale */}
            <div className="space-y-3 text-xs leading-relaxed">
              <div>
                <span className="font-bold font-mono text-[#0d1c15] uppercase text-[11px] block mb-0.5">
                  Alignment Explanation
                </span>
                <p className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-[#4a5851]">
                  {qualificationModal.qualification.explanation}
                </p>
              </div>

              <div>
                <span className="font-bold font-mono text-[#0d1c15] uppercase text-[11px] block mb-0.5">
                  Business Rationale
                </span>
                <p className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-[#4a5851]">
                  {qualificationModal.qualification.business_rationale}
                </p>
              </div>

              <div>
                <span className="font-bold font-mono text-[#0d1c15] uppercase text-[11px] block mb-0.5">
                  Suggested Outreach Angle
                </span>
                <p className="p-3 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 text-[#0d9467] font-semibold">
                  {qualificationModal.qualification.potential_angle}
                </p>
              </div>

              {qualificationModal.qualification.missing_information && (
                <div>
                  <span className="font-bold font-mono text-[#73827a] uppercase text-[11px] block mb-0.5">
                    Hypothesis &amp; Missing Information
                  </span>
                  <p className="text-[11px] text-[#73827a] italic">
                    {qualificationModal.qualification.missing_information}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setQualificationModal(null)}
                className="px-5 py-2 rounded-xl bg-[#0d1c15] text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
