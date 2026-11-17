import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Users,
  MessageSquare,
  Sparkles,
  Crown,
  Building2,
  Smile,
  Terminal,
  Circle,
  Hash,
  Radio,
  EyeOff,
  VolumeX
} from 'lucide-react';
import {
  getLoungeChatMessages,
  sendLoungeChatMessage,
  sendChatPresenceHeartbeat,
  leaveChatPresence,
  muteLoungeChatStaff,
  subscribeRealtimeEvents
} from '../../utils/api';
import { isVipStaff } from '../../utils/streakFrames';
import { formatWitaTimeOnly } from '../../utils/time';

const QUICK_EMOJIS = ['👋', '🔥', '☕', '💪', '✨', '😂', '👏', '🙏'];

export default function LoungeChatModal({
  isOpen,
  currentStaff = null,
  isManager = false,
  onClose,
  onVisitStaff = null
}) {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mobileTab, setMobileTab] = useState('CHAT'); // 'CHAT' | 'ONLINE'

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const isVip = isVipStaff(currentStaff);
  const staffRole = currentStaff?.role || (isManager ? 'Manager' : 'Staff');
  const roleClean = String(staffRole).toLowerCase();
  const managerDetected = Boolean(isManager) || roleClean.includes('manager') || roleClean.includes('management');
  const isManagerAuthorized =
    Boolean(isManager) ||
    managerDetected ||
    isVip ||
    String(currentStaff?.pin || '').trim() === '8894' ||
    String(currentStaff?.pin || '').trim() === '8980';

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Initial Load & Presence Heartbeat
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    // Ephemeral: selalu mulai dengan kondisi bersih saat masuk
    setIsMuted(false);
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        staff_id: 'system',
        staff_name: '📢 SISTEM',
        staff_role: 'System',
        staff_venue: 'Lounge',
        is_vip: 0,
        is_manager: 1,
        is_system: 1,
        message: 'Kamu bergabung di #lucky-jp-lounge. Obrolan bersifat live real-time selama kamu berada di ruangan ini (chat akan hilang saat kamu keluar).',
        created_at: new Date().toISOString()
      }
    ]);

    async function loadData() {
      try {
        setLoading(true);
        const res = await getLoungeChatMessages();
        if (!isMounted) return;
        if (res?.onlineUsers) setOnlineUsers(res.onlineUsers);
      } catch (err) {
        console.warn('Gagal memuat lounge chat:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    // Send initial presence heartbeat
    const staffId = currentStaff?.id || currentStaff?.uuid || (managerDetected ? 'mgr_ghost' : 'guest');
    const staffName = currentStaff?.name || (managerDetected ? 'Management' : 'Staff');
    const venue = currentStaff?.venue || 'All Outlets';

    sendChatPresenceHeartbeat({
      staffId,
      name: staffName,
      venue,
      role: staffRole,
      isVip,
      isManager: managerDetected
    }).then((res) => {
      if (res?.onlineUsers && isMounted) setOnlineUsers(res.onlineUsers);
    });

    // Regular Heartbeat every 12 seconds
    const interval = setInterval(() => {
      sendChatPresenceHeartbeat({
        staffId,
        name: staffName,
        venue,
        role: staffRole,
        isVip,
        isManager: managerDetected
      }).then((res) => {
        if (res?.onlineUsers && isMounted) setOnlineUsers(res.onlineUsers);
      });
    }, 12000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      leaveChatPresence(staffId);
      setMessages([]); // Reset bersih saat leave
    };
  }, [isOpen, currentStaff, isManager, isVip, staffRole, managerDetected]);

  // 2. Realtime SSE/Broadcast Subscription (Anti-Lag)
  useEffect(() => {
    if (!isOpen) return;

    const myId = String(currentStaff?.id || currentStaff?.uuid || '');

    const unsubscribe = subscribeRealtimeEvents((eventType, payload) => {
      if (eventType === 'CHAT_MESSAGE_NEW' && payload?.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
      } else if (eventType === 'CHAT_PRESENCE_UPDATE' && payload?.onlineUsers) {
        setOnlineUsers(payload.onlineUsers);
      } else if (eventType === 'CHAT_STAFF_MUTED' && payload?.staffId) {
        if (myId && String(payload.staffId) === myId) {
          setIsMuted(true);
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, currentStaff]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (mobileTab === 'CHAT') {
      scrollToBottom();
    }
  }, [messages, mobileTab]);

  const handleMuteStaff = async (targetUser) => {
    if (!targetUser?.staffId || !isManagerAuthorized) return;
    try {
      await muteLoungeChatStaff({
        staffId: targetUser.staffId,
        staffName: targetUser.name,
        managerPin: currentStaff?.pin || (isManager ? '8980' : ''),
        managerName: currentStaff?.name || 'Manager',
        isManager: true
      });
    } catch (err) {
      alert(err.message || 'Gagal membisukan staf');
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (isMuted) return;
    const text = inputText.trim();
    if (!text || sending) return;

    try {
      setSending(true);
      const staffId = currentStaff?.id || currentStaff?.uuid || (managerDetected ? 'mgr' : 'staff');
      const staffName = currentStaff?.name || (managerDetected ? 'Management' : 'Staff');
      const venue = currentStaff?.venue || 'Outlet';

      setInputText('');
      const res = await sendLoungeChatMessage({
        staffId,
        staffName,
        staffRole,
        staffVenue: venue,
        isVip,
        isManager: managerDetected,
        message: text
      });

      if (res?.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
      }
    } catch (err) {
      console.warn('Gagal mengirim pesan chat:', err);
      if (err.message && err.message.includes('dibisukan')) {
        setIsMuted(true);
      }
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b0f17] border border-cyan-500/30 rounded-3xl max-w-4xl w-full h-[94vh] sm:h-[86vh] text-slate-100 shadow-2xl relative flex flex-col overflow-hidden font-sans">
        {/* Top mIRC Title Bar */}
        <div className="px-3.5 sm:px-4 py-2.5 bg-[#0e1422] border-b border-cyan-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-xs shrink-0 font-mono font-black text-sm">
              <Hash className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs sm:text-sm font-black text-cyan-300 tracking-wide truncate">
                  #lucky-jp-lounge
                </span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 font-mono text-[9px] border border-cyan-500/30 font-bold hidden sm:inline">
                  [+nt] • Realtime Hub
                </span>
                {managerDetected && (
                  <span className="px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono text-[9px] flex items-center gap-1 border border-white/10" title="Anda berada dalam Ghost Mode (tidak terlihat oleh staf di daftar online)">
                    <EyeOff className="w-3 h-3 text-slate-400" />
                    <span>Ghost Mode</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                Ruang obrolan santai seluruh staf JP Karaoke &amp; LuckyCat • Auto-purge 3 hari
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile View Tab Switcher (Chat vs Online Users) */}
        <div className="grid grid-cols-2 sm:hidden bg-[#070a10] border-b border-white/5 p-1 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMobileTab('CHAT')}
            className={`py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mobileTab === 'CHAT'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-400/30 shadow-xs'
                : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Obrolan ({messages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('ONLINE')}
            className={`py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mobileTab === 'ONLINE'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-400/30 shadow-xs'
                : 'text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online ({onlineUsers.length})</span>
          </button>
        </div>

        {/* Main Body: Two Columns on Desktop (Left: Chat stream, Right: mIRC Nick List) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Window Column */}
          <div
            className={`flex-1 flex flex-col bg-[#080c14] overflow-hidden ${
              mobileTab === 'ONLINE' ? 'hidden sm:flex' : 'flex'
            }`}
          >
            {/* mIRC Welcome Banner */}
            <div className="px-3 py-1.5 bg-[#0d131f] border-b border-white/5 font-mono text-[10px] text-cyan-300/80 flex items-center justify-between shrink-0">
              <span className="truncate">
                *** Welcome to LuckyCat &amp; JP Karaoke Lounge. Obrolan santai antar rekan kerja.
              </span>
              <span className="text-slate-500 hidden sm:inline shrink-0">
                Pesan kedaluwarsa dlm 3 hari
              </span>
            </div>

            {/* Scrollable Messages Container */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
              {loading && (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2 font-mono">
                  <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Menghubungkan ke saluran realtime #lucky-jp-lounge...</p>
                </div>
              )}

              {!loading && messages.length === 0 && (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <span className="text-2xl">💬</span>
                  <p className="text-xs font-bold text-slate-300 font-mono">Belum ada obrolan terbaru</p>
                  <p className="text-[11px] text-slate-500">
                    Jadilah yang pertama menyapa rekan kerja hari ini!
                  </p>
                </div>
              )}

              {/* Message Items (NO AVATAR PHOTOS - Name Only as requested!) */}
              {!loading &&
                messages.map((msg) => {
                  const isSenderVip = Boolean(msg.is_vip);
                  const isSenderMe =
                    currentStaff &&
                    (String(msg.staff_id) === String(currentStaff.id) ||
                      String(msg.staff_id) === String(currentStaff.uuid));

                  return (
                    <div
                      key={msg.id}
                      className={`text-xs leading-relaxed group transition-all duration-150 rounded-xl p-2 ${
                        isSenderMe
                          ? 'bg-cyan-950/20 border border-cyan-500/20'
                          : isSenderVip
                          ? 'bg-amber-950/20 border border-amber-500/20'
                          : 'bg-[#101624]/60 hover:bg-[#121929] border border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Timestamp */}
                          <span className="text-[10px] font-mono text-slate-500">
                            [{formatWitaTimeOnly(msg.created_at)}]
                          </span>

                          {/* Sender Name with Badges */}
                          {isSenderVip ? (
                            <span
                              onClick={() => onVisitStaff?.({ id: msg.staff_id, name: msg.staff_name })}
                              className="font-black text-amber-300 hover:underline cursor-pointer flex items-center gap-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                              title="Klik untuk visit profil VIP Owner"
                            >
                              <Crown className="w-3 h-3 text-amber-300 fill-amber-300" />
                              <span>{msg.staff_name}</span>
                              <span className="px-1.5 py-0.1 rounded-full bg-amber-400 text-slate-950 font-black text-[8px] border border-yellow-200">
                                VIP OWNER
                              </span>
                            </span>
                          ) : (
                            <span
                              onClick={() => onVisitStaff?.({ id: msg.staff_id, name: msg.staff_name })}
                              className="font-black text-white hover:text-cyan-300 hover:underline cursor-pointer flex items-center gap-1 transition"
                              title="Klik untuk visit profil staf ini"
                            >
                              <span>{msg.staff_name}</span>
                            </span>
                          )}

                          {/* Outlet Tag */}
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-400 font-bold border border-white/5">
                            {msg.staff_venue || 'Outlet'}
                          </span>
                        </div>
                      </div>

                      {/* Message Content (Pure clean text, ultra fast load) */}
                      <p
                        className={`text-xs sm:text-[12.5px] break-words whitespace-pre-wrap pl-1 ${
                          isSenderVip ? 'text-amber-100 font-medium' : 'text-slate-200'
                        }`}
                      >
                        {msg.message}
                      </p>
                    </div>
                  );
                })}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Preset Emoji Reactions */}
            <div className="px-3 py-1.5 bg-[#090d16] border-t border-white/5 flex items-center gap-1.5 overflow-x-auto shrink-0">
              <span className="text-[10px] text-slate-500 font-mono shrink-0">Reaksi:</span>
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setInputText((prev) => `${prev} ${emoji}`.trim())}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sm active:scale-90 transition border border-white/5 shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Bottom Input Area */}
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 sm:p-3 bg-[#0c111c] border-t border-cyan-500/20 flex items-center gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isMuted}
                placeholder={
                  isMuted
                    ? "Anda telah dibisukan oleh Manager, wkwkwk 🤐"
                    : "Tulis pesan ke rekan kerja di lounge... (Enter untuk kirim)"
                }
                className={`flex-1 rounded-2xl px-3.5 py-2.5 text-xs transition ${
                  isMuted
                    ? 'bg-rose-950/30 border border-rose-500/40 text-rose-300 placeholder-rose-400/80 cursor-not-allowed italic'
                    : 'bg-[#151c2c] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400'
                }`}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={isMuted || sending || !inputText.trim()}
                className={`py-2.5 px-4 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 shrink-0 ${
                  isMuted || sending || !inputText.trim()
                    ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/30 active:scale-95 cursor-pointer'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kirim</span>
              </button>
            </form>
          </div>

          {/* Right Column: mIRC Online Nick List (Sidebar) */}
          <div
            className={`w-full sm:w-64 bg-[#0a0e18] border-l border-white/10 flex flex-col ${
              mobileTab === 'CHAT' ? 'hidden sm:flex' : 'flex'
            }`}
          >
            {/* Online List Header */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0d121f]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs font-black text-slate-200">
                  Online di Lounge
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                {onlineUsers.length}
              </span>
            </div>

            {/* List of active online users (NO MANAGERS as requested!) */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {onlineUsers.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-slate-500">
                  Belum ada staf lain yang membuka room chat
                </div>
              ) : (
                onlineUsers.map((u) => {
                  const isUserVip = Boolean(u.isVip);
                  const isSelf = currentStaff && (String(u.staffId) === String(currentStaff.id) || String(u.staffId) === String(currentStaff.uuid));
                  return (
                    <div
                      key={u.staffId || u.name}
                      onClick={() => onVisitStaff?.({ id: u.staffId, name: u.name })}
                      className="p-2 rounded-xl bg-[#111726]/70 hover:bg-cyan-950/40 border border-white/5 hover:border-cyan-400/30 transition flex items-center justify-between gap-1.5 cursor-pointer group"
                      title="Klik untuk visit dashboard profil staf ini"
                    >
                      <div className="min-w-0 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 truncate">
                            <span
                              className={`text-xs font-bold truncate group-hover:text-cyan-300 transition ${
                                isUserVip ? 'text-amber-300' : 'text-slate-200'
                              }`}
                            >
                              {u.name}
                            </span>
                            {isUserVip && (
                              <Crown className="w-2.5 h-2.5 text-amber-300 fill-amber-300 shrink-0" />
                            )}
                          </div>
                          <span className="text-[9.5px] text-slate-400 block truncate">
                            {u.venue || 'Outlet'} • {u.role || 'Staff'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isManagerAuthorized && !isSelf && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMuteStaff(u);
                            }}
                            className="px-2 py-0.5 rounded-md bg-rose-950 hover:bg-rose-900 border border-rose-500/50 text-rose-300 hover:text-white text-[9.5px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-90"
                            title={`Bisukan ${u.name} dari room chat (Notif: ${u.name} telah dibisukan, wkwkwk)`}
                          >
                            <VolumeX className="w-2.5 h-2.5" />
                            <span>Bisukan</span>
                          </button>
                        )}
                        <span className="text-[9px] text-cyan-400 opacity-0 group-hover:opacity-100 transition">
                          Visit →
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Status Tip */}
            <div className="p-2.5 border-t border-white/5 text-[10px] text-slate-500 font-mono text-center shrink-0">
              <span>● Status Realtime Sinkron</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
