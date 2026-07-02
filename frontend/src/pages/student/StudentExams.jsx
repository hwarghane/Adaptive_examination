import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { PageLoader } from '../../components/LoadingSpinner';
import BloomBadge from '../../components/BloomBadge';
import { ClipboardList, Clock, Play, CheckCircle2, Lock, Brain, ClipboardCheck, BookOpen, Hash } from 'lucide-react';

function ExamCard({ exam, attempt }) {
  const now       = new Date();
  const start     = new Date(exam.startTime);
  const end       = new Date(exam.endTime);
  const isLive    = now >= start && now <= end;
  const isUpcoming = now < start;
  const isEnded   = now > end;
  const isCompleted = attempt?.status === 'completed' || attempt?.status === 'timed_out';
  const isFinal   = exam.examType === 'final';

  return (
    <div className={`card hover:shadow-md transition-shadow border-l-4 ${
      isLive && !isCompleted
        ? isFinal ? 'border-purple-400 bg-purple-50/20' : 'border-green-400 bg-green-50/20'
        : isFinal ? 'border-purple-200' : 'border-blue-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isFinal
              ? <ClipboardCheck className="w-4 h-4 text-purple-500 shrink-0" />
              : <Brain className="w-4 h-4 text-blue-500 shrink-0" />}
            <h3 className="font-semibold text-gray-900">{exam.title}</h3>
            <span className={`badge text-xs ${isFinal ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {isFinal ? 'Final Test' : 'Practice Test'}
            </span>
            {isLive && !isCompleted && <span className="badge bg-green-100 text-green-700 animate-pulse">● Live</span>}
            {isUpcoming && <span className="badge bg-sky-100 text-sky-700">Upcoming</span>}
            {isEnded && !isCompleted && <span className="badge bg-gray-100 text-gray-500">Ended</span>}
            {isCompleted && <span className="badge bg-emerald-100 text-emerald-700">✓ Completed</span>}
          </div>

          {isFinal && exam.subject?.name && (
            <div className="flex items-center gap-1 ml-6 mb-1">
              <BookOpen className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-purple-600">{exam.subject.name}</span>
              {exam.topic && <span className="text-xs text-gray-400">→ {exam.topic}</span>}
            </div>
          )}

          {exam.description && (
            <p className="text-gray-400 text-sm mb-2 ml-6 line-clamp-1">{exam.description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-gray-400 ml-6">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.durationMinutes}m</span>
            <span>{exam.totalQuestions} questions</span>
            <span>Pass: {exam.passingScore}%</span>
            {exam.assignedClasses?.map(c => (
              <span key={c._id} className="badge bg-gray-100 text-gray-500">{c.name}</span>
            ))}
          </div>

          <div className="text-xs text-gray-400 mt-1.5 ml-6">
            {new Date(exam.startTime).toLocaleString()} — {new Date(exam.endTime).toLocaleString()}
          </div>

          {isCompleted && attempt && (
            <div className="ml-6 mt-2 flex items-center gap-3">
              <span className={`text-sm font-bold ${attempt.isPassed ? 'text-green-600' : 'text-red-500'}`}>
                {attempt.percentage}% — {attempt.isPassed ? 'Passed' : 'Failed'}
              </span>
              {attempt.finalBloomLevel && <BloomBadge level={attempt.finalBloomLevel} />}
            </div>
          )}
        </div>

        <div className="shrink-0">
          {isCompleted ? (
            <Link to={`/student/attempts/${attempt._id}/result`}
              className="btn-secondary text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-500" /> Results
            </Link>
          ) : isLive ? (
            <Link to={`/student/exams/${exam._id}/take`}
              className={`text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-white transition-colors ${
                isFinal ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'
              }`}>
              <Play className="w-4 h-4" /> Start
            </Link>
          ) : (
            <button disabled
              className="btn-secondary text-sm flex items-center gap-1.5 opacity-50 cursor-not-allowed">
              <Lock className="w-4 h-4" /> {isUpcoming ? 'Soon' : 'Ended'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentExams() {
  const navigate = useNavigate();
  const [exams,    setExams]    = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [typeTab,  setTypeTab]  = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Exam code entry
  const [examCode,      setExamCode]      = useState('');
  const [codeSearching, setCodeSearching] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/exams/student/available'),
      api.get('/attempts/my/all'),
    ]).then(([e, a]) => {
      setExams(e.data);
      setAttempts(a.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getAttempt = (examId) =>
    attempts.find(a => (a.exam?._id || a.exam) === examId);

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    const code = examCode.trim().toUpperCase();
    if (!code) return;
    setCodeSearching(true);
    try {
      const { data } = await api.get(`/exams/by-code/${code}`);
      toast.success(`Found: "${data.title}"`);
      navigate(`/student/exams/${data._id}/take`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Exam not found');
    } finally {
      setCodeSearching(false);
    }
  };

  const displayed = exams.filter(exam => {
    const now       = new Date();
    const start     = new Date(exam.startTime);
    const end       = new Date(exam.endTime);
    const attempt   = getAttempt(exam._id);
    const isCompleted = attempt?.status === 'completed' || attempt?.status === 'timed_out';
    if (typeTab !== 'all' && exam.examType !== typeTab) return false;
    if (statusFilter === 'live')      return now >= start && now <= end && !isCompleted;
    if (statusFilter === 'upcoming')  return now < start;
    if (statusFilter === 'completed') return isCompleted;
    if (statusFilter === 'ended')     return now > end && !isCompleted;
    return true;
  });

  const liveCount     = exams.filter(e => {
    const now = new Date(); const a = getAttempt(e._id);
    return new Date(e.startTime) <= now && new Date(e.endTime) >= now &&
      !(a?.status === 'completed' || a?.status === 'timed_out');
  }).length;
  const practiceCount = exams.filter(e => e.examType === 'adaptive').length;
  const finalCount    = exams.filter(e => e.examType === 'final').length;

  if (loading) return <PageLoader text="Loading exams..." />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
        <p className="text-gray-500 text-sm mt-1">
          {practiceCount} practice · {finalCount} final
          {liveCount > 0 && <span className="ml-2 text-green-600 font-semibold">● {liveCount} live</span>}
        </p>
      </div>

      {/* Exam code entry for final tests */}
      <div className="card bg-purple-50 border-purple-200">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-4 h-4 text-purple-600" />
          <h3 className="font-semibold text-purple-900 text-sm">Have an exam code?</h3>
        </div>
        <p className="text-xs text-purple-600 mb-3">
          Your teacher may give you a 6-character code to access a final test directly.
        </p>
        <form onSubmit={handleCodeSubmit} className="flex gap-2">
          <input
            className="input-field flex-1 uppercase tracking-widest font-mono text-sm"
            placeholder="Enter 6-char code (e.g. A3F9B2)"
            value={examCode}
            onChange={e => setExamCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button type="submit" disabled={codeSearching || examCode.length < 6}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50 whitespace-nowrap transition-colors">
            {codeSearching ? 'Searching...' : 'Enter Exam'}
          </button>
        </form>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',      label: 'All',             count: exams.length },
          { key: 'adaptive', label: '🧠 Practice',     count: practiceCount },
          { key: 'final',    label: '📋 Final Tests',  count: finalCount },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => setTypeTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              typeTab === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {label} <span className="opacity-60 text-xs">({count})</span>
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['all','live','upcoming','completed','ended'].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              statusFilter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="card text-center py-14">
          <ClipboardList className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-400 mb-1">No exams here</h3>
          <p className="text-gray-400 text-sm">
            {typeTab === 'all' && statusFilter === 'all'
              ? 'Join a class to see assigned exams.' : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map(exam => (
            <ExamCard key={exam._id} exam={exam} attempt={getAttempt(exam._id)} />
          ))}
        </div>
      )}
    </div>
  );
}
