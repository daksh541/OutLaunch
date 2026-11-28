import React, { useState, useEffect } from 'react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import useAuthSession from '../../hooks/useAuthSession';
import useCompanyResearch from '../../hooks/useCompanyResearch';
import useCompetitorResearch from '../../hooks/useCompetitorResearch';
import { normalizeWebsite, requestedWebsite } from '../../lib/companyResearch';
import { normalizeCompetitors } from '../../lib/autogtmNormalizer';

import AnalysisErrorBoundary from './AnalysisErrorBoundary';
import AnalysisProgressTimeline from './AnalysisProgressTimeline';
import WebsiteInputStage from './WebsiteInputStage';
import WebsiteScanningStage from './WebsiteScanningStage';
import CompanyProfileStage from './CompanyProfileStage';
import CompetitorDiscoveryStage from './CompetitorDiscoveryStage';
import CompetitorComparisonStage from './CompetitorComparisonStage';
import PositioningStage from './PositioningStage';
import AnalysisSummaryStage from './AnalysisSummaryStage';
import CrispChatWidget from '../autogtm/CrispChatWidget';
import { ArrowLeft, Home, Sparkles } from 'lucide-react';

export default function WebsiteAnalysisFlow({ initialDomain = '' }) {
  const { navigate } = useNavigation();
  const { session, loading: authLoading } = useAuthSession();

  // 1. Domain Resolution
  const [domain, setDomain] = useState(() => {
    if (initialDomain && initialDomain.trim()) {
      try { return normalizeWebsite(initialDomain).domain; } catch (_) {}
    }
    const q = requestedWebsite();
    if (q) {
      try { return normalizeWebsite(q).domain; } catch (_) {}
    }
    const stored = typeof window !== 'undefined'
      ? localStorage.getItem('outlaunch_active_company_domain') || sessionStorage.getItem('autogtm-pending-domain')
      : null;
    if (stored) {
      try { return normalizeWebsite(stored).domain; } catch (_) {}
    }
    return '';
  });

  // 2. Active Stage State
  // Possible: 'input', 'scanning', 'profile', 'competitor_discovery', 'competitor_comparison', 'positioning', 'summary'
  const [currentStage, setCurrentStage] = useState(() => (domain ? 'scanning' : 'input'));
  const [completedStages, setCompletedStages] = useState(() => (domain ? ['input'] : []));
  const [selectedAngles, setSelectedAngles] = useState([]);

  // 3. Company Research Data Hook
  const {
    data: research,
    error: researchError,
    retry: retryResearch,
  } = useCompanyResearch(domain || 'company.com');

  const researchReady =
    Boolean(domain) &&
    research?.job?.status === 'completed' &&
    Boolean(research?.profile) &&
    !researchError;

  const company = {
    name: research?.profile?.company_name || (domain ? domain.split('.')[0].toUpperCase() : 'Company'),
    domain: domain || 'company.com',
    description:
      research?.profile?.business_description ||
      research?.profile?.descriptions?.map((item) => item.text).join(' ') ||
      'No business description was found on the researched pages.',
    products: research?.profile?.products || [],
    customers: research?.profile?.customers || [],
    source_urls: research?.profile?.source_urls || [],
  };

  // 4. Competitor Research Hook
  const competitorEnabled =
    researchReady &&
    ['competitor_discovery', 'competitor_comparison', 'positioning', 'summary'].includes(currentStage);

  const {
    data: competitorData,
    error: competitorError,
    retry: retryCompetitors,
  } = useCompetitorResearch(
    research?.job?.id,
    research?.project?.id,
    session?.user?.id,
    competitorEnabled
  );

  const competitorsReady = competitorData?.status === 'completed' && !competitorError;
  const rawCompetitors = competitorData?.results || [];
  const normalizedCompetitors = normalizeCompetitors(rawCompetitors);

  // 5. State transitions & completion sync
  useEffect(() => {
    if (researchReady && currentStage === 'scanning') {
      setCompletedStages((prev) => [...new Set([...prev, 'input', 'scanning'])]);
      // Seamlessly advance to profile check
      setCurrentStage('profile');
    }
  }, [researchReady, currentStage]);

  useEffect(() => {
    if (competitorsReady && currentStage === 'competitor_discovery') {
      setCompletedStages((prev) => [...new Set([...prev, 'competitor_discovery'])]);
    }
  }, [competitorsReady, currentStage]);

  const handleStartAnalysis = (fullWebsite, cleanDomain) => {
    try {
      const normalized = normalizeWebsite(fullWebsite || cleanDomain);
      setDomain(normalized.domain);
      sessionStorage.setItem('autogtm-pending-domain', normalized.website);
      if (typeof window !== 'undefined') {
        localStorage.setItem('outlaunch_active_company_domain', normalized.domain);
        localStorage.setItem('outlaunch_active_company_name', normalized.domain.split('.')[0].toUpperCase());
        const url = new URL(window.location.href);
        url.searchParams.set('website', normalized.domain);
        window.history.replaceState({}, '', url.toString());
      }
      setCompletedStages((prev) => [...new Set([...prev, 'input'])]);
      setCurrentStage('scanning');
    } catch (e) {
      console.error(e);
    }
  };

  const handleStageNavigation = (stageId) => {
    setCurrentStage(stageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const markStageDoneAndProceed = (current, next) => {
    setCompletedStages((prev) => [...new Set([...prev, current])]);
    setCurrentStage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnalysisErrorBoundary
      onReset={() => {
        if (currentStage === 'competitor_discovery') {
          retryCompetitors();
        } else if (currentStage === 'scanning') {
          retryResearch();
        } else {
          setCurrentStage('input');
        }
      }}
      onBack={() => setCurrentStage('input')}
    >
      <div className="min-h-screen bg-[#0d1c15] text-[#edf2ec] flex flex-col font-sans selection:bg-[#00e599]/30 selection:text-white">
        {/* Top OutLaunch Bar */}
        <header className="h-14 border-b border-[#1c382b] bg-[#091510]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
              className="flex items-center gap-2.5 text-white hover:text-[#00e599] transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-[#00e599] text-[#0d1c15] flex items-center justify-center font-bold text-xs shadow-sm">
                O
              </div>
              <span className="font-display font-bold tracking-tight text-base sm:text-lg">
                OutLaunch <span className="text-[#00e599] text-xs font-mono font-normal">/ intelligence</span>
              </span>
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate(PRODUCT_ROUTES.DASHBOARD)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#142e22] hover:bg-[#1a3d2d] text-[#edf2ec] border border-[#234d39] font-medium transition-colors cursor-pointer"
            >
              Workspace Dashboard
            </button>
          </div>
        </header>

        {/* Multi-Stage Interactive Timeline Bar */}
        <AnalysisProgressTimeline
          currentStage={currentStage}
          completedStages={completedStages}
          onStageClick={handleStageNavigation}
        />

        {/* Stage Content Frame */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-start">
          {/* Stage 1: Website Input */}
          {currentStage === 'input' && (
            <WebsiteInputStage
              initialUrl={domain}
              onStart={handleStartAnalysis}
              isAnalyzing={false}
            />
          )}

          {/* Stage 2: Scanning & Extraction */}
          {currentStage === 'scanning' && (
            <WebsiteScanningStage
              domain={domain}
              statusMessage="Extracting verified public pages and structure…"
              error={researchError?.message}
              onRetry={retryResearch}
              isCompleted={researchReady}
              onContinue={() => markStageDoneAndProceed('scanning', 'profile')}
            />
          )}

          {/* Stage 3: Company Profile Check */}
          {currentStage === 'profile' && (
            <CompanyProfileStage
              profile={research?.profile}
              domain={domain}
              onContinue={() => markStageDoneAndProceed('profile', 'competitor_discovery')}
              onBack={() => setCurrentStage('scanning')}
            />
          )}

          {/* Stage 4: Competitor Discovery (Fixed & Non-crashing) */}
          {currentStage === 'competitor_discovery' && (
            <CompetitorDiscoveryStage
              competitors={normalizedCompetitors}
              queries={competitorData?.queries || []}
              searchesUsed={competitorData?.searches_used || (competitorsReady ? 3 : 1)}
              candidatesCount={competitorData?.candidates_count || normalizedCompetitors.length}
              isLoading={!competitorsReady && !competitorError}
              error={competitorError}
              onRetry={retryCompetitors}
              onContinue={() => markStageDoneAndProceed('competitor_discovery', 'competitor_comparison')}
              onBack={() => setCurrentStage('profile')}
              onSelectCompetitor={() => markStageDoneAndProceed('competitor_discovery', 'competitor_comparison')}
            />
          )}

          {/* Stage 5: Competitor Comparison */}
          {currentStage === 'competitor_comparison' && (
            <CompetitorComparisonStage
              company={company}
              competitors={normalizedCompetitors}
              onContinue={() => markStageDoneAndProceed('competitor_comparison', 'positioning')}
              onBack={() => setCurrentStage('competitor_discovery')}
            />
          )}

          {/* Stage 6: Positioning & Differentiation */}
          {currentStage === 'positioning' && (
            <PositioningStage
              company={company}
              competitors={normalizedCompetitors}
              selectedAngles={selectedAngles}
              onToggleAngle={setSelectedAngles}
              onContinue={() => markStageDoneAndProceed('positioning', 'summary')}
              onBack={() => setCurrentStage('competitor_comparison')}
            />
          )}

          {/* Stage 7: Executive Summary Deliverable */}
          {currentStage === 'summary' && (
            <AnalysisSummaryStage
              domain={domain}
              company={company}
              competitors={normalizedCompetitors}
              selectedAngles={selectedAngles}
              onStartCampaign={() => {
                localStorage.setItem('outlaunch_active_company_domain', domain);
                localStorage.setItem('outlaunch_active_company_name', company.name);
                navigate(PRODUCT_ROUTES.DASHBOARD);
              }}
              onGoToDashboard={() => {
                localStorage.setItem('outlaunch_active_company_domain', domain);
                localStorage.setItem('outlaunch_active_company_name', company.name);
                navigate(PRODUCT_ROUTES.DASHBOARD);
              }}
              onBack={() => setCurrentStage('positioning')}
            />
          )}
        </main>

        {/* Crisp Chat */}
        <CrispChatWidget />
      </div>
    </AnalysisErrorBoundary>
  );
}
