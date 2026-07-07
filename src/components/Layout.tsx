import { useEffect, useState } from 'react';
import { Bell, BookOpen, CalendarDays, ClipboardCheck, FileSpreadsheet, Home, Library, LogOut, Menu, Search, Send, Settings, Upload, Users, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { countUnreadNotifications } from '../services/data';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const studentSections: NavSection[] = [
  {
    title: '',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/lookup', label: 'Tra cứu từ', icon: Search },
      { to: '/reading-notes', label: 'Đọc & Ghi chú từ', icon: BookOpen },
      { to: '/library', label: 'Thư viện từ', icon: Library },
      { to: '/assigned-words', label: 'Từ được giao', icon: Send },
      { to: '/import-excel', label: 'Nhập CSV', icon: FileSpreadsheet },
      { to: '/flashcards', label: 'Flashcard', icon: BookOpen },
      { to: '/quiz', label: 'Quiz', icon: ClipboardCheck },
      { to: '/import-excel', label: 'Nhập CSV', icon: FileSpreadsheet },
      { to: '/deadlines', label: 'Deadline', icon: CalendarDays },
      { to: '/notifications', label: 'Thông báo', icon: Bell },
    ],
  },
];

const teacherSections: NavSection[] = [
  {
    title: '',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/students', label: 'Học viên', icon: Users },
      { to: '/assign-words', label: 'Giao từ', icon: Upload },
      { to: '/lookup', label: 'Tra cứu từ', icon: Search },
      { to: '/reading-notes', label: 'Đọc & Ghi chú từ', icon: BookOpen },
      { to: '/library', label: 'Kho từ vựng', icon: Library },
      { to: '/import-excel', label: 'Nhập CSV', icon: FileSpreadsheet },
    ],
  },
];

const pageMeta: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Tổng quan hôm nay', description: 'Giữ nhịp học và lớp học rõ ràng.' },
  '/lookup': { title: 'Tra cứu từ mới', description: 'Tra cứu và lưu từ mới.' },
  '/reading-notes': { title: 'Đọc & Ghi chú từ', description: 'Dịch nghĩa theo ngữ cảnh bằng AI.' },
  '/library': { title: 'Thư viện từ vựng', description: 'Quản lý các từ đã lưu.' },
  '/assigned-words': { title: 'Từ được giao', description: 'Xem nhanh các từ chờ học.' },
  '/flashcards': { title: 'Phiên flashcard', description: 'Ôn tập nhanh bằng lật thẻ.' },
  '/quiz': { title: 'Kiểm tra nhanh', description: 'Kiểm tra mức ghi nhớ hiện tại.' },
  '/deadlines': { title: 'Các mốc học tập', description: 'Theo dõi mục tiêu đang mở.' },
  '/notifications': { title: 'Thông báo', description: 'Xem lời nhắc và cập nhật mới.' },
  '/assign-words': { title: 'Tạo đợt giao từ', description: 'Chọn học viên, chọn từ, rồi xác nhận.' },
  '/import-excel': { title: 'Nhập CSV từ Excel', description: 'Bổ sung bộ từ hàng loạt bằng file CSV export từ Excel.' },
  '/students': { title: 'Quản lý học viên', description: 'Giữ danh sách học viên luôn sẵn sàng.' },
  '/profile': { title: 'Hồ sơ cá nhân', description: 'Cập nhật thông tin tài khoản.' },
  '/settings': { title: 'Thiết lập học tập', description: 'Tinh chỉnh mục tiêu và cài đặt.' },
};

export function Layout() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadUnreadNotifications = async () => {
      if (!user) {
        setUnreadNotifications(0);
        return;
      }

      try {
        setUnreadNotifications(await countUnreadNotifications(user.id));
      } catch {
        setUnreadNotifications(0);
      }
    };

    void loadUnreadNotifications();
  }, [user, location.pathname]);

  const sections = profile?.role === 'teacher' ? teacherSections : studentSections;
  const hasUnreadNotifications = unreadNotifications > 0;
  const unreadNotificationLabel = unreadNotifications > 9 ? '9+' : `${unreadNotifications}`;

  const renderNavLabel = (to: string, label: string) => {
    if (to !== '/notifications' || !hasUnreadNotifications) {
      return <span>{label}</span>;
    }

    return (
      <span className="nav-label-with-badge">
        <span>{label}</span>
        <span className="notification-badge" aria-label={`${unreadNotifications} thông báo chưa đọc`}>
          {unreadNotificationLabel}
        </span>
      </span>
    );
  };

  const activeMeta = pageMeta[location.pathname] ?? {
    title: 'Vocabulary OS',
    description: 'Giữ nhịp học rõ ràng.',
  };

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
          <div className="brand-copy">
            <strong>Vocabulary OS</strong>
            <span>Học từ vựng mỗi ngày</span>
          </div>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Đóng menu">
            <X size={20} />
          </button>
        </div>

        {sections.map((section) => (
          <div key={section.items[0]?.to ?? section.title}>
            {section.title ? <p className="nav-caption">{section.title}</p> : null}
            <nav className="sidebar-nav">
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => (isActive || location.pathname.startsWith(`${to}/`) ? 'active' : '')}
                >
                  <Icon size={19} />
                  {renderNavLabel(to, label)}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        <div className="sidebar-profile">
          <Link className="avatar" to="/profile" onClick={() => setOpen(false)}>
            {profile?.display_name?.slice(0, 2).toUpperCase() || 'UV'}
          </Link>
          <Link className="sidebar-user" to="/profile" onClick={() => setOpen(false)}>
            <strong>{profile?.display_name || 'Người dùng'}</strong>
            <span>{profile?.email}</span>
          </Link>
          <button className="settings-button" onClick={() => void logout()} aria-label="Đăng xuất">
            <Settings size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="mobile-topbar">
          <button className="icon-button mobile-menu-button" onClick={() => setOpen(true)} aria-label="Mở menu">
            <Menu size={21} />
          </button>
          <Link
            className="icon-button mobile-notifications-button"
            to="/notifications"
            aria-label={hasUnreadNotifications ? `${unreadNotifications} thông báo chưa đọc` : 'Mở thông báo'}
          >
            <Bell size={18} />
            {hasUnreadNotifications ? <span className="notification-badge mobile-notification-badge">{unreadNotificationLabel}</span> : null}
          </Link>
          <div>
            <strong>{activeMeta.title}</strong>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
