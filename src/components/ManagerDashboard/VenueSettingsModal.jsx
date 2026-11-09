import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Shield, RefreshCw, Clock, ArrowRight, Trash2 } from 'lucide-react';
import { updateSettings } from '../../utils/api';
import WipeLeaderboardModal from '../Leaderboard/WipeLeaderboardModal';

export default function VenueSettingsModal({ settings, onClose, onSaved, onGoToSchedules }) {
  const [venueName, setVenueName] = useState(settings?.venue_name || 'JP Karaoke & LuckyCat Outlets');
  const [lat, setLat] = useState(settings?.venue_lat ?? -8.780981);
  const [lng, setLng] = useState(settings?.venue_lng ?? 115.176863);
  const [radius, setRadius] = useState(settings?.geofence_radius ?? 150);
  const [subnets, setSubnets] = useState(
    Array.isArray(settings?.allowed_subnets) ? settings.allowed_subnets.join('\n') : ''
  );
  const [saving, setSaving] = useState(false);
  const [wipeModalOpen, setWipeModalOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.venue_name !== undefined) setVenueName(settings.venue_name);
      if (settings.venue_lat !== undefined) setLat(settings.venue_lat);
      if (settings.venue_lng !== undefined) setLng(settings.venue_lng);
      if (settings.geofence_radius !== undefined) setRadius(settings.geofence_radius);
      if (settings.allowed_subnets !== undefined) {
        setSubnets(Array.isArray(settings.allowed_subnets) ? settings.allowed_subnets.join('\n') : '');
      }
    }
  }, [settings]);

  // Helper to grab browser GPS as venue pin
  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) return alert('Geolocation tidak didukung browser ini.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
      },
      (err) => alert('Gagal membaca GPS: ' + err.message),
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedSubnets = subnets
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateSettings({
        venue_name: venueName,
        venue_lat: parseFloat(lat),
        venue_lng: parseFloat(lng),
        geofence_radius: parseInt(radius, 10),
        allowed_subnets: parsedSubnets,
        enforce_wifi: 0
      });

      onSaved();
      onClose();
    } catch (err) {
      alert('Error updating settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        <form onSubmit={handleSave}>
          {/* Header */}
          <div className="p-4 sm:p-5 border-b-2 border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Shield className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-black text-slate-950">Pengaturan Lokasi, Geofence &amp; Wi-Fi</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200 transition border border-slate-300"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Quick link to Shift Timing & Division Settings */}
          {onGoToSchedules && (
            <div className="mx-5 mt-4 p-3.5 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-2 text-blue-950 font-bold">
                <Clock className="w-4 h-4 text-blue-700 shrink-0 stroke-[2.5]" />
                <span className="text-xs">Ingin mengatur jam kerja &amp; shift divisi?</span>
              </div>
              <button
                type="button"
                onClick={onGoToSchedules}
                className="text-xs font-black text-blue-900 hover:text-blue-950 bg-white hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-300 transition flex items-center space-x-1 shadow-sm"
              >
                <span>Buka Jadwal Divisi</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* Form Content */}
          <div className="p-5 space-y-4 text-xs">
            {/* Venue Name */}
            <div>
              <label className="text-slate-950 font-black block mb-1">Nama Venue / Outlet</label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-black focus:outline-none focus:border-blue-600 focus:bg-white"
                required
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-950 font-black block mb-1">Latitude Outlet</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black focus:outline-none focus:border-blue-600 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="text-slate-950 font-black block mb-1">Longitude Outlet</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-3 py-2 text-slate-950 font-mono font-black focus:outline-none focus:border-blue-600 focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* GPS helper button */}
            <button
              type="button"
              onClick={handleUseCurrentGps}
              className="text-xs text-blue-700 hover:text-blue-900 font-black flex items-center space-x-1.5"
            >
              <MapPin className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Gunakan Titik GPS Perangkat Saat Ini</span>
            </button>

            {/* Geofence Radius */}
            <div>
              <label className="text-slate-950 font-black block mb-1">
                Radius Geofence: <span className="text-blue-700 font-mono font-black">{radius} meter</span>
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="25"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-700 mt-1 font-mono font-bold">
                <span>50m (Ketat)</span>
                <span>150m (Standar)</span>
                <span>500m</span>
                <span>1000m</span>
              </div>
            </div>

            {/* Allowed Wi-Fi Subnets */}
            <div>
              <label className="text-slate-950 font-black block mb-1">
                Daftar Subnet Router Wi-Fi yang Diizinkan (Satu per baris)
              </label>
              <textarea
                rows={3}
                value={subnets}
                onChange={(e) => setSubnets(e.target.value)}
                placeholder="192.168.1.0/24&#10;10.0.0.0/8"
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-2.5 text-slate-950 font-mono font-bold text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            {/* Trial Data Management / Reset Leaderboard */}
            <div className="pt-3 border-t-2 border-slate-200">
              <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-1.5 text-rose-950 font-black text-xs">
                    <Trash2 className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                    <span>Reset Data Trial Leaderboard</span>
                  </div>
                  <p className="text-[11px] text-rose-800 font-bold mt-0.5">
                    Kosongkan riwayat absensi atau inspeksi selama masa uji coba.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWipeModalOpen(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 shadow-md shadow-rose-600/20 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Wipe Data Trial</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t-2 border-slate-200 bg-slate-50 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-xs border border-slate-300 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition"
            >
              <Save className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>

        <WipeLeaderboardModal
          isOpen={wipeModalOpen}
          onClose={() => setWipeModalOpen(false)}
          onSuccess={() => {
            if (onSaved) onSaved();
          }}
        />
      </div>
    </div>
  );
}
