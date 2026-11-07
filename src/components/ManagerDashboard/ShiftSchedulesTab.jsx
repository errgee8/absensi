import React, { useState, useEffect } from 'react';
import { Clock, Edit2, Save, X, Coffee, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { getShiftSchedules, updateShiftSchedule } from '../../utils/api';

export default function ShiftSchedulesTab() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Edit form state
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isFlexible, setIsFlexible] = useState(false);
  const [allowsBreak, setAllowsBreak] = useState(false);
  const [maxBreakEnd, setMaxBreakEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await getShiftSchedules();
      setSchedules(data);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleStartEdit = (sched) => {
    setEditingId(sched.id);
    setStartTime(sched.start_time);
    setEndTime(sched.end_time);
    setIsFlexible(Boolean(sched.is_flexible_checkout));
    setAllowsBreak(Boolean(sched.allows_break));
    setMaxBreakEnd(sched.max_break_end || '');
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await updateShiftSchedule(id, {
        start_time: startTime,
        end_time: endTime,
        is_flexible_checkout: isFlexible ? 1 : 0,
        allows_break: allowsBreak ? 1 : 0,
        max_break_end: maxBreakEnd || null
      });

      setEditingId(null);
      setSuccessMsg('Shift timing successfully updated!');
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadSchedules();
    } catch (err) {
      alert('Error updating schedule: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Group by venue
  const jpKaraokeSchedules = schedules.filter((s) => s.venue === 'JP Karaoke');
  const luckyCatSchedules = schedules.filter((s) => s.venue === 'LuckyCat');

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <span>Shift Schedule & Timing Configuration</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage operational shift timings, flexible checkout allowances, and break time windows.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. JP Karaoke Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              JP Karaoke (3 Divisions • Strict No-Break Policy)
            </h4>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            No Break Allowed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Division</th>
                <th className="py-2.5 px-3">Shift Name</th>
                <th className="py-2.5 px-3">Start Time</th>
                <th className="py-2.5 px-3">End Time</th>
                <th className="py-2.5 px-3">Checkout Mode</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {jpKaraokeSchedules.map((sched) => {
                const isEditing = editingId === sched.id;
                return (
                  <tr key={sched.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-white">{sched.division}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {sched.name}
                      </span>
                    </td>

                    {/* Start Time */}
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {isEditing ? (
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                        />
                      ) : (
                        sched.start_time
                      )}
                    </td>

                    {/* End Time */}
                    <td className="py-3 px-3 font-mono font-bold text-indigo-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          placeholder="e.g. 22:00 or 03:00"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs w-28"
                        />
                      ) : (
                        sched.end_time
                      )}
                    </td>

                    {/* Checkout Mode */}
                    <td className="py-3 px-3 text-[11px]">
                      {isEditing ? (
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isFlexible}
                            onChange={(e) => setIsFlexible(e.target.checked)}
                            className="accent-indigo-500"
                          />
                          <span className="text-slate-300">Flexible Checkout (Late night)</span>
                        </label>
                      ) : sched.is_flexible_checkout ? (
                        <span className="text-amber-400 font-semibold">Flexible (Whenever checkout)</span>
                      ) : (
                        <span className="text-slate-400">Fixed Scheduled</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSaveEdit(sched.id)}
                            disabled={saving}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{saving ? 'Saving...' : 'Save'}</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(sched)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center space-x-1 ml-auto"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. LuckyCat Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              LuckyCat (Bar, Cashier, Server & Kitchen • 1-Hr Break Policy)
            </h4>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
            1-Hour Break Allowed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Division</th>
                <th className="py-2.5 px-3">Shift Name</th>
                <th className="py-2.5 px-3">Start Time</th>
                <th className="py-2.5 px-3">End Time</th>
                <th className="py-2.5 px-3">Max Break End</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {luckyCatSchedules.map((sched) => {
                const isEditing = editingId === sched.id;
                return (
                  <tr key={sched.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-white">{sched.division}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {sched.name}
                      </span>
                    </td>

                    {/* Start Time */}
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {isEditing ? (
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                        />
                      ) : (
                        sched.start_time
                      )}
                    </td>

                    {/* End Time */}
                    <td className="py-3 px-3 font-mono font-bold text-indigo-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          placeholder="e.g. 19:00 or To be set later"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs w-36"
                        />
                      ) : (
                        sched.end_time
                      )}
                    </td>

                    {/* Max Break End Window */}
                    <td className="py-3 px-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={maxBreakEnd}
                          onChange={(e) => setMaxBreakEnd(e.target.value)}
                          placeholder="e.g. 16:00 or 01:00"
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-amber-400 font-mono text-xs w-28"
                        />
                      ) : sched.max_break_end ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                          Max Break End: {sched.max_break_end}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSaveEdit(sched.id)}
                            disabled={saving}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{saving ? 'Saving...' : 'Save'}</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(sched)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center space-x-1 ml-auto"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
