import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpenCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { StudyMascot } from '../components/StudyMascot';

export function AuthPage() {
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

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
        <div className="auth-brand"><div className="brand-mark">VN</div><div><strong>IELTS Từ vựng</strong><span>Không gian học từ vựng mỗi ngày</span></div></div>
        <div className="auth-copy"><span className="eyebrow">Học ngay</span><h1>{mode === 'login' ? 'Vào lại đúng hồ sơ học tập của bạn.' : 'Tạo tài khoản gọn nhẹ để bắt đầu học ngay.'}</h1><p>{mode === 'login' ? 'Dùng email và mật khẩu để quay lại đúng flow đang dở.' : 'Tài khoản mới mặc định là học viên để bạn vào học ngay, không cần thiết lập rườm rà.'}</p></div>
        <StudyMascot message={mode === 'login' ? 'Chào mừng bạn quay lại!' : 'Tạo tài khoản xong là học ngay!'} expression={mode === 'login' ? 'happy' : 'surprised'} />
      </section>
      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-heading"><span>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</span><h2>{mode === 'login' ? 'Vào học ngay' : 'Bắt đầu hành trình học từ vựng'}</h2><p>{mode === 'login' ? 'Dùng email và mật khẩu để vào lại đúng hồ sơ học tập của bạn.' : 'Tạo tài khoản gọn nhẹ. Tài khoản mới sẽ mặc định là học viên để bạn bắt đầu học ngay.'}</p></div>
          {mode === 'register' && <div className="auth-note"><BookOpenCheck size={18} /> Tài khoản mới sẽ mặc định là học viên.</div>}
          {mode === 'login' && <div className="auth-note"><BookOpenCheck size={18} /> Một điểm vào duy nhất để quay lại đúng tiến độ học của bạn.</div>}
          {mode === 'register' && <label>Họ tên<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nguyễn Thanh Vân" autoComplete="name" required /></label>}
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
          <label>Mật khẩu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="Tối thiểu 6 ký tự" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
          {message && <div className="form-message">{message}</div>}
          <button className="button primary full auth-submit" disabled={loading}>{loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</button>
          <button type="button" className="text-button auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(''); }}>
            {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </form>
      </section>
    </div>
  );
}
