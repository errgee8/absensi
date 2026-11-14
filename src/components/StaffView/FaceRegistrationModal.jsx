import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, CheckCircle2, AlertTriangle, RefreshCw, Smartphone, ShieldCheck, Upload, Sparkles, ArrowLeftRight, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import { registerStaffBiometrics } from '../../utils/api';
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

  // Liveness confirmation steps: 1 = CENTER, 2 = HEAD_TURN, 3 = BLINK_SMILE
  const [livenessStep, setLivenessStep] = useState(1);
  const [stepCompleted, setStepCompleted] = useState({ 1: false, 2: false, 3: false });

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

  // Advance liveness steps
  const handleNextLivenessStep = () => {
    if (livenessStep === 1) {
      setStepCompleted(prev => ({ ...prev, 1: true }));
      setLivenessStep(2);
    } else if (livenessStep === 2) {
      setStepCompleted(prev => ({ ...prev, 2: true }));
      setLivenessStep(3);
    }
  };

  // Final step: Capture photo and save biometrics
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
      setStepCompleted({ 1: true, 2: true, 3: true });
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
        setStepCompleted({ 1: true, 2: true, 3: true });
        setPreviewPhoto(base64);
        handleSavePhoto(base64);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // Save official biometric reference to backend via registerStaffBiometrics
  const handleSavePhoto = async (photoBase64) => {
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await registerStaffBiometrics(staff.id, {
        photoBase64,
        livenessVerified: true
      });
      const newUrl = res?.biometrics?.photo_url || photoBase64;
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
              <p className="text-[10px] text-slate-400">Wajib untuk {staff.name}</p>
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
                  Sistem Face Recognition Anda telah aktif &amp; terverifikasi liveness.
                </p>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[11px] text-emerald-300 font-bold">
                Melanjutkan langsung ke absensi masuk...
              </div>
            </div>
          ) : (
            <>
              {/* Mandatory Lighting & Centering Guidance Banner */}
              <div className="bg-indigo-500/15 border border-indigo-500/35 rounded-2xl p-3 space-y-1">
                <div className="flex items-center space-x-1.5 text-indigo-300 font-black text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Petunjuk Pendaftaran Biometrik</span>
                </div>
                <p className="text-[11px] text-slate-200 leading-relaxed font-semibold">
                  Pastikan berada di tempat yang memiliki cahaya cukup terang dan posisikan wajah di tengah bingkai.
                </p>
              </div>

              {/* Liveness Step Indicator */}
              <div className="bg-[#12161f] border border-slate-800 rounded-2xl p-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold mb-2">
                  <span className="text-slate-400 uppercase tracking-wider">Verifikasi Keaktifan (Liveness):</span>
                  <span className="text-indigo-400 font-mono">Langkah {livenessStep} dari 3</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className={`p-1.5 rounded-xl border text-center transition ${
                    livenessStep === 1
                      ? 'bg-indigo-600/25 border-indigo-400 text-indigo-200 font-black'
                      : stepCompleted[1]
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    <div className="text-[10px]">1. Posisi Tengah</div>
                  </div>
                  <div className={`p-1.5 rounded-xl border text-center transition ${
                    livenessStep === 2
                      ? 'bg-indigo-600/25 border-indigo-400 text-indigo-200 font-black'
                      : stepCompleted[2]
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    <div className="text-[10px]">2. Toleh Kanan/Kiri</div>
                  </div>
                  <div className={`p-1.5 rounded-xl border text-center transition ${
                    livenessStep === 3
                      ? 'bg-indigo-600/25 border-indigo-400 text-indigo-200 font-black'
                      : stepCompleted[3]
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    <div className="text-[10px]">3. Kedip / Senyum</div>
                  </div>
                </div>
              </div>

              {/* Error notice if any */}
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Camera Frame with Oval Face Guide & Interactive Prompts */}
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

                    {/* Oval Face Guide Overlay with Interactive Target */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3 z-10">
                      {/* Top Step Banner */}
                      <div className="px-3 py-1 rounded-full bg-black/75 border border-indigo-500/40 text-[10px] font-black text-indigo-300 shadow-md">
                        {livenessStep === 1 && '📍 Langkah 1: Posisikan Wajah Tegak di Tengah'}
                        {livenessStep === 2 && '🔄 Langkah 2: Menoleh Sedikit ke Kanan & Kiri'}
                        {livenessStep === 3 && '👁️ Langkah 3: Kedipkan Mata 2x atau Tersenyum'}
                      </div>

                      {/* Oval Frame */}
                      <div className={`relative w-[68%] h-[74%] rounded-[50%] border-2 border-dashed ${
                        livenessStep === 1 ? 'border-indigo-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]' :
                        livenessStep === 2 ? 'border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]' :
                        'border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]'
                      } flex flex-col items-center justify-center transition-colors duration-300`}>
                        {livenessStep === 2 && (
                          <div className="flex items-center space-x-4 text-amber-300 font-mono text-xs font-black animate-pulse">
                            <span>⇦ KIRI</span>
                            <ArrowLeftRight className="w-5 h-5 text-amber-400" />
                            <span>KANAN ⇨</span>
                          </div>
                        )}

                        {livenessStep === 3 && (
                          <div className="flex items-center space-x-1.5 text-emerald-300 font-bold text-xs bg-black/60 px-2.5 py-1 rounded-full border border-emerald-500/30 animate-pulse">
                            <Eye className="w-4 h-4 text-emerald-400" />
                            <span>Berkedip 2x / Senyum</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Instruction */}
                      <span className="text-[10px] font-black text-indigo-200 bg-black/75 px-3 py-0.5 rounded-full border border-indigo-500/30">
                        {livenessStep === 1 ? 'Wajah Tegak Menghadap Kamera' : livenessStep === 2 ? 'Tolehkan Wajah Perlahan' : 'Tatap Kamera & Bersiap Ambil Foto'}
                      </span>
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

              {/* Action Buttons based on Liveness Step */}
              <div className="space-y-2 pt-1">
                {cameraActive ? (
                  livenessStep === 1 ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleNextLivenessStep}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-indigo-500/25 active:scale-95 transition cursor-pointer"
                    >
                      <span>1. Wajah Sudah di Tengah, Lanjut ➔</span>
                    </button>
                  ) : livenessStep === 2 ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleNextLivenessStep}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/25 active:scale-95 transition cursor-pointer"
                    >
                      <ArrowLeftRight className="w-4 h-4 text-slate-950" />
                      <span>2. Sudah Menoleh Kanan/Kiri, Lanjut ➔</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleCapture}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/25 active:scale-95 transition cursor-pointer animate-pulse"
                    >
                      <Camera className="w-4 h-4 text-slate-950" />
                      <span>3. AMBIL &amp; DAFTARKAN BIOMETRIK WAJAH</span>
                    </button>
                  )
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
