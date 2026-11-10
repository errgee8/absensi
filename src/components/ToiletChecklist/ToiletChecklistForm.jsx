import React, { useState, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Camera, RefreshCw, Send, Loader2, Sparkles, Building2, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ROUTINE_TASKS, submitRestroomInspection } from '../../utils/toiletService';
import { stampPhotoWithAppTime } from '../../utils/watermark';
import { showToast } from '../Common/Toast';

export default function ToiletChecklistForm({ location, staff, onClose, onSuccess }) {
  const applicableTasks = ROUTINE_TASKS.filter(
    (t) => t.applicable_gender === 'all' || t.applicable_gender === location.gender
  );

  // Default all tasks to 'pass'
  const [taskStatuses, setTaskStatuses] = useState(
    applicableTasks.reduce((acc, t) => ({ ...acc, [t.id]: 'pass' }), {})
  );

  // Photo capture state
  const [cameraActive, setCameraActive] = useState(false);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // back camera default for toilet photo
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const toggleTask = (taskId) => {
    setTaskStatuses((prev) => ({
      ...prev,
      [taskId]: prev[taskId] === 'pass' ? 'fail' : 'pass'
    }));
  };

  const startCamera = async (mode = facingMode) => {
    setCameraActive(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera error:', err);
      showToast('Tidak dapat mengakses kamera: ' + err.message, 'error');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const watermarked = await stampPhotoWithAppTime({
        source: videoRef.current,
        staffName: staff?.name || 'Staff CS',
        status: 'Inspeksi Kebersihan Toilet',
        locationName: location?.name || 'Toilet',
        maxWidth: 1280,
        quality: 0.8
      });
      setPhotoBase64(watermarked);
      stopCamera();
    } catch (err) {
      console.error('Failed to stamp toilet photo:', err);
      // Fallback capture
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setPhotoBase64(canvas.toDataURL('image/jpeg', 0.75));
      stopCamera();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await submitRestroomInspection({
        location,
        staff,
        taskStatuses,
        photoBase64,
        notes
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      onSuccess();
    } catch (err) {
      console.error('Submit inspection failed:', err);
      setErrorMsg(err.message || 'Gagal menyimpan checklist toilet. Coba periksa koneksi internet.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header - Vivid Royal Blue */}
        <div className="p-4 sm:p-5 bg-blue-600 text-white flex items-center justify-between">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
              Checklist Kebersihan Toilet
            </span>
            <h3 className="text-xl font-black text-white mt-1">{location.name}</h3>
            <p className="text-xs text-blue-100 flex items-center space-x-1.5 mt-0.5 font-bold">
              <Building2 className="w-4 h-4 stroke-[2.5]" />
              <span>{location.building} • {location.floor}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Staff Identity Bar - High Contrast */}
        <div className="p-3 bg-blue-50 border-b-2 border-blue-200 flex items-center justify-between text-xs px-5">
          <div className="flex items-center space-x-2 text-slate-800 font-extrabold">
            <User className="w-4 h-4 text-blue-700 stroke-[2.5]" />
            <span>Petugas Inspeksi: <strong className="text-blue-900 font-black">{staff.name}</strong></span>
          </div>
          <span className="text-xs font-mono text-blue-950 font-black bg-white px-2.5 py-1 rounded-lg border-2 border-blue-300">
            {location.qr_token}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-xl text-xs flex items-center space-x-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 stroke-[2.5]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Checklist Tasks List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-950 font-black text-xs uppercase tracking-wider">
                Daftar Pengecekan Standar ({applicableTasks.length} Poin)
              </label>
              <span className="text-[11px] text-slate-700 font-bold">Klik item untuk ubah status</span>
            </div>

            <div className="space-y-2">
              {applicableTasks.map((task) => {
                const isPass = taskStatuses[task.id] === 'pass';
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between select-none ${
                      isPass
                        ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/70 shadow-sm'
                        : 'bg-amber-50 border-amber-400 hover:bg-amber-100/70 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {isPass ? (
                        <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0 stroke-[2.5]" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 stroke-[2.5]" />
                      )}
                      <span className={`text-sm font-black ${isPass ? 'text-slate-950' : 'text-amber-950'}`}>
                        {task.title}
                      </span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm ${
                        isPass
                          ? 'bg-emerald-700 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {isPass ? 'Bersih / OK' : 'Perlu Perhatian'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Photo Capture Section */}
          <div>
            <label className="text-slate-950 font-black text-xs uppercase tracking-wider block mb-2">
              Foto Bukti Kondisi Toilet (Langsung dari Kamera)
            </label>

            {cameraActive ? (
              <div className="space-y-2">
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-md">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="absolute top-2 right-2 p-2 rounded-xl bg-black/70 text-white hover:bg-black/90 shadow"
                    title="Putar Kamera"
                  >
                    <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={takePhoto}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md shadow-blue-600/30 flex items-center justify-center space-x-2"
                  >
                    <Camera className="w-4 h-4 stroke-[2.5]" />
                    <span>Jepret Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-black text-xs"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : photoBase64 ? (
              <div className="space-y-2">
                <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-slate-300 shadow-sm">
                  <img
                    src={photoBase64}
                    alt="Toilet Evidence"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-black">
                    ✓ Foto Siap Dikirim
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-black text-xs border-2 border-slate-300 flex items-center justify-center space-x-1.5 transition"
                >
                  <Camera className="w-4 h-4 stroke-[2.5]" />
                  <span>Ambil Ulang Foto</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startCamera('environment')}
                className="w-full py-4 px-4 bg-white hover:bg-blue-50 border-2 border-dashed border-slate-400 hover:border-blue-600 rounded-2xl flex flex-col items-center justify-center space-y-1.5 text-slate-800 transition"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Camera className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="font-black text-sm text-slate-950">Buka Kamera &amp; Ambil Foto Toilet</span>
                <span className="text-xs text-slate-600 font-bold">Bukti kebersihan visual untuk laporan manajemen</span>
              </button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-950 font-black text-xs uppercase tracking-wider block mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kran wastafel kiri agak longgar, sabun sisa 1/4 botol..."
              className="w-full p-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-slate-950 font-bold focus:outline-none focus:border-blue-600 text-xs"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-2 border-t-2 border-slate-200 flex space-x-2">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-600/30 active:scale-[0.98] transition flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim Laporan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 stroke-[2.5]" />
                  <span>Kirim Checklist Toilet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
