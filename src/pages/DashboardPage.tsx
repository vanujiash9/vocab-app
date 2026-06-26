import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, LibraryBig, TriangleAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardSummary, listDeadlines } from '../services/data';
import type { DashboardSummary, Deadline } from '../types';
import { ErrorState, LoadingState } from '../components/PageState';
import { StudyMascot } from '../components/StudyMascot';

export function DashboardPage() {
  const { user, profile } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setError('');
    try {
      const [summaryData, deadlineData] = await Promise.all([getDashboardSummary(user.id), listDeadlines(user.id)]);
      setSummary(summaryData);
      setDeadlines(deadlineData.filter((item) => !item.completed).slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dashboard.');
    }
  };

  useEffect(() => { void load(); }, [user]);
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!summary) return <LoadingState />;

  const stats = [
    ['Từ vựng', summary.vocabulary, LibraryBig], ['Đã thuộc', summary.known, CheckCircle2],
    ['Khó nhớ', summary.difficult, TriangleAlert], ['Deadline mở', summary.openDeadlines, CalendarClock],
  ] as const;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Profile dashboard</span><h1>Xin chào, {profile?.display_name}</h1><p>Theo dõi từ vựng, quiz, flashcard và các mốc học tập cá nhân.</p></div></div>
    <section className="hero-card">
      <div className="hero-copy"><span className="eyebrow">Vocabulary workspace</span><h2>Học từ vựng thông minh cùng trợ lý dễ thương.</h2><p>Nhập từ mới, ôn flashcard, làm quiz và duy trì nhịp học mỗi ngày.</p></div>
      <StudyMascot message="Hôm nay mình học từ nào?" expression="happy" />
    </section>
    <section className="stats-grid">{stats.map(([label, value, Icon]) => <article className="stat-card" key={label}><div className="stat-icon"><Icon size={20} /></div><strong>{value}</strong><span>{label}</span></article>)}</section>
    <section className="dashboard-grid">
      <article className="panel"><div className="panel-heading"><div><h3>Tiến độ từ vựng</h3><p>Phân loại từ đã lưu trong thư viện cá nhân.</p></div></div><div className="progress-stack"><Progress label="Đã thuộc" value={summary.vocabulary ? summary.known / summary.vocabulary * 100 : 0} /><Progress label="Khó nhớ" value={summary.vocabulary ? summary.difficult / summary.vocabulary * 100 : 0} /><Progress label="Từ mới" value={summary.vocabulary ? (summary.vocabulary - summary.known - summary.difficult) / summary.vocabulary * 100 : 0} /></div></article>
      <article className="panel"><div className="panel-heading"><div><h3>Deadline sắp tới</h3><p>Các mục tiêu chưa hoàn thành.</p></div></div>{deadlines.length ? <div className="compact-list">{deadlines.map((item) => <div key={item.id}><strong>{item.title}</strong><span>{new Date(item.due_date).toLocaleDateString('vi-VN')}</span></div>)}</div> : <p className="muted">Chưa có deadline nào.</p>}</article>
    </section>
  </div>;
}

function Progress({ label, value }: { label: string; value: number }) {
  return <div className="progress-row"><div><span>{label}</span><b>{Math.round(value)}%</b></div><div className="progress-track"><i style={{ width: `${Math.min(100, value)}%` }} /></div></div>;
}
