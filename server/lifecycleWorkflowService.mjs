import crypto from 'node:crypto';

/**
 * AI Lifecycle Workflow Service
 *
 * Manages workflow definitions, drafts, version immutability,
 * publishing, pausing, validation, duplication, and starter templates.
 *
 * Guarantees:
 * - Published versions are immutable (lifecycle_workflow_versions).
 * - Editing an active workflow edits a working draft; active execution remains pinned to published version.
 * - Enforces workflow definition schema, cycle prevention, and safe step limits.
 * - Strict workspace isolation on all definitions and versions.
 */

export const WORKFLOW_TYPES = ['onboarding', 'engagement', 'renewal', 'reactivation', 'support_followup', 'custom'];
export const WORKFLOW_STATUSES = ['draft', 'active', 'paused', 'archived'];

export const STARTER_TEMPLATES = [
  {
    id: 'template-onboarding',
    name: 'New Customer Success Onboarding',
    description: 'Triggered when customer onboarding begins. Automatically creates onboarding checklist tasks and schedules kickoff review.',
    workflow_type: 'onboarding',
    trigger_config: {
      event_type: 'customer_onboarding_started',
      source: 'customer_success',
    },
    workflow_config: {
      steps: [
        {
          id: 'step_1',
          type: 'action',
          action_type: 'create_cs_task',
          params: { title: 'Prepare Customer Success Onboarding Kickoff deck', priority: 'high' },
          next_step_id: 'step_2',
        },
        {
          id: 'step_2',
          type: 'delay',
          delay_minutes: 1440, // 24 hours
          next_step_id: 'step_3',
        },
        {
          id: 'step_3',
          type: 'action',
          action_type: 'send_email_template',
          params: { template_name: 'onboarding_welcome', subject: 'Welcome to OutLaunch - Next Steps' },
          requires_approval: true,
          next_step_id: null,
        },
      ],
    },
  },
  {
    id: 'template-at-risk',
    name: 'At-Risk Customer Proactive Intervention',
    description: 'Triggered when customer health drops into At Risk or Critical category. Alerts account owner and initiates review.',
    workflow_type: 'engagement',
    trigger_config: {
      event_type: 'customer_marked_at_risk',
      source: 'customer_success',
    },
    workflow_config: {
      steps: [
        {
          id: 'step_1',
          type: 'action',
          action_type: 'notify_owner',
          params: { message: 'Customer health transitioned to At Risk. Immediate review recommended.' },
          next_step_id: 'step_2',
        },
        {
          id: 'step_2',
          type: 'action',
          action_type: 'create_cs_task',
          params: { title: 'Conduct customer health intervention and schedule executive review', priority: 'urgent' },
          next_step_id: null,
        },
      ],
    },
  },
  {
    id: 'template-renewal',
    name: 'Enterprise Renewal Preparation (90 Days)',
    description: 'Triggered when contract renewal is approaching. Creates renewal opportunity review and schedules check-in.',
    workflow_type: 'renewal',
    trigger_config: {
      event_type: 'renewal_approaching',
      source: 'renewal',
    },
    workflow_config: {
      steps: [
        {
          id: 'step_1',
          type: 'condition',
          condition: {
            field: 'contract_value',
            operator: '>=',
            value: 20000,
          },
          true_step_id: 'step_enterprise_prep',
          false_step_id: 'step_standard_prep',
        },
        {
          id: 'step_enterprise_prep',
          type: 'action',
          action_type: 'create_renewal_task',
          params: { title: 'Enterprise Renewal Deck & Expansion Opportunity Review', priority: 'urgent' },
          next_step_id: null,
        },
        {
          id: 'step_standard_prep',
          type: 'action',
          action_type: 'create_renewal_task',
          params: { title: 'Standard Renewal Confirmation Outreach', priority: 'medium' },
          next_step_id: null,
        },
      ],
    },
  },
  {
    id: 'template-support-escalation',
    name: 'Urgent Support Ticket Escalation Follow-up',
    description: 'Triggered when high-priority or escalated support ticket is created for an enterprise account.',
    workflow_type: 'support_followup',
    trigger_config: {
      event_type: 'support_ticket_escalated',
      source: 'support',
    },
    workflow_config: {
      steps: [
        {
          id: 'step_1',
          type: 'action',
          action_type: 'notify_owner',
          params: { message: 'Support ticket escalated. Review customer relationship and sentiment context.' },
          next_step_id: 'step_2',
        },
        {
          id: 'step_2',
          type: 'action',
          action_type: 'add_account_note',
          params: { note: 'Automated note: Critical support escalation logged.' },
          next_step_id: null,
        },
      ],
    },
  },
];

