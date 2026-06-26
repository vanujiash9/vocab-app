import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeadlinesPage } from './pages/DeadlinesPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { LibraryPage } from './pages/LibraryPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ProfilePage } from './pages/ProfilePage';
import { QuizPage } from './pages/QuizPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return <Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/lookup" element={<LibraryPage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/assigned-words" element={<PlaceholderPage type="assigned" />} />
      <Route path="/flashcards" element={<FlashcardsPage />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/deadlines" element={<DeadlinesPage />} />
      <Route path="/notifications" element={<PlaceholderPage type="notifications" />} />
      <Route path="/assign-words" element={<PlaceholderPage type="assign" />} />
      <Route path="/import-excel" element={<PlaceholderPage type="import" />} />
      <Route path="/students" element={<PlaceholderPage type="students" />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}
