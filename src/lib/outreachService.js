import { supabase } from './supabase';

/**
 * Service to interact with Supabase tables:
 * - leads
 * - campaigns
 * - campaign_leads
 * - profiles
 * - lead_research
 * - lead_drafts
 */

// Format database lead row to the frontend prospect structure
export function formatLeadFromDb(row) {
  const domain = row.website
    ? row.website.replace(/^https?:\/\//, '').split('/')[0]
    : row.email
    ? row.email.split('@')[1]
    : 'company.com';

  return {
    id: row.id,
    name: row.full_name || 'Unnamed Contact',
    title: row.job_title || 'Decision Maker',
    company: row.company || 'Enterprise Target',
    domain,
    website: row.website || domain,
    industry: 'Software / Technology',
    headcount: '50-200',
    location: row.location || 'United States',
    email: row.email,
    phone: '+1 (555) 012-3456',
    linkedin: row.linkedin_url || `linkedin.com/in/${(row.full_name || 'user').toLowerCase().replace(/\s+/g, '-')}`,
    linkedin_url: row.linkedin_url,
    status: row.status || 'Researched',
    fitScore: 96.5,
    seniority: 'Executive',
    techStack: ['Salesforce', 'HubSpot'],
    signals: row.notes ? [row.notes] : [
      'Added to outreach database',
      'Verified MX records and corporate domain'
    ],
    lastContacted: 'Never',
    campaign: 'US SaaS Series A Founders',
    createdAt: row.created_at,
    user_id: row.user_id,
  };
}

// Format database campaign row to the frontend campaign structure
export function formatCampaignFromDb(row, enrolledCount = 0) {
  return {
    id: row.id,
    name: row.name,
    status: row.status || 'Active',
    audience: row.description || 'Target ICP decision-makers',
    prospectsCount: enrolledCount,
    emailsSent: 0,
    openRate: 0,
    replyRate: 0,
    positiveRate: 0,
    meetingsBooked: 0,
    channels: ['Email', 'LinkedIn'],
    createdAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    schedule: 'Mon–Fri, 9:00 AM – 4:30 PM EST',
    user_id: row.user_id,
  };
}

// ========================
// LEADS OPERATIONS
// ========================

export async function fetchLeads(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
  return (data || []).map(formatLeadFromDb);
}

export async function createLead(userId, leadData) {
  if (!userId) throw new Error('User not authenticated');
  
  const payload = {
    user_id: userId,
    full_name: leadData.name || leadData.full_name,
    job_title: leadData.title || leadData.job_title || null,
    company: leadData.company || null,
    email: leadData.email,
    linkedin_url: leadData.linkedin || leadData.linkedin_url || null,
    website: leadData.website || null,
    location: leadData.location || null,
    status: leadData.status || 'Researched',
    notes: leadData.notes || (leadData.signals ? leadData.signals.join('; ') : null),
  };

  const { data, error } = await supabase
    .from('leads')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return formatLeadFromDb(data);
}

export async function updateLead(leadId, updates) {
  const payload = {};
  if (updates.name !== undefined) payload.full_name = updates.name;
  if (updates.full_name !== undefined) payload.full_name = updates.full_name;
  if (updates.title !== undefined) payload.job_title = updates.title;
  if (updates.job_title !== undefined) payload.job_title = updates.job_title;
  if (updates.company !== undefined) payload.company = updates.company;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.linkedin !== undefined) payload.linkedin_url = updates.linkedin;
  if (updates.linkedin_url !== undefined) payload.linkedin_url = updates.linkedin_url;
  if (updates.website !== undefined) payload.website = updates.website;
  if (updates.location !== undefined) payload.location = updates.location;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('leads')
    .update(payload)
    .eq('id', leadId)
    .select()
    .single();

  if (error) throw error;
  return formatLeadFromDb(data);
}

export async function deleteLead(leadId) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId);

  if (error) throw error;
  return true;
}

