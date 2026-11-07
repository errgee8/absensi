import React from 'react';
import { Shirt, CheckCircle2, MapPin, Sparkles, ArrowRight, LogOut, Coffee } from 'lucide-react';

export default function FlowReminder({ type = 'checkin' }) {
  if (type === 'checkin') {
    const steps = [
      { id: 1, label: 'Staff Arrival', icon: MapPin, desc: 'On Venue Premise' },
      { id: 2, label: 'Grooming & Uniform Complete', icon: Shirt, desc: 'Standards Verified' },
      { id: 3, label: 'Check-In', icon: CheckCircle2, desc: 'Selfie & Biometrics' }
    ];

    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
              Pre-Shift Protocol
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Standard Operating Procedure</span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === steps.length - 1;
            return (
              <div
                key={step.id}
                className={`relative flex flex-col items-center text-center p-2.5 sm:p-3 rounded-xl border transition-all ${
                  isLast
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                    : 'bg-slate-800/40 border-slate-850 text-slate-300'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${
                    isLast
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold leading-tight">{step.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{step.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Check-Out Protocol: "Work Finished -> Change Out of Uniform -> Check-Out -> Dismissal"
  const checkoutSteps = [
    { id: 1, label: 'Work Finished', icon: Coffee, desc: 'Handover Completed' },
    { id: 2, label: 'Change Out of Uniform', icon: Shirt, desc: 'Return Locker/Tools' },
    { id: 3, label: 'Check-Out', icon: LogOut, desc: 'End Shift Selfie' },
    { id: 4, label: 'Dismissal', icon: CheckCircle2, desc: 'Safe Travel Home' }
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
          <span className="text-xs uppercase tracking-wider font-bold text-indigo-400">
            Post-Shift Protocol
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Standard Operating Procedure</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {checkoutSteps.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = step.id === 3;
          return (
            <div
              key={step.id}
              className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                  : 'bg-slate-800/40 border-slate-850 text-slate-300'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center mb-1 ${
                  isCurrent
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-semibold leading-tight">{step.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{step.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
