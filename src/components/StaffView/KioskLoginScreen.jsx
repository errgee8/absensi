import React, { useState } from 'react';
import { User, Lock, ChevronDown, Check, Delete, Wifi, WifiOff, AlertCircle } from 'lucide-react';

export default function KioskLoginScreen({
  staffList = [],
  selectedStaff,
  onSelectStaff,
  pin,
  setPin,
  onLogin,
  loading,
  error,
  networkStatus
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = staffList.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Numpad input handler
  const handleNumClick = (val) => {
    if (pin.length < 6) {
      setPin(pin + val);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Header Card */}
      <div className="text-center mb-5">
        <h2 className="text-2xl font-black text-white tracking-tight">Masuk Absensi</h2>
        <p className="text-xs text-slate-400 mt-1">
          Terminal bersama: Pilih nama Anda dan masukkan PIN Rahasia
        </p>

        {/* Network status pill in Bahasa Indonesia */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mt-2.5 border bg-slate-900 border-slate-800">
          {networkStatus?.isMatch ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Wi-Fi Outlet Terhubung</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400">Jaringan Luar / Data Seluler</span>
            </>
          )}
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md space-y-5">
        {/* 1. Pilih Karyawan */}
        <div>
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
            1. Nama Karyawan
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-2xl p-3.5 text-left flex items-center justify-between transition focus:ring-2 focus:ring-emerald-500"
            >
              {selectedStaff ? (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                    {selectedStaff.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-white">{selectedStaff.name}</div>
                    <div className="text-xs text-slate-400">
                      {selectedStaff.role} • <span className="text-emerald-400">{selectedStaff.department}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400 flex items-center space-x-2 py-1">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>Sentuh untuk memilih nama Anda...</span>
                </div>
              )}
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-64 flex flex-col">
                <div className="p-2.5 border-b border-slate-800 bg-slate-950">
                  <input
                    type="text"
                    placeholder="Ketik cari nama..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto divide-y divide-slate-800/60">
                  {filteredStaff.map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => {
                        onSelectStaff(staff);
                        setDropdownOpen(false);
                        setPin('');
                      }}
                      className={`w-full p-3 text-left flex items-center justify-between hover:bg-slate-800 transition ${
                        selectedStaff?.id === staff.id ? 'bg-emerald-500/15' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs border border-slate-700">
                          {staff.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{staff.name}</div>
                          <div className="text-[11px] text-slate-400">{staff.role} • {staff.department}</div>
                        </div>
                      </div>
                      {selectedStaff?.id === staff.id && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. PIN Display Dots */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              2. PIN Rahasia (4-6 Digit)
            </label>
            {pin.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold text-rose-400 hover:underline"
              >
                Hapus Semua
              </button>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl py-3.5 px-4 flex items-center justify-center space-x-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  pin.length > idx
                    ? 'bg-emerald-400 shadow-md shadow-emerald-400/50 scale-110'
                    : 'border-2 border-slate-700 bg-slate-900'
                }`}
              />
            ))}
            {pin.length > 4 && (
              <span className="text-xs font-mono text-emerald-400 font-bold">
                (+{pin.length - 4})
              </span>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 3. Numeric Numpad */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleNumClick(String(num))}
              className="h-14 bg-slate-950/80 hover:bg-slate-800 active:bg-emerald-600 text-white active:text-slate-950 text-xl font-bold rounded-2xl border border-slate-800 shadow-sm transition active:scale-95 flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 bg-slate-950/50 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-2xl border border-slate-800 transition active:scale-95 flex items-center justify-center"
          >
            BERSIHKAN
          </button>
          <button
            type="button"
            onClick={() => handleNumClick('0')}
            className="h-14 bg-slate-950/80 hover:bg-slate-800 active:bg-emerald-600 text-white active:text-slate-950 text-xl font-bold rounded-2xl border border-slate-800 shadow-sm transition active:scale-95 flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 bg-slate-950/50 hover:bg-slate-800 text-slate-400 hover:text-white text-xl rounded-2xl border border-slate-800 transition active:scale-95 flex items-center justify-center"
            title="Hapus digit terakhir"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* 4. Large Action Submit Button */}
        <button
          type="button"
          onClick={onLogin}
          disabled={!selectedStaff || pin.length < 4 || loading}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-2xl text-base shadow-xl shadow-emerald-500/25 transition active:scale-[0.98] flex items-center justify-center space-x-2"
        >
          <span>{loading ? 'Memverifikasi...' : 'MASUK'}</span>
        </button>
      </div>

      <p className="text-center text-[11px] text-slate-500 mt-4">
        Terminal Bersama • Akun otomatis keluar setelah absensi
      </p>
    </div>
  );
}
