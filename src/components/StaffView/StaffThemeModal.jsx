import React, { useState } from 'react';
import { X, Check, Palette, Sparkles, Zap, Heart } from 'lucide-react';

export const STAFF_THEMES = [
  // ========================================================
  // ⚡ MANLY / STREETWEAR / TECHWEAR (MASKULIN)
  // ========================================================
  {
    id: 'cyber_matrix',
    name: 'Cyber Matrix',
    shortName: 'Matrix',
    category: 'MANLY',
    categoryLabel: 'Maskulin',
    tag: '⚡ Streetwear',
    icon: '⚡',
    description: 'High-voltage neon lime on obsidian techwear',
    accentText: 'text-emerald-300',
    wrapperBg: 'bg-gradient-to-b from-[#06180e] via-[#050f08] to-[#020503]',
    cardBg: 'bg-gradient-to-b from-[#0b1d12] to-[#07130b]',
    cardBorder: 'border-emerald-400/50 shadow-xl shadow-emerald-950/60',
    metricBg: 'bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/25',
    accentBadge: 'bg-emerald-400 text-slate-950 font-black border-emerald-300 shadow-md shadow-emerald-500/30',
    ambientGlow: '#22c55e',
    pillBorder: 'border-emerald-400/40 text-emerald-300 bg-emerald-950/60',
    avatarRing: 'ring-2 ring-emerald-400 shadow-md shadow-emerald-500/40',
    swatchColor: '#22c55e',
    previewGradient: 'from-emerald-950 via-zinc-950 to-[#020503]'
  },
  {
    id: 'blood_moon',
    name: 'Blood Moon',
    shortName: 'Drift',
    category: 'MANLY',
    categoryLabel: 'Maskulin',
    tag: '🔥 Aggressive',
    icon: '🔥',
    description: 'Japanese drift asphalt black & crimson neon',
    accentText: 'text-rose-300',
    wrapperBg: 'bg-gradient-to-b from-[#1c080b] via-[#0f0406] to-[#050203]',
    cardBg: 'bg-gradient-to-b from-[#210c10] to-[#140608]',
    cardBorder: 'border-rose-500/50 shadow-xl shadow-rose-950/60',
    metricBg: 'bg-rose-950/30 hover:bg-rose-900/40 border-rose-500/25',
    accentBadge: 'bg-rose-500 text-white font-black border-rose-400 shadow-md shadow-rose-500/30',
    ambientGlow: '#ef4444',
    pillBorder: 'border-rose-500/40 text-rose-300 bg-rose-950/60',
    avatarRing: 'ring-2 ring-rose-500 shadow-md shadow-rose-500/40',
    swatchColor: '#ef4444',
    previewGradient: 'from-rose-950 via-neutral-950 to-[#050203]'
  },
  {
    id: 'glacier_cyber',
    name: 'Glacier Cyber',
    shortName: 'Glacier',
    category: 'MANLY',
    categoryLabel: 'Maskulin',
    tag: '❄️ Ice Cobalt',
    icon: '❄️',
    description: 'Electric ice cyan glow on deep midnight navy',
    accentText: 'text-cyan-300',
    wrapperBg: 'bg-gradient-to-b from-[#061524] via-[#040d18] to-[#02060b]',
    cardBg: 'bg-gradient-to-b from-[#0a1e33] to-[#061321]',
    cardBorder: 'border-cyan-400/50 shadow-xl shadow-cyan-950/60',
    metricBg: 'bg-cyan-950/30 hover:bg-cyan-900/40 border-cyan-500/25',
    accentBadge: 'bg-cyan-400 text-slate-950 font-black border-cyan-300 shadow-md shadow-cyan-500/30',
    ambientGlow: '#06b6d4',
    pillBorder: 'border-cyan-400/40 text-cyan-300 bg-cyan-950/60',
    avatarRing: 'ring-2 ring-cyan-400 shadow-md shadow-cyan-500/40',
    swatchColor: '#06b6d4',
    previewGradient: 'from-cyan-950 via-slate-950 to-[#02060b]'
  },
  {
    id: 'midnight',
    name: 'Stealth Titanium',
    shortName: 'Stealth',
    category: 'MANLY',
    categoryLabel: 'Maskulin',
    tag: '🛡️ Minimalist',
    icon: '🛡️',
    description: 'Ultra-clean carbon black & matte slate',
    accentText: 'text-indigo-300',
    wrapperBg: 'bg-gradient-to-b from-[#0d1017] via-[#090b10] to-[#050608]',
    cardBg: 'bg-gradient-to-b from-[#181d28] to-[#10141c]',
    cardBorder: 'border-indigo-400/35 shadow-xl shadow-slate-950/60',
    metricBg: 'bg-slate-900/40 hover:bg-slate-800/40 border-white/10',
    accentBadge: 'bg-indigo-500/30 text-indigo-200 font-black border-indigo-400/40',
    ambientGlow: '#6366f1',
    pillBorder: 'border-indigo-400/40 text-indigo-200 bg-indigo-950/60',
    avatarRing: 'ring-2 ring-indigo-400 shadow-md shadow-indigo-500/30',
    swatchColor: '#6366f1',
    previewGradient: 'from-indigo-950 via-slate-950 to-[#050608]'
  },

  // ========================================================
  // 🌸 GIRLY / Y2K / CUTE AESTHETIC (FEMININ)
  // ========================================================
  {
    id: 'barbiecore',
    name: 'Y2K Barbiecore',
    shortName: 'Barbie',
    category: 'GIRLY',
    categoryLabel: 'Feminin',
    tag: '💖 Barbiecore',
    icon: '💖',
    description: 'Full hot neon pink energy & dark berry glow',
    accentText: 'text-pink-300',
    wrapperBg: 'bg-gradient-to-b from-[#220719] via-[#14030e] to-[#080106]',
    cardBg: 'bg-gradient-to-b from-[#2d0b21] to-[#1b0614]',
    cardBorder: 'border-pink-500/60 shadow-xl shadow-pink-950/70',
    metricBg: 'bg-pink-950/35 hover:bg-pink-900/40 border-pink-400/30',
    accentBadge: 'bg-pink-500 text-white font-black border-pink-300 shadow-md shadow-pink-500/40',
    ambientGlow: '#ec4899',
    pillBorder: 'border-pink-400/50 text-pink-200 bg-pink-950/70',
    avatarRing: 'ring-2 ring-pink-400 shadow-md shadow-pink-500/50',
    swatchColor: '#ec4899',
    previewGradient: 'from-pink-950 via-purple-950 to-[#080106]'
  },
  {
    id: 'euphoria_lilac',
    name: 'Euphoria Lilac',
    shortName: 'Lilac',
    category: 'GIRLY',
    categoryLabel: 'Feminin',
    tag: '💜 Aesthetic',
    icon: '💜',
    description: 'Vaporwave electric violet & dreamy lavender',
    accentText: 'text-purple-300',
    wrapperBg: 'bg-gradient-to-b from-[#1b0826] via-[#100318] to-[#07010a]',
    cardBg: 'bg-gradient-to-b from-[#240c33] to-[#16061f]',
    cardBorder: 'border-purple-400/55 shadow-xl shadow-purple-950/70',
    metricBg: 'bg-purple-950/35 hover:bg-purple-900/40 border-purple-400/30',
    accentBadge: 'bg-purple-500 text-white font-black border-purple-300 shadow-md shadow-purple-500/40',
    ambientGlow: '#a855f7',
    pillBorder: 'border-purple-400/50 text-purple-200 bg-purple-950/70',
    avatarRing: 'ring-2 ring-purple-400 shadow-md shadow-purple-500/50',
    swatchColor: '#a855f7',
    previewGradient: 'from-purple-950 via-violet-950 to-[#07010a]'
  },
  {
    id: 'matcha_latte',
    name: 'Matcha Latte',
    shortName: 'Matcha',
    category: 'GIRLY',
    categoryLabel: 'Feminin',
    tag: '🍵 Clean Girl',
    icon: '🍵',
    description: 'Trendy soft matcha green & pastel mint cozy glow',
    accentText: 'text-emerald-200',
    wrapperBg: 'bg-gradient-to-b from-[#0b1a11] via-[#061009] to-[#020604]',
    cardBg: 'bg-gradient-to-b from-[#11261a] to-[#0a1810]',
    cardBorder: 'border-emerald-300/45 shadow-xl shadow-emerald-950/60',
    metricBg: 'bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-400/25',
    accentBadge: 'bg-emerald-300 text-emerald-950 font-black border-emerald-200 shadow-md shadow-emerald-400/30',
    ambientGlow: '#4ade80',
    pillBorder: 'border-emerald-300/45 text-emerald-200 bg-emerald-950/60',
    avatarRing: 'ring-2 ring-emerald-300 shadow-md shadow-emerald-400/40',
    swatchColor: '#4ade80',
    previewGradient: 'from-emerald-950 via-teal-950 to-[#020604]'
  },
  {
    id: 'peach_sunset',
    name: 'Peach Sunset',
    shortName: 'Peach',
    category: 'GIRLY',
    categoryLabel: 'Feminin',
    tag: '🍑 Sunset Glow',
    icon: '🍑',
    description: 'Warm golden coral, tangerine & juicy peach',
    accentText: 'text-amber-200',
    wrapperBg: 'bg-gradient-to-b from-[#220d06] via-[#140602] to-[#080201]',
    cardBg: 'bg-gradient-to-b from-[#2e130a] to-[#1c0a04]',
    cardBorder: 'border-orange-400/50 shadow-xl shadow-orange-950/60',
    metricBg: 'bg-orange-950/30 hover:bg-orange-900/40 border-orange-400/25',
    accentBadge: 'bg-gradient-to-r from-orange-400 to-amber-400 text-slate-950 font-black border-orange-300 shadow-md shadow-orange-500/30',
    ambientGlow: '#fb923c',
    pillBorder: 'border-orange-400/45 text-orange-200 bg-orange-950/60',
    avatarRing: 'ring-2 ring-orange-400 shadow-md shadow-orange-400/40',
    swatchColor: '#fb923c',
    previewGradient: 'from-orange-950 via-amber-950 to-[#080201]'
  }
];

