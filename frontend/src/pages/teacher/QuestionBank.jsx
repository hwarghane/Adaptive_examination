import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { PageLoader } from '../../components/LoadingSpinner';
import BloomBadge from '../../components/BloomBadge';
import { RichContent } from '../../components/RichTextEditor';
import { Plus, Pencil, Trash2, Filter, FileQuestion, BookOpen, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';

const BLOOM_LEVELS = ['Remember','Understand','Apply','Analyze','Evaluate','Create'];

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState({ bloomLevel: '', subject: '', topic: '', showHidden: false });
  const [topicsForFilter, setTopicsForFilter] = useState([]);

  const fetchQuestions = () => {
    const params = {};
    if (filter.bloomLevel) params.bloomLevel = filter.bloomLevel;
    if (filter.subject)    params.subject    = filter.subject;
    if (filter.topic)      params.topic      = filter.topic;

    api.get('/questions/my', { params })
      .then(r => {
        let qs = r.data;
        if (!filter.showHidden) qs = qs.filter(q => !q.isHidden);
        setQuestions(qs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/subjects/my').then(r => setSubjects(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchQuestions(); }, [filter]);

  const handleSubjectFilter = (subjectId) => {
    const subject = subjects.find(s => s._id === subjectId);
    setTopicsForFilter(subject?.lessons || []);
    setFilter(f => ({ ...f, subject: subjectId, topic: '' }));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this question? It will be removed from the pool.')) return;
    try {
      await api.delete(`/questions/${id}`);
      setQuestions(q => q.filter(x => x._id !== id));
      toast.success('Question deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleToggleHidden = async (id) => {
    try {
      const { data } = await api.patch(`/questions/${id}/toggle-hidden`);
      setQuestions(qs => qs.map(q =>
        q._id === id ? { ...q, isHidden: data.isHidden } : q
      ));
      toast.success(data.isHidden ? 'Question hidden from exam pool' : 'Question visible in exam pool');
      // If not showing hidden and we just hid it, remove from list
      if (!filter.showHidden && data.isHidden) {
        setQuestions(qs => qs.filter(q => q._id !== id));
      }
    } catch {
      toast.error('Failed to toggle visibility');
    }
  };

  if (loading) return <PageLoader text="Loading question bank..." />;

  const hiddenCount = questions.filter(q => q.isHidden).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-500 text-sm mt-1">
            {questions.length} question{questions.length !== 1 ? 's' : ''}
            {hiddenCount > 0 && <span className="ml-2 text-orange-500">({hiddenCount} hidden)</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/teacher/subjects" className="btn-secondary flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4" /> Subjects
          </Link>
          <Link to="/teacher/questions/add" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Question
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-end">
        <Filter className="w-4 h-4 text-gray-400 mt-5 shrink-0" />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Subject</label>
          <select className="input-field w-44 text-sm" value={filter.subject} onChange={e => handleSubjectFilter(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Topic</label>
          <select className="input-field w-40 text-sm" value={filter.topic}
            onChange={e => setFilter(f => ({ ...f, topic: e.target.value }))}
            disabled={!filter.subject || !topicsForFilter.length}>
            <option value="">All Topics</option>
            {topicsForFilter.map(l => <option key={l._id} value={l.title}>{l.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bloom's Level</label>
          <select className="input-field w-40 text-sm" value={filter.bloomLevel}
            onChange={e => setFilter(f => ({ ...f, bloomLevel: e.target.value }))}>
            <option value="">All Levels</option>
            {BLOOM_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button
          onClick={() => setFilter(f => ({ ...f, showHidden: !f.showHidden }))}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border-2 transition-colors ${
            filter.showHidden ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'
          }`}>
          {filter.showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {filter.showHidden ? 'Showing Hidden' : 'Show Hidden'}
        </button>
        <button onClick={() => { setFilter({ bloomLevel:'', subject:'', topic:'', showHidden: false }); setTopicsForFilter([]); }}
          className="btn-secondary text-sm">Clear</button>
      </div>

      {questions.length === 0 ? (
        <div className="card text-center py-16">
          <FileQuestion className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No questions found</h3>
          <p className="text-gray-400 text-sm mb-6">
            {subjects.length === 0 ? 'Create a subject first.' : 'Add your first question.'}
          </p>
          {subjects.length === 0
            ? <Link to="/teacher/subjects" className="btn-primary inline-flex items-center gap-2"><BookOpen className="w-4 h-4" /> Go to Subjects</Link>
            : <Link to="/teacher/questions/add" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Question</Link>}
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q._id} className={`card hover:shadow-md transition-shadow ${q.isHidden ? 'opacity-60 border-orange-200 bg-orange-50/20' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Tag row */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-gray-400 text-sm font-medium">#{i + 1}</span>
                    <BloomBadge level={q.bloomLevel} />
                    {q.isMultipleCorrect && (
                      <span className="badge bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" /> Multi-correct
                      </span>
                    )}
                    {q.subject?.name && (
                      <span className="badge bg-indigo-50 text-indigo-600 text-xs">
                        <BookOpen className="w-3 h-3 inline mr-1" />{q.subject.name}
                      </span>
                    )}
                    {q.topic && <span className="badge bg-teal-50 text-teal-600 text-xs">{q.topic}</span>}
                    {q.isHidden && (
                      <span className="badge bg-orange-100 text-orange-600 text-xs flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Hidden
                      </span>
                    )}
                  </div>

                  {/* Question text */}
                  <div className="text-gray-900 font-medium text-sm">
                    <RichContent html={q.questionText} />
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-3">
                    {q.options.map((opt, idx) => (
                      <div key={idx} className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded-md ${
                        opt.isCorrect ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500'
                      }`}>
                        {opt.isCorrect
                          ? <CheckSquare className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                          : <Square className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />}
                        <div className="min-w-0 line-clamp-2"><RichContent html={opt.text} /></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  <Link to={`/teacher/questions/edit/${q._id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit">
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button onClick={() => handleToggleHidden(q._id)}
                    className={`p-2 rounded-lg transition-colors ${q.isHidden ? 'text-orange-500 hover:bg-orange-50' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
                    title={q.isHidden ? 'Show in pool' : 'Hide from pool'}>
                    {q.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(q._id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
