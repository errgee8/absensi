/**
 * Streak-Based Unlockable Avatar Frames + Exclusive VIP Owner Frame
 * Strict requirement: Regular milestone unlock is purely driven by on-time STREAK (consecutive working days on time).
 * Special VIP Frame: Exclusively reserved for Ryan Gerrit (Owner / Founder VIP).
 *
 * Tiers:
 * - VIP Special : Royal Celestial Obsidian VIP Frame (👑 VIP - Exclusive to Ryan Gerrit)
 * - 0 - 2 streak : Standard Clean border
 * - 3 - 6 streak : Emerald Minimalist Frame (🌱 3+ Streak - Minimalis & Rapi)
 * - 7 - 9 streak : Radiant Sapphire Frame (🔥 7+ Streak - Lebih Bagus, Electric Cyan Glow)
 * - 10 - 19 streak: Royal Amethyst Frame (⚡ 10+ Streak - Lebih Mewah, Violet/Purple Neon Glow)
 * - 20 - 29 streak: Blazing Phoenix Animated Frame (🌟 20+ Streak - Mewah & Bergerak)
 * - 30 - 49 streak: Imperial Golden Crown Frame (👑 30+ Streak - Mahkota Emas & Nama Menjadi Gold)
 * - 50 - 99 streak: Mythic Celestial Prismatic Frame (💎 50+ Streak - Holographic Aurora & Crystal Crown)
 * - 100+ streak  : Godlike Sovereign Frame (🏆 100+ Streak - Legendaris, Obsidian Gold Emperor Crown)
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
      tier: 99,
      isVip: true,
      name: 'Royal Celestial Obsidian VIP Frame',
      label: '👑 VIP Executive Owner',
      shortLabel: '👑 VIP Owner',
      badge: '👑',
      vipLogo: 'VIP',
      minStreak: 0,
      hasCrown: true,
      crownColor: 'text-yellow-300 fill-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,1)]',
      nameGold: true,
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] font-black',
      ringClasses: 'ring-4 ring-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.9)] border-2 border-yellow-200 bg-gradient-to-tr from-yellow-300 via-amber-500 to-rose-500 p-[3px] animate-pulse',
      badgeClasses: 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 shadow-xl shadow-amber-400/80 border-2 border-white font-black',
      textGlow: 'text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]',
      pillBg: 'bg-gradient-to-r from-amber-400/30 via-yellow-400/25 to-amber-500/30 border-2 border-amber-300/80 text-amber-200 shadow-lg shadow-amber-950/60 font-black'
    };
  }

  const streak = Math.max(0, parseInt(streakCount, 10) || 0);

  // 100+ Streak: Godlike Sovereign Frame (Improvisasi - Legendaris)
  if (streak >= 100) {
    return {
      tier: 7,
      name: 'Godlike Sovereign Frame',
      label: '🏆 100+ Hari (Legendaris)',
      shortLabel: '🏆 100+ Streak',
      badge: '🏆',
      minStreak: 100,
      hasCrown: true,
      crownColor: 'text-yellow-200 fill-yellow-300 drop-shadow-[0_0_18px_rgba(250,204,21,1)] animate-bounce',
      nameGold: true,
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-400 drop-shadow-[0_0_16px_rgba(234,179,8,0.9)] font-black tracking-wide',
      ringClasses: 'ring-4 ring-yellow-300 border-2 border-white bg-gradient-to-r from-yellow-300 via-amber-500 to-yellow-400 p-[4.5px] shadow-[0_0_42px_rgba(234,179,8,1)] animate-pulse',
      badgeClasses: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200 text-slate-950 border-2 border-yellow-100 font-black shadow-2xl shadow-yellow-400 animate-bounce',
      textGlow: 'text-yellow-200 drop-shadow-[0_0_14px_rgba(250,204,21,1)]',
      pillBg: 'bg-gradient-to-r from-yellow-400/40 via-amber-500/40 to-yellow-400/40 border-2 border-yellow-200 text-yellow-100 font-black shadow-xl shadow-amber-950/70'
    };
  }

  // 50 - 99 Streak: Mythic Celestial Prismatic Frame (Improvisasi)
  if (streak >= 50) {
    return {
      tier: 6,
      name: 'Mythic Celestial Prismatic',
      label: '💎 50+ Hari (Mythic Celestial)',
      shortLabel: '💎 50+ Streak',
      badge: '💎',
      minStreak: 50,
      hasCrown: true,
      crownColor: 'text-cyan-300 fill-cyan-400 drop-shadow-[0_0_14px_rgba(34,211,238,1)] animate-bounce',
      nameGold: true,
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-amber-300 to-pink-300 drop-shadow-[0_0_14px_rgba(34,211,238,0.7)] font-black',
      ringClasses: 'ring-4 ring-cyan-300 border-2 border-pink-300 bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-amber-300 p-[4px] shadow-[0_0_36px_rgba(6,182,212,0.9)] animate-pulse',
      badgeClasses: 'bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300 text-slate-950 border-2 border-white font-black shadow-xl shadow-cyan-400/90 animate-pulse',
      textGlow: 'text-cyan-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]',
      pillBg: 'bg-gradient-to-r from-cyan-500/30 via-pink-500/30 to-amber-500/30 border-2 border-cyan-300 text-cyan-100 font-black shadow-lg shadow-cyan-950/60'
    };
  }

  // 30 - 49 Streak: Imperial Golden Crown Frame (Crown Mewah + Nama Gold di Dashboard)
  if (streak >= 30) {
    return {
      tier: 5,
      name: 'Imperial Golden Crown Frame',
      label: '👑 30+ Hari (Imperial Gold)',
      shortLabel: '👑 30+ Streak',
      badge: '👑',
      minStreak: 30,
      hasCrown: true,
      crownColor: 'text-yellow-300 fill-amber-400 drop-shadow-[0_0_10px_rgba(234,179,8,1)] animate-bounce',
      nameGold: true,
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)] font-black',
      ringClasses: 'ring-4 ring-yellow-400 border-2 border-yellow-200 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 p-[3.5px] shadow-[0_0_30px_rgba(234,179,8,0.85)] animate-pulse',
      badgeClasses: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-slate-950 border-2 border-white font-black shadow-xl shadow-amber-400/80',
      textGlow: 'text-yellow-300 drop-shadow-[0_0_8px_rgba(234,179,8,0.85)]',
      pillBg: 'bg-gradient-to-r from-yellow-500/30 via-amber-400/30 to-yellow-500/30 border-2 border-amber-300 text-amber-200 font-black shadow-md shadow-amber-950/50'
    };
  }

  // 20 - 29 Streak: Blazing Phoenix Frame (Lebih Mewah Lagi dan Bergerak)
  if (streak >= 20) {
    return {
      tier: 4,
      name: 'Blazing Phoenix Frame',
      label: '🌟 20+ Hari (Bergerak)',
      shortLabel: '🌟 20+ Streak',
      badge: '🌟',
      minStreak: 20,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white',
      ringClasses: 'ring-3 ring-rose-400 border-2 border-amber-300 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300 p-[3px] shadow-[0_0_26px_rgba(244,63,94,0.75)] animate-pulse',
      badgeClasses: 'bg-gradient-to-r from-amber-400 via-rose-500 to-red-600 text-white border border-yellow-200 shadow-lg shadow-rose-500/60 animate-pulse font-black',
      textGlow: 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]',
      pillBg: 'bg-gradient-to-r from-rose-500/25 to-amber-500/25 border border-rose-400/50 text-rose-200 font-bold'
    };
  }

  // 10 - 19 Streak: Royal Amethyst Frame (Lebih Mewah dan Beda Warna: Violet/Purple Neon)
  if (streak >= 10) {
    return {
      tier: 3,
      name: 'Royal Amethyst Frame',
      label: '⚡ 10+ Hari (Royal Amethyst)',
      shortLabel: '⚡ 10+ Streak',
      badge: '⚡',
      minStreak: 10,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white',
      ringClasses: 'ring-3 ring-purple-400 border-2 border-fuchsia-300 bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-pink-500 p-[2.5px] shadow-[0_0_22px_rgba(168,85,247,0.65)]',
      badgeClasses: 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white border border-purple-200 shadow-lg shadow-purple-500/50 font-black',
      textGlow: 'text-purple-300 drop-shadow-[0_0_7px_rgba(168,85,247,0.75)]',
      pillBg: 'bg-purple-500/20 border border-purple-400/40 text-purple-200 font-bold'
    };
  }

  // 7 - 9 Streak: Radiant Sapphire Frame (Lebih Bagus, Beda Warna dari 3 Streak: Electric Cyan/Sapphire)
  if (streak >= 7) {
    return {
      tier: 2,
      name: 'Radiant Sapphire Frame',
      label: '🔥 7+ Hari (Radiant Sapphire)',
      shortLabel: '🔥 7+ Streak',
      badge: '🔥',
      minStreak: 7,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white',
      ringClasses: 'ring-2 ring-cyan-400 border-2 border-sky-300 bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-500 p-[2px] shadow-[0_0_18px_rgba(6,182,212,0.6)]',
      badgeClasses: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border border-cyan-200 shadow-md shadow-cyan-500/50 font-black',
      textGlow: 'text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.7)]',
      pillBg: 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold'
    };
  }

  // 3 - 6 Streak: Emerald Minimalist Frame (Frame Minimalis)
  if (streak >= 3) {
    return {
      tier: 1,
      name: 'Emerald Minimalist Frame',
      label: '🌱 3+ Hari (Minimalis)',
      shortLabel: '🌱 3+ Streak',
      badge: '🌱',
      minStreak: 3,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white',
      ringClasses: 'ring-2 ring-emerald-500/70 border-2 border-emerald-400/50 bg-emerald-500/10 p-[1.5px] shadow-[0_0_12px_rgba(16,185,129,0.35)]',
      badgeClasses: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-300 shadow-sm font-black',
      textGlow: 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]',
      pillBg: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium'
    };
  }

  // 0 - 2 Streak: Standard Clean Border
  return {
    tier: 0,
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

  if (streak < 3) {
    return {
      nextMilestone: 3,
      daysRemaining: 3 - streak,
      nextTierName: 'Emerald Minimalist (🌱 3+ Streak)',
      currentTierName: 'Standard Clean'
    };
  }
  if (streak < 7) {
    return {
      nextMilestone: 7,
      daysRemaining: 7 - streak,
      nextTierName: 'Radiant Sapphire (🔥 7+ Streak)',
      currentTierName: 'Emerald Minimalist (🌱 3+ Streak)'
    };
  }
  if (streak < 10) {
    return {
      nextMilestone: 10,
      daysRemaining: 10 - streak,
      nextTierName: 'Royal Amethyst (⚡ 10+ Streak)',
      currentTierName: 'Radiant Sapphire (🔥 7+ Streak)'
    };
  }
  if (streak < 20) {
    return {
      nextMilestone: 20,
      daysRemaining: 20 - streak,
      nextTierName: 'Blazing Phoenix Bergerak (🌟 20+ Streak)',
      currentTierName: 'Royal Amethyst (⚡ 10+ Streak)'
    };
  }
  if (streak < 30) {
    return {
      nextMilestone: 30,
      daysRemaining: 30 - streak,
      nextTierName: 'Imperial Golden Crown & Nama Gold (👑 30+ Streak)',
      currentTierName: 'Blazing Phoenix (🌟 20+ Streak)'
    };
  }
  if (streak < 50) {
    return {
      nextMilestone: 50,
      daysRemaining: 50 - streak,
      nextTierName: 'Mythic Celestial Prismatic (💎 50+ Streak)',
      currentTierName: 'Imperial Golden Crown (👑 30+ Streak)'
    };
  }
  if (streak < 100) {
    return {
      nextMilestone: 100,
      daysRemaining: 100 - streak,
      nextTierName: 'Godlike Sovereign Legendaris (🏆 100+ Streak)',
      currentTierName: 'Mythic Celestial Prismatic (💎 50+ Streak)'
    };
  }
  return {
    nextMilestone: null,
    daysRemaining: 0,
    nextTierName: 'Max Tier Unlocked!',
    currentTierName: 'Godlike Sovereign (🏆 100+)'
  };
}
