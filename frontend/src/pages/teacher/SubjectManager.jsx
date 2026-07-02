import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { PageLoader } from '../../components/LoadingSpinner';
import {
  Plus, BookOpen, Pencil, Trash2, X,
  ChevronDown, ChevronUp, GripVertical, Check, Tag
} from 'lucide-react';

// ─── Single editable lesson row ───────────────────────────────────────────────
function LessonRow({ lesson, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(lesson.title);

  const save = () => {
    if (!val.trim()) return;
    onEdit(lesson._id, val.trim());
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg group hover:bg-blue-50 transition-colors">
      <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
      <Tag className="w-3.5 h-3.5 text-teal-400 shrink-0" />
      {editing ? (
        <>
          <input
            className="flex-1 text-sm border border-blue-400 rounded px-2 py-0.5 outline-none bg-white"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') { setVal(lesson.title); setEditing(false); }
            }}
            autoFocus
          />
          <button onClick={save} className="text-green-600 hover:text-green-700 p-1">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setVal(lesson.title); setEditing(false); }} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-gray-700">{lesson.title}</span>
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 p-1 transition-opacity"
            title="Rename"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(lesson._id)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 transition-opacity"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Subject card ─────────────────────────────────────────────────────────────
function SubjectCard({ subject, onUpdated, onDeleted, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded || false);
  const [newTopic, setNewTopic] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(subject.name);

  const addTopic = async () => {
    const title = newTopic.trim();
    if (!title) {
      toast.error('Topic title cannot be empty');
      return;
    }
    setSavingTopic(true);
    try {
      const { data } = await api.post(`/subjects/${subject._id}/lessons`, { title });
      onUpdated(data);
      setNewTopic('');
      setAddingTopic(false);
      toast.success(`Topic "${title}" added`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add topic');
    } finally {
      setSavingTopic(false);
    }
  };

  const deleteTopic = async (lessonId) => {
    if (!confirm('Delete this topic?')) return;
    try {
      const { data } = await api.delete(`/subjects/${subject._id}/lessons/${lessonId}`);
      onUpdated(data);
      toast.success('Topic deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete topic');
    }
  };

  const editTopic = async (lessonId, title) => {
    const updatedLessons = subject.lessons.map(l =>
      l._id === lessonId ? { ...l, title } : l
    );
    try {
      const { data } = await api.put(`/subjects/${subject._id}`, { lessons: updatedLessons });
      onUpdated(data);
      toast.success('Topic renamed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename topic');
    }
  };

  const saveSubjectName = async () => {
    const name = editName.trim();
    if (!name) return;
    try {
      const { data } = await api.put(`/subjects/${subject._id}`, { name });
      onUpdated(data);
      setEditingName(false);
      toast.success('Subject renamed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename subject');
    }
  };

  const deleteSubject = async () => {
    if (!confirm(`Delete subject "${subject.name}"?\nThis will fail if questions are linked to it.`)) return;
    try {
      await api.delete(`/subjects/${subject._id}`);
      onDeleted(subject._id);
      toast.success('Subject deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete — questions linked to this subject');
    }
  };

  return (
    <div className="card overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <BookOpen className="w-5 h-5 text-blue-500 shrink-0" />
          {editingName ? (
            <input
              className="flex-1 border border-blue-400 rounded px-2 py-1 text-sm font-semibold outline-none"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveSubjectName();
                if (e.key === 'Escape') { setEditName(subject.name); setEditingName(false); }
              }}
              autoFocus
            />
          ) : (
            <h3 className="font-semibold text-gray-900 truncate">{subject.name}</h3>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full mr-1">
            {subject.lessons?.length || 0} topic{subject.lessons?.length !== 1 ? 's' : ''}
          </span>

          {editingName ? (
            <>
              <button onClick={saveSubjectName} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditName(subject.name); setEditingName(false); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={() => setEditingName(true)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Rename subject">
              <Pencil className="w-4 h-4" />
            </button>
          )}

          <button onClick={deleteSubject} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Delete subject">
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded ml-1"
            title={expanded ? 'Collapse' : 'Expand topics'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Topics section ─────────────────────────────────────────────── */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Lessons / Topics
            </p>
            {!addingTopic && (
              <button
                onClick={() => setAddingTopic(true)}
                className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add Topic
              </button>
            )}
          </div>

          {subject.lessons?.length === 0 && !addingTopic && (
            <div className="text-center py-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Tag className="w-6 h-6 text-gray-300 mx-auto mb-1" />
              <p className="text-sm text-gray-400">No topics yet.</p>
              <button
                onClick={() => setAddingTopic(true)}
                className="text-blue-600 text-sm font-medium hover:underline mt-1 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add first topic
              </button>
            </div>
          )}

          {subject.lessons?.map(l => (
            <LessonRow key={l._id} lesson={l} onDelete={deleteTopic} onEdit={editTopic} />
          ))}

          {/* Add topic inline form */}
          {addingTopic && (
            <div className="flex gap-2 mt-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <input
                className="flex-1 border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                placeholder="e.g. Arrays, Linked Lists, Binary Trees..."
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addTopic();
                  if (e.key === 'Escape') { setNewTopic(''); setAddingTopic(false); }
                }}
                autoFocus
                maxLength={100}
              />
              <button
                onClick={addTopic}
                disabled={savingTopic || !newTopic.trim()}
                className="btn-primary text-sm px-4 py-1.5 whitespace-nowrap disabled:opacity-50"
              >
                {savingTopic ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => { setNewTopic(''); setAddingTopic(false); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick-add strip when collapsed and has no topics */}
      {!expanded && subject.lessons?.length === 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add topics to this subject
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SubjectManager() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [newestId, setNewestId] = useState(null); // auto-expand newly created subject

  useEffect(() => {
    api.get('/subjects/my')
      .then(r => setSubjects(r.data))
      .catch(() => toast.error('Failed to load subjects'))
      .finally(() => setLoading(false));
  }, []);

  const createSubject = async (e) => {
    e.preventDefault();
    const name = newSubject.name.trim();
    if (!name) return;
    setSaving(true);
    try {
      const { data } = await api.post('/subjects', { name, description: newSubject.description });
      setSubjects(s => [data, ...s]);
      setNewestId(data._id);
      setNewSubject({ name: '', description: '' });
      setShowAdd(false);
      toast.success(`Subject "${name}" created`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create subject');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdated = (updated) => {
    setSubjects(s => s.map(x => x._id === updated._id ? updated : x));
  };

  const handleDeleted = (id) => {
    setSubjects(s => s.filter(x => x._id !== id));
  };

  if (loading) return <PageLoader text="Loading subjects..." />;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create subjects, then add lessons/topics. Questions are tagged to a subject + topic.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Subject
        </button>
      </div>

      {/* Create form */}
      {showAdd && (
        <div className="card border-2 border-blue-200 bg-blue-50/30">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" /> Create New Subject
          </h3>
          <form onSubmit={createSubject} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
              <input
                className="input-field"
                placeholder="e.g. Data Structures, Physics, English Grammar"
                value={newSubject.name}
                onChange={e => setNewSubject(s => ({ ...s, name: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                className="input-field"
                placeholder="Brief description of this subject"
                value={newSubject.description}
                onChange={e => setNewSubject(s => ({ ...s, description: e.target.value }))}
              />
            </div>
            <p className="text-xs text-gray-400">
              After creating the subject, expand it to add topics/lessons.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Creating...' : 'Create Subject'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subject list */}
      {subjects.length === 0 && !showAdd ? (
        <div className="card text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No subjects yet</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Create subjects (e.g. "Data Structures"), then add topics inside them (e.g. "Arrays", "Linked Lists").
          </p>
          <button onClick={() => setShowAdd(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create First Subject
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map(s => (
            <SubjectCard
              key={s._id}
              subject={s}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
              defaultExpanded={s._id === newestId}
            />
          ))}
        </div>
      )}

      {/* How-to hint */}
      {subjects.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          <strong>Workflow:</strong> Create a subject → expand it → add topics →
          go to <strong>Question Bank → Add Question</strong> and select the subject + topic.
        </div>
      )}
    </div>
  );
}