export async function bulkCreateLeads(userId, leadsList) {
  if (!userId) throw new Error('User not authenticated');
  if (!leadsList || !leadsList.length) return [];

  const payloads = leadsList.map((l) => ({
    user_id: userId,
    full_name: l.name || l.full_name || 'Contact',
    job_title: l.title || l.job_title || null,
    company: l.company || null,
    email: l.email,
    linkedin_url: l.linkedin || l.linkedin_url || null,
    website: l.website || null,
    location: l.location || null,
    status: l.status || 'Researched',
    notes: l.notes || null,
  }));

  const { data, error } = await supabase
    .from('leads')
    .insert(payloads)
    .select();

  if (error) throw error;
  return (data || []).map(formatLeadFromDb);
}

// ========================
// CAMPAIGNS OPERATIONS
// ========================

export async function fetchCampaigns(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      campaign_leads (id)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }

  return (data || []).map((row) => {
    const count = row.campaign_leads ? row.campaign_leads.length : 0;
    return formatCampaignFromDb(row, count);
  });
}

export async function createCampaign(userId, campaignData) {
  if (!userId) throw new Error('User not authenticated');
  const payload = {
    user_id: userId,
    name: campaignData.name,
    description: campaignData.audience || campaignData.description || null,
    status: campaignData.status || 'Active',
  };

  const { data, error } = await supabase
    .from('campaigns')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return formatCampaignFromDb(data, 0);
}

export async function updateCampaign(campaignId, updates) {
  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.audience !== undefined) payload.description = updates.audience;
  if (updates.status !== undefined) payload.status = updates.status;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('campaigns')
    .update(payload)
    .eq('id', campaignId)
    .select()
    .single();

  if (error) throw error;
  return formatCampaignFromDb(data);
}

export async function deleteCampaign(campaignId) {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId);

  if (error) throw error;
  return true;
}

// ========================
// CAMPAIGN LEADS OPERATIONS
// ========================

