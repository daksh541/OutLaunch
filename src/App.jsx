import React from 'react';
import { NavigationProvider, useNavigation, PRODUCT_ROUTES } from './context/NavigationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import OutreachAgentPage from './components/outreach/OutreachAgentPage';
import B2BPage from './components/b2b/B2BPage';
import GMPage from './components/gm/GMPage';
import CountryLocationPage from './components/gm/CountryLocationPage';
import RegionLocationPage from './components/gm/RegionLocationPage';
import ApiDocs from './components/docs/ApiDocs';
import ExplorerPage from './components/explorer/ExplorerPage';
import SignInPage from './components/auth/SignInPage';
import AppAutoGtmPage from './components/autogtm/AppAutoGtmPage';
import AutoGtmWorkflowPage from './components/autogtm/AutoGtmWorkflowPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import PublicBookingPage from './components/booking/PublicBookingPage';

function ProtectedDashboardRoute() {
  const { user, loading } = useAuth();
  const { navigate } = useNavigation();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate(PRODUCT_ROUTES.SIGN_IN);
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-[#00e599] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-[#a1a1a1]">Verifying authentication...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <DashboardLayout />;
}

function NotFoundPage() {
  const { navigate } = useNavigation();

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#0d1c15] flex flex-col items-center justify-center p-6 text-center antialiased">
      <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-[#0d1c15]/10 shadow-xl">
        <h1 className="text-4xl font-display font-bold mb-2 text-[#0d1c15]">404</h1>
        <p className="text-[#4a5851] mb-6 text-sm">
          The requested page could not be found. Select one of the available OutLaunch products:
        </p>

        <div className="space-y-2 text-left">
          <button
            onClick={() => navigate(PRODUCT_ROUTES.DASHBOARD)}
            className="w-full p-3 rounded-xl bg-[#edf2ec] hover:bg-[#e2e9e1] transition text-left cursor-pointer border border-[#dbe5da]"
          >
            <div className="font-semibold text-sm text-[#0d9467]">Outreach Platform Dashboard</div>
            <div className="text-xs text-[#5a6962]">Manage email, LinkedIn, leads, and sequences</div>
          </button>
          <button
            onClick={() => navigate(PRODUCT_ROUTES.OUTREACH)}
            className="w-full p-3 rounded-xl bg-[#f7f5f0] hover:bg-[#edf2ec] transition text-left cursor-pointer border border-[#0d1c15]/08"
          >
            <div className="font-semibold text-sm text-[#0d1c15]">Outreach Agent Landing</div>
            <div className="text-xs text-[#5a6962]">AI agents that find and email your buyers</div>
          </button>
          <button
            onClick={() => navigate(PRODUCT_ROUTES.DATABASE)}
            className="w-full p-3 rounded-xl bg-[#f7f5f0] hover:bg-[#edf2ec] transition text-left cursor-pointer border border-[#0d1c15]/08"
          >
            <div className="font-semibold text-sm text-[#0d1c15]">Database</div>
            <div className="text-xs text-[#5a6962]">The largest B2B company database</div>
          </button>
          <button
            onClick={() => navigate(PRODUCT_ROUTES.GM)}
            className="w-full p-3 rounded-xl bg-[#f7f5f0] hover:bg-[#edf2ec] transition text-left cursor-pointer border border-[#0d1c15]/08"
          >
            <div className="font-semibold text-sm text-[#0d1c15]">Global Places Dataset</div>
            <div className="text-xs text-[#5a6962]">200M+ commercial venues and local businesses worldwide</div>
          </button>
          <button
            onClick={() => navigate(PRODUCT_ROUTES.API)}
            className="w-full p-3 rounded-xl bg-[#f7f5f0] hover:bg-[#edf2ec] transition text-left cursor-pointer border border-[#0d1c15]/08"
          >
            <div className="font-semibold text-sm text-[#0d1c15]">API</div>
            <div className="text-xs text-[#5a6962]">REST API for company and people data</div>
          </button>
          <button
            onClick={() => navigate(PRODUCT_ROUTES.EXPLORER)}
            className="w-full p-3 rounded-xl bg-[#f7f5f0] hover:bg-[#edf2ec] transition text-left cursor-pointer border border-[#0d1c15]/08"
          >
            <div className="font-semibold text-sm text-[#0d1c15]">Explorer</div>
            <div className="text-xs text-[#5a6962]">Explore and filter the company graph</div>
          </button>
          <button
            onClick={() => navigate(PRODUCT_ROUTES.SIGN_IN)}
            className="w-full p-3 rounded-xl bg-[#f7f5f0] hover:bg-[#edf2ec] transition text-left cursor-pointer border border-[#0d1c15]/08"
          >
            <div className="font-semibold text-sm text-[#0d1c15]">Sign In</div>
            <div className="text-xs text-[#5a6962]">Sign in to your account</div>
          </button>
        </div>
      </div>
    </div>
  );
}

function MainRouter() {
  const { currentProduct, countrySlug, regionSlug, domain, bookingSlug, navigate } = useNavigation();

  switch (currentProduct) {
    case 'booking':
      return <PublicBookingPage bookingSlug={bookingSlug} />;
    case 'dashboard':
      return <DashboardLayout />;
    case 'app-auto-gtm':
      return <AppAutoGtmPage />;
    case 'auto-gtm-explore':
      return <AutoGtmWorkflowPage key={`${domain}:${window.location.search}`} domain={domain} />;
    case 'outreach':
      return <OutreachAgentPage />;
    case 'database':
      return <B2BPage />;
    case 'gm':
      return <GMPage />;
    case 'gm-region':
      return <RegionLocationPage regionSlug={regionSlug} />;
    case 'gm-country':
      return <CountryLocationPage countrySlug={countrySlug} />;
    case 'api':
      return <ApiDocs onBackToLanding={() => navigate(PRODUCT_ROUTES.OUTREACH)} />;
    case 'explorer':
      return <ExplorerPage />;
    case 'sign-in':
      return <SignInPage />;
    default:
      return <NotFoundPage />;
  }
}

export default function App() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <MainRouter />
      </AuthProvider>
    </NavigationProvider>
  );
}
