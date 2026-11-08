import React, { useState, useEffect } from 'react';
import { Building2, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Clock, User, Camera, ShieldCheck, Eye } from 'lucide-react';
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
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
              Live Toilet QR Integration
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900 mt-1">
            Monitoring Kebersihan Toilet (Restroom Hygiene)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan checklist kebersihan berkala dari staf LuckyCat Billiard &amp; JP Executive Karaoke
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs border border-blue-200 flex items-center space-x-1.5 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {loc.gender === 'male' ? '🚹 Toilet Pria' : '🚺 Toilet Wanita'}
                  </span>
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isClean
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isClean ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span>{isClean ? 'Bersih / OK' : 'Perlu Perhatian'}</span>
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm">{loc.name}</h4>
                <p className="text-[11px] text-slate-500 mb-3">{loc.building} • {loc.floor}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Terakhir dicek:</span>
                  <span className="font-bold text-slate-700">{formatTimeAgo(loc.last_inspected_at)}</span>
                </div>
                {loc.last_inspected_by && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Petugas:</span>
                    <span className="font-bold text-blue-600">{loc.last_inspected_by}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Inspection Feed */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-extrabold text-slate-900 text-base">Riwayat Checklist Terbaru</h4>
            <p className="text-xs text-slate-500">Log inspeksi dan foto bukti kebersihan toilet yang di-submit staf</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
            Total {inspections.length} Laporan
          </span>
        </div>

        {inspections.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
            Belum ada data checklist toilet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Lokasi Toilet</th>
                  <th className="py-2.5 px-3">Petugas</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Checklist Item</th>
                  <th className="py-2.5 px-3">Foto Bukti</th>
                  <th className="py-2.5 px-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {inspections.map((ins) => {
                  const passCount = (ins.task_results || []).filter((t) => t.status === 'pass').length;
                  const totalCount = (ins.task_results || []).length;
                  const isAllPass = ins.overall_status === 'pass';

                  return (
                    <tr key={ins.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(ins.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        <div className="text-[10px] text-slate-400">
                          {new Date(ins.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-900">
                        {ins.qr_token || ins.location_id}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                          {ins.staff_name || 'Staf'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAllPass
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isAllPass ? '✓ Bersih / Lolos' : '⚠️ Perlu Perhatian'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        <span className="font-bold text-slate-800">{passCount}/{totalCount} OK</span>
                      </td>

                      <td className="py-3 px-3">
                        {ins.photo_url ? (
                          <button
                            type="button"
                            onClick={() => setSelectedInspection(ins)}
                            className="relative w-12 h-10 rounded-lg overflow-hidden border border-slate-200 hover:scale-105 transition shadow-sm group"
                          >
                            <img
                              src={ins.photo_url}
                              alt="Toilet inspection"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent flex items-center justify-center">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Tidak ada foto</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInspection(ins)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-white">Detail Laporan Checklist Toilet</h3>
                <p className="text-xs text-blue-100">
                  {selectedInspection.qr_token} • Petugas: {selectedInspection.staff_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInspection(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Photo Preview if available */}
              {selectedInspection.photo_url && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Foto Bukti Kondisi Toilet:</label>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 shadow-sm">
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
                <label className="font-bold text-slate-700 block mb-2">Hasil Pengecekan ({selectedInspection.task_results?.length || 0} Poin):</label>
                <div className="grid grid-cols-2 gap-2">
                  {(selectedInspection.task_results || []).map((t, idx) => {
                    const isPass = t.status === 'pass';
                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border flex items-center justify-between text-[11px] ${
                          isPass ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <span className="font-bold truncate mr-1">{t.taskTitle || t.taskId}</span>
                        <span className="font-extrabold">{isPass ? '✓' : '⚠️'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedInspection.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-1">Catatan Tambahan:</span>
                  <p className="text-slate-600">{selectedInspection.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInspection(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20"
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