export function getStaffTheme(staffId) {
  if (!staffId) return STAFF_THEMES[0];
  try {
    const savedId = localStorage.getItem(`staff_theme_${staffId}`) || localStorage.getItem('staff_theme_global');
    const matched = STAFF_THEMES.find(t => t.id === savedId);
    return matched || STAFF_THEMES[0];
  } catch {
    return STAFF_THEMES[0];
  }
}

export function saveStaffTheme(staffId, themeId) {
  try {
    if (staffId) {
      localStorage.setItem(`staff_theme_${staffId}`, themeId);
    }
    localStorage.setItem('staff_theme_global', themeId);
  } catch (err) {
    console.warn('Gagal menyimpan tema staf:', err);
  }
}

export default function StaffThemeModal({ isOpen, onClose, staff, currentThemeId, onSelectTheme }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'MANLY' | 'GIRLY'

  const filteredThemes = STAFF_THEMES.filter(t => {
    if (activeTab === 'ALL') return true;
    return t.category === activeTab;
  });

  const handleChoose = (theme) => {
    saveStaffTheme(staff?.id, theme.id);
    if (onSelectTheme) onSelectTheme(theme);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-[#131720] border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-indigo-500/20 border border-white/15 flex items-center justify-center text-white shadow-inner">
              <Palette className="w-4 h-4 text-pink-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-white">Custom Theme Dashboard</h2>
                <span className="px-1.5 py-0.2 rounded bg-pink-500/25 text-pink-300 text-[9px] font-black uppercase tracking-wider">
                  Gen Z
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400">Pilih tema favorit khusus profil Anda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs: ALL | MANLY ⚡ | GIRLY 🌸 */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0b0e14] rounded-2xl my-3 shrink-0 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`py-2 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ALL'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Semua</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MANLY')}
            className={`py-2 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'MANLY'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-200" />
            <span>Manly ⚡</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GIRLY')}
            className={`py-2 rounded-xl text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'GIRLY'
                ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-pink-200" />
            <span>Girly 🌸</span>
          </button>
        </div>

        {/* Theme Cards Grid */}
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 py-1">
          {filteredThemes.map((t) => {
            const isSelected = currentThemeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleChoose(t)}
                className={`w-full p-3 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.98] ${
                  isSelected
                    ? `${t.cardBg} ${t.cardBorder} ring-2 ring-white/30 shadow-2xl`
                    : 'bg-[#181d28]/80 hover:bg-[#202738] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Swatch & Icon */}
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-lg border border-white/20 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${t.swatchColor}44, #0f1218)`
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-40 blur-sm pointer-events-none"
                      style={{ backgroundColor: t.swatchColor }}
                    />
                    <span className="relative z-10">{t.icon}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{t.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                        t.category === 'MANLY'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                          : 'bg-pink-500/20 text-pink-300 border border-pink-400/30'
                      }`}>
                        {t.tag}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-300/80 mt-0.5 line-clamp-1">{t.description}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2.5">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white/40 shadow-md"
                    style={{ backgroundColor: t.swatchColor }}
                  />
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-lg">
                      <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-white/25 group-hover:border-white/50" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10.5px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <span>✨</span>
            <span>Tersimpan otomatis per staf</span>
          </span>
          <span className="font-bold text-slate-200">100% Bebas Ganti</span>
        </div>
      </div>
    </div>
  );
}
