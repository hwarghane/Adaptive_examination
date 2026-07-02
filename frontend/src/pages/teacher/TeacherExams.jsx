import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { PageLoader } from '../../components/LoadingSpinner';
import { Plus, Pencil, Trash2, ClipboardList, Clock, BarChart3, Brain, ClipboardCheck, BookOpen } from 'lucide-react';

function ExamStatusBadge({ exam }) {
  const now = new Date();
  const start = new Date(exam.startTime);
  const end = new Date(exam.endTime);
  if (!exam.isPublished) return <span className="badge bg-gray-100 text-gray-500">Draft</span>;
  if (now < start) return <span className="badge bg-blue-100 text-blue-700">Upcoming</span>;
  if (now > end) return <span className="badge bg-gray-100 text-gray-500">Ended</span>;
  return <span className="badge bg-green-100 text-green-700 animate-pulse">● Live</span>;
}

function ExamCard({ exam, onDelete }) {
  const isFinal = exam.examType === 'final';
  return (
    <div className={`card hover:shadow-md transition-shadow flex flex-col border-l-4 ${isFinal ? 'border-purple-400' : 'border-blue-400'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isFinal
              ? <ClipboardCheck className="w-4 h-4 text-purple-500 shrink-0" />
              : <Brain className="w-4 h-4 text-blue-500 shrink-0" />}
            <h3 className="font-semibold text-gray-900">{exam.title}</h3>
            <ExamStatusBadge exam={exam} />
          </div>
          {exam.description && <p className="text-gray-400 text-sm line-clamp-1 ml-6">{exam.description}</p>}
          {isFinal && exam.subject?.name && (
            <div className="flex items-center gap-1 ml-6 mt-1">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-purple-600">{exam.subject.name}</span>
              {exam.topic && <span className="text-xs text-gray-400">→ {exam.topic}</span>}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          <Link to={`/teacher/exams/edit/${exam._id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
            <Pencil className="w-4 h-4" />
          </Link>
          <button onClick={() => onDelete(exam._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 my-2">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-400">Duration</p>
          <p className="text-sm font-semibold text-gray-700">{exam.durationMinutes}m</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-400">Questions</p>
          <p className="text-sm font-semibold text-gray-700">{exam.totalQuestions}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-400">Pass %</p>
          <p className="text-sm font-semibold text-gray-700">{exam.passingScore}%</p>
        </div>
      </div>

      <div className="text-xs text-gray-400 space-y-0.5 mb-3">
        <p>Start: {new Date(exam.startTime).toLocaleString()}</p>
        <p>End:&nbsp; {new Date(exam.endTime).toLocaleString()}</p>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {exam.assignedClasses?.map(cls => (
          <span key={cls._id} className="badge bg-blue-50 text-blue-600 text-xs">{cls.name}</span>
        ))}
      </div>

      <div className="mt-auto pt-3 border-t border-gray-100">
        <Link to={`/teacher/analytics/exam/${exam._id}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <BarChart3 className="w-4 h-4" /> View Analytics
        </Link>
      </div>
    </div>
  );
}

export default function TeacherExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // 'all' | 'adaptive' | 'final'

  useEffect(() => {
    api.get('/exams/my').then(r => setExams(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const deleteExam = async (id) => {
    if (!confirm('Delete this exam? This cannot be undone.')) return;
    try {
      await api.delete(`/exams/${id}`);
      setExams(e => e.filter(x => x._id !== id));
      toast.success('Exam deleted');
    } catch {
      toast.error('Failed to delete exam');
    }
  };

  const filtered = exams.filter(e =>
    tab === 'all' ? true : e.examType === tab
  );

  const adaptiveCount = exams.filter(e => e.examType === 'adaptive').length;
  const finalCount = exams.filter(e => e.examType === 'final').length;

  if (loading) return <PageLoader text="Loading exams..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
          <p className="text-gray-500 text-sm mt-1">
            {adaptiveCount} practice test{adaptiveCount !== 1 ? 's' : ''} · {finalCount} final test{finalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/teacher/exams/create" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Exam
        </Link>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All Exams', count: exams.length },
          { key: 'adaptive', label: '🧠 Practice Tests', count: adaptiveCount },
          { key: 'final', label: '📋 Final Tests', count: finalCount },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label} <span className="opacity-70 ml-1">({count})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            No {tab === 'final' ? 'final tests' : tab === 'adaptive' ? 'practice tests' : 'exams'} yet
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            {tab === 'final'
              ? 'Create a final test for a specific subject.'
              : 'Create an adaptive practice test with Bloom-based question selection.'}
          </p>
          <Link to="/teacher/exams/create" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create First Exam
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(exam => (
            <ExamCard key={exam._id} exam={exam} onDelete={deleteExam} />
          ))}
        </div>
      )}
    </div>
  );
}
