import React, { useState } from 'react';
import { Mail, CheckCircle2, X, Clock, UserCheck } from 'lucide-react';
import { formatWitaDateTime } from '../../utils/time';

export default function StaffDirectMessageModal({
  isOpen,
  messages = [],
  onClose,
  onMarkAsRead
}) {
  const [marking, setMarking] = useState(false);

  if (!isOpen) return null;

  const list = Array.isArray(messages) ? messages : [];
  const unreadIds = list.filter((m) => !m.read_at).map((m) => m.id);

  const handleConfirmRead = async () => {
    if (unreadIds.length > 0 && onMarkAsRead) {
      setMarking(true);
      try {
        await onMarkAsRead(unreadIds);
      } finally {
        setMarking(false);
      }
    }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161b24] border border-indigo-500/40 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-950/90 via-[#1b2234] to-[#161b24] border-b border-indigo-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0 shadow-inner">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-white truncate">Pesan dari Manager</h3>
              <p className="text-[11px] text-indigo-300 font-bold">
                {unreadIds.length > 0
                  ? `${unreadIds.length} pesan baru untuk Anda`
                  : `${list.length} riwayat pesan`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirmRead}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {list.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Belum ada pesan langsung dari Manager untuk Anda.
            </div>
          ) : (
            list.map((msg) => {
              const isUnread = !msg.read_at;
              return (
                <div
                  key={msg.id}
                  className={`rounded-2xl p-4 border space-y-2 transition ${
                    isUnread
                      ? 'bg-indigo-950/35 border-indigo-400/50 shadow-lg shadow-indigo-950/30'
                      : 'bg-[#12161f] border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider shrink-0">
                            BARU
                          </span>
                        )}
                        <h4 className="text-sm font-black text-white truncate">
                          {msg.title || 'Pesan dari Manager'}
                        </h4>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-indigo-300 font-bold">
                          <UserCheck className="w-3 h-3" />
                          {msg.sender_name || 'Management'}
                        </span>
                        <span>•</span>
                        <span className="font-mono">{formatWitaDateTime(msg.created_at)} WITA</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed bg-[#0f131b]/80 p-3 rounded-xl border border-white/5">
                    {msg.message}
                  </div>

                  {msg.read_at && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold pt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Sudah dibaca pada {formatWitaDateTime(msg.read_at)} WITA</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#12161f]">
          <button
            type="button"
            disabled={marking}
            onClick={handleConfirmRead}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {marking
                ? 'Menyimpan...'
                : unreadIds.length > 0
                ? 'Mengerti & Tandai Sudah Dibaca'
                : 'Tutup'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
