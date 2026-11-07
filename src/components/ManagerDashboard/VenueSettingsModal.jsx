import React, { useState } from 'react';
import { X, Save, MapPin, Wifi, Shield, RefreshCw } from 'lucide-react';
import { updateSettings } from '../../utils/api';

export default function VenueSettingsModal({ settings, onClose, onSaved }) {
  const [venueName, setVenueName] = useState(settings?.venue_name || '');
  const [lat, setLat] = useState(settings?.venue_lat ?? -8.780981);
  const [lng, setLng] = useState(settings?.venue_lng ?? 115.176863);
  const [radius, setRadius] = useState(settings?.geofence_radius ?? 500);
  const [subnets, setSubnets] = useState(
    Array.isArray(settings?.allowed_subnets) ? settings.allowed_subnets.join('\n') : ''
  );
  const [enforceWifi, setEnforceWifi] = useState(Boolean(settings?.enforce_wifi));
  const [saving, setSaving] = useState(false);

  // Helper to grab browser GPS as venue pin
  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
      },
      (err) => alert('Failed to get GPS: ' + err.message),
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
        enforce_wifi: enforceWifi ? 1 : 0
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        <form onSubmit={handleSave}>
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Venue Geofence & Wi-Fi Gatekeeper Settings</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-5 space-y-4 text-xs">
            {/* Venue Name */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Venue / Club Name</label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Venue Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Venue Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* GPS helper button */}
            <button
              type="button"
              onClick={handleUseCurrentGps}
              className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <MapPin className="w-3 h-3" />
              <span>Set Venue Pin to My Current Device GPS</span>
            </button>

            {/* Geofence Radius */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Geofence Radius (Meters): <span className="text-emerald-400 font-bold">{radius}m</span>
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="25"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>50m (Strict)</span>
                <span>150m (Standard)</span>
                <span>500m (Resort)</span>
                <span>1000m</span>
              </div>
            </div>

            {/* Allowed Wi-Fi Subnets */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Allowed Venue Router Subnets / CIDR (One per line)
              </label>
              <textarea
                rows={3}
                value={subnets}
                onChange={(e) => setSubnets(e.target.value)}
                placeholder="192.168.1.0/24&#10;10.0.0.0/8"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Enforce Wi-Fi Strict Block */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Strict Wi-Fi Gatekeeper Enforcement</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  If enabled, check-in is hard-blocked off-network. If disabled, check-in is allowed but flagged as "Off-Network Attempt".
                </span>
              </div>
              <input
                type="checkbox"
                checked={enforceWifi}
                onChange={(e) => setEnforceWifi(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer rounded"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
