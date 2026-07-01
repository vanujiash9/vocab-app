import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, FileSpreadsheet, LibraryBig, TriangleAlert, Upload, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardSummary, listDeadlines, listTeacherStudents, listTeacherVocabulary } from '../services/data';
import type { DashboardSummary, Deadline, TeacherStudent, TeacherVocabularyItem } from '../types';
import { ErrorState, LoadingState } from '../components/PageState';
import { StudyMascot } from '../components/StudyMascot';

export function DashboardPage() {
  const { user, profile } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<TeacherStudent[]>([]);
  const [teacherVocabulary, setTeacherVocabulary] = useState<TeacherVocabularyItem[]>([]);
  const [error, setError] = useState('');

  const isTeacher = profile?.role === 'teacher';

  const load = async () => {
    if (!user) return;
    setError('');
    try {
      if (isTeacher) {
        const [studentsData, vocabularyData] = await Promise.all([
          listTeacherStudents(user.id),
          listTeacherVocabulary(user.id),
        ]);
        setTeacherStudents(studentsData);
        setTeacherVocabulary(vocabularyData);
        setSummary(null);
        setDeadlines([]);
        return;
      }

      const [summaryData, deadlineData] = await Promise.all([getDashboardSummary(user.id), listDeadlines(user.id)]);
      setSummary(summaryData);
      setDeadlines(deadlineData.filter((item) => !item.completed).slice(0, 4));
      setTeacherStudents([]);
      setTeacherVocabulary([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dashboard.');
    }
  };

  useEffect(() => { void load(); }, [user, isTeacher]);
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!isTeacher && !summary) return <LoadingState />;
  if (isTeacher && !profile) return <LoadingState />;

  if (isTeacher) {
    const teacherStats = [
      ['Học viên', teacherStudents.length, Users],
      ['Kho từ', teacherVocabulary.length, LibraryBig],
      ['Cần giao', teacherVocabulary.filter((item) => !item.difficulty).length, Upload],
      ['Import sẵn sàng', 1, FileSpreadsheet],
    ] as const;

    const recentStudents = teacherStudents.slice(0, 4);
    const recentWords = teacherVocabulary.slice(0, 5);
    const needsReviewWords = teacherVocabulary.filter((item) => item.difficulty === 'hard' || item.difficulty === 'medium').slice(0, 5);

    return <div className="page-wrap teacher-dashboard-wrap">
      <div className="page-heading teacher-dashboard-heading">
        <div>
          <span>Teacher workspace</span>
          <h1>Bảng điều khiển giảng dạy</h1>
          <p>Quản lý học viên, kho từ và các đầu việc giao từ trong một nơi.</p>
        </div>
        <div className="teacher-dashboard-header-actions">
          <Link className="button primary" to="/students"><Users size={16} /> Thêm học viên</Link>
          <Link className="button secondary" to="/assign-words"><Upload size={16} /> Giao từ</Link>
          <Link className="button secondary" to="/library"><LibraryBig size={16} /> Mở kho từ</Link>
          <Link className="button secondary" to="/import-excel"><FileSpreadsheet size={16} /> Import Excel</Link>
        </div>
      </div>

      <section className="stats-grid teacher-stats-grid">{teacherStats.map(([label, value, Icon]) => <article className="stat-card" key={label}><div className="stat-icon"><Icon size={20} /></div><strong>{value}</strong><span>{label}</span></article>)}</section>

      <section className="dashboard-grid teacher-dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>Học viên gần đây</h3>
              <p>{teacherStudents.length ? `${teacherStudents.length} học viên đang theo dõi` : 'Chưa có học viên nào được thêm'}</p>
            </div>
          </div>
          {recentStudents.length ? <div className="compact-list">
            {recentStudents.map((student) => <div key={student.id}><strong>{student.student_name}</strong><span>{student.student_email}</span></div>)}
          </div> : <p className="muted">Chưa có học viên nào.</p>}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>Đầu việc hôm nay</h3>
              <p>Theo dõi nhanh các bước cần làm trong teacher workflow.</p>
            </div>
          </div>
          <div className="compact-list teacher-task-list">
            <div><strong>Rà kho từ</strong><span>{teacherVocabulary.length ? `${teacherVocabulary.length} từ trong kho` : 'Chưa có từ nào'}</span></div>
            <div><strong>Chuẩn bị giao từ</strong><span>{teacherVocabulary.filter((item) => !item.difficulty).length} từ chưa gắn độ khó</span></div>
            <div><strong>Mở danh sách học viên</strong><span>{teacherStudents.length ? 'Có thể bắt đầu giao từ' : 'Thêm học viên trước'}</span></div>
          </div>
        </article>

        <article className="panel teacher-dashboard-panel-wide">
          <div className="panel-heading">
            <div>
              <h3>Kho từ giáo viên</h3>
              <p>{teacherVocabulary.length ? `${teacherVocabulary.length} từ gần đây để tiếp tục biên soạn và giao cho học viên` : 'Kho từ giáo viên chưa có dữ liệu'}</p>
            </div>
            <Link className="button secondary" to="/library">Xem tất cả</Link>
          </div>
          {recentWords.length ? <div className="compact-list">
            {recentWords.map((word) => <div key={word.id}><strong>{word.word}</strong><span>{word.difficulty ?? 'Chưa đặt độ khó'}</span></div>)}
          </div> : <p className="muted">Chưa có từ nào trong kho giáo viên.</p>}
        </article>

        <article className="panel teacher-dashboard-panel-wide">
          <div className="panel-heading">
            <div>
              <h3>Từ cần ưu tiên xử lý</h3>
              <p>Các từ đã gắn độ khó để thuận tiện giao và rà soát lại.</p>
            </div>
            <Link className="button secondary" to="/assign-words">Mở giao từ</Link>
          </div>
          {needsReviewWords.length ? <div className="compact-list">
            {needsReviewWords.map((word) => <div key={word.id}><strong>{word.word}</strong><span>{word.difficulty ?? 'Chưa đặt độ khó'}</span></div>)}
          </div> : <p className="muted">Chưa có từ nào cần ưu tiên xử lý.</p>}
        </article>
      </section>
    </div>;
  }

  const studentSummary = summary!;
  const stats = [
    ['Từ vựng', studentSummary.vocabulary, LibraryBig], ['Đã thuộc', studentSummary.known, CheckCircle2],
    ['Khó nhớ', studentSummary.difficult, TriangleAlert], ['Deadline mở', studentSummary.openDeadlines, CalendarClock],
  ] as const;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Profile dashboard</span><h1>Xin chào, {profile?.display_name}</h1><p>Theo dõi từ vựng, quiz, flashcard và các mốc học tập cá nhân.</p></div></div>
    <section className="hero-card">
      <div className="hero-copy"><span className="eyebrow">Vocabulary workspace</span><h2>Học từ vựng thông minh cùng trợ lý dễ thương.</h2><p>Nhập từ mới, ôn flashcard, làm quiz và duy trì nhịp học mỗi ngày.</p></div>
      <StudyMascot message="Hôm nay mình học từ nào?" expression="happy" />
    </section>
    <section className="stats-grid">{stats.map(([label, value, Icon]) => <article className="stat-card" key={label}><div className="stat-icon"><Icon size={20} /></div><strong>{value}</strong><span>{label}</span></article>)}</section>
    <section className="dashboard-grid">
      <article className="panel"><div className="panel-heading"><div><h3>Tiến độ từ vựng</h3><p>Phân loại từ đã lưu trong thư viện cá nhân.</p></div></div><div className="progress-stack"><Progress label="Đã thuộc" value={studentSummary.vocabulary ? studentSummary.known / studentSummary.vocabulary * 100 : 0} /><Progress label="Khó nhớ" value={studentSummary.vocabulary ? studentSummary.difficult / studentSummary.vocabulary * 100 : 0} /><Progress label="Từ mới" value={studentSummary.vocabulary ? (studentSummary.vocabulary - studentSummary.known - studentSummary.difficult) / studentSummary.vocabulary * 100 : 0} /></div></article>
      <article className="panel"><div className="panel-heading"><div><h3>Deadline sắp tới</h3><p>Các mục tiêu chưa hoàn thành.</p></div></div>{deadlines.length ? <div className="compact-list">{deadlines.map((item) => <div key={item.id}><strong>{item.title}</strong><span>{new Date(item.due_date).toLocaleDateString('vi-VN')}</span></div>)}</div> : <p className="muted">Chưa có deadline nào.</p>}</article>
    </section>
  </div>;
}

function Progress({ label, value }: { label: string; value: number }) {
  return <div className="progress-row"><div><span>{label}</span><b>{Math.round(value)}%</b></div><div className="progress-track"><i style={{ width: `${Math.min(100, value)}%` }} /></div></div>;
}

// ponytail: teacher uses a role-specific workspace layout, while student keeps the original learning dashboard.
