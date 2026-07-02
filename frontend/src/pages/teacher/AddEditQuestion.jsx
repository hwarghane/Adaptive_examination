import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import RichTextEditor, { OptionEditor } from '../../components/RichTextEditor';
import { ArrowLeft, Plus, X, Check, AlertCircle, Info, BookOpen, Tag, RefreshCw } from 'lucide-react';

const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

const BLOOM_META = {
  Remember:   { desc: 'Recall facts, definitions',       color: 'gray'   },
  Understand: { desc: 'Explain in own words',             color: 'blue'   },
  Apply:      { desc: 'Use in new situations',            color: 'yellow' },
  Analyze:    { desc: 'Break down, find connections',     color: 'orange' },
  Evaluate:   { desc: 'Justify, critique',                color: 'purple' },
  Create:     { desc: 'Produce something original',       color: 'red'    },
};

const PERSIST_KEY = 'qbank_last_subject'; // localStorage key

const emptyOpt = () => ({ text: '', isCorrect: false });

const blankQuestion = () => ({
  questionText: '',
  bloomLevel:   'Remember',
  explanation:  '',
  options: [emptyOpt(), emptyOpt(), emptyOpt(), emptyOpt()],
});

function isHtmlEmpty(html) {
  return !(html || '').replace(/<[^>]*>/g, '').trim();
}

