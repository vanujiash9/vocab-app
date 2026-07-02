import { useEffect, useState, type FormEvent } from 'react';
import { CalendarPlus, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { completeDeadline, createDeadline, listDeadlines } from '../services/deadlines';
import type { Deadline } from '../types';
import { EmptyState, LoadingState } from '../components/PageState';

export function DeadlinesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Deadline[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => { if (!user) return; setItems(await listDeadlines(user.id)); setLoading(false); };
  useEffect(() => { void load(); }, [user]);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!user) return; await createDeadline(user.id, title, date); setTitle(''); setDate(''); await load(); };
  if (loading) return <LoadingState />;
  return <div className="page-wrap"><div className="page-heading"><div><span>Study planner</span><h1>Deadline học tập</h1><p>Quản lý mục tiêu học, bài kiểm tra và kế hoạch cá nhân.</p></div></div><form className="inline-form panel" onSubmit={submit}><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên mục tiêu" required /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /><button className="button primary"><CalendarPlus size={18} /> Thêm deadline</button></form>{items.length ? <div className="deadline-grid">{items.map((item) => <article className={`deadline-card ${item.completed ? 'done' : ''}`} key={item.id}><div><span>{new Date(item.due_date).toLocaleDateString('vi-VN')}</span><h3>{item.title}</h3><p>{item.completed ? 'Đã hoàn thành' : 'Đang mở'}</p></div>{!item.completed && <button className="button secondary" onClick={async () => { await completeDeadline(item.id); await load(); }}><Check size={17} /> Hoàn thành</button>}</article>)}</div> : <EmptyState title="Chưa có deadline" description="Thêm một mục tiêu để chủ động theo dõi tiến độ." />}</div>;
}
