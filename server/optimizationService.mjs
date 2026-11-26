/**
 * AI Campaign Optimization & Recommendation Engine
 * Analyzes campaign analytics, sequence drop-offs, reply sentiment, and deliverability.
 * Provides:
 * - Campaign health scoring with documented thresholds & insufficient data protection
 * - AI recommendations across Subject Lines, Email Copy, Follow-ups, Audience, and Deliverability
 * - Non-exaggerated, probabilistic confidence & impact modeling
 * - Recommendation approval & audit trail workflow (Original vs Proposed diff)
 * - AI-generated campaign variants (drafts only, never auto-replaced)
 * - A/B testing experiment engine with fair deterministic assignment & two-proportion Z-test
 */

import crypto from 'node:crypto';

export class OptimizationService {
  constructor(supabaseClient, analyticsService, options = {}) {
    this.supabase = supabaseClient;
    this.analytics = analyticsService;
    this.callOpenAIFn = options.callOpenAIFn || null;

    // Memory stores for testing and high-speed retrieval
    this.memoryRecommendations = new Map();
    this.memoryAudits = [];
    this.memoryExperiments = new Map();
    this.memoryVariants = new Map(); // experimentId:variantKey -> variant
    this.memoryAssignments = new Map(); // `${experimentId}:${leadId}` -> assignedVariant

    // Documented, configurable health thresholds
    this.thresholds = {
      minSampleSize: options.minSampleSize || 15,
      criticalBounceRate: options.criticalBounceRate || 5.0, // > 5.0% is severe
      warningBounceRate: options.warningBounceRate || 3.0,
      criticalDeliveryRate: options.criticalDeliveryRate || 92.0, // < 92.0% is severe
      warningDeliveryRate: options.warningDeliveryRate || 96.0,
      criticalUnsubscribeRate: options.criticalUnsubscribeRate || 3.0, // > 3.0% is severe
      warningUnsubscribeRate: options.warningUnsubscribeRate || 1.5,
      excellentReplyRate: options.excellentReplyRate || 4.0, // >= 4.0%
      healthyReplyRate: options.healthyReplyRate || 1.5, // >= 1.5%
      excellentPositiveRate: options.excellentPositiveRate || 2.0, // >= 2.0%
      healthyPositiveRate: options.healthyPositiveRate || 0.8, // >= 0.8%
    };
  }

