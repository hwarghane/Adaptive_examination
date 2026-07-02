import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader } from '../../components/LoadingSpinner';
import BloomBadge from '../../components/BloomBadge';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, Cell
} from 'recharts';
import { Brain, TrendingUp, CheckCircle2, AlertCircle, Lightbulb, Clock, ArrowRight } from 'lucide-react';

const BLOOM_SEQUENCE = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
const BLOOM_COLORS = {
  Remember: '#94a3b8', Understand: '#60a5fa', Apply: '#facc15',
  Analyze: '#fb923c', Evaluate: '#a78bfa', Create: '#f87171',
};

export default function StudentAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/student/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader text="Loading analytics..." />;

  const scoreOverTime = data?.bloomProgression?.map((b, i) => ({
    name: `Exam ${i + 1}`,
    score: b.percentage,
    bloom: b.finalBloomLevel,
  })) || [];

  const radarData = BLOOM_SEQUENCE.map(level => {
    const stats = data?.bloomStats?.[level] || { total: 0, correct: 0 };
    const rate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    return { level, rate, fullMark: 100 };
  });

  const bloomBarData = BLOOM_SEQUENCE.map(level => {
    const stats = data?.bloomStats?.[level] || { total: 0, correct: 0 };
    return {
      level,
      total: stats.total,
      correct: stats.correct,
      rate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    };
  }).filter(b => b.total > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
        <p className="text-gray-500 text-sm mt-1">Track your learning journey across all exams.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Exams Taken', value: data?.totalAttempts || 0, icon: Brain, color: 'blue' },
          { label: 'Average Score', value: `${data?.avgScore || 0}%`, icon: TrendingUp, color: 'green' },
          { label: 'Strengths', value: data?.strengths?.length || 0, icon: CheckCircle2, color: 'emerald' },
          { label: 'To Improve', value: data?.weaknesses?.length || 0, icon: AlertCircle, color: 'orange' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`card bg-${color}-50 border-${color}-100`}>
            <Icon className={`w-6 h-6 text-${color}-600 mb-2`} />
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {data?.totalAttempts === 0 ? (
        <div className="card text-center py-16">
          <Brain className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No exam data yet</h3>
          <p className="text-gray-400 text-sm mb-6">Take your first exam to see detailed analytics here.</p>
          <Link to="/student/exams" className="btn-primary inline-flex items-center gap-2">
            View Exams <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Score over time */}
          {scoreOverTime.length > 0 && (
            <div className="card">
              <h2 className="font-semibold mb-4">Score Trend Over Time</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={scoreOverTime}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bloom performance radar */}
            <div className="card">
              <h2 className="font-semibold mb-4">Bloom's Level Performance</h2>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="level" tick={{ fontSize: 11 }} />
                  <Radar name="Accuracy %" dataKey="rate" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Accuracy']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bloom bar chart */}
            {bloomBarData.length > 0 && (
              <div className="card">
                <h2 className="font-semibold mb-4">Questions by Bloom Level</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={bloomBarData}>
                    <XAxis dataKey="level" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="correct" name="Correct" radius={[4,4,0,0]}>
                      {bloomBarData.map((entry) => (
                        <Cell key={entry.level} fill={BLOOM_COLORS[entry.level]} />
                      ))}
                    </Bar>
                    <Bar dataKey="total" name="Total" fill="#e2e8f0" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card border-l-4 border-green-400">
              <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Strengths (≥70% accuracy)
              </h3>
              {data?.strengths?.length > 0 ? (
                <div className="space-y-2">
                  {data.strengths.map(s => (
                    <div key={s.level} className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg">
                      <BloomBadge level={s.level} />
                      <span className="text-green-700 font-semibold text-sm">{s.rate}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Keep practising to build your strengths!</p>
              )}
            </div>

            <div className="card border-l-4 border-orange-400">
              <h3 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Needs Improvement (&lt;50% accuracy)
              </h3>
              {data?.weaknesses?.length > 0 ? (
                <div className="space-y-2">
                  {data.weaknesses.map(w => (
                    <div key={w.level} className="flex items-center justify-between bg-orange-50 px-3 py-2 rounded-lg">
                      <BloomBadge level={w.level} />
                      <span className="text-orange-700 font-semibold text-sm">{w.rate}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Great job — no major weaknesses!</p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {data?.recommendations?.length > 0 && (
            <div className="card border-l-4 border-blue-400">
              <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> Recommendations
              </h3>
              <p className="text-gray-500 text-sm mb-3">Focus on these Bloom levels to boost your score:</p>
              <div className="flex flex-wrap gap-2">
                {data.recommendations.map(level => (
                  <div key={level} className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                    <BloomBadge level={level} />
                    <span className="text-blue-600 text-xs">Practice more</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exam history table */}
          <div className="card">
            <h2 className="font-semibold mb-4">Exam History</h2>
            {data?.recentAttempts?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-3 font-medium">Exam</th>
                      <th className="pb-3 font-medium">Score</th>
                      <th className="pb-3 font-medium">Correct</th>
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Bloom Level</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.recentAttempts.map(a => (
                      <tr key={a._id} className="hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-900">{a.exam?.title || '—'}</td>
                        <td className="py-3">
                          <span className={`font-bold ${a.isPassed ? 'text-green-600' : 'text-red-500'}`}>{a.percentage}%</span>
                        </td>
                        <td className="py-3 text-gray-500">{a.correctAnswers}/{a.totalQuestions}</td>
                        <td className="py-3 text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {Math.round((a.totalTimeTakenSeconds || 0) / 60)}m
                        </td>
                        <td className="py-3"><BloomBadge level={a.finalBloomLevel} /></td>
                        <td className="py-3">
                          <span className={`badge ${a.isPassed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {a.isPassed ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400 text-xs">{new Date(a.completedAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <Link to={`/student/attempts/${a._id}/result`} className="text-blue-600 text-xs hover:underline">Details</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-6">No completed exams yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
