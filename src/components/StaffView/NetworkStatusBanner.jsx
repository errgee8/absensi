import React from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function NetworkStatusBanner({ networkStatus, onRefresh }) {
  if (!networkStatus) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 animate-pulse flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-slate-500 animate-ping" />
        <span>Verifying local venue Wi-Fi subnet...</span>
      </div>
    );
  }

  const { isMatch, clientIp, matchedSubnet, enforceWifi, venueName } = networkStatus;

  return (
    <div
      className={`rounded-2xl border p-4 mb-5 transition-all ${
        isMatch
          ? 'bg-emerald-950/20 border-emerald-500/30'
          : enforceWifi
          ? 'bg-rose-950/30 border-rose-500/40'
          : 'bg-amber-950/25 border-amber-500/35'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isMatch
                ? 'bg-emerald-500/20 text-emerald-400'
                : enforceWifi
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {isMatch ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-white">
                {isMatch
                  ? 'Company Wi-Fi Gatekeeper: Verified'
                  : enforceWifi
                  ? 'Wi-Fi Block: Off-Network Detected'
                  : 'Off-Network Check-In Warning'}
              </h4>
            </div>

            <p className="text-xs mt-1 text-slate-300 leading-relaxed">
              {isMatch ? (
                <>
                  Device connected to authorized venue LAN subnet (
                  <span className="font-mono text-emerald-400">{clientIp}</span>
                  {matchedSubnet ? ` via ${matchedSubnet}` : ''}).
                </>
              ) : enforceWifi ? (
                <>
                  Your device IP (<span className="font-mono text-rose-400">{clientIp}</span>) is not on
                  the venue's internal router subnet. Strict gatekeeper is enabled; connect to{' '}
                  <span className="font-semibold text-white">JP Club Staff Wi-Fi</span> to proceed.
                </>
              ) : (
                <>
                  Off-Network connection (<span className="font-mono text-amber-400">{clientIp}</span>).
                  Check-in will be logged and flagged as{' '}
                  <span className="font-semibold text-amber-300">"Off-Network Check-In Attempt"</span> for
                  manager audit.
                </>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 shrink-0 transition"
          title="Re-check network IP"
        >
          Check
        </button>
      </div>
    </div>
  );
}
