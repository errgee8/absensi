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
  const [quizResults, setQuizResults] = useState(null); // Review state
  const [notApplicableMsg, setNotApplicableMsg] = useState(null);

  const timerRef = useRef(null);

  // Load questions or check previous completion
  useEffect(() => {
    let mounted = true;
    const fetchQuiz = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await getWeeklyQuiz(staff.id, staff.venue || 'LuckyCat');
        if (!mounted) return;

        // Restriction: Jika kuis tidak berlaku untuk staf ini (misal staf JP)
        if (data.notApplicable || data.available === false) {
          setNotApplicableMsg(data.message || 'Kuis mingguan saat ini hanya dikhususkan untuk staf LuckyCat.');
          setLoading(false);
          return;
        }

        setWeekKey(data.weekKey || '');
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
        setQuestions(qList);
        setSecondsRemaining(480);
        setTimerActive(true);
      } catch (err) {
        if (mounted) setErrorMsg(err.message || 'Gagal memuat kuis mingguan.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchQuiz();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [staff.id, staff.venue]);

  // Countdown timer
  useEffect(() => {
    if (!timerActive || quizResults) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerActive, quizResults]);

  const handleSelectOption = (qId, optionText) => {
    if (quizResults || submitting) return;
    setAnswers((prev) => ({ ...prev, [qId]: optionText }));
  };

  const handleAutoSubmit = () => {
    handleFinalSubmit();
  };

  const handleFinalSubmit = async () => {
    if (submitting || quizResults) return;
    setSubmitting(true);
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpent = Math.max(1, 480 - secondsRemaining);

    try {
      const res = await submitWeeklyQuiz({
        staffId: staff.id,
        weekKey,
        answers,
        durationSeconds: timeSpent,
        venue: staff.venue || 'LuckyCat'
      });

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
      setTimerActive(true);
    } finally {
      setSubmitting(false);
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
              <div className="space-y-2.5">
                <h5 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Koreksi &amp; Penjelasan Jawaban:</span>
                </h5>

                {(quizResults.results || []).map((r, i) => (
                  <div
                    key={r.id || i}
                    className={`p-3 rounded-2xl border text-left space-y-2 ${
                      r.isCorrect
                        ? 'bg-emerald-950/40 border-emerald-500/40'
                        : 'bg-rose-950/40 border-rose-500/40'
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

                    {!r.isCorrect && (
                      <div className="text-[11px] space-y-0.5 text-slate-300 bg-black/30 p-2 rounded-xl">
                        <div className="text-rose-300">
                          <strong>Jawaban Anda:</strong> {r.staffAnswer || '(Tidak dijawab)'}
                        </div>
                        <div className="text-emerald-300">
                          <strong>Jawaban Benar:</strong> {r.correctAnswer}
                        </div>
                      </div>
                    )}

                    <p className="text-[10.5px] text-slate-300 leading-relaxed italic bg-[#10141c] p-2 rounded-xl border border-slate-800">
                      💡 {r.explanation}
                    </p>
                  </div>
                ))}
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
              ACTIVE QUIZ QUESTIONS
             ========================================= */}
          {!loading && !quizResults && currentQ && (
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
              <div className="bg-[#12161f] border border-slate-800 rounded-2xl p-4 space-y-2 shadow-inner">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-bold border border-amber-400/30">
                    {currentQ.category}
                  </span>
                  <span className="text-slate-400 font-mono">Pilih 1 jawaban tepat</span>
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
                    onClick={handleFinalSubmit}
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
