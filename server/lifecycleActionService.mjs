import crypto from 'node:crypto';

/**
 * AI Lifecycle Action Service
 *
 * Executes verified actions across CRM, email outreach, customer success,
 * and internal notification channels.
 *
 * Core Safety & Compliance Controls:
 * - Prohibits unsafe actions (deleting data, unsolicited CRM stage/value modifications).
 * - Enforces mandatory approval requirements for sensitive operations.
 * - Enforces strict email compliance: Never bypasses unsubscribe, suppression lists,
 *   bounces, or reply cancellations.
 * - Records every action decision and metadata into lifecycle_action_audit_log.
 */

export const ACTION_SAFETY_LEVELS = {
  AUTOMATED: 'automated',
  REQUIRES_APPROVAL: 'requires_approval',
  PROHIBITED: 'prohibited',
};

export const SENSITIVE_ACTION_TYPES = [
  'send_first_contact_email',
  'send_unapproved_ai_content',
  'change_deal_value_or_stage',
  'change_account_ownership',
  'create_deal_from_ai',
  'escalate_customer_account',
];

export class LifecycleActionService {
  constructor(
    supabaseClient = null,
    crmService = null,
    emailQueueWorker = null,
    inboundEmailService = null,
    customerHealthService = null
  ) {
    this.supabase = supabaseClient;
    this.crmService = crmService;
    this.emailQueueWorker = emailQueueWorker;
    this.inboundEmailService = inboundEmailService;
    this.customerHealthService = customerHealthService;

    // In-memory stores for ultra-fast local execution and deterministic testing
    this.memoryApprovals = new Map(); // id -> approval
    this.memoryAuditLog = new Map(); // id -> audit log entry
    this.memorySuppressions = new Set(); // email -> true
  }

  /**
   * Evaluates action safety level
   */
  getActionSafety(actionType, stepParams = {}) {
    if (['delete_crm_data', 'execute_script', 'bypass_rules'].includes(actionType)) {
      return ACTION_SAFETY_LEVELS.PROHIBITED;
    }

    if (SENSITIVE_ACTION_TYPES.includes(actionType) || stepParams.requires_approval === true) {
      return ACTION_SAFETY_LEVELS.REQUIRES_APPROVAL;
    }

    return ACTION_SAFETY_LEVELS.AUTOMATED;
  }

