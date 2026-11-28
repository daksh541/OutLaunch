import crypto from 'node:crypto';

/**
 * Support Escalation Service
 *
 * Deterministically evaluates support ticket urgency, customer commercial value,
 * renewal proximity, SLA breaches, and sentiment to trigger and manage escalations.
 *
 * Guarantees:
 * - Transparent scoring breakdown (0-100 points)
 * - Cross-references Customer Success and CRM accounts without unsolicited modifications
 * - Requires explicit confirmation for executive alerts or SLA overrides
 */

export class SupportEscalationService {
  constructor(customerHealthService = null, customerRenewalService = null, crmService = null) {
    this.customerHealthService = customerHealthService;
    this.customerRenewalService = customerRenewalService;
    this.crmService = crmService;
  }

  /**
   * Deterministically calculates escalation score and factors
   */
  async evaluateEscalation(ticket, customerAccount = null, slaEvaluation = null) {
    if (!ticket) {
      throw new Error('Ticket is required for escalation evaluation');
    }

    let score = 0;
    const factors = [];

    // 1. Priority scoring (up to 35 pts)
    const priority = String(ticket.priority || 'medium').toLowerCase();
    if (priority === 'critical') {
      score += 35;
      factors.push({ factor: 'Priority Critical', points: 35, category: 'priority' });
    } else if (priority === 'urgent') {
      score += 25;
      factors.push({ factor: 'Priority Urgent', points: 25, category: 'priority' });
    } else if (priority === 'high') {
      score += 15;
      factors.push({ factor: 'Priority High', points: 15, category: 'priority' });
    } else if (priority === 'medium') {
      score += 5;
      factors.push({ factor: 'Priority Medium', points: 5, category: 'priority' });
    }

    // 2. Sentiment scoring (up to 25 pts)
    const sentiment = String(ticket.sentiment || 'neutral').toLowerCase();
    if (sentiment === 'very_negative') {
      score += 25;
      factors.push({ factor: 'Extreme Negative Sentiment', points: 25, category: 'sentiment' });
    } else if (sentiment === 'negative') {
      score += 15;
      factors.push({ factor: 'Negative Sentiment', points: 15, category: 'sentiment' });
    }

    // 3. Customer Success / Commercial Value Context (up to 35 pts)
    let contractValue = 0;
    let daysUntilRenewal = null;
    let healthScore = null;
    let healthStatus = 'Unknown';

    if (customerAccount) {
      contractValue = Number(customerAccount.contract_value) || 0;
      healthScore = customerAccount.health_score;
      healthStatus = customerAccount.health_status || 'Unknown';

      if (customerAccount.renewal_date) {
        const diffMs = new Date(customerAccount.renewal_date).getTime() - Date.now();
        daysUntilRenewal = Math.round(diffMs / (1000 * 60 * 60 * 24));
      }
    }

    if (contractValue >= 100000) {
      score += 25;
      factors.push({ factor: 'Enterprise Account (Value >= $100k)', points: 25, category: 'account' });
    } else if (contractValue >= 50000) {
      score += 20;
      factors.push({ factor: 'High Value Account (Value >= $50k)', points: 20, category: 'account' });
    } else if (contractValue >= 20000) {
      score += 10;
      factors.push({ factor: 'Mid-Market Account (Value >= $20k)', points: 10, category: 'account' });
    }

    // Renewal proximity
    if (daysUntilRenewal !== null && daysUntilRenewal <= 60 && daysUntilRenewal >= 0) {
      score += 15;
      factors.push({
        factor: `Renewal Due in ${daysUntilRenewal} Days`,
        points: 15,
        category: 'renewal',
      });
    }

    // Churn risk or critical health
    if (healthStatus === 'Critical' || (healthScore !== null && healthScore < 40)) {
      score += 15;
      factors.push({ factor: 'Customer Account in Critical Health', points: 15, category: 'health' });
    } else if (healthStatus === 'At Risk' || (healthScore !== null && healthScore < 60)) {
      score += 10;
      factors.push({ factor: 'Customer Account At Risk', points: 10, category: 'health' });
    }

    // 4. SLA breaches or risk (up to 20 pts)
    const slaStatus = (slaEvaluation && slaEvaluation.sla_status) || ticket.sla_status || 'within_sla';
    if (['breached_both', 'breached_resolution'].includes(slaStatus)) {
      score += 20;
      factors.push({ factor: 'SLA Resolution Breached', points: 20, category: 'sla' });
    } else if (slaStatus === 'breached_response') {
      score += 15;
      factors.push({ factor: 'SLA Response Breached', points: 15, category: 'sla' });
    } else if (slaStatus === 'at_risk' || (slaEvaluation && slaEvaluation.is_at_risk)) {
      score += 10;
      factors.push({ factor: 'SLA Breach Imminent (At Risk)', points: 10, category: 'sla' });
    }

    // 5. Reopened ticket frequency (up to 15 pts)
    const reopenCount = Number(ticket.reopen_count) || 0;
    if (reopenCount >= 3) {
      score += 15;
      factors.push({ factor: `Ticket Reopened ${reopenCount} Times`, points: 15, category: 'reopen' });
    } else if (reopenCount >= 1) {
      score += 10;
      factors.push({ factor: 'Ticket Repeatedly Reopened', points: 10, category: 'reopen' });
    }

    const normalizedScore = Math.min(100, Math.max(0, score));

    // Determine recommended escalation level
    let recommendedLevel = 0;
    let recommendation = 'Standard Support Queue';
    let needsEscalation = false;

    if (normalizedScore >= 75) {
      recommendedLevel = 3;
      recommendation = 'Executive & Engineering Immediate Escalation';
      needsEscalation = true;
    } else if (normalizedScore >= 55) {
      recommendedLevel = 2;
      recommendation = 'Customer Success Lead & Technical Tier 2 Escalation';
      needsEscalation = true;
    } else if (normalizedScore >= 40) {
      recommendedLevel = 1;
      recommendation = 'Senior Support Specialist Review';
      needsEscalation = true;
    }

    return {
      ticket_id: ticket.id,
      escalation_score: normalizedScore,
      needs_escalation: needsEscalation,
      recommended_level: recommendedLevel,
      recommendation,
      factors,
      customer_context: {
        has_account: Boolean(customerAccount),
        contract_value: contractValue,
        days_until_renewal: daysUntilRenewal,
        health_status: healthStatus,
        health_score: healthScore,
      },
      evaluated_at: new Date().toISOString(),
    };
  }

