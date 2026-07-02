import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { AssignWordsPage } from './pages/AssignWordsPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeadlinesPage } from './pages/DeadlinesPage';
import { LibraryPage } from './pages/LibraryPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentsPage } from './pages/StudentsPage';
import { AIAssistantPage } from './features/ai/AIAssistantPage';
import { AssignedWordsPage } from './features/assigned-words/AssignedWordsPage';
import { DictionarySearchPage } from './features/dictionary/DictionarySearchPage';
import { PersonalLibraryPage } from './features/personal-library/PersonalLibraryPage';
import { ReadingNotesPage } from './features/readingNotes/ReadingNotesPage';
import { ReviewPage } from './features/review/ReviewPage';
import { ImportExcelPage } from './pages/ImportExcelPage';

function RoleGate({
  children,
  role,
}: {
  children: React.ReactNode;
  role: 'teacher' | 'student';
}) {
  const { profile, profileStatus } = useAuth();
  if (profileStatus === 'loading' || profileStatus === 'missing') {
    return <div className="screen-center"><div className="loader" /></div>;
  }
  return profile?.role === role ? children : <Navigate to="/dashboard" replace />;
}

function TeacherOnly({ children }: { children: React.ReactNode }) {
  return <RoleGate role="teacher">{children}</RoleGate>;
}

function StudentOnly({ children }: { children: React.ReactNode }) {
  return <RoleGate role="student">{children}</RoleGate>;
}

function LegacyReviewRedirect({ mode }: { mode: 'flashcard' | 'quiz' }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('mode', mode);
  const nextSearch = params.toString();
  return <Navigate to={`/review${nextSearch ? `?${nextSearch}` : ''}`} replace />;
}

export default function App() {
  return <Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/lookup" element={<DictionarySearchPage />} />
      <Route path="/library" element={<StudentOnly><PersonalLibraryPage /></StudentOnly>} />
      <Route path="/teacher/library" element={<TeacherOnly><LibraryPage /></TeacherOnly>} />
      <Route path="/reading-notes" element={<ReadingNotesPage />} />
      <Route path="/assigned-words" element={<StudentOnly><AssignedWordsPage /></StudentOnly>} />
      <Route path="/review" element={<StudentOnly><ReviewPage /></StudentOnly>} />
      <Route path="/flashcards" element={<LegacyReviewRedirect mode="flashcard" />} />
      <Route path="/quiz" element={<LegacyReviewRedirect mode="quiz" />} />
      <Route path="/ai-assistant" element={<StudentOnly><AIAssistantPage /></StudentOnly>} />
      <Route path="/deadlines" element={<DeadlinesPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/assign-words" element={<TeacherOnly><AssignWordsPage /></TeacherOnly>} />
      <Route path="/import-excel" element={<TeacherOnly><ImportExcelPage /></TeacherOnly>} />
      <Route path="/students" element={<StudentsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}
