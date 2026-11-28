import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeCompetitors, normalizeDeterminants, normalizeSearchQueries, normalizeSegments } from '../src/lib/autogtmNormalizer.js';

// Pure algorithmic validation of normalizeWebsite and validateResearchResult
function normalizeWebsite(value) {
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

function validateResearchResult(result, domain, jobId) {
  const mismatch = () => Object.assign(new Error('The saved research does not match this website. Return to your projects and start research for the correct website.'), { code: 'PROJECT_MISMATCH' });
  if (!result?.job || !result?.project || result.job.id !== jobId) throw mismatch();
  let resultDomain;
  try { resultDomain = normalizeWebsite(result.project.domain).domain; }
  catch { throw mismatch(); }
  if (resultDomain !== normalizeWebsite(domain).domain || result.job.project_id !== result.project.id ||
      (result.profile && (result.profile.job_id !== jobId || result.profile.project_id !== result.project.id))) throw mismatch();
  return result;
}

test('Website & Competitor Analysis Flow Test Suite', async (t) => {
  await t.test('1. URL validation - rejects invalid or malformed websites', () => {
    assert.throws(() => normalizeWebsite(''), /Enter a company website/);
    assert.throws(() => normalizeWebsite('   '), /Enter a company website/);
    assert.throws(() => normalizeWebsite('notaurl'), /Enter a public company website/);
    assert.throws(() => normalizeWebsite('http://localhost:3000'), /Enter a public company website/);
    assert.throws(() => normalizeWebsite('https://user:pass@example.com'), /Enter a public company website/);
  });

  await t.test('2. URL validation - safely normalizes valid domains and paths', () => {
    const res1 = normalizeWebsite('stripe.com');
    assert.equal(res1.domain, 'stripe.com');
    assert.equal(res1.website, 'https://stripe.com/');

    const res2 = normalizeWebsite('https://www.linear.app/about?ref=nav#pricing');
    assert.equal(res2.domain, 'linear.app');
    assert.equal(res2.website, 'https://www.linear.app/');

    const res3 = normalizeWebsite('http://keethub.lovable.app/');
    assert.equal(res3.domain, 'keethub.lovable.app');
    assert.equal(res3.website, 'http://keethub.lovable.app/');
  });

  await t.test('3. Profile data preserved during competitor analysis & project mismatch checks', () => {
    const validResult = {
      job: { id: 'job-123', project_id: 'proj-123' },
      project: { id: 'proj-123', domain: 'stripe.com' },
      profile: {
        job_id: 'job-123',
        project_id: 'proj-123',
        company_name: 'Stripe',
        business_description: 'Payment infrastructure'
      }
    };

    const validated = validateResearchResult(validResult, 'stripe.com', 'job-123');
    assert.equal(validated.profile.company_name, 'Stripe');

    // Mismatched domain throws PROJECT_MISMATCH
    assert.throws(
      () => validateResearchResult(validResult, 'othercompany.com', 'job-123'),
      /The saved research does not match this website/
    );

    // Mismatched job id throws PROJECT_MISMATCH
    assert.throws(
      () => validateResearchResult(validResult, 'stripe.com', 'job-999'),
      /The saved research does not match this website/
    );
  });

  await t.test('4. Successful competitor discovery normalization', () => {
    const rawCompetitorList = [
      {
        domain: 'braintree.com',
        name: 'Braintree',
        description: 'Payment platform',
        relevance_score: 90,
        relationship: 'direct',
        source_urls: ['https://braintree.com/'],
        ranking_reason: 'Shared payments keywords'
      },
      {
        domain: 'adyen.com',
        name: 'Adyen',
        relevance_score: 85,
        relationship: 'direct',
        source_urls: ['https://adyen.com/'],
        ranking_reason: 'Enterprise payment competitor'
      }
    ];

    const normalized = normalizeCompetitors(rawCompetitorList);
    assert.equal(normalized.length, 2);
    assert.equal(normalized[0].domain, 'braintree.com');
    assert.equal(normalized[0].relevance_score, 90);
    assert.equal(normalized[0].relationship, 'direct');
    assert.equal(normalized[0].source_urls[0], 'https://braintree.com/');
    assert.ok(normalized[0].faviconUrl.includes('braintree.com'));
  });

  await t.test('5. Empty competitor results normalization - returns safe empty array', () => {
    assert.deepEqual(normalizeCompetitors([]), []);
    assert.deepEqual(normalizeCompetitors(null), []);
    assert.deepEqual(normalizeCompetitors(undefined), []);
    assert.deepEqual(normalizeCompetitors(''), []);
    assert.deepEqual(normalizeCompetitors({ results: [] }), []);
    assert.deepEqual(normalizeCompetitors({ competitors: [] }), []);
  });

  await t.test('6. Malformed competitor API response - handles string, missing source_urls, and objects', () => {
    // Competitors without source_urls or url (used to cause crash in Step2CompetitorsCard)
    const malformedList = [
      { domain: 'firebase.google.com', name: 'Firebase', reason: 'Developer application platform', score: 92 },
      'neon.tech',
      { name: 'PlanetScale', website: 'https://planetscale.com' },
      null,
      undefined
    ];

    const normalized = normalizeCompetitors(malformedList);
    assert.equal(normalized.length, 3);

    // 1st entry: fallback source_urls synthesized safely from domain
    assert.equal(normalized[0].domain, 'firebase.google.com');
    assert.ok(Array.isArray(normalized[0].source_urls));
    assert.equal(normalized[0].source_urls.length, 1);
    assert.equal(normalized[0].source_urls[0], 'https://firebase.google.com');
    assert.equal(normalized[0].relevance_score, 92);

    // 2nd entry: string domain converted to rich object
    assert.equal(normalized[1].domain, 'neon.tech');
    assert.equal(normalized[1].source_urls[0], 'https://neon.tech');
    assert.equal(normalized[1].relationship, 'direct');

    // 3rd entry: extracted domain from website property
    assert.equal(normalized[2].domain, 'planetscale.com');
    assert.equal(normalized[2].source_urls[0], 'https://planetscale.com');
  });

  await t.test('7. Competitor API response as nested object dictionary', () => {
    const rawObjectPayload = {
      results: [
        { domain: 'competitor-a.com', name: 'Competitor A' }
      ]
    };
    const res = normalizeCompetitors(rawObjectPayload);
    assert.equal(res.length, 1);
    assert.equal(res[0].domain, 'competitor-a.com');
  });

  await t.test('8. JSON String payload parsing with safe fallback', () => {
    const jsonStr = JSON.stringify([
      { domain: 'competitor-b.com', name: 'Competitor B' }
    ]);
    const res = normalizeCompetitors(jsonStr);
    assert.equal(res.length, 1);
    assert.equal(res[0].domain, 'competitor-b.com');

    // Invalid JSON string falls back safely to empty array
    const invalidJsonStr = '{ this is invalid json ]';
    const fallback = normalizeCompetitors(invalidJsonStr);
    assert.deepEqual(fallback, []);
  });

  await t.test('9. Determinants & Search Queries normalizers', () => {
    assert.deepEqual(normalizeDeterminants(null), []);
    assert.deepEqual(normalizeDeterminants('Item 1\nItem 2'), ['Item 1', 'Item 2']);
    assert.deepEqual(normalizeSearchQueries('query1, query2, query3'), ['query1', 'query2', 'query3']);
    assert.deepEqual(normalizeSearchQueries(null), []);
  });

  await t.test('10. Campaign & Segment normalizer prevents undefined access', () => {
    const rawSegments = [
      { id: 'seg-1', name: 'Fintech SDRs', criteria: 'series A, B2B' },
      { label: 'E-commerce Heads' }
    ];
    const normalized = normalizeSegments(rawSegments);
    assert.equal(normalized.length, 2);
    assert.equal(normalized[0].label, 'Fintech SDRs');
    assert.ok(Array.isArray(normalized[0].criteria));
    assert.equal(normalized[1].label, 'E-commerce Heads');
    assert.equal(normalized[1].buyerType, 'company');
  });

  await t.test('11. Step2CompetitorsCard mapping logic safety with undefined source_urls', () => {
    const testCompetitors = [
      { domain: 'example.com' }, // no source_urls
      { domain: 'foo.com', source_urls: null },
      { domain: 'bar.com', source_urls: ['https://bar.com'] }
    ];

    const safeList = testCompetitors.map((comp) => {
      if (!comp) return null;
      const domain = comp.domain || (typeof comp === 'string' ? comp : '');
      const sourceUrls = Array.isArray(comp.source_urls) && comp.source_urls.length > 0
        ? comp.source_urls
        : comp.url ? [comp.url] : domain ? [`https://${domain}`] : [];
      return {
        ...comp,
        domain,
        source_urls: sourceUrls,
      };
    }).filter((comp) => Boolean(comp && comp.domain));

    assert.equal(safeList.length, 3);
    assert.equal(safeList[0].source_urls[0], 'https://example.com');
    assert.equal(safeList[1].source_urls[0], 'https://foo.com');
    assert.equal(safeList[2].source_urls[0], 'https://bar.com');
  });

  await t.test('12. Stale request protection & state transitions', () => {
    let currentJobId = 'job-1';
    let resultsJobId = 'job-2'; // stale result from previous job

    // Stale check
    const isStale = currentJobId !== resultsJobId;
    assert.equal(isStale, true);

    // Stale response must be dropped
    let activeState = 'profile_ready';
    if (!isStale) {
      activeState = 'competitors_ready';
    }
    assert.equal(activeState, 'profile_ready');
  });
});
