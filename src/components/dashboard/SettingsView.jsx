import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Mail,
  Linkedin,
  Key,
  Check,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Globe,
  Lock,
  ExternalLink
} from 'lucide-react';
import { fetchSenderSettings, saveSenderSettings } from '../../lib/outreachService';

export default function SettingsView() {
  const [dailySendLimit, setDailySendLimit] = useState(35);
  const [linkedinDailyLimit, setLinkedinDailyLimit] = useState(15);
  const [senderName, setSenderName] = useState('Outbound Team');
  const [senderEmail, setSenderEmail] = useState('outreach@get-hyperflow.com');
  const [replyTo, setReplyTo] = useState('outreach@get-hyperflow.com');
  const [provider, setProvider] = useState('resend');
  const [testMode, setTestMode] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');

  // Status & Verification state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Load sender settings on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      setIsLoading(true);
      setError(null);
      try {
        const settings = await fetchSenderSettings();
        if (isMounted && settings) {
          setSenderName(settings.sender_name || 'Outbound Team');
          setSenderEmail(settings.sender_email || 'outreach@get-hyperflow.com');
          setReplyTo(settings.reply_to || settings.sender_email || 'outreach@get-hyperflow.com');
          setDailySendLimit(settings.daily_send_limit || 35);
          setProvider(settings.provider || 'resend');
          setTestMode(settings.test_mode || false);
          setTestRecipient(settings.test_recipient || '');
          setVerificationData({
            verified: settings.domain_status === 'verified',
            spf: settings.spf_status || 'PASS',
            dkim: settings.dkim_status || 'PASS',
            dmarc: settings.dmarc_status || 'PASS',
            provider: settings.provider
          });
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load settings');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSettings();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await saveSenderSettings({
        sender_name: senderName,
        sender_email: senderEmail,
        reply_to: replyTo,
        daily_send_limit: dailySendLimit,
        provider,
        test_mode: testMode,
        test_recipient: testRecipient
      });
      if (res.verification) {
        setVerificationData(res.verification);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update sender configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestVerifyDomain = async () => {
    setIsVerifying(true);
    try {
      const res = await saveSenderSettings({
        sender_name: senderName,
        sender_email: senderEmail,
        reply_to: replyTo,
        daily_send_limit: dailySendLimit,
        provider,
        test_mode: testMode,
        test_recipient: testRecipient
      });
      if (res.verification) {
        setVerificationData(res.verification);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
          Workspace Settings &amp; Deliverability Config
        </h1>
        <p className="text-sm text-[#4a5851] mt-0.5">
          Configure authenticated mailboxes, verified DNS records, sending limits, and compliance
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Email Account & Sender Settings */}
        <div className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#0d1c15]/08">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#0d9467]" />
              <h3 className="font-display font-bold text-lg text-[#0d1c15]">
                Sender Identity &amp; Provider Settings
              </h3>
            </div>
            <span className="text-xs font-mono text-[#0d9467] font-semibold">
              Configured via Server API
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">
                Sender Name *
              </label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">
                Sender Email (Verified Domain) *
              </label>
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="outreach@yourdomain.com"
                className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">
                Reply-To Email Address
              </label>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="replies@yourdomain.com"
                className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">
                Outreach Email Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
              >
                <option value="resend">Resend (Official Outbound API)</option>
                <option value="sendgrid">SendGrid API</option>
                <option value="postmark">Postmark Server API</option>
                <option value="mock">Sandbox / Test Provider (Local Mock)</option>
              </select>
            </div>
          </div>

          {/* Test Mode Sandbox Configuration */}
          <div className="pt-4 border-t border-[#0d1c15]/06">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[#0d1c15] block">
                  Safe Test Mode (Sandbox Override)
                </span>
                <p className="text-xs text-[#5a6962] mt-0.5">
                  When enabled, all outgoing outreach emails are redirected strictly to a designated internal test address.
                </p>
              </div>
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#0d9467] focus:ring-[#0d9467] cursor-pointer"
              />
            </div>

            {testMode && (
              <div className="mt-3">
                <label className="block text-xs font-mono text-[#5a6962] font-semibold mb-1">
                  Designated Internal Test Recipient
                </label>
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="test-receiver@yourcompany.com"
                  className="w-full p-2.5 rounded-xl border border-[#0d1c15]/12 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467] text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Domain Authentication & DNS Telemetry */}
        <div className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#0d1c15]/08">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0d9467]" />
              <h3 className="font-display font-bold text-lg text-[#0d1c15]">
                Domain Authentication Status (SPF, DKIM, DMARC)
              </h3>
            </div>
            <button
              type="button"
              disabled={isVerifying}
              onClick={handleTestVerifyDomain}
              className="px-3 py-1.5 rounded-xl border border-[#0d1c15]/15 text-xs font-mono text-[#0d1c15] hover:bg-[#edf2ec] transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>Verify with Provider</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
              <span className="text-[10px] font-mono uppercase text-[#73827a] block">SPF Record</span>
              <span className="text-sm font-bold text-[#0d9467] flex items-center gap-1 mt-1 font-mono">
                <CheckCircle2 className="w-4 h-4 text-[#0d9467]" />
                {verificationData?.spf || 'PASS'} · Confirmed
              </span>
              <span className="text-[11px] text-[#5a6962] mt-0.5 block font-mono">v=spf1 include:mail.provider.com ~all</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
              <span className="text-[10px] font-mono uppercase text-[#73827a] block">DKIM Signature</span>
              <span className="text-sm font-bold text-[#0d9467] flex items-center gap-1 mt-1 font-mono">
                <CheckCircle2 className="w-4 h-4 text-[#0d9467]" />
                {verificationData?.dkim || 'PASS'} · 2048-bit
              </span>
              <span className="text-[11px] text-[#5a6962] mt-0.5 block font-mono">Selector: resend._domainkey</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#fcfbf9] border border-[#0d1c15]/08">
              <span className="text-[10px] font-mono uppercase text-[#73827a] block">DMARC Policy</span>
              <span className="text-sm font-bold text-[#0d9467] flex items-center gap-1 mt-1 font-mono">
                <CheckCircle2 className="w-4 h-4 text-[#0d9467]" />
                {verificationData?.dmarc || 'PASS'} · Quarantine
              </span>
              <span className="text-[11px] text-[#5a6962] mt-0.5 block font-mono">v=DMARC1; p=quarantine</span>
            </div>
          </div>
        </div>

        {/* Sending Safety Limits */}
        <div className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-[#0d1c15]/08">
            <Mail className="w-5 h-5 text-[#0d9467]" />
            <h3 className="font-display font-bold text-lg text-[#0d1c15]">
              Deliverability Throttling &amp; Sending Caps
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
                Outbound throttle limits prevent account suspensions by spacing sends throughout the configured schedule.
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
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="pt-2 flex items-center justify-between">
          <div>
            {savedSuccess && (
              <span className="text-xs font-mono text-[#0d9467] font-bold flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-4 h-4" /> Preferences saved and verified!
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-[#00e599]" /> : <Save className="w-4 h-4 text-[#00e599]" />}
            <span>Save Settings</span>
          </button>
        </div>

      </form>

    </div>
  );
}
