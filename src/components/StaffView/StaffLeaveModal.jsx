import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  Camera,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Upload,
  User,
  Info,
  CalendarCheck2,
  FileText,
  HeartPulse,
  Palmtree,
  MessageSquare
} from 'lucide-react';
import { getLeaveRequests, getStaffLeaveBalance, submitLeaveRequest } from '../../utils/api';
import { getOperationalDateYMD, formatWitaDateOnly } from '../../utils/time';
import { stampPhotoWithAppTime } from '../../utils/watermark';

export default function StaffLeaveModal({ isOpen, onClose, staff, onRefreshShifts, onMarkViewed, activeShift, initialCategory }) {
  const [activeTab, setActiveTab] = useState('HISTORY'); // 'HISTORY' | 'CUTI' | 'IZIN'
  const [requests, setRequests] = useState([]);
  const [balance, setBalance] = useState({ maxQuota: 12, usedDays: 0, remainingDays: 12 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State: Cuti
  const [cutiStart, setCutiStart] = useState('');
  const [cutiEnd, setCutiEnd] = useState('');
  const [cutiReason, setCutiReason] = useState('');
  const [cutiSelfie, setCutiSelfie] = useState(null);

  // Form State: Izin Biasa / Sakit / Darurat / Pulang Awal
  const [izinCategory, setIzinCategory] = useState('IZIN_BIASA'); // 'IZIN_BIASA' | 'SAKIT' | 'IZIN_DARURAT' | 'IZIN_PULANG_AWAL'
  const [izinStart, setIzinStart] = useState('');
  const [izinEnd, setIzinEnd] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [izinReason, setIzinReason] = useState('');
  const [izinSelfie, setIzinSelfie] = useState(null);
  const [izinDocPhoto, setIzinDocPhoto] = useState(null);

  // Camera State for Selfie
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraTarget, setCameraTarget] = useState('CUTI'); // 'CUTI' | 'IZIN'
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const todayStr = getOperationalDateYMD(new Date());

  // Calculate Minimum Cuti Date (H-14: Today + 14 days)
  const minCutiDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return getOperationalDateYMD(d);
  }, []);

  const loadStaffData = async () => {
    if (!staff?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [reqs, bal] = await Promise.all([
        getLeaveRequests({ staffId: staff.id }),
        getStaffLeaveBalance(staff.id)
      ]);
      setRequests(reqs || []);
      if (bal) setBalance(bal);
    } catch (e) {
      console.error('Failed to load staff leave data:', e);
      setError(e.message || 'Gagal memuat data cuti/izin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && staff) {
      loadStaffData();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, staff]);

  useEffect(() => {
    if (isOpen) {
      if (initialCategory === 'IZIN_PULANG_AWAL') {
        setActiveTab('IZIN');
        setIzinCategory('IZIN_PULANG_AWAL');
        setIzinStart(todayStr);
        setIzinEnd(todayStr);
        try {
          const nowWita = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Makassar',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }).format(new Date()).replace('.', ':');
          setDepartureTime(nowWita);
        } catch {
          setDepartureTime('15:00');
        }
      }
    }
  }, [isOpen, initialCategory, todayStr]);

  useEffect(() => {
    if (isOpen && activeTab === 'HISTORY' && staff?.id) {
      localStorage.setItem('last_viewed_leave_' + staff.id, new Date().toISOString());
      if (onMarkViewed) onMarkViewed();
    }
  }, [isOpen, activeTab, staff]);

  // Camera Controls
  const startCamera = async (target = 'CUTI') => {
    setCameraTarget(target);
    setCameraError(null);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Gagal mengakses kamera depan: ' + (err.message || 'Izin ditolak'));
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

  const captureSelfie = async () => {
    if (!videoRef.current) return;
    try {
      const isCuti = cameraTarget === 'CUTI';
      const statusText = isCuti
        ? 'Selfie Pengajuan Cuti Tahunan'
        : izinCategory === 'IZIN_BIASA'
        ? 'Selfie Permohonan Izin'
        : izinCategory === 'IZIN_PULANG_AWAL'
        ? 'Selfie Izin Pulang di Tengah Shift'
        : izinCategory === 'SAKIT'
        ? 'Selfie Izin Sakit'
        : 'Selfie Permohonan Izin';

      const stamped = await stampPhotoWithAppTime({
        source: videoRef.current,
        staffName: staff?.name || 'Staff',
        status: statusText,
        locationName: staff?.venue || '',
        maxWidth: 960,
        quality: 0.82
      });

      if (cameraTarget === 'IZIN') {
        setIzinSelfie(stamped);
      } else {
        setCutiSelfie(stamped);
      }
    } catch (err) {
      console.error('Failed to stamp selfie:', err);
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      if (cameraTarget === 'IZIN') {
        setIzinSelfie(base64);
      } else {
        setCutiSelfie(base64);
      }
    } finally {
      stopCamera();
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const stamped = await stampPhotoWithAppTime({
        source: file,
        staffName: staff?.name || 'Staff',
        status: 'Dokumen Pendukung Permohonan Izin',
        locationName: staff?.venue || '',
        maxWidth: 1280,
        quality: 0.82
      });
      setIzinDocPhoto(stamped);
    } catch (err) {
      console.error('Failed to stamp uploaded doc:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setIzinDocPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate requested days count
  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const s = new Date(`${start}T00:00:00Z`);
    const e = new Date(`${end}T00:00:00Z`);
    const diffTime = e.getTime() - s.getTime();
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Submit Cuti Form
  const handleSubmitCuti = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const days = calculateDays(cutiStart, cutiEnd);
    if (days <= 0) {
      setError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }
    if (days > balance.remainingDays) {
      setError(`Sisa kuota cuti tahun ini hanya ${balance.remainingDays} hari. Anda mengajukan ${days} hari.`);
      return;
    }
    if (!cutiSelfie) {
      setError('Foto selfie pengajuan wajib diambil untuk verifikasi biometrik.');
      return;
    }

    setLoading(true);
    try {
      const res = await submitLeaveRequest({
        staffId: staff.id,
        pin: staff.pin,
        type: 'CUTI',
        category: 'CUTI_TAHUNAN',
        startDate: cutiStart,
        endDate: cutiEnd,
        requestedDays: days,
        reason: cutiReason,
        photoBase64: cutiSelfie
      });

      setSuccessMsg(res.message || 'Pengajuan cuti berhasil dikirim ke management.');
      setCutiStart('');
      setCutiEnd('');
      setCutiReason('');
      setCutiSelfie(null);
      await loadStaffData();
      setActiveTab('HISTORY');
    } catch (err) {
      setError(err.message || 'Gagal mengirim pengajuan cuti.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Izin Form
  const handleSubmitIzin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const isPulangAwal = izinCategory === 'IZIN_PULANG_AWAL';
    let days = 1;
    let finalStart = izinStart;
    let finalEnd = izinEnd;

    if (isPulangAwal) {
      if (!departureTime) {
        setError('Jam rencana pulang wajib diisi.');
        return;
      }
      finalStart = todayStr;
      finalEnd = todayStr;
      days = 1;
    } else {
      days = calculateDays(izinStart, izinEnd);
      if (days <= 0) {
        setError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
        return;
      }
    }

    if (!izinSelfie) {
      setError('Foto selfie pemohon wajib diambil untuk verifikasi biometrik.');
      return;
    }

    setLoading(true);
    try {
      const res = await submitLeaveRequest({
        staffId: staff.id,
        pin: staff.pin,
        type: 'IZIN',
        category: izinCategory,
        startDate: finalStart,
        endDate: finalEnd,
        requestedDays: days,
        reason: izinReason,
        photoBase64: izinSelfie,
        documentBase64: izinDocPhoto || null,
        departureTime: isPulangAwal ? departureTime : null,
        activeShiftId: isPulangAwal ? (activeShift?.id || null) : null
      });

      setSuccessMsg(res.message || 'Permohonan izin berhasil dikirim ke management.');
      setIzinStart('');
      setIzinEnd('');
      setDepartureTime('');
      setIzinReason('');
      setIzinSelfie(null);
      setIzinDocPhoto(null);
      await loadStaffData();
      setActiveTab('HISTORY');
    } catch (err) {
      setError(err.message || 'Gagal mengirim permohonan izin.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-slate-900">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[92vh]">
        
        {/* Header - Staff Specific & High Contrast */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-lg shadow-inner">
              <Palmtree className="w-5 h-5 text-amber-300 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Izin &amp; Cuti Saya</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/40 border border-blue-300/40 text-blue-100 font-black">
                  {staff.name}
                </span>
              </div>
              <p className="text-[11px] text-blue-100 font-bold">
                {staff.venue} • {staff.division} • Kuota Cuti Tahunan: <strong className="text-amber-300">{balance.remainingDays} dari {balance.maxQuota} Hari</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-2 border-slate-200 bg-slate-50 p-2 gap-2 text-xs font-black shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('HISTORY'); stopCamera(); }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Riwayat &amp; Status ({requests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('CUTI'); stopCamera(); }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'CUTI'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Palmtree className="w-4 h-4 text-amber-500" />
            <span>Ajukan Cuti (H-14)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('IZIN'); stopCamera(); }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'IZIN'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Ajukan Izin (Biasa / Sakit)</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-bold custom-scrollbar">

          {/* Alert / Feedback Banners */}
          {error && (
            <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 font-black flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-950 font-black flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: RIWAYAT & STATUS PRIBADI */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              {/* Quota Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-950">Jatah Cuti Tahunan ({balance.year})</h4>
                    <p className="text-[11px] text-slate-600">Maksimal 12 hari kerja per tahun kalender</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-blue-900">{balance.remainingDays}</span>
                  <span className="text-[11px] text-slate-600 block">Hari Tersisa</span>
                </div>
              </div>

              {/* Request List */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-black text-slate-900 uppercase">Daftar Pengajuan Saya</span>
                <button
                  type="button"
                  onClick={loadStaffData}
                  disabled={loading}
                  className="text-blue-700 hover:text-blue-900 font-black flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loading && requests.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-bold space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p>Memuat riwayat pengajuan...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-500">
                  <Palmtree className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="font-black text-slate-700">Belum ada riwayat pengajuan cuti atau izin.</p>
                  <p className="text-[11px] mt-1">Gunakan tab di atas untuk mengajukan cuti atau izin sakit jika diperlukan.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {requests.map((r) => {
                    const isCuti = r.type === 'CUTI';
                    const isApproved = r.status === 'APPROVED';
                    const isAdjusted = r.status === 'ADJUSTED';
                    const isRejected = r.status === 'REJECTED';
                    const isPending = r.status === 'PENDING';

                    return (
                      <div
                        key={r.id}
                        className={`p-3.5 rounded-2xl border-2 transition shadow-sm ${
                          isApproved
                            ? 'bg-emerald-50/50 border-emerald-300'
                            : isAdjusted
                            ? 'bg-amber-50/50 border-amber-300'
                            : isRejected
                            ? 'bg-rose-50/50 border-rose-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                              isCuti
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : r.category === 'IZIN_BIASA'
                                ? 'bg-indigo-100 text-indigo-950 border border-indigo-300'
                                : r.category === 'IZIN_PULANG_AWAL'
                                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                : 'bg-purple-100 text-purple-900 border border-purple-300'
                            }`}>
                              {isCuti
                                ? '🌴 CUTI'
                                : r.category === 'IZIN_BIASA'
                                ? '📋 IZIN'
                                : r.category === 'IZIN_PULANG_AWAL'
                                ? '🏃 IZIN PULANG AWAL'
                                : `🏥 ${r.category === 'SAKIT' ? 'IZIN SAKIT' : (r.category || 'IZIN')}`}
                            </span>
                            <span className="font-mono text-xs text-slate-900 font-black">
                              {r.category === 'IZIN_PULANG_AWAL' && r.departure_time
                                ? `${formatWitaDateOnly(r.start_date)} • Jam ${r.departure_time} WITA`
                                : `${formatWitaDateOnly(r.start_date)} s/d ${formatWitaDateOnly(r.end_date)}`}
                            </span>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-600 text-white'
                              : isAdjusted
                              ? 'bg-amber-500 text-white'
                              : isRejected
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-200 text-slate-800'
                          }`}>
                            {isApproved ? 'Disetujui Penuh' : isAdjusted ? `Disesuaikan (${r.approved_days}h)` : isRejected ? 'Ditolak' : 'Menunggu Review'}
                          </span>
                        </div>

                        {/* Request Details */}
                        <div className="mt-2 text-[11px] text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-slate-200/60 pt-2">
                          <div>
                            <span className="text-slate-500">Alasan: </span>
                            <span className="font-bold text-slate-900">"{r.reason}"</span>
                          </div>
                          <div className="text-slate-500 shrink-0">
                            Diajukan: {formatWitaDateOnly(r.created_at)} ({r.requested_days} Hari)
                          </div>
                        </div>

                        {/* Adjustment / Rejection Note from Management */}
                        {r.manager_notes && (
                          <div className="mt-2 p-2 bg-slate-100 rounded-xl text-[11px] text-slate-800 border border-slate-300 flex items-start space-x-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-blue-950 block">Catatan Management ({r.reviewed_by}):</strong>
                              <span>{r.manager_notes}</span>
                            </div>
                          </div>
                        )}

                        {/* Verification Photo Thumbnail */}
                        <div className="mt-2 flex items-center space-x-3 text-[10px] text-slate-500">
                          {r.photo_url && (
                            <div className="flex items-center space-x-1.5">
                              <span>Selfie:</span>
                              <a
                                href={r.photo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block w-8 h-8 rounded-lg overflow-hidden border border-slate-300 hover:opacity-80"
                                title="Lihat Selfie Pemohon"
                              >
                                <img src={r.photo_url} alt="Selfie" className="w-full h-full object-cover" />
                              </a>
                            </div>
                          )}
                          {r.document_url && (
                            <div className="flex items-center space-x-1.5">
                              <span>Dokumen:</span>
                              <a
                                href={r.document_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block w-8 h-8 rounded-lg overflow-hidden border border-purple-300 hover:opacity-80"
                                title="Lihat Dokumen Pendukung"
                              >
                                <img src={r.document_url} alt="Dokumen" className="w-full h-full object-cover" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FORM PENGAJUAN CUTI (H-14, SELFIE WAJIB) */}
          {activeTab === 'CUTI' && (
            <form onSubmit={handleSubmitCuti} className="space-y-3.5">
              
              {/* Notice Box */}
              <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-2xl text-blue-950 font-bold space-y-1">
                <div className="flex items-center space-x-1.5 font-black text-xs text-blue-900">
                  <Info className="w-4 h-4 text-blue-700" />
                  <span>Ketentuan Cuti Tahunan:</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  • Pengajuan wajib dilakukan <strong>minimal 2 minggu (14 hari)</strong> sebelum tanggal mulai cuti.<br />
                  • Setiap staf memiliki kuota 12 hari/tahun (Sisa Anda: <strong>{balance.remainingDays} Hari</strong>).<br />
                  • Wajib mengambil foto selfie di form ini agar permohonan sah dan tidak disalahgunakan.
                </p>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    Tanggal Mulai Cuti (Min H-14):
                  </label>
                  <input
                    type="date"
                    min={minCutiDate}
                    value={cutiStart}
                    onChange={(e) => {
                      setCutiStart(e.target.value);
                      if (!cutiEnd || e.target.value > cutiEnd) setCutiEnd(e.target.value);
                    }}
                    required
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                    Paling cepat mulai: {formatWitaDateOnly(minCutiDate)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    Tanggal Selesai Cuti:
                  </label>
                  <input
                    type="date"
                    min={cutiStart || minCutiDate}
                    value={cutiEnd}
                    onChange={(e) => setCutiEnd(e.target.value)}
                    required
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                  {cutiStart && cutiEnd && (
                    <span className="text-[10px] text-blue-700 font-black block mt-0.5">
                      Durasi yang diajukan: {calculateDays(cutiStart, cutiEnd)} Hari Kerja
                    </span>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  Alasan Mengambil Cuti:
                </label>
                <textarea
                  rows={2}
                  value={cutiReason}
                  onChange={(e) => setCutiReason(e.target.value)}
                  placeholder="Tulis alasan cuti (misal: Keperluan keluarga, acara adat, dll)..."
                  required
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-2.5 text-xs font-black text-slate-950 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              {/* Mandatory Selfie Photo */}
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  Foto Selfie Pemohon (Wajib):
                </label>
                
                {cutiSelfie ? (
                  <div className="relative inline-block border-2 border-emerald-400 rounded-2xl overflow-hidden shadow-sm">
                    <img src={cutiSelfie} alt="Selfie Cuti" className="w-36 h-36 object-cover" />
                    <button
                      type="button"
                      onClick={() => setCutiSelfie(null)}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow"
                      title="Ambil Ulang"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[9px] font-black py-0.5 text-center">
                      Foto Terverifikasi ✓
                    </span>
                  </div>
                ) : cameraActive && cameraTarget === 'CUTI' ? (
                  <div className="space-y-2">
                    <div className="w-full max-w-xs h-56 bg-slate-950 rounded-2xl overflow-hidden relative border-2 border-blue-500 shadow-md">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <button
                        type="button"
                        onClick={captureSelfie}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-lg active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Jepret Foto</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="text-xs text-rose-600 hover:underline font-bold"
                    >
                      Batal Kamera
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => startCamera('CUTI')}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-2xl text-xs font-black text-blue-700 flex items-center space-x-2 transition"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Buka Kamera Selfie Cuti</span>
                    </button>
                    {cameraError && cameraTarget === 'CUTI' && <p className="text-[11px] text-rose-600 mt-1">{cameraError}</p>}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !cutiStart || !cutiEnd || !cutiReason.trim() || !cutiSelfie}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-blue-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengirim Pengajuan...</span>
                    </>
                  ) : (
                    <>
                      <Palmtree className="w-4 h-4 text-amber-300" />
                      <span>Ajukan Ke Management</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* TAB 3: FORM PENGAJUAN IZIN (BIASA / SAKIT / DARURAT / PULANG AWAL) */}
          {activeTab === 'IZIN' && (
            <form onSubmit={handleSubmitIzin} className="space-y-3.5">
              
              {/* Contextual Notice Banner depending on Category */}
              {izinCategory === 'IZIN_BIASA' ? (
                <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border-2 border-indigo-300 rounded-2xl text-indigo-950 font-bold space-y-1 shadow-sm">
                  <div className="flex items-center space-x-2 font-black text-xs text-indigo-950">
                    <span className="text-base">📋</span>
                    <span>Ketentuan Izin:</span>
                  </div>
                  <p className="text-[11px] text-indigo-900 leading-relaxed">
                    • <strong>TIDAK memotong jatah cuti tahunan</strong> dan <strong>TIDAK memerlukan surat sakit dokter</strong>.<br />
                    • Diperuntukkan untuk keperluan pribadi yang sah atau urusan penting lainnya.<br />
                    • <strong>Foto selfie pemohon WAJIB diambil</strong> untuk verifikasi biometrik pemohon.<br />
                    • Dokumen pendukung (surat/bukti keterangan jika ada) bersifat <strong>opsional</strong>.
                  </p>
                </div>
              ) : izinCategory === 'SAKIT' ? (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-950 font-bold space-y-1 shadow-sm">
                  <div className="flex items-center space-x-2 font-black text-xs text-rose-900">
                    <HeartPulse className="w-4 h-4 text-rose-600" />
                    <span>Ketentuan Izin Sakit:</span>
                  </div>
                  <p className="text-[11px] text-rose-900 leading-relaxed">
                    • <strong>Foto selfie pemohon WAJIB diambil</strong> untuk verifikasi pemohon.<br />
                    • Dokumen pendukung (surat dokter / resep / surat keterangan) bersifat <strong>opsional</strong> — dapat dilampirkan jika tersedia.
                  </p>
                </div>
              ) : izinCategory === 'IZIN_DARURAT' ? (
                <div className="p-3.5 bg-purple-50 border-2 border-purple-200 rounded-2xl text-purple-950 font-bold space-y-1 shadow-sm">
                  <div className="flex items-center space-x-2 font-black text-xs text-purple-900">
                    <AlertTriangle className="w-4 h-4 text-purple-600" />
                    <span>Ketentuan Izin Darurat:</span>
                  </div>
                  <p className="text-[11px] text-purple-900 leading-relaxed">
                    • Digunakan untuk situasi keluarga mendesak atau musibah mendadak.<br />
                    • <strong>Foto selfie pemohon WAJIB diambil</strong> untuk verifikasi pemohon.
                  </p>
                </div>
              ) : null}

              {/* Category */}
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1.5">Pilih Kategori Izin:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setIzinCategory('IZIN_BIASA')}
                    className={`py-2.5 px-2.5 rounded-xl border-2 font-black text-xs transition text-center flex flex-col items-center justify-center gap-1 ${
                      izinCategory === 'IZIN_BIASA'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-sm ring-2 ring-indigo-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">📋</span>
                    <span>Izin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIzinCategory('SAKIT')}
                    className={`py-2.5 px-2.5 rounded-xl border-2 font-black text-xs transition text-center flex flex-col items-center justify-center gap-1 ${
                      izinCategory === 'SAKIT'
                        ? 'bg-rose-50 border-rose-500 text-rose-950 shadow-sm ring-2 ring-rose-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">🏥</span>
                    <span>Izin Sakit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIzinCategory('IZIN_DARURAT')}
                    className={`py-2.5 px-2.5 rounded-xl border-2 font-black text-xs transition text-center flex flex-col items-center justify-center gap-1 ${
                      izinCategory === 'IZIN_DARURAT'
                        ? 'bg-purple-50 border-purple-500 text-purple-950 shadow-sm ring-2 ring-purple-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">🚨</span>
                    <span>Izin Darurat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIzinCategory('IZIN_PULANG_AWAL');
                      setIzinStart(todayStr);
                      setIzinEnd(todayStr);
                      if (!departureTime) {
                        try {
                          const nowWita = new Intl.DateTimeFormat('id-ID', {
                            timeZone: 'Asia/Makassar',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          }).format(new Date()).replace('.', ':');
                          setDepartureTime(nowWita);
                        } catch {
                          setDepartureTime('15:00');
                        }
                      }
                    }}
                    className={`py-2.5 px-2.5 rounded-xl border-2 font-black text-xs transition text-center flex flex-col items-center justify-center gap-1 ${
                      izinCategory === 'IZIN_PULANG_AWAL'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-sm ring-2 ring-amber-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">🏃</span>
                    <span>Pulang di Shift</span>
                  </button>
                </div>
              </div>

              {/* Conditional Timing / Dates */}
              {izinCategory === 'IZIN_PULANG_AWAL' ? (
                <div className="space-y-3 bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-3.5">
                  <div className="flex items-start space-x-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-200 text-amber-950 flex items-center justify-center font-black text-sm shrink-0">
                      🏃
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-950">Izin Pulang di Tengah Shift Berjalan (On Duty)</h4>
                      <p className="text-[11px] text-amber-900 leading-tight mt-0.5">
                        Digunakan jika Anda sedang on-duty namun harus segera pulang karena sakit mendadak atau urusan darurat.
                        Jika disetujui Management, shift akan diselesaikan tanpa penalti early checkout.
                      </p>
                    </div>
                  </div>

                  {activeShift && (
                    <div className="p-2.5 bg-white rounded-xl border border-amber-300 flex items-center justify-between text-xs font-black text-slate-800">
                      <span>Shift Aktif:</span>
                      <span className="text-blue-700 font-mono">
                        {activeShift.scheduled_start || '13:00'} - {activeShift.scheduled_end || '22:00'} WITA
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-black text-slate-900 mb-1">Tanggal Hari Ini:</label>
                      <input
                        type="text"
                        value={formatWitaDateOnly(todayStr)}
                        disabled
                        className="w-full bg-slate-100 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-900 mb-1">
                        Jam Rencana Pulang (WITA): <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="time"
                        value={departureTime}
                        onChange={(e) => setDepartureTime(e.target.value)}
                        required
                        className="w-full bg-white border-2 border-amber-400 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-900 mb-1">Dari Tanggal:</label>
                    <input
                      type="date"
                      value={izinStart}
                      onChange={(e) => {
                        setIzinStart(e.target.value);
                        if (!izinEnd || e.target.value > izinEnd) setIzinEnd(e.target.value);
                      }}
                      required
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-purple-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-900 mb-1">Hingga Tanggal:</label>
                    <input
                      type="date"
                      min={izinStart || todayStr}
                      value={izinEnd}
                      onChange={(e) => setIzinEnd(e.target.value)}
                      required
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-950 focus:outline-none focus:border-purple-600 focus:bg-white"
                    />
                    {izinStart && izinEnd && (
                      <span className="text-[10px] text-purple-800 font-black block mt-0.5">
                        Durasi izin: {calculateDays(izinStart, izinEnd)} Hari
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-black text-slate-900 mb-1">
                  {izinCategory === 'IZIN_BIASA'
                    ? 'Alasan / Keperluan Izin:'
                    : izinCategory === 'SAKIT'
                    ? 'Gejala / Keluhan Sakit:'
                    : izinCategory === 'IZIN_PULANG_AWAL'
                    ? 'Alasan Pulang Sebelum Shift Usai:'
                    : 'Alasan Izin Darurat:'}
                </label>
                <textarea
                  rows={2}
                  value={izinReason}
                  onChange={(e) => setIzinReason(e.target.value)}
                  placeholder={
                    izinCategory === 'IZIN_BIASA'
                      ? 'Tulis keperluan izin secara jelas...'
                      : izinCategory === 'SAKIT'
                      ? 'Jelaskan kondisi atau keluhan sakit yang dialami...'
                      : izinCategory === 'IZIN_PULANG_AWAL'
                      ? 'Jelaskan alasan mendesak harus pulang lebih awal...'
                      : 'Jelaskan alasan darurat...'
                  }
                  required
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-2.5 text-xs font-black text-slate-950 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>

              {/* TWO BUTTONS: 1. Selfie Pemohon (Wajib) & 2. Upload Dokumen Pendukung (Opsional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                
                {/* BUTTON 1: SELFIE PEMOHON (WAJIB) */}
                <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-200 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-black text-slate-900 mb-0.5">
                      1. Foto Selfie Pemohon: <span className="text-rose-600">*Wajib</span>
                    </label>
                    <p className="text-[10px] text-slate-500 font-bold mb-2">
                      Ambil selfie biometrik via kamera depan.
                    </p>
                  </div>

                  {izinSelfie ? (
                    <div className="relative inline-block border-2 border-emerald-400 rounded-2xl overflow-hidden shadow-sm self-start">
                      <img src={izinSelfie} alt="Selfie Izin" className="w-28 h-28 object-cover" />
                      <button
                        type="button"
                        onClick={() => setIzinSelfie(null)}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow"
                        title="Ambil Ulang"
                      >
                        <X className="w-3 h-3 stroke-[2.5]" />
                      </button>
                      <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[9px] font-black py-0.5 text-center">
                        Selfie Terverifikasi ✓
                      </span>
                    </div>
                  ) : cameraActive && cameraTarget === 'IZIN' ? (
                    <div className="space-y-2">
                      <div className="w-full h-44 bg-slate-950 rounded-xl overflow-hidden relative border border-slate-700">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={captureSelfie}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black transition flex items-center justify-center space-x-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Jepret Selfie</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => startCamera('IZIN')}
                        className="w-full py-2.5 px-3 bg-purple-100 hover:bg-purple-200 border-2 border-purple-300 rounded-xl text-xs font-black text-purple-900 flex items-center justify-center space-x-2 transition"
                      >
                        <Camera className="w-4 h-4 text-purple-700" />
                        <span>Buka Kamera Selfie</span>
                      </button>
                      {cameraError && cameraTarget === 'IZIN' && (
                        <p className="text-[10px] text-rose-600 font-bold mt-1">{cameraError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* BUTTON 2: UPLOAD DOKUMEN PENDUKUNG (OPSIONAL) */}
                <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-200 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-black text-slate-900 mb-0.5">
                      2. Dokumen Pendukung: <span className="text-slate-500 font-normal">(Opsional)</span>
                    </label>
                    <p className="text-[10px] text-slate-500 font-bold mb-2">
                      {izinCategory === 'IZIN_BIASA'
                        ? 'Lampirkan foto surat keterangan / bukti jika ada.'
                        : 'Surat dokter / resep / bukti (jika ada).'}
                    </p>
                  </div>

                  {izinDocPhoto ? (
                    <div className="relative inline-block border-2 border-purple-400 rounded-2xl overflow-hidden shadow-sm self-start">
                      <img src={izinDocPhoto} alt="Dokumen Izin" className="w-28 h-28 object-cover" />
                      <button
                        type="button"
                        onClick={() => setIzinDocPhoto(null)}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow"
                        title="Hapus Dokumen"
                      >
                        <X className="w-3 h-3 stroke-[2.5]" />
                      </button>
                      <span className="absolute bottom-0 inset-x-0 bg-purple-700 text-white text-[9px] font-black py-0.5 text-center">
                        Dokumen Terlampir ✓
                      </span>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleDocUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl text-xs font-black text-slate-700 flex items-center justify-center space-x-2 transition"
                      >
                        <Upload className="w-4 h-4 text-slate-600" />
                        <span>Upload Dokumen (Opsional)</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !izinReason.trim() ||
                    !izinSelfie ||
                    (izinCategory === 'IZIN_PULANG_AWAL' ? !departureTime : (!izinStart || !izinEnd))
                  }
                  className={`w-full py-3 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 ${
                    izinCategory === 'IZIN_PULANG_AWAL'
                      ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-600/30'
                      : 'bg-purple-700 hover:bg-purple-800 active:bg-purple-900 shadow-purple-700/30'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengirim Permohonan...</span>
                    </>
                  ) : (
                    <>
                      {izinCategory === 'IZIN_PULANG_AWAL' ? (
                        <span>🏃 Ajukan Izin Pulang Ke Management</span>
                      ) : (
                        <>
                          <HeartPulse className="w-4 h-4 text-rose-300" />
                          <span>Kirim Permohonan Ke Management</span>
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 border-t-2 border-slate-200 text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-black text-slate-800 transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
