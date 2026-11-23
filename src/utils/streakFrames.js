/**
 * Streak-Based Unlockable Avatar Frames + Exclusive VIP Owner Frame
 * All 8 Ultra-Clean HD Fantasy Animal & Creature Avatar Frames:
 * - 0 - 2 streak : Standard Clean border
 * - 3 - 6 streak : 🐸 Cute Spring Frog Frame (Starter Streak)
 * - 7 - 13 streak: 🦊 Sunny Autumn Fox Frame
 * - 14 - 20 streak: 🐱 Sweet White Neko Bell Frame
 * - 21 - 29 streak: 💖 Pink Angelic Heart Frame
 * - 30 - 44 streak: 💜 Lavender Celestial Angel Frame
 * - 45 - 59 streak: 🧙 Midnight Sorcerer Witch Frame
 * - 60 - 89 streak: 🐾 Cyber Shadow Neko Frame
 * - 90+ streak   : 👑 Imperial Celestial Winged Crown Frame (Legendaris & VIP)
 */

export function isVipStaff(staff) {
  if (!staff) return false;
  const name = String(staff.name || '').trim().toLowerCase();
  const pin = String(staff.pin || '').trim();
  const id = String(staff.id || '').trim();
  const uuid = String(staff.uuid || '').trim();
  return (
    name === 'ryan gerrit' ||
    name.includes('ryan gerrit') ||
    pin === '8894' ||
    id === 'JP-MAN-5613695' ||
    uuid === 'ed5f6cd5-9564-490a-b2b0-bfae2cc21379'
  );
}

