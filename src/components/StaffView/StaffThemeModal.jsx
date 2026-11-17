import React, { useState } from 'react';
import { X, Check, Palette, Sparkles, Shield, Heart } from 'lucide-react';

export const STAFF_THEMES = [
  // --- MANLY / MASKULIN / COOL ---
  {
    id: 'midnight',
    name: 'Midnight Slate',
    category: 'MANLY',
    categoryLabel: 'Maskulin',
    icon: '🛡️',
    description: 'Klasik Stealth Dark & Slate',
    accentText: 'text-indigo-300',
    wrapperBg: 'bg-[#0f1218]',
    cardBg: 'bg-[#181d26]',
    cardBorder: 'border-white/[0.08]',
    accentBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
    ambientGlow: 'rgba(99, 102, 241, 0.08)',
    activeBorder: 'border-indigo-400 ring-1 ring-indigo-400',
    previewGradient: 'from-slate-900 to-slate-950',
    swatchColor: '#6366f1'
  },
  {
    id: 'carbon',
    name: 'Carbon Crimson',
    category: 'MANLY',
    categoryLabel: 'Maskulin',
    icon: '⚡',
    description: 'Black Titanium & Red Ember',
    accentText: 'text-rose-300',
    wrapperBg: 'bg-[#0e0d10]',
    cardBg: 'bg-[#181519]',
    cardBorder: 'border-rose-900/40',
    accentBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    ambientGlow: 'rgba(244, 63, 94, 0.10)',
    activeBorder: 'border-rose-500 ring-1 ring-rose-500',
    previewGradient: 'from-neutral-950 via-zinc-900 to-rose-950',
    swatchColor: '#f43f5e'
  },
  {
    id: 'emerald',
    name: 'Emerald Tactical',
    category: 'MANLY',
    categoryLabel: 'Maskulin',
    icon: '🌲',
    description: 'Forest Ops & Zamrud Deep',
    accentText: 'text-emerald-300',
    wrapperBg: 'bg-[#09110e]',
    cardBg: 'bg-[#121c17]',
    cardBorder: 'border-emerald-600/30',
    accentBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    ambientGlow: 'rgba(16, 185, 129, 0.10)',
    activeBorder: 'border-emerald-400 ring-1 ring-emerald-400',
    previewGradient: 'from-slate-950 via-emerald-950/70 to-[#081510]',
    swatchColor: '#10b981'
  },
  {
    id: 'ocean',
    name: 'Royal Navy',
    category: 'MANLY',
    categoryLabel: 'Maskulin',
    icon: '🌊',
    description: 'Deep Sea & Cobalt Blue',
    accentText: 'text-blue-300',
    wrapperBg: 'bg-[#09101c]',
    cardBg: 'bg-[#121b2c]',
    cardBorder: 'border-blue-500/30',
    accentBadge: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    ambientGlow: 'rgba(59, 130, 246, 0.10)',
    activeBorder: 'border-blue-400 ring-1 ring-blue-400',
    previewGradient: 'from-slate-950 via-blue-950/70 to-[#081220]',
    swatchColor: '#3b82f6'
  },

  // --- GIRLY / FEMININ / CUTE ---
  {
    id: 'sakura',
    name: 'Sakura Blush',
    category: 'GIRLY',
    categoryLabel: 'Feminin',
    icon: '🌸',
    description: 'Soft Pink & Sweet Rose Gold',
    accentText: 'text-pink-300',
    wrapperBg: 'bg-[#160d14]',
    cardBg: 'bg-[#22141e]',
    cardBorder: 'border-pink-500/30',
    accentBadge: 'bg-pink-500/25 text-pink-200 border-pink-400/40',
    ambientGlow: 'rgba(244, 114, 182, 0.12)',
    activeBorder: 'border-pink-400 ring-1 ring-pink-400',
    previewGradient: 'from-zinc-950 via-pink-950/70 to-[#230f1a]',
    swatchColor: '#f472b6'
  },
  {
    id: 'lavender',
    name: 'Lilac Dream',
    category: 'GIRLY',
    categoryLabel: 'Feminin',
    icon: '💜',
    description: 'Pastel Violet & Soft Lavender',
    accentText: 'text-purple-300',
    wrapperBg: 'bg-[#130b1c]',
    cardBg: 'bg-[#1f132b]',
    cardBorder: 'border-purple-500/30',
    accentBadge: 'bg-purple-500/25 text-purple-200 border-purple-400/40',
    ambientGlow: 'rgba(168, 85, 247, 0.12)',
    activeBorder: 'border-purple-400 ring-1 ring-purple-400',
    previewGradient: 'from-zinc-950 via-purple-950/70 to-[#1c0f2b]',
    swatchColor: '#a855f7'
  },
  {
    id: 'sunset',
    name: 'Sunset Peach',
    category: 'GIRLY',
    categoryLabel: 'Feminin',
    icon: '✨',
    description: 'Warm Coral & Golden Peach',
    accentText: 'text-amber-300',
    wrapperBg: 'bg-[#180e0a]',
    cardBg: 'bg-[#251611]',
    cardBorder: 'border-amber-500/30',
    accentBadge: 'bg-amber-500/25 text-amber-200 border-amber-400/40',
    ambientGlow: 'rgba(251, 146, 60, 0.12)',
    activeBorder: 'border-amber-400 ring-1 ring-amber-400',
    previewGradient: 'from-zinc-950 via-orange-950/70 to-[#27140e]',
    swatchColor: '#fb923c'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-[#161a23] border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Kustomisasi Tema Dashboard</h2>
              <p className="text-[10.5px] text-slate-400">Pilih nuansa favorit khusus akun Anda</p>
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
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#10131a] rounded-2xl my-3 shrink-0 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'ALL'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Semua</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MANLY')}
            className={`py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'MANLY'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3 h-3 text-cyan-300" />
            <span>Maskulin</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GIRLY')}
            className={`py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'GIRLY'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3 h-3 text-pink-300" />
            <span>Feminin</span>
          </button>
        </div>

        {/* Theme Cards Grid */}
        <div className="space-y-2 overflow-y-auto pr-1 flex-1 py-1">
          {filteredThemes.map((t) => {
            const isSelected = currentThemeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleChoose(t)}
                className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] ${
                  isSelected
                    ? `${t.cardBg} ${t.activeBorder} shadow-lg shadow-black/50`
                    : 'bg-[#1b212d] hover:bg-[#232b3b] border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Swatch & Icon */}
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-md border border-white/15"
                    style={{
                      background: `linear-gradient(135deg, ${t.swatchColor}33, #111318)`
                    }}
                  >
                    <span>{t.icon}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">{t.name}</span>
                      <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                        t.category === 'MANLY'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                          : 'bg-pink-500/20 text-pink-300 border border-pink-400/30'
                      }`}>
                        {t.category === 'MANLY' ? '⚡ Manly' : '🌸 Girly'}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 mt-0.5 truncate">{t.description}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner"
                    style={{ backgroundColor: t.swatchColor }}
                  />
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-white/20 group-hover:border-white/40" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10.5px] text-slate-400 shrink-0">
          <span>Tersimpan otomatis di HP Anda</span>
          <span className="font-semibold text-slate-300">Pilihan Pribadi Staf</span>
        </div>
      </div>
    </div>
  );
}
