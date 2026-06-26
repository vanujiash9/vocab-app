import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, CalendarDays, ClipboardCheck, GraduationCap, Home, Library, LogOut, Menu, Settings, UserRound, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const commonNav = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/courses', label: 'Khóa học', icon: GraduationCap },
  { to: '/library', label: 'Từ điển', icon: Library },
  { to: '/flashcards', label: 'Flashcard', icon: BookOpen },
  { to: '/quiz', label: 'Quiz', icon: ClipboardCheck },
  { to: '/deadlines', label: 'Deadline', icon: CalendarDays },
];

export function Layout() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const logout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="app-shell">
      {open && <button className="drawer-overlay" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark">VO</div>
          <div><strong>Vocabulary OS</strong><span>IELTS study system</span></div>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Đóng menu"><X size={20} /></button>
        </div>
        <p className="nav-caption">Học tập</p>
        <nav className="sidebar-nav">
          {commonNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon size={19} /><span>{label}</span>
            </NavLink>
          ))}
          {profile?.role === 'teacher' && (
            <NavLink to="/students" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
              <Users size={19} /><span>Học viên</span>
            </NavLink>
          )}
        </nav>
        <p className="nav-caption account-caption">Tài khoản</p>
        <nav className="sidebar-nav">
          <NavLink to="/profile" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><UserRound size={19} /><span>Hồ sơ</span></NavLink>
          <NavLink to="/settings" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Settings size={19} /><span>Cài đặt</span></NavLink>
        </nav>
        <div className="role-card">
          <span className="role-pill">{profile?.role === 'teacher' ? 'Teacher' : 'Student'}</span>
          <strong>{profile?.role === 'teacher' ? 'Không gian giảng dạy' : 'Không gian học tập'}</strong>
          <p>{profile?.role === 'teacher' ? 'Tạo khóa học và theo dõi học viên.' : 'Tham gia khóa học và ghi nhớ từ vựng.'}</p>
        </div>
        <div className="sidebar-profile">
          <div className="avatar">{profile?.display_name?.slice(0, 2).toUpperCase() || 'UV'}</div>
          <div className="sidebar-user"><strong>{profile?.display_name || 'Người dùng'}</strong><span>{profile?.email}</span></div>
          <button className="icon-button" onClick={logout} aria-label="Đăng xuất"><LogOut size={18} /></button>
        </div>
      </aside>
      <main className="main-area">
        <header className="mobile-topbar">
          <button className="icon-button" onClick={() => setOpen(true)} aria-label="Mở menu"><Menu size={21} /></button>
          <strong>Vocabulary OS</strong>
          <span className="role-pill mini">{profile?.role}</span>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
