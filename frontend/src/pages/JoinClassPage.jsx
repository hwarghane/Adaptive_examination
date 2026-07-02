import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { GraduationCap, Users, CheckCircle, Loader2, AlertCircle, LogIn } from 'lucide-react';

export default function JoinClassPage() {
  const { code }   = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [classInfo, setClassInfo] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [joining,   setJoining]   = useState(false);
  const [joined,    setJoined]    = useState(false);

  useEffect(() => {
    api.get(`/classes/resolve/${code}`)
      .then(r  => setClassInfo(r.data))
      .catch(() => setClassInfo(null))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async () => {
    if (!user) {
      // Save code, redirect to student register / login
      sessionStorage.setItem('pendingJoinCode', code.toUpperCase());
      navigate('/login');
      return;
    }

    if (user.role !== 'student') {
      toast.error('Only student accounts can join classes. Please log in as a student.');
      return;
    }

    setJoining(true);
    try {
      await api.post('/classes/join', { joinCode: code.toUpperCase() });
      toast.success(`Joined "${classInfo.name}" successfully!`);
      setJoined(true);
      setTimeout(() => navigate('/student/classes'), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join class');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Branding */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <GraduationCap className="w-8 h-8 text-emerald-600" />
            <span className="text-xl font-bold text-gray-900">AdaptExam</span>
          </div>
          <p className="text-gray-500 text-sm">Class Invitation</p>
        </div>

        <div className="card text-center">
          {classInfo ? (
            <>
              {/* Class info */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${joined ? 'bg-green-100' : 'bg-emerald-100'}`}>
                {joined
                  ? <CheckCircle className="w-8 h-8 text-green-600" />
                  : <Users className="w-8 h-8 text-emerald-600" />}
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-1">{classInfo.name}</h2>
              {classInfo.subject && (
                <p className="text-gray-400 text-sm mb-1">{classInfo.subject}</p>
              )}
              <p className="text-gray-500 text-sm mb-1">
                Taught by <strong className="text-gray-700">{classInfo.teacher?.name}</strong>
              </p>
              {classInfo.description && (
                <p className="text-gray-400 text-sm mt-2">{classInfo.description}</p>
              )}

              {/* Code badge */}
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-mono font-bold mt-4 mb-6 tracking-widest">
                {code.toUpperCase()}
              </div>

              {/* Teacher warning */}
              {user?.role === 'teacher' && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-700">
                    You're logged in as a <strong>teacher</strong>. Only student accounts can join classes.
                    <Link to="/register/student" className="block mt-1 text-blue-600 underline font-medium">
                      Create a student account
                    </Link>
                  </p>
                </div>
              )}

              {joined ? (
                <div className="space-y-2">
                  <p className="text-green-600 font-semibold">✓ Joined successfully!</p>
                  <p className="text-gray-400 text-sm">Redirecting to your classes…</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleJoin}
                    disabled={joining || user?.role === 'teacher'}
                    className="btn-success w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joining
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining…</>
                      : !user
                      ? <><LogIn className="w-4 h-4" /> Sign in & Join Class</>
                      : <><CheckCircle className="w-4 h-4" /> Join This Class</>}
                  </button>

                  {!user && (
                    <div className="mt-4 space-y-2">
                      <p className="text-gray-500 text-sm">Don't have an account?</p>
                      <Link
                        to={`/register/student?redirect=/join/${code}`}
                        className="text-emerald-600 font-medium text-sm hover:underline"
                      >
                        Register as Student →
                      </Link>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite Link</h2>
              <p className="text-gray-500 text-sm mb-6">
                This class code is invalid, expired, or the class no longer exists.
              </p>
              <Link to="/" className="btn-secondary">Go to Home</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
