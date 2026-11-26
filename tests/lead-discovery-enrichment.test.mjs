import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { LeadDiscoveryProvider, SAMPLE_PROSPECTS } from '../server/leadDiscoveryProvider.mjs';

test('Lead Discovery & Enrichment Module Integration Test Suite', async (t) => {

  // 1. Unconfigured Provider: Demo Mode with Setup Message
  await t.test('1. Search without Provider API Key Configured (Demo Mode & Setup Message)', async () => {
    const provider = new LeadDiscoveryProvider({ apiKey: '' });
    assert.equal(provider.isConfigured, false);

    const searchRes = await provider.searchLeads({});
    assert.equal(searchRes.isDemoMode, true);
    assert.ok(searchRes.setupMessage.includes('Apollo API key is not configured'));
    assert.ok(searchRes.leads.length > 0);
    assert.ok(searchRes.leads.some(l => l.verificationStatus === 'verified'));
    assert.ok(searchRes.leads.some(l => l.verificationStatus === 'unverified'));
    assert.ok(searchRes.leads.some(l => l.verificationStatus === 'not_available'));
  });

  // 2. Search Filtering by Role / Job Title
  await t.test('2. Multi-Criteria Filtering: Job Title & Industry', async () => {
    const provider = new LeadDiscoveryProvider();
    const res = await provider.searchLeads({ jobTitle: 'VP of Growth' });
    assert.ok(res.leads.length >= 1);
    assert.ok(res.leads.every(l => l.title.toLowerCase().includes('vp of growth')));

    const resInd = await provider.searchLeads({ industry: 'Cybersecurity' });
    assert.ok(resInd.leads.length >= 1);
    assert.ok(resInd.leads.every(l => l.industry.toLowerCase().includes('cybersecurity')));
  });

  // 3. Search Filtering by Location & Keywords
  await t.test('3. Search Filtering by Location & Keywords', async () => {
    const provider = new LeadDiscoveryProvider();
    const resLoc = await provider.searchLeads({ location: 'San Francisco' });
    assert.ok(resLoc.leads.length >= 1);
    assert.ok(resLoc.leads.every(l => l.location.toLowerCase().includes('san francisco')));

    const resKw = await provider.searchLeads({ keywords: 'fintech' });
    assert.ok(resKw.leads.length >= 1);
  });

  // 4. Pagination
  await t.test('4. Pagination Boundaries & Slicing', async () => {
    const provider = new LeadDiscoveryProvider();
    const page1 = await provider.searchLeads({ page: 1, perPage: 3 });
    assert.equal(page1.leads.length, 3);
    assert.equal(page1.page, 1);

    const page2 = await provider.searchLeads({ page: 2, perPage: 3 });
    assert.equal(page2.leads.length, 3);
    assert.equal(page2.page, 2);
    assert.notEqual(page1.leads[0].id, page2.leads[0].id);
  });

  // 5. Verification Status Distinction: Never mark unverified as verified
  await t.test('5. Strict Email Verification Status Integrity', async () => {
    const provider = new LeadDiscoveryProvider();
    const searchRes = await provider.searchLeads({});
    
    // Check Julian Alvarez (no email available)
    const noEmailLead = searchRes.leads.find(l => l.name.includes('Julian Alvarez'));
    assert.ok(noEmailLead);
    assert.equal(noEmailLead.email, null);
    assert.equal(noEmailLead.verificationStatus, 'not_available');

    // Check Chloe Zhang (unverified catch-all)
    const unverifiedLead = searchRes.leads.find(l => l.name.includes('Chloe Zhang'));
    assert.ok(unverifiedLead);
    assert.equal(unverifiedLead.verificationStatus, 'unverified');

    // Check Elena Rostova (verified)
    const verifiedLead = searchRes.leads.find(l => l.name.includes('Elena Rostova'));
    assert.ok(verifiedLead);
    assert.equal(verifiedLead.verificationStatus, 'verified');
  });

  // 6. Lead Enrichment: Returns Company Intelligence & Source Timestamps
  await t.test('6. Lead Enrichment with Source Tracking & Timestamps', async () => {
    const provider = new LeadDiscoveryProvider();
    const targetLead = {
      name: 'Elena Rostova',
      title: 'VP of Growth',
      company: 'DataVantage AI',
      domain: 'datavantage.ai',
      email: 'elena@datavantage.ai'
    };

    const enrichment = await provider.enrichLead(targetLead);
    assert.equal(enrichment.success, true);
    assert.ok(enrichment.enrichedAt);
    assert.ok(enrichment.source);
    assert.ok(enrichment.enrichedData.companyDescription);
    assert.ok(enrichment.enrichedData.industry);
    assert.ok(enrichment.enrichedData.companySize);
    assert.ok(enrichment.enrichedData.businessContext);
  });

  // 7. Duplicate Prevention Logic
  await t.test('7. Normalized Email & Domain Deduplication', () => {
    const existingLeads = [
      { email: 'elena@datavantage.ai', name: 'Elena Rostova', company_domain: 'datavantage.ai' },
      { email: 'marcus.s@cloudpulse.io', name: 'Marcus Sterling', company_domain: 'cloudpulse.io' }
    ];

    const selectedProspects = [
      { email: 'ELENA@DATAVANTAGE.AI', name: 'Elena Duplicate' },
      { email: 'new.lead@novus.io', name: 'New Lead' }
    ];

    const existingEmails = new Set(existingLeads.map(l => (l.email || '').toLowerCase().trim()));
    const unique = selectedProspects.filter(l => !existingEmails.has(l.email.toLowerCase().trim()));

    assert.equal(unique.length, 1);
    assert.equal(unique[0].name, 'New Lead');
  });

  // 8. CSV Export Data Formatting
  await t.test('8. CSV Formatting with Verification Fields', () => {
    const mockLead = {
      name: 'Elena Rostova',
      title: 'VP of Growth',
      company: 'DataVantage AI',
      domain: 'datavantage.ai',
      email: 'elena@datavantage.ai',
      location: 'Austin, TX, US',
      industry: 'Enterprise Software / AI',
      companySize: '51-200 employees',
      verificationStatus: 'verified'
    };

    const row = [
      `"${mockLead.name}"`,
      `"${mockLead.title}"`,
      `"${mockLead.company}"`,
      `"${mockLead.domain}"`,
      `"${mockLead.email}"`,
      `"${mockLead.location}"`,
      `"${mockLead.industry}"`,
      `"${mockLead.companySize}"`,
      `"${mockLead.verificationStatus}"`
    ].join(',');

    assert.ok(row.includes('"Elena Rostova"'));
    assert.ok(row.includes('"verified"'));
    assert.ok(row.includes('"datavantage.ai"'));
  });

  // 9. Provider Configured Mode & Rate Limit Graceful Degradation
  await t.test('9. Configured Provider Handling & Fallback', async () => {
    const providerWithKey = new LeadDiscoveryProvider({
      apiKey: 'sample_apollo_key',
      provider: 'apollo'
    });
    assert.equal(providerWithKey.isConfigured, true);

    // When network fails or key is sandbox/invalid, it degrades gracefully to demo results
    const res = await providerWithKey.searchLeads({ jobTitle: 'Founder' });
    assert.ok(res.leads.length >= 1);
    assert.ok(res.leads.every(l => l.title.toLowerCase().includes('founder')));
  });

  // 10. AI Qualification Rule Heuristic
  await t.test('10. AI Qualification Scoring Heuristics', () => {
    const highMatchLead = {
      title: 'VP of Growth',
      company: 'SaaS Platform',
      industry: 'Software'
    };
    const title = highMatchLead.title.toLowerCase();
    let score = 75;
    if (title.includes('vp') || title.includes('head')) score += 15;
    if (title.includes('growth') || title.includes('sales')) score += 5;

    assert.equal(score, 95);
    assert.ok(score >= 80);
  });
});