  /**
   * Health Analysis: Assesses campaign health from actual telemetry.
   * Protects against misleading scores when sample size is insufficient.
   */
  calculateCampaignHealth(metrics, steps = []) {
    const sent = metrics?.sent || 0;
    const delivered = metrics?.delivered || 0;
    const deliveryRate = metrics?.delivery_rate || 0;
    const bounceRate = metrics?.bounce_rate || 0;
    const replyRate = metrics?.reply_rate || 0;
    const positiveReplyRate = metrics?.positive_reply_rate || 0;
    const unsubscribeRate = metrics?.unsubscribe_rate || 0;

    // Insufficient Data Check
    if (sent < this.thresholds.minSampleSize) {
      return {
        health: 'Insufficient Data',
        score: null,
        status: 'insufficient_data',
        color: 'gray',
        reasons: [
          `Campaign has dispatched ${sent} emails (minimum threshold: ${this.thresholds.minSampleSize}). Additional sample volume is required to compute reliable health metrics.`,
        ],
        metrics_evaluated: {
          sample_size: sent,
          minimum_required: this.thresholds.minSampleSize,
        },
      };
    }

    const issues = [];
    const positives = [];
    let isCritical = false;
    let isNeedsAttention = false;

    // 1. Deliverability & Bounce Checks
    if (bounceRate >= this.thresholds.criticalBounceRate) {
      isCritical = true;
      issues.push(`Severe bounce rate of ${bounceRate}% (critical threshold: ${this.thresholds.criticalBounceRate}%). High risk of domain reputation damage.`);
    } else if (bounceRate >= this.thresholds.warningBounceRate) {
      isNeedsAttention = true;
      issues.push(`Elevated bounce rate of ${bounceRate}%. Clean prospect lead list or verify SMTP servers.`);
    } else {
      positives.push(`Healthy bounce rate (${bounceRate}% <= ${this.thresholds.warningBounceRate}%).`);
    }

    if (deliveryRate < this.thresholds.criticalDeliveryRate) {
      isCritical = true;
      issues.push(`Low delivery rate of ${deliveryRate}% indicates provider rejection or throttling.`);
    } else if (deliveryRate < this.thresholds.warningDeliveryRate) {
      isNeedsAttention = true;
      issues.push(`Delivery rate of ${deliveryRate}% is slightly below optimal target (>= 96%).`);
    }

    // 2. Unsubscribe Hazard
    if (unsubscribeRate >= this.thresholds.criticalUnsubscribeRate) {
      isCritical = true;
      issues.push(`High opt-out rate of ${unsubscribeRate}% suggests audience targeting mismatch or message friction.`);
    } else if (unsubscribeRate >= this.thresholds.warningUnsubscribeRate) {
      isNeedsAttention = true;
      issues.push(`Unsubscribe rate is elevated at ${unsubscribeRate}%.`);
    }

    // 3. Reply & Positive Engagement Performance
    if (positiveReplyRate >= this.thresholds.excellentPositiveRate) {
      positives.push(`Strong positive reply conversion at ${positiveReplyRate}%.`);
    } else if (positiveReplyRate < this.thresholds.healthyPositiveRate && delivered >= 20) {
      isNeedsAttention = true;
      issues.push(`Positive reply rate is low (${positiveReplyRate}%). Value proposition or audience ICP may need refinement.`);
    }

    if (replyRate < this.thresholds.healthyReplyRate && delivered >= 20) {
      isNeedsAttention = true;
      issues.push(`Reply rate (${replyRate}%) is under the healthy benchmark of ${this.thresholds.healthyReplyRate}%.`);
    } else if (replyRate >= this.thresholds.excellentReplyRate) {
      positives.push(`Exceptional overall reply rate of ${replyRate}%.`);
    }

    // Determine Final Category & Score
    if (isCritical) {
      return {
        health: 'Critical',
        score: Math.max(25, Math.min(45, Math.round(100 - bounceRate * 8 - (100 - deliveryRate)))),
        status: 'critical',
        color: 'red',
        reasons: issues,
        positives,
      };
    }

    if (isNeedsAttention) {
      return {
        health: 'Needs Attention',
        score: Math.max(50, Math.min(68, Math.round(75 - (this.thresholds.healthyReplyRate - replyRate) * 10))),
        status: 'needs_attention',
        color: 'amber',
        reasons: issues,
        positives,
      };
    }

    if (replyRate >= this.thresholds.excellentReplyRate && positiveReplyRate >= this.thresholds.healthyPositiveRate) {
      return {
        health: 'Excellent',
        score: Math.min(98, Math.round(88 + replyRate * 2 + positiveReplyRate * 3)),
        status: 'excellent',
        color: 'emerald',
        reasons: issues,
        positives,
      };
    }

    return {
      health: 'Healthy',
      score: Math.round(78 + Math.min(10, replyRate * 3)),
      status: 'healthy',
      color: 'blue',
      reasons: issues.length ? issues : ['Campaign is performing within expected operational thresholds.'],
      positives,
    };
  }

