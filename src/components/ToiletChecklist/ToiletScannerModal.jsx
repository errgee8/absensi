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
      let token = decodedText.trim();
      if (token.includes('/inspect/')) {
        const parts = token.split('/inspect/');
        token = parts[1].split('?')[0].trim();
      } else if (token.includes('token=')) {
        const urlParams = new URLSearchParams(token.split('?')[1]);
        token = urlParams.get('token') || token;
      }

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
      console.warn('QR camera start failed:', err);
      setScannerError('Tidak dapat membuka kamera QR. Anda dapat beralih ke tab "Pilih Lokasi Toilet" di atas.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border-2 border-slate-300 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <QrCode className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-950">Scan QR Toilet</h3>
              <p className="text-xs text-slate-700 font-bold">Checklist Kebersihan Toilet Berkala</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Switcher - High Contrast */}
        <div className="p-3 bg-slate-100 border-b-2 border-slate-200 flex space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'camera'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white text-slate-800 border-2 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Camera className="w-4 h-4 stroke-[2.5]" />
            <span>Kamera Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'manual'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white text-slate-800 border-2 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-4 h-4 stroke-[2.5]" />
            <span>Pilih Lokasi Toilet</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === 'camera' ? (
            <div className="space-y-4">
              <div
                id="toilet-qr-reader"
                className="w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center"
              />

              {scannerError && (
                <div className="p-3 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-xl text-xs flex items-start space-x-2 font-bold">
                  <span>{scannerError}</span>
                </div>
              )}

              <p className="text-center text-xs text-slate-700 font-bold">
                Arahkan kamera ke stiker QR resmi yang tertempel di toilet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-900 font-black mb-2">
                Pilih toilet yang baru selesai Anda bersihkan:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {RESTROOM_LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => onLocationSelected(loc)}
                    className="p-3.5 bg-white hover:bg-blue-50 border-2 border-slate-300 hover:border-blue-500 rounded-2xl flex items-center justify-between text-left transition group shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition font-black">
                        <Building2 className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="font-black text-slate-950 text-sm">{loc.name}</div>
                        <div className="text-xs text-slate-700 font-bold">
                          {loc.building} • {loc.floor}
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-sm group-hover:bg-blue-700 transition">
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
