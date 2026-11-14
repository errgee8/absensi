import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, CheckCircle2, AlertTriangle, RefreshCw, Smartphone, ShieldCheck, Upload, User, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { updateStaffProfilePhoto } from '../../utils/api';
import DevicePermissionModal from './DevicePermissionModal';

export default function FaceRegistrationModal({
  staff,
  isOpen,
  onClose,
  onFaceRegistered
}) {
  if (!isOpen || !staff) return null;

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permModalOpen, setPermModalOpen] = useState(false);

  // Start front camera
  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser HP Anda tidak mendukung kamera langsung. Silakan pilih foto asli dari galeri HP.');
      setCameraLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setCameraActive(true);
          setCameraLoading(false);
        };
      }
    } catch (err) {
      console.warn('Face registration camera start error:', err);
      let msg = 'Kamera tidak dapat diakses.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak browser. Ketuk "Izin Lokasi & Kamera" untuk memunculkan notifikasi izin di HP Anda.';
      }
      setCameraError(msg);
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Capture photo from video stream
  const handleCapture = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
      canvas.width = 480;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      const sx = Math.max(0, ((video.videoWidth || 480) - size) / 2);
      const sy = Math.max(0, ((video.videoHeight || 480) - size) / 2);
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 480, 480);

      const base64 = canvas.toDataURL('image/jpeg', 0.88);
      setPreviewPhoto(base64);
      handleSavePhoto(base64);
    } catch (err) {
      setErrorMsg('Gagal mengambil foto: ' + err.message);
    }
  };

  // Upload photo from gallery fallback
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => setErrorMsg('Gagal membaca file foto.');
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => setErrorMsg('File yang dipilih bukan foto valid.');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        const size = Math.min(img.width, img.height);
        const sx = Math.max(0, (img.width - size) / 2);
        const sy = Math.max(0, (img.height - size) / 2);
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 480, 480);
        const base64 = canvas.toDataURL('image/jpeg', 0.88);
        setPreviewPhoto(base64);
        handleSavePhoto(base64);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // Save biometric profile to backend
  const handleSavePhoto = async (photoBase64) => {
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await updateStaffProfilePhoto(staff.id, photoBase64);
      const newUrl = res.profile_photo_url || photoBase64;
      setRegisteredSuccess(true);

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });

      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // Automatically proceed to attendance check-in after 1.8s
      setTimeout(() => {
        if (onFaceRegistered) {
          onFaceRegistered(newUrl);
        }
      }, 1800);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan biometrik wajah. Coba lagi.');
      setSaving(false);
      setPreviewPhoto(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="bg-[#181d26] border border-indigo-500/30 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-[#12161f] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Daftar Face Biometrics</h3>
              <p className="text-[10px] text-slate-400">Pertama kali untuk {staff.name}</p>
            </div>
          </div>
          {!saving && !registeredSuccess && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
              title="Tutup / Nanti"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {registeredSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-500/40 animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div>
                <h4 className="text-lg font-black text-white">Wajah Berhasil Didaftarkan!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Sistem Face Recognition Anda telah aktif.
                </p>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[11px] text-emerald-300 font-bold">
                Melanjutkan langsung ke foto absensi masuk...
              </div>
            </div>
          ) : (
            <>
              {/* Notice Banner */}
              <div className="bg-indigo-500/15 border border-indigo-500/30 rounded-2xl p-3 space-y-1">
                <div className="flex items-center space-x-1.5 text-indigo-300 font-black text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sistem Absensi Baru Berbasis Wajah</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Silakan ambil 1 foto wajah asli Anda sekali ini saja. Foto ini akan menjadi referensi biometrik untuk memverifikasi absensi Anda ke depannya.
                </p>
              </div>

              {/* Error notice if any */}
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Camera Frame with Oval Face Guide */}
              <div className="relative aspect-square w-full bg-black rounded-2xl overflow-hidden border-2 border-indigo-500/40 flex items-center justify-center shadow-inner">
                {previewPhoto ? (
                  <img src={previewPhoto} alt="Preview Biometrik" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover scale-x-[-1]"
                    />

                    {/* Oval Face Guide Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-[68%] h-[82%] rounded-[50%] border-2 border-dashed border-indigo-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex items-center justify-center">
                        <span className="text-[10px] font-black text-indigo-300/90 bg-black/60 px-2.5 py-0.5 rounded-full mt-auto mb-4">
                          Posisikan Wajah Di Sini
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Loading state */}
                {cameraLoading && !previewPhoto && (
                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin" />
                    <span className="text-xs text-slate-300 font-bold">Membuka Kamera HP...</span>
                  </div>
                )}

                {/* Saving state */}
                {saving && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center space-y-2 z-20">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="text-xs text-white font-black tracking-wide">
                      Mendaftarkan Biometrik Wajah...
                    </span>
                  </div>
                )}
              </div>

              {/* Instructions checklist */}
              <div className="bg-[#12161f] border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 space-y-1">
                <div className="font-bold text-slate-200">Panduan Foto:</div>
                <div className="flex items-center space-x-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Pencahayaan terang &amp; menghadap ke kamera</span>
                </div>
                <div className="flex items-center space-x-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Tanpa masker atau kacamata hitam</span>
                </div>
              </div>

              {/* Shutter Button & Options */}
              <div className="space-y-2 pt-1">
                {cameraActive ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleCapture}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-indigo-500/25 active:scale-95 transition cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>AMBIL FOTO BIOMETRIK SAYA</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={startCamera}
                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Coba Nyalakan Kamera Lagi</span>
                  </button>
                )}

                {/* Upload from Gallery fallback */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex items-center space-x-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pilih Foto dari Galeri</span>
                  </button>

                  {/* Button: Minta Ulang Izin Lokasi & Kamera */}
                  <button
                    type="button"
                    onClick={() => setPermModalOpen(true)}
                    className="flex-1 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-[11px] font-bold border border-blue-500/30 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Izin Lokasi &amp; Kamera</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Device Permission Modal */}
      <DevicePermissionModal
        isOpen={permModalOpen}
        onClose={() => setPermModalOpen(false)}
        onPermissionsGranted={() => {
          startCamera();
        }}
      />
    </div>
  );
}
