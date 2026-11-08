import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Loader2, SwitchCamera } from 'lucide-react';
import confetti from 'canvas-confetti';
import { captureAndWatermark, watermarkFile } from '../../utils/watermark';
import { checkIn, checkOut, startBreak, endBreak } from '../../utils/api';
import { isWithinGeofence } from '../../utils/distance';

export default function KioskCameraModal({
  staff,
  activeShift,
  actionType = 'checkin', // 'checkin' | 'checkout' | 'break_start' | 'break_end'
  confirmedShift = null,
  venueSettings,
  onCompleteAndAutoLogout,
  onClose
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // Default to front-facing camera ('user' = front, 'environment' = back)
  const [flashing, setFlashing] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const [countdown, setCountdown] = useState(3);

  const [userLocation, setUserLocation] = useState(null);

  // Background GPS fetch
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy)
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Start camera with exact facingMode preference and robust fallback
  const startCamera = async (targetFacing = facingMode) => {
    setCameraLoading(true);
    setCameraError(null);

    // Stop any existing tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    let stream = null;

    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera langsung. Silakan gunakan tombol Buka Kamera HP.');
      setCameraLoading(false);
      return;
    }

    try {
      // 1. Try requested facingMode ('user' for front selfie, 'environment' for rear/back camera)
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: targetFacing } },
        audio: false
      });
    } catch (err1) {
      console.warn(`FacingMode ${targetFacing} failed, trying fallback stream:`, err1);
      try {
        // 2. Fallback to basic video stream (any available camera)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (err2) {
        console.error('All camera attempts failed:', err2);
        let msg = 'Kamera tidak dapat diakses.';
        if (err2.name === 'NotAllowedError' || err1.name === 'NotAllowedError') {
          msg = 'Izin kamera ditolak. Berikan izin kamera di browser Anda atau gunakan tombol Buka Kamera HP.';
        } else if (err2.name === 'NotFoundError') {
          msg = 'Kamera tidak terdeteksi. Gunakan tombol Buka Kamera HP di bawah.';
        }
        setCameraError(msg);
        setCameraLoading(false);
        setCameraActive(false);
        return;
      }
    }

    if (stream) {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Video play interrupted:', e);
        }
      }
      setCameraActive(true);
      setCameraLoading(false);
    }
  };

  // Switch between front and back camera
  const handleToggleCamera = async () => {
    if (flashing || submitting || cameraLoading) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera('user');
    return () => stopCamera();
  }, []);

  // Action status labels
  const getActionConfig = () => {
    switch (actionType) {
      case 'checkout':
        return { title: 'Ambil Foto Check-Out', watermarkStatus: 'Check-Out', successMsg: 'Shift selesai. Terima kasih atas kerja keras Anda!' };
      case 'break_start':
        return { title: 'Ambil Foto Mulai Istirahat', watermarkStatus: 'Mulai Istirahat', successMsg: 'Waktu istirahat dimulai (Maksimal 1 jam)!' };
      case 'break_end':
        return { title: 'Ambil Foto Selesai Istirahat', watermarkStatus: 'Selesai Istirahat', successMsg: 'Istirahat selesai! Selamat kembali bertugas.' };
      default:
        return { title: 'Ambil Foto Check-In', watermarkStatus: 'Check-In', successMsg: 'Shift dimulai. Selamat bertugas!' };
    }
  };

  const config = getActionConfig();

  // Helper to submit finalized base64 image
  const submitAttendancePayload = async (watermarkedBase64) => {
    setCapturedPreview(watermarkedBase64);
    stopCamera();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const venueLat = venueSettings?.venue_lat ?? -8.780981;
      const venueLng = venueSettings?.venue_lng ?? 115.176863;
      const currentLat = userLocation?.lat ?? venueLat;
      const currentLng = userLocation?.lng ?? venueLng;

      const payload = {
        staffId: staff.id,
        pin: staff.pin,
        shiftId: activeShift?.id,
        lat: currentLat,
        lng: currentLng,
        accuracy: userLocation?.accuracy ?? 10,
        photoBase64: watermarkedBase64,
        timestamp: new Date().toISOString(),
        confirmedShift: confirmedShift || null
      };

      let res;
      if (actionType === 'break_start') {
        res = await startBreak(payload);
      } else if (actionType === 'break_end') {
        res = await endBreak(payload);
      } else if (actionType === 'checkout') {
        res = await checkOut(payload);
      } else {
        res = await checkIn(payload);
      }

      setSuccessMessage(res.message || config.successMsg);

      setTimeout(() => {
        setFlashing(false);
        setSubmitting(false);
        setSubmitSuccess(true);

        confetti({
          particleCount: 50,
          spread: 55,
          origin: { y: 0.6 }
        });

        // 3-second auto logout timer
        let count = 3;
        const timer = setInterval(() => {
          count -= 1;
          setCountdown(count);
          if (count <= 0) {
            clearInterval(timer);
            onCompleteAndAutoLogout();
          }
        }, 1000);
      }, 1200);

    } catch (err) {
      setFlashing(false);
      setSubmitting(false);
      setSubmitError(err.message || 'Gagal memproses absensi.');
    }
  };

  // 1. Shutter capture via live WebRTC video
  const handleShutter = async () => {
    if (!videoRef.current || flashing || submitting) return;

    setFlashing(true);

    try {
      const venueLat = venueSettings?.venue_lat ?? -8.780981;
      const venueLng = venueSettings?.venue_lng ?? 115.176863;
      const radius = venueSettings?.geofence_radius ?? 500;

      const currentLat = userLocation?.lat ?? venueLat;
      const currentLng = userLocation?.lng ?? venueLng;
      const geoCheck = isWithinGeofence(currentLat, currentLng, venueLat, venueLng, radius);

      // Burn hardcoded watermark
      const watermarkedBase64 = await captureAndWatermark({
        videoElement: videoRef.current,
        staffName: staff.name,
        lat: currentLat,
        lng: currentLng,
        status: config.watermarkStatus,
        isGpsValid: geoCheck.inside,
        maxWidth: 960,
        quality: 0.70
      });

      await submitAttendancePayload(watermarkedBase64);

    } catch (err) {
      setFlashing(false);
      setSubmitError(err.message || 'Gagal mengambil gambar dari kamera.');
    }
  };

  // 2. Native File Input Fallback (Works on 100% of mobile phones)
  const handleNativeFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFlashing(true);
    setSubmitting(true);
    setSubmitError(null);

    try {
      const venueLat = venueSettings?.venue_lat ?? -8.780981;
      const venueLng = venueSettings?.venue_lng ?? 115.176863;
      const radius = venueSettings?.geofence_radius ?? 500;
      const currentLat = userLocation?.lat ?? venueLat;
      const currentLng = userLocation?.lng ?? venueLng;
      const geoCheck = isWithinGeofence(currentLat, currentLng, venueLat, venueLng, radius);

      const watermarkedBase64 = await watermarkFile(file, {
        staffName: staff.name,
        lat: currentLat,
        lng: currentLng,
        status: config.watermarkStatus,
        isGpsValid: geoCheck.inside,
        maxWidth: 960,
        quality: 0.70
      });

      await submitAttendancePayload(watermarkedBase64);

    } catch (err) {
      setFlashing(false);
      setSubmitting(false);
      setSubmitError(err.message || 'Gagal memproses foto dari kamera HP.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div>
            <h3 className="text-sm font-extrabold text-white">{config.title}</h3>
            <p className="text-[11px] text-slate-400 font-medium">{staff.name} • {staff.venue}</p>
          </div>
          {!submitting && !submitSuccess && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Viewfinder or Success */}
        <div className="p-4">
          {submitSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-500/40 animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div>
                <h4 className="text-xl font-black text-white">Absensi Berhasil Dicatat!</h4>
                <p className="text-xs text-slate-300 mt-1">{successMessage}</p>
              </div>

              {/* 3-Second Countdown Progress Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs">
                <span className="text-slate-400 block mb-1 font-medium">
                  Kembali ke layar PIN dalam:
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {countdown} detik
                </span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(countdown / 3) * 100}%` }}
                  />
                </div>
              </div>

              <button
                onClick={onCompleteAndAutoLogout}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Selesai Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Camera Frame */}
              <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {flashing && (
                  <div className="absolute inset-0 bg-white z-30 animate-ping opacity-75 pointer-events-none" />
                )}

                {/* Submitting Overlay */}
                {submitting && (
                  <div className="absolute inset-0 bg-slate-950/80 z-20 flex flex-col items-center justify-center space-y-2 backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="text-xs font-bold text-white tracking-wide">Menyimpan Absensi...</span>
                  </div>
                )}

                {/* Captured Preview */}
                {capturedPreview ? (
                  <img
                    src={capturedPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    {/* Always mounted video element for immediate srcObject binding */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${
                        facingMode === 'user' ? 'transform scale-x-[-1]' : ''
                      } ${cameraActive ? 'block' : 'hidden'}`}
                    />

                    {/* Quick Rotate Camera Floating Overlay */}
                    {cameraActive && !capturedPreview && !submitting && (
                      <button
                        type="button"
                        onClick={handleToggleCamera}
                        disabled={cameraLoading}
                        className="absolute top-3 right-3 z-20 flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 active:scale-95 text-slate-200 border border-slate-700/80 backdrop-blur-md shadow-lg transition text-[11px] font-bold"
                        title="Putar Kamera (Depan / Belakang)"
                      >
                        <SwitchCamera className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>{facingMode === 'user' ? 'Kamera Depan' : 'Kamera Belakang'}</span>
                      </button>
                    )}

                    {/* Loading State */}
                    {cameraLoading && !cameraError && (
                      <div className="text-center p-4 space-y-2">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                        <span className="text-xs text-slate-400 block font-medium">
                          {facingMode === 'user' ? 'Membuka kamera depan (selfie)...' : 'Membuka kamera belakang...'}
                        </span>
                      </div>
                    )}

                    {/* Camera Error State */}
                    {cameraError && (
                      <div className="p-4 text-center space-y-3 max-w-[260px]">
                        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow"
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>Buka Kamera HP Langsung</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Shutter Button and Controls */}
              {!capturedPreview && (
                <div className="pt-2 space-y-2">
                  {cameraActive ? (
                    <button
                      type="button"
                      disabled={flashing || submitting}
                      onClick={handleShutter}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/25 active:scale-95 transition"
                    >
                      <Camera className="w-5 h-5 text-slate-950" />
                      <span>AMBIL FOTO SEKARANG</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/25 active:scale-95 transition"
                    >
                      <Camera className="w-5 h-5 text-slate-950" />
                      <span>BUKA KAMERA</span>
                    </button>
                  )}

                  {/* Rotate Camera Button (Front / Back) */}
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    disabled={flashing || submitting || cameraLoading}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center space-x-2 transition shadow-sm"
                  >
                    <SwitchCamera className="w-4 h-4 text-emerald-400" />
                    <span>{facingMode === 'user' ? 'Putar ke Kamera Belakang' : 'Putar ke Kamera Depan'}</span>
                  </button>

                  {/* Alternative button: Native Camera Capture */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 text-slate-400 hover:text-white text-[11px] font-medium flex items-center justify-center space-x-1.5 transition"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Gunakan Kamera Bawaan HP</span>
                  </button>

                  {/* Hidden Native File Input with dynamic capture */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture={facingMode === 'user' ? 'user' : 'environment'}
                    onChange={handleNativeFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
