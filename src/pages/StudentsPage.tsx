import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LoadingState, EmptyState } from '../components/PageState';

interface StudentRow { course_title: string; student_name: string; student_email: string; joined_at: string; }

export function StudentsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('teacher_students').select('*').order('joined_at', { ascending: false });
      setItems((data ?? []) as StudentRow[]);
      setLoading(false);
    })();
  }, []);
  if (profile?.role !== 'teacher') return <Navigate to="/dashboard" replace />;
  if (loading) return <LoadingState />;
  return <div className="page-wrap"><div className="page-heading"><div><span>Teacher workspace</span><h1>Học viên</h1><p>Danh sách học viên đã tham gia các khóa học của bạn.</p></div></div>{items.length ? <div className="panel table-wrap"><table><thead><tr><th>Học viên</th><th>Email</th><th>Khóa học</th><th>Ngày tham gia</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.student_email}-${index}`}><td>{item.student_name}</td><td>{item.student_email}</td><td>{item.course_title}</td><td>{new Date(item.joined_at).toLocaleDateString('vi-VN')}</td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có học viên" description="Chia sẻ mã khóa học để student tham gia." />}</div>;
}
