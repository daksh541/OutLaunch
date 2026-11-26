import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[DashboardErrorBoundary] Caught view error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-3xl border border-red-200/80 shadow-lg text-center space-y-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-bold text-[#0d1c15]">
            Unable to display this view
          </h2>
          <p className="text-xs text-[#5a6962] max-w-md mx-auto leading-relaxed">
            An unexpected error occurred while rendering this tab. You can try refreshing the tab or navigating to another section.
          </p>
          {this.state.error?.message && (
            <div className="p-3 bg-red-50/60 rounded-xl text-left border border-red-100 overflow-x-auto text-[11px] font-mono text-red-700">
              {this.state.error.message}
            </div>
          )}
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            {this.props.onReset && (
              <button
                type="button"
                onClick={this.props.onReset}
                className="px-4 py-2 rounded-xl border border-[#0d1c15]/15 text-xs font-semibold text-[#0d1c15] hover:bg-[#edf2ec] cursor-pointer"
              >
                Go to Overview
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
