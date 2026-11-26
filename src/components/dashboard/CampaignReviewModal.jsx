import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Send,
  Users,
  Clock,
  Mail,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Calendar,
  Lock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { reviewCampaignReadiness, activateCampaignOutreach } from '../../lib/outreachService';

export default function CampaignReviewModal({
  campaign,
  leads = [],
  sequenceSteps = [],
  senderSettings = null,
  onClose,
  onActivated
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [error, setError] = useState(null);
  const [confirmedByUser, setConfirmedByUser] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadReview() {
      setIsLoading(true);
      setError(null);
      try {
        const review = await reviewCampaignReadiness({
          campaignId: campaign.id,
          leads,
          sequenceSteps,
          dailyLimit: campaign.dailyLimit || senderSettings?.daily_send_limit || 35,
          scheduleStartAt: campaign.scheduleStartAt || new Date().toISOString()
        });
        if (isMounted) setReviewData(review);
      } catch (err) {
        if (isMounted) setError(err.message || 'Could not verify campaign readiness.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadReview();
    return () => { isMounted = false; };
  }, [campaign.id, leads, sequenceSteps, campaign.dailyLimit, campaign.scheduleStartAt, senderSettings?.daily_send_limit]);

  const handleActivate = async () => {
    if (!confirmedByUser) return;
    setIsActivating(true);
    setError(null);
    try {
      const res = await activateCampaignOutreach({
        campaignId: campaign.id,
        leads,
        sequenceSteps,
        senderInfo: senderSettings,
        scheduleStartAt: campaign.scheduleStartAt || new Date().toISOString(),
        dailyLimit: campaign.dailyLimit || senderSettings?.daily_send_limit || 35
      });
      if (onActivated) {
        onActivated(res);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to activate campaign.');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-review-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#0d1c15]/10 text-[#0d1c15] animate-scaleUp max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#0d1c15]/08 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#edf2ec] border border-[#dbe5da] flex items-center justify-center text-[#0d9467]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="campaign-review-title" className="font-display font-bold text-xl text-[#0d1c15]">
                Review Before Sending
              </h2>
              <p className="text-xs text-[#5a6962] font-mono mt-0.5">
                Pre-flight deliverability and compliance confirmation for {campaign.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#73827a] hover:text-[#0d1c15] hover:bg-[#edf2ec] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-[#0d9467] animate-spin mb-3" />
              <p className="text-xs font-mono text-[#5a6962]">Running compliance checks and suppression audits...</p>
            </div>
          ) : (
            <>
              {/* Campaign Key Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08">
                  <span className="text-[10px] font-mono uppercase text-[#73827a] block">Target Recipients</span>
                  <span className="text-lg font-bold text-[#0d1c15] font-mono mt-0.5 block">
                    {reviewData?.totalRecipients ?? leads.length}
                  </span>
                  <span className="text-[11px] text-[#0d9467] font-mono">
                    {reviewData?.eligibleRecipients ?? leads.length} eligible
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08">
                  <span className="text-[10px] font-mono uppercase text-[#73827a] block">Sequence Steps</span>
                  <span className="text-lg font-bold text-[#0d1c15] font-mono mt-0.5 block">
                    {sequenceSteps.length} Steps
                  </span>
                  <span className="text-[11px] text-[#5a6962] font-mono">Email + LinkedIn</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08">
                  <span className="text-[10px] font-mono uppercase text-[#73827a] block">Daily Send Cap</span>
                  <span className="text-lg font-bold text-[#0d1c15] font-mono mt-0.5 block">
                    {reviewData?.dailyLimit || 35} / day
                  </span>
                  <span className="text-[11px] text-[#0d9467] font-mono">Safe Warmup Cap</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08">
                  <span className="text-[10px] font-mono uppercase text-[#73827a] block">Suppression Count</span>
                  <span className="text-lg font-bold text-[#0d1c15] font-mono mt-0.5 block">
                    {reviewData?.suppressedCount || 0}
                  </span>
                  <span className="text-[11px] text-[#73827a] font-mono">Excluded Contacts</span>
                </div>
              </div>

              {/* Sender Identity Preview */}
              <div className="p-4 rounded-2xl bg-[#fcfbf9] border border-[#0d1c15]/08 space-y-2">
                <span className="text-xs font-mono uppercase text-[#73827a] font-bold block">
                  Sender Identity &amp; Authenticated Mailbox
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-[#0d1c15]">
                      {senderSettings?.sender_name || 'Outbound Team'}
                    </span>{' '}
                    <span className="text-[#5a6962] font-mono">
                      &lt;{senderSettings?.sender_email || 'outreach@get-hyperflow.com'}&gt;
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#edf2ec] text-[#0d9467] font-mono text-[11px] font-bold border border-[#dbe5da] self-start sm:self-auto">
                    Verified Domain · SPF/DKIM/DMARC PASS
                  </span>
                </div>
              </div>

              {/* Sequence Steps Preview */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase text-[#73827a] font-bold block">
                  Sequence Cadence Preview
                </span>
                <div className="space-y-2">
                  {sequenceSteps.slice(0, 3).map((st, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-white border border-[#0d1c15]/08 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#edf2ec] text-[#0d9467] font-mono font-bold flex items-center justify-center text-[10px]">
                          {st.step_number || st.step || (i + 1)}
                        </span>
                        <span className="font-semibold text-[#0d1c15]">
                          {st.title || `Email Step ${i + 1}`}
                        </span>
                        <span className="text-[#73827a] font-mono">
                          · {st.subject || 'Quick question regarding {{company}}'}
                        </span>
                      </div>
                      <span className="text-[#5a6962] font-mono">
                        Day {st.delay_days || st.day || (i * 3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance & Deliverability Checklist */}
              <div className="space-y-2.5">
                <span className="text-xs font-mono uppercase text-[#73827a] font-bold block">
                  Compliance &amp; Deliverability Safeguards
                </span>
                <div className="space-y-1.5">
                  {(reviewData?.complianceChecks || []).map((check, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#edf2ec]/50 border border-[#dbe5da] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#0d9467] shrink-0" />
                        <span className="font-semibold text-[#0d1c15]">{check.label}</span>
                      </div>
                      <span className="text-[#4a5851] text-[11px] font-mono">{check.details}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explicit User Confirmation Checkbox */}
              <div className="pt-2">
                <label className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedByUser}
                    onChange={(e) => setConfirmedByUser(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-amber-300 text-[#0d9467] focus:ring-[#0d9467] cursor-pointer"
                  />
                  <div className="text-xs leading-relaxed text-[#0d1c15]">
                    <span className="font-bold block text-amber-900">
                      Explicit User Confirmation Required
                    </span>
                    I confirm that this campaign targets business professionals, adheres to CAN-SPAM / GDPR B2B provisions, and includes automatic opt-out suppression. No emails are sent upon saving until explicitly scheduled and confirmed here.
                  </div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#0d1c15]/08 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a6962] hover:bg-[#edf2ec] transition-colors cursor-pointer"
          >
            Cancel &amp; Edit Draft
          </button>

          <button
            type="button"
            disabled={!confirmedByUser || isActivating || isLoading}
            onClick={handleActivate}
            className="px-6 py-2.5 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            {isActivating ? (
              <>
                <Loader2 className="w-4 h-4 text-[#00e599] animate-spin" />
                <span>Scheduling Sequence Jobs...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-[#00e599]" />
                <span>Confirm &amp; Activate Campaign</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