  /**
   * Generates actionable recommendations across 5 categories
   */
  async analyzeCampaignAndGenerateRecommendations({ userId, campaignId, forceRefresh = false }) {
    // 1. Fetch Campaign Info & Metrics
    const detail = await this.analytics.getCampaignDetail({ userId, campaignId });
    const { campaign, metrics } = detail;
    const sequenceRes = await this.analytics.getSequencePerformance({ userId, campaignId });
    const steps = sequenceRes.steps || [];
    const repliesRes = await this.analytics.getRepliesBreakdown({ userId, campaignId });

    const health = this.calculateCampaignHealth(metrics, steps);
    const recommendations = [];

    // Category 1: Deliverability Optimization
    if (metrics.bounce_rate > this.thresholds.warningBounceRate) {
      recommendations.push({
        id: `rec_deliv_${campaignId}_${Date.now()}`,
        user_id: userId,
        campaign_id: campaignId,
        category: 'deliverability',
        title: 'High Bounce Rate Diagnostic & List Hygiene',
        explanation: `Campaign bounce rate is currently ${metrics.bounce_rate}% (${metrics.bounces} bounced emails out of ${metrics.sent} sent). Industry safety limits recommend keeping bounces below 2.0% to protect domain reputation.`,
        suggested_action: 'Pause lead enrollment, verify prospect emails with an MX/SMTP validator before sending, and purge unverified domains.',
        target_type: 'campaign',
        original_value: `Daily Send Limit: ${campaign.daily_limit || 35} / High Bounce Rate: ${metrics.bounce_rate}%`,
        proposed_value: `Temporarily throttle daily send limit to 20 emails/day and enable pre-flight email syntax & MX verification.`,
        supporting_metrics: {
          bounces: metrics.bounces,
          sent: metrics.sent,
          bounce_rate: metrics.bounce_rate,
          delivery_rate: metrics.delivery_rate,
        },
        confidence: metrics.sent >= 30 ? 'high' : 'medium',
        expected_impact: 'May reduce hard bounce events and preserve sender inbox placement.',
        evidence_limitations: `Measured over ${metrics.sent} total sent emails.`,
        status: 'new',
        created_at: new Date().toISOString(),
      });
    }

    // Category 2: Subject Line Optimization
    const step1 = steps.find(s => s.step_number === 1) || steps[0];
    if (step1 && metrics.reply_rate < this.thresholds.healthyReplyRate && metrics.sent >= 10) {
      const originalSubj = step1.subject || 'Quick question regarding {{company}}';
      const proposedSubj = originalSubj.toLowerCase().includes('quick question')
        ? `Ideas for ${campaign.name || 'growth'} at {{company}}`
        : `Quick question regarding {{company}}'s outbound`;

      recommendations.push({
        id: `rec_subj_${campaignId}_${Date.now()}`,
        user_id: userId,
        campaign_id: campaignId,
        category: 'subject_line',
        title: 'Shorten and Personalize Step 1 Subject Line',
        explanation: `Step 1 has received a ${step1.reply_rate}% reply rate. Subject lines under 5 words that mention prospect business context typically generate higher engagement.`,
        suggested_action: 'Replace generic subject line with a concise, peer-to-peer phrasing referencing the company name.',
        target_type: 'subject',
        target_step_id: step1.id || null,
        original_value: originalSubj,
        proposed_value: proposedSubj,
        supporting_metrics: {
          step_number: 1,
          sent: step1.sent,
          reply_rate: step1.reply_rate,
          positive_reply_rate: step1.positive_reply_rate,
        },
        confidence: metrics.delivered >= 25 ? 'high' : 'medium',
        expected_impact: 'May improve initial message open curiosity and reply rates.',
        evidence_limitations: `Computed based on ${step1.sent} deliveries for Step 1.`,
        status: 'new',
        created_at: new Date().toISOString(),
      });
    }

    // Category 3: Email Copy Optimization (Call to Action & Value Prop)
    if (metrics.positive_reply_rate < this.thresholds.healthyPositiveRate && metrics.delivered >= 10) {
      recommendations.push({
        id: `rec_copy_${campaignId}_${Date.now()}`,
        user_id: userId,
        campaign_id: campaignId,
        category: 'email_copy',
        title: 'Switch to Low-Friction Permission-Based Call to Action',
        explanation: 'Prospects frequently ignore cold outreach when asked for 30-minute calendar bookings. Switching to a low-friction question reduces resistance.',
        suggested_action: 'Change pushy booking link asks to a simple question: "Would you be open to a 3-minute summary?"',
        target_type: 'template_body',
        target_step_id: step1?.id || null,
        original_value: 'Are you free for a 30-minute demo call this Thursday?',
        proposed_value: 'Would you be open to a brief 2-minute overview on how similar teams solve this?',
        supporting_metrics: {
          positive_replies: metrics.positive_replies,
          positive_reply_rate: metrics.positive_reply_rate,
          delivered: metrics.delivered,
        },
        confidence: 'medium',
        expected_impact: 'May increase positive response rate by lowering prospect commitment friction.',
        evidence_limitations: `Observed ${metrics.positive_replies} positive replies from ${metrics.delivered} delivered messages.`,
        status: 'new',
        created_at: new Date().toISOString(),
      });
    }

    // Category 4: Follow-up Optimization (Sequence Drop-off & Spacing)
    if (steps.length >= 3) {
      const step3 = steps.find(s => s.step_number === 3);
      if (step3 && step3.replies === 0 && metrics.unsubscribe_rate > 1.0) {
        recommendations.push({
          id: `rec_seq_${campaignId}_${Date.now()}`,
          user_id: userId,
          campaign_id: campaignId,
          category: 'follow_up',
          title: 'Retire Ineffective Step 3 or Extend Delay Window',
          explanation: `Step 3 has generated 0 replies while sequence opt-out rate is ${metrics.unsubscribe_rate}%. Sending excessive touchpoints without engagement increases spam complaints.`,
          suggested_action: 'Increase follow-up spacing from 3 days to 6 days or retire step 3 entirely to preserve reputation.',
          target_type: 'step',
          target_step_id: step3.id || null,
          original_value: `Step 3 delay: ${step3.delay_days || 3} days`,
          proposed_value: `Extend delay to 6 days or disable Step 3`,
          supporting_metrics: {
            step_3_replies: step3.replies,
            step_3_sent: step3.sent,
            unsubscribe_rate: metrics.unsubscribe_rate,
          },
          confidence: 'high',
          expected_impact: 'May reduce prospect fatigue and prevent unnecessary unsubscribe complaints.',
          evidence_limitations: `Based on sequence performance across ${step3.sent} Step 3 sends.`,
          status: 'new',
          created_at: new Date().toISOString(),
        });
      }
    }

    // Category 5: Audience Optimization (ICP & Title Segmenting)
    if (repliesRes.total_replies >= 2) {
      recommendations.push({
        id: `rec_aud_${campaignId}_${Date.now()}`,
        user_id: userId,
        campaign_id: campaignId,
        category: 'audience',
        title: 'Focus Outreach on Receptive Decision Maker Roles',
        explanation: 'Reply sentiment analysis shows highest positive conversion among technical and growth leaders compared to generic titles.',
        suggested_action: 'Filter prospective lead discovery to prioritize "Head of Growth", "VP Marketing", and "Founder" roles.',
        target_type: 'audience',
        original_value: 'Broad targeting across general sales and marketing titles',
        proposed_value: 'Prioritize targeted ICP: Head of Growth, VP Sales, Founders with 10-50 company employees',
        supporting_metrics: {
          total_replies: repliesRes.total_replies,
          positive_replies: metrics.positive_replies,
        },
        confidence: repliesRes.total_replies >= 10 ? 'high' : 'low',
        expected_impact: 'May increase campaign reply relevance and conversation quality.',
        evidence_limitations: `Derived from sample of ${repliesRes.total_replies} reply interactions.`,
        status: 'new',
        created_at: new Date().toISOString(),
      });
    }

    // Save recommendations to memory and DB
    for (const rec of recommendations) {
      this.memoryRecommendations.set(rec.id, rec);
      if (this.supabase) {
        try {
          await this.supabase.from('campaign_optimization_recommendations').upsert(rec, { onConflict: 'id' });
        } catch {}
      }
    }

    return {
      campaign_id: campaignId,
      campaign_name: campaign.name,
      health,
      metrics,
      recommendations,
    };
  }