export async function enrollLeadInCampaign(userId, campaignId, leadId) {
  if (!userId) throw new Error('User not authenticated');
  const { data, error } = await supabase
    .from('campaign_leads')
    .insert([{ user_id: userId, campaign_id: campaignId, lead_id: leadId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchCampaignLeads(campaignId) {
  const { data, error } = await supabase
    .from('campaign_leads')
    .select(`
      *,
      leads (*)
    `)
    .eq('campaign_id', campaignId);

  if (error) throw error;
  return data || [];
}

// ==========================================
// AI LEAD RESEARCH & DRAFTS SUPABASE STORAGE
// ==========================================

export async function fetchLeadResearch(leadId) {
  if (!leadId) return null;
  const { data, error } = await supabase
    .from('lead_research')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching lead research:', error);
  }
  return data || null;
}

export async function saveLeadResearch(userId, leadId, researchData) {
  if (!userId || !leadId) throw new Error('User ID and Lead ID are required');

  const payload = {
    user_id: userId,
    lead_id: leadId,
    professional_overview: researchData.professional_overview || null,
    company_overview: researchData.company_overview || null,
    likely_priorities: researchData.likely_priorities || [],
    potential_challenges: researchData.potential_challenges || [],
    relevance_reasons: researchData.relevance_reasons || [],
    suggested_angle: researchData.suggested_angle || null,
    raw_research: researchData,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('lead_research')
    .upsert(payload, { onConflict: 'user_id,lead_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchLeadDrafts(leadId) {
  if (!leadId) return null;
  const { data, error } = await supabase
    .from('lead_drafts')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching lead drafts:', error);
  }
  return data || null;
}

export async function saveLeadDrafts(userId, leadId, draftsData) {
  if (!userId || !leadId) throw new Error('User ID and Lead ID are required');

  const payload = {
    user_id: userId,
    lead_id: leadId,
    email_subject: draftsData.email_subject || draftsData.subject || null,
    email_body: draftsData.email_body || draftsData.full_body || draftsData.body || null,
    email_opening: draftsData.email_opening || draftsData.personalized_opening || null,
    email_value_prop: draftsData.email_value_prop || draftsData.value_prop || null,
    email_cta: draftsData.email_cta || draftsData.call_to_action || null,
    linkedin_connection_note: draftsData.linkedin_connection_note || draftsData.connection_note || null,
    linkedin_follow_up: draftsData.linkedin_follow_up || draftsData.follow_up || null,
    linkedin_second_follow_up: draftsData.linkedin_second_follow_up || draftsData.second_follow_up || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('lead_drafts')
    .upsert(payload, { onConflict: 'user_id,lead_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==========================================
// AI BACKEND CALLS (OpenAI via Server Proxy)
// ==========================================

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function requestAiResearch(lead) {
  const token = await getAuthToken();
  if (!token) throw new Error('You must be signed in to perform AI research.');

  const res = await fetch('/api/ai/research', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lead }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to complete AI research.');
  }

  return data.research;
}

export async function requestAiEmail(lead, research) {
  const token = await getAuthToken();
  if (!token) throw new Error('You must be signed in to generate emails.');

  const res = await fetch('/api/ai/generate-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lead, research }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate personalized email.');
  }

  return data.email;
}

export async function requestAiLinkedIn(lead, research) {
  const token = await getAuthToken();
  if (!token) throw new Error('You must be signed in to generate LinkedIn messages.');

  const res = await fetch('/api/ai/generate-linkedin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lead, research }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate LinkedIn drafts.');
  }

  return data.linkedin;
}

// ==========================================
// EMAIL OUTREACH ENGINE API CALLS
// ==========================================

export async function fetchSenderSettings() {
  const token = await getAuthToken();
  const res = await fetch('/api/email/settings', {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch sender settings');
  return data.settings;
}

export async function saveSenderSettings(settings) {
  const token = await getAuthToken();
  const res = await fetch('/api/email/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update sender settings');
  return data;
}

export async function reviewCampaignReadiness(payload) {
  const token = await getAuthToken();
  const res = await fetch('/api/email/campaign/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to review campaign');
  return data.review;
}

export async function activateCampaignOutreach(payload) {
  const token = await getAuthToken();
  const res = await fetch('/api/email/campaign/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to activate campaign outreach');
  return data;
}

export async function fetchEmailAnalytics(campaignId = null) {
  const token = await getAuthToken();
  const url = campaignId ? `/api/email/analytics?campaignId=${campaignId}` : '/api/email/analytics';
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load email analytics');
  return data;
}

export async function triggerWorkerTick() {
  const token = await getAuthToken();
  const res = await fetch('/api/email/worker/tick', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  return res.json();
}

// ==========================================
// INBOX & REPLY MANAGEMENT API CALLS
// ==========================================

export async function fetchInboxConversations(status = 'all') {
  const token = await getAuthToken();
  const res = await fetch(`/api/inbox/conversations?status=${status}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch conversations');
  return data.conversations || [];
}

export async function fetchConversationThread(conversationId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/inbox/thread?conversationId=${conversationId}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch conversation thread');
  return data;
}

export async function classifyReplyMessage(conversationId, text, subject) {
  const token = await getAuthToken();
  const res = await fetch('/api/inbox/classify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify({ conversationId, text, subject }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to classify reply');
  return data.result;
}

export async function generateSuggestedReply(payload) {
  const token = await getAuthToken();
  const res = await fetch('/api/inbox/suggest-reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate suggested reply');
  return data.suggestedReply;
}

export async function sendConversationReply(payload) {
  const token = await getAuthToken();
  const res = await fetch('/api/inbox/send-reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send reply');
  return data;
}

// ==========================================
// LEAD DISCOVERY & ENRICHMENT API CALLS
// ==========================================

export async function searchProspects(params) {
  const token = await getAuthToken();
  const res = await fetch('/api/leads/discovery', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to search prospects');
  return data;
}

export async function enrichProspectLead(lead) {
  const token = await getAuthToken();
  const res = await fetch('/api/leads/enrich', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify({ lead }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to enrich lead');
  return data;
}

export async function qualifyProspectLead(lead, icpCriteria) {
  const token = await getAuthToken();
  const res = await fetch('/api/leads/qualify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify({ lead, icpCriteria }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to qualify lead with AI');
  return data.qualification;
}

// ==========================================
// CAMPAIGN ANALYTICS & TELEMETRY API CALLS
// ==========================================

export async function fetchAnalyticsOverview({ campaignId = null, period = '30d', startDate = null, endDate = null } = {}) {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (campaignId) params.append('campaignId', campaignId);
  if (period) params.append('period', period);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const res = await fetch(`/api/analytics/overview?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load analytics overview');
  return data;
}

export async function fetchAnalyticsTrends({ campaignId = null, interval = 'daily', range = '30d', startDate = null, endDate = null } = {}) {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (campaignId) params.append('campaignId', campaignId);
  if (interval) params.append('interval', interval);
  if (range) params.append('range', range);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const res = await fetch(`/api/analytics/trends?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load analytics trends');
  return data;
}

export async function fetchAnalyticsCampaigns({
  search = '',
  status = 'all',
  sortBy = 'created_at',
  sortOrder = 'desc',
  page = 1,
  limit = 10,
  startDate = null,
  endDate = null,
} = {}) {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status && status !== 'all') params.append('status', status);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const res = await fetch(`/api/analytics/campaigns?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load campaigns analytics');
  return data;
}

export async function fetchCampaignDetailAnalytics(campaignId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/analytics/campaigns/${campaignId}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load campaign analytics detail');
  return data;
}

export async function fetchCampaignSequenceAnalytics(campaignId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/analytics/campaigns/${campaignId}/sequence`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load campaign sequence analytics');
  return data;
}

export async function fetchCampaignRepliesAnalytics(campaignId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/analytics/campaigns/${campaignId}/replies`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load campaign replies analytics');
  return data;
}

export async function downloadAnalyticsExportCsv({ type = 'campaigns', campaignId = null, startDate = null, endDate = null } = {}) {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (campaignId) params.append('campaignId', campaignId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const res = await fetch(`/api/analytics/export?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Failed to download analytics export');
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition');
  let filename = `${type}_export_${Date.now()}.csv`;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return { success: true, filename };
}

// ==========================================
// AI CAMPAIGN OPTIMIZATION & RECOMMENDATIONS
// ==========================================

export async function fetchOptimizationOverview() {
  const token = await getAuthToken();
  const res = await fetch('/api/optimization/overview', {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load optimization overview');
  return data;
}

export async function fetchCampaignOptimizationDetail(campaignId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/optimization/campaigns/${campaignId}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load campaign optimization detail');
  return data;
}

export async function analyzeCampaignOptimization(campaignId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/optimization/campaigns/${campaignId}/analyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to analyze campaign optimization');
  return data;
}

export async function fetchOptimizationRecommendations({ campaignId = null, status = 'all', category = 'all' } = {}) {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (campaignId) params.append('campaignId', campaignId);
  if (status && status !== 'all') params.append('status', status);
  if (category && category !== 'all') params.append('category', category);

  const res = await fetch(`/api/optimization/recommendations?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load recommendations');
  return data.recommendations || [];
}

export async function reviewOptimizationRecommendation(recommendationId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/optimization/recommendations/${recommendationId}/review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to review recommendation');
  return data.recommendation;
}

export async function applyOptimizationRecommendation(recommendationId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/optimization/recommendations/${recommendationId}/apply`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to apply recommendation');
  return data;
}

export async function dismissOptimizationRecommendation(recommendationId, reason = 'User dismissed') {
  const token = await getAuthToken();
  const res = await fetch(`/api/optimization/recommendations/${recommendationId}/dismiss`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to dismiss recommendation');
  return data;
}

export async function generateCampaignVariants(campaignId, { variantType = 'subject', prompt = '', context = {} } = {}) {
  const token = await getAuthToken();
  const res = await fetch(`/api/optimization/campaigns/${campaignId}/variants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify({ variantType, prompt, context }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate campaign variants');
  return data;
}

export async function createCampaignExperiment(payload) {
  const token = await getAuthToken();
  const res = await fetch('/api/optimization/experiments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create experiment');
  return data;
}

export async function fetchCampaignExperiments(campaignId = null) {
  const token = await getAuthToken();
  const url = campaignId ? `/api/optimization/experiments?campaignId=${campaignId}` : '/api/optimization/experiments';
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch experiments');
  return data.experiments || [];
}

export async function fetchCampaignExperimentDetail(experimentId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/optimization/experiments/${experimentId}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch experiment detail');
  return data;
}

export async function pauseCampaignExperiment(experimentId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/optimization/experiments/${experimentId}/pause`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to pause experiment');
  return data.experiment;
}

export async function completeCampaignExperiment(experimentId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/optimization/experiments/${experimentId}/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to complete experiment');
  return data.experiment;
}

// ==========================================
// LEAD CRM & SALES PIPELINE MANAGEMENT
// ==========================================

export async function fetchCrmOverview() {
  const token = await getAuthToken();
  const res = await fetch('/api/crm/overview', {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load CRM overview');
  return data;
}

export async function fetchCrmPipelineStages() {
  const token = await getAuthToken();
  const res = await fetch('/api/crm/pipeline', {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load pipeline stages');
  return data.stages || [];
}

export async function fetchCrmLeads({
  search = '',
  stage = 'all',
  industry = 'all',
  source = 'all',
  minScore = null,
  sortBy = 'last_activity_at',
  sortOrder = 'desc',
  page = 1,
  limit = 20,
} = {}) {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (stage && stage !== 'all') params.append('stage', stage);
  if (industry && industry !== 'all') params.append('industry', industry);
  if (source && source !== 'all') params.append('source', source);
  if (minScore !== null && minScore !== undefined) params.append('minScore', minScore);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  const res = await fetch(`/api/crm/leads?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load CRM leads');
  return data;
}

export async function updateLeadCrmStage(leadId, newStage, notes = '') {
  const token = await getAuthToken();
  const res = await fetch(`/api/crm/leads/${leadId}/stage`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify({ newStage, notes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update lead stage');
  return data;
}

export async function bulkUpdateLeadCrmStage(leadIds, newStage, notes = '') {
  const token = await getAuthToken();
  const res = await fetch('/api/crm/leads/bulk-stage', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify({ leadIds, newStage, notes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to bulk update lead stages');
  return data;
}

export async function fetchLeadProfile(leadId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/crm/leads/${leadId}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load lead profile');
  return data.profile;
}

export async function fetchLeadActivityTimeline(leadId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/crm/leads/${leadId}/activity`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load lead activity');
  return data.timeline || [];
}

export async function fetchLeadNotes(leadId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/crm/leads/${leadId}/notes`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load notes');
  return data.notes || [];
}

export async function createLeadNote(leadId, { content, authorName = 'Sales Rep', taskId = null }) {
  const token = await getAuthToken();
  const res = await fetch(`/api/crm/leads/${leadId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify({ content, authorName, taskId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create note');
  return data.note;
}

export async function deleteLeadNote(noteId) {
  const token = await getAuthToken();
  const res = await fetch(`/api/crm/notes/${noteId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete note');
  return data;
}

export async function fetchCrmTasks({ leadId = null, status = 'all' } = {}) {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (leadId) params.append('leadId', leadId);
  if (status && status !== 'all') params.append('status', status);

  const res = await fetch(`/api/crm/tasks?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load tasks');
  return data;
}

export async function createCrmTask({ leadId, title, description = '', taskType = 'follow_up', priority = 'medium', dueDate }) {
  const token = await getAuthToken();
  const res = await fetch('/api/crm/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify({ leadId, title, description, taskType, priority, dueDate }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create task');
  return data.task;
}

export async function updateCrmTask(taskId, updates = {}) {
  const token = await getAuthToken();
  const res = await fetch(`/api/crm/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update task');
  return data.task;
}

export async function fetchCrmDeals({ leadId = null, status = 'all' } = {}) {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (leadId) params.append('leadId', leadId);
  if (status && status !== 'all') params.append('status', status);

  const res = await fetch(`/api/crm/deals?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load deals');
  return data.deals || [];
}

export async function createCrmDeal(payload) {
  const token = await getAuthToken();
  const res = await fetch('/api/crm/deals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create deal');
  return data.deal;
}

export async function updateCrmDeal(dealId, updates) {
  const token = await getAuthToken();
  const res = await fetch(`/api/crm/deals/${dealId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
    },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update deal');
  return data.deal;
}






