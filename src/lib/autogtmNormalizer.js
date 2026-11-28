/**
 * Normalization utilities for AutoGTM workflow data.
 * Guarantees uniform array and object contracts across all UI consumers.
 */

/**
 * Normalizes campaign/segment data into a guaranteed CampaignSegment[] array.
 *
 * @param {any} raw - Array, nested object, dictionary of segments, or JSON string.
 * @returns {Array<CampaignSegment>}
 */
export function normalizeSegments(raw) {
  if (!raw) return [];

  let value = raw;

  // Handle JSON string
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (e) {
      console.warn('Failed to parse segments JSON string:', value);
      return [];
    }
  }

  let list = [];

  if (Array.isArray(value)) {
    list = value;
  } else if (value && typeof value === 'object') {
    if (Array.isArray(value.segments)) {
      list = value.segments;
    } else if (Array.isArray(value.items)) {
      list = value.items;
    } else if (Array.isArray(value.data)) {
      list = value.data;
    } else {
      // Check if it's an object keyed by segment IDs (e.g., { "ge7hll": { label: "ESL teachers", ... } })
      const entries = Object.entries(value);
      const isSegmentMap =
        entries.length > 0 &&
        entries.every(
          ([_, v]) =>
            v &&
            typeof v === 'object' &&
            (v.label || v.use_case || v.useCase || v.pain || v.name)
        );

      if (isSegmentMap) {
        list = entries.map(([key, seg]) => ({
          id: seg.id || key,
          ...seg,
        }));
      } else {
        console.warn('Unexpected campaign/segment payload shape:', raw);
        return [];
      }
    }
  } else {
    console.warn('Unexpected campaign/segment payload shape:', raw);
    return [];
  }

  // Safe helper to convert any array or comma/json string into an array
  const toSafeArray = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
      return v.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  return list.map((seg, idx) => {
    if (!seg || typeof seg !== 'object') {
      return {
        id: `seg-${idx}`,
        label: String(seg || `Campaign ${idx + 1}`),
        icon: 'graduation-cap',
        useCase: '',
        pain: '',
        criteria: [],
        negativeCriteria: [],
        keywords: [],
        exampleClients: [],
        percentage: 15,
        estimatedCompanies: 5000,
        count: '5.0K',
      };
    }

    // Format count / percentage
    let countDisplay = seg.count;
    if (!countDisplay) {
      const est = seg.estimatedCompanies || seg.estimated_companies;
      if (est) {
        countDisplay =
          est >= 1000
            ? `${(est / 1000).toFixed(1).replace(/\.0$/, '')}K`
            : String(est);
      } else if (seg.percentage) {
        countDisplay = `${seg.percentage}%`;
      } else {
        countDisplay = '5.0K';
      }
    }

    return {
      id: seg.id || `seg-${idx}`,
      label: seg.label || seg.name || `Campaign ${idx + 1}`,
      icon: seg.icon || 'graduation-cap',
      useCase: seg.useCase || seg.use_case || '',
      pain: seg.pain || '',
      criteria: toSafeArray(seg.criteria),
      negativeCriteria: toSafeArray(
        seg.negativeCriteria ?? seg.negative_criterias ?? seg.negative_criteria
      ),
      keywords: toSafeArray(seg.keywords),
      exampleClients: toSafeArray(
        seg.exampleClients ?? seg.example_clients
      ),
      dataSource: seg.dataSource,
      sourceUrls: toSafeArray(seg.sourceUrls),
      selected: seg.selected,
      percentage: seg.dataSource === 'research' ? null : Number(seg.percentage) || 15,
      estimatedCompanies:
        seg.dataSource === 'research' ? null : Number(seg.estimatedCompanies || seg.estimated_companies) || 5000,
      count: seg.dataSource === 'research' ? '—' : countDisplay,
      buyerType: seg.buyerType || seg.buyer_type || 'company',
      decisionMaker: seg.decisionMaker || seg.decision_maker || '',
    };
  });
}