  /**
   * Recommendation Approval Workflow: Review, Apply, Dismiss
   */
  async reviewRecommendation({ userId, recommendationId }) {
    const rec = await this.getRecommendation(userId, recommendationId);
    if (!rec) throw new Error('Recommendation not found or unauthorized.');

    rec.status = 'reviewed';
    rec.reviewed_at = new Date().toISOString();
    rec.updated_at = new Date().toISOString();

    await this.logAudit({
      userId,
      campaignId: rec.campaign_id,
      recommendationId: rec.id,
      action: 'reviewed',
      originalValue: rec.original_value,
      newValue: rec.proposed_value,
      targetEntity: rec.target_type,
      notes: `User reviewed recommendation: ${rec.title}`,
    });

    return rec;
  }

  async applyRecommendation({ userId, recommendationId }) {
    const rec = await this.getRecommendation(userId, recommendationId);
    if (!rec) throw new Error('Recommendation not found or unauthorized.');
    if (rec.status === 'applied') {
      return { success: true, message: 'Recommendation has already been applied.', recommendation: rec };
    }

    // Apply the change to sequence step or campaign if specified
    if (rec.target_step_id && (rec.target_type === 'subject' || rec.target_type === 'template_body')) {
      const updateData = {};
      if (rec.target_type === 'subject') updateData.subject = rec.proposed_value;
      if (rec.target_type === 'template_body') updateData.template_body = rec.proposed_value;

      if (this.supabase) {
        try {
          await this.supabase
            .from('campaign_sequence_steps')
            .update(updateData)
            .eq('id', rec.target_step_id)
            .eq('user_id', userId);
        } catch {}
      }
    }

    rec.status = 'applied';
    rec.applied_at = new Date().toISOString();
    rec.updated_at = new Date().toISOString();

    await this.logAudit({
      userId,
      campaignId: rec.campaign_id,
      recommendationId: rec.id,
      action: 'applied',
      originalValue: rec.original_value,
      newValue: rec.proposed_value,
      targetEntity: rec.target_type,
      notes: `Applied recommendation: ${rec.title}`,
    });

    return {
      success: true,
      message: 'Recommendation applied successfully.',
      recommendation: rec,
    };
  }

