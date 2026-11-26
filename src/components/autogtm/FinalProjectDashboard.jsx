import React, { useState } from 'react';
import { useNavigation, PRODUCT_ROUTES } from '../../context/NavigationContext';
import Step4CompaniesTable from './Step4CompaniesTable';
import Step5PeopleTable from './Step5PeopleTable';
import Step6EmailComposer from './Step6EmailComposer';

export default function FinalProjectDashboard({
  companyData,
  onOpenTrialModal
}) {
  const { navigate } = useNavigation();
  const [activeTab, setActiveTab] = useState('companies');

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 animate-slide-up">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-black/[0.08] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#10b981]" />
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              {companyData?.name || 'PrimKeet'} Go-To-Market Pipeline
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Pipeline ready · 200 companies · 818 verified decision makers · cold outreach sequence prepared
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (companyData?.domain) {
                localStorage.setItem('outlaunch_active_company_domain', companyData.domain);
                const friendlyName = companyData.name || (companyData.domain.split('.')[0].charAt(0).toUpperCase() + companyData.domain.split('.')[0].slice(1));
                localStorage.setItem('outlaunch_active_company_name', friendlyName);
              }
              navigate(PRODUCT_ROUTES.DASHBOARD);
            }}
            className="inline-flex items-center gap-1.5 bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <span>Open in Workspace</span>
            <span className="text-[#00e599]">→</span>
          </button>

          <button
            type="button"
            onClick={onOpenTrialModal}
            className="inline-flex items-center gap-2 bg-[#0d9467] hover:bg-[#0a7854] text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <span>Activate $30 Free Credits</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-black/[0.08] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'companies'
              ? 'bg-black text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-black/[0.04]'
          }`}
        >
          Companies (200)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('people')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'people'
              ? 'bg-black text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-black/[0.04]'
          }`}
        >
          People (818)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('emails')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'emails'
              ? 'bg-black text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-black/[0.04]'
          }`}
        >
          Emails & Outbound
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'companies' && <Step4CompaniesTable />}
        {activeTab === 'people' && <Step5PeopleTable />}
        {activeTab === 'emails' && <Step6EmailComposer onClaimCredits={onOpenTrialModal} />}
      </div>
    </div>
  );
}
