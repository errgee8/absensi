import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Coffee } from 'lucide-react';
import confetti from 'canvas-confetti';
import { captureAndWatermark } from '../../utils/watermark';
import { checkIn, checkOut, startBreak, endBreak } from '../../utils/api';
import { isWithinGeofence } from '../../utils/distance';

export default function KioskCameraModal({
  staff,
  activeShift,
  actionType = 'checkin', // 'checkin' | 'checkout' | 'break_start' | 'break_end'
  venueSettings,
  onCompleteAndAutoLogout,
  onClose
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
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

  // Start front camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      let msg = 'Kamera tidak dapat diakses.';
      if (err.name === 'NotAllowedError') msg = 'Izin kamera ditolak. Berikan izin kamera di browser.';
      if (err.name === 'NotFoundError') msg = 'Perangkat kamera tidak ditemukan.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
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

  // Shutter capture & submit
  const handleShutter = async () => {
    if (!videoRef.current || flashing || submitting) return;

    setFlashing(true);

    try {
      const venueLat = venueSettings?.venue_lat ?? -8.6885;
      const venueLng = venueSettings?.venue_lng ?? 115.1558;
      const radius = venueSettings?.geofence_radius ?? 150;

      const currentLat = userLocation?.lat ?? venueLat;
      const currentLng = userLocation?.lng ?? venueLng;

      const geoCheck = isWithinGeofence(currentLat, currentLng, venueLat, venueLng, radius);

      // Burn hardcoded pixel watermark
      const watermarkedBase64 = await captureAndWatermark({
        videoElement: videoRef.current,
        staffName: staff.name,
        lat: currentLat,
        lng: currentLng,
        status: config.watermarkStatus,
        isGpsValid: geoCheck.inside,
        maxWidth: 960,
        quality: 0.68
      });

      setCapturedPreview(watermarkedBase64);
      stopCamera();
      setSubmitting(true);

      const payload = {
        staffId: staff.id,
        pin: staff.pin,
        shiftId: activeShift?.id,
        lat: currentLat,
        lng: currentLng,
        accuracy: userLocation?.accuracy ?? 10,
        photoBase64: watermarkedBase64,
        timestamp: new Date().toISOString()
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
      }, 1500);

    } catch (err) {
      setFlashing(false);
      setSubmitting(false);
      setSubmitError(err.message || 'Gagal memproses absensi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div>
            <h3 className="text-sm font-extrabold text-white">{config.title}</h3>
            <p className="text-[11px] text-slate-400">{staff.name}</p>
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
                  Keluar otomatis untuk karyawan berikutnya dalam:
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
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Selesai Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {flashing && (
                  <div className="absolute inset-0 bg-white z-30 animate-ping opacity-75 pointer-events-none" />
                )}

                {capturedPreview ? (
                  <img
                    src={capturedPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-44 h-52 border-2 border-dashed border-emerald-400/60 rounded-3xl flex items-end justify-center pb-2">
                        <span className="text-[10px] bg-slate-900/80 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                          Arahkan Wajah & Seragam
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    {cameraError ? (
                      <div className="text-xs text-rose-400">{cameraError}</div>
                    ) : (
                      <div className="text-xs text-slate-400 flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Membuka kamera...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {submitError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{submitError}</span>
                </div>
              )}

              {cameraActive && !flashing && !submitting && (
                <button
                  type="button"
                  onClick={handleShutter}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 active:scale-95 transition"
                >
                  <Camera className="w-5 h-5" />
                  <span>TEKAN UNTUK AMBIL FOTO</span>
                </button>
              )}

              {submitting && (
                <div className="py-3 text-center text-xs font-bold text-emerald-400 flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi GPS & Mengunggah...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
