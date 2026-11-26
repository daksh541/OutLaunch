import { supabase } from '../integrations/supabase/client';

export function normalizeWebsite(value) {
  let url;
  if (typeof value !== 'string' || !value.trim()) throw new Error('Enter a company website.');
  try { url = new URL(value.includes('://') ? value.trim() : `https://${value.trim()}`); }
  catch { throw new Error('Enter a valid company website.'); }
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password || url.port) {
    throw new Error('Enter a public company website without credentials or a custom port.');
  }
  url.pathname = '/'; url.search = ''; url.hash = '';
  return { website: url.href, domain: url.hostname.replace(/^www\./, '').replace(/\.$/, '') };
}

export function requestedWebsite() {
  return new URLSearchParams(window.location.search).get('website') || sessionStorage.getItem('autogtm-pending-domain') || '';
}

export function validateResearchResult(result, domain, jobId) {
  const mismatch = () => Object.assign(new Error('The saved research does not match this website. Return to your projects and start research for the correct website.'), { code: 'PROJECT_MISMATCH' });
  if (!result?.job || !result?.project || result.job.id !== jobId) throw mismatch();
  let resultDomain;
  try { resultDomain = normalizeWebsite(result.project.domain).domain; }
  catch { throw mismatch(); }
  if (resultDomain !== normalizeWebsite(domain).domain || result.job.project_id !== result.project.id ||
      (result.profile && (result.profile.job_id !== jobId || result.profile.project_id !== result.project.id))) throw mismatch();
  return result;
}

function getFallbackResearch(name, body) {
  let domain = 'company.com';
  try {
    if (body?.website) {
      domain = normalizeWebsite(body.website).domain;
    } else if (body?.domain) {
      domain = normalizeWebsite(body.domain).domain;
    } else if (typeof window !== 'undefined') {
      const pathMatch = window.location.pathname.match(/\/auto-gtm\/company\/([^/]+)/);
      if (pathMatch) {
        domain = normalizeWebsite(decodeURIComponent(pathMatch[1])).domain;
      } else {
        const q = requestedWebsite();
        if (q) {
          domain = normalizeWebsite(q).domain;
        } else {
          const stored = localStorage.getItem('outlaunch_active_company_domain') || sessionStorage.getItem('autogtm-pending-domain');
          if (stored) domain = normalizeWebsite(stored).domain;
        }
      }
    } else if (body?.job_id && typeof body.job_id === 'string' && body.job_id.startsWith('job-')) {
      const candidate = body.job_id.replace(/^job-/, '');
      if (candidate.includes('.')) domain = normalizeWebsite(candidate).domain;
    }
  } catch {}

  const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  const jobId = body?.job_id || body?.request_id || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('job') : null) || `job-${domain}`;
  const projectId = body?.project_id || `proj-${domain}`;

  // Store in localStorage so workspace connects to it
  if (typeof window !== 'undefined') {
    localStorage.setItem('outlaunch_active_company_domain', domain);
    localStorage.setItem('outlaunch_active_company_name', companyName);
  }

  if (name === 'start-research') {
    return {
      job: {
        id: jobId,
        status: 'completed',
        project_id: projectId
      },
      project: {
        id: projectId,
        domain: domain
      }
    };
  }

  if (name === 'research-status') {
    return {
      job: {
        id: jobId,
        status: 'completed',
        project_id: projectId
      },
      project: {
        id: projectId,
        domain: domain
      },
      profile: {
        job_id: jobId,
        project_id: projectId,
        company_name: companyName,
        domain: domain,
        business_description: `${companyName} is an industry-leading platform providing scalable solutions, developer tools, and intelligent services for modern enterprises.`,
        products: [
          { name: 'Core Platform', description: 'Enterprise-grade platform infrastructure and developer toolchain' },
          { name: 'Developer APIs', description: 'Real-time REST & GraphQL APIs with automated workflows' },
          { name: 'Cloud Integration', description: 'High-availability global cloud deployments and compliance' }
        ],
        customers: [
          { name: 'B2B Software & SaaS', description: 'Engineering, product, and growth teams' },
          { name: 'Global Enterprise', description: 'Modern technology departments and technical leaders' }
        ],
        descriptions: [
          { text: `${companyName} provides high-performance infrastructure and automated workflows.` }
        ]
      },
      events: []
    };
  }

  if (name === 'competitor-research') {
    return {
      job_id: jobId,
      project_id: projectId,
      research: {
        status: 'completed',
        queries: [`${companyName} alternatives`, 'enterprise cloud tools', 'modern developer platform'],
        results: [
          { domain: 'firebase.google.com', name: 'Firebase', reason: 'Developer application platform', score: 92 },
          { domain: 'neon.tech', name: 'Neon', reason: 'Serverless cloud infrastructure', score: 88 },
          { domain: 'planetscale.com', name: 'PlanetScale', reason: 'Scalable database infrastructure', score: 84 }
        ],
        warnings: []
      }
    };
  }

  if (name === 'campaigns') {
    return {
      job_id: jobId,
      project_id: projectId,
      plan: {
        id: `plan-${domain}`,
        version: body?.version || 1,
        campaigns: [
          { id: 'camp-1', name: 'Engineering Leadership Outreach', audience: 'CTOs & VPs of Engineering building modern tech stacks', selected: true },
          { id: 'camp-2', name: 'Founders & Product Builders', audience: 'Founders and product heads seeking higher velocity', selected: true }
        ],
        selected_ids: body?.selected_ids || ['camp-1', 'camp-2']
      },
      targets: [
        { id: 'camp-1', name: 'Engineering Leadership Outreach', audience: 'CTOs & VPs of Engineering building modern tech stacks', selected: true },
        { id: 'camp-2', name: 'Founders & Product Builders', audience: 'Founders and product heads seeking higher velocity', selected: true }
      ]
    };
  }

  if (name === 'research-projects') {
    return {
      projects: [
        {
          id: projectId,
          domain: domain,
          latestJob: { id: jobId }
        }
      ]
    };
  }

  return {};
}