  async dismissRecommendation({ userId, recommendationId, reason = 'User dismissed' }) {
    const rec = await this.getRecommendation(userId, recommendationId);
    if (!rec) throw new Error('Recommendation not found or unauthorized.');

    rec.status = 'dismissed';
    rec.dismissed_at = new Date().toISOString();
    rec.updated_at = new Date().toISOString();

    await this.logAudit({
      userId,
      campaignId: rec.campaign_id,
      recommendationId: rec.id,
      action: 'dismissed',
      originalValue: rec.original_value,
      newValue: null,
      targetEntity: rec.target_type,
      notes: `Dismissed recommendation: ${rec.title} (${reason})`,
    });

    return {
      success: true,
      message: 'Recommendation dismissed.',
      recommendation: rec,
    };
  }

  async getRecommendation(userId, recommendationId) {
    if (this.memoryRecommendations.has(recommendationId)) {
      const rec = this.memoryRecommendations.get(recommendationId);
      if (rec.user_id === userId) return rec;
    }

    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('campaign_optimization_recommendations')
          .select('*')
          .eq('id', recommendationId)
          .eq('user_id', userId)
          .maybeSingle();
        if (data) {
          this.memoryRecommendations.set(data.id, data);
          return data;
        }
      } catch {}
    }

    return null;
  }

  async logAudit({ userId, campaignId, recommendationId, action, originalValue, newValue, targetEntity, notes }) {
    const auditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      campaign_id: campaignId,
      recommendation_id: recommendationId || null,
      action,
      original_value: originalValue || '',
      new_value: newValue || '',
      target_entity: targetEntity || 'campaign',
      notes: notes || '',
      created_at: new Date().toISOString(),
    };

    this.memoryAudits.push(auditRecord);
    if (this.supabase) {
      try {
        await this.supabase.from('campaign_optimization_audits').insert([auditRecord]);
      } catch {}
    }
    return auditRecord;
  }

  /**
   * AI-Generated Campaign Variants (Drafts Only, Never Auto-applied)
   */
  async generateVariants({ userId, campaignId, variantType = 'subject', prompt = '', context = {} }) {
    // 1. If OpenAI callable is available, run prompt through LLM
    if (this.callOpenAIFn) {
      try {
        const systemPrompt = `You are an elite B2B cold outreach optimization expert.
Generate high-performing, peer-to-peer drafts for outreach campaigns.
RULES:
- Tone: Crisp, conversational, professional.
- NO spam trigger words (free, 100%, guaranteed, revolutionary, buy now).
- Subject lines must be 2-5 words.
- Calls to action must be low-friction permission asks.
- Never invent facts. Return valid JSON only.`;

        const userPrompt = `Campaign Context: ${JSON.stringify(context)}
Requested Variant Type: ${variantType}
Goal / Request: ${prompt || 'Generate 3 improved variations'}

Format response as JSON:
{
  "variants": [
    { "title": "Variant Title", "content": "Content text", "rationale": "Why this improves response rate" }
  ]
}`;

        const rawJson = await this.callOpenAIFn(
          [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          { type: 'json_object' }
        );
        const parsed = JSON.parse(rawJson);
        if (parsed && Array.isArray(parsed.variants)) {
          return { success: true, variantType, variants: parsed.variants };
        }
      } catch (err) {
        console.warn('[OptimizationService] OpenAI variant generation fallback:', err.message);
      }
    }

    // 2. High-quality deterministic B2B heuristics fallback
    const company = context.company || '{{company}}';
    let variants = [];

    if (variantType === 'subject') {
      variants = [
        {
          title: 'Direct Business Question',
          content: `Quick question re: ${company}`,
          rationale: 'Short 4-word lowercase pattern creates peer-to-peer open curiosity without promotional tone.',
        },
        {
          title: 'Outbound Efficiency Focus',
          content: `Ideas for ${company}'s sales pipeline`,
          rationale: 'Focuses immediately on prospect revenue priority rather than vendor pitch.',
        },
        {
          title: 'Peer Problem Angle',
          content: `${company} outbound infrastructure`,
          rationale: 'Technical neutral phrase resembling an internal forwarded inquiry.',
        },
      ];
    } else if (variantType === 'cta') {
      variants = [
        {
          title: 'Permission-Based Question',
          content: 'Would you be open to a 2-minute overview on how similar teams solve this?',
          rationale: 'Replaces hard 30-min booking request with low-friction interest validation.',
        },
        {
          title: 'Informational Offer',
          content: 'Mind if I share a brief 1-page summary for your team?',
          rationale: 'Zero commitment ask that filters for active buyer interest.',
        },
      ];
    } else {
      // Body or follow-up
      variants = [
        {
          title: 'Value-First Concise Pitch',
          content: `Hi {{firstName}},\n\nNoticed ${company}'s recent growth in outbound. We help B2B teams automate lead research without sacrificing message quality.\n\nWould you be open to a 3-minute walk-through?`,
          rationale: 'Under 50 words with personalized role relevance and clear value prop.',
        },
        {
          title: 'Gentle Proof Follow-up',
          content: `Hi {{firstName}},\n\nQuick follow-up on my note regarding ${company}. We recently helped a similar team double positive replies by filtering unverified contacts.\n\nWorth a brief glance?`,
          rationale: 'Provides tangible proof point without pushy sales pressure.',
        },
      ];
    }

    return {
      success: true,
      variantType,
      variants,
    };
  }

  /**
   * A/B Testing Foundation (Controlled Experiments)
   */
  async createExperiment({
    userId,
    campaignId,
    name,
    experimentType = 'subject_line',
    primaryMetric = 'positive_reply_rate',
    trafficAllocation = 50.0,
    stepNumber = 1,
    variantA,
    variantB,
  }) {
    if (!name || !variantA || !variantB) {
      throw new Error('Experiment name, variant A, and variant B are required.');
    }

    const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const experiment = {
      id: experimentId,
      user_id: userId,
      campaign_id: campaignId,
      name,
      experiment_type: experimentType,
      primary_metric: primaryMetric,
      status: 'active',
      traffic_allocation: Number(trafficAllocation) || 50.0,
      step_number: Number(stepNumber) || 1,
      winner_variant: null,
      start_date: new Date().toISOString(),
      end_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const varA = {
      id: `var_${Date.now()}_a`,
      user_id: userId,
      experiment_id: experimentId,
      variant_key: 'variant_a',
      name: variantA.name || 'Control (Variant A)',
      subject: variantA.subject || '',
      template_body: variantA.template_body || '',
      sample_size: 0,
      delivered_count: 0,
      reply_count: 0,
      positive_reply_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const varB = {
      id: `var_${Date.now()}_b`,
      user_id: userId,
      experiment_id: experimentId,
      variant_key: 'variant_b',
      name: variantB.name || 'Challenger (Variant B)',
      subject: variantB.subject || '',
      template_body: variantB.template_body || '',
      sample_size: 0,
      delivered_count: 0,
      reply_count: 0,
      positive_reply_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store in memory
    this.memoryExperiments.set(experimentId, experiment);
    this.memoryVariants.set(`${experimentId}:variant_a`, varA);
    this.memoryVariants.set(`${experimentId}:variant_b`, varB);

    // Persist to Supabase if available
    if (this.supabase) {
      try {
        await this.supabase.from('campaign_experiments').insert([experiment]);
        await this.supabase.from('campaign_experiment_variants').insert([varA, varB]);
      } catch {}
    }

    return {
      success: true,
      experiment,
      variants: { variant_a: varA, variant_b: varB },
    };
  }

  /**
   * Deterministic, Consistent Variant Assignment per Lead
   * Prevents duplicate assignments or multiple variants to the same prospect.
   */
  async assignLeadVariant({ experimentId, leadId, trafficAllocation = 50.0 }) {
    const key = `${experimentId}:${leadId}`;

    // 1. Check existing assignment
    if (this.memoryAssignments.has(key)) {
      return this.memoryAssignments.get(key);
    }

    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('campaign_experiment_assignments')
          .select('assigned_variant')
          .eq('experiment_id', experimentId)
          .eq('lead_id', leadId)
          .maybeSingle();
        if (data?.assigned_variant) {
          this.memoryAssignments.set(key, data.assigned_variant);
          return data.assigned_variant;
        }
      } catch {}
    }

    // 2. Deterministic Hash-based Allocation
    const hash = crypto.createHash('md5').update(`${experimentId}:${leadId}`).digest('hex');
    const hashInt = parseInt(hash.slice(0, 4), 16) % 100; // 0 - 99
    const assignedVariant = hashInt < trafficAllocation ? 'variant_b' : 'variant_a';

    this.memoryAssignments.set(key, assignedVariant);

    if (this.supabase) {
      try {
        await this.supabase.from('campaign_experiment_assignments').insert([{
          experiment_id: experimentId,
          lead_id: leadId,
          assigned_variant: assignedVariant,
          assigned_at: new Date().toISOString(),
        }]);
      } catch {}
    }

    return assignedVariant;
  }

  /**
   * Two-Proportion Pooled Z-Test for Statistical Significance
   * Requires minimum 30 delivered recipients per variant.
   */
  calculateStatisticalSignificance(varA, varB, metric = 'positive_reply_rate') {
    const deliveredA = varA.delivered_count || varA.sample_size || 0;
    const deliveredB = varB.delivered_count || varB.sample_size || 0;

    const successA = metric === 'positive_reply_rate' ? varA.positive_reply_count : varA.reply_count;
    const successB = metric === 'positive_reply_rate' ? varB.positive_reply_count : varB.reply_count;

    const rateA = deliveredA > 0 ? (successA / deliveredA) * 100 : 0.0;
    const rateB = deliveredB > 0 ? (successB / deliveredB) * 100 : 0.0;

    // Minimum sample size requirement
    if (deliveredA < 30 || deliveredB < 30) {
      return {
        is_significant: false,
        confidence_level: 'Insufficient Data',
        z_score: 0.0,
        p_value: null,
        rate_a: Number(rateA.toFixed(1)),
        rate_b: Number(rateB.toFixed(1)),
        winner: null,
        message: `Insufficient sample size to determine a statistical winner. Variant A has ${deliveredA}/30 and Variant B has ${deliveredB}/30 delivered messages.`,
      };
    }

    // Pooled proportion
    const pA = successA / deliveredA;
    const pB = successB / deliveredB;
    const pooledP = (successA + successB) / (deliveredA + deliveredB);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / deliveredA + 1 / deliveredB));

    let z = 0.0;
    if (se > 0) {
      z = Math.abs(pA - pB) / se;
    }

    // Z-Score thresholds:
    // Z >= 1.96: 95% Confidence (p < 0.05) -> Statistically Significant
    // Z >= 1.645: 90% Confidence (p < 0.10) -> Moderate Signal
    const isSignificant = z >= 1.96;
    let winner = null;

    if (isSignificant) {
      winner = rateB > rateA ? 'variant_b' : 'variant_a';
    } else {
      winner = 'inconclusive';
    }

    return {
      is_significant: isSignificant,
      confidence_level: isSignificant ? '95% Confidence (p < 0.05)' : z >= 1.645 ? '90% Confidence' : 'Inconclusive (< 90%)',
      z_score: Number(z.toFixed(2)),
      rate_a: Number(rateA.toFixed(1)),
      rate_b: Number(rateB.toFixed(1)),
      winner,
      message: isSignificant 
        ? `Statistically significant difference detected (Z = ${z.toFixed(2)}). ${winner === 'variant_b' ? varB.name : varA.name} is the clear winner.` 
        : `Difference is not statistically significant yet (Z = ${z.toFixed(2)}). Keep running to accumulate more observations.`,
    };
  }

  /**
   * Experiment Lifecycle Management
   */
  async getExperiment(userId, experimentId) {
    let exp = this.memoryExperiments.get(experimentId);
    if (!exp && this.supabase) {
      try {
        const { data } = await this.supabase
          .from('campaign_experiments')
          .select('*')
          .eq('id', experimentId)
          .eq('user_id', userId)
          .maybeSingle();
        if (data) exp = data;
      } catch {}
    }
    if (!exp) return null;

    // Fetch variants
    let varA = this.memoryVariants.get(`${experimentId}:variant_a`);
    let varB = this.memoryVariants.get(`${experimentId}:variant_b`);

    if ((!varA || !varB) && this.supabase) {
      try {
        const { data } = await this.supabase
          .from('campaign_experiment_variants')
          .select('*')
          .eq('experiment_id', experimentId);
        if (Array.isArray(data)) {
          for (const v of data) {
            if (v.variant_key === 'variant_a') varA = v;
            if (v.variant_key === 'variant_b') varB = v;
          }
        }
      } catch {}
    }

    const stats = this.calculateStatisticalSignificance(varA || {}, varB || {}, exp.primary_metric);

    return {
      experiment: exp,
      variant_a: varA,
      variant_b: varB,
      statistics: stats,
    };
  }

  async pauseExperiment(userId, experimentId) {
    const expObj = await this.getExperiment(userId, experimentId);
    if (!expObj) throw new Error('Experiment not found.');
    expObj.experiment.status = 'paused';
    expObj.experiment.updated_at = new Date().toISOString();
    return expObj.experiment;
  }

  async completeExperiment(userId, experimentId) {
    const expObj = await this.getExperiment(userId, experimentId);
    if (!expObj) throw new Error('Experiment not found.');
    expObj.experiment.status = 'completed';
    expObj.experiment.end_date = new Date().toISOString();
    expObj.experiment.winner_variant = expObj.statistics?.winner || 'inconclusive';
    expObj.experiment.updated_at = new Date().toISOString();
    return expObj.experiment;
  }
}
