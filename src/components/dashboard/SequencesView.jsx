import React, { useState } from 'react';
import { Mail, Linkedin, Clock, Plus, Edit2, ArrowRight, CheckCircle2, RotateCw, Trash2, X, Sparkles, Variable } from 'lucide-react';

export default function SequencesView({ sequences }) {
  const [selectedSequence] = useState(sequences[0]);
  const [steps, setSteps] = useState(selectedSequence.steps);
  const [editingStep, setEditingStep] = useState(null);
  const [saveToast, setSaveToast] = useState(null);

  const handleOpenEditModal = (st) => {
    setEditingStep({
      step: st.step,
      day: st.day,
      channel: st.channel,
      title: st.title,
      description: st.description,
      subject: st.subject || (st.channel === 'Email' ? 'Quick question regarding {{company}} outreach pipeline' : ''),
      templateBody: st.templateBody || (st.channel === 'Email' 
        ? `Hi {{firstName}},\n\nSaw {{company}} recently expanded your team. Are you currently exploring automated outbound across cold email and LinkedIn?\n\nOutLaunch helps B2B teams source verified decision-makers and review AI drafts before sending.\n\nBest,\nYour Name`
        : `Hi {{firstName}}, noticed your work leading growth at {{company}}. Would love to connect here on LinkedIn!`)
    });
  };

  const handleInsertVariable = (varName) => {
    if (!editingStep) return;
    setEditingStep(prev => ({
      ...prev,
      templateBody: prev.templateBody + ` {{${varName}}}`
    }));
  };

  const handleSaveStep = (e) => {
    e.preventDefault();
    if (!editingStep) return;

    setSteps(prev =>
      prev.map(st => {
        if (st.step === editingStep.step) {
          return {
            ...st,
            title: editingStep.title,
            day: Number(editingStep.day) || st.day,
            channel: editingStep.channel,
            description: editingStep.description,
            subject: editingStep.subject,
            templateBody: editingStep.templateBody
          };
        }
        return st;
      })
    );

    const updatedTitle = editingStep.title;
    setEditingStep(null);
    setSaveToast(`Updated Step ${editingStep.step}: "${updatedTitle}"`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0d1c15] tracking-tight">
            Email &amp; LinkedIn Sequences
          </h1>
          <p className="text-sm text-[#4a5851] mt-0.5">
            4-step synchronized outreach cadence for {selectedSequence.campaign}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#0d9467] px-3 py-1.5 rounded-full bg-[#edf2ec] border border-[#dbe5da] font-semibold flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5" /> Auto-pause on reply active
          </span>
        </div>
      </div>

      {/* Confirmation Toast */}
      {saveToast && (
        <div className="p-3.5 rounded-2xl bg-[#edf2ec] border border-[#00e599]/40 text-xs sm:text-sm text-[#0d9467] font-semibold flex items-center gap-2.5 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#0d9467] shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Sequence Timeline Builder */}
      <div className="space-y-4">
        {steps.map((st) => {
          const isEmail = st.channel === 'Email';

          return (
            <div
              key={st.step}
              className="p-6 rounded-2xl sm:rounded-3xl bg-white border border-[#0d1c15]/08 shadow-sm hover:border-[#0d9467]/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                  isEmail
                    ? 'bg-[#edf2ec] text-[#0d9467] border-[#dbe5da]'
                    : 'bg-[#0077b5]/10 text-[#0077b5] border-[#0077b5]/20'
                }`}>
                  {isEmail ? <Mail className="w-5 h-5" /> : <Linkedin className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#73827a] uppercase font-bold mb-1">
                    <span>STEP {st.step}</span>
                    <span>·</span>
                    <span>DAY {st.day}</span>
                    <span>·</span>
                    <span className={isEmail ? 'text-[#0d9467]' : 'text-[#0077b5]'}>{st.channel}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-display font-bold text-[#0d1c15]">
                    {st.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#4a5851] mt-1 leading-relaxed max-w-xl">
                    {st.description}
                  </p>
                </div>
              </div>

              {/* Performance Metrics & Edit Action */}
              <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-[#0d1c15]/06 shrink-0">
                <div className="text-left md:text-right font-mono">
                  <span className="text-[10px] uppercase text-[#73827a] block">Average Open</span>
                  <span className="text-sm font-bold text-[#0d1c15]">{st.openRate}</span>
                </div>
                <div className="text-left md:text-right font-mono">
                  <span className="text-[10px] uppercase text-[#0d9467] font-bold block">Reply Rate</span>
                  <span className="text-sm font-bold text-[#0d9467]">{st.replyRate}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(st)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#0d1c15]/15 hover:bg-[#fcfbf9] text-xs font-semibold text-[#0d1c15] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#73827a]" />
                  <span>Edit Template</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Sequence Step Modal */}
      {editingStep && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
          onClick={() => setEditingStep(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Edit Step ${editingStep.step}`}
            className="w-full max-w-xl bg-white rounded-3xl border border-[#0d1c15]/10 shadow-2xl p-6 sm:p-7 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#0d1c15]/08 pb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  editingStep.channel === 'Email' ? 'bg-[#edf2ec] text-[#0d9467]' : 'bg-[#0077b5]/10 text-[#0077b5]'
                }`}>
                  {editingStep.channel === 'Email' ? <Mail className="w-4 h-4" /> : <Linkedin className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0d1c15]">
                    Edit Step {editingStep.step} Cadence Template
                  </h3>
                  <span className="text-xs font-mono text-[#73827a]">
                    Channel: {editingStep.channel} · Day {editingStep.day}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingStep(null)}
                className="p-1 rounded-lg text-[#73827a] hover:text-[#0d1c15] hover:bg-[#edf2ec] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStep} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-mono font-semibold text-[#0d1c15] uppercase tracking-wide">
                    Step Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStep.title}
                    onChange={(e) => setEditingStep({ ...editingStep, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#0d1c15]/15 bg-white text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-semibold text-[#0d1c15] uppercase tracking-wide">
                    Schedule (Day)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    required
                    value={editingStep.day}
                    onChange={(e) => setEditingStep({ ...editingStep, day: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#0d1c15]/15 bg-white text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
              </div>

              {editingStep.channel === 'Email' && (
                <div className="space-y-1">
                  <label className="text-xs font-mono font-semibold text-[#0d1c15] uppercase tracking-wide">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStep.subject}
                    onChange={(e) => setEditingStep({ ...editingStep, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#0d1c15]/15 bg-white text-[#0d1c15] outline-none focus:border-[#0d9467]"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-mono font-semibold text-[#0d1c15] uppercase tracking-wide">
                  Step Description / Notes
                </label>
                <input
                  type="text"
                  value={editingStep.description}
                  onChange={(e) => setEditingStep({ ...editingStep, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#0d1c15]/15 bg-white text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold text-[#0d1c15] uppercase tracking-wide">
                    Message Template Draft
                  </label>
                  <span className="text-[10px] text-[#73827a] font-mono">Insert tags:</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pb-1">
                  {['firstName', 'company', 'jobTitle', 'signal'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertVariable(tag)}
                      className="px-2 py-0.5 rounded-md bg-[#edf2ec] text-[#0d9467] text-[11px] font-mono border border-[#dbe5da] hover:bg-[#dbe5da] transition-colors cursor-pointer"
                    >
                      + {`{{${tag}}}`}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={5}
                  value={editingStep.templateBody}
                  onChange={(e) => setEditingStep({ ...editingStep, templateBody: e.target.value })}
                  className="w-full p-3 text-xs sm:text-sm font-sans leading-relaxed rounded-xl border border-[#0d1c15]/15 bg-[#fcfbf9] text-[#0d1c15] outline-none focus:border-[#0d9467]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingStep(null)}
                  className="px-4 py-2 rounded-xl border border-[#0d1c15]/15 text-xs sm:text-sm font-semibold text-[#0d1c15] hover:bg-[#fcfbf9] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0d1c15] hover:bg-[#162b21] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#00e599]" />
                  <span>Save Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}