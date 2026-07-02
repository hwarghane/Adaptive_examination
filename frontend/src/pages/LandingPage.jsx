import { Link } from 'react-router-dom';
import { GraduationCap, Brain, Users, BarChart3, Shield, Zap, ChevronRight, BookOpen } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">AdaptExam</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm">Sign In</Link>
            <Link to="/register/student" className="btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-24 px-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            AI-Powered Adaptive Examination Platform
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Smart Exams That<br />
            <span className="text-blue-600">Adapt to Every Student</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
            Build a modern examination ecosystem for any school, college, or university. Teachers create classes, assign adaptive exams, and gain deep insights. Students learn at their own pace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register/student" className="btn-primary py-3 px-8 text-base flex items-center justify-center gap-2">
              Start as Student <ChevronRight className="w-4 h-4" />
            </Link>
            <Link to="/register/teacher" className="btn-secondary py-3 px-8 text-base flex items-center justify-center gap-2">
              Start as Teacher <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Everything You Need</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">One platform for all your examination needs — from any institution, any branch, any scale.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Users, color: 'blue', title: 'Class Management', desc: 'Create unlimited classes with auto-generated join codes and QR invites. Students join independently.' },
              { icon: Brain, color: 'purple', title: 'Adaptive Testing', desc: "Questions adapt in real-time based on Bloom's Taxonomy levels and difficulty, giving every student a personalized exam." },
              { icon: BarChart3, color: 'green', title: 'Deep Analytics', desc: 'Class-wise performance, Bloom level distribution, individual student reports, and actionable insights.' },
              { icon: Shield, color: 'orange', title: 'Role-Based Security', desc: 'Separate teacher and student portals with secure JWT authentication and role-enforced access control.' },
              { icon: BookOpen, color: 'red', title: 'Question Bank', desc: "Build a rich question bank tagged by Bloom's Taxonomy level and difficulty factor (1–10) for precise adaptive selection." },
              { icon: Zap, color: 'yellow', title: 'Open Platform', desc: 'Any school, college, or university can use it. No IT setup required — just register and start.' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="card hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl bg-${color}-100 flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Exams?</h2>
          <p className="text-blue-100 mb-8 text-lg">Join thousands of teachers and students already using AdaptExam.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register/teacher" className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 rounded-lg transition-colors">
              Register as Teacher
            </Link>
            <Link to="/register/student" className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors border border-blue-400">
              Register as Student
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-gray-400 text-sm bg-gray-50 border-t border-gray-100">
        © 2024 AdaptExam — Open platform for all institutions worldwide.
      </footer>
    </div>
  );
}
