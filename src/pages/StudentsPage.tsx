import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Trash2, UserPlus } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { addTeacherStudentByEmail, listTeacherStudents, removeTeacherStudent } from '../services/data';
import type { TeacherStudent } from '../types';

export function StudentsPage() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<TeacherStudent[]>([]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const data = await listTeacherStudents(user.id);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách học viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setMessage(''); setError('');
    try {
      await addTeacherStudentByEmail(email);
      setEmail('');
      setMessage('Đã thêm học viên.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thêm được học viên.');
    }
  };

  const remove = async (id: string) => {
    await removeTeacherStudent(id);
    await load();
  };

  if (profile?.role !== 'teacher') return <Navigate to="/dashboard" replace />;
  if (loading) return <LoadingState />;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Teacher workspace</span><h1>Học viên</h1><p>Thêm học viên trực tiếp bằng email tài khoản student.</p></div></div>
    <form className="search-bar panel" onSubmit={submit}><UserPlus size={20} /><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email học viên..." /><button className="button primary">Thêm học viên</button></form>
    {message && <div className="form-message standalone">{message}</div>}
    {error && <ErrorState message={error} retry={() => void load()} />}
    {items.length ? <div className="panel table-wrap"><table><thead><tr><th>Học viên</th><th>Email</th><th>Ngày thêm</th><th></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.student_name}</td><td>{item.student_email}</td><td>{new Date(item.created_at).toLocaleDateString('vi-VN')}</td><td><button className="icon-button" onClick={() => void remove(item.id)} aria-label="Xóa học viên"><Trash2 size={17} /></button></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có học viên" description="Nhập email student để thêm vào danh sách học viên của bạn." />}
  </div>;
}
