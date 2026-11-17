/**
 * Streak-Based Unlockable Avatar Frames + Exclusive VIP Owner Frame
 * Strict requirement: Regular milestone unlock is purely driven by on-time STREAK (consecutive working days on time).
 * Special VIP Frame: Exclusively reserved for Ryan Gerrit (Owner / Founder VIP).
 *
 * Tiers:
 * - VIP Special : Royal Celestial Obsidian VIP Frame (👑 VIP - Exclusive to Ryan Gerrit)
 * - 0 - 6 days  : Standard Clean border
 * - 7 - 29 days : Ember Flame frame (🔥 7+ Streak)
 * - 30 - 79 days: Neon Crystal frame (⚡ 30+ Streak - Lebih Mewah)
 * - 80+ days    : Diamond Holographic Aura frame (👑 80+ Streak - Istimewa)
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
      ringClasses: 'ring-4 ring-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.9)] border-2 border-yellow-200 bg-gradient-to-tr from-yellow-300 via-amber-500 to-rose-500 p-[3px] animate-pulse',
      badgeClasses: 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 shadow-xl shadow-amber-400/80 border-2 border-white font-black',
      textGlow: 'text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]',
      pillBg: 'bg-gradient-to-r from-amber-400/30 via-yellow-400/25 to-amber-500/30 border-2 border-amber-300/80 text-amber-200 shadow-lg shadow-amber-950/60 font-black'
    };
  }

  const streak = Math.max(0, parseInt(streakCount, 10) || 0);

  if (streak >= 80) {
    return {
      tier: 3,
      name: 'Diamond Holographic Aura',
      label: '👑 80+ Hari (Istimewa)',
      shortLabel: '👑 80+ Streak',
      badge: '👑',
      minStreak: 80,
      ringClasses: 'ring-4 ring-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.7)] border-2 border-pink-400 bg-gradient-to-tr from-amber-400 via-rose-500 to-cyan-400 p-[2.5px] animate-pulse',
      badgeClasses: 'bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400 text-slate-950 shadow-lg shadow-yellow-500/50 border border-white font-black',
      textGlow: 'text-yellow-300 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]',
      pillBg: 'bg-gradient-to-r from-yellow-500/25 via-pink-500/25 to-cyan-500/25 border-yellow-400/50 text-yellow-200'
    };
  }

  if (streak >= 30) {
    return {
      tier: 2,
      name: 'Neon Crystal Frame',
      label: '⚡ 30+ Hari (Lebih Mewah)',
      shortLabel: '⚡ 30+ Streak',
      badge: '⚡',
      minStreak: 30,
      ringClasses: 'ring-3 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)] border-2 border-cyan-300 bg-gradient-to-tr from-cyan-400 via-sky-300 to-indigo-500 p-[2px]',
      badgeClasses: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md shadow-cyan-400/50 border border-white font-black',
      textGlow: 'text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]',
      pillBg: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
    };
  }

  if (streak >= 7) {
    return {
      tier: 1,
      name: 'Ember Flame Frame',
      label: '🔥 7+ Hari',
      shortLabel: '🔥 7+ Streak',
      badge: '🔥',
      minStreak: 7,
      ringClasses: 'ring-2 ring-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] border-2 border-amber-400 bg-gradient-to-tr from-amber-500 via-orange-400 to-yellow-400 p-[1.5px]',
      badgeClasses: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/40 border border-amber-200 font-black',
      textGlow: 'text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.6)]',
      pillBg: 'bg-amber-500/20 border-amber-400/40 text-amber-200'
    };
  }

  return {
    tier: 0,
    name: 'Standard Clean Border',
    label: '0-6 Hari',
    shortLabel: `${streak} Hari`,
    badge: null,
    minStreak: 0,
    ringClasses: 'border border-white/15',
    badgeClasses: 'bg-slate-700 text-slate-300',
    textGlow: 'text-slate-300',
    pillBg: 'bg-slate-800/60 border-white/10 text-slate-300'
  };
}

export function getNextStreakMilestone(currentStreak = 0) {
  const streak = Math.max(0, parseInt(currentStreak, 10) || 0);

  if (streak < 7) {
    return {
      nextMilestone: 7,
      daysRemaining: 7 - streak,
      nextTierName: 'Ember Flame (🔥 7+)',
      currentTierName: 'Standard'
    };
  }
  if (streak < 30) {
    return {
      nextMilestone: 30,
      daysRemaining: 30 - streak,
      nextTierName: 'Neon Crystal (⚡ 30+)',
      currentTierName: 'Ember Flame (🔥 7+)'
    };
  }
  if (streak < 80) {
    return {
      nextMilestone: 80,
      daysRemaining: 80 - streak,
      nextTierName: 'Diamond Holographic Aura (👑 80+)',
      currentTierName: 'Neon Crystal (⚡ 30+)'
    };
  }
  return {
    nextMilestone: null,
    daysRemaining: 0,
    nextTierName: 'Max Tier Unlocked!',
    currentTierName: 'Diamond Holographic Aura (👑 80+)'
  };
}
