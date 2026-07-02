import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import BloomBadge from '../../components/BloomBadge';
import { RichContent } from '../../components/RichTextEditor';
import { Clock, CheckCircle2, XCircle, ChevronRight, AlertCircle, Brain, CheckSquare, Square } from 'lucide-react';

function fmt(seconds) {
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function TakeExam() {
  const { id: examId } = useParams();
  const navigate = useNavigate();

  const [phase,       setPhase]       = useState('loading');
  const [attemptId,   setAttemptId]   = useState(null);
  const [question,    setQuestion]    = useState(null);
  const [examMeta,    setExamMeta]    = useState(null);
  const [answered,    setAnswered]    = useState(0);
  const [totalQ,      setTotalQ]      = useState(0);
  const [currentBloom, setCurrentBloom] = useState('Remember');
  const [currentDiff,  setCurrentDiff]  = useState(1);

  // Single-correct selection
  const [selected,     setSelected]     = useState(null);
  // Multiple-correct selection
  const [selectedMulti, setSelectedMulti] = useState([]);

  const [feedback,    setFeedback]    = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(null);
  const [result,      setResult]      = useState(null);

  const startedAtRef        = useRef(null);
  const questionStartRef    = useRef(Date.now());
  const timerRef            = useRef(null);

  // ── Start exam ──────────────────────────────────────────────────────────────
  const startExam = useCallback(async () => {
    try {
      const { data } = await api.post(`/attempts/start/${examId}`);
      setAttemptId(data.attemptId);
      setQuestion(data.question);
      setExamMeta({ title: data.examTitle, examType: data.examType, durationMinutes: data.durationMinutes });
      setAnswered(data.questionsAnswered);
      setTotalQ(data.totalQuestions);
      setCurrentBloom(data.currentBloomLevel);
      setCurrentDiff(data.currentDifficultyFactor);
      startedAtRef.current = new Date(data.startedAt);
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setTimeLeft(data.durationMinutes * 60 - elapsed);
      questionStartRef.current = Date.now();
      setPhase('active');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start exam');
      navigate('/student/exams');
    }
  }, [examId, navigate]);

  useEffect(() => { startExam(); }, [startExam]);

  // ── Countdown ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || phase !== 'active') return;
    if (timeLeft <= 0) { handleAutoSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, phase]);

  const handleAutoSubmit = async () => {
    if (!attemptId) return;
    try {
      const { data } = await api.post(`/attempts/submit/${attemptId}`);
      setResult(data); setPhase('complete');
    } catch {}
  };

  // ── Reset selection when question changes ───────────────────────────────────
  useEffect(() => {
    setSelected(null);
    setSelectedMulti([]);
    questionStartRef.current = Date.now();
  }, [question]);

  const toggleMultiOption = (idx) => {
    setSelectedMulti(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const hasSelection = question?.isMultipleCorrect
    ? selectedMulti.length > 0
    : selected !== null;

  // ── Submit answer ────────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!hasSelection || submitting) return;
    setSubmitting(true);
    const timeTaken = Math.floor((Date.now() - questionStartRef.current) / 1000);

    const payload = {
      questionId: question._id,
      timeTakenSeconds: timeTaken,
    };
    if (question.isMultipleCorrect) {
      payload.selectedOptionIndices = selectedMulti;
      payload.selectedOptionIndex   = selectedMulti[0] ?? null;
    } else {
      payload.selectedOptionIndex   = selected;
      payload.selectedOptionIndices = [selected];
    }

    try {
      const { data } = await api.post(`/attempts/answer/${attemptId}`, payload);

      if (data.isComplete) { setResult(data); setPhase('complete'); return; }

      setFeedback({
        isCorrect:            data.isCorrect,
        correctOptionIndex:   data.correctOptionIndex,
        correctOptionIndices: data.correctOptionIndices || [],
        explanation:          data.explanation,
      });
      setAnswered(data.questionsAnswered);
      setCurrentBloom(data.currentBloomLevel);
      setCurrentDiff(data.currentDifficultyFactor);
      setPhase('feedback');

      setTimeout(() => {
        setQuestion(data.question);
        setFeedback(null);
        setPhase('active');
      }, 2400);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading exam…</p>
      </div>
    </div>
  );

  // ── Complete screen ──────────────────────────────────────────────────────────
  if (phase === 'complete' && result) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${result.isPassed ? 'bg-green-100' : 'bg-red-100'}`}>
          {result.isPassed
            ? <CheckCircle2 className="w-10 h-10 text-green-600" />
            : <XCircle     className="w-10 h-10 text-red-500" />}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          {result.isPassed ? 'Congratulations!' : 'Exam Complete'}
        </h2>
        <p className="text-gray-400 mb-6">
          {result.status === 'timed_out' ? 'Time ran out.' : 'You completed the exam.'}
        </p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-3xl font-bold text-gray-900">{result.percentage}%</p>
            <p className="text-sm text-gray-400">Score</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-3xl font-bold text-gray-900">{result.correctAnswers}/{result.totalQuestions}</p>
            <p className="text-sm text-gray-400">Correct</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-lg font-bold text-gray-900">{fmt(result.totalTimeTakenSeconds || 0)}</p>
            <p className="text-sm text-gray-400">Time Taken</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
            <BloomBadge level={result.finalBloomLevel} size="md" />
            <p className="text-xs text-gray-400">Bloom Level</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/student/exams')} className="btn-secondary flex-1">Back</button>
          <button onClick={() => navigate(`/student/attempts/${result.attemptId}/result`)} className="btn-primary flex-1">View Details</button>
        </div>
      </div>
    </div>
  );

  // ── Active exam ──────────────────────────────────────────────────────────────
  const isMulti = question?.isMultipleCorrect;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{examMeta?.title}</p>
            <p className="text-xs text-gray-400">
              Q {answered + 1} / {totalQ}
              {examMeta?.examType === 'final' && <span className="ml-2 text-purple-500">Final Test</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <BloomBadge level={currentBloom} />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${
            timeLeft !== null && timeLeft < 60   ? 'bg-red-100 text-red-600 animate-pulse'
            : timeLeft !== null && timeLeft < 300 ? 'bg-orange-100 text-orange-600'
            : 'bg-blue-50 text-blue-700'}`}>
            <Clock className="w-4 h-4" />
            {timeLeft !== null ? fmt(timeLeft) : '--:--'}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white h-1">
        <div className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${totalQ > 0 ? (answered / totalQ) * 100 : 0}%` }} />
      </div>

      {/* Question */}
      <div className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-2xl space-y-5">
          {question && (
            <>
              {/* Question card */}
              <div className="card">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {answered + 1}
                  </span>
                  <div className="flex-1 min-w-0 text-gray-900 font-medium text-base leading-relaxed">
                    <RichContent html={question.questionText} />
                  </div>
                </div>
                {question.imageUrl && (
                  <img src={question.imageUrl} alt="Question" className="mt-4 max-h-64 rounded-lg object-contain" />
                )}
                {isMulti && (
                  <p className="mt-3 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select ALL correct answers
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((opt) => {
                  const isSel = isMulti ? selectedMulti.includes(opt.index) : selected === opt.index;
                  const isCorrectOpt = feedback?.correctOptionIndices?.includes(opt.index);
                  const isWrongSel   = phase === 'feedback' && isSel && !isCorrectOpt;

                  let cls = 'border-2 border-gray-100 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer';
                  if (phase === 'feedback') {
                    if (isCorrectOpt)  cls = 'border-2 border-green-400 bg-green-50';
                    else if (isWrongSel) cls = 'border-2 border-red-400 bg-red-50';
                    else                 cls = 'border-2 border-gray-100 bg-gray-50 opacity-60';
                  } else if (isSel) {
                    cls = 'border-2 border-blue-500 bg-blue-50';
                  }

                  const circleClass = phase === 'feedback' && isCorrectOpt
                    ? 'bg-green-500 text-white'
                    : phase === 'feedback' && isWrongSel
                    ? 'bg-red-500 text-white'
                    : isSel
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-500';

                  const handleClick = () => {
                    if (phase !== 'active') return;
                    if (isMulti) toggleMultiOption(opt.index);
                    else setSelected(opt.index);
                  };

                  return (
                    <button key={opt.index} onClick={handleClick} disabled={phase === 'feedback'}
                      className={`w-full flex items-start gap-4 p-4 rounded-xl transition-all text-left ${cls}`}>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${circleClass}`}>
                        {isMulti && isSel ? <CheckSquare className="w-4 h-4" /> : String.fromCharCode(65 + opt.index)}
                      </span>
                      <div className="flex-1 min-w-0 text-gray-800 font-medium">
                        <RichContent html={opt.text} />
                      </div>
                      {phase === 'feedback' && isCorrectOpt && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />}
                      {phase === 'feedback' && isWrongSel   && <XCircle     className="w-5 h-5 text-red-500   shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Feedback */}
              {phase === 'feedback' && (
                <div className={`p-4 rounded-xl ${feedback.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`font-semibold flex items-center gap-2 ${feedback.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {feedback.isCorrect
                      ? <><CheckCircle2 className="w-4 h-4" /> Correct!</>
                      : <><XCircle      className="w-4 h-4" /> Incorrect</>}
                  </p>
                  {feedback.explanation && (
                    <div className="text-sm text-gray-600 mt-2">
                      <RichContent html={feedback.explanation} />
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Next question loading…</p>
                </div>
              )}

              {/* Submit / End */}
              {phase === 'active' && (
                <div className="flex gap-3">
                  <button onClick={submitAnswer} disabled={!hasSelection || submitting}
                    className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-base disabled:opacity-50">
                    {submitting ? 'Submitting…' : <><ChevronRight className="w-4 h-4" /> Submit Answer</>}
                  </button>
                  <button onClick={handleAutoSubmit}
                    className="btn-secondary px-4 py-3 text-sm flex items-center gap-1.5 text-red-500 hover:bg-red-50"
                    title="End exam early">
                    <AlertCircle className="w-4 h-4" /> End
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
