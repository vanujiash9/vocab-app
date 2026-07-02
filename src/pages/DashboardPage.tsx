import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, LibraryBig, TriangleAlert, Upload, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { listDeadlines } from '../services/deadlines';
import { getDashboardSummary, listTeacherAssignmentSummaries, listTeacherStudents, listTeacherVocabulary } from '../services/dashboard';
import type { DashboardSummary, Deadline, MascotVariant, TeacherAssignmentSummary, TeacherStudent } from '../types';
import { ErrorState, LoadingState } from '../components/PageState';
import { StudyMascot } from '../components/study-mascot/StudyMascot';

interface TeacherChartDatum {
  key: string;
  label: string;
  value: number;
  detail: string;
  color: string;
}

function TeacherChart({ items }: { items: TeacherChartDatum[] }) {
  const [activeKey, setActiveKey] = useState(items[0]?.key ?? '');
  const activeItem = items.find((item) => item.key === activeKey) ?? items[0] ?? null;

  return <div className="teacher-chart-shell">
    <div className="teacher-chart-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={items} barCategoryGap={18}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6edf6" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#607590', fontSize: 12, fontWeight: 600 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#8b93a1', fontSize: 12 }} />
          <Tooltip cursor={{ fill: 'rgba(24,95,165,0.06)' }} formatter={(value) => [value ?? 0, 'Giá trị']} />
          <Bar dataKey="value" radius={[10, 10, 0, 0]} onClick={(entry) => setActiveKey(String(entry?.key ?? ''))}>
            {items.map((item) => <Cell key={item.key} fill={item.key === activeKey ? item.color : `${item.color}99`} cursor="pointer" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    {activeItem ? <div className="teacher-chart-detail"><strong>{activeItem.label}</strong><p>{activeItem.detail}</p></div> : null}
  </div>;
}

function getStudentDate(student: TeacherStudent): string {
  return new Date(student.created_at).toLocaleDateString('vi-VN');
}

function getAssignmentDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN');
}

function getAssignmentStatusLabel(status: TeacherAssignmentSummary['status']): string {
  return status === 'known' ? 'Hoàn thành' : status === 'learning' ? 'Đang học' : status === 'difficult' ? 'Cần hỗ trợ' : 'Mới giao';
}

function byNewest<T extends { created_at?: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime());
}

