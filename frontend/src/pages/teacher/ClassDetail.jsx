import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { PageLoader } from '../../components/LoadingSpinner';
import { Users, UserMinus, Copy, ArrowLeft, GraduationCap, Building2, BookOpen, Check } from 'lucide-react';

export default function ClassDetail() {
  const { id } = useParams();
  const [cls, setCls] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/classes/${id}`),
      api.get(`/classes/${id}/students`),
    ]).then(([c, s]) => {
      setCls(c.data);
      setStudents(s.data);
    }).catch(() => toast.error('Failed to load class'))
      .finally(() => setLoading(false));
  }, [id]);

  const removeStudent = async (enrollmentId, studentId) => {
    if (!confirm('Remove this student from the class?')) return;
    try {
      await api.delete(`/classes/${id}/students/${studentId}`);
      setStudents(s => s.filter(x => x.student._id !== studentId));
      toast.success('Student removed');
    } catch (err) {
      toast.error('Failed to remove student');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(cls.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Join code copied!');
  };

  if (loading) return <PageLoader />;
  if (!cls) return <div className="card text-center py-12 text-gray-400">Class not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/teacher/classes" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{cls.name}</h1>
          {cls.subject && <p className="text-gray-500 text-sm">{cls.subject}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Class Details</h3>
            {cls.description && (
              <p className="text-gray-500 text-sm mb-4">{cls.description}</p>
            )}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">{students.length} enrolled students</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-purple-500" />
                <span className="text-gray-600">Created {new Date(cls.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Join Code</p>
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3">
                <span className="font-mono font-bold text-blue-700 text-xl tracking-widest">{cls.joinCode}</span>
                <button onClick={copyCode} className="text-blue-500 hover:text-blue-700">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 break-all">{cls.inviteLink}</p>
            </div>
          </div>

          {cls.qrCode && (
            <div className="card text-center">
              <p className="text-sm font-medium text-gray-700 mb-3">QR Code for Students</p>
              <img src={cls.qrCode} alt="QR Code" className="w-40 h-40 mx-auto rounded-xl border" />
              <p className="text-xs text-gray-400 mt-2">Scan to join</p>
            </div>
          )}
        </div>

        {/* Students table */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Enrolled Students ({students.length})</h3>
            </div>
            {students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No students have joined yet.</p>
                <p className="text-gray-400 text-sm mt-1">Share the join code <strong>{cls.joinCode}</strong> with your students.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-3 font-medium">Student</th>
                      <th className="pb-3 font-medium">College</th>
                      <th className="pb-3 font-medium">Branch / Year</th>
                      <th className="pb-3 font-medium">Joined</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map(({ enrollmentId, joinedAt, student }) => (
                      <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm shrink-0">
                              {student.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{student.name}</p>
                              <p className="text-gray-400 text-xs">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <p className="text-gray-600 text-xs flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {student.profile?.college || '—'}
                          </p>
                        </td>
                        <td className="py-3">
                          <p className="text-gray-600 text-xs">{student.profile?.branch || '—'} / Yr {student.profile?.year || '—'}</p>
                          <p className="text-gray-400 text-xs">Roll: {student.profile?.rollNumber || '—'}</p>
                        </td>
                        <td className="py-3 text-gray-400 text-xs">{new Date(joinedAt).toLocaleDateString()}</td>
                        <td className="py-3">
                          <button onClick={() => removeStudent(enrollmentId, student._id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
