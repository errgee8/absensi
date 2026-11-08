import React, { useState, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Camera, RefreshCw, Send, Loader2, Sparkles, Building2, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ROUTINE_TASKS, submitRestroomInspection } from '../../utils/toiletService';

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
      alert('Tidak dapat mengakses kamera: ' + err.message);
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

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhotoBase64(dataUrl);
    stopCamera();
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
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg('Gagal mengirim checklist: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-wider font-extrabold bg-white/20 px-2 py-0.5 rounded-full">
                Checklist Kebersihan Toilet
              </span>
            </div>
            <h3 className="text-lg font-black text-white mt-1">{location.name}</h3>
            <p className="text-xs text-blue-100 flex items-center space-x-1.5 mt-0.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>{location.building} • {location.floor}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Staff Identity Bar */}
        <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs px-5">
          <div className="flex items-center space-x-2 text-slate-700">
            <User className="w-4 h-4 text-blue-600" />
            <span>Petugas Inspeksi: <strong className="text-blue-900">{staff.name}</strong></span>
          </div>
          <span className="text-[11px] font-mono text-blue-600 font-bold bg-white px-2 py-0.5 rounded-md border border-blue-200">
            Token: {location.qr_token}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Checklist Tasks List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-800 font-bold text-xs uppercase tracking-wider">
                Daftar Pengecekan Standar ({applicableTasks.length} Poin)
              </label>
              <span className="text-[10px] text-slate-500">Klik item untuk ubah status</span>
            </div>

            <div className="space-y-2">
              {applicableTasks.map((task) => {
                const isPass = taskStatuses[task.id] === 'pass';
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                      isPass
                        ? 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/60'
                        : 'bg-amber-50 border-amber-300 hover:bg-amber-100/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {isPass ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span className={`font-bold ${isPass ? 'text-slate-800' : 'text-amber-900'}`}>
                        {task.title}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider ${
                        isPass
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-amber-500 text-white shadow-sm'
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
            <label className="text-slate-800 font-bold text-xs uppercase tracking-wider block mb-2">
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
                    className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80"
                    title="Putar Kamera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={takePhoto}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Jepret Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : photoBase64 ? (
              <div className="space-y-2">
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img
                    src={photoBase64}
                    alt="Toilet Evidence"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">
                    ✓ Foto Siap Dikirim
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 flex items-center justify-center space-x-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Ambil Ulang Foto</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startCamera('environment')}
                className="w-full py-3.5 px-4 bg-slate-50 hover:bg-blue-50 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center space-y-1.5 text-slate-600 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="font-bold text-xs text-slate-800">Buka Kamera & Ambil Foto Toilet</span>
                <span className="text-[10px] text-slate-400">Bukti kebersihan visual untuk laporan manajemen</span>
              </button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-800 font-bold text-xs uppercase tracking-wider block mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kran wastafel kiri agak longgar, sabun sisa 1/4 botol..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-2 border-t border-slate-200 flex space-x-2">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-2 py-3 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-blue-600/25 active:scale-[0.98] transition flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim Laporan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
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
