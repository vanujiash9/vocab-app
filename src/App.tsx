import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { AssignedWordsPage } from './pages/AssignedWordsPage';
import { AssignWordsPage } from './pages/AssignWordsPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeadlinesPage } from './pages/DeadlinesPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { DictionarySearchPage } from './features/dictionary/DictionarySearchPage';
import { ImportExcelPage } from './pages/ImportExcelPage';
import { LibraryPage } from './pages/LibraryPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ProfilePage } from './pages/ProfilePage';
import { QuizPage } from './pages/QuizPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentsPage } from './pages/StudentsPage';

function TeacherOnly({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  return profile?.role === 'teacher' ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return <Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/lookup" element={<DictionarySearchPage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/assigned-words" element={<AssignedWordsPage />} />
      <Route path="/flashcards" element={<FlashcardsPage />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/deadlines" element={<DeadlinesPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/assign-words" element={<TeacherOnly><AssignWordsPage /></TeacherOnly>} />
      <Route path="/import-excel" element={<TeacherOnly><ImportExcelPage /></TeacherOnly>} />
      <Route path="/students" element={<TeacherOnly><StudentsPage /></TeacherOnly>} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}
