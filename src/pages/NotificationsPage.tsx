import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { listNotifications, markNotificationRead } from '../services/data';
import type { AppNotification } from '../types';

function formatNotificationTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationsPage() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isTeacher = profile?.role === 'teacher';
  const emptyDescription = isTeacher
    ? 'Thông báo về học viên, giao từ và các đầu việc giảng dạy sẽ xuất hiện ở đây.'
    : 'Thông báo giao từ sẽ xuất hiện ở đây.';
  const pageDescription = isTeacher
    ? 'Theo dõi cập nhật về học viên, giao từ và các đầu việc cần xử lý.'
    : 'Cập nhật khi giáo viên giao từ và các nhắc nhở học tập.';

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
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

  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap notifications-page-wrap">
    <div className="page-heading notifications-page-heading">
      <div>
        <span>{isTeacher ? 'Teacher notifications' : 'Notifications'}</span>
        <h1>Thông báo</h1>
        <p>{pageDescription}</p>
      </div>
    </div>

    {items.length ? <section className="panel notifications-panel">
      <div className="panel-heading notifications-panel-heading">
        <div>
          <h3>Hộp thư thông báo</h3>
          <p>{unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Tất cả thông báo đã được xem'}</p>
        </div>
      </div>

      <div className="notifications-list" role="list" aria-label="Danh sách thông báo">
        {items.map((item) => {
          const isUnread = !item.read_at;
          return <article key={item.id} className={`notifications-item ${isUnread ? 'unread' : 'read'}`} role="listitem">
            <div className="notifications-item-icon" aria-hidden="true">
              {isUnread ? <Bell size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <div className="notifications-item-body">
              <div className="notifications-item-head">
                <strong>{item.title}</strong>
                <span>{isUnread ? 'Chưa đọc' : 'Đã đọc'}</span>
              </div>
              <p>{item.message}</p>
              <div className="notifications-item-meta">
                <span>{formatNotificationTime(item.created_at)}</span>
              </div>
            </div>
            <div className="notifications-item-actions">
              {isUnread ? <button className="button secondary small" onClick={() => void markRead(item.id)}>Đánh dấu đã đọc</button> : null}
            </div>
          </article>;
        })}
      </div>
    </section> : <div className="panel notifications-empty-panel"><EmptyState title="Chưa có thông báo" description={emptyDescription} /></div>}
  </div>;
}

// ponytail: copy now matches the current role, while the inbox structure stays shared.
