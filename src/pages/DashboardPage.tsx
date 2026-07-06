import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, LibraryBig, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { StudyMascot } from '../components/StudyMascot';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardSummary, listDeadlines } from '../services/data';
import type { DashboardSummary, Deadline } from '../types';

function getHeroCopy(role?: string) {
  if (role === 'teacher') {
    return {
      eyebrow: 'Teacher workspace',
      heading: 'Giữ lớp học rõ, gọn và sẵn để tiếp tục giao bài.',
      description: 'Nhìn nhanh học viên, kho từ và các việc đang mở trong cùng một workspace.',
      message: 'Hôm nay lớp cần gì?',
    };
  }

  return {
    eyebrow: 'Vocabulary workspace',
    heading: 'Biết ngay nên học gì tiếp theo.',
    description: 'Bắt đầu từ danh sách được giao rồi chuyển nhanh sang tra cứu hoặc ôn tập.',
    message: 'Hôm nay mình học gì?',
  };
}

function getDeadlineDescription(role?: string) {
  return role === 'teacher'
    ? 'Những việc giữ lớp học tiếp tục trôi chảy.'
    : 'Những mục tiêu học tập nên xử lý tiếp theo.';
}

function getDeadlineEmpty(role?: string) {
  return role === 'teacher'
    ? {
      title: 'Chưa có việc mở',
      description: 'Bạn có thể quay lại giao từ hoặc xem học viên.',
      to: '/assign-words',
      label: 'Mở giao từ',
    }
    : {
      title: 'Chưa có deadline mở',
      description: 'Bạn có thể tiếp tục ôn từ được giao hoặc tra cứu thêm.',
      to: '/assigned-words',
      label: 'Xem từ được giao',
    };
}

function getPageDescription(role?: string) {
  return role === 'teacher'
    ? 'Theo dõi lớp học trong một nhịp làm việc gọn và dễ quét.'
    : 'Theo dõi từ vựng trong một workspace gọn và dễ quay lại.';
}

function Progress({ label, value }: { label: string; value: number }) {
  return <div className="progress-row"><div><span>{label}</span><b>{Math.round(value)}%</b></div><div className="progress-track"><i style={{ width: `${Math.min(100, value)}%` }} /></div></div>;
}

function DashboardHero({ role }: { role?: string }) {
  const heroCopy = getHeroCopy(role);
  return <section className="hero-card"><div className="hero-copy"><span className="eyebrow">{heroCopy.eyebrow}</span><h2>{heroCopy.heading}</h2><p>{heroCopy.description}</p></div><StudyMascot message={heroCopy.message} expression="happy" /></section>;
}

function DashboardStats({ summary }: { summary: DashboardSummary }) {
  const stats = [
    ['Từ vựng', summary.vocabulary, LibraryBig],
    ['Đã thuộc', summary.known, CheckCircle2],
    ['Khó nhớ', summary.difficult, TriangleAlert],
    ['Deadline mở', summary.openDeadlines, CalendarClock],
  ] as const;

  return <section className="stats-grid">{stats.map(([label, value, Icon]) => <article className="stat-card" key={label}><div className="stat-icon"><Icon size={20} /></div><strong>{value}</strong><span>{label}</span></article>)}</section>;
}

function VocabularyProgressPanel({ summary }: { summary: DashboardSummary }) {
  return <article className="panel"><div className="panel-heading"><div><h3>Tiến độ từ vựng</h3><p>Phân loại nhanh thư viện hiện tại.</p></div></div><div className="progress-stack"><Progress label="Đã thuộc" value={summary.vocabulary ? summary.known / summary.vocabulary * 100 : 0} /><Progress label="Khó nhớ" value={summary.vocabulary ? summary.difficult / summary.vocabulary * 100 : 0} /><Progress label="Từ mới" value={summary.vocabulary ? (summary.vocabulary - summary.known - summary.difficult) / summary.vocabulary * 100 : 0} /></div></article>;
}

function DeadlinePanel({ deadlines, role }: { deadlines: Deadline[]; role?: string }) {
  const navigate = useNavigate();
  const emptyState = getDeadlineEmpty(role);

  if (!deadlines.length) {
    return <EmptyState title={emptyState.title} description={emptyState.description} primaryAction={{ label: emptyState.label, onClick: () => navigate(emptyState.to) }} />;
  }

  return <div className="compact-list">{deadlines.map((item) => <div key={item.id}><strong>{item.title}</strong><span>{new Date(item.due_date).toLocaleDateString('vi-VN')}</span></div>)}</div>;
}

function DeadlinePanelCard({ deadlines, role }: { deadlines: Deadline[]; role?: string }) {
  return <article className="panel"><div className="panel-heading"><div><h3>Việc nên xử lý tiếp theo</h3><p>{getDeadlineDescription(role)}</p></div></div><DeadlinePanel deadlines={deadlines} role={role} /></article>;
}

function DashboardPanels({ summary, deadlines, role }: { summary: DashboardSummary; deadlines: Deadline[]; role?: string }) {
  return <section className="dashboard-grid"><VocabularyProgressPanel summary={summary} /><DeadlinePanelCard deadlines={deadlines} role={role} /></section>;
}

function DashboardContent({ summary, deadlines, role, displayName }: { summary: DashboardSummary; deadlines: Deadline[]; role?: string; displayName?: string }) {
  return <div className="page-wrap"><div className="page-heading"><div><h1>Xin chào, {displayName}</h1><p>{getPageDescription(role)}</p></div></div><DashboardHero role={role} /><DashboardStats summary={summary} /><DashboardPanels summary={summary} deadlines={deadlines} role={role} /></div>;
}

export function DashboardPage() {
  const { user, profile } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setError('');
    try {
      const [summaryData, deadlineData] = await Promise.all([getDashboardSummary(user.id, profile?.role), listDeadlines(user.id)]);
      setSummary(summaryData);
      setDeadlines(deadlineData.filter((item) => !item.completed).slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dashboard.');
    }
  };

  useEffect(() => { void load(); }, [user]);

  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!summary) return <LoadingState message="Đang tổng hợp dashboard học tập của bạn..." />;

  return <DashboardContent summary={summary} deadlines={deadlines} role={profile?.role} displayName={profile?.display_name} />;
}
