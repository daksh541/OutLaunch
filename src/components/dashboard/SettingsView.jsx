import React, { useState } from 'react';
import { Settings, ShieldCheck, Mail, Linkedin, Users, Key, Bell, Check, Save } from 'lucide-react';

export default function SettingsView() {
  const [dailySendLimit, setDailySendLimit] = useState(35);
  const [linkedinDailyLimit, setLinkedinDailyLimit] = useState(15);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
          Workspace Settings &amp; Deliverability Config
        </h1>
        <p className="text-sm text-[#4a5851] mt-0.5">
          Configure mailboxes, LinkedIn safety thresholds, and CRM integrations
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Sending Safety Limits */}
        <div className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#0d1c15]/08">
            <Mail className="w-5 h-5 text-[#0d9467]" />
            <h3 className="font-display font-bold text-lg text-[#0d1c15]">
              Mailbox Deliverability &amp; Sending Caps
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-semibold text-[#0d1c15]">Daily Outbound Send Cap per Mailbox</span>
                <span className="px-2 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] font-bold">
                  {dailySendLimit} emails / day
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="1"
                value={dailySendLimit}
                onChange={(e) => setDailySendLimit(Number(e.target.value))}
                className="w-full h-2 bg-[#edf2ec] rounded-lg appearance-none cursor-pointer accent-[#0d9467]"
              />
              <p className="text-xs text-[#5a6962] mt-1.5 leading-relaxed">
                We strongly recommend capping daily sends at 30–40 emails per inbox to maintain pristine sender reputation and avoid spam filters.
              </p>
            </div>

            <div className="pt-4 border-t border-[#0d1c15]/06">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-semibold text-[#0d1c15]">Daily LinkedIn Task Cap</span>
                <span className="px-2 py-0.5 rounded bg-[#0077b5]/10 text-[#0077b5] font-bold">
                  {linkedinDailyLimit} tasks / day
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={linkedinDailyLimit}
                onChange={(e) => setLinkedinDailyLimit(Number(e.target.value))}
                className="w-full h-2 bg-[#edf2ec] rounded-lg appearance-none cursor-pointer accent-[#0077b5]"
              />
              <p className="text-xs text-[#5a6962] mt-1.5 leading-relaxed">
                Limits how many manual LinkedIn connection requests your team is assigned per day to prevent account flags.
              </p>
            </div>
          </div>
        </div>

        {/* Connected Auxiliary Domains */}
        <div className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#0d1c15]/08">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0d9467]" />
              <h3 className="font-display font-bold text-lg text-[#0d1c15]">
                Connected Sending Inboxes
              </h3>
            </div>
            <span className="text-xs font-mono text-[#0d9467] font-semibold">3 Active Inboxes</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-[#0d1c15]">outreach@get-hyperflow.com</span>
                <span className="text-xs text-[#5a6962] block">Google Workspace · Warm-up completed 100%</span>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-[#00e599]/15 text-[#0d9467] font-mono text-xs font-bold border border-[#00e599]/30">
                HEALTHY
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-[#0d1c15]">sarah@hyperflow-growth.io</span>
                <span className="text-xs text-[#5a6962] block">Microsoft 365 · Warm-up completed 100%</span>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-[#00e599]/15 text-[#0d9467] font-mono text-xs font-bold border border-[#00e599]/30">
                HEALTHY
              </span>
            </div>
          </div>
        </div>

        {/* CRM Integrations */}
        <div className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-[#0d1c15]/08">
            <Key className="w-5 h-5 text-[#0d9467]" />
            <h3 className="font-display font-bold text-lg text-[#0d1c15]">
              CRM &amp; Webhook Integrations
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs sm:text-sm text-[#0d1c15]">Salesforce CRM</div>
                <div className="text-xs text-[#5a6962]">Bidirectional contact &amp; meeting sync</div>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] font-mono text-xs font-bold border border-[#dbe5da]">
                CONNECTED
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08 flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs sm:text-sm text-[#0d1c15]">HubSpot CRM</div>
                <div className="text-xs text-[#5a6962]">Lead deduplication &amp; activity logging</div>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-[#edf2ec] text-[#0d9467] font-mono text-xs font-bold border border-[#dbe5da]">
                CONNECTED
              </span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="pt-2 flex items-center justify-between">
          <div>
            {savedSuccess && (
              <span className="text-xs font-mono text-[#0d9467] font-bold flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-4 h-4" /> Preferences saved successfully!
              </span>
            )}
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Save className="w-4 h-4 text-[#00e599]" />
            <span>Save Settings</span>
          </button>
        </div>

      </form>

    </div>
  );
}