function TeacherAssignmentTable({ assignments }: { assignments: TeacherAssignmentSummary[] }) {
  return <div className="table-wrap teacher-dashboard-table-wrap">
    <table>
      <thead>
        <tr>
          <th>Ngày giao</th>
          <th>Học viên</th>
          <th>Số từ</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {assignments.map((item) => <tr key={`${item.student_id}:${item.assigned_at}`}>
          <td>{getAssignmentDate(item.assigned_at)}</td>
          <td>{item.student_name}</td>
          <td>{item.word_count}</td>
          <td>{getAssignmentStatusLabel(item.status)}</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

function Progress({ label, value }: { label: string; value: number }) {
  return <div className="progress-row"><div><span>{label}</span><b>{Math.round(value)}%</b></div><div className="progress-track"><i style={{ width: `${Math.min(100, value)}%` }} /></div></div>;
}

function StudentDashboard({ summary, deadlines, profileName, mascotVariant }: { summary: DashboardSummary; deadlines: Deadline[]; profileName?: string; mascotVariant: MascotVariant }) {
  const stats = [
    ['Từ vựng', summary.vocabulary, LibraryBig], ['Đã thuộc', summary.known, CheckCircle2],
    ['Khó nhớ', summary.difficult, TriangleAlert], ['Deadline mở', summary.openDeadlines, CalendarClock],
  ] as const;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Profile dashboard</span><h1>Xin chào, {profileName}</h1><p>Theo dõi từ vựng, quiz, flashcard và các mốc học tập cá nhân.</p></div></div>
    <section className="hero-card">
      <div className="hero-copy"><span className="eyebrow">Vocabulary workspace</span><h2>Học từ vựng thông minh cùng trợ lý dễ thương.</h2><p>Nhập từ mới, ôn flashcard, làm quiz và duy trì nhịp học mỗi ngày.</p></div>
      <StudyMascot variant={mascotVariant} message="Hôm nay mình học từ nào?" />
    </section>
    <section className="stats-grid">{stats.map(([label, value, Icon]) => <article className="stat-card" key={label}><div className="stat-icon"><Icon size={20} /></div><strong>{value}</strong><span>{label}</span></article>)}</section>
    <section className="dashboard-grid">
      <article className="panel"><div className="panel-heading"><div><h3>Tiến độ từ vựng</h3><p>Phân loại từ đã lưu trong thư viện cá nhân.</p></div></div><div className="progress-stack"><Progress label="Đã thuộc" value={summary.vocabulary ? summary.known / summary.vocabulary * 100 : 0} /><Progress label="Khó nhớ" value={summary.vocabulary ? summary.difficult / summary.vocabulary * 100 : 0} /><Progress label="Từ mới" value={summary.vocabulary ? (summary.vocabulary - summary.known - summary.difficult) / summary.vocabulary * 100 : 0} /></div></article>
      <article className="panel"><div className="panel-heading"><div><h3>Deadline sắp tới</h3><p>Các mục tiêu chưa hoàn thành.</p></div></div>{deadlines.length ? <div className="compact-list">{deadlines.map((item) => <div key={item.id}><strong>{item.title}</strong><span>{new Date(item.due_date).toLocaleDateString('vi-VN')}</span></div>)}</div> : <p className="muted">Chưa có deadline nào.</p>}</article>
    </section>
  </div>;
}

export function DashboardPage() {
  const { user, profile } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<TeacherStudent[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignmentSummary[]>([]);
  const [teacherVocabularyCount, setTeacherVocabularyCount] = useState(0);
  const [error, setError] = useState('');

  const isTeacher = profile?.role === 'teacher';

  const load = async () => {
    if (!user) return;
    setError('');
    try {
      if (isTeacher) {
        const [studentsData, vocabularyData, assignmentData] = await Promise.all([
          listTeacherStudents(user.id),
          listTeacherVocabulary(user.id),
          listTeacherAssignmentSummaries(user.id),
        ]);
        setTeacherStudents(studentsData);
        setTeacherVocabularyCount(vocabularyData.length);
        setTeacherAssignments(assignmentData);
        setSummary(null);
        setDeadlines([]);
        return;
      }

      const [summaryData, deadlineData] = await Promise.all([
        getDashboardSummary(user.id),
        listDeadlines(user.id),
      ]);
      setSummary(summaryData);
      setDeadlines(deadlineData.filter((item) => !item.completed).slice(0, 4));
      setTeacherStudents([]);
      setTeacherAssignments([]);
      setTeacherVocabularyCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dashboard.');
    }
  };

  useEffect(() => { void load(); }, [user, isTeacher]);
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!isTeacher && !summary) return <LoadingState />;
  if (isTeacher && !profile) return <LoadingState />;

  if (isTeacher) {
    const studentCount = teacherStudents.length;
    const assignedCount = teacherAssignments.reduce((sum, item) => sum + item.word_count, 0);
    const incompleteCount = teacherAssignments.filter((item) => item.status !== 'known').reduce((sum, item) => sum + item.word_count, 0);
    const chartData: TeacherChartDatum[] = [
      {
        key: 'students',
        label: 'Học viên',
        value: studentCount,
        detail: studentCount ? `${studentCount} học viên hiện đang nằm trong lớp.` : 'Chưa có học viên nào trong lớp.',
        color: '#2f6df5',
      },
      {
        key: 'store',
        label: 'Kho từ',
        value: teacherVocabularyCount,
        detail: teacherVocabularyCount ? `${teacherVocabularyCount} từ đang nằm trong kho giáo viên.` : 'Kho từ hiện chưa có dữ liệu.',
        color: '#1dbf73',
      },
      {
        key: 'assigned',
        label: 'Đã giao',
        value: assignedCount,
        detail: assignedCount ? `${assignedCount} từ đã được giao ở các lượt gần đây.` : 'Chưa có lượt giao từ nào gần đây.',
        color: '#ff9b3d',
      },
    ];

    return <div className="page-wrap teacher-dashboard-wrap teacher-dashboard-fixed teacher-dashboard-management">
      <div className="page-heading teacher-dashboard-heading">
        <div>
          <span>Class overview</span>
          <h1>Tổng quan lớp học</h1>
        </div>
      </div>

      <section className="stats-grid teacher-stats-grid teacher-stats-grid-compact">
        {([
          ['Học viên', studentCount, Users],
          ['Từ trong kho', teacherVocabularyCount, LibraryBig],
          ['Từ đã giao', assignedCount, Upload],
          ['Chưa hoàn thành', incompleteCount, TriangleAlert],
        ] as const).map(([label, value, Icon]) => <article className="stat-card" key={label}><div className="stat-icon"><Icon size={20} /></div><strong>{value}</strong><span>{label}</span></article>)}
      </section>

      <section className="teacher-dashboard-workspace-grid teacher-dashboard-workspace-grid-short">
        <article className="panel teacher-dashboard-panel-scroll">
          <div className="panel-heading">
            <div>
              <h3>Tổng quan lớp</h3>
              <p>Nhấn vào cột để xem thông tin nhanh.</p>
            </div>
          </div>
          <TeacherChart items={chartData} />
        </article>

        <article className="panel teacher-dashboard-panel-scroll teacher-dashboard-panel-wide-short">
          <div className="panel-heading">
            <div>
              <h3>Bài giao gần đây</h3>
              <p>{teacherAssignments.length ? 'Hiển thị gọn 5 dòng đầu, các lượt còn lại cuộn trong bảng.' : 'Chưa có bài giao gần đây.'}</p>
            </div>
          </div>
          {teacherAssignments.length ? <TeacherAssignmentTable assignments={teacherAssignments} /> : <p className="muted">Chưa có bài giao nào.</p>}
        </article>
      </section>
    </div>;
  }

  return <StudentDashboard summary={summary!} deadlines={deadlines} profileName={profile?.display_name} mascotVariant={profile?.mascot_variant ?? 'dog'} />;
}

// ponytail: teacher dashboard stays honest about available data; a real per-session learned-word metric still needs backend history.
