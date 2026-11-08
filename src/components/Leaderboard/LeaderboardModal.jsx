import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Camera,
  Flame,
  Info,
  Building2,
  Columns,
  Eye,
  Coffee
} from 'lucide-react';

// Reusable Elegant Framed Avatar Component with Fallback
function StaffAvatarFrame({ photo, name, rank, size = 'md' }) {
  const [imgError, setImgError] = useState(false);

  // Frame styles based on rank
  let ringClasses = 'ring-2 ring-slate-700 border border-slate-600';
  let badgeColor = 'bg-slate-700 text-slate-200';
  let crownColor = null;

  if (rank === 1) {
    ringClasses = 'ring-4 ring-amber-400 shadow-xl shadow-amber-500/40 border-2 border-yellow-200 bg-gradient-to-br from-amber-400 via-yellow-200 to-amber-600 p-0.5';
    badgeColor = 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black border border-white';
    crownColor = 'text-amber-300 fill-amber-300';
  } else if (rank === 2) {
    ringClasses = 'ring-3 ring-slate-300 shadow-lg shadow-slate-400/20 border-2 border-white bg-gradient-to-br from-slate-200 via-white to-slate-400 p-0.5';
    badgeColor = 'bg-slate-300 text-slate-950 font-black border border-white';
  } else if (rank === 3) {
    ringClasses = 'ring-3 ring-amber-600 shadow-lg shadow-amber-700/25 border-2 border-amber-400 bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-800 p-0.5';
    badgeColor = 'bg-amber-700 text-white font-black border border-amber-400';
  }

  const dimensions =
    size === 'xl'
      ? 'w-18 h-18 sm:w-20 sm:h-20'
      : size === 'lg'
      ? 'w-14 h-14 sm:w-16 sm:h-16'
      : 'w-11 h-11';

  return (
    <div className="relative inline-block shrink-0">
      {/* Animated Crown for Rank 1 */}
      {crownColor && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 animate-bounce pointer-events-none">
          <Crown className={`w-6 h-6 sm:w-7 sm:h-7 ${crownColor} drop-shadow-md`} />
        </div>
      )}

      {/* Elegant Portrait Frame */}
      <div className={`${dimensions} rounded-2xl ${ringClasses} overflow-hidden relative flex items-center justify-center bg-slate-950 transition-transform duration-200 hover:scale-105`}>
        {photo && !imgError ? (
          <img
            src={photo}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover rounded-xl"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-black text-white text-base sm:text-xl bg-gradient-to-br from-slate-800 to-slate-900">
            {name?.charAt(0)?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Rank Badge Indicator */}
      <span
        className={`absolute -bottom-2 -right-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shadow-md z-10 flex items-center justify-center ${badgeColor}`}
      >
        #{rank}
      </span>
    </div>
  );
}

// Side-by-Side Column Component for either Attendance or Toilet Leaderboard
function LeaderboardColumn({
  title,
  subtitle,
  icon: HeaderIcon,
  themeColor = 'amber', // 'amber' | 'blue'
  list = [],
  type = 'attendance' // 'attendance' | 'toilet'
}) {
  const top1 = list[0];
  const top2 = list[1];
  const top3 = list[2];
  const restList = list.slice(3, 5); // Rank 4 & 5

  const isAttendance = type === 'attendance';

  const themeGradient =
    themeColor === 'amber'
      ? 'from-amber-400 via-yellow-300 to-amber-500'
      : 'from-cyan-400 via-sky-300 to-blue-500';

  const headerBorder =
    themeColor === 'amber' ? 'border-amber-500/30' : 'border-cyan-500/30';

  return (
    <div className="bg-slate-950/80 border-2 border-slate-800/90 hover:border-slate-700/80 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-xl relative overflow-hidden backdrop-blur-sm">
      
      {/* Top ambient column glow */}
      <div
        className={`absolute top-0 right-0 w-60 h-32 bg-gradient-to-b ${
          themeColor === 'amber' ? 'from-amber-500/10' : 'from-cyan-500/10'
        } to-transparent blur-2xl pointer-events-none`}
      />

      <div>
        {/* Column Header */}
        <div className={`flex items-center justify-between pb-3.5 mb-4 border-b ${headerBorder}`}>
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${themeGradient} flex items-center justify-center text-slate-950 shadow-md shrink-0`}
            >
              <HeaderIcon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center space-x-1.5">
                <span>{title}</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-bold">{subtitle}</p>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              themeColor === 'amber'
                ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                : 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30'
            }`}
          >
            Top 5
          </span>
        </div>

        {list.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Belum ada data tercatat untuk kolom ini.
          </div>
        ) : (
          <>
            {/* MINI PODIUM (Top 3) */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3 sm:p-4 mb-4">
              <div className="grid grid-cols-3 gap-2 items-end pt-3">
                
                {/* #2 SILVER (Kiri) */}
                {top2 ? (
                  <div className="flex flex-col items-center text-center">
                    <StaffAvatarFrame
                      photo={top2.photo_url}
                      name={top2.name}
                      rank={2}
                      size="lg"
                    />
                    <h4 className="text-xs font-black text-white truncate max-w-full mt-2">
                      {top2.name}
                    </h4>
                    <span className="text-[9px] text-slate-400 font-bold truncate max-w-full">
                      {top2.role}
                    </span>
                    <div className="mt-1.5 w-full py-1.5 px-1 bg-slate-950/80 rounded-xl border border-slate-800 text-[10px]">
                      <span className="block font-mono font-black text-slate-200">
                        {top2.score} Pts
                      </span>
                      <span className="text-slate-400 text-[8px] sm:text-[9px] block">
                        {isAttendance
                          ? `${top2.total_days}h • Tlt ${top2.total_late_minutes}m`
                          : `${top2.total_inspections}x Cek (${top2.pass_rate}%)`}
                      </span>
                    </div>
                  </div>
                ) : <div />}

                {/* #1 GOLD (Tengah - Elevated) */}
                {top1 ? (
                  <div className="flex flex-col items-center text-center -translate-y-2">
                    <StaffAvatarFrame
                      photo={top1.photo_url}
                      name={top1.name}
                      rank={1}
                      size="xl"
                    />
                    <h4 className="text-xs sm:text-sm font-black text-amber-200 truncate max-w-full mt-2">
                      {top1.name}
                    </h4>
                    <span className="text-[9px] text-amber-300/80 font-bold truncate max-w-full">
                      {top1.role} • {top1.venue}
                    </span>
                    <div className="mt-1.5 w-full py-2 px-1 bg-gradient-to-b from-amber-500/20 to-slate-950 rounded-xl border-2 border-amber-400/60 shadow-md text-[10px]">
                      <span className="block font-mono font-black text-amber-300 text-xs sm:text-sm">
                        {top1.score} POIN
                      </span>
                      <span className="text-slate-300 text-[9px] font-bold block mt-0.5">
                        {isAttendance
                          ? `${top1.total_days}/26 Hari • Tlt ${top1.total_late_minutes}m ${top1.late_seconds_remainder}s`
                          : `${top1.total_inspections}x Inspeksi (${top1.pass_rate}%)`}
                      </span>
                      {isAttendance && top1.early_bird_30m_count > 0 && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-200 text-[8px] font-black">
                          ⚡ Awal: {top1.early_bird_30m_count}x
                        </span>
                      )}
                    </div>
                  </div>
                ) : <div />}

                {/* #3 BRONZE (Kanan) */}
                {top3 ? (
                  <div className="flex flex-col items-center text-center">
                    <StaffAvatarFrame
                      photo={top3.photo_url}
                      name={top3.name}
                      rank={3}
                      size="lg"
                    />
                    <h4 className="text-xs font-black text-white truncate max-w-full mt-2">
                      {top3.name}
                    </h4>
                    <span className="text-[9px] text-slate-400 font-bold truncate max-w-full">
                      {top3.role}
                    </span>
                    <div className="mt-1.5 w-full py-1.5 px-1 bg-slate-950/80 rounded-xl border border-slate-800 text-[10px]">
                      <span className="block font-mono font-black text-amber-400">
                        {top3.score} Pts
                      </span>
                      <span className="text-slate-400 text-[8px] sm:text-[9px] block">
                        {isAttendance
                          ? `${top3.total_days}h • Tlt ${top3.total_late_minutes}m`
                          : `${top3.total_inspections}x Cek (${top3.pass_rate}%)`}
                      </span>
                    </div>
                  </div>
                ) : <div />}

              </div>
            </div>

            {/* RANK 4 & 5 CARDS */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                Kandidat Posisi #4 &amp; #5:
              </span>

              {restList.map((item) => (
                <div
                  key={item.staff_id || item.name}
                  className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-2.5 shadow-sm"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <StaffAvatarFrame
                      photo={item.photo_url}
                      name={item.name}
                      rank={item.rank}
                      size="sm"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h5 className="text-xs font-black text-white truncate">
                          {item.name}
                        </h5>
                        <span className="text-[9px] text-slate-400 font-bold hidden sm:inline">
                          • {item.role}
                        </span>
                      </div>

                      {isAttendance ? (
                        <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[9px] font-bold">
                          <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-900/60 font-mono">
                            📅 {item.total_days}/26h
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded border font-mono ${
                              item.total_late_seconds === 0
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-900/60'
                                : 'bg-rose-950 text-rose-300 border-rose-900/60'
                            }`}
                          >
                            ⏱️ {item.total_late_seconds === 0 ? 'Tepat Waktu' : `Telat ${item.total_late_minutes}m`}
                          </span>
                          {item.early_bird_30m_count > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-900/60 font-mono">
                              ⚡ Awal {item.early_bird_30m_count}x
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[9px] font-bold">
                          <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-900/60 font-mono">
                            🧹 {item.total_inspections}x
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-900/60 font-mono">
                            ✓ {item.pass_rate}% Pass
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-black font-mono text-amber-300 block">
                      {item.score}
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-black">
                      Poin
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Rules Mini Footer */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between font-bold">
        <span>{isAttendance ? 'Target: 26 Hari Kerja Maksimal' : '10 Poin Tiap Checklist Sukses'}</span>
        <span className="text-amber-300/80">{isAttendance ? 'Presisi Detik & Menit' : 'Wajib Lampirkan Foto'}</span>
      </div>
    </div>
  );
}

// Special 1-Person Spotlight: Zona Butuh Semangat / Wake-Up Call Zone
function NeedsImprovementSpotlight({ staff }) {
  const [imgError, setImgError] = useState(false);
  if (!staff) return null;

  return (
    <div className="rounded-3xl border-2 border-dashed border-amber-400/80 bg-gradient-to-r from-purple-950/70 via-slate-950/90 to-rose-950/60 p-4 sm:p-5 relative overflow-hidden shadow-2xl">
      
      {/* Playful background ambient glow */}
      <div className="absolute top-0 right-10 w-52 h-28 bg-purple-600/20 blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        
        {/* Left: Funny Avatar Frame with Zombie/Sleepy Effect */}
        <div className="flex items-center space-x-4">
          <div className="relative inline-block shrink-0 anim-zombie">
            
            {/* Funny Floating Zombie / Sleepy Badges */}
            <div className="absolute -top-3 -left-2 z-20 bg-slate-950/95 border-2 border-amber-400 rounded-full px-2 py-0.5 text-xs shadow-lg font-black flex items-center space-x-1">
              <span>🧟‍♂️</span>
              <span className="text-[9px] text-amber-300 tracking-wider">ZOMBIE</span>
            </div>
            
            <div className="absolute -bottom-2 -right-2 z-20 bg-purple-900 border-2 border-purple-400 rounded-full px-2 py-0.5 text-xs shadow-lg font-black">
              <span>💤 😭</span>
            </div>

            {/* Quirky Wobbly Avatar Frame */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl ring-4 ring-purple-500/70 border-2 border-dashed border-amber-400 overflow-hidden relative bg-slate-950 shadow-2xl flex items-center justify-center">
              {staff.photo_url && !imgError ? (
                <img
                  src={staff.photo_url}
                  alt={staff.name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover filter contrast-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-2xl text-purple-300 bg-slate-900">
                  {staff.name?.charAt(0)}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/25 text-rose-300 border border-rose-500/40 flex items-center space-x-1 shadow-sm">
                <span>☕ ZONA BUTUH NGOPI (WAKE-UP CALL)</span>
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {staff.venue} • {staff.division}
              </span>
            </div>
            
            <h4 className="text-base sm:text-lg font-black text-white mt-1">
              {staff.name} <span className="text-xs text-slate-400 font-bold">({staff.role})</span>
            </h4>
            
            <p className="text-xs text-amber-300/90 font-bold mt-0.5">
              "Paling butuh kopi &amp; semangat bulan ini! Yuk bangkit, datang lebih awal, dan keluar dari zona ini!" ⚡
            </p>
          </div>
        </div>

        {/* Right: Metrics Chips & Motivational Callout */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto text-center">
            
            <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase font-black">Hari Kerja</span>
              <span className="font-mono font-black text-rose-400 text-xs sm:text-sm">
                {staff.total_days} / 26h
              </span>
            </div>

            <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase font-black">Total Telat</span>
              <span className="font-mono font-black text-rose-400 text-xs sm:text-sm">
                {staff.total_late_minutes}m
              </span>
            </div>

            <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase font-black">Pulang Awal</span>
              <span className="font-mono font-black text-rose-400 text-xs sm:text-sm">
                {staff.early_checkout_count}x
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Motivational Bottom Bar */}
      <div className="mt-3.5 pt-2.5 border-t border-purple-500/30 text-[11px] text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-bold">
        <span className="text-purple-300/90 flex items-center space-x-1.5">
          <span>🎯</span>
          <span>Bukan untuk mencela, tapi bahan evaluasi diri agar besok bisa datang 15 menit lebih awal dan raih bonus!</span>
        </span>
        <span className="text-amber-300 font-black">Target: Keluar dari Zona Zombie! 🚀</span>
      </div>
    </div>
  );
}

export default function LeaderboardModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error('Gagal mengambil data peringkat.');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Terjadi kesalahan saat memuat leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const period = data?.period;
  const attendanceList = data?.attendance || [];
  const toiletList = data?.toilet || [];
  const needsImprovementStaff = data?.needsImprovement;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      
      {/* Festive & Zombie CSS Keyframe Styles */}
      <style>{`
        @keyframes festive-float {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.8; }
          50% { transform: translateY(-12px) rotate(15deg); opacity: 1; }
          100% { transform: translateY(0px) rotate(0deg); opacity: 0.8; }
        }
        @keyframes festive-shimmer {
          0% { opacity: 0.3; transform: scale(0.95); }
          50% { opacity: 0.9; transform: scale(1.05); }
          100% { opacity: 0.3; transform: scale(0.95); }
        }
        @keyframes zombie-wobble {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
          75% { transform: rotate(-2deg); }
          100% { transform: rotate(0deg); }
        }
        .anim-float { animation: festive-float 3s ease-in-out infinite; }
        .anim-float-delay { animation: festive-float 3.5s ease-in-out 1.2s infinite; }
        .anim-shimmer { animation: festive-shimmer 2.5s ease-in-out infinite; }
        .anim-zombie { animation: zombie-wobble 4s ease-in-out infinite; }
      `}</style>

      <div className="bg-slate-900 border-2 border-amber-400/40 rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl shadow-amber-500/10 flex flex-col max-h-[94vh] text-white relative">
        
        {/* Festive Ambient Background Accents */}
        <div className="absolute top-0 left-1/4 w-80 h-32 bg-amber-500/15 blur-3xl pointer-events-none anim-shimmer" />
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-cyan-500/15 blur-3xl pointer-events-none anim-shimmer" />

        {/* Modal Top Header - Festive Gold & Obsidian */}
        <div className="p-4 sm:p-5 border-b border-amber-500/25 bg-slate-950/95 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 shrink-0 anim-float">
              <Trophy className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent flex items-center space-x-1.5">
                  <span>LEADERBOARD STAF TERAJIN</span>
                  <span className="anim-float-delay">✨</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Real-Time MTD</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Penentuan Bonus Prestasi Bulanan: <strong className="text-white">{period?.monthName || 'Bulan Berjalan'} (1 - {period?.endDate?.split('-')[2] || '30'})</strong>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <div className="hidden sm:flex items-center space-x-1 text-[11px] font-black text-amber-300/80 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-amber-500/20">
              <Columns className="w-3.5 h-3.5 text-amber-400" />
              <span>Side-by-Side View</span>
            </div>

            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition shadow-sm disabled:opacity-50"
              title="Perbarui Data Real-time"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shadow-sm"
              title="Tutup"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body: 2 Columns Side by Side + Zombie Spotlight */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-5 custom-scrollbar">

          {loading && !data && (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-300">
                Menghitung skor poin, akurasi menit/detik, dan foto selfie absensi staf...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-950/40 border-2 border-rose-500/50 rounded-2xl text-rose-300 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {!loading && data && (
            <>
              {/* SIDE BY SIDE 2-COLUMN GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                
                {/* COLUMN 1: KEDISIPLINAN ABSENSI (TOP 5) */}
                <LeaderboardColumn
                  title="1. Kedisiplinan Absensi"
                  subtitle="Paling sedikit telat & hari kerja terbanyak (maks 26h)"
                  icon={Clock}
                  themeColor="amber"
                  list={attendanceList}
                  type="attendance"
                />

                {/* COLUMN 2: INSPEKSI TOILET (TOP 5) */}
                <LeaderboardColumn
                  title="2. Inspeksi Toilet QR"
                  subtitle="Paling rajin merawat kebersihan toilet harian"
                  icon={Sparkles}
                  themeColor="blue"
                  list={toiletList}
                  type="toilet"
                />

              </div>

              {/* SPECIAL 1-PERSON SPOTLIGHT: ZONA BUTUH NGOPI / WAKE-UP CALL ZONE */}
              {needsImprovementStaff && (
                <NeedsImprovementSpotlight staff={needsImprovementStaff} />
              )}

              {/* Informative Fair Play Footer Banner */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-slate-900 border border-amber-400/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300 font-bold">
                <div className="flex items-center space-x-2 text-amber-300 font-black">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Kriteria Penilaian Bonus:</span>
                </div>
                <div className="text-[11px] text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                  <span>📅 Kehadiran Maks 26 Hari</span>
                  <span>⏱️ Akurasi Hitungan Menit &amp; Detik</span>
                  <span>⚡ Poin Tambahan Datang 30m Awal</span>
                  <span>📸 Bukti Foto Terverifikasi</span>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Bottom Close Button */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white font-black text-xs uppercase tracking-wider transition border border-slate-600 shadow-md"
          >
            Tutup Leaderboard
          </button>
        </div>

      </div>
    </div>
  );
}
