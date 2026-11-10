import React, { useState } from 'react';
import { Bell, ShieldAlert, CheckCircle2, Lock, RefreshCw, AlertTriangle, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import { subscribeStaffToPush, getNotificationPermission } from '../../utils/pushNotifications';
import confetti from 'canvas-confetti';

export default function MandatoryNotificationModal({
  staff,
  onSuccess,
  onLogout
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(getNotificationPermission() === 'denied');

  const handleEnableNotification = async () => {
    setLoading(true);
    setError(null);

    try {
      await subscribeStaffToPush(staff.id);

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (err) {
      console.error('Notification subscription error:', err);
      const perm = getNotificationPermission();
      if (perm === 'denied') {
        setPermissionDenied(true);
      }
      setError(err.message || 'Gagal mengaktifkan notifikasi. Pastikan Anda mengklik "Izinkan".');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-slate-900">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4">
        {/* Header Icon */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 border-2 border-blue-200 mx-auto flex items-center justify-center shadow-inner animate-bounce">
            <Bell className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
            Izin Notifikasi HP Wajib Diaktifkan
          </h3>
          <p className="text-xs text-slate-600 font-medium">
            Halo <strong className="text-slate-900 font-bold">{staff.name}</strong>, sistem absensi JP Karaoke & LuckyCat mewajibkan push notification aktif pada HP Anda.
          </p>
        </div>

        {/* Kenapa Wajib Banner */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
            Fungsi Notifikasi di HP Anda:
          </span>
          <ul className="space-y-1.5 text-slate-800 font-bold">
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
              <span>Pemberitahuan persetujuan status izin, sakit, atau cuti</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
              <span>Pengumuman penting dan arahan resmi dari Manajemen</span>
            </li>
          </ul>
        </div>

        {/* Error or Denied State Notice */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-tight">{error}</div>
          </div>
        )}

        {permissionDenied ? (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 text-xs text-amber-950 space-y-2">
            <div className="flex items-center space-x-1.5 font-black text-amber-900">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Izin Notifikasi Sedang Diblokir di Browser</span>
            </div>
            <p className="text-[11px] text-amber-900 leading-tight">
              Untuk membuka blokir di HP Android / Chrome:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-800 font-bold">
              <li>Klik ikon gembok 🔒 di bilah alamat browser HP Anda.</li>
              <li>Pilih menu <strong>Izin Situs</strong> (Site settings).</li>
              <li>Ubah menu <strong>Notifikasi</strong> menjadi <strong>Izinkan (Allow)</strong>.</li>
              <li>Klik tombol <strong>"Cek Ulang Izin"</strong> di bawah.</li>
            </ol>

            <button
              type="button"
              disabled={loading}
              onClick={handleEnableNotification}
              className="w-full mt-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>Cek Ulang Izin Notifikasi</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={handleEnableNotification}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengaktifkan Notifikasi...</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 stroke-[2.5]" />
                  <span>Aktifkan Notifikasi HP</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-500 font-bold">
              *Pilih opsi <strong>"Izinkan" (Allow)</strong> pada dialog popup browser yang muncul.
            </p>
          </div>
        )}

        {/* Footer Logout Option */}
        <div className="pt-2 border-t border-slate-200 flex justify-center">
          <button
            type="button"
            onClick={onLogout}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 transition flex items-center space-x-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Kembali / Ganti Akun</span>
          </button>
        </div>
      </div>
    </div>
  );
}
