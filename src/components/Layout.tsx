import { useState } from 'react';
import { Bell, BookOpen, CalendarDays, ClipboardCheck, FileSpreadsheet, Home, Library, LogOut, Menu, Search, Send, Settings, Upload, Users, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
    title: 'Học mỗi ngày',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/lookup', label: 'Tra cứu từ', icon: Search },
      { to: '/library', label: 'Thư viện từ', icon: Library },
      { to: '/assigned-words', label: 'Từ được giao', icon: Send },
    ],
  },
  {
    title: 'Luyện tập',
    items: [
      { to: '/flashcards', label: 'Flashcard', icon: BookOpen },
      { to: '/quiz', label: 'Quiz', icon: ClipboardCheck },
      { to: '/deadlines', label: 'Deadline', icon: CalendarDays },
      { to: '/notifications', label: 'Thông báo', icon: Bell },
    ],
  },
];

const teacherSections: NavSection[] = [
  {
    title: 'Điều phối lớp học',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/students', label: 'Học viên', icon: Users },
      { to: '/assign-words', label: 'Giao từ', icon: Upload },
      { to: '/notifications', label: 'Thông báo', icon: Bell },
    ],
  },
  {
    title: 'Tài nguyên',
    items: [
      { to: '/lookup', label: 'Tra cứu từ', icon: Search },
      { to: '/library', label: 'Kho từ vựng', icon: Library },
      { to: '/import-excel', label: 'Import Excel', icon: FileSpreadsheet },
    ],
  },
];

const pageMeta: Record<string, { title: string; description: string }> = {
  '/dashboard': {
    title: 'Tổng quan hôm nay',
    description: 'Giữ nhịp học và lớp học rõ ràng.',
  },
  '/lookup': {
    title: 'Tra cứu từ mới',
    description: 'Tra cứu và lưu từ mới.',
  },
  '/library': {
    title: 'Thư viện từ vựng',
    description: 'Quản lý các từ đã lưu.',
  },
  '/assigned-words': {
    title: 'Từ được giao',
    description: 'Xem nhanh các từ chờ học.',
  },
  '/flashcards': {
    title: 'Phiên flashcard',
    description: 'Ôn tập nhanh bằng lật thẻ.',
  },
  '/quiz': {
    title: 'Kiểm tra nhanh',
    description: 'Kiểm tra mức ghi nhớ hiện tại.',
  },
  '/deadlines': {
    title: 'Các mốc học tập',
    description: 'Theo dõi mục tiêu đang mở.',
  },
  '/notifications': {
    title: 'Thông báo',
    description: 'Xem lời nhắc và cập nhật mới.',
  },
  '/assign-words': {
    title: 'Tạo đợt giao từ',
    description: 'Chọn học viên, chọn từ, rồi xác nhận.',
  },
  '/import-excel': {
    title: 'Nhập dữ liệu',
    description: 'Bổ sung tài nguyên hàng loạt.',
  },
  '/students': {
    title: 'Quản lý học viên',
    description: 'Giữ danh sách học viên luôn sẵn sàng.',
  },
  '/profile': {
    title: 'Hồ sơ cá nhân',
    description: 'Cập nhật thông tin tài khoản.',
  },
  '/settings': {
    title: 'Thiết lập học tập',
    description: 'Tinh chỉnh mục tiêu và cài đặt.',
  },
};

export function Layout() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const sections = profile?.role === 'teacher' ? teacherSections : studentSections;
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
          <div>
            <strong>Vocabulary OS</strong>
            <span>Học từ vựng</span>
          </div>
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Đóng menu"><X size={20} /></button>
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <p className="nav-caption">{section.title}</p>
            <nav className="sidebar-nav">
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => isActive || location.pathname.startsWith(`${to}/`) ? 'active' : ''}
                >
                  <Icon size={19} />
                  <span>{label}</span>
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
          <Link className="icon-button" to="/settings" onClick={() => setOpen(false)} aria-label="Cài đặt"><Settings size={18} /></Link>
          <button className="icon-button" onClick={() => void logout()} aria-label="Đăng xuất"><LogOut size={18} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="mobile-topbar">
          <button className="icon-button" onClick={() => setOpen(true)} aria-label="Mở menu"><Menu size={21} /></button>
          <div>
            <strong>{activeMeta.title}</strong>
            <p className="muted">{profile?.role === 'teacher' ? 'Không gian giáo viên' : 'Không gian học từ vựng'}</p>
          </div>
          <span className="role-pill mini">{profile?.role}</span>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
