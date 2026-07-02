import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../../components/LoadingSpinner';
import BloomBadge from '../../components/BloomBadge';
import { ClipboardList, BarChart3, TrendingUp, ArrowRight, Plus, CheckCircle2, XCircle } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/student/dashboard'),
      api.get('/exams/student/available'),
    ]).then(([d, e]) => {
      setDashboard(d.data);
      const now = new Date();
      setExams(e.data.filter(ex =>
        new Date(ex.startTime) <= now && new Date(ex.endTime) >= now
      ).slice(0, 3));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader text="Loading dashboard..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name?.split(' ')[0]}! 🎓</h1>
        <p className="text-gray-500 mt-1">Track your progress and take exams.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Exams Taken', value: dashboard?.totalAttempts || 0, icon: ClipboardList, color: 'blue' },
          { label: 'Avg Score', value: `${dashboard?.avgScore || 0}%`, icon: TrendingUp, color: 'green' },
          { label: 'Strengths', value: dashboard?.strengths?.length || 0, icon: CheckCircle2, color: 'emerald' },
          { label: 'Improve', value: dashboard?.weaknesses?.length || 0, icon: BarChart3, color: 'orange' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl bg-${color}-100 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live exams */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Live Exams</h2>
            <Link to="/student/exams" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
              All exams <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {exams.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No live exams right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map(exam => (
                <div key={exam._id} className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{exam.title}</p>
                    <p className="text-xs text-gray-400">{exam.durationMinutes} min • Ends {new Date(exam.endTime).toLocaleTimeString()}</p>
                  </div>
                  <Link to={`/student/exams/${exam._id}/take`} className="btn-success text-xs px-3 py-1.5">
                    Start
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent results */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Results</h2>
            <Link to="/student/analytics" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
              Full report <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {!dashboard?.recentAttempts?.length ? (
            <div className="text-center py-8">
              <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No exam results yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.recentAttempts.map(a => (
                <Link key={a._id} to={`/student/attempts/${a._id}/result`} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{a.exam?.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <BloomBadge level={a.finalBloomLevel} />
                      <span className="text-xs text-gray-400">{new Date(a.completedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${a.isPassed ? 'text-green-600' : 'text-red-500'}`}>{a.percentage}%</p>
                    <p className="text-xs text-gray-400">{a.isPassed ? 'Passed' : 'Failed'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      {(dashboard?.strengths?.length > 0 || dashboard?.weaknesses?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dashboard.strengths?.length > 0 && (
            <div className="card border-l-4 border-green-400">
              <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Strengths
              </h3>
              <div className="flex flex-wrap gap-2">
                {dashboard.strengths.map(s => (
                  <div key={s.level} className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                    <BloomBadge level={s.level} />
                    <span className="text-green-700 text-xs font-medium">{s.rate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {dashboard.weaknesses?.length > 0 && (
            <div className="card border-l-4 border-orange-400">
              <h3 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Needs Improvement
              </h3>
              <div className="flex flex-wrap gap-2">
                {dashboard.weaknesses.map(w => (
                  <div key={w.level} className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full">
                    <BloomBadge level={w.level} />
                    <span className="text-orange-700 text-xs font-medium">{w.rate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Join a class CTA */}
      <div className="card bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-emerald-900">Join a New Class</h3>
            <p className="text-emerald-600 text-sm mt-0.5">Enter the join code shared by your teacher</p>
          </div>
          <Link to="/student/classes" className="btn-success flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Join Class
          </Link>
        </div>
      </div>
    </div>
  );
}
