import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Brain, ClipboardCheck, BookOpen, AlertCircle } from 'lucide-react';

const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

const toLocalInput = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function CreateEditExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '', description: '',
    examType: 'adaptive',        // 'adaptive' | 'final'
    durationMinutes: 30,
    startTime: '', endTime: '',
    totalQuestions: 20, passingScore: 40,
    assignedClasses: [],
    bloomLevels: [...BLOOM_LEVELS],
    subject: '',                 // for final exams
    topic: '',                   // optional topic filter
  });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [qCount, setQCount] = useState(null);  // question count for chosen subject/topic
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const reqs = [api.get('/classes/my'), api.get('/subjects/my')];
    if (isEdit) reqs.push(api.get(`/exams/${id}`));

    Promise.all(reqs).then(([c, s, e]) => {
      setClasses(c.data);
      setSubjects(s.data);
      if (e) {
        const exam = e.data;
        const subjectId = exam.subject?._id || exam.subject || '';
        setForm({
          title: exam.title,
          description: exam.description || '',
          examType: exam.examType || 'adaptive',
          durationMinutes: exam.durationMinutes,
          startTime: toLocalInput(exam.startTime),
          endTime: toLocalInput(exam.endTime),
          totalQuestions: exam.totalQuestions,
          passingScore: exam.passingScore,
          assignedClasses: exam.assignedClasses.map(c => c._id || c),
          bloomLevels: exam.bloomLevels || [...BLOOM_LEVELS],
          subject: subjectId,
          topic: exam.topic || '',
        });
        if (subjectId) {
          const found = s.data.find(sub => sub._id === subjectId);
          setSelectedSubject(found || null);
        }
      }
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setFetching(false));
  }, [id, isEdit]);

  // Fetch question count when subject/topic changes (for final exams)
  useEffect(() => {
    if (form.examType !== 'final' || !form.subject) { setQCount(null); return; }
    const params = { subject: form.subject };
    if (form.topic) params.topic = form.topic;
    api.get('/questions/my', { params })
      .then(r => setQCount(r.data.length))
      .catch(() => setQCount(null));
  }, [form.subject, form.topic, form.examType]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubjectChange = (subjectId) => {
    set('subject', subjectId);
    set('topic', '');
    const found = subjects.find(s => s._id === subjectId);
    setSelectedSubject(found || null);
  };

  const toggleClass = (classId) =>
    setForm(f => ({
      ...f,
      assignedClasses: f.assignedClasses.includes(classId)
        ? f.assignedClasses.filter(c => c !== classId)
        : [...f.assignedClasses, classId],
    }));

  const toggleBloom = (level) =>
    setForm(f => ({
      ...f,
      bloomLevels: f.bloomLevels.includes(level)
        ? f.bloomLevels.filter(l => l !== level)
        : [...f.bloomLevels, level],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.assignedClasses.length === 0)
      return toast.error('Assign the exam to at least one class');
    if (form.examType === 'adaptive' && form.bloomLevels.length === 0)
      return toast.error("Select at least one Bloom's level");
    if (form.examType === 'final' && !form.subject)
      return toast.error('Select a subject for the final test');
    if (form.examType === 'final' && qCount !== null && qCount < form.totalQuestions)
      return toast.error(`Only ${qCount} question(s) available for this subject/topic. Reduce Total Questions or add more questions.`);

    setLoading(true);
    try {
      const payload = {
        ...form,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        subject: form.subject || undefined,
        topic: form.topic || '',
      };
      if (isEdit) {
        await api.put(`/exams/${id}`, payload);
        toast.success('Exam updated!');
      } else {
        await api.post('/exams', payload);
        toast.success(`${form.examType === 'final' ? 'Final Test' : 'Practice Test'} created! Students notified.`);
      }
      navigate('/teacher/exams');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save exam');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/teacher/exams" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Exam' : 'Create Exam'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Exam Type ─────────────────────────────────────────────────── */}
        {!isEdit && (
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-900">Exam Type *</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => set('examType', 'adaptive')}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  form.examType === 'adaptive'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Brain className={`w-6 h-6 shrink-0 mt-0.5 ${form.examType === 'adaptive' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <p className={`font-semibold ${form.examType === 'adaptive' ? 'text-blue-700' : 'text-gray-700'}`}>
                    Adaptive Practice Test
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Questions adapt in real-time based on Bloom's level & student performance
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => set('examType', 'final')}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  form.examType === 'final'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ClipboardCheck className={`w-6 h-6 shrink-0 mt-0.5 ${form.examType === 'final' ? 'text-purple-600' : 'text-gray-400'}`} />
                <div>
                  <p className={`font-semibold ${form.examType === 'final' ? 'text-purple-700' : 'text-gray-700'}`}>
                    Final Test
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Fixed subject-based test with random questions from your question bank
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Basic Info ────────────────────────────────────────────────── */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title *</label>
            <input
              className="input-field"
              placeholder={form.examType === 'final' ? 'e.g. Final Exam — Data Structures' : 'e.g. Practice Test — Arrays'}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Brief description for students..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min) *</label>
              <input
                type="number" className="input-field" min={1}
                value={form.durationMinutes}
                onChange={e => set('durationMinutes', parseInt(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Questions *</label>
              <input
                type="number" className="input-field" min={1}
                value={form.totalQuestions}
                onChange={e => set('totalQuestions', parseInt(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
              <input
                type="number" className="input-field" min={0} max={100}
                value={form.passingScore}
                onChange={e => set('passingScore', parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input
                type="datetime-local" className="input-field"
                value={form.startTime}
                onChange={e => set('startTime', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input
                type="datetime-local" className="input-field"
                value={form.endTime}
                onChange={e => set('endTime', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* ── Final Test: Subject + Topic ───────────────────────────────── */}
        {form.examType === 'final' && (
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-500" />
              Subject & Topic
            </h2>

            {subjects.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-sm text-orange-700">
                  No subjects yet.{' '}
                  <Link to="/teacher/subjects" className="font-semibold underline">Create a subject first</Link>
                  {' '}before making a final test.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                    <select
                      className="input-field"
                      value={form.subject}
                      onChange={e => handleSubjectChange(e.target.value)}
                      required={form.examType === 'final'}
                    >
                      <option value="">— Select subject —</option>
                      {subjects.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Topic / Lesson
                      <span className="text-gray-400 font-normal ml-1 text-xs">(optional — blank = all topics)</span>
                    </label>
                    <select
                      className="input-field"
                      value={form.topic}
                      onChange={e => set('topic', e.target.value)}
                      disabled={!form.subject || !selectedSubject?.lessons?.length}
                    >
                      <option value="">— All Topics —</option>
                      {selectedSubject?.lessons?.map(l => (
                        <option key={l._id} value={l.title}>{l.title}</option>
                      ))}
                    </select>
                    {form.subject && !selectedSubject?.lessons?.length && (
                      <p className="text-xs text-gray-400 mt-1">
                        <Link to="/teacher/subjects" className="text-blue-500 underline">Add topics to this subject</Link>
                      </p>
                    )}
                  </div>
                </div>

                {/* Question availability indicator */}
                {form.subject && qCount !== null && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                    qCount === 0
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : qCount < form.totalQuestions
                      ? 'bg-orange-50 border border-orange-200 text-orange-700'
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}>
                    {qCount === 0 ? (
                      <><AlertCircle className="w-4 h-4 shrink-0" /> No questions found for this subject{form.topic ? `/topic` : ''}. <Link to="/teacher/questions/add" className="font-semibold underline ml-1">Add questions</Link></>
                    ) : qCount < form.totalQuestions ? (
                      <><AlertCircle className="w-4 h-4 shrink-0" /> Only <strong>{qCount}</strong> questions available. Set Total Questions ≤ {qCount} or <Link to="/teacher/questions/add" className="font-semibold underline ml-1">add more</Link>.</>
                    ) : (
                      <><span className="text-green-600 font-bold">✓</span> <strong>{qCount}</strong> questions available for this test.</>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Adaptive: Bloom levels ────────────────────────────────────── */}
        {form.examType === 'adaptive' && (
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-500" />
              Bloom's Taxonomy Levels
            </h2>
            <p className="text-gray-400 text-xs">
              Select which cognitive levels the adaptive engine can pick from.
            </p>
            <div className="flex flex-wrap gap-2">
              {BLOOM_LEVELS.map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleBloom(level)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                    form.bloomLevels.includes(level)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Assign to classes ─────────────────────────────────────────── */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Assign to Classes *</h2>
          {classes.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No classes yet.{' '}
              <Link to="/teacher/classes" className="text-blue-600 underline">Create a class first.</Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {classes.map(cls => (
                <label
                  key={cls._id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    form.assignedClasses.includes(cls._id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-blue-600 w-4 h-4"
                    checked={form.assignedClasses.includes(cls._id)}
                    onChange={() => toggleClass(cls._id)}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{cls.name}</p>
                    <p className="text-xs text-gray-400">{cls.enrollmentCount || 0} students</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex gap-3 justify-end pb-4">
          <Link to="/teacher/exams" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary px-8">
            {loading
              ? 'Saving...'
              : isEdit
              ? 'Update Exam'
              : `Create ${form.examType === 'final' ? 'Final Test' : 'Practice Test'}`}
          </button>
        </div>
      </form>
    </div>
  );
}
