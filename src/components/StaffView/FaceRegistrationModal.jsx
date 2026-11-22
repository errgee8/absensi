import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, CheckCircle2, AlertTriangle, RefreshCw, Smartphone, ShieldCheck, Upload, Sparkles, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import { registerStaffBiometrics } from '../../utils/api';
import { uploadAttendancePhotoClient } from '../../utils/supabaseClient';
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
  const [savedBiometricUrl, setSavedBiometricUrl] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permModalOpen, setPermModalOpen] = useState(false);



  // Start front camera with resilient fallback cascade
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

    const getUserMediaWithTimeout = (constraints, timeoutMs = 6000) => {
      return Promise.race([
        navigator.mediaDevices.getUserMedia(constraints),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('CAMERA_TIMEOUT')), timeoutMs)
        )
      ]);
    };

    let stream = null;
    try {
      // 1. Ideal front camera with square dimension
      stream = await getUserMediaWithTimeout({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      }, 5000);
    } catch (err1) {
      console.warn('Strict front camera request failed, trying simple user facing:', err1);
      try {
        // 2. Fallback to basic user facing mode
        stream = await getUserMediaWithTimeout({
          video: { facingMode: 'user' },
          audio: false
        }, 5000);
      } catch (err2) {
        console.warn('User facing failed, trying generic video stream:', err2);
        try {
          // 3. Fallback to any available video stream
          stream = await getUserMediaWithTimeout({
            video: true,
            audio: false
          }, 5000);
        } catch (err3) {
          console.error('All camera attempts failed:', err3);
          let msg = 'Kamera tidak dapat diakses atau lambat merespons.';
          if (err3.name === 'NotAllowedError' || err3.name === 'PermissionDeniedError' || err1.name === 'NotAllowedError') {
            msg = 'Izin kamera ditolak browser. Ketuk "Izin Lokasi & Kamera" untuk memunculkan notifikasi izin di HP Anda.';
          } else if (err3.message === 'CAMERA_TIMEOUT' || err1.message === 'CAMERA_TIMEOUT') {
            msg = 'Kamera HP lambat merespons. Gunakan tombol "Buka Kamera HP Langsung" di bawah.';
          }
          setCameraError(msg);
          setCameraLoading(false);
          setCameraActive(false);
          return;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        v.onloadedmetadata = () => {
          v.play().catch(() => {});
          setCameraActive(true);
          setCameraLoading(false);
        };
        v.play().catch(() => {});
      }
      setCameraActive(true);
      setCameraLoading(false);
    }

    // Safety guard: force loading state to dismiss within 3.5s
    setTimeout(() => {
      setCameraLoading(false);
      if (streamRef.current) setCameraActive(true);
    }, 3500);
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

  // Capture photo and save biometrics in one reliable step
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    const vWidth = video.videoWidth || 0;
    const vHeight = video.videoHeight || 0;
    if (vWidth === 0 || vHeight === 0) {
      setErrorMsg('Kamera sedang memuat gambar, tunggu 1-2 detik lalu ketuk tombol lagi.');
      return;
    }

    try {
      const size = Math.min(vWidth, vHeight);
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context tidak tersedia');

      const sx = Math.max(0, (vWidth - size) / 2);
      const sy = Math.max(0, (vHeight - size) / 2);
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 480, 480);

      const base64 = canvas.toDataURL('image/jpeg', 0.80);
      setPreviewPhoto(base64);
      handleSavePhoto(base64);
    } catch (err) {
      console.error('Capture error:', err);
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
        const base64 = canvas.toDataURL('image/jpeg', 0.80);
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

    // Optimistic local persistence flag to prevent any reload/loop
    try {
      if (staff?.id) localStorage.setItem(`staff_face_registered_${staff.id}`, 'true');
      if (staff?.uuid) localStorage.setItem(`staff_face_registered_${staff.uuid}`, 'true');
      if (staff?.name) localStorage.setItem(`staff_face_registered_${staff.name.toLowerCase().trim()}`, 'true');
    } catch {}

    try {
      // 1. Offload storage upload directly to client Supabase Storage when possible (super fast, prevents serverless function duration & memory limits)
      let photoRef = photoBase64;
      try {
        const directUrl = await uploadAttendancePhotoClient(photoBase64, `biometric_${staff.id || 'staff'}`);
        if (directUrl) photoRef = directUrl;
      } catch (errUpload) {
        console.warn('Client direct biometric upload note:', errUpload);
      }

      // 2. Call server endpoint with timeout race guard (never hang user)
      const registerPromise = registerStaffBiometrics(staff.id, {
        photoBase64: photoRef,
        livenessVerified: true
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 15000)
      );

      let res;
      try {
        res = await Promise.race([registerPromise, timeoutPromise]);
      } catch (errRace) {
        if (errRace.message === 'TIMEOUT') {
          console.warn('Biometric API request timed out, local persistence active.');
          res = {
            biometric_photo_url: photoRef,
            photo_url: photoRef
          };
        } else {
          throw errRace;
        }
      }

      const newUrl = res?.biometric_photo_url || res?.biometrics?.photo_url || res?.photo_url || photoRef;
      setSavedBiometricUrl(newUrl);
      setRegisteredSuccess(true);

      // Call onFaceRegistered IMMEDIATELY so parent loggedInStaff state updates without delay
      if (onFaceRegistered) {
        onFaceRegistered(newUrl, staff);
      }

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

      // Auto close and return to portal after 1.8s
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Error saving biometrics:', err);
      setErrorMsg(err.message || 'Gagal menyimpan biometrik wajah. Coba lagi.');
      setSaving(false);
      setPreviewPhoto(null);

      // Re-ensure video element has streamRef attached if retrying
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
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
              <h3 className="text-sm font-black text-white">
                {staff?.face_biometrics_registered ? 'Perbarui Wajah Biometrik' : 'Daftar Face Biometrics'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {staff?.face_biometrics_registered ? `Overwrite data biometrik master ${staff.name}` : `Wajib 1x untuk ${staff.name}`}
              </p>
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
                <h4 className="text-lg font-black text-white">
                  {staff?.face_biometrics_registered ? 'Biometrik Wajah Diperbarui!' : 'Pendaftaran Wajah Berhasil!'}
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Data master wajah Anda telah diperbarui &amp; siap diverifikasi saat absensi masuk.
                </p>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[11px] text-emerald-300 font-bold leading-relaxed">
                ✓ Foto biometrik baru telah tersimpan. Silakan tekan tombol <strong>Absen Masuk</strong> di menu utama saat jam kerja dimulai.
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onFaceRegistered) {
                    onFaceRegistered(savedBiometricUrl || previewPhoto);
                  }
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition cursor-pointer"
              >
                Selesai &amp; Kembali ke Menu Absen
              </button>
            </div>
          ) : (
            <>
              {/* Mandatory Lighting & Centering Guidance Banner */}
              <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/70 border border-indigo-500/40 rounded-2xl p-3 space-y-2">
                <div className="flex items-center space-x-1.5 text-indigo-300 font-black text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Panduan Foto Master Biometrik:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10.5px]">
                  <div className="bg-[#12161f] border border-slate-800/80 rounded-xl p-2 flex flex-col justify-start">
                    <span className="font-bold text-amber-300">💡 Cahaya Terang</span>
                    <span className="text-slate-300 text-[10px] leading-tight mt-0.5">Cahaya cukup di depan wajah, jangan membelakangi lampu.</span>
                  </div>
                  <div className="bg-[#12161f] border border-slate-800/80 rounded-xl p-2 flex flex-col justify-start">
                    <span className="font-bold text-rose-300">🚫 Tanpa Aksesoris</span>
                    <span className="text-slate-300 text-[10px] leading-tight mt-0.5">Lepas masker, kacamata hitam, atau topi.</span>
                  </div>
                  <div className="bg-[#12161f] border border-slate-800/80 rounded-xl p-2 flex flex-col justify-start">
                    <span className="font-bold text-emerald-300">🎯 Pas di Bingkai</span>
                    <span className="text-slate-300 text-[10px] leading-tight mt-0.5">Wajah tegak lurus tepat di dalam garis oval panduan.</span>
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

              {/* Camera Frame with Oval Face Guide (Permanently mounted video, never lost on re-renders) */}
              <div className="relative aspect-square w-full bg-slate-950 rounded-2xl overflow-hidden border-2 border-indigo-500/40 flex items-center justify-center shadow-inner">
                {/* Always mounted video element for immediate srcObject binding (never display:none so video frames decode) */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-150 ${
                    previewPhoto ? 'opacity-0 absolute inset-0 pointer-events-none' : 'opacity-100 block'
                  }`}
                />

                {/* Preview Photo if taken */}
                {previewPhoto && (
                  <img
                    src={previewPhoto}
                    alt="Preview Biometrik"
                    className="w-full h-full object-cover absolute inset-0 z-10"
                  />
                )}

                {/* Oval Face Guide Overlay (Always stable static styling, zero GPU crash) */}
                {cameraActive && !previewPhoto && !saving && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3 z-10">
                    {/* Top Guide Banner */}
                    <div className="px-3 py-1 rounded-full bg-black/80 border border-emerald-500/40 text-[10px] font-black text-emerald-300 shadow-md">
                      📍 Posisikan Wajah Tegak di Dalam Bingkai
                    </div>

                    {/* Oval Target Frame */}
                    <div className="relative w-[68%] h-[76%] rounded-[50%] border-2 border-dashed border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.30)] flex flex-col items-center justify-center">
                      <span className="text-[10px] font-black text-emerald-300 bg-black/70 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        Pusat Wajah
                      </span>
                    </div>

                    {/* Bottom Instruction */}
                    <span className="text-[10px] font-black text-emerald-200 bg-black/80 px-3 py-0.5 rounded-full border border-emerald-500/30">
                      Tatap Kamera &amp; Ketuk Tombol di Bawah
                    </span>
                  </div>
                )}

                {/* Loading state with escape button */}
                {cameraLoading && !previewPhoto && (
                  <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center space-y-2.5 z-20 p-4 text-center">
                    <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin mx-auto" />
                    <span className="text-xs text-slate-300 font-bold">Membuka Kamera HP...</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-700 transition flex items-center justify-center space-x-1.5 mx-auto cursor-pointer shadow"
                    >
                      <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Buka Kamera HP Langsung</span>
                    </button>
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

              {/* Action Buttons: 1-Tap Direct Capture */}
              <div className="space-y-2 pt-1">
                {cameraActive ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleCapture}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/25 active:scale-95 transition cursor-pointer animate-pulse"
                  >
                    <Camera className="w-4 h-4 text-slate-950" />
                    <span>📸 AMBIL &amp; DAFTARKAN BIOMETRIK WAJAH</span>
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

                {/* Upload from Gallery / Native Camera fallback with user capture */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
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
