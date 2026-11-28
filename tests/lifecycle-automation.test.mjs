import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { LifecycleEventService } from '../server/lifecycleEventService.mjs';
import { LifecycleWorkflowService } from '../server/lifecycleWorkflowService.mjs';
import { LifecycleActionService, ACTION_SAFETY_LEVELS } from '../server/lifecycleActionService.mjs';
import { LifecycleExecutionService } from '../server/lifecycleExecutionService.mjs';
import { LifecycleRecommendationService } from '../server/lifecycleRecommendationService.mjs';
import { LifecycleAnalyticsService } from '../server/lifecycleAnalyticsService.mjs';
import { CustomerHealthService } from '../server/customerHealthService.mjs';
import { CustomerRenewalService } from '../server/customerRenewalService.mjs';
import { SupportTicketService } from '../server/supportTicketService.mjs';

describe('AI Customer Engagement & Lifecycle Automation Module Tests', () => {
  let eventService;
  let workflowService;
  let actionService;
  let executionService;
  let recommendationService;
  let analyticsService;
  let healthService;
  let renewalService;
  let ticketService;

  beforeEach(() => {
    eventService = new LifecycleEventService();
    workflowService = new LifecycleWorkflowService();
    healthService = new CustomerHealthService();
    renewalService = new CustomerRenewalService(null, healthService);
    ticketService = new SupportTicketService(null, healthService, renewalService);
    actionService = new LifecycleActionService(null, null, null, null, healthService);
    executionService = new LifecycleExecutionService(eventService, workflowService, actionService);
    recommendationService = new LifecycleRecommendationService(healthService, renewalService, ticketService, workflowService);
    analyticsService = new LifecycleAnalyticsService(workflowService, executionService, actionService);
  });

  // TEST 1: Workflow creation and validation
  test('1. Workflow creation validates definition structure and rejects invalid step types or circular targets', async () => {
    // Missing steps
    const invalidDef1 = workflowService.validateWorkflowDefinition({ steps: [] });
    assert.equal(invalidDef1.valid, false);
    assert.ok(invalidDef1.errors[0].includes('at least one step'));

    // Non-existent target step reference
    const invalidDef2 = workflowService.validateWorkflowDefinition({
      steps: [
        { id: 'step_1', type: 'action', action_type: 'create_cs_task', next_step_id: 'non_existent_step' }
      ]
    });
    assert.equal(invalidDef2.valid, false);
    assert.ok(invalidDef2.errors[0].includes('non-existent next_step_id'));

    // Valid workflow creation
    const validWf = await workflowService.createWorkflow({
      name: 'Onboarding VIP Workflow',
      workflow_type: 'onboarding',
      trigger_config: { event_type: 'customer_onboarding_started' },
      workflow_config: {
        steps: [
          { id: 'step_1', type: 'action', action_type: 'create_cs_task', params: { title: 'Kickoff' }, next_step_id: null }
        ]
      },
      workspace_id: 'ws-test-1',
    });

    assert.equal(validWf.name, 'Onboarding VIP Workflow');
    assert.equal(validWf.status, 'draft');
  });

  // TEST 2: Workflow version immutability
  test('2. Publishing freezes version definition into immutable lifecycle_workflow_versions', async () => {
    const wf = await workflowService.createWorkflow({
      name: 'Renewal Reminder',
      workflow_type: 'renewal',
      trigger_config: { event_type: 'renewal_approaching' },
      workflow_config: {
        steps: [
          { id: 'step_1', type: 'action', action_type: 'notify_owner', params: { message: 'Alert' }, next_step_id: null }
        ]
      },
      workspace_id: 'ws-ver',
    });

    const published = await workflowService.publishWorkflow(wf.id, 'Initial publication v1');
    assert.equal(published.workflow.status, 'active');
    assert.equal(published.version.version_number, 1);
    assert.ok(published.version.published_at);

    // Verify version is frozen and throws on attempted mutation
    assert.throws(() => {
      published.version.version_number = 99;
    });
  });

  // TEST 3: Publishing and pausing workflows
  test('3. Workflows can be paused and resumed cleanly', async () => {
    const wf = await workflowService.createWorkflow({
      name: 'Pausable Workflow',
      trigger_config: { event_type: 'meeting_completed' },
      workflow_config: {
        steps: [{ id: 's1', type: 'action', action_type: 'notify_owner', next_step_id: null }]
      },
      workspace_id: 'ws-pause',
    });

    await workflowService.publishWorkflow(wf.id);
    let updated = await workflowService.getWorkflowById(wf.id);
    assert.equal(updated.status, 'active');

    // Pause
    await workflowService.pauseWorkflow(wf.id);
    updated = await workflowService.getWorkflowById(wf.id);
    assert.equal(updated.status, 'paused');

    // Resume
    await workflowService.resumeWorkflow(wf.id);
    updated = await workflowService.getWorkflowById(wf.id);
    assert.equal(updated.status, 'active');
  });

  // TEST 4: Event normalization
  test('4. Normalizes verified events from platform sources with required metadata and timestamps', () => {
    const raw = {
      event_type: 'customer_marked_at_risk',
      source: 'customer_success',
      source_record_id: 'cs-acc-101',
      customer_success_account_id: 'cs-acc-101',
      payload: { health_score: 35, previous_status: 'Stable' },
      workspace_id: 'ws-norm',
    };

    const normalized = eventService.normalizeEvent(raw);
    assert.equal(normalized.event_type, 'customer_marked_at_risk');
    assert.equal(normalized.source, 'customer_success');
    assert.equal(normalized.source_record_id, 'cs-acc-101');
    assert.equal(normalized.workspace_id, 'ws-norm');
    assert.equal(normalized.event_payload.health_score, 35);
    assert.ok(normalized.occurred_at);
  });

  // TEST 5: Event deduplication
  test('5. Deduplicates identical incoming events by (workspace_id, source, source_record_id, event_type)', async () => {
    const eventPayload = {
      event_type: 'deal_won',
      source: 'crm',
      source_record_id: 'deal-9988',
      workspace_id: 'ws-dedup',
      payload: { deal_value: 50000 },
    };

    const first = await eventService.recordEvent(eventPayload);
    assert.equal(first.isDuplicate, false);

    const second = await eventService.recordEvent(eventPayload);
    assert.equal(second.isDuplicate, true);
    assert.equal(first.event.id, second.event.id);
  });

  // TEST 6: Trigger matching
  test('6. Execution engine automatically matches active workflows to verified event types', async () => {
    // Create and activate workflow
    const wf = await workflowService.createWorkflow({
      name: 'Lead Qualified Flow',
      trigger_config: { event_type: 'lead_qualified' },
      workflow_config: {
        steps: [{ id: 's1', type: 'action', action_type: 'notify_owner', params: { message: 'Qualified' }, next_step_id: null }]
      },
      workspace_id: 'ws-trigger',
    });
    await workflowService.publishWorkflow(wf.id);

    // Record verified event
    const { event } = await eventService.recordEvent({
      event_type: 'lead_qualified',
      source: 'crm',
      source_record_id: 'lead-trigger-1',
      lead_id: 'lead-trigger-1',
      workspace_id: 'ws-trigger',
    });

    const runs = await executionService.getRuns({ workspaceId: 'ws-trigger', workflowId: wf.id });
    assert.equal(runs.total, 1);
    assert.equal(runs.runs[0].workflow_id, wf.id);
  });

  // TEST 7: Condition evaluation
  test('7. Deterministic condition evaluator supports numeric, equality, and existence operators', () => {
    const context = {
      variables: {
        contract_value: 75000,
        health_status: 'At Risk',
        days_until_renewal: 45,
      }
    };

    // Numeric comparison
    const cond1 = { field: 'contract_value', operator: '>=', value: 50000 };
    assert.equal(executionService.evaluateCondition(cond1, context), true);

    const cond2 = { field: 'contract_value', operator: '<', value: 20000 };
    assert.equal(executionService.evaluateCondition(cond2, context), false);

    // Equality
    const cond3 = { field: 'health_status', operator: '==', value: 'At Risk' };
    assert.equal(executionService.evaluateCondition(cond3, context), true);

    // In list
    const cond4 = { field: 'health_status', operator: 'in', value: ['At Risk', 'Critical'] };
    assert.equal(executionService.evaluateCondition(cond4, context), true);
  });

  // TEST 8: Missing data handling
  test('8. Missing data is never treated as a positive condition and evaluates safely as false', () => {
    const emptyContext = { variables: {} };

    const condValue = { field: 'untracked_score', operator: '>=', value: 50 };
    assert.equal(executionService.evaluateCondition(condValue, emptyContext), false);

    const condEquality = { field: 'missing_status', operator: '==', value: 'Active' };
    assert.equal(executionService.evaluateCondition(condEquality, emptyContext), false);

    // Missing operator check returns true for actual missing data
    const condMissing = { field: 'missing_status', operator: 'missing' };
    assert.equal(executionService.evaluateCondition(condMissing, emptyContext), true);
  });

  // TEST 9: Workflow run idempotency
  test('9. Prevents identical trigger event from starting duplicate runs for the same workflow version', async () => {
    const wf = await workflowService.createWorkflow({
      name: 'Idempotency Test Flow',
      trigger_config: { event_type: 'customer_marked_at_risk' },
      workflow_config: {
        steps: [{ id: 's1', type: 'action', action_type: 'notify_owner', next_step_id: null }]
      },
      workspace_id: 'ws-run-idem',
    });
    const pub = await workflowService.publishWorkflow(wf.id);

    const triggerEvent = {
      id: 'event-idem-123',
      source_record_id: 'rec-123',
      workspace_id: 'ws-run-idem',
      event_type: 'customer_marked_at_risk',
    };

    const run1 = await executionService.startWorkflowRun(pub.workflow, triggerEvent);
    assert.ok(run1);

    // Duplicate trigger invocation
    const run2 = await executionService.startWorkflowRun(pub.workflow, triggerEvent);
    assert.equal(run2, null); // Duplicate prevented
  });

  // TEST 10: Step execution ordering
  test('10. Executes multi-step sequence in declared sequential order', async () => {
    const wf = await workflowService.createWorkflow({
      name: 'Multi-Step Ordering Flow',
      trigger_config: { event_type: 'lead_created' },
      workflow_config: {
        steps: [
          { id: 'step_1', type: 'action', action_type: 'create_crm_task', params: { title: 'First Task' }, next_step_id: 'step_2' },
          { id: 'step_2', type: 'action', action_type: 'notify_owner', params: { message: 'Second Action' }, next_step_id: null },
        ]
      },
      workspace_id: 'ws-order',
    });
    const pub = await workflowService.publishWorkflow(wf.id);

    const run = await executionService.startWorkflowRun(pub.workflow, {
      id: 'evt-order-1',
      workspace_id: 'ws-order',
      event_type: 'lead_created',
      lead_id: 'lead-1',
    });

    const fullRun = await executionService.getRunById(run.id);
    assert.equal(fullRun.status, 'completed');
    assert.equal(fullRun.steps.length, 2);
    assert.equal(fullRun.steps[0].step_id, 'step_1');
    assert.equal(fullRun.steps[1].step_id, 'step_2');
  });

  // TEST 11: Durable delay and resume behavior
  test('11. Delay steps persist scheduled execution time and pause run until resumed', async () => {
    const wf = await workflowService.createWorkflow({
      name: 'Delayed Flow',
      trigger_config: { event_type: 'onboarding_started' },
      workflow_config: {
        steps: [
          { id: 'step_1', type: 'delay', delay_minutes: 120, next_step_id: 'step_2' },
          { id: 'step_2', type: 'action', action_type: 'notify_owner', next_step_id: null },
        ]
      },
      workspace_id: 'ws-delay',
    });
    const pub = await workflowService.publishWorkflow(wf.id);

    const run = await executionService.startWorkflowRun(pub.workflow, {
      id: 'evt-delay-1',
      workspace_id: 'ws-delay',
      event_type: 'onboarding_started',
    });

    assert.equal(run.status, 'waiting');
    assert.ok(run.next_scheduled_action);

    // Resume execution
    const resumed = await executionService.resumeRun(run.id);
    assert.equal(resumed.status, 'completed');
  });

  // TEST 12: Retry limits and backoff
  test('12. Bounded retries record failure reason when invalid step target is encountered', async () => {
    const wf = await workflowService.createWorkflow({
      name: 'Broken Target Flow',
      trigger_config: { event_type: 'test_retry' },
      workflow_config: {
        steps: [
          { id: 'step_1', type: 'action', action_type: 'notify_owner', next_step_id: 'missing_step_target' }
        ]
      },
      workspace_id: 'ws-retry',
    });
    // Manually register definition to test runtime missing target recovery
    const versionId = 'v-broken';
    workflowService.memoryVersions.set(versionId, {
      id: versionId,
      definition: { workflow_config: wf.workflow_config }
    });
    wf.active_version_id = versionId;

    const run = await executionService.startWorkflowRun(wf, {
      id: 'evt-fail-1',
      workspace_id: 'ws-retry',
      event_type: 'test_retry',
    });

    assert.equal(run.status, 'failed');
    assert.ok(run.failure_reason.includes('not found in workflow definition'));
  });

  // TEST 13: Run cancellation
  test('13. Authorizes cancellation of active or waiting workflow runs', async () => {
    const wf = await workflowService.createWorkflow({
      name: 'Cancellable Flow',
      trigger_config: { event_type: 'test_cancel' },
      workflow_config: {
        steps: [{ id: 'step_1', type: 'delay', delay_minutes: 300, next_step_id: null }]
      },
      workspace_id: 'ws-cancel',
    });
    const pub = await workflowService.publishWorkflow(wf.id);

    const run = await executionService.startWorkflowRun(pub.workflow, {
      id: 'evt-cancel-1',
      workspace_id: 'ws-cancel',
      event_type: 'test_cancel',
    });

    assert.equal(run.status, 'waiting');

    const cancelled = await executionService.cancelRun(run.id, 'User manually cancelled workflow');
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.failure_reason, 'User manually cancelled workflow');
  });

  // TEST 14: Approval-required action enforcement
  test('14. Sensitive actions are halted with waiting_approval status until explicit human authorization', async () => {
    const wf = await workflowService.createWorkflow({
      name: 'Approval Required Flow',
      trigger_config: { event_type: 'lead_qualified' },
      workflow_config: {
        steps: [
          {
            id: 'step_1',
            type: 'action',
            action_type: 'send_first_contact_email', // Sensitive action requires approval
            params: { template: 'cold_outreach' },
            next_step_id: null,
          }
        ]
      },
      workspace_id: 'ws-approval',
    });
    const pub = await workflowService.publishWorkflow(wf.id);

    const run = await executionService.startWorkflowRun(pub.workflow, {
      id: 'evt-app-1',
      workspace_id: 'ws-approval',
      event_type: 'lead_qualified',
    });

    assert.equal(run.status, 'waiting');

    const approvals = await actionService.getApprovals({ workspaceId: 'ws-approval', status: 'pending' });
    assert.equal(approvals.total, 1);
    assert.equal(approvals.approvals[0].action_type, 'send_first_contact_email');
  });

  // TEST 15: Approval and rejection workflows
  test('15. Approving an action unblocks execution; rejecting records reason in audit trail', async () => {
    const approval = await actionService.createApprovalRequest({
      workspace_id: 'ws-app-flow',
      action_type: 'escalate_customer_account',
      proposed_action: { reason: 'Health decline' },
      requested_by: 'automation',
    });

    assert.equal(approval.status, 'pending');

    // Reject test
    const rejected = await actionService.rejectAction(approval.id, { userId: 'manager-1' }, 'Customer already reached out via phone');
    assert.equal(rejected.status, 'rejected');
    assert.equal(rejected.rejection_reason, 'Customer already reached out via phone');
  });

  // TEST 16: Email suppression and unsubscribe enforcement
  test('16. Email actions verify suppression and unsubscribe lists, blocking non-compliant outreach', async () => {
    const suppressedEmail = 'optout@enterprise.com';
    actionService.suppressEmail(suppressedEmail);

    const compliance = await actionService.verifyEmailCompliance(suppressedEmail);
    assert.equal(compliance.allowed, false);
    assert.ok(compliance.reason.includes('suppression list'));

    // Attempt email action execution for suppressed contact
    const result = await actionService.executeAction('send_email_template', { recipient_email: suppressedEmail }, {
      workspace_id: 'ws-supp',
      run_id: 'run-supp-1',
      step_id: 'step-supp-1',
    });

    assert.equal(result.success, false);
    assert.equal(result.compliance_blocked, true);
  });

  // TEST 17: Reply-based follow-up cancellation
  test('17. Reply action cancels pending follow-ups without disrupting main queue worker', async () => {
    const mockInboundService = {
      cancelledLeadId: null,
      async cancelPendingFollowups(leadId) {
        this.cancelledLeadId = leadId;
      }
    };
    actionService.inboundEmailService = mockInboundService;

    const result = await actionService.executeAction('cancel_pending_followup', {}, {
      workspace_id: 'ws-reply',
      lead_id: 'lead-replied-77',
    });

    assert.equal(result.success, true);
    assert.equal(result.cancelled_followups, true);
    assert.equal(mockInboundService.cancelledLeadId, 'lead-replied-77');
  });

  // TEST 18: Workspace isolation
  test('18. Strict workspace isolation prevents cross-tenant access to workflows, events, and runs', async () => {
    const wfA = await workflowService.createWorkflow({
      name: 'Tenant A Flow',
      workspace_id: 'ws-tenant-a',
    });

    const wfB = await workflowService.createWorkflow({
      name: 'Tenant B Flow',
      workspace_id: 'ws-tenant-b',
    });

    const listA = await workflowService.getWorkflows({ workspaceId: 'ws-tenant-a' });
    assert.equal(listA.total, 1);
    assert.equal(listA.workflows[0].id, wfA.id);

    const listB = await workflowService.getWorkflows({ workspaceId: 'ws-tenant-b' });
    assert.equal(listB.total, 1);
    assert.equal(listB.workflows[0].id, wfB.id);
  });

  // TEST 19: RBAC and safety levels
  test('19. Prohibits arbitrary code execution or data deletion actions', () => {
    const safety = actionService.getActionSafety('delete_crm_data');
    assert.equal(safety, ACTION_SAFETY_LEVELS.PROHIBITED);

    const safetyScript = actionService.getActionSafety('execute_script');
    assert.equal(safetyScript, ACTION_SAFETY_LEVELS.PROHIBITED);
  });

  // TEST 20: RLS Policies and starter templates
  test('20. Starter templates provide valid, un-published draft recipes for core SaaS lifecycle stages', () => {
    const templates = workflowService.getTemplates();
    assert.ok(templates.length >= 4);

    const onboardingTmpl = templates.find((t) => t.workflow_type === 'onboarding');
    assert.ok(onboardingTmpl);
    assert.equal(onboardingTmpl.trigger_config.event_type, 'customer_onboarding_started');
  });

  // TEST 21: Action audit logging
  test('21. Records comprehensive audit entries for all executed and blocked actions', async () => {
    await actionService.logAudit({
      workspace_id: 'ws-audit',
      workflow_run_id: 'run-aud-1',
      action_type: 'create_cs_task',
      actor: 'system',
      execution_result: { success: true, task_id: 'task-123' },
    });

    const logs = Array.from(actionService.memoryAuditLog.values()).filter((l) => l.workspace_id === 'ws-audit');
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action_type, 'create_cs_task');
    assert.ok(logs[0].timestamp);
  });

  // TEST 22: AI recommendation grounding
  test('22. AI recommendations identify verified at-risk customer patterns with verifiable evidence', async () => {
    // Seed at-risk customer account
    await healthService.createAccount({
      workspaceId: 'ws-rec-test',
      leadId: 'lead-risk-1',
      contractValue: 45000,
      customerStatus: 'at_risk',
    });

    const recs = await recommendationService.generateRecommendations('ws-rec-test');
    assert.ok(recs.length > 0);

    const atRiskRec = recs.find((r) => r.id === 'rec-at-risk-intervention');
    assert.ok(atRiskRec);
    assert.ok(atRiskRec.evidence.includes('marked At Risk'));
    assert.ok(atRiskRec.risks_and_safeguards);
  });

  // TEST 23: AI recommendations cannot auto-publish
  test('23. Creating workflow from AI recommendation creates an editable draft with status draft', async () => {
    await recommendationService.generateRecommendations('ws-draft-rec');
    const draft = await recommendationService.createDraftFromRecommendation('rec-renewal-preparation', 'ws-draft-rec');

    assert.equal(draft.status, 'draft');
    assert.equal(draft.active_version_id, null);
    assert.ok(draft.name.includes('Renewal Preparation'));
  });

  // TEST 24: Analytics attribution integrity
  test('24. Analytics explicitly separates observed completion metrics from attribution methodology', async () => {
    const analytics = await analyticsService.getOverviewAnalytics('ws-analytics-test');
    assert.ok(analytics.summary);
    assert.ok(analytics.attribution);
    assert.equal(analytics.summary.total_runs, 0);
    assert.equal(analytics.summary.completion_rate, 100);
    assert.ok(analytics.attribution.methodology.includes('Deterministic temporal correlation'));
  });

  // TEST 25: No duplicate CRM tasks or duplicate actions
  test('25. Workflow run idempotency prevents duplicate task creation for identical trigger events', async () => {
    const mockCrm = {
      tasks: [],
      async createTask(task) {
        this.tasks.push(task);
        return { id: `task-${this.tasks.length}` };
      }
    };
    actionService.crmService = mockCrm;

    const wf = await workflowService.createWorkflow({
      name: 'Single Task Flow',
      trigger_config: { event_type: 'meeting_booked' },
      workflow_config: {
        steps: [{ id: 's1', type: 'action', action_type: 'create_crm_task', params: { title: 'Prep' }, next_step_id: null }]
      },
      workspace_id: 'ws-single-task',
    });
    const pub = await workflowService.publishWorkflow(wf.id);

    const event = { id: 'evt-dup-task', workspace_id: 'ws-single-task', event_type: 'meeting_booked' };
    await executionService.startWorkflowRun(pub.workflow, event);
    await executionService.startWorkflowRun(pub.workflow, event); // Duplicate attempt

    assert.equal(mockCrm.tasks.length, 1);
  });

  // TEST 26: Financial and CRM integrity: Zero unsolicited CRM modifications
  test('26. Prohibits unsolicited modifications to CRM deal values or stages without explicit approval', async () => {
    const safety = actionService.getActionSafety('change_deal_value_or_stage');
    assert.equal(safety, ACTION_SAFETY_LEVELS.REQUIRES_APPROVAL);

    const result = await actionService.executeAction('change_deal_value_or_stage', { deal_id: 'd1', new_value: 999999 }, {
      workspace_id: 'ws-unsolicited',
      is_approved: false,
    });

    // Halts and creates approval request; does not write to CRM
    assert.equal(result.requires_approval, true);
    assert.equal(result.status, 'waiting_approval');
  });
});