export default function AddEditQuestion() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = !!id;

  const [subjects,        setSubjects]        = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Subject/topic are kept separate so they survive a "Save & Add Another"
  const [subjectId, setSubjectId] = useState('');
  const [topic,     setTopic]     = useState('');
  // Whether the subject/topic section is locked (collapsed) during bulk add
  const [locked, setLocked] = useState(false);

  const [form,     setForm]     = useState(blankQuestion());
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);

  // How many questions have been saved in this session (for the badge)
  const savedCount = useRef(0);

  // ── Load subjects once ────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/subjects/my').then(r => setSubjects(r.data)).catch(() => {});
  }, []);

  // ── For new questions: restore last-used subject/topic from localStorage ──
  useEffect(() => {
    if (isEdit) return;
    try {
      const saved = JSON.parse(localStorage.getItem(PERSIST_KEY) || 'null');
      if (saved?.subjectId) {
        setSubjectId(saved.subjectId);
        setTopic(saved.topic || '');
        setLocked(true); // start locked so teacher can go straight to writing
      }
    } catch {}
    setFetching(false);
  }, [isEdit]);

  // ── For edit mode: load existing question ─────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/questions/${id}`)
      .then(r => {
        const q = r.data;
        setSubjectId(q.subject?._id || q.subject || '');
        setTopic(q.topic || '');
        setForm({
          questionText: q.questionText || '',
          bloomLevel:   q.bloomLevel   || 'Remember',
          explanation:  q.explanation  || '',
          options:      q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })),
        });
        if (q.subject) setSelectedSubject(typeof q.subject === 'object' ? q.subject : null);
      })
      .catch(() => toast.error('Failed to load question'))
      .finally(() => setFetching(false));
  }, [id, isEdit]);

  // ── Sync selectedSubject object whenever subjectId or subjects list changes ─
  useEffect(() => {
    if (subjectId && subjects.length) {
      setSelectedSubject(subjects.find(s => s._id === subjectId) || null);
    }
  }, [subjectId, subjects]);

  // ── Persist subject/topic whenever they change ────────────────────────────
  useEffect(() => {
    if (!isEdit && subjectId) {
      localStorage.setItem(PERSIST_KEY, JSON.stringify({ subjectId, topic }));
    }
  }, [subjectId, topic, isEdit]);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubjectChange = (sid) => {
    setSubjectId(sid);
    setTopic('');
  };

  const setOptText = (i, html) => {
    const opts = [...form.options];
    opts[i] = { ...opts[i], text: html };
    setF('options', opts);
  };

  const toggleCorrect = (i) => {
    const opts = form.options.map((o, idx) =>
      idx === i ? { ...o, isCorrect: !o.isCorrect } : o
    );
    setF('options', opts);
  };

  const addOption = () => {
    if (form.options.length >= 6) return;
    setF('options', [...form.options, emptyOpt()]);
  };

  const removeOption = (i) => {
    if (form.options.length <= 2) return;
    setF('options', form.options.filter((_, idx) => idx !== i));
  };

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    if (!subjectId)                      { toast.error('Please select a subject'); return false; }
    if (isHtmlEmpty(form.questionText))  { toast.error('Question text is required'); return false; }
    if (form.options.some(o => isHtmlEmpty(o.text))) {
      toast.error('All option texts must be filled'); return false;
    }
    if (form.options.filter(o => o.isCorrect).length === 0) {
      toast.error('Mark at least one option as correct'); return false;
    }
    return true;
  };

  const buildPayload = () => ({
    ...form,
    subject:           subjectId,
    topic:             topic || '',
    isMultipleCorrect: form.options.filter(o => o.isCorrect).length > 1,
  });

  // ── Save and go back to question bank ─────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/questions/${id}`, buildPayload());
        toast.success('Question updated!');
      } else {
        await api.post('/questions', buildPayload());
        toast.success('Question saved!');
      }
      navigate('/teacher/questions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  // ── Save and immediately clear the form to add another ────────────────────
  const handleSaveAndAnother = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/questions', buildPayload());
      savedCount.current += 1;
      toast.success(`Question ${savedCount.current} saved! Add the next one.`);
      // Reset only the question-specific fields — subject & topic stay locked
      setForm(blankQuestion());
      setLocked(true); // keep locked
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading / no-subjects states ──────────────────────────────────────────
  if (fetching) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (subjects.length === 0) return (
    <div className="max-w-xl mx-auto">
      <div className="card text-center py-14">
        <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No Subjects Found</h2>
        <p className="text-gray-500 text-sm mb-5">Create a subject first before adding questions.</p>
        <Link to="/teacher/subjects" className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Go to Subjects
        </Link>
      </div>
    </div>
  );

  const correctCount = form.options.filter(o => o.isCorrect).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link to="/teacher/questions" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Question' : 'Add Question'}
          </h1>
          {!isEdit && savedCount.current > 0 && (
            <p className="text-sm text-green-600 font-medium mt-0.5">
              ✓ {savedCount.current} question{savedCount.current > 1 ? 's' : ''} saved this session
            </p>
          )}
        </div>
      </div>

      {/* ── Locked subject/topic bar (shown when locked) ─────────────────── */}
      {!isEdit && locked && subjectId && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <BookOpen className="w-5 h-5 text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">Adding questions to</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-blue-900">
                {selectedSubject?.name || '…'}
              </span>
              {topic && (
                <>
                  <span className="text-blue-400">→</span>
                  <span className="flex items-center gap-1 text-sm text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                    <Tag className="w-3 h-3" />{topic}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLocked(false)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0 hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Change
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Subject & Topic (hidden when locked) ─────────────────────── */}
        {(!locked || isEdit) && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Subject & Topic</h2>
              {!isEdit && subjectId && (
                <button
                  type="button"
                  onClick={() => setLocked(true)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Lock & hide ↑
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <select
                  className="input-field"
                  value={subjectId}
                  onChange={e => handleSubjectChange(e.target.value)}
                  required
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
                  <span className="text-gray-400 font-normal text-xs ml-1">(optional)</span>
                </label>
                <select
                  className="input-field"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  disabled={!subjectId || !selectedSubject?.lessons?.length}
                >
                  <option value="">— All topics —</option>
                  {selectedSubject?.lessons?.map(l => (
                    <option key={l._id} value={l.title}>{l.title}</option>
                  ))}
                </select>
                {subjectId && !selectedSubject?.lessons?.length && (
                  <p className="text-xs text-gray-400 mt-1">
                    <Link to="/teacher/subjects" className="text-blue-500 underline">
                      Add topics to this subject
                    </Link>
                  </p>
                )}
              </div>
            </div>
            {/* Auto-lock hint */}
            {!isEdit && subjectId && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Subject &amp; topic will stay the same when you use "Save &amp; Add Another".
              </p>
            )}
          </div>
        )}

        {/* ── Bloom's Level ──────────────────────────────────────────────── */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">
            Bloom's Taxonomy Level *
            <span className="text-xs font-normal text-gray-400 ml-2">(difficulty auto-set)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BLOOM_LEVELS.map(level => {
              const m      = BLOOM_META[level];
              const active = form.bloomLevel === level;
              return (
                <button
                  key={level} type="button"
                  onClick={() => setF('bloomLevel', level)}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                    active
                      ? `border-${m.color}-400 bg-${m.color}-50 ring-2 ring-${m.color}-300`
                      : `border-gray-200 hover:border-${m.color}-200`
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">{level}</span>
                    {active && <Check className="w-4 h-4 text-green-500" />}
                  </div>
                  <span className="text-xs text-gray-400 mt-0.5 leading-tight">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Question Text ───────────────────────────────────────────────── */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Question Text *</h2>
          <RichTextEditor
            value={form.questionText}
            onChange={v => setF('questionText', v)}
            placeholder="Type your question here. Supports bold, formulas, images…"
            minHeight={140}
          />
        </div>

        {/* ── Answer Options ──────────────────────────────────────────────── */}
        <div className="card space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-gray-900">Answer Options *</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Click the checkbox on any option to mark it as correct.
                You can mark <strong>one or multiple</strong> options correct.
              </p>
            </div>
            {/* Live correct-count pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              correctCount === 0
                ? 'border-red-200 bg-red-50 text-red-600'
                : correctCount === 1
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}>
              <Check className="w-3.5 h-3.5" />
              {correctCount === 0
                ? 'No correct answer'
                : correctCount === 1
                ? '1 correct answer'
                : `${correctCount} correct answers`}
            </div>
          </div>

          <div className="space-y-3">
            {form.options.map((opt, idx) => (
              <div
                key={idx}
                className={`rounded-xl border-2 transition-all duration-200 ${
                  opt.isCorrect
                    ? 'border-green-400 shadow-sm shadow-green-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Header */}
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-t-xl border-b ${
                  opt.isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => toggleCorrect(idx)}
                    title={opt.isCorrect ? 'Unmark correct' : 'Mark as correct'}
                    className={`flex items-center justify-center w-6 h-6 rounded-md border-2 shrink-0 transition-all ${
                      opt.isCorrect
                        ? 'bg-green-500 border-green-500 text-white shadow-sm'
                        : 'bg-white border-gray-300 text-transparent hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      opt.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className={`text-sm font-medium ${opt.isCorrect ? 'text-green-700' : 'text-gray-500'}`}>
                      Option {String.fromCharCode(65 + idx)}
                    </span>
                    {opt.isCorrect && (
                      <span className="badge bg-green-100 text-green-700 text-xs">✓ Correct</span>
                    )}
                  </div>

                  {form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="text-gray-300 hover:text-red-400 transition-colors ml-auto shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Rich text body */}
                <div className={`p-3 rounded-b-xl ${opt.isCorrect ? 'bg-green-50/30' : 'bg-white'}`}>
                  <OptionEditor
                    value={opt.text}
                    onChange={v => setOptText(idx, v)}
                    placeholder={`Type option ${String.fromCharCode(65 + idx)} text here…`}
                    index={idx}
                  />
                </div>
              </div>
            ))}
          </div>

          {form.options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:underline mt-1"
            >
              <Plus className="w-4 h-4" /> Add Another Option
            </button>
          )}

          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Tip:</strong> For single-answer, mark one. For multiple-answer, mark all correct ones —
              students must select every correct option.
            </span>
          </div>
        </div>

        {/* ── Explanation ─────────────────────────────────────────────────── */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">
            Explanation
            <span className="text-gray-400 font-normal text-sm ml-2">(shown after student answers)</span>
          </h2>
          <RichTextEditor
            value={form.explanation}
            onChange={v => setF('explanation', v)}
            placeholder="Explain why the correct answer(s) are right (optional)…"
            minHeight={100}
          />
        </div>

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        <div className={`flex gap-3 pb-6 ${isEdit ? 'justify-end' : 'flex-col sm:flex-row'}`}>
          <Link to="/teacher/questions" className="btn-secondary text-center">
            {isEdit ? 'Cancel' : '← Back to Question Bank'}
          </Link>

          {/* Edit mode: just one save button */}
          {isEdit && (
            <button type="submit" disabled={loading} className="btn-primary px-8">
              {loading ? 'Saving…' : 'Update Question'}
            </button>
          )}

          {/* Add mode: two save options */}
          {!isEdit && (
            <>
              {/* Save & Add Another — primary action for bulk entry */}
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveAndAnother}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  <><Plus className="w-4 h-4" /> Save &amp; Add Another</>
                )}
              </button>

              {/* Save & Done — go back to bank */}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none btn-success px-6 py-2.5"
              >
                {loading ? 'Saving…' : 'Save & Done'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
