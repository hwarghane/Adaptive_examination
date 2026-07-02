import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader } from '../../components/LoadingSpinner';
import BloomBadge from '../../components/BloomBadge';
import { ArrowLeft, Clock, Hash, Brain } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const BLOOM_COLORS = {
  Remember: '#94a3b8', Understand: '#60a5fa', Apply: '#facc15',
  Analyze: '#fb923c', Evaluate: '#a78bfa', Create: '#f87171',
};

function fmt(secs) {
  if (!secs) return '0m 0s';
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function ExamAnalytics() {
  const { id } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/analytics/teacher/exam/${id}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (!data)   return <div className="card text-center py-12 text-gray-400">Exam not found.</div>;

  const bloomData = data.bloomDistribution
    ? Object.entries(data.bloomDistribution).filter(([,v]) => v > 0).map(([name,value]) => ({ name, value }))
    : [];

  const bloomBreak = data.bloomBreakdown
    ? Object.entries(data.bloomBreakdown)
        .filter(([, s]) => s.total > 0)
        .map(([level, s]) => ({ level, rate: Math.round((s.correct / s.total) * 100), total: s.total, correct: s.correct }))
    : [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link to="/teacher/analytics" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.examTitle}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-gray-400 text-sm">{data.totalAttempts} attempts</span>
            <span className={`badge text-xs ${data.examType === 'final' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {data.examType === 'final' ? 'Final Test' : 'Practice Test'}
            </span>
            {data.subject && <span className="text-xs text-gray-400">Subject: {data.subject.name}</span>}
          </div>
        </div>
      </div>

      {/* Exam code */}
      {data.examCode && (
        <div className="card bg-purple-50 border-purple-200 flex items-center gap-4">
          <Hash className="w-5 h-5 text-purple-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Student Exam Code</p>
            <p className="font-mono font-bold text-2xl text-purple-700 tracking-widest">{data.examCode}</p>
          </div>
          <p className="text-xs text-gray-400 ml-2">Share this code with students to access the exam directly</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Attempts',  value: data.totalAttempts },
          { label: 'Avg Score', value: `${data.avgScore}%` },
          { label: 'Avg Time',  value: fmt(data.avgTimeSecs) },
          { label: 'Classes',   value: data.classSummaries?.length || 0 },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bloomData.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-4">Final Bloom Level Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={bloomData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {bloomData.map(e => <Cell key={e.name} fill={BLOOM_COLORS[e.name] || '#ccc'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.scoreDistribution && (
          <div className="card">
            <h3 className="font-semibold mb-4">Score Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={Object.entries(data.scoreDistribution).map(([range, count]) => ({ range, count }))}>
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bloom accuracy */}
      {bloomBreak.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" /> Accuracy by Bloom Level
          </h3>
          <div className="space-y-2">
            {bloomBreak.map(b => (
              <div key={b.level} className="flex items-center gap-3">
                <BloomBadge level={b.level} />
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div className="h-3 rounded-full" style={{ width: `${b.rate}%`, backgroundColor: BLOOM_COLORS[b.level] }} />
                </div>
                <span className="text-sm font-semibold w-10 text-right">{b.rate}%</span>
                <span className="text-xs text-gray-400 w-16">{b.correct}/{b.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-class */}
      {data.classSummaries?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">Per-Class Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.classSummaries.map(cls => (
              <div key={cls.classId} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="font-semibold text-gray-900">{cls.className}</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{cls.avgScore}%</p>
                <p className="text-xs text-gray-400">{cls.count} attempts · {fmt(cls.avgTimeSecs)} avg</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All attempts */}
      <div className="card">
        <h3 className="font-semibold mb-4">All Student Attempts</h3>
        {data.attempts?.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No attempts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2">Student</th>
                  <th className="pb-2">Class</th>
                  <th className="pb-2">Score</th>
                  <th className="pb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Time</th>
                  <th className="pb-2">Bloom</th>
                  <th className="pb-2">Result</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.attempts.map(a => (
                  <tr key={a._id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium">{a.student?.name}</td>
                    <td className="py-2.5 text-gray-500">{a.class?.name}</td>
                    <td className="py-2.5">
                      <span className={`font-semibold ${a.isPassed ? 'text-green-600' : 'text-red-500'}`}>
                        {a.percentage}%
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500">{fmt(a.totalTimeTakenSeconds)}</td>
                    <td className="py-2.5"><BloomBadge level={a.finalBloomLevel} /></td>
                    <td className="py-2.5">
                      <span className={`badge ${a.isPassed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {a.isPassed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400 text-xs">{new Date(a.completedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
