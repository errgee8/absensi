import React, { useState } from 'react';
import { User, Lock, ChevronDown, Check, Briefcase, Clock } from 'lucide-react';

export default function StaffSelector({
  staffList = [],
  selectedStaff,
  onSelectStaff,
  pin,
  setPin
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = staffList.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
          <User className="w-3.5 h-3.5 text-emerald-400" />
          <span>Select Staff Member</span>
        </label>
        {selectedStaff && (
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {selectedStaff.id}
          </span>
        )}
      </div>

      {/* Staff Selector Dropdown / Card */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-xl p-3 text-left flex items-center justify-between transition focus:ring-2 focus:ring-emerald-500/50"
        >
          {selectedStaff ? (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-slate-950 font-bold flex items-center justify-center text-sm shadow-md">
                {selectedStaff.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{selectedStaff.name}</div>
                <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                  <span>{selectedStaff.role}</span>
                  <span>•</span>
                  <span className="text-emerald-400">{selectedStaff.department}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400 flex items-center space-x-2">
              <span>Choose your name from roster...</span>
            </div>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-72 flex flex-col">
            <div className="p-2 border-b border-slate-800">
              <input
                type="text"
                placeholder="Search staff name or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                  }}
                  className={`w-full p-2.5 text-left flex items-center justify-between hover:bg-slate-800/80 transition ${
                    selectedStaff?.id === staff.id ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs border border-slate-700">
                      {staff.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{staff.name}</div>
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

      {/* Staff Scheduled Shift & Security PIN */}
      {selectedStaff && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2.5 text-xs">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Scheduled Shift</span>
              <span className="font-semibold text-slate-200">
                {selectedStaff.shift_start} - {selectedStaff.shift_end} ({selectedStaff.standard_hours}h)
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Staff PIN (e.g. 1001)</span>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4-digit PIN"
                className="w-full bg-transparent text-xs font-mono font-bold text-emerald-400 placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
