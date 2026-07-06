import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { listNotifications, markNotificationRead } from '../services/data';
import type { AppNotification } from '../types';

export function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      setItems(await listNotifications(user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được thông báo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    await load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Notifications</span><h1>Thông báo</h1><p>Cập nhật khi giáo viên giao từ và các nhắc nhở học tập.</p></div></div>
    {items.length ? <div className="panel compact-list">{items.map((item) => <div key={item.id}><strong><Bell size={16} /> {item.title}</strong><span>{item.message}</span><span>{new Date(item.created_at).toLocaleString('vi-VN')} · {item.read_at ? 'Đã đọc' : 'Chưa đọc'}</span>{!item.read_at && <button className="button secondary" onClick={() => void markRead(item.id)}>Đánh dấu đã đọc</button>}</div>)}</div> : <EmptyState title="Chưa có thông báo" description="Thông báo từ được giao sẽ xuất hiện ở đây." />}
  </div>;
}

// ponytail: legacy notification rows are normalized in data.ts; add a server-side migration later if you need historical rows rewritten in the database too.