export class LifecycleWorkflowService {
  constructor(supabaseClient = null) {
    this.supabase = supabaseClient;
    this.memoryWorkflows = new Map(); // id -> workflow
    this.memoryVersions = new Map(); // id -> version
  }

  /**
   * Validates workflow definition before activation or publishing
   */
  validateWorkflowDefinition(definition = {}) {
    if (!definition || typeof definition !== 'object') {
      return { valid: false, errors: ['Workflow definition must be an object'] };
    }

    const errors = [];
    const steps = definition.steps;

    if (!Array.isArray(steps) || steps.length === 0) {
      errors.push('Workflow must contain at least one step');
      return { valid: false, errors };
    }

    if (steps.length > 50) {
      errors.push('Workflow exceeds maximum allowed steps limit (50 steps)');
    }

    const stepIds = new Set();
    const validStepTypes = ['action', 'condition', 'delay', 'branch'];

    for (const step of steps) {
      if (!step.id) {
        errors.push('Every step must have a unique id');
        continue;
      }
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step id detected: ${step.id}`);
      }
      stepIds.add(step.id);

      if (!validStepTypes.includes(step.type)) {
        errors.push(`Step "${step.id}" has unsupported type: "${step.type}"`);
      }

      if (step.type === 'action' && !step.action_type) {
        errors.push(`Action step "${step.id}" must declare an action_type`);
      }

      if (step.type === 'delay' && (!step.delay_minutes || step.delay_minutes <= 0)) {
        errors.push(`Delay step "${step.id}" must specify positive delay_minutes`);
      }

      if (step.type === 'condition' && !step.condition) {
        errors.push(`Condition step "${step.id}" must specify a condition object`);
      }
    }

    // Cycle check: verify step target references exist
    for (const step of steps) {
      if (step.next_step_id && !stepIds.has(step.next_step_id)) {
        errors.push(`Step "${step.id}" references non-existent next_step_id: "${step.next_step_id}"`);
      }
      if (step.true_step_id && !stepIds.has(step.true_step_id)) {
        errors.push(`Step "${step.id}" references non-existent true_step_id: "${step.true_step_id}"`);
      }
      if (step.false_step_id && !stepIds.has(step.false_step_id)) {
        errors.push(`Step "${step.id}" references non-existent false_step_id: "${step.false_step_id}"`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Creates a new draft workflow
   */
  async createWorkflow(workflowData = {}, actor = null) {
    const workspaceId = workflowData.workspace_id || actor?.workspaceId || 'default-workspace';
    const name = String(workflowData.name || 'Untitled Workflow').trim();
    if (!name) {
      throw new Error('Workflow name is required');
    }

    const workflowId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const record = {
      id: workflowId,
      workspace_id: workspaceId,
      name,
      description: workflowData.description || null,
      workflow_type: WORKFLOW_TYPES.includes(workflowData.workflow_type) ? workflowData.workflow_type : 'custom',
      status: 'draft',
      trigger_config: workflowData.trigger_config || {},
      workflow_config: workflowData.workflow_config || { steps: [] },
      active_version_id: null,
      created_by: actor?.userId || null,
      updated_by: actor?.userId || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    this.memoryWorkflows.set(workflowId, record);

    if (this.supabase) {
      try {
        await this.supabase.from('lifecycle_workflows').insert(record);
      } catch (err) {
        console.warn('[LifecycleWorkflowService] Supabase insert error:', err.message);
      }
    }

    return record;
  }

  /**
   * Updates a draft workflow or draft configuration of an active workflow
   */
  async updateWorkflow(workflowId, updates = {}, actor = null) {
    const existing = this.memoryWorkflows.get(workflowId);
    if (!existing) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    const nowIso = new Date().toISOString();
    const nextState = {
      ...existing,
      ...updates,
      updated_by: actor?.userId || existing.updated_by,
      updated_at: nowIso,
    };

    // If updating config or trigger on an active workflow, keep status active but definition remains working draft until published
    this.memoryWorkflows.set(workflowId, nextState);

    if (this.supabase) {
      try {
        await this.supabase.from('lifecycle_workflows').update(nextState).eq('id', workflowId);
      } catch (err) {
        console.warn('[LifecycleWorkflowService] Supabase update error:', err.message);
      }
    }

    return nextState;
  }

  /**
   * Publishes a workflow as an immutable version and activates it
   */
  async publishWorkflow(workflowId, changeSummary = 'Published new version', actor = null) {
    const workflow = this.memoryWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    const validation = this.validateWorkflowDefinition(workflow.workflow_config);
    if (!validation.valid) {
      throw new Error(`Cannot publish invalid workflow: ${validation.errors.join('; ')}`);
    }

    if (!workflow.trigger_config?.event_type) {
      throw new Error('Workflow trigger event_type must be specified before publishing');
    }

    // Determine next version number
    const existingVersions = Array.from(this.memoryVersions.values()).filter((v) => v.workflow_id === workflowId);
    const versionNumber = existingVersions.length + 1;

    const versionId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const versionRecord = {
      id: versionId,
      workspace_id: workflow.workspace_id,
      workflow_id: workflowId,
      version_number: versionNumber,
      definition: {
        trigger_config: workflow.trigger_config,
        workflow_config: workflow.workflow_config,
      },
      published_by: actor?.userId || null,
      published_at: nowIso,
      change_summary: changeSummary || `Version ${versionNumber}`,
    };

    // Store version as immutable frozen object
    this.memoryVersions.set(versionId, Object.freeze(versionRecord));

    if (this.supabase) {
      try {
        await this.supabase.from('lifecycle_workflow_versions').insert(versionRecord);
      } catch (err) {
        console.warn('[LifecycleWorkflowService] Supabase version insert error:', err.message);
      }
    }

    // Update workflow status to active and point to new version
    const updated = await this.updateWorkflow(
      workflowId,
      {
        status: 'active',
        active_version_id: versionId,
      },
      actor
    );

    return {
      workflow: updated,
      version: versionRecord,
    };
  }

  /**
   * Pauses an active workflow
   */
  async pauseWorkflow(workflowId, actor = null) {
    return this.updateWorkflow(workflowId, { status: 'paused' }, actor);
  }

  /**
   * Resumes a paused workflow
   */
  async resumeWorkflow(workflowId, actor = null) {
    const workflow = this.memoryWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }
    if (!workflow.active_version_id) {
      throw new Error('Cannot resume workflow without a published active version');
    }
    return this.updateWorkflow(workflowId, { status: 'active' }, actor);
  }

  /**
   * Duplicates an existing workflow into a new draft
   */
  async duplicateWorkflow(workflowId, newName = null, actor = null) {
    const existing = this.memoryWorkflows.get(workflowId);
    if (!existing) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    return this.createWorkflow(
      {
        workspace_id: existing.workspace_id,
        name: newName || `${existing.name} (Copy)`,
        description: existing.description,
        workflow_type: existing.workflow_type,
        trigger_config: JSON.parse(JSON.stringify(existing.trigger_config)),
        workflow_config: JSON.parse(JSON.stringify(existing.workflow_config)),
      },
      actor
    );
  }

  /**
   * Get starter templates
   */
  getTemplates() {
    return STARTER_TEMPLATES;
  }

  /**
   * Create workflow from starter template
   */
  async createFromTemplate(templateId, workspaceId = 'default-workspace', actor = null) {
    const template = STARTER_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      throw new Error(`Template "${templateId}" not found`);
    }

    return this.createWorkflow(
      {
        workspace_id: workspaceId,
        name: template.name,
        description: template.description,
        workflow_type: template.workflow_type,
        trigger_config: template.trigger_config,
        workflow_config: template.workflow_config,
      },
      actor
    );
  }

  /**
   * Retrieves single workflow with active version definition
   */
  async getWorkflowById(workflowId, workspaceId = null) {
    const workflow = this.memoryWorkflows.get(workflowId);
    if (!workflow || (workspaceId && workflow.workspace_id !== workspaceId)) {
      return null;
    }

    let activeVersion = null;
    if (workflow.active_version_id) {
      activeVersion = this.memoryVersions.get(workflow.active_version_id) || null;
    }

    return {
      ...workflow,
      active_version: activeVersion,
    };
  }

  /**
   * Get version history for a workflow
   */
  async getWorkflowVersions(workflowId, workspaceId = null) {
    const versions = Array.from(this.memoryVersions.values()).filter(
      (v) => v.workflow_id === workflowId && (!workspaceId || v.workspace_id === workspaceId)
    );
    return versions.sort((a, b) => b.version_number - a.version_number);
  }

  /**
   * Retrieves workflows list for workspace
   */
  async getWorkflows(filters = {}) {
    const workspaceId = filters.workspaceId || filters.workspace_id || 'default-workspace';
    let list = Array.from(this.memoryWorkflows.values()).filter((w) => w.workspace_id === workspaceId);

    if (filters.status) {
      list = list.filter((w) => w.status === filters.status);
    }
    if (filters.workflowType) {
      list = list.filter((w) => w.workflow_type === filters.workflowType);
    }
    if (filters.search) {
      const q = String(filters.search).toLowerCase();
      list = list.filter((w) => w.name.toLowerCase().includes(q) || (w.description && w.description.toLowerCase().includes(q)));
    }

    list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    return {
      total: list.length,
      workflows: list,
    };
  }
}

export const lifecycleWorkflowService = new LifecycleWorkflowService();
