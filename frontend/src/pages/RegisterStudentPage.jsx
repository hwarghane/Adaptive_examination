import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

export default function RegisterStudentPage() {
  const { registerStudent, loading } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    college: '', branch: '', year: '', semester: '', rollNumber: ''
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await registerStudent(form);
    if (result.success) {
      toast.success('Account created! Welcome to AdaptExam.');
      navigate('/student');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <GraduationCap className="w-8 h-8 text-emerald-600" />
            <span className="text-xl font-bold text-gray-900">AdaptExam</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Student Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join from any college, school, or university</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input className="input-field" placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input type="email" className="input-field" placeholder="john@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password * <span className="text-gray-400 font-normal">(min 8 chars)</span></label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">College / School / University *</label>
                <input className="input-field" placeholder="e.g. MIT, IIT Delhi, Harvard" value={form.college} onChange={e => set('college', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch / Stream *</label>
                <input className="input-field" placeholder="e.g. Computer Science" value={form.branch} onChange={e => set('branch', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
                <input className="input-field" placeholder="e.g. CS2024001" value={form.rollNumber} onChange={e => set('rollNumber', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <select className="input-field" value={form.year} onChange={e => set('year', e.target.value)} required>
                  <option value="">Select year</option>
                  {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                <select className="input-field" value={form.semester} onChange={e => set('semester', e.target.value)} required>
                  <option value="">Select semester</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-success w-full py-2.5 mt-2">
              {loading ? 'Creating Account...' : 'Create Student Account'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Are you a teacher?{' '}
              <Link to="/register/teacher" className="text-blue-600 font-medium hover:underline">Register as Teacher</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
