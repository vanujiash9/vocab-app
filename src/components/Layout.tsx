import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { Bell, BookOpen, CalendarDays, ClipboardCheck, FileSpreadsheet, Home, Library, LogOut, Menu, Search, Send, Settings, Upload, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const studentNav = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/lookup', label: 'Tra cứu từ', icon: Search },
  { to: '/library', label: 'Thư viện từ', icon: Library },
  { to: '/assigned-words', label: 'Từ được giao', icon: Send },
  { to: '/flashcards', label: 'Flashcard', icon: BookOpen },
  { to: '/quiz', label: 'Quiz', icon: ClipboardCheck },
  { to: '/deadlines', label: 'Deadline', icon: CalendarDays },
  { to: '/notifications', label: 'Thông báo', icon: Bell },
];

const teacherNav = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/lookup', label: 'Tra cứu từ', icon: Search },
  { to: '/library', label: 'Kho từ vựng', icon: Library },
  { to: '/assign-words', label: 'Giao từ', icon: Upload },
  { to: '/import-excel', label: 'Import Excel', icon: FileSpreadsheet },
  { to: '/students', label: 'Học viên', icon: Users },
  { to: '/notifications', label: 'Thông báo', icon: Bell },
];

export function Layout() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const navItems = profile?.role === 'teacher' ? teacherNav : studentNav;

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
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon size={19} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="role-card">
          <span className="role-pill">{profile?.role === 'teacher' ? 'Teacher' : 'Student'}</span>
          <strong>{profile?.role === 'teacher' ? 'Không gian giáo viên' : 'Không gian học từ vựng'}</strong>
          <p>{profile?.role === 'teacher' ? 'Quản lý kho từ, giao từ và theo dõi học viên.' : 'Tra cứu, lưu từ, ôn flashcard và làm quiz mỗi ngày.'}</p>
        </div>
        <div className="sidebar-profile">
          <Link className="avatar" to="/profile" onClick={() => setOpen(false)}>{profile?.display_name?.slice(0, 2).toUpperCase() || 'UV'}</Link>
          <Link className="sidebar-user" to="/profile" onClick={() => setOpen(false)}><strong>{profile?.display_name || 'Người dùng'}</strong><span>{profile?.email}</span></Link>
          <Link className="icon-button" to="/settings" onClick={() => setOpen(false)} aria-label="Cài đặt"><Settings size={18} /></Link>
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
