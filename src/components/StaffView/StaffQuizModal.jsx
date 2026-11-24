import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowRight, ArrowLeft, Trophy, Sparkles, Loader2, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getWeeklyQuiz, submitWeeklyQuiz } from '../../utils/api';

export default function StaffQuizModal({
  staff,
  isOpen,
  onClose,
  onQuizCompleted
}) {
  if (!isOpen || !staff) return null;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [weekKey, setWeekKey] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qId]: selectedOption }
  const [secondsRemaining, setSecondsRemaining] = useState(480); // 8 minutes
  const [timerActive, setTimerActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [quizResults, setQuizResults] = useState(null); // Review state
  const [notApplicableMsg, setNotApplicableMsg] = useState(null);

  const timerRef = useRef(null);

  // Synchronized refs to prevent stale closures in async/timer callbacks
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);
  const secondsRemainingRef = useRef(secondsRemaining);
  const submittingRef = useRef(false);
  const quizResultsRef = useRef(quizResults);
  const staffIdRef = useRef(staff?.legacy_code || staff?.id);
  const weekKeyRef = useRef(weekKey);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { secondsRemainingRef.current = secondsRemaining; }, [secondsRemaining]);
  useEffect(() => { submittingRef.current = submitting; }, [submitting]);
  useEffect(() => { quizResultsRef.current = quizResults; }, [quizResults]);
  useEffect(() => { staffIdRef.current = staff?.legacy_code || staff?.id; }, [staff]);
  useEffect(() => { weekKeyRef.current = weekKey; }, [weekKey]);

  const getSessionKey = (sId, wKey) => `lc_quiz_v2_session_${sId || 'staff'}_${wKey || 'cur'}`;

  // Load questions or check previous completion
  useEffect(() => {
    let mounted = true;
    const fetchQuiz = async () => {
      setLoading(true);
      setErrorMsg(null);
      setIsTimeUp(false);
      try {
        const data = await getWeeklyQuiz(staff.id, staff.venue || 'LuckyCat');
        if (!mounted) return;

        // Restriction: Jika kuis tidak berlaku untuk staf ini (misal staf JP)
        if (data.notApplicable || data.available === false) {
          setNotApplicableMsg(data.message || 'Kuis mingguan saat ini hanya dikhususkan untuk staf LuckyCat.');
          setLoading(false);
          return;
        }

        const currentWeekKey = data.weekKey || '';
        setWeekKey(currentWeekKey);
        weekKeyRef.current = currentWeekKey;

        if (data.alreadyCompleted && data.completion) {
          // Already completed this week
          setQuizResults({
            score: data.completion.score,
            correctCount: data.completion.correct_count,
            totalQuestions: data.completion.total_questions,
            durationSeconds: data.completion.duration_seconds,
            results: data.completion.results || []
          });
          setLoading(false);
          return;
        }

        const qList = Array.isArray(data.questions) ? data.questions : [];

        // Check local storage session to ensure strict 8-minute limit across refresh / re-open
        const sKey = getSessionKey(staff?.legacy_code || staff?.id, currentWeekKey);
        let savedSession = null;
        try {
          const raw = localStorage.getItem(sKey);
          if (raw) savedSession = JSON.parse(raw);
        } catch (e) {}

        const now = Date.now();
        if (savedSession && savedSession.startedAt && Array.isArray(savedSession.questions) && savedSession.questions.length > 0) {
          const elapsedSecs = Math.floor((now - savedSession.startedAt) / 1000);
          const remain = Math.max(0, 480 - elapsedSecs);

          setQuestions(savedSession.questions);
          setAnswers(savedSession.answers || {});
          setSecondsRemaining(remain);
          setLoading(false);

          if (remain <= 0) {
            // Already expired (8 minutes exceeded)! Auto-submit immediately
            setIsTimeUp(true);
            setTimeout(() => {
              handleFinalSubmit(savedSession.answers || {}, savedSession.questions, true, currentWeekKey);
            }, 50);
            return;
          } else {
            setTimerActive(true);
          }
        } else {
          // Fresh 8-minute quiz session
          const newSession = {
            startedAt: now,
            questions: qList,
            answers: {}
          };
          try {
            localStorage.setItem(sKey, JSON.stringify(newSession));
          } catch (e) {}

          setQuestions(qList);
          setSecondsRemaining(480);
          setTimerActive(true);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setErrorMsg(err.message || 'Gagal memuat kuis mingguan.');
          setLoading(false);
        }
      }
    };

    fetchQuiz();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [staff.id, staff.venue]);

  // Countdown timer (Strict 8 minutes)
  useEffect(() => {
    if (!timerActive || quizResults || isTimeUp) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsTimeUp(true);
          setTimerActive(false);
          // Strict 8-minute auto submit
          setTimeout(() => {
            handleFinalSubmit(answersRef.current, questionsRef.current, true);
          }, 50);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerActive, quizResults, isTimeUp]);

  const handleSelectOption = (qId, optionText) => {
    if (quizResults || submitting || isTimeUp) return;
    const newAnswers = { ...answers, [qId]: optionText };
    setAnswers(newAnswers);

    // Persist answer in local session
    const sKey = getSessionKey(staffIdRef.current, weekKeyRef.current);
    try {
      const raw = localStorage.getItem(sKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.answers = newAnswers;
        localStorage.setItem(sKey, JSON.stringify(parsed));
      }
    } catch (e) {}
  };

  const handleFinalSubmit = async (forcedAnswers = null, forcedQuestions = null, isTimeout = false, customWeekKey = null) => {
    if (submittingRef.current || quizResultsRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const targetWeekKey = customWeekKey || weekKeyRef.current || weekKey;
    const currentAnswers = forcedAnswers !== null ? forcedAnswers : (answersRef.current || {});
    const currentQuestions = forcedQuestions !== null ? forcedQuestions : (questionsRef.current || []);
    const timeSpent = isTimeout ? 480 : Math.min(480, Math.max(1, 480 - (secondsRemainingRef.current ?? 0)));

    try {
      const res = await submitWeeklyQuiz({
        staffId: staff.id,
        weekKey: targetWeekKey,
        questionIds: currentQuestions.map(q => q.id),
        answers: currentAnswers,
        durationSeconds: timeSpent,
        venue: staff.venue || 'LuckyCat'
      });

      // Clear local session after successful completion
      const sKey = getSessionKey(staffIdRef.current, targetWeekKey);
      try {
        localStorage.removeItem(sKey);
      } catch (e) {}

      setQuizResults(res);

      if (res.score >= 80) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      if (onQuizCompleted) {
        onQuizCompleted(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengirim hasil kuis. Silakan coba lagi.');
      submittingRef.current = false;
      setSubmitting(false);
      if (!isTimeout) setTimerActive(true);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in text-slate-100">
      <div className="bg-[#181d26] border border-amber-500/40 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-amber-950/70 via-[#1e1b18] to-[#12161f] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>📝 Kuis Wajib Mingguan</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-400/30">
                  {weekKey}
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Uji Pemahaman Produk &amp; Standar Operasional Venue</p>
            </div>
          </div>

          {!quizResults && !notApplicableMsg && !loading && (
            <div className={`px-3 py-1 rounded-full font-mono text-xs font-black flex items-center gap-1.5 border shadow ${
              secondsRemaining < 60
                ? 'bg-rose-500/20 border-rose-400 text-rose-300 animate-pulse'
                : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
          {loading && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-300">Menyiapkan 10 soal acak minggu ini...</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* =========================================
              NOT APPLICABLE (JP STAFF)
             ========================================= */}
          {notApplicableMsg && (
            <div className="py-8 px-4 text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center mx-auto shadow-lg">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-black text-white">Khusus Staf LuckyCat</h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                  {notApplicableMsg}
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onQuizCompleted) onQuizCompleted({ notApplicable: true });
                  }}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black transition shadow-lg cursor-pointer"
                >
                  Tutup &amp; Lanjutkan
                </button>
              </div>
            </div>
          )}

          {/* =========================================
              REVIEW / HASIL SKOR SETELAH SELESAI
             ========================================= */}
          {quizResults && (
            <div className="space-y-4 animate-fade-in">
              {/* Score Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1d222e] via-[#161a24] to-[#12151d] border border-amber-500/30 text-center space-y-2 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border-2 border-amber-400/40">
                  <Trophy className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-white">
                  Skor Anda: <span className="text-amber-400">{quizResults.score}</span> / 100
                </h4>
                <p className="text-xs text-slate-300">
                  Menjawab benar <strong>{quizResults.correctCount}</strong> dari {quizResults.totalQuestions} soal.
                </p>
                <div className="text-[11px] font-bold text-emerald-400 pt-1">
                  ✓ Kuis minggu ini selesai. Hasil evaluasi telah tersimpan!
                </div>
              </div>

              {/* Detail Review of each question */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Koreksi &amp; Evaluasi Jawaban:</span>
                  </h5>
                  <span className="text-[10px] text-slate-400 font-mono">Pilihan Ganda A/B/C/D</span>
                </div>

                {(quizResults.results || []).map((r, i) => {
                  const opts = r.options && r.options.length > 0 ? r.options : [];
                  const sIdx = opts.findIndex(
                    (o) => o === r.staffAnswer || (r.staffAnswer && o.trim().toLowerCase() === r.staffAnswer.trim().toLowerCase())
                  );
                  const staffLetter = r.staffAnswerLetter || (sIdx >= 0 ? ['A', 'B', 'C', 'D'][sIdx] : null);
                  const cIdx = opts.findIndex(
                    (o) => o === r.correctAnswer || (r.correctAnswer && o.trim().toLowerCase() === r.correctAnswer.trim().toLowerCase())
                  );
                  const correctLetter = r.correctAnswerLetter || (cIdx >= 0 ? ['A', 'B', 'C', 'D'][cIdx] : null);

                  return (
                    <div
                      key={r.id || i}
                      className={`p-3 rounded-2xl border text-left space-y-2.5 ${
                        r.isCorrect
                          ? 'bg-emerald-950/30 border-emerald-500/40'
                          : 'bg-rose-950/30 border-rose-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-white text-[11.5px] leading-snug">
                          {i + 1}. {r.question}
                        </span>
                        {r.isCorrect ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-400/30 shrink-0">
                            ✓ Benar (+10)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-400/30 shrink-0">
                            ✕ Salah
                          </span>
                        )}
                      </div>

                      {/* Tampilkan 4 Opsi Jawaban (A, B, C, D) */}
                      {opts.length > 0 && (
                        <div className="space-y-1.5 pt-0.5">
                          <div className="grid grid-cols-1 gap-1.5">
                            {opts.map((opt, optIdx) => {
                              const letter = ['A', 'B', 'C', 'D'][optIdx];
                              const isStaffChoice =
                                opt === r.staffAnswer ||
                                (staffLetter && staffLetter === letter) ||
                                (r.staffAnswer && opt.trim().toLowerCase() === r.staffAnswer.trim().toLowerCase());
                              const isCorrectOption =
                                opt === r.correctAnswer ||
                                (correctLetter && correctLetter === letter) ||
                                (r.correctAnswer && opt.trim().toLowerCase() === r.correctAnswer.trim().toLowerCase());

                              let cardStyle = 'bg-slate-900/40 border-slate-800 text-slate-300';
                              let badge = null;

                              if (isStaffChoice && isCorrectOption) {
                                cardStyle = 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 ring-1 ring-emerald-400/30 font-medium';
                                badge = (
                                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-400/30 shrink-0">
                                    ✓ Pilihan Anda (Tepat)
                                  </span>
                                );
                              } else if (isStaffChoice && !isCorrectOption) {
                                cardStyle = 'bg-rose-950/40 border-rose-500/50 text-rose-200 ring-1 ring-rose-400/30 font-medium';
                                badge = (
                                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 font-bold border border-rose-400/30 shrink-0">
                                    ✕ Pilihan Anda (Salah)
                                  </span>
                                );
                              } else if (isCorrectOption) {
                                cardStyle = 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 font-medium';
                                badge = (
                                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/20 shrink-0">
                                    ★ Kunci Jawaban
                                  </span>
                                );
                              }

                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2 rounded-xl border text-[11px] flex items-center gap-2 transition ${cardStyle}`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                      isStaffChoice && isCorrectOption
                                        ? 'bg-emerald-500 text-slate-950'
                                        : isStaffChoice
                                          ? 'bg-rose-500 text-white'
                                          : isCorrectOption
                                            ? 'bg-emerald-600/40 text-emerald-200 border border-emerald-400/30'
                                            : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {letter}
                                  </div>
                                  <span className="leading-snug text-left">{opt}</span>
                                  {badge}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Ringkasan Pilihan Anda vs Jawaban Benar */}
                      <div className="pt-1 border-t border-slate-800/80">
                        {r.isCorrect ? (
                          <div className="text-[11px] space-y-0.5 text-slate-200 bg-emerald-950/30 p-2 rounded-xl border border-emerald-500/30">
                            <div className="text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>
                                <strong>Jawaban Anda:</strong>{' '}
                                <span className="font-bold text-amber-300">
                                  {staffLetter ? `[${staffLetter}] ` : ''}
                                </span>
                                {r.staffAnswer}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] space-y-1 text-slate-300 bg-black/30 p-2 rounded-xl border border-rose-500/20">
                            <div className="text-rose-300 flex items-start gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <strong>Jawaban Anda (Salah):</strong>{' '}
                                <span className="font-bold text-rose-300">
                                  {staffLetter ? `[${staffLetter}] ` : ''}
                                </span>
                                {r.staffAnswer || '(Tidak dijawab)'}
                              </div>
                            </div>
                            <div className="text-emerald-300 flex items-start gap-1.5 pt-0.5 border-t border-slate-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <strong>Jawaban Benar:</strong>{' '}
                                <span className="font-bold text-emerald-300">
                                  {correctLetter ? `[${correctLetter}] ` : ''}
                                </span>
                                {r.correctAnswer}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-[10.5px] text-slate-300 leading-relaxed italic bg-[#10141c] p-2 rounded-xl border border-slate-800">
                        💡 {r.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Close Button to proceed to break */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 transition cursor-pointer"
              >
                Selesai &amp; Tutup Evaluasi
              </button>
            </div>
          )}

          {/* =========================================
              TIMEOUT LOCK / AUTO-SUBMITTING STATE
             ========================================= */}
          {isTimeUp && !quizResults && (
            <div className="py-12 px-4 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-400/40 flex items-center justify-center mx-auto shadow-lg">
                <Clock className="w-8 h-8 animate-pulse text-rose-400" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-black text-white">⏱️ Batas Waktu 8 Menit Habis!</h4>
                <p className="text-xs text-rose-200 leading-relaxed max-w-sm mx-auto">
                  Kuis ditutup secara otomatis. Seluruh jawaban yang telah Anda pilih sedang dikumpulkan dan skor evaluasi sedang dihitung...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-amber-400 text-xs font-bold pt-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Menghitung skor evaluasi...</span>
              </div>
            </div>
          )}

          {/* =========================================
              ACTIVE QUIZ QUESTIONS
             ========================================= */}
          {!loading && !quizResults && !isTimeUp && currentQ && (
            <div className="space-y-4">
              {/* Question Navigation Bubbles */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-[11px] font-bold text-slate-400">
                  Soal {currentIndex + 1} dari {questions.length}
                </span>
                <span className="text-[11px] font-bold text-amber-400">
                  Terjawab: {answeredCount}/{questions.length}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {questions.map((q, idx) => (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      currentIndex === idx
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 scale-105'
                        : answers[q.id]
                          ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                          : 'bg-slate-800 border border-slate-700 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* Current Question Card */}
              <div className="bg-[#12161f] border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-bold border border-amber-400/30">
                    {currentQ.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 font-bold border border-amber-500/30 flex items-center gap-1">
                    🎯 Pilihan Ganda (Pilih A, B, C, atau D)
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white leading-relaxed">
                  {currentQ.question}
                </h4>
              </div>

              {/* Options List */}
              <div className="space-y-2">
                {currentQ.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isSelected = answers[currentQ.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, opt)}
                      className={`w-full p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400 shadow-md'
                          : 'bg-[#12161f] hover:bg-[#1a202c] border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {letter}
                      </div>
                      <span className="text-xs leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation & Submit buttons */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Selanjutnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleFinalSubmit(answers, questions, false)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-emerald-900/40 flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memeriksa...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Kirim Jawaban Kuis</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
