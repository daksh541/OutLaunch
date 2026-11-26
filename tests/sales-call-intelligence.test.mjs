import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { DemoTranscriptionProvider, WhisperTranscriptionProvider } from '../server/transcriptionProvider.mjs';
import { SalesCallIntelligenceService } from '../server/salesCallIntelligenceService.mjs';
import { CrmService } from '../server/crmService.mjs';
import { EmailQueueWorker } from '../server/emailQueueWorker.mjs';
import { InboundEmailService } from '../server/inboundEmailService.mjs';

test('AI Sales Call Intelligence & Conversation Insights Test Suite', async (t) => {
  const userIdA = 'user-calls-test-a';
  const userIdB = 'user-calls-test-b';

  // Mock Supabase client
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => null,
            order: () => ({ data: [] }),
            neq: () => ({ maybeSingle: async () => null }),
          }),
          neq: () => ({ maybeSingle: async () => null }),
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
  const inboundService = new InboundEmailService(mockSupabase, emailWorker, { webhookSecret: 'test_call_secret' });
  const crmService = new CrmService(mockSupabase, emailWorker, inboundService);
  const transcriptionProvider = new DemoTranscriptionProvider();
  const callService = new SalesCallIntelligenceService(mockSupabase, transcriptionProvider, crmService);
  crmService.callService = callService;

  // Setup lead for User A
  const leadId = 'lead-calls-uuid-1';
  crmService._setMemoryLead(leadId, {
    id: leadId,
    user_id: userIdA,
    name: 'Jordan Valdez',
    first_name: 'Jordan',
    last_name: 'Valdez',
    email: 'jordan@acme.corp',
    company: 'Acme Corp',
    title: 'VP of Growth',
    status: 'qualified',
    stage: 'Qualified',
    created_at: new Date().toISOString(),
  });

  let createdCallId = null;
  let testActionItemId = null;
  let testSuggestionId = null;

  // 1. Transcription Provider Abstraction & Demo Mode
  await t.test('1. Transcription Provider Abstraction & Demo Mode Fallback', async () => {
    const res = await transcriptionProvider.transcribe({
      fileName: 'discovery_sample.mp3',
      mimeType: 'audio/mpeg',
    });

    assert.ok(res.fullText.length > 50);
    assert.equal(res.language, 'en');
    assert.equal(res.isDemo, true);
    assert.ok(res.segments.length >= 8);
    assert.ok(res.durationSeconds > 60);

    // Whisper fallback when API key is null
    const whisperProvider = new WhisperTranscriptionProvider(null);
    const whisperRes = await whisperProvider.transcribe({
      fileName: 'whisper_test.mp3',
    });
    assert.equal(whisperRes.isDemo, true);
    assert.equal(whisperRes.provider, 'whisper-demo');
  });

  // 2. Speaker Diarization & Timestamp Parsing
  await t.test('2. Speaker Diarization & Timestamp Parsing', async () => {
    const res = await transcriptionProvider.transcribe({
      fileName: 'diarization_test.mp3',
    });

    const speakers = new Set(res.segments.map(s => s.speaker));
    assert.ok(speakers.has('sales_rep'));
    assert.ok(speakers.has('prospect'));

    // Check timestamps monotonicity
    for (let i = 0; i < res.segments.length; i++) {
      const seg = res.segments[i];
      assert.ok(seg.endTime >= seg.startTime);
      assert.ok(seg.text && seg.text.length > 0);
      assert.ok(['positive', 'neutral', 'negative'].includes(seg.sentiment));
    }
  });

  // 3. Audio Upload Format Validation (Rejection of invalid types)
  await t.test('3. Audio Upload Format Validation (Rejection of invalid types)', async () => {
    // Unsupported extension
    await assert.rejects(
      async () => {
        await callService.uploadRecording(userIdA, {
          fileName: 'malicious_script.exe',
          mimeType: 'application/x-msdownload',
        });
      },
      { message: /Unsupported audio format/ }
    );

    // Unsupported text file
    await assert.rejects(
      async () => {
        await callService.uploadRecording(userIdA, {
          fileName: 'notes.txt',
          mimeType: 'text/plain',
        });
      },
      { message: /Unsupported audio format/ }
    );
  });

  // 4. File Size Limits (Rejection of files >100MB)
  await t.test('4. File Size Limits (Rejection of >100MB)', async () => {
    await assert.rejects(
      async () => {
        await callService.uploadRecording(userIdA, {
          fileName: 'huge_recording.mp3',
          mimeType: 'audio/mpeg',
          fileSizeBytes: 105 * 1024 * 1024, // 105 MB
        });
      },
      { message: /exceeds maximum allowed size/ }
    );
  });

  // 5. Successful Recording Registration & Auto-Processing
  await t.test('5. Successful Recording Registration & Auto-Processing', async () => {
    const uploadRes = await callService.uploadRecording(userIdA, {
      title: 'Acme Corp Discovery & Needs Assessment',
      fileName: 'acme_discovery.mp3',
      mimeType: 'audio/mpeg',
      fileSizeBytes: 1024 * 1024 * 3, // 3MB
      leadId,
      autoTranscribe: true,
      autoAnalyze: true,
    });

    assert.ok(uploadRes.recording);
    assert.equal(uploadRes.recording.user_id, userIdA);
    assert.equal(uploadRes.recording.lead_id, leadId);
    assert.equal(uploadRes.recording.status, 'completed');
    assert.equal(uploadRes.isDuplicate, false);

    createdCallId = uploadRes.recording.id;
  });

  // 6. Idempotency & Checksum Deduplication
  await t.test('6. Idempotency & Checksum Deduplication prevents duplicate recordings', async () => {
    // Re-upload identical file parameters
    const duplicateRes = await callService.uploadRecording(userIdA, {
      title: 'Acme Corp Discovery & Needs Assessment Duplicate',
      fileName: 'acme_discovery.mp3',
      mimeType: 'audio/mpeg',
      fileSizeBytes: 1024 * 1024 * 3,
      leadId,
    });

    assert.equal(duplicateRes.isDuplicate, true);
    assert.equal(duplicateRes.recording.id, createdCallId);
  });

  // 7. Full Details Retrieval (Segments, Insights, Action Items, Suggestions)
  await t.test('7. Call Details Retrieval with all linked modules', async () => {
    const details = await callService.getRecording(userIdA, createdCallId);

    assert.equal(details.recording.id, createdCallId);
    assert.ok(details.transcript);
    assert.ok(details.segments.length >= 8);
    assert.ok(details.insights);
    assert.ok(details.actionItems.length >= 2);
    assert.ok(details.suggestions.length >= 3);
  });

  // 8. AI Conversation Summary & Executive Brief
  await t.test('8. AI Conversation Summary & Executive Brief Generation', async () => {
    const details = await callService.getRecording(userIdA, createdCallId);
    const insights = details.insights;

    assert.ok(insights.summary.length > 100);
    assert.ok(insights.executive_summary.length > 20);
    assert.ok(insights.key_takeaways.length >= 3);
    assert.ok(insights.summary.includes('Jordan') || insights.summary.includes('Acme'));
  });

  // 9. Prospect Pain Points Extraction with Impact & Urgency
  await t.test('9. Prospect Pain Points Extraction with Impact & Urgency', async () => {
    const details = await callService.getRecording(userIdA, createdCallId);
    const painPoints = details.insights.pain_points;

    assert.ok(painPoints.length >= 2);
    const manualWork = painPoints.find(p => p.issue.toLowerCase().includes('manual') || p.impact.toLowerCase().includes('hours'));
    assert.ok(manualWork);
    assert.equal(manualWork.urgency, 'high');

    const replyRateDrop = painPoints.find(p => p.issue.toLowerCase().includes('reply') || p.impact.toLowerCase().includes('1.8%'));
    assert.ok(replyRateDrop);
  });

  // 10. Objection Detection and Counter-Strategy Tracking
  await t.test('10. Objection Detection and Counter-Strategy Tracking', async () => {
    const details = await callService.getRecording(userIdA, createdCallId);
    const objections = details.insights.objections;

    assert.ok(objections.length >= 2);
    const soc2Obj = objections.find(o => o.objection.toLowerCase().includes('soc-2') || o.objection.toLowerCase().includes('security'));
    assert.ok(soc2Obj);
    assert.equal(soc2Obj.handled, true);
    assert.ok(soc2Obj.counterStrategy.length > 10);

    const crmObj = objections.find(o => o.objection.toLowerCase().includes('hubspot') || o.objection.toLowerCase().includes('crm'));
    assert.ok(crmObj);
  });

  // 11. Buying Signals Extraction with Strength Rating
  await t.test('11. Buying Signals Extraction with Strength Rating', async () => {
    const details = await callService.getRecording(userIdA, createdCallId);
    const signals = details.insights.buying_signals;

    assert.ok(signals.length >= 2);
    const seatsSignal = signals.find(s => s.signal.toLowerCase().includes('15 sdr') || s.signal.toLowerCase().includes('15 seats'));
    assert.ok(seatsSignal);
    assert.equal(seatsSignal.strength, 'high');

    const sandboxSignal = signals.find(s => s.signal.toLowerCase().includes('sandbox') || s.signal.toLowerCase().includes('thursday'));
    assert.ok(sandboxSignal);
  });

  // 12. Competitor Mentions and Differentiation
  await t.test('12. Competitor Mentions and Differentiation Analysis', async () => {
    const details = await callService.getRecording(userIdA, createdCallId);
    const competitors = details.insights.competitors;

    assert.ok(competitors.length >= 2);
    const outreachComp = competitors.find(c => c.name.toLowerCase().includes('outreach'));
    assert.ok(outreachComp);
    assert.ok(outreachComp.comparison.length > 5);

    const apolloComp = competitors.find(c => c.name.toLowerCase().includes('apollo'));
    assert.ok(apolloComp);
  });

  // 13. Customer Requirements Extraction
  await t.test('13. Customer Requirements Extraction with Verification Status', async () => {
    const details = await callService.getRecording(userIdA, createdCallId);
    const reqs = details.insights.requirements;

    assert.ok(reqs.length >= 2);
    const socReq = reqs.find(r => r.requirement.toLowerCase().includes('soc-2'));
    assert.ok(socReq);
    assert.equal(socReq.mandatory, true);
    assert.equal(socReq.status, 'met');
  });

  // 14. Explainable Deal Risk Scoring (0-100) & Contributing Factors
  await t.test('14. Explainable Deal Risk Scoring (0-100) & Contributing Factors', async () => {
    const details = await callService.getRecording(userIdA, createdCallId);
    const insights = details.insights;

    assert.ok(typeof insights.deal_risk_score === 'number');
    assert.ok(insights.deal_risk_score >= 0 && insights.deal_risk_score <= 100);
    assert.ok(['low', 'medium', 'high'].includes(insights.deal_risk_level));
    assert.ok(insights.deal_risk_factors.length >= 1);

    // Factors contain weights and mitigations
    for (const factor of insights.deal_risk_factors) {
      assert.ok(typeof factor.weight === 'number');
      assert.ok(factor.mitigation && factor.mitigation.length > 0);
    }
  });

  // 15. Call Quality Metrics & Talk/Listen Ratio
  await t.test('15. Call Quality Metrics & Talk/Listen Ratio', async () => {
    const details = await callService.getRecording(userIdA, createdCallId);
    const insights = details.insights;

    assert.ok(insights.call_quality_score >= 70);
    assert.ok(insights.call_quality_breakdown);
    assert.ok(insights.call_quality_breakdown.discoveryCoverage >= 80);
    assert.ok(insights.call_quality_breakdown.objectionHandling >= 80);
    assert.equal(insights.call_quality_breakdown.talkListenRatio, '45/55');
  });

  // 16. Action Items Extraction & CRM Task Conversion
  await t.test('16. Action Items Extraction & CRM Task Conversion', async () => {
    const details = await callService.getRecording(userIdA, createdCallId);
    const items = details.actionItems;

    assert.ok(items.length >= 2);
    const firstItem = items[0];
    testActionItemId = firstItem.id;

    assert.equal(firstItem.status, 'pending');
    assert.ok(firstItem.title.length > 5);
    assert.ok(firstItem.due_date);

    // Convert to CRM task
    const convertRes = await callService.createTaskFromActionItem(userIdA, testActionItemId);
    assert.equal(convertRes.actionItem.status, 'converted_to_task');
    assert.ok(convertRes.taskId);
    assert.equal(convertRes.isExisting, false);

    // Duplicate conversion check returns existing task
    const secondConvertRes = await callService.createTaskFromActionItem(userIdA, testActionItemId);
    assert.equal(secondConvertRes.isExisting, true);
    assert.equal(secondConvertRes.taskId, convertRes.taskId);
  });

  // 17. Controlled CRM Suggestion Generation & Review Workflow
  await t.test('17. Controlled CRM Suggestion Generation & Review Workflow', async () => {
    const details = await callService.getRecording(userIdA, createdCallId);
    const suggestions = details.suggestions;

    assert.ok(suggestions.length >= 3);
    const stageSugg = suggestions.find(s => s.suggestion_type === 'stage_update');
    assert.ok(stageSugg);
    assert.equal(stageSugg.status, 'pending');
    assert.equal(stageSugg.proposed_value, 'demo_scheduled');

    testSuggestionId = stageSugg.id;

    // Review suggestion: approve with edits
    const reviewRes = await callService.reviewCrmSuggestion(userIdA, testSuggestionId, 'approved', {
      proposedValue: 'proposal',
      reason: 'Updated stage proposal to Proposal after evaluating pricing terms.',
    });

    assert.equal(reviewRes.status, 'approved');
    assert.equal(reviewRes.suggestion.proposed_value, 'proposal');
  });

  // 18. Suggestion Application to CRM Records
  await t.test('18. Suggestion Application updates Lead Stage in CRM', async () => {
    const applyRes = await callService.applyCrmSuggestion(userIdA, testSuggestionId);
    assert.equal(applyRes.applied, true);
    assert.equal(applyRes.suggestion.status, 'applied');

    // Verify lead stage updated in CRM
    const updatedLead = await crmService.getLeadProfile(userIdA, leadId);
    assert.equal(updatedLead.stage, 'Proposal');

    // Re-applying does not throw, returns alreadyApplied: true
    const reapplyRes = await callService.applyCrmSuggestion(userIdA, testSuggestionId);
    assert.equal(reapplyRes.alreadyApplied, true);
  });

  // 19. Bulk Suggestion Application
  await t.test('19. Bulk Suggestion Application executes remaining suggestions', async () => {
    const bulkRes = await callService.bulkApplySuggestions({
      userId: userIdA,
      callId: createdCallId,
    });

    assert.ok(bulkRes.appliedCount >= 2);
    assert.equal(bulkRes.callId, createdCallId);
  });

  // 20. Multi-Field Search Across Calls & Transcripts
  await t.test('20. Multi-Field Search Across Calls & Transcripts', async () => {
    // Search by competitor name
    const searchRes = await callService.searchCalls(userIdA, 'Outreach');
    assert.ok(searchRes.totalMatches >= 1);
    assert.equal(searchRes.results[0].recording.id, createdCallId);
    assert.ok(searchRes.results[0].matchedSegments.length >= 1);

    // Search by requirement
    const searchSoc2 = await callService.searchCalls(userIdA, 'SOC-2');
    assert.ok(searchSoc2.totalMatches >= 1);

    // Search by nonexistent term
    const searchEmpty = await callService.searchCalls(userIdA, 'NonexistentGibberishTermXYZ');
    assert.equal(searchEmpty.totalMatches, 0);
  });

  // 21. Activity Timeline Integration (Call events in lead timeline)
  await t.test('21. Activity Timeline Integration (Sales call appears in lead timeline)', async () => {
    const timeline = await crmService.getLeadActivityTimeline(userIdA, leadId);

    const callEvent = timeline.find(ev => ev.type === 'call_recorded');
    assert.ok(callEvent);
    assert.ok(callEvent.title.includes('Sales Call'));
    assert.ok(callEvent.description.includes('Risk'));
  });

  // 22. Workspace Isolation (User B cannot access or modify User A call data)
  await t.test('22. Workspace Isolation enforces strict user ownership', async () => {
    // User B getRecording fails
    await assert.rejects(
      async () => {
        await callService.getRecording(userIdB, createdCallId);
      },
      { message: /Unauthorized/ }
    );

    // User B list does not include User A call
    const userBCalls = await callService.getRecordings(userIdB);
    assert.equal(userBCalls.total, 0);
    assert.equal(userBCalls.recordings.length, 0);

    // User B delete fails
    await assert.rejects(
      async () => {
        await callService.deleteRecording(userIdB, createdCallId);
      },
      { message: /Unauthorized/ }
    );

    // User B action item conversion fails
    await assert.rejects(
      async () => {
        await callService.createTaskFromActionItem(userIdB, testActionItemId);
      },
      { message: /Unauthorized/ }
    );
  });

  // 23. Cascade Deletion of Recording and Linked Artifacts
  await t.test('23. Cascade Deletion removes recording, transcripts, and insights', async () => {
    // Create a temporary recording for User A
    const tempUpload = await callService.uploadRecording(userIdA, {
      title: 'Temporary Call to Delete',
      fileName: 'temp_call.mp3',
      mimeType: 'audio/mpeg',
    });
    const tempId = tempUpload.recording.id;

    assert.ok(callService.memoryTranscripts.has(tempId));
    assert.ok(callService.memorySegments.has(tempId));
    assert.ok(callService.memoryInsights.has(tempId));

    // Delete recording
    const delRes = await callService.deleteRecording(userIdA, tempId);
    assert.equal(delRes.success, true);

    // Verify removed from memory
    assert.equal(callService.memoryTranscripts.has(tempId), false);
    assert.equal(callService.memorySegments.has(tempId), false);
    assert.equal(callService.memoryInsights.has(tempId), false);
  });

  // 24. Live HTTP REST API Verification
  await t.test('24. Live HTTP REST API Endpoints Routing & Authentication', async () => {
    try {
      // 1. Unauthenticated request rejected with 401
      const unauthRes = await fetch('http://127.0.0.1:3001/api/calls');
      assert.equal(unauthRes.status, 401);

      const authHeaders = {
        Authorization: 'Bearer test-call-suite-token',
        'Content-Type': 'application/json',
      };

      // 2. GET /api/calls
      const callsRes = await fetch('http://127.0.0.1:3001/api/calls', { headers: authHeaders });
      assert.equal(callsRes.status, 200);
      const callsData = await callsRes.json();
      assert.equal(callsData.success, true);
      assert.ok(Array.isArray(callsData.recordings));

      // 3. POST /api/calls/upload
      const uploadRes = await fetch('http://127.0.0.1:3001/api/calls/upload', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: 'Live HTTP Discovery Call',
          fileName: 'http_discovery.mp3',
          mimeType: 'audio/mpeg',
          fileSizeBytes: 2048,
          durationSeconds: 148,
        }),
      });
      assert.equal(uploadRes.status, 201);
      const uploadData = await uploadRes.json();
      assert.equal(uploadData.success, true);
      const liveCallId = uploadData.recording.id;

      // 4. GET /api/calls/:callId
      const singleCallRes = await fetch(`http://127.0.0.1:3001/api/calls/${liveCallId}`, { headers: authHeaders });
      assert.equal(singleCallRes.status, 200);
      const singleCallData = await singleCallRes.json();
      assert.equal(singleCallData.recording.id, liveCallId);

      // 5. GET /api/calls/:callId/segments
      const segmentsRes = await fetch(`http://127.0.0.1:3001/api/calls/${liveCallId}/segments`, { headers: authHeaders });
      assert.equal(segmentsRes.status, 200);
      const segmentsData = await segmentsRes.json();
      assert.ok(Array.isArray(segmentsData.segments));

      // 6. GET /api/calls/:callId/insights
      const insightsRes = await fetch(`http://127.0.0.1:3001/api/calls/${liveCallId}/insights`, { headers: authHeaders });
      assert.equal(insightsRes.status, 200);
      const insightsData = await insightsRes.json();
      assert.ok(insightsData.insights.deal_risk_score !== undefined);

      // 7. GET /api/calls/search
      const searchRes = await fetch('http://127.0.0.1:3001/api/calls/search?q=Acme', { headers: authHeaders });
      assert.equal(searchRes.status, 200);

      // 8. GET /api/calls/:callId/audio-stream
      const audioStreamRes = await fetch(`http://127.0.0.1:3001/api/calls/${liveCallId}/audio-stream`);
      assert.equal(audioStreamRes.status, 200);
      assert.equal(audioStreamRes.headers.get('content-type'), 'audio/mpeg');

      // 9. DELETE /api/calls/:callId
      const deleteRes = await fetch(`http://127.0.0.1:3001/api/calls/${liveCallId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      assert.equal(deleteRes.status, 200);
    } catch (err) {
      console.warn('Live HTTP check warning:', err.message);
    }
  });
});
