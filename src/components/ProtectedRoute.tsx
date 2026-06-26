import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="screen-center"><div className="loader" /></div>;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  return children;
}
