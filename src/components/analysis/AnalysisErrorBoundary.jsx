import React from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

export default class AnalysisErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AnalysisErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[500px] w-full flex items-center justify-center p-6 bg-[#0d1c15]/95 text-[#edf2ec]">
          <div className="max-w-lg w-full bg-[#13271e] border border-[#0d9467]/30 rounded-2xl p-7 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#0d9467]/20 border border-[#00e599]/30 text-[#00e599] flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-display font-bold text-white tracking-tight">
                Analysis Stage Recovery
              </h2>
              <p className="text-xs text-[#a3b899] leading-relaxed">
                An unexpected error occurred while rendering this analysis step. Your profile and company data remain safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="text-left bg-[#091510] border border-[#234233] p-3.5 rounded-xl overflow-x-auto text-xs font-mono text-rose-300">
                <span className="text-[10px] text-gray-500 block uppercase tracking-wider mb-1">Error diagnostic:</span>
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d9467] hover:bg-[#0aa874] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recover &amp; Retry Stage</span>
              </button>

              {this.props.onBack && (
                <button
                  type="button"
                  onClick={this.props.onBack}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a3328] hover:bg-[#234436] text-[#edf2ec] text-xs font-semibold border border-[#2e5744] transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#00e599]" />
                  <span>Previous Stage</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-[#a3b899] hover:text-white transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
