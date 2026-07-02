import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MASCOT_STORAGE_KEY, StudyMascot, isMascotVariant } from '../components/study-mascot/StudyMascot';
import type { MascotVariant } from '../types';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_MASCOT: MascotVariant = 'dog';

function getStoredMascot(): MascotVariant {
  if (typeof window === 'undefined') return DEFAULT_MASCOT;
  const value = localStorage.getItem(MASCOT_STORAGE_KEY);
  return value && isMascotVariant(value) ? value : DEFAULT_MASCOT;
}

export function AuthPage() {
  const { user, signIn, signUp, profileStatus } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const mascotVariant = useMemo(() => getStoredMascot(), []);

  if (user && profileStatus === 'ready') return <Navigate to="/dashboard" replace />;
  if (user && (profileStatus === 'loading' || profileStatus === 'missing')) {
    return <div className="screen-center"><div><strong>Đang hoàn tất thiết lập tài khoản...</strong><p>Bạn đã đăng nhập thành công. Hệ thống đang tải hồ sơ của bạn.</p></div></div>;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (mode === 'login') {
        await signIn(email, password);
        navigate('/dashboard');
      } else {
        const result = await signUp({ email, password, displayName });
        setMessage(result);
        setMode('login');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand"><div className="brand-mark">VN</div><div><strong>IELTS Vocabulary OS</strong><span>Blue study operating system</span></div></div>
        <div className="auth-copy"><span className="eyebrow">Học có hệ thống</span><h1>Mỗi ngày một chút, từ vựng sẽ thành phản xạ.</h1><p>Teacher tạo khóa học và quản lý nội dung. Student tham gia bằng mã, học flashcard, làm quiz và theo dõi tiến độ.</p></div>
        <StudyMascot variant={mascotVariant} message={mode === 'login' ? 'Chào mừng bạn trở lại!' : 'Đăng ký xong là học ngay nhé!'} expression={mode === 'login' ? 'happy' : 'surprised'} />
      </section>
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-heading">
            <span>{mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</span>
            <h2>{mode === 'login' ? 'Vào học' : 'Tạo tài khoản'}</h2>
          </div>
          {mode === 'register' && <label>Họ tên<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nguyễn Thanh Vân" required /></label>}
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
          <label>Mật khẩu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="Tối thiểu 6 ký tự" required /></label>
          {message && <div className="form-message">{message}</div>}
          <button className="button primary full auth-submit" disabled={loading}>{loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
          <button type="button" className="text-button auth-mode-toggle" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(''); }}>
            {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </form>
      </section>
    </div>
  );
}