/**
 * Normalizes competitor list into a guaranteed Array<{
 *   domain: string,
 *   name: string,
 *   faviconUrl: string,
 *   description?: string,
 *   source_urls: string[],
 *   sourceUrls: string[],
 *   relevance_score: number,
 *   relationship: 'direct' | 'related',
 *   ranking_reason: string,
 *   products: Array<{ name: string, description?: string }>,
 *   customers: Array<{ name: string, description?: string }>,
 *   features: Array<{ name: string, description?: string }>,
 *   pricing: Array<{ name: string, description?: string }>,
 *   reason?: string,
 *   score?: number
 * }>.
 *
 * @param {any} raw - Array, JSON string, or nested object.
 * @returns {Array<any>}
 */
export function normalizeCompetitors(raw) {
  if (!raw) return [];

  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (e) {
      console.warn('Failed to parse competitors JSON string:', value);
      return [];
    }
  }

  let list = [];
  if (Array.isArray(value)) {
    list = value;
  } else if (value && typeof value === 'object') {
    if (Array.isArray(value.results)) {
      list = value.results;
    } else if (Array.isArray(value.competitors)) {
      list = value.competitors;
    } else if (Array.isArray(value.items)) {
      list = value.items;
    } else if (Array.isArray(value.data)) {
      list = value.data;
    } else {
      list = Object.values(value).filter(
        (v) => v && typeof v === 'object' && (v.domain || v.name)
      );
    }
  }

  return list
    .filter((item) => Boolean(item))
    .map((item, idx) => {
      if (typeof item === 'string') {
        const cleanDomain = item.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
        return {
          domain: cleanDomain,
          name: cleanDomain,
          faviconUrl: `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=32`,
          description: '',
          source_urls: [`https://${cleanDomain}`],
          sourceUrls: [`https://${cleanDomain}`],
          relevance_score: 75,
          relationship: 'direct',
          ranking_reason: 'Identified competitor domain',
          products: [],
          customers: [],
          features: [],
          pricing: [],
        };
      }

      const domain =
        item.domain ||
        (item.website ? item.website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] : '') ||
        `competitor-${idx + 1}.com`;

      const safeSourceUrls = Array.isArray(item.source_urls) && item.source_urls.length > 0
        ? item.source_urls
        : Array.isArray(item.sourceUrls) && item.sourceUrls.length > 0
        ? item.sourceUrls
        : item.url
        ? [item.url]
        : [`https://${domain}`];

      const toFactArray = (facts) => {
        if (!facts) return [];
        if (Array.isArray(facts)) {
          return facts.map(f => {
            if (typeof f === 'string') return { name: f, description: f };
            if (f && typeof f === 'object') return { name: f.name || String(f), description: f.description || f.evidence_quote || '' };
            return { name: String(f), description: '' };
          });
        }
        return [];
      };

      const score = typeof item.relevance_score === 'number'
        ? item.relevance_score
        : typeof item.score === 'number'
        ? item.score
        : 80;

      return {
        domain,
        name: item.name || domain,
        faviconUrl:
          item.faviconUrl ||
          item.favicon_url ||
          `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        description: item.description || item.reason || '',
        source_urls: safeSourceUrls,
        sourceUrls: safeSourceUrls,
        relevance_score: score,
        score: score,
        relationship: item.relationship === 'direct' ? 'direct' : 'related',
        ranking_reason: item.ranking_reason || item.reason || 'Identified competitive overlap',
        products: toFactArray(item.products),
        customers: toFactArray(item.customers),
        features: toFactArray(item.features),
        pricing: toFactArray(item.pricing),
      };
    });
}

/**
 * Normalizes product determinants array.
 */
export function normalizeDeterminants(raw) {
  if (!raw) return [];
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (_) {
      return value.split('\n').filter(Boolean);
    }
  }
  return Array.isArray(value) ? value : [];
}

/**
 * Normalizes search queries array.
 */
export function normalizeSearchQueries(raw) {
  if (!raw) return [];
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (_) {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return Array.isArray(value) ? value : [];
}
