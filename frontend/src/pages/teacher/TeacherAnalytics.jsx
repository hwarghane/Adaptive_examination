import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader } from '../../components/LoadingSpinner';
import BloomBadge from '../../components/BloomBadge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { BarChart3, Clock, Users, Brain, BookOpen, ClipboardList, ArrowRight } from 'lucide-react';

const BLOOM_COLORS = {
  Remember: '#94a3b8', Understand: '#60a5fa', Apply: '#facc15',
  Analyze: '#fb923c', Evaluate: '#a78bfa', Create: '#f87171',
};

function fmt(secs) {
  if (!secs) return '0m 0s';
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}m ${s}s`;
}

export default function TeacherAnalytics() {
  const [dashboard,  setDashboard]  = useState(null);
  const [classes,    setClasses]    = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [exams,      setExams]      = useState([]);
  const [tab,        setTab]        = useState('class'); // 'class' | 'subject' | 'exam'
  const [selected,   setSelected]   = useState('');
  const [detail,     setDetail]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [detLoading, setDetLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/teacher/dashboard'),
      api.get('/classes/my'),
      api.get('/subjects/my'),
      api.get('/exams/my'),
    ]).then(([d, c, s, e]) => {
      setDashboard(d.data);
      setClasses(c.data);
      setSubjects(s.data);
      setExams(e.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetLoading(true);
    const url = tab === 'class'
      ? `/analytics/teacher/class/${selected}`
      : tab === 'subject'
      ? `/analytics/teacher/subject/${selected}`
      : `/analytics/teacher/exam/${selected}`;
    api.get(url)
      .then(r => setDetail(r.data))
      .catch(() => setDetail(null))
      .finally(() => setDetLoading(false));
  }, [selected, tab]);

  const changeTab = (t) => { setTab(t); setSelected(''); setDetail(null); };

  if (loading) return <PageLoader text="Loading analytics..." />;

  // Prepare chart data
  const bloomData = detail?.bloomDistribution
    ? Object.entries(detail.bloomDistribution).map(([name, value]) => ({ name, value }))
    : [];
  const scoreData = detail?.scoreDistribution
    ? Object.entries(detail.scoreDistribution).map(([range, count]) => ({ range, count }))
    : [];
  const timeData = detail?.examTimeList || [];
  const bloomBreak = detail?.bloomBreakdown
    ? Object.entries(detail.bloomBreakdown)
        .filter(([, s]) => s.total > 0)
        .map(([level, s]) => ({
          level, total: s.total, correct: s.correct,
          rate: Math.round((s.correct / s.total) * 100),
        }))
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Classes',    value: dashboard?.totalClasses   || 0, icon: Users,        color: 'blue' },
          { label: 'Exams',      value: dashboard?.totalExams     || 0, icon: ClipboardList, color: 'purple' },
          { label: 'Students',   value: dashboard?.totalStudents  || 0, icon: Users,        color: 'green' },
          { label: 'Avg Score',  value: `${dashboard?.avgScore    || 0}%`, icon: BarChart3, color: 'orange' },
          { label: 'Avg Time',   value: fmt(dashboard?.avgTimeSecs || 0), icon: Clock,      color: 'teal' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`card bg-${color}-50 border-${color}-100`}>
            <Icon className={`w-5 h-5 text-${color}-500 mb-1`} />
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Selector tabs */}
      <div className="card space-y-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'class',   label: '🏫 By Class',   icon: Users },
            { key: 'subject', label: '📚 By Subject',  icon: BookOpen },
            { key: 'exam',    label: '📋 By Exam',     icon: ClipboardList },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => changeTab(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select {tab === 'class' ? 'Class' : tab === 'subject' ? 'Subject' : 'Exam'}
          </label>
          <select className="input-field w-72" value={selected} onChange={e => setSelected(e.target.value)}>
            <option value="">— Choose —</option>
            {tab === 'class'   && classes.map(c  => <option key={c._id} value={c._id}>{c.name}</option>)}
            {tab === 'subject' && subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            {tab === 'exam'    && exams.map(e    => <option key={e._id} value={e._id}>{e.title} ({e.examType})</option>)}
          </select>
        </div>
      </div>

      {detLoading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {detail && !detail.message && !detLoading && (
        <>
          {/* Stat summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Attempts',  value: detail.totalAttempts || 0 },
              { label: 'Avg Score', value: `${detail.avgScore || 0}%` },
              { label: 'Avg Time',  value: fmt(detail.avgTimeSecs) },
              { label: tab === 'class' ? 'Enrolled' : tab === 'subject' ? 'Questions' : 'Classes',
                value: tab === 'class' ? (detail.enrollmentCount || 0)
                     : tab === 'subject' ? (detail.questionCount || 0)
                     : (detail.classSummaries?.length || 0) },
            ].map(({ label, value }) => (
              <div key={label} className="card text-center">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Exam code for final tests */}
          {detail.examCode && (
            <div className="card bg-purple-50 border-purple-200 flex items-center gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Student Exam Code</p>
                <p className="font-mono font-bold text-2xl tracking-widest text-purple-700">{detail.examCode}</p>
              </div>
              <p className="text-xs text-gray-400 ml-2">Students enter this code to access the final test</p>
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score distribution */}
            {scoreData.length > 0 && (
              <div className="card">
                <h3 className="font-semibold mb-4">Score Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={scoreData}>
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bloom distribution */}
            {bloomData.filter(d => d.value > 0).length > 0 && (
              <div className="card">
                <h3 className="font-semibold mb-4">Final Bloom Level Reached</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={bloomData.filter(d => d.value > 0)}
                      dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={75}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}>
                      {bloomData.map(e => <Cell key={e.name} fill={BLOOM_COLORS[e.name] || '#ccc'} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bloom accuracy breakdown */}
          {bloomBreak.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" /> Bloom Level Accuracy
              </h3>
              <div className="space-y-2">
                {bloomBreak.map(b => (
                  <div key={b.level} className="flex items-center gap-3">
                    <BloomBadge level={b.level} />
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{ width: `${b.rate}%`, backgroundColor: BLOOM_COLORS[b.level] }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-12 text-right">{b.rate}%</span>
                    <span className="text-xs text-gray-400 w-16">{b.correct}/{b.total} correct</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-exam time (class/subject view) */}
          {timeData.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" /> Time per Exam
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timeData}>
                  <XAxis dataKey="title" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => `${Math.round(v/60)}m`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="avgSecs" name="Avg Time" fill="#14b8a6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-class breakdown for exams */}
          {detail.classSummaries?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-4">Per-Class Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-2">Class</th>
                      <th className="pb-2">Attempts</th>
                      <th className="pb-2">Avg Score</th>
                      <th className="pb-2">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {detail.classSummaries.map(c => (
                      <tr key={c.classId} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium">{c.className}</td>
                        <td className="py-2.5 text-gray-500">{c.count}</td>
                        <td className="py-2.5">
                          <span className={`font-semibold ${c.avgScore >= 40 ? 'text-green-600' : 'text-red-500'}`}>
                            {c.avgScore}%
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-500">{fmt(c.avgTimeSecs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent attempts table */}
          {detail.recentAttempts?.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Recent Attempts</h3>
                {tab === 'exam' && (
                  <Link to={`/teacher/analytics/exam/${selected}`} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                    Full report <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-2">Student</th>
                      <th className="pb-2">Exam</th>
                      <th className="pb-2">Score</th>
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Bloom</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {detail.recentAttempts.map(a => (
                      <tr key={a._id} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium">{a.student?.name}</td>
                        <td className="py-2.5 text-gray-500 text-xs">{a.exam?.title}</td>
                        <td className="py-2.5">
                          <span className={`font-semibold ${a.isPassed ? 'text-green-600' : 'text-red-500'}`}>
                            {a.percentage}%
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-500">{fmt(a.totalTimeTakenSeconds)}</td>
                        <td className="py-2.5"><BloomBadge level={a.finalBloomLevel} /></td>
                        <td className="py-2.5 text-gray-400 text-xs">{new Date(a.completedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {detail?.message && !detLoading && (
        <div className="card text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No exam data yet for the selected {tab}.</p>
        </div>
      )}
    </div>
  );
}
