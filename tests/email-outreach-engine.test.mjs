import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { EmailProvider } from '../server/emailProvider.mjs';
import { EmailQueueWorker } from '../server/emailQueueWorker.mjs';

test('Email Outreach Engine Integration Test Suite', async (t) => {
  // Mock Supabase admin client for unit testing
  const mockSupabase = {
    from: () => ({
      select: () => ({ in: () => ({ lte: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }) }) }),
      insert: () => ({ error: null }),
      update: () => ({ eq: () => ({ error: null }) }),
    })
  };

  const worker = new EmailQueueWorker(mockSupabase, { pollIntervalMs: 10000 });
  const userId = '11111111-1111-4111-a111-111111111111';
  const campaignId = 'camp-growth-series-a';

  await t.test('1. Provider Abstraction: Mock and Sandbox Verification', async () => {
    const provider = new EmailProvider({ provider: 'mock', testMode: true });
    const verifyResult = await provider.verifySender('alex@mycompany.com');
    assert.equal(verifyResult.verified, true);
    assert.equal(verifyResult.domain, 'mycompany.com');
    assert.equal(verifyResult.spf, 'PASS');
    assert.equal(verifyResult.dkim, 'PASS');
    assert.equal(verifyResult.dmarc, 'PASS');
  });

  await t.test('2. Provider Abstraction: Send Email with Idempotency and Compliance Headers', async () => {
    const provider = new EmailProvider({ provider: 'mock', testMode: false });
    const result = await provider.sendEmail({
      to: 'target-lead@enterprise.com',
      from: 'alex@mycompany.com',
      fromName: 'Alex Rivera',
      subject: 'Quick question regarding outbound pipeline',
      html: '<p>Hi Lead, would love to connect.</p>',
      text: 'Hi Lead, would love to connect.',
      unsubscribeUrl: 'http://localhost:3000/api/email/unsubscribe?email=target-lead@enterprise.com',
      idempotencyKey: 'idem_key_12345'
    });

    assert.equal(result.success, true);
    assert.ok(result.messageId.startsWith('mock_msg_'));
    assert.equal(result.recipient, 'target-lead@enterprise.com');
  });

  await t.test('3. Test Mode Routing: Redirects to test recipient', async () => {
    const provider = new EmailProvider({
      provider: 'mock',
      testMode: true,
      testRecipient: 'safety-sandbox@mycompany.com'
    });

    const result = await provider.sendEmail({
      to: 'real-prospect@external-company.com',
      from: 'alex@mycompany.com',
      subject: 'Test subject',
      html: 'Hello',
      text: 'Hello',
    });

    assert.equal(result.recipient, 'safety-sandbox@mycompany.com');
  });

  await t.test('4. Queue Worker: Respects Campaign Paused Status', async () => {
    const pausedJob = {
      id: 'job_test_paused',
      user_id: userId,
      campaign_id: campaignId,
      lead_id: 'lead_1',
      recipient_email: 'lead1@corp.com',
      subject: 'Hello',
      rendered_body: 'Hello',
      scheduled_for: new Date(Date.now() - 1000).toISOString(),
      status: 'scheduled',
      campaign_status: 'Paused'
    };

    worker.memoryJobs.set(pausedJob.id, pausedJob);
    const sent = await worker.processSingleJob(pausedJob, false);
    assert.equal(sent, false);
    assert.equal(worker.memoryJobs.get('job_test_paused').status, 'scheduled');
  });

  await t.test('5. Follow-up Cancellation: Skips lead if Replied or Not Interested', async () => {
    const repliedJob = {
      id: 'job_test_replied',
      user_id: userId,
      campaign_id: campaignId,
      lead_id: 'lead_2',
      recipient_email: 'lead2@corp.com',
      subject: 'Follow-up Step 2',
      rendered_body: 'Following up on our email',
      scheduled_for: new Date(Date.now() - 1000).toISOString(),
      status: 'scheduled',
      campaign_status: 'Active',
      lead_status: 'Replied'
    };

    worker.memoryJobs.set(repliedJob.id, repliedJob);
    const sent = await worker.processSingleJob(repliedJob, false);
    assert.equal(sent, false);
    assert.equal(worker.memoryJobs.get('job_test_replied').status, 'skipped');
  });

  await t.test('6. Unsubscribe Suppression: Prevents send to suppressed emails', async () => {
    worker.memorySuppressions.add('optout-lead@corp.com');

    const suppressedJob = {
      id: 'job_test_suppressed',
      user_id: userId,
      campaign_id: campaignId,
      lead_id: 'lead_3',
      recipient_email: 'optout-lead@corp.com',
      subject: 'Intro',
      rendered_body: 'Intro text',
      scheduled_for: new Date(Date.now() - 1000).toISOString(),
      status: 'scheduled',
      campaign_status: 'Active',
      lead_status: 'Researched'
    };

    worker.memoryJobs.set(suppressedJob.id, suppressedJob);
    const sent = await worker.processSingleJob(suppressedJob, false);
    assert.equal(sent, false);
    assert.equal(worker.memoryJobs.get('job_test_suppressed').status, 'skipped');
  });

  await t.test('7. Active Queue Send & Event Audit', async () => {
    const validJob = {
      id: 'job_test_active',
      user_id: userId,
      campaign_id: campaignId,
      lead_id: 'lead_4',
      recipient_email: 'active-prospect@corp.com',
      subject: 'Excited to connect with Corp',
      rendered_body: 'Hi Prospect,\n\nSaw your expansion.',
      scheduled_for: new Date(Date.now() - 1000).toISOString(),
      status: 'scheduled',
      campaign_status: 'Active',
      lead_status: 'Researched',
      idempotency_key: 'idem_valid_job_4',
      daily_limit: 35
    };

    worker.memoryJobs.set(validJob.id, validJob);
    const sent = await worker.processSingleJob(validJob, false);
    assert.equal(sent, true);
    assert.equal(worker.memoryJobs.get('job_test_active').status, 'sent');
    assert.ok(worker.memoryJobs.get('job_test_active').provider_message_id);

    // Verify event audit trail
    const recordedEvents = worker.memoryEvents.filter(e => e.job_id === 'job_test_active');
    assert.equal(recordedEvents.length, 1);
    assert.equal(recordedEvents[0].event_type, 'sent');
  });

  await t.test('8. Transient Error Retry & Exponential Backoff', async () => {
    const retryJob = {
      id: 'job_test_retry',
      user_id: userId,
      campaign_id: campaignId,
      lead_id: 'lead_5',
      recipient_email: 'error-lead@corp.com',
      subject: 'Retry test',
      rendered_body: 'Retry test body',
      scheduled_for: new Date(Date.now() - 1000).toISOString(),
      status: 'scheduled',
      campaign_status: 'Active',
      lead_status: 'Researched',
      attempt_count: 1,
      max_attempts: 3
    };

    // Temporarily inject transient error into provider
    const origSend = worker.provider.sendEmail;
    worker.provider.sendEmail = async () => {
      const err = new Error('HTTP 429 Rate Limit Exceeded');
      err.isTransient = true;
      throw err;
    };

    worker.memoryJobs.set(retryJob.id, retryJob);
    const sent = await worker.processSingleJob(retryJob, false);
    assert.equal(sent, false);

    // Verify it was rescheduled with backoff rather than marked failed
    const updatedJob = worker.memoryJobs.get('job_test_retry');
    assert.equal(updatedJob.status, 'scheduled');
    assert.equal(updatedJob.attempt_count, 2);
    assert.ok(new Date(updatedJob.scheduled_for).getTime() > Date.now());

    // Restore provider
    worker.provider.sendEmail = origSend;
  });
});