export function getStreakTier(streakCount = 0, isVip = false) {
  if (isVip) {
    return {
      tier: 8,
      isVip: true,
      frameId: 'winged_crown',
      frameImg: '/streak-frames/winged_crown.png',
      name: 'Imperial Celestial Winged Crown (VIP)',
      label: '👑 VIP Executive Owner',
      shortLabel: '👑 VIP Owner',
      badge: '👑',
      vipLogo: 'VIP',
      minStreak: 0,
      hasCrown: true,
      crownColor: 'text-yellow-300 fill-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,1)]',
      nameGold: true,
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] font-black',
      ringClasses: 'ring-3 ring-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.8)] border border-yellow-200',
      badgeClasses: 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 shadow-xl shadow-amber-400/80 border border-white font-black',
      textGlow: 'text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]',
      pillBg: 'bg-gradient-to-r from-amber-400/30 via-yellow-400/25 to-amber-500/30 border-2 border-amber-300/80 text-amber-200 shadow-lg shadow-amber-950/60 font-black'
    };
  }

  const streak = Math.max(0, parseInt(streakCount, 10) || 0);

  // 90+ Streak: Imperial Celestial Winged Crown (Legendaris)
  if (streak >= 90) {
    return {
      tier: 8,
      frameId: 'winged_crown',
      frameImg: '/streak-frames/winged_crown.png',
      name: 'Imperial Celestial Winged Crown',
      label: '👑 90+ Hari (Imperial Crown)',
      shortLabel: '👑 90+ Streak',
      badge: '👑',
      minStreak: 90,
      hasCrown: true,
      crownColor: 'text-yellow-200 fill-yellow-300 drop-shadow-[0_0_16px_rgba(250,204,21,1)] animate-bounce',
      nameGold: true,
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-400 drop-shadow-[0_0_14px_rgba(234,179,8,0.9)] font-black tracking-wide',
      ringClasses: 'ring-3 ring-yellow-300 border border-white shadow-[0_0_25px_rgba(234,179,8,0.85)]',
      badgeClasses: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200 text-slate-950 border border-yellow-100 font-black shadow-xl shadow-yellow-400',
      textGlow: 'text-yellow-200 drop-shadow-[0_0_12px_rgba(250,204,21,1)]',
      pillBg: 'bg-gradient-to-r from-yellow-400/40 via-amber-500/40 to-yellow-400/40 border-2 border-yellow-200 text-yellow-100 font-black shadow-xl shadow-amber-950/70'
    };
  }

  // 60 - 89 Streak: Cyber Shadow Neko
  if (streak >= 60) {
    return {
      tier: 7,
      frameId: 'cyber_cat',
      frameImg: '/streak-frames/cyber_cat.png',
      name: 'Cyber Shadow Neko',
      label: '🐾 60+ Hari (Shadow Neko)',
      shortLabel: '🐾 60+ Streak',
      badge: '🐾',
      minStreak: 60,
      hasCrown: true,
      crownColor: 'text-indigo-300 fill-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,1)]',
      nameGold: true,
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-purple-300 to-pink-300 font-black',
      ringClasses: 'ring-3 ring-indigo-500 border border-purple-400 shadow-[0_0_20px_rgba(99,102,241,0.7)]',
      badgeClasses: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border border-indigo-300 font-black shadow-lg shadow-indigo-500/60',
      textGlow: 'text-indigo-300 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]',
      pillBg: 'bg-indigo-950/40 border-2 border-indigo-500 text-indigo-200 font-black'
    };
  }

  // 45 - 59 Streak: Midnight Sorcerer Witch
  if (streak >= 45) {
    return {
      tier: 6,
      frameId: 'witch_hat',
      frameImg: '/streak-frames/witch_hat.png',
      name: 'Midnight Sorcerer Witch',
      label: '🧙 45+ Hari (Mystic Witch)',
      shortLabel: '🧙 45+ Streak',
      badge: '🧙',
      minStreak: 45,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white font-bold',
      ringClasses: 'ring-2 ring-purple-500 border border-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.6)]',
      badgeClasses: 'bg-gradient-to-r from-purple-700 to-indigo-800 text-white border border-purple-300 font-black shadow-md',
      textGlow: 'text-purple-300 drop-shadow-[0_0_7px_rgba(168,85,247,0.7)]',
      pillBg: 'bg-purple-950/30 border border-purple-500/50 text-purple-200 font-bold'
    };
  }

  // 30 - 44 Streak: Lavender Celestial Angel
  if (streak >= 30) {
    return {
      tier: 5,
      frameId: 'blue_angel',
      frameImg: '/streak-frames/blue_angel.png',
      name: 'Lavender Celestial Angel',
      label: '💜 30+ Hari (Celestial Angel)',
      shortLabel: '💜 30+ Streak',
      badge: '💜',
      minStreak: 30,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white font-bold',
      ringClasses: 'ring-2 ring-blue-400 border border-cyan-300 shadow-[0_0_16px_rgba(96,165,250,0.6)]',
      badgeClasses: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border border-blue-200 font-black shadow-md',
      textGlow: 'text-blue-300 drop-shadow-[0_0_6px_rgba(96,165,250,0.7)]',
      pillBg: 'bg-blue-500/20 border border-blue-400/40 text-blue-200 font-bold'
    };
  }

  // 21 - 29 Streak: Pink Angelic Heart
  if (streak >= 21) {
    return {
      tier: 4,
      frameId: 'pink_angel',
      frameImg: '/streak-frames/pink_angel.png',
      name: 'Pink Angelic Heart',
      label: '💖 21+ Hari (Pink Angel)',
      shortLabel: '💖 21+ Streak',
      badge: '💖',
      minStreak: 21,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white font-bold',
      ringClasses: 'ring-2 ring-pink-400 border border-rose-300 shadow-[0_0_15px_rgba(244,114,182,0.55)]',
      badgeClasses: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border border-pink-200 font-black shadow-md',
      textGlow: 'text-pink-300 drop-shadow-[0_0_6px_rgba(244,114,182,0.7)]',
      pillBg: 'bg-pink-500/20 border border-pink-400/40 text-pink-200 font-bold'
    };
  }

  // 14 - 20 Streak: Sweet White Neko Bell
  if (streak >= 14) {
    return {
      tier: 3,
      frameId: 'white_cat',
      frameImg: '/streak-frames/white_cat.png',
      name: 'Sweet White Neko Bell',
      label: '🐱 14+ Hari (White Neko)',
      shortLabel: '🐱 14+ Streak',
      badge: '🐱',
      minStreak: 14,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white font-bold',
      ringClasses: 'ring-2 ring-rose-300 border border-pink-200 shadow-[0_0_14px_rgba(253,164,175,0.5)]',
      badgeClasses: 'bg-gradient-to-r from-rose-400 to-pink-400 text-slate-950 border border-white font-black shadow-sm',
      textGlow: 'text-rose-200 drop-shadow-[0_0_5px_rgba(253,164,175,0.6)]',
      pillBg: 'bg-rose-400/20 border border-rose-300/40 text-rose-200 font-medium'
    };
  }

  // 7 - 13 Streak: Sunny Autumn Fox
  if (streak >= 7) {
    return {
      tier: 2,
      frameId: 'orange_fox',
      frameImg: '/streak-frames/orange_fox.png',
      name: 'Sunny Autumn Fox',
      label: '🦊 7+ Hari (Autumn Fox)',
      shortLabel: '🦊 7+ Streak',
      badge: '🦊',
      minStreak: 7,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white',
      ringClasses: 'ring-2 ring-amber-400 border border-orange-300 shadow-[0_0_12px_rgba(251,146,60,0.45)]',
      badgeClasses: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black border border-white/60 shadow-sm',
      textGlow: 'text-amber-300 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]',
      pillBg: 'bg-amber-500/15 border border-amber-500/30 text-amber-200 font-medium'
    };
  }

  // 3 - 6 Streak: Cute Spring Frog
  if (streak >= 3) {
    return {
      tier: 1,
      frameId: 'frog',
      frameImg: '/streak-frames/frog.png',
      name: 'Cute Spring Frog',
      label: '🐸 3+ Hari (Spring Frog)',
      shortLabel: '🐸 3+ Streak',
      badge: '🐸',
      minStreak: 3,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white',
      ringClasses: 'ring-2 ring-emerald-500/80 border border-cyan-400/60 shadow-[0_0_12px_rgba(16,185,129,0.35)]',
      badgeClasses: 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white border border-emerald-300 shadow-sm font-black',
      textGlow: 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]',
      pillBg: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium'
    };
  }

  // 0 - 2 Streak: Standard Clean Border
  return {
    tier: 0,
    frameId: null,
    frameImg: null,
    name: 'Standard Clean Border',
    label: '0-2 Hari',
    shortLabel: `${streak} Hari`,
    badge: null,
    minStreak: 0,
    hasCrown: false,
    nameGold: false,
    nameClass: 'text-white',
    ringClasses: 'border border-white/15',
    badgeClasses: 'bg-slate-700 text-slate-300',
    textGlow: 'text-slate-300',
    pillBg: 'bg-slate-800/60 border border-white/10 text-slate-300 font-medium'
  };
}

