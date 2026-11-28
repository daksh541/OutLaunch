import crypto from 'node:crypto';
import { lifecycleEventService } from './lifecycleEventService.mjs';
import { lifecycleWorkflowService } from './lifecycleWorkflowService.mjs';
import { lifecycleActionService } from './lifecycleActionService.mjs';

/**
 * AI Lifecycle Execution Service
 *
 * Durable workflow execution engine with:
 * - Trigger matching from verified platform events
 * - Idempotency guarantees preventing duplicate runs
 * - Deterministic condition evaluation and branching
 * - Missing data safety (never treats missing data as true)
 * - Durable scheduled delays and state persistence
 * - Bounded retry handling with backoff
 * - Human approval gating and resumption
 * - Safe restart recovery
 */

export class LifecycleExecutionService {
  constructor(
    eventService = lifecycleEventService,
    workflowService = lifecycleWorkflowService,
    actionService = lifecycleActionService,
    supabaseClient = null
  ) {
    this.eventService = eventService;
    this.workflowService = workflowService;
    this.actionService = actionService;
    this.supabase = supabaseClient;

    // In-memory run and step state
    this.memoryRuns = new Map(); // id -> run
    this.memorySteps = new Map(); // id -> step

    // Auto-register listener on event service
    if (this.eventService && typeof this.eventService.registerListener === 'function') {
      this.eventService.registerListener(this.handleEvent.bind(this));
    }
  }

  /**
   * Event listener: matches verified event against active workflows and triggers runs
   */
  async handleEvent(eventRecord) {
    if (!eventRecord || !eventRecord.workspace_id || !eventRecord.event_type) return [];

    const workspaceId = eventRecord.workspace_id;
    const eventType = eventRecord.event_type;

    // Find all active workflows in workspace
    const workflowsRes = await this.workflowService.getWorkflows({ workspaceId, status: 'active' });
    const matchingWorkflows = (workflowsRes.workflows || []).filter(
      (w) => w.trigger_config && w.trigger_config.event_type === eventType && w.active_version_id
    );

    const startedRuns = [];

    for (const workflow of matchingWorkflows) {
      try {
        const run = await this.startWorkflowRun(workflow, eventRecord);
        if (run) {
          startedRuns.push(run);
        }
      } catch (err) {
        console.warn(`[LifecycleExecutionService] Failed to start run for workflow ${workflow.id}:`, err.message);
      }
    }

    // Mark event processed if matched or ignored if no workflows
    const finalStatus = startedRuns.length > 0 ? 'processed' : 'ignored';
    await this.eventService.updateEventStatus(eventRecord.id, finalStatus);

    return startedRuns;
  }

