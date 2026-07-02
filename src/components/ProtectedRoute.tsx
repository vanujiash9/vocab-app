import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileStatus, profileError } = useAuth();
  const location = useLocation();
  if (loading || (user && profileStatus === 'loading')) return <div className="screen-center"><div className="loader" /></div>;
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;
  if (profileStatus === 'missing') return <div className="screen-center"><div><strong>Đang hoàn tất thiết lập tài khoản...</strong><p>Hồ sơ của bạn đang được tạo. Hãy thử lại sau ít giây.</p></div></div>;
  if (profileStatus === 'error') return <div className="screen-center"><div><strong>Không tải được hồ sơ.</strong><p>{profileError || 'Vui lòng tải lại trang hoặc đăng nhập lại.'}</p></div></div>;
  return children;
}
