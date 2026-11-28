import crypto from 'node:crypto';

/**
 * Support Issue Analytics Service
 *
 * Provides analytical clustering and trend detection across support tickets:
 * - Recurring issue clustering and root cause classification
 * - Impacted customer accounts and exposed ARR
 * - Category breakdown and reopen rate trends
 * - First-contact resolution and mean resolution time tracking
 */

export class SupportIssueAnalyticsService {
  constructor() {}

  /**
   * Generates comprehensive issue analytics and recurring clusters from a ticket dataset
   */
  analyzeTickets(tickets = [], customerAccountsMap = new Map()) {
    if (!tickets || tickets.length === 0) {
      return {
        summary: {
          total_tickets: 0,
          open_tickets: 0,
          resolved_tickets: 0,
          reopened_tickets: 0,
          escalated_tickets: 0,
          reopen_rate: 0,
          total_impacted_accounts: 0,
          total_impacted_arr: 0,
        },
        category_breakdown: [],
        priority_breakdown: [],
        recurring_clusters: [],
        top_impacted_customers: [],
        channel_distribution: [],
      };
    }

    const openStatuses = ['new', 'open', 'pending', 'waiting_on_customer', 'escalated'];
    let openCount = 0;
    let resolvedCount = 0;
    let reopenedCount = 0;
    let escalatedCount = 0;

    const categoryMap = new Map();
    const priorityMap = new Map();
    const channelMap = new Map();
    const customerTicketsMap = new Map(); // customer_success_account_id or requester_email -> tickets
    const clusterKeywordMap = new Map();

    for (const ticket of tickets) {
      const status = (ticket.status || 'open').toLowerCase();
      const priority = (ticket.priority || 'medium').toLowerCase();
      const category = (ticket.category || 'general').toLowerCase();
      const channel = (ticket.channel || 'web').toLowerCase();
      const reopenNum = Number(ticket.reopen_count) || 0;

      if (openStatuses.includes(status)) openCount++;
      if (['resolved', 'closed'].includes(status)) resolvedCount++;
      if (reopenNum > 0 || status === 'reopened') reopenedCount++;
      if (ticket.is_escalated || status === 'escalated') escalatedCount++;

      // Category breakdown
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);

      // Priority breakdown
      priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);

      // Channel breakdown
      channelMap.set(channel, (channelMap.get(channel) || 0) + 1);

      // Customer grouping
      const customerKey = ticket.customer_success_account_id || ticket.requester_email || 'unknown';
      if (!customerTicketsMap.has(customerKey)) {
        customerTicketsMap.set(customerKey, []);
      }
      customerTicketsMap.get(customerKey).push(ticket);

