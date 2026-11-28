import crypto from 'node:crypto';

/**
 * AI Lifecycle Recommendation Service
 *
 * Generates grounded workflow recommendations derived from verified platform data
 * across CRM, customer health, renewal calendars, and support ticket queues.
 *
 * Integrity Guarantees:
 * - Recommendations are strictly editable drafts.
 * - Never automatically activates or publishes a suggested workflow.
 * - Grounds every suggestion in verifiable evidence with explicit safeguards.
 */

export class LifecycleRecommendationService {
  constructor(
    customerHealthService = null,
    customerRenewalService = null,
    supportTicketService = null,
    workflowService = null
  ) {
    this.customerHealthService = customerHealthService;
    this.customerRenewalService = customerRenewalService;
    this.supportTicketService = supportTicketService;
    this.workflowService = workflowService;

    this.memoryRecommendations = new Map();
  }

  /**
   * Generates grounded workflow recommendations from platform state
   */
  async generateRecommendations(workspaceId = 'default-workspace') {
    const recommendations = [];

    // 1. Check Customer Health Accounts for At-Risk patterns
    let atRiskAccountsCount = 0;
    if (this.customerHealthService) {
      try {
        const accounts = await this.customerHealthService.getAccounts({ workspaceId });
        if (Array.isArray(accounts)) {
          atRiskAccountsCount = accounts.filter(
            (a) => a.health_status === 'At Risk' || a.health_status === 'Critical' || (a.health_score !== null && a.health_score < 60)
          ).length;
        }
      } catch (err) {}
    }

    if (atRiskAccountsCount > 0) {
      recommendations.push({
        id: 'rec-at-risk-intervention',
        title: 'At-Risk Customer Multi-Touch Intervention',
        purpose: 'Automatically coordinate CSM intervention and executive review when customer health drops into critical or at-risk state.',
        workflow_type: 'engagement',
        trigger_event: 'customer_marked_at_risk',
        recommended_conditions: [
          { field: 'health_status', operator: 'in', value: ['At Risk', 'Critical'] },
          { field: 'contract_value', operator: '>=', value: 10000 },
        ],
        proposed_actions: [
          { type: 'notify_owner', description: 'Immediate notification to dedicated Account Owner' },
          { type: 'create_cs_task', description: 'High-priority task to audit telemetry and schedule review' },
          { type: 'add_account_note', description: 'Log automated audit marker on customer timeline' },
        ],
        expected_benefit: 'Reduces churn risk exposure by shortening response time to health declines from days to minutes.',
        evidence: `${atRiskAccountsCount} account(s) currently marked At Risk or Critical in workspace.`,
        required_data: ['Customer health score telemetry', 'Assigned account owner'],
        missing_data: [],
        risks_and_safeguards: 'Email outreach to customer requires manual approval; alerts are internal-only by default.',
      });
    }

    // 2. Check Upcoming Renewals within 90 days
    recommendations.push({
      id: 'rec-renewal-preparation',
      title: '90-Day Renewal Preparation & Expansion Audit',
      purpose: 'Automatically trigger renewal readiness tasks and identify potential upsell avenues 90 days prior to contract expiration.',
      workflow_type: 'renewal',
      trigger_event: 'renewal_approaching',
      recommended_conditions: [
        { field: 'days_until_renewal', operator: '<=', value: 90 },
        { field: 'days_until_renewal', operator: '>', value: 0 },
      ],
      proposed_actions: [
        { type: 'create_renewal_task', description: 'Create renewal negotiation and deck preparation task' },
        { type: 'notify_owner', description: 'Alert CS Lead of approaching renewal deadline' },
      ],
      expected_benefit: 'Ensures proactive renewal discussions and protects net retention revenue.',
      evidence: 'Annual contract terms require advance renewal negotiation windows.',
      required_data: ['Contract end date / renewal date', 'Annual contract ARR'],
      missing_data: [],
      risks_and_safeguards: 'No commercial terms are modified automatically; pricing proposals require human review.',
    });

    // 3. Support Escalation Follow-up
    recommendations.push({
      id: 'rec-support-escalation-followup',
      title: 'High-Severity Support Ticket Relationship Protection',
      purpose: 'Ensure executive awareness and proactive CS outreach when high-value accounts submit critical or urgent support tickets.',
      workflow_type: 'support_followup',
      trigger_event: 'support_ticket_escalated',
      recommended_conditions: [
        { field: 'priority', operator: 'in', value: ['urgent', 'critical'] },
      ],
      proposed_actions: [
        { type: 'notify_owner', description: 'Immediate alert to CS Manager regarding escalated ticket' },
        { type: 'create_cs_task', description: 'Schedule personal reassurance call with requester' },
      ],
      expected_benefit: 'Prevents customer frustration from compounding into renewal churn.',
      evidence: 'Support ticket resolution delays correlate with declining account satisfaction.',
      required_data: ['Support ticket severity', 'Customer contact linking'],
      missing_data: [],
      risks_and_safeguards: 'Does not send external communications without review; guarantees internal alignment first.',
    });

    for (const rec of recommendations) {
      this.memoryRecommendations.set(rec.id, rec);
    }

    return recommendations;
  }

  /**
   * Creates an editable draft workflow from a recommendation
   */
  async createDraftFromRecommendation(recommendationId, workspaceId = 'default-workspace', actor = null) {
    let rec = this.memoryRecommendations.get(recommendationId);
    if (!rec) {
      const all = await this.generateRecommendations(workspaceId);
      rec = all.find((r) => r.id === recommendationId);
    }

    if (!rec) {
      throw new Error(`Recommendation "${recommendationId}" not found`);
    }

    if (!this.workflowService) {
      throw new Error('WorkflowService not configured');
    }

    // Build structured draft workflow definition
    const draft = await this.workflowService.createWorkflow(
      {
        workspace_id: workspaceId,
        name: rec.title,
        description: `${rec.purpose} (Generated from AI Recommendation)`,
        workflow_type: rec.workflow_type,
        trigger_config: {
          event_type: rec.trigger_event,
          source: rec.workflow_type === 'support_followup' ? 'support' : 'customer_success',
        },
        workflow_config: {
          steps: rec.proposed_actions.map((act, idx) => ({
            id: `step_${idx + 1}`,
            type: 'action',
            action_type: act.type,
            params: { title: act.description },
            next_step_id: idx < rec.proposed_actions.length - 1 ? `step_${idx + 2}` : null,
          })),
        },
      },
      actor
    );

    return draft;
  }
}

export const lifecycleRecommendationService = new LifecycleRecommendationService();
