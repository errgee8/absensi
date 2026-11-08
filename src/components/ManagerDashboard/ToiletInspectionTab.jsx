import React, { useState, useEffect } from 'react';
import { Building2, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Clock, User, Camera, ShieldCheck, Eye, X } from 'lucide-react';
import { getToiletLocations, getRecentToiletInspections } from '../../utils/toiletService';

export default function ToiletInspectionTab() {
  const [locations, setLocations] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspection, setSelectedInspection] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locs, feeds] = await Promise.all([
        getToiletLocations(),
        getRecentToiletInspections(25)
      ]);
      setLocations(locs);
      setInspections(feeds);
    } catch (err) {
      console.error('Failed to load toilet inspection data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Belum pernah diinspeksi';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300">
              Live Toilet QR Integration
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-950 mt-1">
            Monitoring Kebersihan Toilet (Restroom Hygiene)
          </h3>
          <p className="text-xs text-slate-700 font-bold mt-0.5">
            Laporan checklist kebersihan berkala dari staf LuckyCat Billiard &amp; JP Executive Karaoke
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 4 Restroom Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {locations.map((loc) => {
          const isClean = loc.last_status === 'clean' || !loc.last_status;
          return (
            <div
              key={loc.id}
              className="bg-white rounded-3xl p-5 border-2 border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-900 border border-slate-300">
                    {loc.gender === 'male' ? '🚹 Toilet Pria' : '🚺 Toilet Wanita'}
                  </span>
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      isClean
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                        : 'bg-amber-100 text-amber-950 border-amber-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isClean ? 'bg-emerald-700' : 'bg-amber-700'}`} />
                    <span>{isClean ? 'Bersih / OK' : 'Perlu Perhatian'}</span>
                  </span>
                </div>

                <h4 className="font-black text-slate-950 text-base">{loc.name}</h4>
                <p className="text-xs text-slate-700 font-bold mb-3">{loc.building} • {loc.floor}</p>
              </div>

              <div className="pt-3 border-t-2 border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-bold">Terakhir dicek:</span>
                  <span className="font-black text-slate-950">{formatTimeAgo(loc.last_inspected_at)}</span>
                </div>
                {loc.last_inspected_by && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-bold">Petugas:</span>
                    <span className="font-black text-blue-900">{loc.last_inspected_by}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Inspection Feed */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-100">
          <div>
            <h4 className="font-black text-slate-950 text-base">Riwayat Checklist Terbaru</h4>
            <p className="text-xs text-slate-700 font-bold">Log inspeksi dan foto bukti kebersihan toilet yang di-submit staf</p>
          </div>
          <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-300">
            Total {inspections.length} Laporan
          </span>
        </div>

        {inspections.length === 0 ? (
          <div className="p-8 text-center text-slate-700 text-xs bg-slate-50 rounded-2xl font-bold">
            Belum ada data checklist toilet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-900 border-collapse">
              <thead className="bg-slate-100 text-slate-950 text-[10px] uppercase font-black tracking-wider border-b-2 border-slate-200">
                <tr>
                  <th className="py-3 px-3">Waktu</th>
                  <th className="py-3 px-3">Lokasi Toilet</th>
                  <th className="py-3 px-3">Petugas</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Checklist Item</th>
                  <th className="py-3 px-2">Foto Bukti</th>
                  <th className="py-3 px-2 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100 font-bold">
                {inspections.map((ins) => {
                  const passCount = (ins.task_results || []).filter((t) => t.status === 'pass').length;
                  const totalCount = (ins.task_results || []).length;
                  const isAllPass = ins.overall_status === 'pass';

                  return (
                    <tr key={ins.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 px-3 font-mono text-xs text-slate-950 font-bold whitespace-nowrap">
                        {new Date(ins.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA
                        <div className="text-[10px] text-slate-600">
                          {new Date(ins.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-black text-slate-950">
                        {ins.qr_token || ins.location_id}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-black text-blue-900 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-300">
                          {ins.staff_name || 'Staf'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            isAllPass
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                              : 'bg-amber-100 text-amber-950 border-amber-300'
                          }`}
                        >
                          <span>{isAllPass ? '✓ Bersih / Lolos' : '⚠️ Perlu Perhatian'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-xs">
                        <span className="font-black text-slate-950">{passCount}/{totalCount} OK</span>
                      </td>

                      <td className="py-3 px-2">
                        {ins.photo_url ? (
                          <button
                            type="button"
                            onClick={() => setSelectedInspection(ins)}
                            className="relative w-12 h-10 rounded-xl overflow-hidden border-2 border-slate-300 hover:border-blue-600 transition shadow-sm group inline-block"
                          >
                            <img
                              src={ins.photo_url}
                              alt="Toilet inspection"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-blue-950/40 group-hover:bg-transparent flex items-center justify-center">
                              <Eye className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-bold">Tidak ada foto</span>
                        )}
                      </td>

                      <td className="py-3 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInspection(ins)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black border border-blue-200 transition shadow-sm"
                        >
                          Lihat
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspection Detail Modal */}
      {selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-slate-300 max-h-[85vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-white">Detail Laporan Checklist Toilet</h3>
                <p className="text-xs text-blue-100 font-bold mt-0.5">
                  {selectedInspection.qr_token} • Petugas: {selectedInspection.staff_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInspection(null)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Photo Preview if available */}
              {selectedInspection.photo_url && (
                <div>
                  <label className="font-black text-slate-950 block mb-1">Foto Bukti Kondisi Toilet:</label>
                  <div className="rounded-2xl overflow-hidden border-2 border-slate-300 aspect-video bg-slate-950 shadow-sm">
                    <img
                      src={selectedInspection.photo_url}
                      alt="Inspection detail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Task Results */}
              <div>
                <label className="font-black text-slate-950 block mb-2">Hasil Pengecekan ({selectedInspection.task_results?.length || 0} Poin):</label>
                <div className="grid grid-cols-2 gap-2">
                  {(selectedInspection.task_results || []).map((t, idx) => {
                    const isPass = t.status === 'pass';
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border-2 flex items-center justify-between text-xs font-black ${
                          isPass
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                            : 'bg-amber-50 border-amber-300 text-amber-950'
                        }`}
                      >
                        <span className="truncate mr-1">{t.taskTitle || t.taskId}</span>
                        <span>{isPass ? '✓ OK' : '⚠️ Cek'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedInspection.notes && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200">
                  <span className="font-black text-slate-950 block mb-1">Catatan Tambahan:</span>
                  <p className="text-slate-800 font-bold">{selectedInspection.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t-2 border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInspection(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs shadow-md shadow-blue-600/30 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
