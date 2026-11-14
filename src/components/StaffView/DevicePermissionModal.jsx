import React, { useState, useEffect } from 'react';
import { MapPin, Camera, X, CheckCircle2, AlertTriangle, RefreshCw, Smartphone, ShieldCheck, ExternalLink } from 'lucide-react';

export default function DevicePermissionModal({ isOpen, onClose, onPermissionsGranted }) {
  if (!isOpen) return null;

  const [locStatus, setLocStatus] = useState('checking'); // 'checking' | 'granted' | 'prompt' | 'denied' | 'unavailable'
  const [camStatus, setCamStatus] = useState('checking'); // 'checking' | 'granted' | 'prompt' | 'denied' | 'unavailable'
  const [requesting, setRequesting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const checkStatus = async () => {
    // Check Geolocation status
    if (!navigator.geolocation) {
      setLocStatus('unavailable');
    } else if (navigator.permissions && navigator.permissions.query) {
      try {
        const geoPerm = await navigator.permissions.query({ name: 'geolocation' });
        setLocStatus(geoPerm.state); // 'granted' | 'prompt' | 'denied'
        geoPerm.onchange = () => setLocStatus(geoPerm.state);
      } catch {
        setLocStatus('prompt');
      }
    } else {
      setLocStatus('prompt');
    }

    // Check Camera status
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCamStatus('unavailable');
    } else if (navigator.permissions && navigator.permissions.query) {
      try {
        const camPerm = await navigator.permissions.query({ name: 'camera' });
        setCamStatus(camPerm.state); // 'granted' | 'prompt' | 'denied'
        camPerm.onchange = () => setCamStatus(camPerm.state);
      } catch {
        setCamStatus('prompt');
      }
    } else {
      setCamStatus('prompt');
    }
  };

  useEffect(() => {
    checkStatus();
  }, [isOpen]);

  const handleRequestAll = async () => {
    setRequesting(true);
    setFeedbackMsg(null);

    let geoGranted = false;
    let camGranted = false;

    // 1. Trigger native Geolocation browser prompt
    if (navigator.geolocation) {
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              geoGranted = true;
              setLocStatus('granted');
              resolve(pos);
            },
            (err) => {
              if (err.code === 1) {
                setLocStatus('denied');
              } else {
                setLocStatus('unavailable');
              }
              reject(err);
            },
            { enableHighAccuracy: true, timeout: 8000 }
          );
        });
      } catch (err) {
        console.warn('Geolocation prompt error:', err);
      }
    }

    // 2. Trigger native Camera browser prompt
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        camGranted = true;
        setCamStatus('granted');
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn('Camera prompt error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCamStatus('denied');
        } else {
          setCamStatus('unavailable');
        }
      }
    }

    setRequesting(false);

    if (geoGranted && camGranted) {
      setFeedbackMsg('Semua izin berhasil diberikan! Anda sudah bisa absen.');
      if (onPermissionsGranted) onPermissionsGranted();
      setTimeout(() => {
        onClose();
      }, 1500);
    } else if (geoGranted) {
      setFeedbackMsg('Izin lokasi berhasil diaktifkan!');
    } else if (camGranted) {
      setFeedbackMsg('Izin kamera berhasil diaktifkan!');
    } else {
      setFeedbackMsg('Browser belum mengizinkan. Ikuti petunjuk manual di bawah.');
    }
  };

  const isAllGranted = locStatus === 'granted' && camStatus === 'granted';
  const hasDenied = locStatus === 'denied' || camStatus === 'denied';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-slate-100">
      <div className="bg-[#181d26] border border-slate-700/80 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl space-y-4 p-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Izin Lokasi &amp; Kamera HP</h3>
              <p className="text-[10px] text-slate-400">Diperlukan untuk Absensi &amp; Face Recog</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback message */}
        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold border flex items-center space-x-2 ${
              isAllGranted
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
            }`}
          >
            {isAllGranted ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Permission Status Items */}
        <div className="space-y-2.5">
          {/* Geolocation Item */}
          <div className="bg-[#12161f] border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">Izin Lokasi (GPS)</div>
                <div className="text-[10px] text-slate-400">Memastikan Anda berada di area outlet</div>
              </div>
            </div>
            <div className="shrink-0 ml-2">
              {locStatus === 'granted' ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Diizinkan</span>
                </span>
              ) : locStatus === 'denied' ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Ditolak</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <span>Belum Aktif</span>
                </span>
              )}
            </div>
          </div>

          {/* Camera Item */}
          <div className="bg-[#12161f] border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">Izin Kamera</div>
                <div className="text-[10px] text-slate-400">Untuk foto selfie absensi &amp; biometrik</div>
              </div>
            </div>
            <div className="shrink-0 ml-2">
              {camStatus === 'granted' ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Diizinkan</span>
                </span>
              ) : camStatus === 'denied' ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Ditolak</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <span>Belum Aktif</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Action Button: Munculkan Notifikasi Izin di HP */}
        <button
          type="button"
          onClick={handleRequestAll}
          disabled={requesting}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25 transition cursor-pointer active:scale-98 disabled:opacity-50"
        >
          {requesting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Meminta Izin Browser...</span>
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4" />
              <span>MUNCULKAN NOTIFIKASI IZIN HP (POPUP)</span>
            </>
          )}
        </button>

        {/* Manual guide if previously denied */}
        {hasDenied && (
          <div className="bg-[#12161f] border border-amber-500/30 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center space-x-1.5 text-amber-300 font-extrabold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Jika Notifikasi Tidak Muncul Otomatis:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>Ketuk ikon <strong>Gembok 🔒</strong> atau <strong>Setelan</strong> di baris URL browser paling atas.</li>
              <li>Pilih menu <strong>Izin (Permissions)</strong> atau <strong>Setelan Situs</strong>.</li>
              <li>Ubah <strong>Lokasi</strong> dan <strong>Kamera</strong> menjadi <strong>Izinkan (Allow)</strong>.</li>
            </ol>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full mt-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Muat Ulang Halaman (Reload)</span>
            </button>
          </div>
        )}

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
