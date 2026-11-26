import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { AnalyticsService } from '../server/analyticsService.mjs';
import { EmailQueueWorker } from '../server/emailQueueWorker.mjs';
import { InboundEmailService } from '../server/inboundEmailService.mjs';

test('Campaign Analytics & Performance Dashboard Test Suite', async (t) => {
  const userId = 'user-test-uuid-1';
  const campaignId = 'camp-analytics-uuid-1';
  const campaignId2 = 'camp-analytics-uuid-2';

  // Mock Supabase
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => null,
            order: () => ({ data: [] }),
          }),
          gte: () => ({
            lte: () => ({ data: [] }),
          }),
          order: () => ({ data: [] }),
          maybeSingle: async () => null,
        }),
        order: () => ({ data: [] }),
      }),
      insert: async () => ({ error: null }),
      update: () => ({ eq: async () => ({ error: null }) }),
      upsert: async () => ({ error: null }),
    }),
  };

  const emailWorker = new EmailQueueWorker(mockSupabase, { pollIntervalMs: 10000 });
  const inboundService = new InboundEmailService(mockSupabase, emailWorker, { webhookSecret: 'test_secret' });
  const analyticsService = new AnalyticsService(mockSupabase, emailWorker, inboundService);

  // Setup seed jobs and events in memory
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();

  // Seed events
  emailWorker.memoryEvents = [
    // Current period (last 30d): 10 sent, 9 delivered, 1 bounced, 3 replies from 2 leads, 1 positive, 1 unsub
    { id: 'e1', user_id: userId, campaign_id: campaignId, lead_id: 'lead-1', event_type: 'sent', created_at: twoDaysAgo, metadata: { step_number: 1 } },
    { id: 'e2', user_id: userId, campaign_id: campaignId, lead_id: 'lead-2', event_type: 'sent', created_at: twoDaysAgo, metadata: { step_number: 1 } },
    { id: 'e3', user_id: userId, campaign_id: campaignId, lead_id: 'lead-3', event_type: 'sent', created_at: twoDaysAgo, metadata: { step_number: 1 } },
    { id: 'e4', user_id: userId, campaign_id: campaignId, lead_id: 'lead-4', event_type: 'sent', created_at: tenDaysAgo, metadata: { step_number: 2 } },
    { id: 'e5', user_id: userId, campaign_id: campaignId, lead_id: 'lead-5', event_type: 'sent', created_at: tenDaysAgo, metadata: { step_number: 2 } },
    { id: 'e6', user_id: userId, campaign_id: campaignId, lead_id: 'lead-6', event_type: 'sent', created_at: tenDaysAgo, metadata: { step_number: 2 } },
    { id: 'e7', user_id: userId, campaign_id: campaignId, lead_id: 'lead-7', event_type: 'sent', created_at: tenDaysAgo, metadata: { step_number: 2 } },
    { id: 'e8', user_id: userId, campaign_id: campaignId, lead_id: 'lead-8', event_type: 'sent', created_at: tenDaysAgo, metadata: { step_number: 1 } },
    { id: 'e9', user_id: userId, campaign_id: campaignId, lead_id: 'lead-9', event_type: 'sent', created_at: tenDaysAgo, metadata: { step_number: 1 } },
    { id: 'e10', user_id: userId, campaign_id: campaignId, lead_id: 'lead-10', event_type: 'sent', created_at: tenDaysAgo, metadata: { step_number: 1 } },

    // Bounces
    { id: 'e11', user_id: userId, campaign_id: campaignId, lead_id: 'lead-10', event_type: 'bounced', created_at: tenDaysAgo, metadata: { step_number: 1 } },

    // Delivered
    { id: 'e12', user_id: userId, campaign_id: campaignId, lead_id: 'lead-1', event_type: 'delivered', created_at: twoDaysAgo },
    { id: 'e13', user_id: userId, campaign_id: campaignId, lead_id: 'lead-2', event_type: 'delivered', created_at: twoDaysAgo },
    { id: 'e14', user_id: userId, campaign_id: campaignId, lead_id: 'lead-3', event_type: 'delivered', created_at: twoDaysAgo },
    { id: 'e15', user_id: userId, campaign_id: campaignId, lead_id: 'lead-4', event_type: 'delivered', created_at: tenDaysAgo },
    { id: 'e16', user_id: userId, campaign_id: campaignId, lead_id: 'lead-5', event_type: 'delivered', created_at: tenDaysAgo },
    { id: 'e17', user_id: userId, campaign_id: campaignId, lead_id: 'lead-6', event_type: 'delivered', created_at: tenDaysAgo },
    { id: 'e18', user_id: userId, campaign_id: campaignId, lead_id: 'lead-7', event_type: 'delivered', created_at: tenDaysAgo },
    { id: 'e19', user_id: userId, campaign_id: campaignId, lead_id: 'lead-8', event_type: 'delivered', created_at: tenDaysAgo },
    { id: 'e20', user_id: userId, campaign_id: campaignId, lead_id: 'lead-9', event_type: 'delivered', created_at: tenDaysAgo },

    // Replies: lead-1 replies TWICE (duplicate check), lead-2 replies ONCE with positive interest
    { id: 'e21', user_id: userId, campaign_id: campaignId, lead_id: 'lead-1', event_type: 'replied', created_at: twoDaysAgo, metadata: { step_number: 1, classification: 'Asking a question' } },
    { id: 'e22', user_id: userId, campaign_id: campaignId, lead_id: 'lead-1', event_type: 'replied', created_at: twoDaysAgo, metadata: { step_number: 1, classification: 'Asking a question' } },
    { id: 'e23', user_id: userId, campaign_id: campaignId, lead_id: 'lead-2', event_type: 'replied', is_positive: true, created_at: twoDaysAgo, metadata: { step_number: 1, classification: 'Interested', is_positive: true } },

    // Unsubscribes: lead-3 unsubscribes
    { id: 'e24', user_id: userId, campaign_id: campaignId, lead_id: 'lead-3', event_type: 'unsubscribed', created_at: twoDaysAgo },

    // Previous period event (40 days ago) for delta testing
    { id: 'e25', user_id: userId, campaign_id: campaignId, lead_id: 'lead-99', event_type: 'sent', created_at: fortyDaysAgo },
    { id: 'e26', user_id: userId, campaign_id: campaignId, lead_id: 'lead-99', event_type: 'delivered', created_at: fortyDaysAgo },
  ];

  // Seed memory jobs
  for (let i = 1; i <= 10; i++) {
    emailWorker.memoryJobs.set(`job_${i}`, {
      id: `job_${i}`,
      user_id: userId,
      campaign_id: campaignId,
      lead_id: `lead-${i}`,
      recipient_email: `lead${i}@example.com`,
      recipient_name: `Lead ${i}`,
      status: i === 10 ? 'failed' : 'sent',
      step_id: i <= 3 ? 'step_1' : 'step_2',
      step_number: i <= 3 ? 1 : 2,
      created_at: twoDaysAgo,
    });
  }

  // 1. Overview Metrics Calculation
  await t.test('1. Overview KPI Metrics Calculation', async () => {
    const overview = await analyticsService.getOverview({ userId, campaignId, period: '30d' });
    assert.ok(overview.success !== false);
    assert.equal(overview.metrics.sent, 10, 'Expected 10 sent emails');
    assert.equal(overview.metrics.delivered, 9, 'Expected 9 delivered emails');
    assert.equal(overview.metrics.bounces, 1, 'Expected 1 bounce');
    assert.equal(overview.metrics.unsubscribes, 1, 'Expected 1 unsubscribe');
  });

  // 2. Strict Mathematical Denominators
  await t.test('2. Adherence to Strict Denominators', async () => {
    const overview = await analyticsService.getOverview({ userId, campaignId, period: '30d' });
    const { metrics } = overview;

    // Delivery Rate: Delivered / Sent * 100 = 9 / 10 * 100 = 90.0%
    assert.equal(metrics.delivery_rate, 90.0, 'Delivery rate must be Delivered / Sent * 100');

    // Reply Rate: Unique replied leads / Delivered * 100 = 2 / 9 * 100 = 22.2%
    assert.equal(metrics.reply_rate, 22.2, 'Reply rate must be Unique Replied Leads / Delivered * 100');

    // Positive Reply Rate: Unique positive leads / Delivered * 100 = 1 / 9 * 100 = 11.1%
    assert.equal(metrics.positive_reply_rate, 11.1, 'Positive reply rate must be Unique Positive Leads / Delivered * 100');

    // Bounce Rate: Bounces / Sent * 100 = 1 / 10 * 100 = 10.0%
    assert.equal(metrics.bounce_rate, 10.0, 'Bounce rate must be Bounces / Sent * 100');

    // Unsubscribe Rate: Unique unsubscribes / Delivered * 100 = 1 / 9 * 100 = 11.1%
    assert.equal(metrics.unsubscribe_rate, 11.1, 'Unsubscribe rate must be Unique Unsubscribes / Delivered * 100');
  });

  // 3. Safe Handling of Zero Denominators
  await t.test('3. Safe Zero Denominator Handling', () => {
    assert.equal(analyticsService.calcRate(0, 0), 0.0);
    assert.equal(analyticsService.calcRate(10, 0), 0.0);
    assert.equal(analyticsService.calcRate(0, 10), 0.0);
    const zeroMetrics = analyticsService.computeMetrics([]);
    assert.equal(zeroMetrics.delivery_rate, 0.0);
    assert.equal(zeroMetrics.reply_rate, 0.0);
    assert.equal(zeroMetrics.positive_reply_rate, 0.0);
    assert.equal(zeroMetrics.bounce_rate, 0.0);
    assert.equal(zeroMetrics.unsubscribe_rate, 0.0);
  });

  // 4. Lead Deduplication for Reply Rates
  await t.test('4. Deduplication of Multiple Replies from Same Lead', async () => {
    const overview = await analyticsService.getOverview({ userId, campaignId, period: '30d' });
    // lead-1 sent 2 reply events, lead-2 sent 1 => Total unique replied leads = 2
    assert.equal(overview.metrics.replies, 2, 'Must deduplicate multiple replies from same lead');
  });

  // 5. Previous Period Comparison & Delta Generation
  await t.test('5. Previous Period Comparison & Deltas', async () => {
    const overview = await analyticsService.getOverview({ userId, campaignId, period: '30d' });
    assert.ok(overview.previous_metrics, 'Previous metrics must be computed');
    assert.equal(overview.previous_metrics.sent, 1, 'Previous period had 1 sent email');
    assert.equal(overview.deltas.sent_change, 9, 'Sent change should be 10 - 1 = 9');
    assert.ok(typeof overview.deltas.delivery_rate_change === 'number');
  });

  // 6. All-Time Period Handling (No Division Errors)
  await t.test('6. All-Time Period Graceful Deltas', async () => {
    const overview = await analyticsService.getOverview({ userId, campaignId, period: 'all' });
    assert.equal(overview.metrics.sent, 11, 'All-time includes previous period email');
    assert.equal(overview.deltas.sent_change, 0);
  });

  // 7. Custom Date Range Filtering
  await t.test('7. Custom Date Range Filtering', async () => {
    const start = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const end = now.toISOString();
    const overview = await analyticsService.getOverview({ userId, campaignId, startDate: start, endDate: end });
    // Only twoDaysAgo events: 3 sent
    assert.equal(overview.metrics.sent, 3);
  });

  // 8. Time-Series Trends Aggregation (Daily, Weekly, Monthly)
  await t.test('8. Continuous Time-Series Trends with Zero-Padding', async () => {
    const trendsDaily = await analyticsService.getTrends({ userId, campaignId, interval: 'daily', range: '7d' });
    assert.ok(Array.isArray(trendsDaily.data));
    assert.ok(trendsDaily.data.length >= 7, 'Must have at least 7 daily data points');
    assert.ok(trendsDaily.data.some(d => d.sent === 3), 'Must capture 3 sent emails on twoDaysAgo');

    const trendsWeekly = await analyticsService.getTrends({ userId, campaignId, interval: 'weekly', range: '30d' });
    assert.ok(Array.isArray(trendsWeekly.data));
    assert.ok(trendsWeekly.data.length > 0);
  });

  // 9. Campaign Table Aggregation & Search Filtering
  await t.test('9. Campaign Performance Table Search Filtering', async () => {
    const res = await analyticsService.getCampaigns({ userId, search: 'NonExistent' });
    assert.equal(res.campaigns.length, 0);

    const resMatch = await analyticsService.getCampaigns({ userId, search: 'Campaign' });
    assert.ok(resMatch.campaigns.length > 0);
  });

  // 10. Campaign Table Status Filtering
  await t.test('10. Campaign Performance Table Status Filtering', async () => {
    const resActive = await analyticsService.getCampaigns({ userId, status: 'Active' });
    assert.ok(resActive.campaigns.every(c => c.status.toLowerCase() === 'active'));

    const resPaused = await analyticsService.getCampaigns({ userId, status: 'Paused' });
    assert.equal(resPaused.campaigns.length, 0);
  });

  // 11. Campaign Table Column Sorting
  await t.test('11. Campaign Performance Table Column Sorting', async () => {
    const resDesc = await analyticsService.getCampaigns({ userId, sortBy: 'sent', sortOrder: 'desc' });
    const resAsc = await analyticsService.getCampaigns({ userId, sortBy: 'sent', sortOrder: 'asc' });
    assert.ok(resDesc.campaigns);
    assert.ok(resAsc.campaigns);
  });

  // 12. Campaign Table Pagination
  await t.test('12. Campaign Performance Table Pagination Boundaries', async () => {
    const res = await analyticsService.getCampaigns({ userId, page: 1, limit: 5 });
    assert.equal(res.pagination.page, 1);
    assert.equal(res.pagination.limit, 5);
    assert.ok(res.pagination.total >= 1);
  });

  // 13. Campaign Detail View Funnel Stages
  await t.test('13. Campaign Conversion Funnel Stages', async () => {
    const detail = await analyticsService.getCampaignDetail({ userId, campaignId });
    assert.ok(detail.funnel);
    assert.equal(detail.funnel.stages.length, 5, 'Must have 5 funnel stages');
    const stageNames = detail.funnel.stages.map(s => s.stage);
    assert.deepEqual(stageNames, ['Targeted Leads', 'Emails Sent', 'Delivered', 'Replies', 'Positive Replies']);
  });

  // 14. Funnel Drop-off and Conversion Percentage Accuracy
  await t.test('14. Funnel Conversion and Drop-off Accuracy', async () => {
    const detail = await analyticsService.getCampaignDetail({ userId, campaignId });
    const deliveredStage = detail.funnel.stages.find(s => s.stage === 'Delivered');
    assert.ok(deliveredStage.count >= 9);
    assert.ok(typeof deliveredStage.conversion_rate === 'number');
    assert.ok(typeof deliveredStage.drop_off_pct === 'number');
  });

  // 15. Sequence Step Performance Breakdown
  await t.test('15. Sequence Step Breakdown Performance', async () => {
    const seq = await analyticsService.getSequencePerformance({ userId, campaignId });
    assert.ok(Array.isArray(seq.steps));
    assert.ok(seq.steps.length >= 2);
    const step1 = seq.steps.find(s => s.step_number === 1);
    assert.ok(step1);
    assert.ok(step1.sent > 0);
    assert.ok(typeof step1.reply_rate === 'number');
  });

  // 16. Reply Classification & Sentiment Breakdown
  await t.test('16. Reply Intent & Sentiment Distribution', async () => {
    const rep = await analyticsService.getRepliesBreakdown({ userId, campaignId });
    assert.ok(rep.breakdown);
    const interested = rep.breakdown.find(b => b.category === 'interested');
    assert.ok(interested);
    assert.ok(interested.count >= 1);
  });

  // 17. CSV Export for Campaigns with Formula Injection Protection
  await t.test('17. CSV Export Sanitization (Formula Injection Defense)', async () => {
    assert.equal(analyticsService.sanitizeCsvCell('=SUM(A1:A10)'), `'=SUM(A1:A10)`);
    assert.equal(analyticsService.sanitizeCsvCell('=SUM(A1, B1)'), `"'=SUM(A1, B1)"`);
    assert.equal(analyticsService.sanitizeCsvCell('+12345'), `'+12345`);
    assert.equal(analyticsService.sanitizeCsvCell('@cmd'), `'@cmd`);
    assert.equal(analyticsService.sanitizeCsvCell('-500'), `'-500`);
    assert.equal(analyticsService.sanitizeCsvCell('\ttab'), `'\ttab`);
    assert.equal(analyticsService.sanitizeCsvCell('Normal Text'), 'Normal Text');

    const csvRes = await analyticsService.exportCsv({ userId, type: 'campaigns' });
    assert.ok(csvRes.csv.includes('Campaign Name,Status,Created Date,Targeted Leads,Sent'));
    assert.ok(!csvRes.csv.startsWith('='));
  });

  // 18. CSV Export for Campaign Leads
  await t.test('18. CSV Export for Campaign Leads Activity', async () => {
    const csvLeads = await analyticsService.exportCsv({ userId, type: 'campaign_leads', campaignId });
    assert.ok(csvLeads.csv.includes('Lead Name,Email,Company,Job Title,Status'));
    assert.ok(csvLeads.filename.includes('campaign_leads'));
  });

  // 19. Webhook Ingestion Records Audit Telemetry
  await t.test('19. Delivery and Bounce Webhook Telemetry Ingestion', () => {
    const hookEvt = {
      id: 'hook_1',
      user_id: userId,
      campaign_id: campaignId,
      lead_id: 'lead-test-hook',
      event_type: 'delivered',
      provider_message_id: 'provider_msg_001',
      created_at: new Date().toISOString(),
    };
    emailWorker.memoryEvents.push(hookEvt);
    const metrics = analyticsService.computeMetrics(emailWorker.memoryEvents);
    assert.ok(metrics.delivered >= 10);
  });

  // 20. Live Server API Endpoints Integration Test
  await t.test('20. HTTP Endpoints (/api/analytics/overview, trends, campaigns, export)', async () => {
    const baseUrl = 'http://127.0.0.1:3001';
    const headers = { Authorization: 'Bearer test_token' };

    // Overview
    const ovRes = await fetch(`${baseUrl}/api/analytics/overview?period=7d`, { headers });
    assert.equal(ovRes.status, 200);
    const ovJson = await ovRes.json();
    assert.equal(ovJson.success, true);
    assert.ok(ovJson.metrics);

    // Trends
    const trRes = await fetch(`${baseUrl}/api/analytics/trends?range=7d&interval=daily`, { headers });
    assert.equal(trRes.status, 200);
    const trJson = await trRes.json();
    assert.equal(trJson.success, true);
    assert.ok(Array.isArray(trJson.data));

    // Campaigns
    const campRes = await fetch(`${baseUrl}/api/analytics/campaigns`, { headers });
    assert.equal(campRes.status, 200);
    const campJson = await campRes.json();
    assert.equal(campJson.success, true);
    assert.ok(Array.isArray(campJson.campaigns));

    // Detail & Subpaths
    const detailRes = await fetch(`${baseUrl}/api/analytics/campaigns/${campaignId}`, { headers });
    assert.equal(detailRes.status, 200);
    const detailJson = await detailRes.json();
    assert.equal(detailJson.success, true);

    const seqRes = await fetch(`${baseUrl}/api/analytics/campaigns/${campaignId}/sequence`, { headers });
    assert.equal(seqRes.status, 200);

    const repRes = await fetch(`${baseUrl}/api/analytics/campaigns/${campaignId}/replies`, { headers });
    assert.equal(repRes.status, 200);

    // Export CSV
    const expRes = await fetch(`${baseUrl}/api/analytics/export?type=campaigns`, { headers });
    assert.equal(expRes.status, 200);
    assert.ok(expRes.headers.get('content-type').includes('text/csv'));
    const csvContent = await expRes.text();
    assert.ok(csvContent.includes('Campaign Name'));
  });
});
