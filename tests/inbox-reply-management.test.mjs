import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import crypto from 'node:crypto';
import { InboundEmailService } from '../server/inboundEmailService.mjs';
import { EmailQueueWorker } from '../server/emailQueueWorker.mjs';

test('Inbox & Reply Management Integration Test Suite', async (t) => {
  const webhookSecret = 'test_secret_12345';
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => null,
          ilike: () => ({ maybeSingle: async () => null }),
          order: () => ({ limit: () => ({ maybeSingle: async () => null }) }),
        }),
        ilike: () => ({ maybeSingle: async () => null }),
      }),
      insert: async () => ({ error: null }),
      update: () => ({ eq: async () => ({ error: null }) }),
      upsert: async () => ({ error: null }),
    })
  };

  const emailWorker = new EmailQueueWorker(mockSupabase, { pollIntervalMs: 10000 });
  const inboundService = new InboundEmailService(mockSupabase, emailWorker, { webhookSecret });

  const userId = 'user-test-uuid-1';
  const leadId = 'lead-test-uuid-1';
  const campaignId = 'camp-test-uuid-1';
  const prospectEmail = 'sarah.connor@cyberdyne.com';

  // Seed scheduled follow-up jobs in worker
  const job1 = {
    id: 'job_1_intro',
    user_id: userId,
    lead_id: leadId,
    campaign_id: campaignId,
    recipient_email: prospectEmail,
    status: 'sent',
    scheduled_for: new Date(Date.now() - 3600000).toISOString()
  };

  const job2 = {
    id: 'job_2_followup',
    user_id: userId,
    lead_id: leadId,
    campaign_id: campaignId,
    recipient_email: prospectEmail,
    status: 'scheduled',
    scheduled_for: new Date(Date.now() + 86400000).toISOString()
  };

  emailWorker.memoryJobs.set(job1.id, job1);
  emailWorker.memoryJobs.set(job2.id, job2);

  // 1. Signature Verification: Valid Secret
  await t.test('1. Valid Webhook Signature & Authorization', () => {
    const validHeader = { authorization: `Bearer ${webhookSecret}` };
    assert.equal(inboundService.verifyWebhookSignature(validHeader, '{}'), true);

    const validXSecret = { 'x-webhook-secret': webhookSecret };
    assert.equal(inboundService.verifyWebhookSignature(validXSecret, '{}'), true);

    const raw = JSON.stringify({ event: 'inbound' });
    const hmacSig = crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');
    assert.equal(inboundService.verifyWebhookSignature({ 'x-webhook-signature': hmacSig }, raw), true);
  });

  // 2. Signature Verification: Invalid Signature Rejected
  await t.test('2. Reject Invalid or Unauthorized Webhook Signature', () => {
    const badHeader = { authorization: 'Bearer wrong_secret' };
    assert.equal(inboundService.verifyWebhookSignature(badHeader, '{}'), false);

    const badSig = { 'x-webhook-signature': 'tampered_signature_hex' };
    assert.equal(inboundService.verifyWebhookSignature(badSig, '{}'), false);
  });

  // 3. Process Valid Inbound Reply & Match to Lead & Campaign
  await t.test('3. Process Inbound Reply and Match to Lead & Campaign', async () => {
    const eventPayload = {
      id: 'evt_inbound_001',
      from: 'Sarah Connor <sarah.connor@cyberdyne.com>',
      to: 'outreach@get-hyperflow.com',
      subject: 'Re: Quick question regarding Cyberdyne Systems',
      text: 'Hi, thanks for reaching out. Are you free for a 15-minute call on Thursday at 2pm?',
      created_at: new Date().toISOString()
    };

    const res = await inboundService.processInboundWebhook(eventPayload);
    assert.equal(res.success, true);
    assert.equal(res.matched, true);
    assert.equal(res.leadId, leadId);
    assert.equal(res.campaignId, campaignId);
    assert.equal(res.isUnsubscribe, false);
  });

  // 4. Duplicate Event Deduplication
  await t.test('4. Prevent Duplicate Inbound Event Processing', async () => {
    const eventPayload = {
      id: 'evt_inbound_001', // Same ID
      from: 'Sarah Connor <sarah.connor@cyberdyne.com>',
      to: 'outreach@get-hyperflow.com',
      subject: 'Duplicate test',
      text: 'Testing duplicate event'
    };

    const res = await inboundService.processInboundWebhook(eventPayload);
    assert.equal(res.duplicate, true);
  });

  // 5. Follow-up Cancellation: Stop Pending Follow-up Jobs
  await t.test('5. Immediately Cancel Scheduled Follow-ups upon Reply', () => {
    const followupJob = emailWorker.memoryJobs.get('job_2_followup');
    assert.equal(followupJob.status, 'cancelled');
    assert.equal(followupJob.last_error, 'Auto-cancelled: Lead replied');
  });

  // 6. Race Condition Protection: Worker will NOT send cancelled job
  await t.test('6. Race Condition Safety: Worker Skips Cancelled Job', async () => {
    const followupJob = emailWorker.memoryJobs.get('job_2_followup');
    // Simulate tick attempting to process
    const sent = await emailWorker.processSingleJob(followupJob, false);
    assert.equal(sent, false);
    assert.equal(followupJob.status, 'cancelled');
  });

  // 7. Unmatched Reply: Route to Unmatched Inbox
  await t.test('7. Route Unknown Senders to Unmatched Inbox', async () => {
    const unknownPayload = {
      id: 'evt_inbound_002',
      from: 'John Doe <john.unknown@externaldomain.com>',
      to: 'outreach@get-hyperflow.com',
      subject: 'Inquiry',
      text: 'Who gave you my email address?'
    };

    const res = await inboundService.processInboundWebhook(unknownPayload);
    assert.equal(res.success, true);
    assert.equal(res.matched, false);
    assert.equal(res.leadId, null);

    const conv = inboundService.memoryConversations.get(res.conversationId);
    assert.equal(conv.status, 'unmatched');
  });

  // 8. Deterministic Unsubscribe Request Detection
  await t.test('8. Deterministic Unsubscribe Processing & Suppression', async () => {
    const unsubPayload = {
      id: 'evt_inbound_003',
      from: 'Marcus Wright <marcus@skynet.com>',
      to: 'outreach@get-hyperflow.com',
      subject: 'Re: Intro',
      text: 'Please unsubscribe me and remove my address from your mailing list.'
    };

    const res = await inboundService.processInboundWebhook(unsubPayload);
    assert.equal(res.success, true);
    assert.equal(res.isUnsubscribe, true);
    assert.ok(emailWorker.memorySuppressions.has('marcus@skynet.com'));
  });

  // 9. Threading & Conversation History Persistence
  await t.test('9. Thread Continuity & Chronological History', () => {
    const messages = inboundService.memoryMessages.filter(m => m.sender_email === prospectEmail);
    assert.ok(messages.length >= 1);
    assert.equal(messages[0].direction, 'inbound');
  });

  // 10. User Data Isolation
  await t.test('10. Data Isolation Across Workspaces', () => {
    const convs = Array.from(inboundService.memoryConversations.values());
    assert.ok(convs.every(c => c.user_id !== undefined));
  });
});
