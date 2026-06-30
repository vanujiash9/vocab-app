import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { AssignWordsPage } from './pages/AssignWordsPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeadlinesPage } from './pages/DeadlinesPage';
import { AIAssistantPage } from './features/ai/AIAssistantPage';
import { DictionarySearchPage } from './features/dictionary/DictionarySearchPage';
import { ImportExcelPage } from './pages/ImportExcelPage';
import { LibraryPage } from './pages/LibraryPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReviewPage } from './pages/ReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentsPage } from './pages/StudentsPage';
import { ReadingNotesPage } from './features/readingNotes/ReadingNotesPage';

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
      <Route path="/reading-notes" element={<ReadingNotesPage />} />
      <Route path="/assigned-words" element={<Navigate to="/library?filter=assigned" replace />} />
      <Route path="/review" element={<ReviewPage />} />
      <Route path="/flashcards" element={<Navigate to="/review" replace />} />
      <Route path="/quiz" element={<Navigate to="/review" replace />} />
      <Route path="/ai-assistant" element={<AIAssistantPage />} />
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
