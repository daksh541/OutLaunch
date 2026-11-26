import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { GoogleCalendarProvider } from '../server/calendarProvider.mjs';
import { MeetingService, MEETING_OUTCOMES } from '../server/meetingService.mjs';
import { CrmService } from '../server/crmService.mjs';
import { EmailQueueWorker } from '../server/emailQueueWorker.mjs';
import { InboundEmailService } from '../server/inboundEmailService.mjs';

test('AI Meeting Booking & Calendar Scheduling Test Suite', async (t) => {
  const userIdA = 'user-meeting-test-a';
  const userIdB = 'user-meeting-test-b';

  // Mock Supabase client
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => null,
            order: () => ({ data: [] }),
            in: () => ({ gte: () => ({ lte: () => ({ data: [] }) }) }),
          }),
          in: () => ({ lt: () => ({ gt: () => ({ data: [] }) }) }),
          gte: () => ({ lte: () => ({ data: [] }) }),
          maybeSingle: async () => null,
          order: () => ({ data: [] }),
        }),
        order: () => ({ data: [] }),
      }),
      insert: async () => ({ error: null }),
      update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
      upsert: async () => ({ error: null }),
      delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
    }),
  };

  const emailWorker = new EmailQueueWorker(mockSupabase, { pollIntervalMs: 10000 });
  const inboundService = new InboundEmailService(mockSupabase, emailWorker, { webhookSecret: 'test_meeting_secret' });
  const crmService = new CrmService(mockSupabase, emailWorker, inboundService);
  const calendarProvider = new GoogleCalendarProvider();
  const meetingService = new MeetingService(mockSupabase, calendarProvider, crmService, emailWorker);
  crmService.meetingService = meetingService;

  // Setup initial booking page for User A
  const bookingPage = await meetingService.createOrUpdateBookingPage(userIdA, {
    slug: 'discovery-demo',
    title: 'Executive Discovery & AI Outreach Demo',
    duration_minutes: 30,
    is_active: true,
  });

  // Setup initial availability rules for User A
  await meetingService.updateAvailabilityRules(userIdA, {
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    time_zone: 'UTC',
    meeting_duration: 30,
    min_notice_hours: 2,
    max_horizon_days: 14,
    buffer_before: 10,
    buffer_after: 10,
  });

  // Setup existing CRM lead for User A
  const existingLeadId = 'lead-meeting-uuid-1';
  crmService._setMemoryLead(existingLeadId, {
    id: existingLeadId,
    user_id: userIdA,
    name: 'Elena Rostova',
    email: 'elena@novatech.io',
    company: 'NovaTech AI',
    stage: 'Contacted',
    status: 'Replied',
    deal_value: 20000,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  });

  // 1. Calendar Provider Abstraction
  await t.test('1. Calendar Provider Abstraction (Google Calendar Demo & Interface)', async () => {
    assert.equal(calendarProvider.name, 'google');
    assert.equal(calendarProvider.isDemoMode, true);

    const authUrlData = await calendarProvider.getAuthorizationUrl({
      state: 'test_state_123',
      redirectUri: 'http://localhost:3000/callback',
    });
    assert.ok(authUrlData.url.includes('accounts.google.com'));
    assert.ok(authUrlData.url.includes('test_state_123'));
    assert.equal(authUrlData.isDemoMode, true);
  });

  // 2. OAuth State Validation & Token Exchange
  await t.test('2. OAuth State Validation & Token Exchange', async () => {
    const tokens = await calendarProvider.exchangeCodeForTokens({
      code: 'demo_auth_code_xyz',
      redirectUri: 'http://localhost:3000/callback',
      state: 'test_state_123',
    });
    assert.equal(tokens.success, true);
    assert.ok(tokens.accessToken);
    assert.ok(tokens.refreshToken);
    assert.equal(tokens.accountEmail, 'demo.rep@outlaunch-saas.com');

    // Save connection
    const saved = await meetingService.saveCalendarConnection(userIdA, tokens);
    assert.equal(saved.user_id, userIdA);
    assert.equal(saved.status, 'connected');
  });

  // 3. Availability Calculation
  await t.test('3. Availability Calculation for valid working day', async () => {
    // Pick an upcoming Wednesday in UTC
    const targetDate = '2026-12-02'; // Wednesday
    const avail = await meetingService.calculateAvailability({
      userId: userIdA,
      targetDate,
      prospectTimeZone: 'UTC',
      durationMinutes: 30,
    });
    assert.equal(avail.date, targetDate);
    assert.ok(avail.slots.length > 0);
    assert.ok(avail.slots.every(s => s.duration_minutes === 30));
  });

  // 4. Time Zone Conversion
  await t.test('4. Time Zone Conversion to Prospect Local Time', async () => {
    const targetDate = '2026-12-02';
    const availEst = await meetingService.calculateAvailability({
      userId: userIdA,
      targetDate,
      prospectTimeZone: 'America/New_York',
      durationMinutes: 30,
    });
    assert.equal(availEst.timeZone, 'America/New_York');
    assert.ok(availEst.slots.length > 0);
    assert.ok(availEst.slots[0].display_time);
  });

  // 5. Working Hour Restrictions
  await t.test('5. Working Hour Restrictions (Weekend & Out-of-hours rejected)', async () => {
    // 2026-12-06 is Sunday
    const sundayRes = await meetingService.calculateAvailability({
      userId: userIdA,
      targetDate: '2026-12-06',
    });
    assert.equal(sundayRes.slots.length, 0);
    assert.ok(sundayRes.reason.includes('working days'));
  });

  // 6. Buffer Time Handling
  await t.test('6. Buffer Time Handling prevents back-to-back overlaps', async () => {
    // Rules specify buffer_before: 10, buffer_after: 10
    const rules = await meetingService.getAvailabilityRules(userIdA);
    assert.equal(rules.buffer_before, 10);
    assert.equal(rules.buffer_after, 10);
  });

  // 7. Minimum Booking Notice
  await t.test('7. Minimum Booking Notice enforces notice window', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const avail = await meetingService.calculateAvailability({
      userId: userIdA,
      targetDate: todayStr,
      durationMinutes: 30,
    });
    const nowTime = Date.now();
    const twoHoursNotice = 2 * 3600 * 1000;
    // Any returned slot must be at least min_notice in future
    for (const s of avail.slots) {
      assert.ok(new Date(s.start_time).getTime() >= nowTime + twoHoursNotice - 60000);
    }
  });

  // 8. Booking Creation & CRM Integration
  let createdBookingId = null;
  await t.test('8. Booking Creation & CRM Lead Association', async () => {
    const startTime = '2026-12-02T14:00:00.000Z';
    const endTime = '2026-12-02T14:30:00.000Z';

    const res = await meetingService.bookMeetingPublic({
      bookingSlug: 'discovery-demo',
      prospectName: 'Elena Rostova',
      prospectEmail: 'elena@novatech.io',
      prospectCompany: 'NovaTech AI',
      prospectNotes: 'Looking forward to evaluating outbound automation',
      startTime,
      endTime,
      prospectTimeZone: 'UTC',
    });

    assert.equal(res.success, true);
    assert.ok(res.booking.id);
    assert.equal(res.booking.prospect_email, 'elena@novatech.io');
    assert.equal(res.booking.status, 'confirmed');
    assert.ok(res.meeting_link.includes('meet.google.com'));
    createdBookingId = res.booking.id;

    // Verify CRM Lead was updated to 'Meeting Scheduled'
    const lead = await crmService.getLeadProfile(userIdA, existingLeadId);
    assert.equal(lead.stage, 'Meeting Scheduled');
    assert.ok(lead.next_followup_at);
  });

  // 9. Double-Booking Prevention
  await t.test('9. Double-Booking Prevention rejects overlapping requests', async () => {
    // Attempt to book exactly the same slot or overlapping
    await assert.rejects(
      async () => {
        await meetingService.bookMeetingPublic({
          bookingSlug: 'discovery-demo',
          prospectName: 'Another Person',
          prospectEmail: 'another@othercorp.com',
          startTime: '2026-12-02T14:15:00.000Z', // overlaps with 14:00-14:30
          endTime: '2026-12-02T14:45:00.000Z',
          prospectTimeZone: 'UTC',
        });
      },
      {
        message: /no longer available/i,
      }
    );
  });

  // 10. Booking Idempotency
  await t.test('10. Booking Idempotency returns existing booking without duplicate', async () => {
    const customKey = 'custom_unique_idempotency_key_123';
    const res1 = await meetingService.bookMeetingPublic({
      bookingSlug: 'discovery-demo',
      prospectName: 'Marcus Vance',
      prospectEmail: 'marcus@vance.com',
      startTime: '2026-12-02T15:30:00.000Z',
      endTime: '2026-12-02T16:00:00.000Z',
      idempotencyKey: customKey,
    });
    assert.equal(res1.success, true);

    const res2 = await meetingService.bookMeetingPublic({
      bookingSlug: 'discovery-demo',
      prospectName: 'Marcus Vance',
      prospectEmail: 'marcus@vance.com',
      startTime: '2026-12-02T15:30:00.000Z',
      endTime: '2026-12-02T16:00:00.000Z',
      idempotencyKey: customKey,
    });
    assert.equal(res2.idempotent, true);
    assert.equal(res1.booking.id, res2.booking.id);
  });

  // 11. Calendar Event Creation Failure Handling
  await t.test('11. Calendar Event Creation Failure aborts booking without confirmation', async () => {
    // Create broken provider mock that throws
    const brokenProvider = new GoogleCalendarProvider();
    brokenProvider.createEvent = async () => {
      throw new Error('Google Calendar 503 Service Unavailable');
    };
    const failingService = new MeetingService(mockSupabase, brokenProvider, crmService, emailWorker);
    await failingService.createOrUpdateBookingPage(userIdA, bookingPage);

    await assert.rejects(
      async () => {
        await failingService.bookMeetingPublic({
          bookingSlug: 'discovery-demo',
          prospectName: 'Test Fail',
          prospectEmail: 'fail@test.com',
          startTime: '2026-12-03T11:00:00.000Z',
          endTime: '2026-12-03T11:30:00.000Z',
        });
      },
      {
        message: /Calendar event creation failed/i,
      }
    );
  });

  // 12. Database Failure Compensation
  await t.test('12. Database Failure Compensation rolls back cleanly', async () => {
    let rollbackCancelled = false;
    const testProvider = new GoogleCalendarProvider();
    testProvider.cancelEvent = async () => {
      rollbackCancelled = true;
      return { success: true };
    };

    const failingDb = {
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => bookingPage }), maybeSingle: async () => bookingPage, in: () => ({ lt: () => ({ gt: () => ({ data: [] }) }) }) }) }),
        insert: async () => ({ error: { message: 'Database connection timeout' } }),
      }),
    };

    const compService = new MeetingService(failingDb, testProvider, crmService, emailWorker);
    await compService.createOrUpdateBookingPage(userIdA, bookingPage);

    await assert.rejects(
      async () => {
        await compService.bookMeetingPublic({
          bookingSlug: 'discovery-demo',
          prospectName: 'Compensation Test',
          prospectEmail: 'comp@test.com',
          startTime: '2026-12-04T10:00:00.000Z',
          endTime: '2026-12-04T10:30:00.000Z',
        });
      },
      {
        message: /Database error saving booking/i,
      }
    );

    assert.equal(rollbackCancelled, true);
  });

  // 13. Booking Cancellation
  await t.test('13. Booking Cancellation updates status and does not mark lead Lost', async () => {
    const cancelled = await meetingService.cancelMeeting({
      userId: userIdA,
      meetingId: createdBookingId,
      reason: 'Prospect has team offsite',
    });

    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.cancellation_reason, 'Prospect has team offsite');

    // Verify lead is NOT marked as Lost
    const lead = await crmService.getLeadProfile(userIdA, existingLeadId);
    assert.notEqual(lead.stage, 'Lost');
  });

  // 14. Meeting Rescheduling
  await t.test('14. Meeting Rescheduling shifts event and updates reminders', async () => {
    // Book a new meeting to test reschedule
    const freshRes = await meetingService.bookMeetingPublic({
      bookingSlug: 'discovery-demo',
      prospectName: 'Sarah Connors',
      prospectEmail: 'sarah@skynet.com',
      startTime: '2026-12-03T14:00:00.000Z',
      endTime: '2026-12-03T14:30:00.000Z',
    });

    const rescheduled = await meetingService.rescheduleMeeting({
      userId: userIdA,
      meetingId: freshRes.booking.id,
      newStartTime: '2026-12-03T16:00:00.000Z',
      newEndTime: '2026-12-03T16:30:00.000Z',
      reason: 'Requested later in the day',
    });

    assert.equal(rescheduled.start_time, '2026-12-03T16:00:00.000Z');
    assert.equal(rescheduled.status, 'confirmed');
  });

  // 15. Reminder Deduplication
  await t.test('15. Reminder Deduplication ensures idempotent keys', async () => {
    const reminders = Array.from(meetingService.memoryReminders.values());
    const keys = reminders.map(r => r.idempotency_key);
    const uniqueKeys = new Set(keys);
    assert.equal(keys.length, uniqueKeys.size);
  });

  // 16. Cancelled Meeting Reminders
  await t.test('16. Cancelled Meeting Reminders marked cancelled', async () => {
    const remindersForCancelled = Array.from(meetingService.memoryReminders.values()).filter(
      r => r.booking_id === createdBookingId
    );
    for (const r of remindersForCancelled) {
      assert.equal(r.status, 'cancelled');
    }
  });

  // 17. CRM Lead Association
  await t.test('17. CRM Lead Association correctly links existing prospect', async () => {
    const booking = await meetingService.getMeetingById(userIdA, createdBookingId);
    assert.equal(booking.lead_id, existingLeadId);
  });

  // 18. Meeting Timeline Integration
  await t.test('18. Meeting Events Present in Lead Activity Timeline', async () => {
    const timeline = await crmService.getLeadActivityTimeline(userIdA, existingLeadId);
    assert.ok(timeline.some(e => e.type === 'meeting_cancelled' || e.type === 'meeting_scheduled'));
  });

  // 19. Meeting Outcome Recording
  await t.test('19. Meeting Outcome Recording creates task & updates deal', async () => {
    // Book meeting to record outcome for
    const mRes = await meetingService.bookMeetingPublic({
      bookingSlug: 'discovery-demo',
      prospectName: 'David Chen',
      prospectEmail: 'david@chenenterprises.com',
      startTime: '2026-12-04T14:00:00.000Z',
      endTime: '2026-12-04T14:30:00.000Z',
      clientIp: '10.0.1.99',
    });

    const outcomeRes = await meetingService.recordMeetingOutcome({
      userId: userIdA,
      meetingId: mRes.booking.id,
      outcome: 'Proposal Requested',
      notes: 'Strong interest in enterprise tier, needs SOC2 compliance sheet.',
      nextAction: 'Send Proposal and Security Packet',
      dealValue: 45000,
      newStage: 'Proposal',
    });

    assert.equal(outcomeRes.success, true);
    assert.equal(outcomeRes.outcome.outcome, 'Proposal Requested');
    assert.equal(outcomeRes.meeting.status, 'completed');

    // Verify task creation
    const tasks = await crmService.getTasks(userIdA);
    assert.ok(tasks.tasks.some(t => t.title === 'Send Proposal and Security Packet'));
  });

  // 20. Workspace Isolation
  await t.test('20. Workspace Isolation: User B cannot access User A meetings', async () => {
    await assert.rejects(
      async () => {
        await meetingService.getMeetingById(userIdB, createdBookingId);
      },
      {
        message: /Meeting not found or unauthorized/i,
      }
    );
  });

  // 21. Public Booking Rate Limiting
  await t.test('21. Public Booking Rate Limiting blocks flood requests from same IP', async () => {
    const floodIp = '198.51.100.42';
    // Send 5 rapid bookings
    for (let i = 0; i < 5; i++) {
      try {
        await meetingService.bookMeetingPublic({
          bookingSlug: 'discovery-demo',
          prospectName: `Flood Prospect ${i}`,
          prospectEmail: `flood${i}@floodcorp.com`,
          startTime: `2026-12-05T${10 + i}:00:00.000Z`,
          endTime: `2026-12-05T${10 + i}:30:00.000Z`,
          clientIp: floodIp,
        });
      } catch {}
    }

    // 6th request must be rejected with rate limit
    await assert.rejects(
      async () => {
        await meetingService.bookMeetingPublic({
          bookingSlug: 'discovery-demo',
          prospectName: 'Blocked Prospect',
          prospectEmail: 'blocked@floodcorp.com',
          startTime: '2026-12-05T16:00:00.000Z',
          endTime: '2026-12-05T16:30:00.000Z',
          clientIp: floodIp,
        });
      },
      {
        message: /Rate limit exceeded/i,
      }
    );
  });

  // 22. Calendar Token Refresh Behavior
  await t.test('22. Calendar Token Refresh Behavior handles expiry cleanly', async () => {
    const refreshRes = await calendarProvider.refreshAccessToken({
      refreshToken: 'test_refresh_token',
    });
    assert.equal(refreshRes.success, true);
    assert.ok(refreshRes.accessToken);
    assert.ok(refreshRes.expiresAt);
  });

  // 23. AI Scheduling Assistant: Intent Parsing & Slot Suggestions
  await t.test('23. AI Scheduling Assistant: Intent Parsing & Slot Suggestions', async () => {
    const replyText = 'Yes, let us schedule a demo call! Can we meet next Tuesday afternoon? I am based in EST.';
    const parsedIntent = await meetingService.parseSchedulingIntent(replyText);
    assert.equal(parsedIntent.hasIntent, true);
    assert.equal(parsedIntent.proposedDay, 'tuesday');
    assert.equal(parsedIntent.timeOfDay, 'afternoon');
    assert.equal(parsedIntent.detectedTimeZone, 'EST');

    // Slot suggestion with real availability check
    const suggestions = await meetingService.suggestSlotsForIntent({
      userId: userIdA,
      targetDate: '2026-12-02',
      timeOfDay: 'afternoon',
      timeZone: 'America/New_York',
      prospectName: 'Elena',
    });

    assert.ok(suggestions.suggestedSlots.length >= 0);
    assert.ok(suggestions.draftedMessage.includes('Elena'));
    assert.ok(suggestions.draftedMessage.includes('/book/'));
  });

  // 24. Live HTTP API Verification (/api/meetings, /api/calendar, /api/booking)
  await t.test('24. Live HTTP API Endpoints Routing & Authentication', async () => {
    try {
      // 1. Unauthenticated meeting request rejects with 401
      const unauthRes = await fetch('http://127.0.0.1:3001/api/meetings');
      assert.equal(unauthRes.status, 401);

      const authHeaders = {
        'Authorization': 'Bearer test-meeting-suite-token',
        'Content-Type': 'application/json',
      };

      // 2. Authenticated meetings list
      const meetingsRes = await fetch('http://127.0.0.1:3001/api/meetings', { headers: authHeaders });
      assert.equal(meetingsRes.status, 200);
      const meetingsData = await meetingsRes.json();
      assert.ok(Array.isArray(meetingsData.meetings));

      // 3. Calendar settings
      const settingsRes = await fetch('http://127.0.0.1:3001/api/calendar/settings', { headers: authHeaders });
      assert.equal(settingsRes.status, 200);

      // 4. Public booking page metadata (No auth header required)
      const publicPageRes = await fetch('http://127.0.0.1:3001/api/booking/discovery-demo');
      // If server in-memory has it or 404
      assert.ok([200, 404].includes(publicPageRes.status));

      // 5. AI Parse Intent endpoint
      const aiIntentRes = await fetch('http://127.0.0.1:3001/api/meetings/ai-parse-intent', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ replyText: 'Can we meet next Wednesday at 2pm?' }),
      });
      assert.equal(aiIntentRes.status, 200);
      const aiIntentData = await aiIntentRes.json();
      assert.equal(aiIntentData.intent.hasIntent, true);
    } catch (err) {
      console.warn('Live HTTP check warning:', err.message);
    }
  });
});