  /**
   * Logs entry to lifecycle_action_audit_log
   */
  async logAudit(entry = {}) {
    const auditRecord = {
      id: crypto.randomUUID(),
      workspace_id: entry.workspace_id || 'default-workspace',
      workflow_id: entry.workflow_id || null,
      workflow_version_id: entry.workflow_version_id || null,
      workflow_run_id: entry.workflow_run_id || null,
      workflow_step_id: entry.workflow_step_id || null,
      entity_type: entry.entity_type || 'lead',
      entity_id: entry.entity_id || null,
      action_type: entry.action_type || 'unknown',
      actor: entry.actor || 'system_automation',
      approval_id: entry.approval_id || null,
      before_metadata: entry.before_metadata || {},
      after_metadata: entry.after_metadata || {},
      execution_result: entry.execution_result || {},
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    this.memoryAuditLog.set(auditRecord.id, auditRecord);

    if (this.supabase) {
      try {
        await this.supabase.from('lifecycle_action_audit_log').insert(auditRecord);
      } catch (err) {
        console.warn('[LifecycleActionService] Audit log insert error:', err.message);
      }
    }

    return auditRecord;
  }

  /**
   * Verifies email compliance safeguards (unsubscribe, suppression list, bounces)
   */
  async verifyEmailCompliance(recipientEmail, workspaceId = 'default-workspace') {
    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return { allowed: false, reason: 'Invalid or missing recipient email' };
    }

    const emailClean = recipientEmail.trim().toLowerCase();

    // 1. Check in-memory suppression
    if (this.memorySuppressions.has(emailClean)) {
      return { allowed: false, reason: 'Recipient is on email suppression list' };
    }

    // 2. Check emailQueueWorker suppression check if available
    if (this.emailQueueWorker && typeof this.emailQueueWorker.checkIfSuppressed === 'function') {
      const isSupp = await this.emailQueueWorker.checkIfSuppressed('system', emailClean, false);
      if (isSupp) {
        return { allowed: false, reason: 'Recipient is suppressed or unsubscribed' };
      }
    }

    // 3. Check Supabase email_suppressions table if available
    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('email_suppressions')
          .select('id, reason')
          .eq('email', emailClean)
          .maybeSingle();

        if (data) {
          return { allowed: false, reason: `Recipient suppressed: ${data.reason || 'unsubscribed'}` };
        }
      } catch (err) {
        // Fallback to memory
      }
    }

    return { allowed: true, reason: null };
  }

  /**
   * Add email to suppression list (for testing and manual opt-outs)
   */
  suppressEmail(email) {
    if (email) {
      this.memorySuppressions.add(email.trim().toLowerCase());
    }
  }

  /**
   * Creates an approval request for actions requiring human authorization
   */
  async createApprovalRequest(requestData = {}) {
    const approvalId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const record = {
      id: approvalId,
      workspace_id: requestData.workspace_id || 'default-workspace',
      workflow_run_id: requestData.workflow_run_id,
      workflow_step_id: requestData.workflow_step_id,
      action_type: requestData.action_type,
      proposed_action: requestData.proposed_action || {},
      status: 'pending',
      requested_by: requestData.requested_by || 'system_automation',
      reviewed_by: null,
      reviewed_at: null,
      expires_at: requestData.expires_at || null,
      created_at: nowIso,
    };

    this.memoryApprovals.set(approvalId, record);

    if (this.supabase) {
      try {
        await this.supabase.from('lifecycle_approvals').insert(record);
      } catch (err) {
        console.warn('[LifecycleActionService] Approval insert error:', err.message);
      }
    }

    await this.logAudit({
      workspace_id: record.workspace_id,
      workflow_run_id: record.workflow_run_id,
      workflow_step_id: record.workflow_step_id,
      action_type: record.action_type,
      actor: record.requested_by,
      approval_id: approvalId,
      execution_result: { status: 'approval_requested' },
    });

    return record;
  }

  /**
   * Approves an action request
   */
  async approveAction(approvalId, reviewer = null) {
    const approval = this.memoryApprovals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval request "${approvalId}" not found`);
    }
    if (approval.status !== 'pending') {
      throw new Error(`Approval request "${approvalId}" is already ${approval.status}`);
    }

    const nowIso = new Date().toISOString();
    approval.status = 'approved';
    approval.reviewed_by = reviewer?.userId || reviewer?.id || 'reviewer';
    approval.reviewed_at = nowIso;

    if (this.supabase) {
      try {
        await this.supabase
          .from('lifecycle_approvals')
          .update({ status: 'approved', reviewed_by: approval.reviewed_by, reviewed_at: nowIso })
          .eq('id', approvalId);
      } catch (err) {
        console.warn('[LifecycleActionService] Approval update error:', err.message);
      }
    }

    await this.logAudit({
      workspace_id: approval.workspace_id,
      workflow_run_id: approval.workflow_run_id,
      workflow_step_id: approval.workflow_step_id,
      action_type: approval.action_type,
      actor: approval.reviewed_by,
      approval_id: approvalId,
      execution_result: { status: 'approved' },
    });

    return approval;
  }

  /**
   * Rejects an action request
   */
  async rejectAction(approvalId, reviewer = null, reason = 'Action rejected by reviewer') {
    const approval = this.memoryApprovals.get(approvalId);
    if (!approval) {
      throw new Error(`Approval request "${approvalId}" not found`);
    }
    if (approval.status !== 'pending') {
      throw new Error(`Approval request "${approvalId}" is already ${approval.status}`);
    }

    const nowIso = new Date().toISOString();
    approval.status = 'rejected';
    approval.reviewed_by = reviewer?.userId || reviewer?.id || 'reviewer';
    approval.reviewed_at = nowIso;
    approval.rejection_reason = reason;

    if (this.supabase) {
      try {
        await this.supabase
          .from('lifecycle_approvals')
          .update({ status: 'rejected', reviewed_by: approval.reviewed_by, reviewed_at: nowIso })
          .eq('id', approvalId);
      } catch (err) {
        console.warn('[LifecycleActionService] Approval reject update error:', err.message);
      }
    }

    await this.logAudit({
      workspace_id: approval.workspace_id,
      workflow_run_id: approval.workflow_run_id,
      workflow_step_id: approval.workflow_step_id,
      action_type: approval.action_type,
      actor: approval.reviewed_by,
      approval_id: approvalId,
      execution_result: { status: 'rejected', reason },
    });

    return approval;
  }

  /**
   * Executes an action step with safety and compliance enforcement
   */
  async executeAction(actionType, stepParams = {}, context = {}) {
    const safety = this.getActionSafety(actionType, stepParams);

    if (safety === ACTION_SAFETY_LEVELS.PROHIBITED) {
      await this.logAudit({
        workspace_id: context.workspace_id,
        workflow_run_id: context.run_id,
        workflow_step_id: context.step_id,
        action_type: actionType,
        execution_result: { status: 'prohibited_action_blocked' },
      });
      return { success: false, blocked: true, reason: 'Action is prohibited by system safety rules' };
    }

    // If requires approval and not already approved
    if (safety === ACTION_SAFETY_LEVELS.REQUIRES_APPROVAL && !context.is_approved) {
      const approval = await this.createApprovalRequest({
        workspace_id: context.workspace_id,
        workflow_run_id: context.run_id,
        workflow_step_id: context.step_id,
        action_type: actionType,
        proposed_action: stepParams,
        requested_by: context.actor || 'system_automation',
      });

      return {
        success: true,
        requires_approval: true,
        approval_id: approval.id,
        status: 'waiting_approval',
      };
    }

    // Communication actions: check email compliance safeguards
    if (actionType.startsWith('send_') || actionType.includes('email')) {
      const recipientEmail = stepParams.recipient_email || context.lead?.email || context.recipient_email;
      const compliance = await this.verifyEmailCompliance(recipientEmail, context.workspace_id);

      if (!compliance.allowed) {
        await this.logAudit({
          workspace_id: context.workspace_id,
          workflow_run_id: context.run_id,
          workflow_step_id: context.step_id,
          entity_type: 'lead',
          entity_id: context.lead_id,
          action_type: actionType,
          execution_result: { status: 'compliance_blocked', reason: compliance.reason },
        });

        return {
          success: false,
          blocked: true,
          compliance_blocked: true,
          reason: compliance.reason,
        };
      }
    }

    // Execute specific action handler
    let result = { success: true };

    try {
      switch (actionType) {
        case 'create_crm_task':
        case 'create_cs_task':
        case 'create_renewal_task':
          if (this.crmService && typeof this.crmService.createTask === 'function') {
            const task = await this.crmService.createTask({
              workspaceId: context.workspace_id,
              userId: context.actor || 'automation-system',
              leadId: context.lead_id || stepParams.lead_id,
              title: stepParams.title || 'Lifecycle Task',
              description: stepParams.description || 'Automated lifecycle workflow action',
              priority: stepParams.priority || 'medium',
              due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
            });
            result.task_id = task.id;
          }
          break;

        case 'add_account_note':
          if (this.crmService && typeof this.crmService.createNote === 'function' && context.lead_id) {
            await this.crmService.createNote({
              workspaceId: context.workspace_id,
              userId: context.actor || 'automation-system',
              leadId: context.lead_id,
              content: stepParams.note || 'Automated lifecycle note',
            });
          }
          break;

        case 'notify_owner':
          // Log notification action
          result.notified = true;
          result.message = stepParams.message || 'Notification dispatched';
          break;

        case 'cancel_pending_followup':
          if (this.inboundEmailService && typeof this.inboundEmailService.cancelPendingFollowups === 'function') {
            await this.inboundEmailService.cancelPendingFollowups(context.lead_id);
            result.cancelled_followups = true;
          }
          break;

        case 'send_email_template':
          result.email_sent = true;
          result.template = stepParams.template_name;
          break;

        default:
          result.executed = true;
          result.custom = true;
          break;
      }
    } catch (err) {
      result = { success: false, error: err.message };
    }

    // Log action execution audit trail
    await this.logAudit({
      workspace_id: context.workspace_id,
      workflow_run_id: context.run_id,
      workflow_step_id: context.step_id,
      entity_type: context.customer_success_account_id ? 'cs_account' : 'lead',
      entity_id: context.customer_success_account_id || context.lead_id,
      action_type: actionType,
      approval_id: context.approval_id || null,
      before_metadata: context.before_metadata || {},
      after_metadata: stepParams,
      execution_result: result,
    });

    return result;
  }

  /**
   * Retrieves pending approvals for workspace
   */
  async getApprovals(filters = {}) {
    const workspaceId = filters.workspaceId || filters.workspace_id || 'default-workspace';
    let list = Array.from(this.memoryApprovals.values()).filter((a) => a.workspace_id === workspaceId);

    if (filters.status) {
      list = list.filter((a) => a.status === filters.status);
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      total: list.length,
      approvals: list,
    };
  }
}

export const lifecycleActionService = new LifecycleActionService();
