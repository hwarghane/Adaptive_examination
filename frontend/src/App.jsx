import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Auth pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterStudentPage from './pages/RegisterStudentPage';
import RegisterTeacherPage from './pages/RegisterTeacherPage';
import JoinClassPage from './pages/JoinClassPage';

// Teacher pages
import TeacherLayout from './components/layouts/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherClasses from './pages/teacher/TeacherClasses';
import ClassDetail from './pages/teacher/ClassDetail';
import SubjectManager from './pages/teacher/SubjectManager';
import QuestionBank from './pages/teacher/QuestionBank';
import AddEditQuestion from './pages/teacher/AddEditQuestion';
import TeacherExams from './pages/teacher/TeacherExams';
import CreateEditExam from './pages/teacher/CreateEditExam';
import TeacherAnalytics from './pages/teacher/TeacherAnalytics';
import ExamAnalytics from './pages/teacher/ExamAnalytics';

// Student pages
import StudentLayout from './components/layouts/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentClasses from './pages/student/StudentClasses';
import StudentExams from './pages/student/StudentExams';
import TakeExam from './pages/student/TakeExam';
import ExamResult from './pages/student/ExamResult';
import StudentAnalytics from './pages/student/StudentAnalytics';
import NotificationsPage from './pages/NotificationsPage';

// Guards
function RequireAuth({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
  }
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} /> : <LoginPage />} />
      <Route path="/register/student" element={<RegisterStudentPage />} />
      <Route path="/register/teacher" element={<RegisterTeacherPage />} />
      <Route path="/join/:code" element={<JoinClassPage />} />

      {/* Teacher */}
      <Route path="/teacher" element={<RequireAuth role="teacher"><TeacherLayout /></RequireAuth>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="classes" element={<TeacherClasses />} />
        <Route path="classes/:id" element={<ClassDetail />} />
        <Route path="subjects" element={<SubjectManager />} />
        <Route path="questions" element={<QuestionBank />} />
        <Route path="questions/add" element={<AddEditQuestion />} />
        <Route path="questions/edit/:id" element={<AddEditQuestion />} />
        <Route path="exams" element={<TeacherExams />} />
        <Route path="exams/create" element={<CreateEditExam />} />
        <Route path="exams/edit/:id" element={<CreateEditExam />} />
        <Route path="analytics" element={<TeacherAnalytics />} />
        <Route path="analytics/exam/:id" element={<ExamAnalytics />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Student */}
      <Route path="/student" element={<RequireAuth role="student"><StudentLayout /></RequireAuth>}>
        <Route index element={<StudentDashboard />} />
        <Route path="classes" element={<StudentClasses />} />
        <Route path="exams" element={<StudentExams />} />
        <Route path="exams/:id/take" element={<TakeExam />} />
        <Route path="attempts/:id/result" element={<ExamResult />} />
        <Route path="analytics" element={<StudentAnalytics />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
