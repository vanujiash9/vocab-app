import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpenCheck } from 'lucide-react';
import { normalizeDisplayName, normalizeEmail, normalizePassword, validateAuthInput } from '../contexts/AuthContext';
import { StudyMascot } from '../components/StudyMascot';
import { supabase } from '../lib/supabase';

export function AuthPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const authMeta = useMemo(() => ({
    heading: mode === 'login' ? 'Vào học ngay' : 'Bắt đầu hành trình học từ vựng',
    eyebrow: mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản',
    heroHeading: mode === 'login' ? 'Vào lại đúng hồ sơ học tập của bạn.' : 'Tạo tài khoản gọn nhẹ để bắt đầu học ngay.',
    heroBody: mode === 'login' ? 'Dùng email và mật khẩu để quay lại đúng flow đang dở.' : 'Tài khoản mới mặc định là học viên để bạn vào học ngay, không cần thiết lập rườm rà.',
    note: mode === 'login' ? 'Một điểm vào duy nhất để quay lại đúng tiến độ học của bạn.' : 'Tài khoản mới sẽ mặc định là học viên.',
    mascotMessage: mode === 'login' ? 'Chào mừng bạn quay lại!' : 'Tạo tài khoản xong là học ngay!',
    mascotExpression: mode === 'login' ? 'happy' : 'surprised',
  }), [mode]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const normalizedEmail = normalizeEmail(email);
      const normalizedPassword = normalizePassword(password);
      const normalizedDisplayName = normalizeDisplayName(displayName);

      validateAuthInput(mode, normalizedEmail, normalizedPassword, normalizedDisplayName);

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: normalizedPassword });
        if (error) throw error;
        setIsAuthenticated(true);
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: normalizedPassword,
          options: { data: { display_name: normalizedDisplayName } },
        });
        if (error) throw error;
        setMessage('Đăng ký thành công. Bạn có thể đăng nhập ngay.');
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
