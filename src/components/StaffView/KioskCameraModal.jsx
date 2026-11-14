import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Loader2, SwitchCamera, Upload, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { captureAndWatermark, watermarkFile } from '../../utils/watermark';
import { checkIn, checkOut, startBreak, endBreak } from '../../utils/api';
import { uploadAttendancePhotoClient } from '../../utils/supabaseClient';
import { isWithinGeofence, calculateDistanceMeters } from '../../utils/distance';
import { getAppNow } from '../../utils/time';
import { enqueueOfflineAction } from '../../utils/offlineQueue';
import DevicePermissionModal from './DevicePermissionModal';

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
  const [faceMismatchAlert, setFaceMismatchAlert] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const [geoState, setGeoState] = useState({
    status: 'acquiring', // 'acquiring' | 'locked' | 'imprecise' | 'denied' | 'unavailable'
    lat: null,
    lng: null,
    accuracy: null,
    distance: null,
    isInside: true,
    errorMessage: null
  });
  const watchIdRef = useRef(null);

  // Late checkin excuse states
  const [lateReason, setLateReason] = useState('');
  const [latePhotoBase64, setLatePhotoBase64] = useState(null);
  const latePhotoInputRef = useRef(null);

  const schedStart = confirmedShift?.start_time || staff?.shift_start || '13:00';
  const isCheckinLate = React.useMemo(() => {
    if (actionType !== 'checkin') return false;
    if (staff?.division === 'Management' || schedStart === '00:00' || schedStart === 'FLEXIBLE') return false;
    try {
      const now = getAppNow();
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(now);
      const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      const curTotalM = (h * 60) + m;

      const [sH, sM] = schedStart.split(':').map(Number);
      const schedTotalM = (sH * 60) + sM;

      let diffMinutes = curTotalM - schedTotalM;
      if (diffMinutes < -720) diffMinutes += 1440;
      if (diffMinutes > 720) diffMinutes -= 1440;

      return diffMinutes > 10;
    } catch {
      return false;
    }
  }, [actionType, schedStart, staff?.division]);

  // High-precision GPS acquisition with continuous refinement and permission check
  const requestGpsPosition = () => {
    if (!navigator.geolocation) {
      setGeoState((prev) => ({
        ...prev,
        status: 'unavailable',
        errorMessage: 'Browser tidak mendukung pendeteksi lokasi GPS.'
      }));
      return;
    }

    setGeoState((prev) => ({ ...prev, status: 'acquiring', errorMessage: null }));

    const venueLat = venueSettings?.venue_lat ?? -8.780981;
    const venueLng = venueSettings?.venue_lng ?? 115.176863;
    const geofenceRadius = venueSettings?.geofence_radius ?? 150;

    const onSuccess = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy);
      const distance = calculateDistanceMeters(lat, lng, venueLat, venueLng);
      const isImprecise = accuracy > 300; // Coarse cellular location like Hendy's 2000m
      const isInside = distance <= geofenceRadius;
      const status = isImprecise ? 'imprecise' : 'locked';

      setUserLocation({ lat, lng, accuracy });
      setGeoState({
        status,
        lat,
        lng,
        accuracy,
        distance,
        isInside,
        errorMessage: null
      });
    };

    const onError = (err) => {
      console.warn('Geolocation error:', err);
      let msg = 'Gagal mendeteksi lokasi.';
      let status = 'unavailable';
      if (err.code === 1) { // PERMISSION_DENIED
        status = 'denied';
        msg = 'Izin lokasi (GPS) ditolak oleh browser HP Anda.';
      } else if (err.code === 2) {
        msg = 'Sinyal lokasi tidak tersedia. Pastikan GPS ponsel Anda aktif.';
      } else if (err.code === 3) {
        msg = 'Waktu pencarian sinyal GPS habis.';
      }
      setGeoState((prev) => ({ ...prev, status, errorMessage: msg }));
    };

    // 1. One-shot immediate high-accuracy request
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    });

    // 2. Continuous watch to actively refine satellite GPS lock
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000
    });
  };

  useEffect(() => {
    requestGpsPosition();
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
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

  // Helper to submit finalized image
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

      // Offload storage upload directly to client Supabase Storage when possible (reduces server function memory & duration)
      let photoRef = watermarkedBase64;
      try {
        const clientUploadedUrl = await uploadAttendancePhotoClient(watermarkedBase64, `selfie_${staff.id}`);
        if (clientUploadedUrl) {
          photoRef = clientUploadedUrl;
        }
      } catch {}

      let latePhotoRef = isCheckinLate ? latePhotoBase64 : null;
      if (latePhotoRef && latePhotoRef.startsWith('data:image')) {
        try {
          const clientLateUrl = await uploadAttendancePhotoClient(latePhotoRef, `late_${staff.id}`);
          if (clientLateUrl) {
            latePhotoRef = clientLateUrl;
          }
        } catch {}
      }

      const payload = {
        staffId: staff.id,
        pin: staff.pin,
        shiftId: activeShift?.id,
        lat: currentLat,
        lng: currentLng,
        accuracy: userLocation?.accuracy ?? 10,
        photoBase64: photoRef,
        timestamp: new Date().toISOString(),
        confirmedShift: confirmedShift || null,
        lateReason: isCheckinLate ? lateReason.trim() : null,
        latePhotoBase64: latePhotoRef,
        moodEmoji: staff?.mood_emoji || null
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

      const isMismatch = res?.faceRecog?.status === 'MISMATCH' || (res?.flags || []).includes('FLAG_FACE_MISMATCH');
      if (isMismatch) {
        setFaceMismatchAlert(true);
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

        // 5-second auto logout timer for face mismatch notice, otherwise 3-second
        let count = isMismatch ? 5 : 3;
        setCountdown(count);
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
      // Check if user is offline or fetch failed due to connectivity drop
      if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        try {
          const endpointUrl = `/api/${actionType === 'checkout' ? 'checkout' : actionType.startsWith('break') ? (actionType === 'break_start' ? 'break/start' : 'break/end') : 'checkin'}`;
          await enqueueOfflineAction({
            url: endpointUrl,
            method: 'POST',
            payload,
            staffName: staff.name,
            actionType: config.watermarkStatus
          });

          setSuccessMessage('⚠️ Anda Sedang Offline. Absensi telah diamankan di memori HP dan otomatis terkirim begitu internet pulih!');
          setFlashing(false);
          setSubmitting(false);
          setSubmitSuccess(true);

          confetti({
            particleCount: 50,
            spread: 55,
            origin: { y: 0.6 }
          });

          let count = 3;
          const timer = setInterval(() => {
            count -= 1;
            setCountdown(count);
            if (count <= 0) {
              clearInterval(timer);
              onCompleteAndAutoLogout();
            }
          }, 1000);
          return;
        } catch (offlineErr) {
          console.error('Offline enqueue error:', offlineErr);
        }
      }

      setFlashing(false);
      setSubmitting(false);
      setSubmitError(err.message || 'Gagal memproses absensi.');
    }
  };

  // 1. Shutter capture via live WebRTC video
  const handleShutter = async () => {
    if (!videoRef.current || flashing || submitting) return;

    if (geoState.status === 'denied') {
      setSubmitError('Izin lokasi (GPS) ditolak oleh browser HP. Aktifkan izin lokasi pada browser untuk melanjutkan.');
      return;
    }

    if (isCheckinLate && !lateReason.trim()) {
      setSubmitError('Wajib mengisi alasan keterlambatan sebelum mengambil foto check-in.');
      return;
    }

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

    if (geoState.status === 'denied') {
      setSubmitError('Izin lokasi (GPS) ditolak oleh browser HP. Aktifkan izin lokasi pada browser untuk melanjutkan.');
      return;
    }

    if (isCheckinLate && !lateReason.trim()) {
      setSubmitError('Wajib mengisi alasan keterlambatan sebelum memilih foto check-in.');
      return;
    }

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
            <div className="py-6 text-center space-y-4">
              {faceMismatchAlert ? (
                <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border-2 border-amber-500/40">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-500/40 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}

              <div>
                <h4 className="text-lg font-black text-white">
                  {faceMismatchAlert ? 'Absensi Masuk Tercatat' : 'Absensi Berhasil Dicatat!'}
                </h4>
                <p className="text-xs text-slate-300 mt-1">{successMessage}</p>
              </div>

              {/* Face Mismatch Staff Notice */}
              {faceMismatchAlert && (
                <div className="bg-amber-950/70 border border-amber-500/40 rounded-2xl p-3 text-left space-y-1.5 shadow-md">
                  <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Peringatan: Wajah Tidak Cocok</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed font-medium">
                    Sistem mendeteksi foto selfie ini tidak sesuai dengan wajah Anda yang terdaftar. Absensi tetap masuk ke sistem, namun <strong>status ketidakcocokan wajah telah dilaporkan ke Manajer</strong> untuk ditinjau.
                  </p>
                </div>
              )}

              {/* Countdown Progress Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs">
                <span className="text-slate-400 block mb-1 font-medium">
                  Kembali ke layar PIN dalam:
                </span>
                <span className={`text-2xl font-black font-mono ${faceMismatchAlert ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {countdown} detik
                </span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear ${faceMismatchAlert ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${(countdown / (faceMismatchAlert ? 5 : 3)) * 100}%` }}
                  />
                </div>
              </div>

              <button
                onClick={onCompleteAndAutoLogout}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Selesai Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* GPS Status Banner */}
              <div className="animate-fade-in">
                {geoState.status === 'acquiring' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/60 border border-blue-800 text-[11px] text-blue-200">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                      <span>Mencari titik GPS satelit akurasi tinggi...</span>
                    </div>
                  </div>
                )}

                {geoState.status === 'locked' && geoState.isInside && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-[11px] text-emerald-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="font-bold">
                        GPS Terkunci: Di dalam venue ({geoState.distance}m • akurasi ±{geoState.accuracy}m)
                      </span>
                    </div>
                  </div>
                )}

                {geoState.status === 'locked' && !geoState.isInside && (
                  <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-[11px] text-rose-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-rose-300">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Di Luar Geofence ({geoState.distance}m dari outlet)</span>
                      </div>
                      <button
                        type="button"
                        onClick={requestGpsPosition}
                        className="px-2 py-0.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center space-x-1 transition"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Refresh GPS</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-rose-300/90 leading-tight">
                      Batas radius adalah {venueSettings?.geofence_radius || 150}m. Pastikan Anda berada di area outlet.
                    </p>
                  </div>
                )}

                {geoState.status === 'imprecise' && (
                  <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-800 text-[11px] text-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Akurasi GPS Rendah (±{geoState.accuracy}m — BTS)</span>
                      </div>
                      <button
                        type="button"
                        onClick={requestGpsPosition}
                        className="px-2 py-0.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-bold flex items-center space-x-1 transition"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Kunci Ulang</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-200/90 leading-tight">
                      HP Anda menggunakan perkiraan sinyal BTS seluler. Mohon aktifkan izin <strong>"Lokasi Tepat (Precise Location)"</strong> di browser Chrome HP Anda agar tidak terdeteksi di luar area.
                    </p>
                  </div>
                )}

                {geoState.status === 'denied' && (
                  <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-700 text-[11px] text-rose-200 space-y-2">
                    <div className="flex items-center space-x-1.5 font-bold text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Izin Lokasi (GPS) Ditolak!</span>
                    </div>
                    <p className="text-[10px] text-rose-200/90 leading-tight">
                      Browser HP belum mengizinkan akses GPS. Klik tombol di bawah untuk memunculkan notifikasi izin di HP Anda:
                    </p>
                    <button
                      type="button"
                      onClick={() => setPermModalOpen(true)}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-500/20 transition cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Munculkan Izin Lokasi di HP</span>
                    </button>
                    <button
                      type="button"
                      onClick={requestGpsPosition}
                      className="w-full py-1.5 rounded-lg bg-rose-800/80 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Coba Deteksi Ulang Lokasi</span>
                    </button>
                  </div>
                )}

                {geoState.status === 'unavailable' && (
                  <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-800 text-[11px] text-amber-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{geoState.errorMessage || 'Sinyal GPS Tidak Tersedia'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={requestGpsPosition}
                        className="px-2 py-0.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-bold flex items-center space-x-1 transition"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Coba Lagi</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

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

                    {/* Biometric Face Recognition Oval Guide Overlay */}
                    {cameraActive && !capturedPreview && !submitting && facingMode === 'user' && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                        <div className="relative w-[68%] h-[82%] rounded-[50%] border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.30)] flex flex-col items-center justify-between p-3">
                          {/* Top biometric corner badge */}
                          <div className="w-full flex justify-between items-center text-[9px] font-mono font-bold text-emerald-400 px-2.5 bg-slate-950/70 rounded-full py-0.5 mt-1 border border-emerald-500/20">
                            <span>[ FACE BIOMETRIC ]</span>
                            <span className="flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                              <span>LIVE SCAN</span>
                            </span>
                          </div>

                          {/* Center scan line pulse */}
                          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent animate-pulse" />

                          {/* Bottom alignment instruction text */}
                          <span className="text-[10px] font-black text-emerald-300 bg-slate-950/85 px-3 py-0.5 rounded-full border border-emerald-500/40 shadow-lg mb-1">
                            Posisikan Wajah Di Sini
                          </span>
                        </div>
                      </div>
                    )}

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
                      <div className="p-4 text-center space-y-2.5 max-w-[260px]">
                        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => setPermModalOpen(true)}
                          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow cursor-pointer"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Munculkan Izin Kamera di HP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow cursor-pointer"
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

              {/* Late check-in justification input */}
              {isCheckinLate && !capturedPreview && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl space-y-2 text-left animate-fade-in">
                  <div className="flex items-center space-x-1.5 text-amber-300 font-black text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Terdeteksi Terlambat (&gt;10m dari jadwal {schedStart})</span>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 font-bold mb-1">
                      Alasan Terlambat: <span className="text-amber-400 font-black">*Wajib diisi</span>
                    </label>
                    <textarea
                      rows={2}
                      value={lateReason}
                      onChange={(e) => setLateReason(e.target.value)}
                      placeholder="Tulis alasan keterlambatan untuk di-review management..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Optional Proof Photo for Late */}
                  <div>
                    <label className="block text-[11px] text-slate-400 font-bold mb-1">
                      Foto Bukti Pendukung (Opsional):
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        ref={latePhotoInputRef}
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const stamped = await watermarkFile(file, {
                                staffName: staff?.name || 'Staff',
                                status: 'Bukti Keterlambatan Check-In',
                                locationName: staff?.venue || '',
                                lat: userLocation?.lat,
                                lng: userLocation?.lng,
                                maxWidth: 1080,
                                quality: 0.8
                              });
                              setLatePhotoBase64(stamped);
                            } catch (err) {
                              console.error('Failed to stamp late photo:', err);
                              const reader = new FileReader();
                              reader.onload = () => setLatePhotoBase64(reader.result);
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => latePhotoInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-[11px] font-bold flex items-center space-x-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>{latePhotoBase64 ? 'Ganti Foto Bukti' : 'Lampirkan Foto Bukti'}</span>
                      </button>

                      {latePhotoBase64 && (
                        <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-bold">
                          <span>Foto terlampir ✓</span>
                          <button
                            type="button"
                            onClick={() => setLatePhotoBase64(null)}
                            className="text-rose-400 hover:text-rose-300 p-0.5"
                            title="Hapus foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
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

      {/* Device Permission Helper Modal */}
      <DevicePermissionModal
        isOpen={permModalOpen}
        onClose={() => setPermModalOpen(false)}
        onPermissionsGranted={() => {
          requestGpsPosition();
          startCamera();
        }}
      />
    </div>
  );
}
