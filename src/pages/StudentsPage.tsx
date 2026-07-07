import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, UserPlus } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { addTeacherStudentByEmail, listTeacherStudents, removeTeacherStudent } from '../services/data';
import type { TeacherStudent } from '../types';

function StudentsForm({ email, onChange, onSubmit }: { email: string; onChange: (value: string) => void; onSubmit: (event: FormEvent) => void }) {
  return <form className="panel students-form-card teacher-students-form" onSubmit={onSubmit}><div className="panel-heading teacher-students-panel-heading"><div><h3>Thêm học viên mới</h3><p>Nhập đúng email student để liên kết vào workspace.</p></div></div><div className="students-form-grid"><label><span className="students-form-label">Email học viên</span><input value={email} onChange={(event) => onChange(event.target.value)} placeholder="student@example.com" autoComplete="email" /></label><button className="button primary students-submit"><UserPlus size={17} /> Thêm học viên</button></div><p className="students-helper-text">Dùng đúng email đã đăng ký bằng vai trò student.</p></form>;
}

function StudentsTable({ items, onRemove }: { items: TeacherStudent[]; onRemove: (id: string) => void }) {
  return <div className="panel table-wrap teacher-students-table"><div className="panel-heading teacher-students-panel-heading"><div><h3>Danh sách học viên</h3><p>Xóa khỏi danh sách khi bạn không còn cần giao bài cho tài khoản đó nữa.</p></div><span className="role-pill">{items.length} tài khoản</span></div><table><thead><tr><th>Học viên</th><th>Email</th><th>Ngày thêm</th><th></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.student_name}</td><td>{item.student_email}</td><td>{new Date(item.created_at).toLocaleDateString('vi-VN')}</td><td><button className="icon-button" onClick={() => void onRemove(item.id)} aria-label="Xóa học viên"><Trash2 size={17} /></button></td></tr>)}</tbody></table></div>;
}

function StudentsContent({ items, email, message, error, onEmailChange, onSubmit, onRemove, onRetry, onGoAssign }: { items: TeacherStudent[]; email: string; message: string; error: string; onEmailChange: (value: string) => void; onSubmit: (event: FormEvent) => void; onRemove: (id: string) => void; onRetry: () => void; onGoAssign: () => void }) {
  return <div className="page-wrap teacher-students-page"><div className="page-heading teacher-students-heading"><div><span>Teacher workspace</span><h1>Học viên</h1><p>Thêm đúng student rồi chuyển thẳng sang giao từ.</p></div><button className="button primary" onClick={onGoAssign}>Giao từ ngay</button></div><StudentsForm email={email} onChange={onEmailChange} onSubmit={onSubmit} />{message && <div className="form-message standalone">{message}</div>}{error && <ErrorState message={error} retry={onRetry} />}{items.length ? <StudentsTable items={items} onRemove={onRemove} /> : <EmptyState title="Chưa có học viên" description="Thêm email student đầu tiên để bắt đầu quản lý và giao từ." primaryAction={{ label: 'Tải lại danh sách', onClick: onRetry, variant: 'secondary' }} />}</div>;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Không tải được danh sách học viên.';
}

function getSuccessMessage() {
  return 'Đã thêm học viên vào danh sách của bạn.';
}

function sortStudents(items: TeacherStudent[]) {
  return [...items].sort((left, right) => left.student_name.localeCompare(right.student_name, 'vi'));
}

export function StudentsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<TeacherStudent[]>([]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sortedItems = useMemo(() => sortStudents(items), [items]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await listTeacherStudents(user.id);
      setItems(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setMessage('');
    setError('');
    try {
      await addTeacherStudentByEmail(email);
      setEmail('');
      setMessage(getSuccessMessage());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thêm được học viên.');
    }
  };

  const remove = async (id: string) => {
    await removeTeacherStudent(id);
    await load();
  };

  if (loading) return <LoadingState message="Đang chuẩn bị danh sách học viên..." />;

  return <StudentsContent items={sortedItems} email={email} message={message} error={error} onEmailChange={setEmail} onSubmit={submit} onRemove={remove} onRetry={() => void load()} onGoAssign={() => navigate('/assign-words')} />;
}
