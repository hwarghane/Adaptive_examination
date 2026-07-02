import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../../components/LoadingSpinner';
import { Users, ClipboardList, FileQuestion, BarChart3, TrendingUp, Plus, ArrowRight } from 'lucide-react';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentClasses, setRecentClasses] = useState([]);
  const [recentExams, setRecentExams] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/teacher/dashboard'),
      api.get('/classes/my'),
      api.get('/exams/my'),
    ]).then(([s, c, e]) => {
      setStats(s.data);
      setRecentClasses(c.data.slice(0, 3));
      setRecentExams(e.data.slice(0, 3));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader text="Loading dashboard..." />;

  const statCards = [
    { label: 'Total Classes', value: stats?.totalClasses || 0, icon: Users, color: 'blue', link: '/teacher/classes' },
    { label: 'Total Exams', value: stats?.totalExams || 0, icon: ClipboardList, color: 'purple', link: '/teacher/exams' },
    { label: 'Total Students', value: stats?.totalStudents || 0, icon: TrendingUp, color: 'green', link: '/teacher/analytics' },
    { label: 'Avg Score', value: `${stats?.avgScore || 0}%`, icon: BarChart3, color: 'orange', link: '/teacher/analytics' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good day, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="text-gray-500 mt-1">Here's what's happening in your classes.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, link }) => (
          <Link key={label} to={link} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent classes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Classes</h2>
            <Link to="/teacher/classes" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentClasses.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm mb-3">No classes yet</p>
              <Link to="/teacher/classes" className="btn-primary text-sm inline-flex items-center gap-1">
                <Plus className="w-4 h-4" /> Create Class
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentClasses.map(cls => (
                <Link key={cls._id} to={`/teacher/classes/${cls._id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{cls.name}</p>
                    <p className="text-gray-400 text-xs">{cls.enrollmentCount || 0} students • {cls.joinCode}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent exams */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Exams</h2>
            <Link to="/teacher/exams" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentExams.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm mb-3">No exams yet</p>
              <Link to="/teacher/exams/create" className="btn-primary text-sm inline-flex items-center gap-1">
                <Plus className="w-4 h-4" /> Create Exam
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExams.map(exam => {
                const now = new Date();
                const start = new Date(exam.startTime);
                const end = new Date(exam.endTime);
                const status = now < start ? 'Upcoming' : now > end ? 'Ended' : 'Live';
                const statusColor = {
                  Upcoming: 'text-blue-600 bg-blue-50',
                  Live: 'text-green-600 bg-green-50',
                  Ended: 'text-gray-500 bg-gray-100'
                };
                return (
                  <div key={exam._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{exam.title}</p>
                      <p className="text-gray-400 text-xs">{exam.durationMinutes} min • {exam.totalQuestions} questions</p>
                    </div>
                    <span className={`badge ${statusColor[status]} text-xs`}>{status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/teacher/classes', label: 'Create Class', icon: Users, color: 'blue' },
            { to: '/teacher/questions/add', label: 'Add Question', icon: FileQuestion, color: 'purple' },
            { to: '/teacher/exams/create', label: 'Create Exam', icon: ClipboardList, color: 'green' },
            { to: '/teacher/analytics', label: 'View Analytics', icon: BarChart3, color: 'orange' },
          ].map(({ to, label, icon: Icon, color }) => (
            <Link key={to} to={to} className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-${color}-50 hover:bg-${color}-100 transition-colors text-center`}>
              <Icon className={`w-6 h-6 text-${color}-600`} />
              <span className={`text-sm font-medium text-${color}-700`}>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
