import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { getStreakTier, isVipStaff } from '../../utils/streakFrames';

export default function StreakAvatar({
  photo,
  name = 'Staff',
  streak = 0,
  isVip = false,
  rank = null,
  size = 'md',
  className = '',
  themeRing = '',
  showBadge = true,
  onClick = null,
  title = null,
  children = null
}) {
  const [imgError, setImgError] = useState(false);
  const vipDetected = isVip || isVipStaff({ name });
  const streakTier = getStreakTier(streak, vipDetected);

  // Size dimensions for circular avatar photo
  const sizeMap = {
    xs: { box: 'w-8 h-8', text: 'text-xs', crown: 'w-4 h-4 -top-3', badge: 'text-[8px] -top-1 -left-1 px-1' },
    sm: { box: 'w-10 h-10', text: 'text-xs', crown: 'w-5 h-5 -top-3.5', badge: 'text-[9px] -top-1.5 -left-1.5 px-1' },
    md: { box: 'w-14 h-14', text: 'text-sm', crown: 'w-6 h-6 -top-4', badge: 'text-[10px] -top-1.5 -left-1.5 px-1.5' },
    lg: { box: 'w-16 h-16 sm:w-18 sm:h-18', text: 'text-base', crown: 'w-7 h-7 -top-4.5', badge: 'text-[10px] -top-2 -left-2 px-1.5' },
    xl: { box: 'w-20 h-20 sm:w-22 sm:h-22', text: 'text-lg', crown: 'w-8 h-8 -top-5', badge: 'text-[11px] -top-2 -left-2 px-2' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  let rankBadgeColor = 'bg-slate-700 text-slate-200';
  if (rank === 1) rankBadgeColor = 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black border border-white';
  else if (rank === 2) rankBadgeColor = 'bg-slate-300 text-slate-950 font-black border border-white';
  else if (rank === 3) rankBadgeColor = 'bg-amber-700 text-white font-black border border-amber-400';

  const tooltipTitle = title || (vipDetected ? '👑 VIP Executive Owner' : `Bingkai: ${streakTier.name} (${streak} Hari Streak)`);

  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? {
        type: 'button',
        onClick,
        className: `relative inline-flex items-center justify-center shrink-0 cursor-pointer focus:outline-none transition-transform duration-150 hover:scale-105 active:scale-95 group ${className}`,
        title: tooltipTitle
      }
    : {
        className: `relative inline-flex items-center justify-center shrink-0 ${className}`,
        title: tooltipTitle
      };

  return (
    <Wrapper {...wrapperProps}>
      {/* Crown indicator if sovereign or rank 1 */}
      {(vipDetected || streakTier.hasCrown || rank === 1) && !streakTier.frameImg && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce ${currentSize.crown}`}>
          <Crown className={`w-full h-full ${streakTier.crownColor || 'text-yellow-300 fill-amber-300 drop-shadow-[0_0_8px_rgba(234,179,8,1)]'}`} />
        </div>
      )}

      {/* Streak Milestone Chip on Top-Left */}
      {showBadge && streakTier.badge && (
        <span
          className={`absolute z-30 rounded-full font-black shadow-lg flex items-center justify-center border border-white/40 ${currentSize.badge} ${streakTier.badgeClasses}`}
        >
          {streakTier.badge} {streak > 0 ? streak : ''}
        </span>
      )}

      {/* Inner Avatar Circular Photo */}
      <div
        className={`${currentSize.box} rounded-full overflow-hidden bg-slate-900 border-2 border-slate-700/60 flex items-center justify-center relative shadow-inner z-10 transition-transform duration-200 ${themeRing || (streakTier.frameImg ? '' : streakTier.ringClasses)}`}
      >
        {photo && !imgError ? (
          <img
            src={photo}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center font-black text-white bg-gradient-to-br from-slate-800 to-slate-950 ${currentSize.text}`}>
            {initials}
          </div>
        )}
      </div>

      {/* Fantasy Cartoon Streak Avatar Frame Overlay */}
      {streakTier.frameImg && (
        <img
          src={streakTier.frameImg}
          alt={streakTier.name}
          className="absolute pointer-events-none select-none z-20 max-w-none transition-transform duration-200"
          style={{
            width: '280%',
            height: '280%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.65))'
          }}
          loading="lazy"
        />
      )}

      {/* Rank Badge for Leaderboard */}
      {rank != null && (
        <span
          className={`absolute -bottom-1.5 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black shadow-md z-30 flex items-center justify-center ${rankBadgeColor}`}
        >
          #{rank}
        </span>
      )}

      {/* Any caller-provided overlay icon (e.g. pencil button) */}
      {children}
    </Wrapper>
  );
}