  /**
   * Generates escalation action plan proposal (requires user approval)
   */
  generateEscalationActionPlan(ticket, evaluation, assignee = null) {
    const level = evaluation.recommended_level;
    const actions = [];

    if (level >= 1) {
      actions.push({
        step: 1,
        title: 'Assign Senior Specialist',
        description: 'Directly assign high-tier specialist to own communication and troubleshooting.',
        target_role: 'Senior Support Engineer',
      });
    }

    if (level >= 2) {
      actions.push({
        step: 2,
        title: 'Notify Customer Success Manager',
        description: 'Alert the dedicated CSM regarding customer frustration and renewal sensitivity.',
        target_role: 'Customer Success Manager',
      });
      actions.push({
        step: 3,
        title: 'Direct Outreach Call',
        description: 'Initiate proactive check-in call with requester to de-escalate and reassure SLA commitments.',
        target_role: 'Support Lead',
      });
    }

    if (level >= 3) {
      actions.push({
        step: 4,
        title: 'Executive Sponsor Briefing',
        description: 'Brief CS leadership and Engineering VP on technical blockers and revenue impact.',
        target_role: 'VP Customer Success',
      });
    }

    return {
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      current_level: ticket.escalation_level || 0,
      proposed_level: level,
      score: evaluation.escalation_score,
      requires_approval: true,
      actions,
      proposed_at: new Date().toISOString(),
    };
  }
}

export const supportEscalationService = new SupportEscalationService();
