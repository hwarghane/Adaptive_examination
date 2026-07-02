import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader } from '../../components/LoadingSpinner';
import BloomBadge from '../../components/BloomBadge';
import { ArrowLeft, CheckCircle2, XCircle, Clock, TrendingUp, Brain } from 'lucide-react';
import { RichContent } from '../../components/RichTextEditor';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

export default function ExamResult() {
  const { id } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/attempts/result/${id}`)
      .then(r => setAttempt(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader text="Loading result..." />;
  if (!attempt) return <div className="card text-center py-12 text-gray-400">Result not found.</div>;

  const bloomHistory = attempt.bloomProgression || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/student/exams" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{attempt.exam?.title}</h1>
          <p className="text-gray-400 text-sm">
            {attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : ''}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`card text-center ${attempt.isPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {attempt.isPassed
            ? <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-1" />
            : <XCircle className="w-8 h-8 text-red-500 mx-auto mb-1" />}
          <p className="text-2xl font-bold text-gray-900">{attempt.percentage}%</p>
          <p className="text-xs text-gray-500">{attempt.isPassed ? 'Passed' : 'Not Passed'}</p>
        </div>
        <div className="card text-center">
          <CheckCircle2 className="w-8 h-8 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{attempt.correctAnswers}/{attempt.totalQuestions}</p>
          <p className="text-xs text-gray-500">Correct Answers</p>
        </div>
        <div className="card text-center">
          <Clock className="w-8 h-8 text-orange-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{formatTime(attempt.totalTimeTakenSeconds || 0)}</p>
          <p className="text-xs text-gray-500">Time Taken</p>
        </div>
        <div className="card text-center">
          <Brain className="w-8 h-8 text-purple-500 mx-auto mb-1" />
          <BloomBadge level={attempt.finalBloomLevel} size="md" />
          <p className="text-xs text-gray-500 mt-1">Final Bloom Level</p>
        </div>
      </div>

      {/* Bloom progression */}
      {bloomHistory.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Bloom's Level Progression
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {bloomHistory.filter(b => b.questionsAnswered > 0).map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-center">
                  <BloomBadge level={b.level} />
                  <p className="text-xs text-gray-400 mt-1">
                    {b.correctAnswers}/{b.questionsAnswered} correct
                  </p>
                </div>
                {i < bloomHistory.length - 1 && <span className="text-gray-300">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer breakdown */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Answer Breakdown</h2>
        <div className="space-y-4">
          {attempt.answers?.map((ans, i) => {
            const q = ans.question;
            const isCorrect = ans.isCorrect;
            return (
              <div key={i} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-100 bg-green-50/50' : 'border-red-100 bg-red-50/50'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <BloomBadge level={ans.bloomLevelAtAnswer} />
                      <span className="text-xs text-gray-400">Difficulty: {ans.difficultyAtAnswer}/6</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {ans.timeTakenSeconds}s
                      </span>
                    </div>
                    <div className="text-gray-900 font-medium text-sm">
                      <RichContent html={q?.questionText || ans.questionTextSnapshot || 'Question removed'} />
                    </div>
                  </div>
                </div>

                {q?.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-9">
                    {q.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 px-3 py-1.5 rounded-lg text-xs ${
                          idx === ans.correctOptionIndex
                            ? 'bg-green-100 text-green-800 font-medium'
                            : idx === ans.selectedOptionIndex && !isCorrect
                            ? 'bg-red-100 text-red-700'
                            : 'bg-white text-gray-500 border border-gray-100'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs shrink-0 font-bold mt-0.5 ${
                          idx === ans.correctOptionIndex ? 'bg-green-500 text-white' :
                          idx === ans.selectedOptionIndex && !isCorrect ? 'bg-red-400 text-white' :
                          'bg-gray-200 text-gray-500'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <RichContent html={opt.text} />
                        </div>
                        {idx === ans.selectedOptionIndex && !isCorrect && <span className="shrink-0 text-red-500">← yours</span>}
                        {idx === ans.correctOptionIndex && <span className="shrink-0">✓</span>}
                      </div>
                    ))}
                  </div>
                )}

                {q?.explanation && (
                  <div className="ml-9 mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                    <span className="font-medium">💡 Explanation: </span>
                    <RichContent html={q.explanation} className="inline" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pb-4">
        <Link to="/student/exams" className="btn-secondary flex-1 text-center">Back to Exams</Link>
        <Link to="/student/analytics" className="btn-primary flex-1 text-center">View Progress</Link>
      </div>
    </div>
  );
}