      // Keyword / cluster detection from subject and description
      const text = `${ticket.subject || ''} ${ticket.description || ''}`.toLowerCase();
      const detectedCluster = this._detectCluster(text, category);
      if (!clusterKeywordMap.has(detectedCluster.id)) {
        clusterKeywordMap.set(detectedCluster.id, {
          cluster_id: detectedCluster.id,
          title: detectedCluster.title,
          category: detectedCluster.category,
          severity: detectedCluster.severity,
          tickets: [],
          unique_customers: new Set(),
        });
      }
      const clusterObj = clusterKeywordMap.get(detectedCluster.id);
      clusterObj.tickets.push(ticket);
      clusterObj.unique_customers.add(customerKey);
    }

    // Process top impacted customers
    const impactedCustomers = [];
    let totalImpactedArr = 0;
    const uniqueCustomerAccounts = new Set();

    for (const [custKey, custTickets] of customerTicketsMap.entries()) {
      const account = customerAccountsMap.get(custKey) || null;
      const contractValue = account ? Number(account.contract_value) || 0 : 0;
      if (account) uniqueCustomerAccounts.add(account.id);

      const openCustomerTickets = custTickets.filter((t) => openStatuses.includes(t.status)).length;
      const escalatedCustomerTickets = custTickets.filter((t) => t.is_escalated).length;

      totalImpactedArr += contractValue;

      impactedCustomers.push({
        customer_key: custKey,
        customer_name: (account && account.lead_name) || custTickets[0]?.requester_name || custTickets[0]?.requester_email,
        requester_email: custTickets[0]?.requester_email,
        account_id: account?.id || null,
        contract_value: contractValue,
        total_tickets: custTickets.length,
        open_tickets: openCustomerTickets,
        escalated_tickets: escalatedCustomerTickets,
        health_status: account?.health_status || 'Unknown',
        health_score: account?.health_score ?? null,
      });
    }

    impactedCustomers.sort((a, b) => b.total_tickets - a.total_tickets || b.contract_value - a.contract_value);

    // Format recurring clusters
    const recurringClusters = Array.from(clusterKeywordMap.values()).map((c) => {
      let clusterArr = 0;
      for (const custKey of c.unique_customers) {
        const acc = customerAccountsMap.get(custKey);
        if (acc) clusterArr += Number(acc.contract_value) || 0;
      }

      return {
        cluster_id: c.cluster_id,
        title: c.title,
        category: c.category,
        severity: c.severity,
        ticket_count: c.tickets.length,
        customer_count: c.unique_customers.size,
        impacted_arr: clusterArr,
        sample_subjects: c.tickets.slice(0, 3).map((t) => t.subject),
        recommended_fix: this._getRecommendedClusterFix(c.category),
      };
    });

    recurringClusters.sort((a, b) => b.ticket_count - a.ticket_count);

    const totalTickets = tickets.length;
    const reopenRate = totalTickets > 0 ? Math.round((reopenedCount / totalTickets) * 100) : 0;

    return {
      summary: {
        total_tickets: totalTickets,
        open_tickets: openCount,
        resolved_tickets: resolvedCount,
        reopened_tickets: reopenedCount,
        escalated_tickets: escalatedCount,
        reopen_rate: reopenRate,
        total_impacted_accounts: customerTicketsMap.size,
        total_impacted_arr: totalImpactedArr,
      },
      category_breakdown: Array.from(categoryMap.entries()).map(([name, count]) => ({
        category: name,
        count,
        percentage: Math.round((count / totalTickets) * 100),
      })),
      priority_breakdown: Array.from(priorityMap.entries()).map(([name, count]) => ({
        priority: name,
        count,
        percentage: Math.round((count / totalTickets) * 100),
      })),
      channel_distribution: Array.from(channelMap.entries()).map(([name, count]) => ({
        channel: name,
        count,
        percentage: Math.round((count / totalTickets) * 100),
      })),
      recurring_clusters: recurringClusters,
      top_impacted_customers: impactedCustomers.slice(0, 10),
    };
  }

  _detectCluster(text, category) {
    if (text.includes('sync') || text.includes('webhook') || text.includes('api') || text.includes('integration')) {
      return {
        id: 'cluster-data-sync-api',
        title: 'CRM & Webhook Sync Latency',
        category: 'integration',
        severity: 'high',
      };
    }
    if (text.includes('invoice') || text.includes('charge') || text.includes('billing') || text.includes('credit card') || text.includes('payment')) {
      return {
        id: 'cluster-billing-invoices',
        title: 'Billing & Invoice Inquiries',
        category: 'billing',
        severity: 'medium',
      };
    }
    if (text.includes('slow') || text.includes('timeout') || text.includes('performance') || text.includes('latency') || text.includes('lag')) {
      return {
        id: 'cluster-app-performance',
        title: 'Platform Latency & Dashboard Loading Speed',
        category: 'performance',
        severity: 'high',
      };
    }
    if (text.includes('login') || text.includes('sso') || text.includes('password') || text.includes('auth') || text.includes('saml')) {
      return {
        id: 'cluster-auth-sso',
        title: 'Authentication & SSO Access Failures',
        category: 'security',
        severity: 'urgent',
      };
    }
    if (text.includes('export') || text.includes('csv') || text.includes('download') || text.includes('report')) {
      return {
        id: 'cluster-data-export',
        title: 'Data Export & Report Generation Failures',
        category: 'technical',
        severity: 'medium',
      };
    }
    if (text.includes('bug') || text.includes('error') || text.includes('crash') || text.includes('broken') || text.includes('500')) {
      return {
        id: 'cluster-software-bugs',
        title: 'Unexpected Application Exceptions & UI Glitches',
        category: 'bug',
        severity: 'high',
      };
    }

    return {
      id: `cluster-${category}`,
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Support Requests`,
      category,
      severity: 'normal',
    };
  }

  _getRecommendedClusterFix(category) {
    switch (category) {
      case 'integration':
        return 'Audit outbound webhook retry queues and verify third-party rate limits in telemetry logs.';
      case 'billing':
        return 'Verify Stripe subscription webhook states and provide self-serve invoice download link.';
      case 'performance':
        return 'Inspect database query plans for unindexed filters and check caching layer saturation.';
      case 'security':
        return 'Validate SAML assertion certificates and redirect URL configurations for affected tenants.';
      case 'bug':
        return 'Deploy hotfix patch for uncaught promise rejections and update regression test suite.';
      default:
        return 'Review agent canned responses and update public knowledge base documentation.';
    }
  }
}

export const supportIssueAnalyticsService = new SupportIssueAnalyticsService();
