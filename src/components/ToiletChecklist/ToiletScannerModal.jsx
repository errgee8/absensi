import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, Camera, MapPin, Building2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { RESTROOM_LOCATIONS } from '../../utils/toiletService';

export default function ToiletScannerModal({ isOpen, onClose, onLocationSelected }) {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'manual'
  const [scannerError, setScannerError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      }
      return;
    }

    const html5QrCode = new Html5Qrcode('toilet-qr-reader');
    scannerRef.current = html5QrCode;

    const qrCodeSuccessCallback = (decodedText) => {
      // Parse token from decoded text (supports full URL or plain token)
      let token = decodedText.trim();
      if (token.includes('/inspect/')) {
        const parts = token.split('/inspect/');
        token = parts[1].split('?')[0].trim();
      } else if (token.includes('token=')) {
        const urlParams = new URLSearchParams(token.split('?')[1]);
        token = urlParams.get('token') || token;
      }

      // Find matching location
      const matched = RESTROOM_LOCATIONS.find(
        (loc) => loc.qr_token.toUpperCase() === token.toUpperCase() || loc.id.toLowerCase() === token.toLowerCase()
      );

      if (matched) {
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {}).finally(() => {
            scannerRef.current = null;
            onLocationSelected(matched);
          });
        } else {
          onLocationSelected(matched);
        }
      } else {
        setScannerError(`QR tidak dikenali (${token}). Harap scan stiker QR resmi Toilet JP atau LC.`);
      }
    };

    html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      qrCodeSuccessCallback,
      () => {}
    ).catch((err) => {
      console.warn('Camera scanner error:', err);
      setScannerError('Tidak dapat mengakses kamera. Silakan pilih lokasi toilet secara manual di bawah.');
      setActiveTab('manual');
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      }
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Scan QR Toilet</h3>
              <p className="text-[11px] text-blue-100">Arahkan kamera ke stiker QR di toilet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'camera'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Kamera Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'manual'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Pilih Lokasi Toilet</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === 'camera' ? (
            <div className="space-y-4">
              <div
                id="toilet-qr-reader"
                className="w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center"
              />

              {scannerError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start space-x-2">
                  <span className="font-semibold">Perhatian:</span>
                  <span>{scannerError}</span>
                </div>
              )}

              <p className="text-center text-[11px] text-slate-500">
                Posisikan QR Code stiker toilet di dalam kotak scanner.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-semibold mb-2">
                Pilih toilet yang baru selesai Anda bersihkan:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {RESTROOM_LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => onLocationSelected(loc)}
                    className="p-3.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-2xl flex items-center justify-between text-left transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{loc.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {loc.building} • {loc.floor}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm">
                      Pilih
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