export function getNextStreakMilestone(currentStreak = 0) {
  const streak = Math.max(0, parseInt(currentStreak, 10) || 0);

  const milestones = [
    { target: 3, nextName: '🐸 Cute Spring Frog (3+ Hari)', currName: 'Standard Clean' },
    { target: 7, nextName: '🦊 Sunny Autumn Fox (7+ Hari)', currName: '🐸 Cute Spring Frog (3+ Hari)' },
    { target: 14, nextName: '🐱 Sweet White Neko (14+ Hari)', currName: '🦊 Sunny Autumn Fox (7+ Hari)' },
    { target: 21, nextName: '💖 Pink Angelic Heart (21+ Hari)', currName: '🐱 Sweet White Neko (14+ Hari)' },
    { target: 30, nextName: '💜 Lavender Celestial Angel (30+ Hari)', currName: '💖 Pink Angelic Heart (21+ Hari)' },
    { target: 45, nextName: '🧙 Midnight Sorcerer Witch (45+ Hari)', currName: '💜 Lavender Celestial Angel (30+ Hari)' },
    { target: 60, nextName: '🐾 Cyber Shadow Neko (60+ Hari)', currName: '🧙 Midnight Sorcerer Witch (45+ Hari)' },
    { target: 90, nextName: '👑 Imperial Celestial Winged Crown (90+ Hari)', currName: '🐾 Cyber Shadow Neko (60+ Hari)' }
  ];

  for (const m of milestones) {
    if (streak < m.target) {
      return {
        nextMilestone: m.target,
        daysRemaining: m.target - streak,
        nextTierName: m.nextName,
        currentTierName: m.currName
      };
    }
  }

  return {
    nextMilestone: 90,
    daysRemaining: 0,
    nextTierName: '👑 Imperial Celestial Winged Crown',
    currentTierName: '👑 Imperial Celestial Winged Crown'
  };
}