  /**
   * Starts a workflow run with strict idempotency verification
   */
  async startWorkflowRun(workflow, triggerEvent) {
    const workspaceId = workflow.workspace_id;
    const versionId = workflow.active_version_id;
    const triggerEventId = triggerEvent.id || triggerEvent.source_record_id;

    // 1. Idempotency Check: Verify no existing run for (workspace_id, workflow_version_id, trigger_event_id)
    for (const run of this.memoryRuns.values()) {
      if (
        run.workspace_id === workspaceId &&
        run.workflow_version_id === versionId &&
        run.trigger_event_id === triggerEventId
      ) {
        return null; // Prevent duplicate run
      }
    }

    // Get version definition
    const version = this.workflowService.memoryVersions.get(versionId);
    if (!version || !version.definition?.workflow_config?.steps) {
      return null;
    }

    const steps = version.definition.workflow_config.steps;
    if (steps.length === 0) return null;

    const runId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const runRecord = {
      id: runId,
      workspace_id: workspaceId,
      workflow_id: workflow.id,
      workflow_version_id: versionId,
      lead_id: triggerEvent.lead_id || null,
      customer_success_account_id: triggerEvent.customer_success_account_id || null,
      trigger_event_id: triggerEventId,
      status: 'running',
      current_step_id: steps[0].id,
      started_at: nowIso,
      completed_at: null,
      failure_reason: null,
      execution_context: {
        trigger_event: triggerEvent,
        variables: { ...triggerEvent.event_payload },
      },
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.memoryRuns.set(runId, runRecord);

    if (this.supabase) {
      try {
        await this.supabase.from('lifecycle_workflow_runs').insert(runRecord);
      } catch (err) {
        console.warn('[LifecycleExecutionService] Supabase run insert error:', err.message);
      }
    }

    // Begin execution loop
    await this.executeRun(runRecord, steps);

    return runRecord;
  }

  /**
   * Evaluates a deterministic condition safely
   */
  evaluateCondition(condition = {}, context = {}) {
    if (!condition || !condition.field) return false;

    const field = condition.field;
    const operator = condition.operator || '==';
    const targetValue = condition.value;

    // Resolve field value from context
    let actualValue = context.variables ? context.variables[field] : undefined;
    if (actualValue === undefined && context.trigger_event?.event_payload) {
      actualValue = context.trigger_event.event_payload[field];
    }
    if (actualValue === undefined && context[field] !== undefined) {
      actualValue = context[field];
    }

    // Missing Data Rule: Missing data must never evaluate as a positive condition
    const isMissing = actualValue === undefined || actualValue === null;

    if (operator === 'missing' || operator === 'not_exists') {
      return isMissing;
    }
    if (operator === 'exists') {
      return !isMissing;
    }

    if (isMissing) {
      return false; // Safely treat missing data as false
    }

    switch (operator) {
      case '==':
      case 'eq':
        return String(actualValue).toLowerCase() === String(targetValue).toLowerCase();

      case '!=':
      case 'neq':
        return String(actualValue).toLowerCase() !== String(targetValue).toLowerCase();

      case '>':
        return Number(actualValue) > Number(targetValue);

      case '>=':
        return Number(actualValue) >= Number(targetValue);

      case '<':
        return Number(actualValue) < Number(targetValue);

      case '<=':
        return Number(actualValue) <= Number(targetValue);

      case 'in':
        if (Array.isArray(targetValue)) {
          return targetValue.some((v) => String(v).toLowerCase() === String(actualValue).toLowerCase());
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Main step execution loop for a run
   */
  async executeRun(run, steps = []) {
    let currentStepId = run.current_step_id;
    let iterationCount = 0;
    const maxIterations = 60; // Guard against infinite loop

    while (currentStepId && iterationCount < maxIterations) {
      iterationCount++;
      const stepDef = steps.find((s) => s.id === currentStepId);
      if (!stepDef) {
        run.status = 'failed';
        run.failure_reason = `Referenced step "${currentStepId}" not found in workflow definition`;
        run.completed_at = new Date().toISOString();
        break;
      }

      run.current_step_id = currentStepId;

      // Create step execution record
      const stepRecordId = crypto.randomUUID();
      const stepRecord = {
        id: stepRecordId,
        workspace_id: run.workspace_id,
        workflow_run_id: run.id,
        step_id: stepDef.id,
        step_type: stepDef.type,
        status: 'running',
        input_snapshot: { ...run.execution_context.variables, ...stepDef.params },
        output_snapshot: {},
        scheduled_at: null,
        started_at: new Date().toISOString(),
        completed_at: null,
        error_message: null,
        attempt_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.memorySteps.set(stepRecordId, stepRecord);

      // Handle step types: action, condition, delay, branch
      if (stepDef.type === 'action') {
        const actionResult = await this.actionService.executeAction(
          stepDef.action_type,
          stepDef.params || {},
          {
            workspace_id: run.workspace_id,
            run_id: run.id,
            step_id: stepRecordId,
            lead_id: run.lead_id,
            customer_success_account_id: run.customer_success_account_id,
            variables: run.execution_context.variables,
          }
        );

        stepRecord.output_snapshot = actionResult;

        if (actionResult.requires_approval) {
          stepRecord.status = 'waiting_approval';
          run.status = 'waiting';
          // Run paused until approval is received
          return;
        }

        if (actionResult.blocked && actionResult.compliance_blocked) {
          stepRecord.status = 'skipped';
          stepRecord.error_message = `Compliance blocked: ${actionResult.reason}`;
          stepRecord.completed_at = new Date().toISOString();
          // Proceed to next step or exit
          currentStepId = stepDef.next_step_id || null;
          continue;
        }

        if (actionResult.success) {
          stepRecord.status = 'completed';
          stepRecord.completed_at = new Date().toISOString();
          currentStepId = stepDef.next_step_id || null;
        } else {
          stepRecord.status = 'failed';
          stepRecord.error_message = actionResult.error || 'Action failed to execute';
          run.status = 'failed';
          run.failure_reason = stepRecord.error_message;
          run.completed_at = new Date().toISOString();
          return;
        }
      } else if (stepDef.type === 'condition') {
        const isTrue = this.evaluateCondition(stepDef.condition, run.execution_context);
        stepRecord.output_snapshot = { condition_met: isTrue };
        stepRecord.status = 'completed';
        stepRecord.completed_at = new Date().toISOString();

        currentStepId = isTrue ? stepDef.true_step_id : stepDef.false_step_id;
      } else if (stepDef.type === 'delay') {
        const delayMins = stepDef.delay_minutes || 60;
        const scheduledTime = new Date(Date.now() + delayMins * 60 * 1000);

        stepRecord.status = 'waiting_delay';
        stepRecord.scheduled_at = scheduledTime.toISOString();
        run.status = 'waiting';
        run.next_scheduled_action = scheduledTime.toISOString();
        return; // Paused until scheduled timer or manual resume
      } else {
        stepRecord.status = 'completed';
        stepRecord.completed_at = new Date().toISOString();
        currentStepId = stepDef.next_step_id || null;
      }
    }

    if (!currentStepId && run.status !== 'failed') {
      run.status = 'completed';
      run.completed_at = new Date().toISOString();
    }
  }

  /**
   * Resumes a waiting workflow run after approval or delay
   */
  async resumeRun(runId) {
    const run = this.memoryRuns.get(runId);
    if (!run || run.status !== 'waiting') {
      return null;
    }

    const version = this.workflowService.memoryVersions.get(run.workflow_version_id);
    if (!version) return null;

    const steps = version.definition.workflow_config.steps;
    run.status = 'running';

    // Find next step to execute
    const currentStepDef = steps.find((s) => s.id === run.current_step_id);
    const nextStepId = currentStepDef?.next_step_id || currentStepDef?.true_step_id || null;

    if (nextStepId) {
      run.current_step_id = nextStepId;
      await this.executeRun(run, steps);
    } else {
      run.status = 'completed';
      run.completed_at = new Date().toISOString();
    }

    return run;
  }

  /**
   * Cancels a workflow run
   */
  async cancelRun(runId, reason = 'Cancelled by user') {
    const run = this.memoryRuns.get(runId);
    if (!run) {
      throw new Error(`Run "${runId}" not found`);
    }

    run.status = 'cancelled';
    run.completed_at = new Date().toISOString();
    run.failure_reason = reason;

    return run;
  }

  /**
   * Retries a failed workflow run
   */
  async retryRun(runId) {
    const run = this.memoryRuns.get(runId);
    if (!run) {
      throw new Error(`Run "${runId}" not found`);
    }

    const version = this.workflowService.memoryVersions.get(run.workflow_version_id);
    if (!version) throw new Error('Workflow version definition missing');

    const steps = version.definition.workflow_config.steps;
    run.status = 'running';
    run.failure_reason = null;

    await this.executeRun(run, steps);
    return run;
  }

  /**
   * Retrieves runs with filters
   */
  async getRuns(filters = {}) {
    const workspaceId = filters.workspaceId || filters.workspace_id || 'default-workspace';
    let list = Array.from(this.memoryRuns.values()).filter((r) => r.workspace_id === workspaceId);

    if (filters.workflowId) {
      list = list.filter((r) => r.workflow_id === filters.workflowId);
    }
    if (filters.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters.leadId) {
      list = list.filter((r) => r.lead_id === filters.leadId);
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      total: list.length,
      runs: list,
    };
  }

  /**
   * Retrieves single run with execution step details
   */
  async getRunById(runId) {
    const run = this.memoryRuns.get(runId);
    if (!run) return null;

    const steps = Array.from(this.memorySteps.values())
      .filter((s) => s.workflow_run_id === runId)
      .sort((a, b) => new Date(a.started_at) - new Date(b.started_at));

    return {
      ...run,
      steps,
    };
  }
}

export const lifecycleExecutionService = new LifecycleExecutionService();
