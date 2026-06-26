import { useEffect, useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { listAssignmentsForStudent, updateAssignmentStatus } from '../services/data';
import type { VocabularyAssignment, VocabularyStatus } from '../types';

export function AssignedWordsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<VocabularyAssignment[]>([]);
  const [selected, setSelected] = useState<VocabularyAssignment | null>(null);
  const [filter, setFilter] = useState<'all' | VocabularyStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const data = await listAssignmentsForStudent(user.id);
      setItems(data);
      setSelected((current) => current ? data.find((item) => item.id === current.id) ?? null : data[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được từ được giao.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);

  const filtered = useMemo(() => filter === 'all' ? items : items.filter((item) => item.status === filter), [filter, items]);
  const changeStatus = async (status: VocabularyStatus) => {
    if (!selected) return;
    await updateAssignmentStatus(selected.id, status);
    await load();
  };
  const playAudio = () => {
    if (!selected?.audio_url) return;
    void new Audio(selected.audio_url).play();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Assigned vocabulary</span><h1>Từ được giao</h1><p>Danh sách từ giáo viên giao cho bạn.</p></div></div>
    <div className="filter-row">{(['all', 'new', 'learning', 'known', 'difficult'] as const).map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Tất cả' : value}</button>)}</div>
    <section className="library-grid">
      <div className="panel"><div className="panel-heading"><div><h3>Danh sách từ</h3><p>{filtered.length} kết quả</p></div></div>{filtered.length ? <div className="word-list">{filtered.map((item) => <button key={item.id} className={selected?.id === item.id ? 'selected' : ''} onClick={() => setSelected(item)}><div><strong>{item.word}</strong><span>{item.phonetic ?? 'Chưa có phiên âm'} · {new Date(item.assigned_at).toLocaleDateString('vi-VN')}</span></div><span className={`status ${item.status}`}>{item.status}</span></button>)}</div> : <EmptyState title="Chưa có từ được giao" description="Từ giáo viên giao sẽ xuất hiện ở đây." />}</div>
      <div className="panel word-detail">{selected ? <><div className="detail-title"><div><h2>{selected.word}</h2><p>{selected.phonetic || '/phonetic/'}{selected.part_of_speech ? ` · ${selected.part_of_speech}` : ''}</p></div><button className="icon-button" onClick={playAudio} disabled={!selected.audio_url} aria-label="Nghe phát âm"><Volume2 size={19} /></button></div><div className="detail-block"><h4>Định nghĩa</h4><p>{selected.english_definition}</p></div><div className="detail-block"><h4>Nghĩa tiếng Việt</h4><p>{selected.vietnamese_meaning}</p></div><div className="detail-block"><h4>Ví dụ</h4>{selected.examples.length ? <ul>{selected.examples.slice(0, 3).map((example) => <li key={example}>{example}</li>)}</ul> : <p>Chưa có ví dụ.</p>}</div>{selected.note && <div className="detail-block"><h4>Ghi chú giáo viên</h4><p>{selected.note}</p></div>}<div className="status-actions">{(['new', 'learning', 'known', 'difficult'] as const).map((status) => <button key={status} className={selected.status === status ? 'button primary' : 'button secondary'} onClick={() => void changeStatus(status)}>{status}</button>)}</div></> : <EmptyState title="Chọn một từ" description="Chi tiết từ sẽ hiển thị ở đây." />}</div>
    </section>
  </div>;
}
