import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, Smartphone, ShieldAlert } from 'lucide-react';
import { captureAndWatermark, watermarkFile } from '../../utils/watermark';
import { showToast } from '../Common/Toast';

export default function SelfieCamera({
  staffName,
  lat,
  lng,
  status = 'Shift Start',
  capturedPhoto,
  setCapturedPhoto
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const nativeFileInputRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Start live webcam feed (facingMode: 'user') with fallback
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera langsung. Gunakan tombol Kamera HP Langsung.');
      }

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        v.onloadedmetadata = () => {
          v.play().catch((e) => console.warn('Video metadata play note:', e));
        };
        try {
          await v.play();
        } catch (playErr) {
          console.warn('Video play note:', playErr);
        }
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      let msg = err?.message || 'Kamera tidak dapat diakses.';
      if (err.name === 'NotAllowedError') msg = 'Izin kamera ditolak. Gunakan tombol "Buka Kamera HP Langsung" di bawah.';
      if (err.name === 'NotFoundError') msg = 'Kamera tidak terdeteksi. Gunakan tombol "Buka Kamera HP Langsung" di bawah.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Auto start camera on mount if no photo is captured yet
  useEffect(() => {
    if (!capturedPhoto) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [capturedPhoto]);

  // Snap photo & burn watermark
  const handleSnap = async () => {
    if (!videoRef.current || !videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      showToast('Kamera sedang memuat tampilan. Tunggu 1 detik lalu coba lagi.', 'error');
      return;
    }
    setProcessing(true);
    try {
      const watermarkedJpeg = await captureAndWatermark({
        videoElement: videoRef.current,
        staffName,
        lat,
        lng,
        status,
        maxWidth: 720,
        quality: 0.65
      });

      setCapturedPhoto(watermarkedJpeg);
      stopCamera();
    } catch (err) {
      console.error('Watermarking failed:', err);
      showToast('Gagal memproses foto: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // Fallback native phone camera capture (works reliably on all Android/iOS browsers)
  const handleNativeFileCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const watermarkedJpeg = await watermarkFile(file, {
        staffName,
        lat,
        lng,
        status,
        maxWidth: 720,
        quality: 0.65
      });
      setCapturedPhoto(watermarkedJpeg);
      stopCamera();
    } catch (err) {
      console.error('Native camera watermark error:', err);
      showToast('Gagal memproses foto dari kamera HP: ' + err.message, 'error');
    } finally {
      setProcessing(false);
      if (nativeFileInputRef.current) nativeFileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live Biometric Selfie Verification
            </h4>
            <p className="text-[11px] text-slate-400">
              Live camera only • Hardcoded tamper-proof watermark burned on canvas
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Anti-Spoof
        </span>
      </div>

      {/* Camera Viewfinder or Captured Preview */}
      <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        {/* Always mounted video element for immediate srcObject binding */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-200 ${
            !capturedPhoto && cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {capturedPhoto ? (
          // Captured and Watermarked Review
          <div className="relative w-full h-full z-10">
            <img
              src={capturedPhoto}
              alt="Live Staff Check-in Capture"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 bg-emerald-500/90 text-slate-950 text-xs font-bold px-2 py-1 rounded-md flex items-center space-x-1 shadow-md">
              <Check className="w-3.5 h-3.5" />
              <span>Watermark Applied</span>
            </div>
          </div>
        ) : cameraActive ? (
          // Live Video Overlay Guides
          <div className="relative w-full h-full z-10 pointer-events-none">
            {/* Target Face Guide Box */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-56 border-2 border-dashed border-emerald-400/50 rounded-3xl flex flex-col items-center justify-end pb-3">
                <span className="text-[10px] bg-slate-900/70 text-emerald-400 px-2 py-0.5 rounded font-medium">
                  Center Face & Uniform
                </span>
              </div>
            </div>

            {/* Live Watermark Preview Pill */}
            <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/80 text-[10px] font-mono text-slate-300 truncate">
              Preview: [{staffName || 'Staff'}] | [WITA Time] | [{lat ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'GPS'}] | [{status}]
            </div>
          </div>
        ) : (
          // Camera Inactive / Permission Prompt
          <div className="relative z-10 text-center p-6 flex flex-col items-center">
            {cameraError ? (
              <>
                <ShieldAlert className="w-10 h-10 text-rose-400 mb-2" />
                <p className="text-xs text-rose-300 mb-3">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium border border-slate-700 transition cursor-pointer"
                >
                  Retry Camera
                </button>
              </>
            ) : (
              <>
                <Camera className="w-10 h-10 text-slate-500 mb-2" />
                <p className="text-xs text-slate-400 mb-3">Camera is currently paused or inactive</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  Start Camera Feed
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden Native Phone Camera Input Fallback */}
      <input
        ref={nativeFileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleNativeFileCapture}
        className="hidden"
      />

      {/* Bottom Action Controls */}
      <div className="mt-3 space-y-2">
        {capturedPhoto ? (
          <div className="flex w-full space-x-2">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake Photo</span>
            </button>
            <div className="flex items-center text-xs font-semibold text-emerald-400 px-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Check className="w-4 h-4 mr-1" /> Ready
            </div>
          </div>
        ) : (
          <>
            {cameraActive && (
              <button
                type="button"
                onClick={handleSnap}
                disabled={processing}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold rounded-xl text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition active:scale-[0.98] cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{processing ? 'Memproses...' : `Ambil Foto (${status})`}</span>
              </button>
            )}
            <button
              type="button"
              disabled={processing}
              onClick={() => nativeFileInputRef.current?.click()}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>{processing ? 'Memproses Foto...' : 'Buka Kamera HP Langsung (Jika Kamera Gelap)'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
