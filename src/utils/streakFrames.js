/**
 * Streak-Based Unlockable Avatar Frames + Exclusive VIP Owner Frame
 * All 10 Fantasy Animal & Mythical Creature Avatar Frames:
 * - 0 - 2 streak : Standard Clean border
 * - 3 - 6 streak : 🐸 Cute Spring Frog Frame (Starter Streak)
 * - 7 - 9 streak : 🐼 Zen Panda Bamboo Frame
 * - 10 - 14 streak: 🐶 Playful Puppy & Bone Frame
 * - 15 - 19 streak: 🐰 Glowing Bunny & Carrot Frame
 * - 20 - 29 streak: 🐱 Neko Golden Bell Collar Frame
 * - 30 - 39 streak: 🦇 Midnight Neon Bat Wings Frame
 * - 40 - 49 streak: 😈 Neon Demon Horns & Tail Frame
 * - 50 - 74 streak: 🦄 Celestial Golden Unicorn Frame
 * - 75 - 99 streak: 🐉 Dragon Lord Obsidian Horns Frame
 * - 100+ streak  : 👑 Royal Sovereign Antler Crown Frame (Legendaris & VIP)
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
      tier: 10,
      isVip: true,
      frameId: 'royal_deer',
      frameImg: '/streak-frames/royal_deer.png',
      name: 'Royal Sovereign Antler Crown (VIP)',
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

  // 100+ Streak: Royal Sovereign Antler Crown (Legendaris)
  if (streak >= 100) {
    return {
      tier: 10,
      frameId: 'royal_deer',
      frameImg: '/streak-frames/royal_deer.png',
      name: 'Royal Sovereign Antler Crown',
      label: '👑 100+ Hari (Sovereign Crown)',
      shortLabel: '👑 100+ Streak',
      badge: '👑',
      minStreak: 100,
      hasCrown: true,
      crownColor: 'text-yellow-200 fill-yellow-300 drop-shadow-[0_0_18px_rgba(250,204,21,1)] animate-bounce',
      nameGold: true,
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-400 drop-shadow-[0_0_16px_rgba(234,179,8,0.9)] font-black tracking-wide',
      ringClasses: 'ring-4 ring-yellow-300 border-2 border-white bg-gradient-to-r from-yellow-300 via-amber-500 to-yellow-400 p-[4px] shadow-[0_0_42px_rgba(234,179,8,1)] animate-pulse',
      badgeClasses: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200 text-slate-950 border-2 border-yellow-100 font-black shadow-2xl shadow-yellow-400 animate-bounce',
      textGlow: 'text-yellow-200 drop-shadow-[0_0_14px_rgba(250,204,21,1)]',
      pillBg: 'bg-gradient-to-r from-yellow-400/40 via-amber-500/40 to-yellow-400/40 border-2 border-yellow-200 text-yellow-100 font-black shadow-xl shadow-amber-950/70'
    };
  }

  // 75 - 99 Streak: Dragon Lord Obsidian Horns
  if (streak >= 75) {
    return {
      tier: 9,
      frameId: 'dragon',
      frameImg: '/streak-frames/dragon.png',
      name: 'Dragon Lord Obsidian Horns',
      label: '🐉 75+ Hari (Dragon Lord)',
      shortLabel: '🐉 75+ Streak',
      badge: '🐉',
      minStreak: 75,
      hasCrown: true,
      crownColor: 'text-purple-300 fill-purple-400 drop-shadow-[0_0_14px_rgba(168,85,247,1)]',
      nameGold: true,
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-400 to-indigo-300 font-black',
      ringClasses: 'ring-4 ring-purple-500 border-2 border-indigo-400 bg-gradient-to-r from-purple-900 to-slate-900 p-[3.5px] shadow-[0_0_35px_rgba(147,51,234,0.85)]',
      badgeClasses: 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white border border-purple-300 font-black shadow-xl shadow-purple-500/70',
      textGlow: 'text-purple-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.9)]',
      pillBg: 'bg-purple-950/40 border-2 border-purple-500 text-purple-200 font-black'
    };
  }

  // 50 - 74 Streak: Celestial Golden Unicorn
  if (streak >= 50) {
    return {
      tier: 8,
      frameId: 'unicorn',
      frameImg: '/streak-frames/unicorn.png',
      name: 'Celestial Golden Unicorn',
      label: '🦄 50+ Hari (Celestial Unicorn)',
      shortLabel: '🦄 50+ Streak',
      badge: '🦄',
      minStreak: 50,
      hasCrown: true,
      crownColor: 'text-amber-300 fill-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,1)]',
      nameGold: true,
      nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-amber-300 to-cyan-300 font-black',
      ringClasses: 'ring-4 ring-pink-400 border-2 border-amber-300 bg-gradient-to-tr from-pink-500 via-amber-400 to-cyan-400 p-[3.5px] shadow-[0_0_32px_rgba(244,114,182,0.8)]',
      badgeClasses: 'bg-gradient-to-r from-pink-500 to-amber-500 text-slate-950 border border-white font-black shadow-lg shadow-pink-500/60',
      textGlow: 'text-pink-300 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]',
      pillBg: 'bg-pink-500/25 border-2 border-pink-400 text-pink-200 font-black'
    };
  }

  // 40 - 49 Streak: Neon Demon Horns & Tail
  if (streak >= 40) {
    return {
      tier: 7,
      frameId: 'devil',
      frameImg: '/streak-frames/devil.png',
      name: 'Neon Demon Horns & Tail',
      label: '😈 40+ Hari (Demon Horns)',
      shortLabel: '😈 40+ Streak',
      badge: '😈',
      minStreak: 40,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white font-bold',
      ringClasses: 'ring-3 ring-rose-500 border-2 border-fuchsia-400 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-purple-600 p-[3px] shadow-[0_0_28px_rgba(244,63,94,0.75)]',
      badgeClasses: 'bg-gradient-to-r from-rose-600 to-purple-600 text-white border border-rose-300 font-black shadow-lg shadow-rose-600/60',
      textGlow: 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]',
      pillBg: 'bg-rose-500/20 border border-rose-400/50 text-rose-200 font-bold'
    };
  }

  // 30 - 39 Streak: Midnight Neon Bat Wings
  if (streak >= 30) {
    return {
      tier: 6,
      frameId: 'bat',
      frameImg: '/streak-frames/bat.png',
      name: 'Midnight Neon Bat Wings',
      label: '🦇 30+ Hari (Neon Bat Wings)',
      shortLabel: '🦇 30+ Streak',
      badge: '🦇',
      minStreak: 30,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white font-bold',
      ringClasses: 'ring-3 ring-blue-500 border-2 border-cyan-400 bg-gradient-to-r from-blue-700 via-cyan-500 to-indigo-600 p-[3px] shadow-[0_0_25px_rgba(59,130,246,0.7)]',
      badgeClasses: 'bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-black border border-cyan-200 shadow-md',
      textGlow: 'text-cyan-300 drop-shadow-[0_0_7px_rgba(6,182,212,0.8)]',
      pillBg: 'bg-blue-500/20 border border-blue-400/40 text-blue-200 font-bold'
    };
  }

  // 20 - 29 Streak: Neko Golden Bell Collar
  if (streak >= 20) {
    return {
      tier: 5,
      frameId: 'cat',
      frameImg: '/streak-frames/cat.png',
      name: 'Neko Golden Bell Collar',
      label: '🐱 20+ Hari (Neko Bell)',
      shortLabel: '🐱 20+ Streak',
      badge: '🐱',
      minStreak: 20,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white font-bold',
      ringClasses: 'ring-3 ring-purple-400 border-2 border-emerald-300 bg-gradient-to-tr from-purple-500 via-fuchsia-400 to-emerald-300 p-[2.5px] shadow-[0_0_22px_rgba(168,85,247,0.65)]',
      badgeClasses: 'bg-gradient-to-r from-purple-500 to-emerald-500 text-white font-black border border-white/60 shadow-md',
      textGlow: 'text-purple-300 drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]',
      pillBg: 'bg-purple-500/20 border border-purple-400/40 text-purple-200 font-bold'
    };
  }

  // 15 - 19 Streak: Glowing Bunny & Carrot
  if (streak >= 15) {
    return {
      tier: 4,
      frameId: 'bunny',
      frameImg: '/streak-frames/bunny.png',
      name: 'Glowing Bunny & Carrot',
      label: '🐰 15+ Hari (Bunny Carrot)',
      shortLabel: '🐰 15+ Streak',
      badge: '🐰',
      minStreak: 15,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white font-bold',
      ringClasses: 'ring-2 ring-emerald-400 border-2 border-lime-300 bg-gradient-to-tr from-emerald-500 via-lime-400 to-orange-400 p-[2px] shadow-[0_0_18px_rgba(16,185,129,0.6)]',
      badgeClasses: 'bg-gradient-to-r from-emerald-500 to-lime-500 text-slate-950 font-black border border-white/60 shadow-sm',
      textGlow: 'text-emerald-300 drop-shadow-[0_0_5px_rgba(16,185,129,0.6)]',
      pillBg: 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-bold'
    };
  }

  // 10 - 14 Streak: Playful Puppy & Bone
  if (streak >= 10) {
    return {
      tier: 3,
      frameId: 'puppy',
      frameImg: '/streak-frames/puppy.png',
      name: 'Playful Puppy & Bone',
      label: '🐶 10+ Hari (Puppy Bone)',
      shortLabel: '🐶 10+ Streak',
      badge: '🐶',
      minStreak: 10,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white',
      ringClasses: 'ring-2 ring-fuchsia-400 border-2 border-purple-300 bg-gradient-to-r from-fuchsia-500 to-indigo-500 p-[2px] shadow-[0_0_15px_rgba(217,70,239,0.5)]',
      badgeClasses: 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-black border border-white/50 shadow-sm',
      textGlow: 'text-fuchsia-300 drop-shadow-[0_0_5px_rgba(217,70,239,0.6)]',
      pillBg: 'bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200 font-medium'
    };
  }

  // 7 - 9 Streak: Zen Panda Bamboo Stalks
  if (streak >= 7) {
    return {
      tier: 2,
      frameId: 'panda',
      frameImg: '/streak-frames/panda.png',
      name: 'Zen Panda Bamboo Stalks',
      label: '🐼 7+ Hari (Panda Bamboo)',
      shortLabel: '🐼 7+ Streak',
      badge: '🐼',
      minStreak: 7,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white',
      ringClasses: 'ring-2 ring-teal-400 border-2 border-emerald-300 bg-gradient-to-r from-teal-500 to-emerald-500 p-[2px] shadow-[0_0_14px_rgba(20,184,166,0.45)]',
      badgeClasses: 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black border border-white/50 shadow-sm',
      textGlow: 'text-teal-300 drop-shadow-[0_0_5px_rgba(20,184,166,0.5)]',
      pillBg: 'bg-teal-500/15 border border-teal-500/30 text-teal-200 font-medium'
    };
  }

  // 3 - 6 Streak: Cute Spring Frog
  if (streak >= 3) {
    return {
      tier: 1,
      frameId: 'frog',
      frameImg: '/streak-frames/frog.png',
      name: 'Cute Spring Frog',
      label: '🐸 3+ Hari (Cute Frog)',
      shortLabel: '🐸 3+ Streak',
      badge: '🐸',
      minStreak: 3,
      hasCrown: false,
      nameGold: false,
      nameClass: 'text-white',
      ringClasses: 'ring-2 ring-emerald-500/80 border-2 border-cyan-400/60 bg-emerald-500/10 p-[1.5px] shadow-[0_0_12px_rgba(16,185,129,0.35)]',
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
    { target: 7, nextName: '🐼 Zen Panda Bamboo (7+ Hari)', currName: '🐸 Cute Spring Frog (3+ Hari)' },
    { target: 10, nextName: '🐶 Playful Puppy & Bone (10+ Hari)', currName: '🐼 Zen Panda Bamboo (7+ Hari)' },
    { target: 15, nextName: '🐰 Glowing Bunny & Carrot (15+ Hari)', currName: '🐶 Playful Puppy & Bone (10+ Hari)' },
    { target: 20, nextName: '🐱 Neko Golden Bell Collar (20+ Hari)', currName: '🐰 Glowing Bunny & Carrot (15+ Hari)' },
    { target: 30, nextName: '🦇 Midnight Neon Bat Wings (30+ Hari)', currName: '🐱 Neko Golden Bell Collar (20+ Hari)' },
    { target: 40, nextName: '😈 Neon Demon Horns & Tail (40+ Hari)', currName: '🦇 Midnight Neon Bat Wings (30+ Hari)' },
    { target: 50, nextName: '🦄 Celestial Golden Unicorn (50+ Hari)', currName: '😈 Neon Demon Horns & Tail (40+ Hari)' },
    { target: 75, nextName: '🐉 Dragon Lord Obsidian Horns (75+ Hari)', currName: '🦄 Celestial Golden Unicorn (50+ Hari)' },
    { target: 100, nextName: '👑 Royal Sovereign Antler Crown (100+ Hari)', currName: '🐉 Dragon Lord Obsidian Horns (75+ Hari)' }
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
    nextMilestone: 100,
    daysRemaining: 0,
    nextTierName: '👑 Royal Sovereign Antler Crown',
    currentTierName: '👑 Royal Sovereign Antler Crown'
  };
}