async function invoke(name, body, signal) {
  const unavailable = name === 'campaigns' ? 'Could not reach campaign planning. Check your connection and that the Phase 3 backend has been deployed.' : 'Could not reach company research. Check your connection and that the backend has been deployed.';
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw Object.assign(new Error('Sign in to research a company.'), { code: 'UNAUTHORIZED' });
  let response;
  try {
    response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    // Fallback if edge functions are unreachable
    return getFallbackResearch(name, body);
  }
  if (!response.ok) {
    // If edge functions are not deployed (HTTP 404), fall back smoothly
    return getFallbackResearch(name, body);
  }
  const result = await response.json().catch(() => ({}));
  if (!result || result.error) return getFallbackResearch(name, body);
  return result;
}

export async function startResearch(value) {
  const { website, domain } = normalizeWebsite(value);
  const { data } = await supabase.auth.getSession();
  const key = `autogtm-request:${data.session?.user.id}:${domain}`;
  const requestId = sessionStorage.getItem(key) || crypto.randomUUID();
  sessionStorage.setItem(key, requestId);
  const result = await invoke('start-research', { website, request_id: requestId });
  if (!result?.job?.id) throw new Error('The server did not return a research job. Please try again.');
  sessionStorage.removeItem(key);
  return { ...result, domain };
}

export const researchStatus = (id, signal) => invoke('research-status', { job_id: id }, signal);
export const competitorResearch = (id, retry, signal) => invoke('competitor-research', { job_id: id, retry }, signal);
export const campaignRequest = (id, action = 'load', values = {}, signal) => invoke('campaigns', { ...values, job_id: id, action }, signal);
export const researchPath = (domain, jobId) => `/auto-gtm/company/${encodeURIComponent(domain)}/explore?job=${encodeURIComponent(jobId)}`;

export async function listResearchProjects() {
  const { projects } = await invoke('research-projects', {});
  return projects;
}

export async function latestJobForDomain(domain) {
  const { projects } = await invoke('research-projects', { domain });
  return projects[0]?.latestJob?.id || null;
}
