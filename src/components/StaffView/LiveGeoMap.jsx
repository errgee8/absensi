import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation as NavIcon, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { calculateDistanceMeters } from '../../utils/distance';

export default function LiveGeoMap({
  venueLat,
  venueLng,
  geofenceRadius = 150,
  userLocation,
  setUserLocation,
  isInsideGeofence,
  distanceToVenue
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const circleRef = useRef(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Function to fetch high-accuracy GPS
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy)
        });
      },
      (err) => {
        setGpsLoading(false);
        let msg = 'Unable to retrieve your location.';
        if (err.code === 1) msg = 'Location permission denied. Please allow GPS access.';
        else if (err.code === 2) msg = 'Location unavailable. Check device GPS.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setGpsError(msg);
        console.warn('Geolocation error:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  // Initial GPS fetch on mount
  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  // Initialize and update Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const centerLat = userLocation?.lat ?? venueLat;
    const centerLng = userLocation?.lng ?? venueLng;

    if (!mapInstanceRef.current) {
      // Create Leaflet map
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false
      });

      // Dark theme CartoDB / OSM tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      // Venue Icon & Marker
      const venueIcon = L.divIcon({
        className: 'custom-venue-icon',
        html: `
          <div style="background:#0f172a; border:2px solid #10b981; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(16,185,129,0.5);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker([venueLat, venueLng], { icon: venueIcon })
        .addTo(map)
        .bindPopup('<b>JP Luxury Club</b><br/>Venue Center Geofence');

      // Geofence Circle
      const circle = L.circle([venueLat, venueLng], {
        radius: geofenceRadius,
        color: '#10b981',
        weight: 2,
        fillColor: '#10b981',
        fillOpacity: 0.12,
        dashArray: '4, 6'
      }).addTo(map);

      circleRef.current = circle;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Update or add User Marker
    if (userLocation?.lat != null && userLocation?.lng != null) {
      const userIcon = L.divIcon({
        className: 'custom-user-icon',
        html: `
          <div style="background:#6366f1; border:3px solid #ffffff; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px rgba(99,102,241,0.8);">
            <div style="width:6px; height:6px; background:#ffffff; border-radius:50%;"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      } else {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup('<b>Your Current Location</b>');
      }

      // Fit bounds to show both venue and user
      const group = L.featureGroup([
        L.marker([venueLat, venueLng]),
        userMarkerRef.current
      ]);
      map.fitBounds(group.getBounds().pad(0.3));
    }

    // Force map to recalculate size when mounted in mobile card
    setTimeout(() => {
      map?.invalidateSize();
    }, 200);

    return () => {
      // Map stays attached to container ref
    };
  }, [venueLat, venueLng, geofenceRadius, userLocation]);

  // Demo shortcut helper: Set user location directly inside venue for testing
  const setDemoInsideVenue = () => {
    setUserLocation({
      lat: venueLat + 0.0001,
      lng: venueLng + 0.0001,
      accuracy: 6
    });
    setGpsError(null);
  };

  const setDemoOutsideVenue = () => {
    setUserLocation({
      lat: venueLat + 0.005,
      lng: venueLng + 0.005,
      accuracy: 15
    });
    setGpsError(null);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden mb-5">
      {/* Header Info */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <NavIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Live Geofence Verification
            </h4>
            <div className="flex items-center space-x-2 text-xs">
              {distanceToVenue != null ? (
                <span className={`font-semibold ${isInsideGeofence ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {distanceToVenue}m away ({isInsideGeofence ? 'Inside' : 'Outside'} {geofenceRadius}m zone)
                </span>
              ) : (
                <span className="text-slate-400">Locating coordinates...</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={fetchCurrentLocation}
          disabled={gpsLoading}
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
          <span>Refresh GPS</span>
        </button>
      </div>

      {/* Embedded Map Container */}
      <div className="relative w-full h-48 sm:h-56 bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Status overlay badge on map */}
        <div className="absolute top-2 left-2 z-20">
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold backdrop-blur-md shadow-md border ${
              isInsideGeofence
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
            }`}
          >
            {isInsideGeofence ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Geofence Pass</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Outside Perimeter</span>
              </>
            )}
          </div>
        </div>

        {/* Coordinates readout overlay */}
        {userLocation && (
          <div className="absolute bottom-2 left-2 right-2 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-lg p-2 text-[10px] text-slate-300 font-mono flex items-center justify-between">
            <span>
              Lat: {userLocation.lat.toFixed(5)}, Lng: {userLocation.lng.toFixed(5)}
            </span>
            <span className="text-emerald-400">Acc: ±{userLocation.accuracy}m</span>
          </div>
        )}
      </div>

      {/* GPS Error or Testing Simulator Shortcuts */}
      {gpsError && (
        <div className="p-3 bg-rose-950/30 border-t border-rose-900/40 text-xs text-rose-300 flex items-center justify-between">
          <span>{gpsError}</span>
          <button
            onClick={setDemoInsideVenue}
            className="underline font-bold text-rose-200 ml-2"
          >
            Use Venue Coordinates
          </button>
        </div>
      )}

      {/* Desktop/Demo GPS Simulator Controls */}
      <div className="px-3 py-2 bg-slate-900/40 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>Test GPS Simulation:</span>
        <div className="flex space-x-2">
          <button
            onClick={setDemoInsideVenue}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] border border-slate-700"
          >
            Pin Inside (10m)
          </button>
          <button
            onClick={setDemoOutsideVenue}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 text-[10px] border border-slate-700"
          >
            Pin Outside (500m)
          </button>
        </div>
      </div>
    </div>
  );
}
