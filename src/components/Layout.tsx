import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { Bell, BookText, Bot, CalendarDays, FileSpreadsheet, Home, Library, LogOut, Menu, RotateCcw, Search, Settings, Upload, Users, X } from 'lucide-react';
import { Avatar } from './avatars/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getUnreadNotificationCount } from '../services/data';

const studentNav = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/lookup', label: 'Tra cứu từ', icon: Search },
  { to: '/reading-notes', label: 'Đọc & Ghi chú từ', icon: BookText },
  { to: '/library', label: 'Từ vựng', icon: Library },
  { to: '/review', label: 'Ôn tập', icon: RotateCcw },
  { to: '/ai-assistant', label: 'Trợ lý AI', icon: Bot },
  { to: '/deadlines', label: 'Deadline', icon: CalendarDays },
  { to: '/notifications', label: 'Thông báo', icon: Bell },
];

const teacherNav = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/lookup', label: 'Tra cứu từ', icon: Search },
  { to: '/reading-notes', label: 'Đọc & Ghi chú từ', icon: BookText },
  { to: '/library', label: 'Kho từ vựng', icon: Library },
  { to: '/assign-words', label: 'Giao từ', icon: Upload },
  { to: '/import-excel', label: 'Import Excel', icon: FileSpreadsheet },
  { to: '/students', label: 'Học viên', icon: Users },
  { to: '/notifications', label: 'Thông báo', icon: Bell },
];

export function Layout() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const navItems = profile?.role === 'teacher' ? teacherNav : studentNav;

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let active = true;

    const loadUnreadCount = async () => {
      try {
        const count = await getUnreadNotificationCount(user.id);
        if (active) {
          setUnreadCount(count);
        }
      } catch {
        if (active) {
          setUnreadCount(0);
        }
      }
    };

    void loadUnreadCount();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadUnreadCount();
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user]);

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
          {navItems.map(({ to, label, icon: Icon }) => {
            const hasUnreadNotifications = to === '/notifications' && unreadCount > 0;
            return <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `${isActive ? 'active' : ''} ${hasUnreadNotifications ? 'unread' : ''}`.trim()}>
              <span className={`nav-icon-wrap ${hasUnreadNotifications ? 'has-alert' : ''}`}>
                <Icon size={19} />
                {hasUnreadNotifications && <i className="nav-alert-dot" aria-hidden="true" />}
              </span>
              <span>{label}</span>
              {hasUnreadNotifications && <b className="nav-alert-badge">{unreadCount > 9 ? '9+' : unreadCount}</b>}
            </NavLink>;
          })}
        </nav>
        <div className="sidebar-profile">
          <Link className="avatar" to="/profile" onClick={() => setOpen(false)}>
            <Avatar avatarId={profile?.avatar_id} name={profile?.display_name} size="sm" />
          </Link>
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
