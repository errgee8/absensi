import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Clock, CheckCircle2, Flame, Heart, ArrowRight } from 'lucide-react';
import { formatWitaTimeOnly, formatDuration } from '../../utils/time';
import { getStreakTier } from '../../utils/streakFrames';

const GEN_Z_AFFIRMATIONS = [
  {
    quote: 'Gila, kamu keren banget hari ini! Shift kelar dengan rapih, vibe positif kamu beneran nular ke seluruh tim. Rest well ya, kamu berhak dapet istirahat terbaik! ✨',
    author: 'Words of Affirmation 💖'
  },
  {
    quote: 'Slay all day! Capek ya? Tapi kerja keras dan ketelitian kamu hari ini juara banget. Bangga banget punya rekan kerja sehebat kamu. Recharge energimu ya bestie! 🔋✨',
    author: 'Self Care Reminder 🌸'
  },
  {
    quote: 'Kerja bagus banget hari ini! Apapun dinamika di operasional tadi, kamu handle dengan super tenang dan solutif. You did really amazing! 🌟',
    author: 'High Five 🙌'
  },
  {
    quote: 'Shift cleared with zero drama! Bukti nyata dedikasi dan profesionalitas kamu. Pulang dengan kepala tegak, kamu luar biasa hari ini! 🛋️✨',
    author: 'Big Cheers 🎉'
  },
  {
    quote: 'Terima kasih udah ngasih 100% energi hari ini! Effort dan senyum kamu bikin outlet kita jauh lebih hidup. You are deeply appreciated! 🌸💖',
    author: 'Appreciation Note 💌'
  },
  {
    quote: 'Hard work hits different when you do it with heart. Terima kasih udah jadi pilar penting buat kelancaran tim kita. Istirahat yang nyenyak ya! 🌙✨',
    author: 'Team Support 🤝'
  },
  {
    quote: 'Kamu udah lewatin shift ini dengan tangguh banget. Jangan lupa apresiasi diri sendiri ya, kamu udah lakuin yang terbaik hari ini! 🔥👏',
    author: 'Pride & Joy 👑'
  },
  {
    quote: 'Operasional lancar berkat kerja cerdas kamu. Proud of you! Sekarang saatnya me-time, makan yang enak, dan istirahat maksimal! 🍕🎮',
    author: 'Me-Time Pass 🛋️'
  },
  {
    quote: 'Energi dan ketulusan kamu hari ini sangat berharga buat semua orang. You are stronger and more awesome than you think! Selamat santai! 🚀',
    author: 'Good Vibes Only 🌈'
  },
  {
    quote: 'Another shift cleared, another victory! Terima kasih udah selalu konsisten. Tidur yang cukup ya, besok kita buat hari yang lebih seru lagi! 💫',
    author: 'Tomorrow Awaits ☀️'
  }
];

export default function ShiftClearedModal({
  shift,
  streak = 0,
  durationMinutes = 0,
  onClose
}) {
  const [affirmation] = useState(() => {
    const idx = Math.floor(Math.random() * GEN_Z_AFFIRMATIONS.length);
    return GEN_Z_AFFIRMATIONS[idx];
  });

  useEffect(() => {
    // Multi-stage festive celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      const timer1 = setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
      }, 250);

      const timer2 = setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 400);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } catch {}
  }, []);

  if (!shift) return null;

  const streakTier = getStreakTier(streak);
  const durMins = durationMinutes || shift.duration_minutes || 0;
  const isLate = (shift.flags || []).some(f => String(f).includes('Late') || String(f).includes('LATE'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#151923] border border-white/15 rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 text-center shadow-2xl relative overflow-hidden my-auto">
        {/* Playful Ambient Background Radiance */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-gradient-to-br from-amber-500/20 to-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Celebration Badge */}
        <div className="relative inline-block mb-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/25 to-cyan-500/20 text-emerald-300 mx-auto flex items-center justify-center border border-emerald-400/40 shadow-xl shadow-emerald-500/20 animate-bounce">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <span className="absolute -bottom-1 -right-1 text-lg">🎉</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Shift Cleared! ✨
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Absensi pulang tercatat sempurna. Good job today!
        </p>

        {/* Shift Summary Bento Card */}
        <div className="grid grid-cols-2 gap-2 mt-4 text-left">
          {/* Card 1: Durasi Kerja */}
          <div className="bg-[#1c2230] border border-white/10 rounded-2xl p-3 shadow-inner">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Durasi Shift</span>
            </div>
            <div className="text-base sm:text-lg font-black text-white mt-1 leading-none font-mono">
              {formatDuration(durMins)}
            </div>
            <div className="text-[9.5px] text-slate-400 mt-1">
              Out: {formatWitaTimeOnly(shift.checkout_time || new Date())} WITA
            </div>
          </div>

          {/* Card 2: Streak Status */}
          <div className="bg-[#1c2230] border border-white/10 rounded-2xl p-3 shadow-inner">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Streak On-Time</span>
            </div>
            <div className={`text-base sm:text-lg font-black mt-1 leading-none flex items-center gap-1 ${streakTier.textGlow}`}>
              <span>🔥</span>
              <span>{streak} Hari</span>
            </div>
            <div className="text-[9.5px] text-amber-300/80 mt-1 truncate">
              {streakTier.shortLabel}
            </div>
          </div>
        </div>

        {/* On-Time Verification Pill */}
        <div className="mt-2 py-1.5 px-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between text-left text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ketepatan Waktu:</span>
          </span>
          <span className={`text-[11px] font-extrabold ${isLate ? 'text-amber-400' : 'text-emerald-300'}`}>
            {isLate ? 'Catatan Terlambat' : 'Tepat Waktu ✓'}
          </span>
        </div>

        {/* Word of Affirmation Quote Box (Gen Z Uplifting & Authentic) */}
        <div className="mt-3.5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-[#1c2235] to-purple-950/50 border border-indigo-400/30 text-left relative overflow-hidden shadow-lg">
          <div className="flex items-center gap-1.5 text-[10.5px] font-black text-indigo-300 uppercase tracking-wider mb-1.5">
            <Heart className="w-3 h-3 text-pink-400 fill-pink-400/30" />
            <span>{affirmation.author}</span>
          </div>
          <p className="text-xs sm:text-[12.5px] text-slate-200 leading-relaxed font-medium italic">
            "{affirmation.quote}"
          </p>
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm transition-all duration-200 shadow-xl shadow-emerald-500/25 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Selesai &amp; Istirahat Sekarang ✨</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
