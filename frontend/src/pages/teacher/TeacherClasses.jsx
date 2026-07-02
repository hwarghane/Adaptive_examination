import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { PageLoader } from '../../components/LoadingSpinner';
import { Plus, Users, Copy, QrCode, ExternalLink, Trash2, X, Check } from 'lucide-react';

function CreateClassModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', subject: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/classes', form);
      toast.success('Class created!');
      onCreated(data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Create New Class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
            <input className="input-field" placeholder="e.g. Data Structures - Batch A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject (optional)</label>
            <input className="input-field" placeholder="e.g. Computer Science" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea className="input-field resize-none" rows={3} placeholder="Brief description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create Class'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QRModal({ cls, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm text-center">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{cls.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          <p className="text-gray-500 text-sm mb-4">Students can scan this QR code to join the class.</p>
          {cls.qrCode ? (
            <img src={cls.qrCode} alt="QR Code" className="w-48 h-48 mx-auto rounded-xl border" />
          ) : (
            <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
              <QrCode className="w-16 h-16 text-gray-300" />
            </div>
          )}
          <div className="mt-4 bg-blue-50 rounded-lg px-4 py-2">
            <p className="text-xs text-gray-500 mb-1">Join Code</p>
            <p className="font-mono font-bold text-blue-700 text-xl tracking-widest">{cls.joinCode}</p>
          </div>
          <p className="text-xs text-gray-400 mt-3 break-all">{cls.inviteLink}</p>
        </div>
      </div>
    </div>
  );
}

export default function TeacherClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [qrClass, setQrClass] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    api.get('/classes/my').then(r => setClasses(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const copyCode = (cls) => {
    navigator.clipboard.writeText(cls.joinCode);
    setCopiedId(cls._id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Join code copied!');
  };

  const deleteClass = async (id) => {
    if (!confirm('Archive this class? Students will no longer see it.')) return;
    try {
      await api.delete(`/classes/${id}`);
      setClasses(c => c.filter(x => x._id !== id));
      toast.success('Class archived');
    } catch (err) {
      toast.error('Failed to archive class');
    }
  };

  if (loading) return <PageLoader text="Loading classes..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-500 text-sm mt-1">{classes.length} class{classes.length !== 1 ? 'es' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Class
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No classes yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create your first class and invite students to join.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create First Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {classes.map(cls => (
            <div key={cls._id} className="card hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <Link to={`/teacher/classes/${cls._id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600 line-clamp-1">
                    {cls.name}
                  </Link>
                  {cls.subject && <p className="text-sm text-gray-500">{cls.subject}</p>}
                </div>
                <button onClick={() => deleteClass(cls._id)} className="text-gray-300 hover:text-red-500 transition-colors ml-2 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {cls.description && <p className="text-gray-400 text-sm mb-3 line-clamp-2">{cls.description}</p>}

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {cls.enrollmentCount || 0} students</span>
              </div>

              {/* Join code */}
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-400 mb-1">Join Code</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-700 text-lg tracking-widest">{cls.joinCode}</span>
                  <button onClick={() => copyCode(cls)} className="text-blue-500 hover:text-blue-700">
                    {copiedId === cls._id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <Link to={`/teacher/classes/${cls._id}`} className="btn-secondary flex-1 text-sm text-center flex items-center justify-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" /> Manage
                </Link>
                <button onClick={() => setQrClass(cls)} className="btn-secondary px-3 flex items-center gap-1 text-sm">
                  <QrCode className="w-3.5 h-3.5" /> QR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateClassModal onClose={() => setShowCreate(false)} onCreated={c => setClasses(p => [c, ...p])} />}
      {qrClass && <QRModal cls={qrClass} onClose={() => setQrClass(null)} />}
    </div>
  );
}
