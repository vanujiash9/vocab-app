import { useEffect, useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { listAssignmentsForStudent, updateAssignmentStatus } from '../services/data';
import type { VocabularyAssignment, VocabularyStatus } from '../types';

const STATUS_LABELS: Record<VocabularyStatus, string> = {
  new: 'Mới',
  learning: 'Đang học',
  known: 'Đã thuộc',
  difficult: 'Khó',
};

const FILTER_LABELS: Record<'all' | VocabularyStatus, string> = {
  all: 'Tất cả',
  new: 'Mới',
  learning: 'Đang học',
  known: 'Đã thuộc',
  difficult: 'Khó',
};

function formatAssignedDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN');
}

function getAssignmentMeta(item: VocabularyAssignment): string {
  return item.part_of_speech ? `${item.part_of_speech} · ${formatAssignedDate(item.assigned_at)}` : formatAssignedDate(item.assigned_at);
}

function getWordMeta(item: VocabularyAssignment): string {
  return `${item.phonetic || '/phonetic/'}${item.part_of_speech ? ` · ${item.part_of_speech}` : ''}`;
}

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

  const isEmpty = filtered.length === 0;

  return <div className="page-wrap assigned-words-page-compact">
    <div className="filter-row compact-filter-row assigned-words-toolbar">{(['all', 'new', 'learning', 'known', 'difficult'] as const).map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{FILTER_LABELS[value]}</button>)}</div>
    {isEmpty ? null : <div className="assigned-words-count">{filtered.length} từ đang chờ xử lý</div>}
    <section className="library-grid compact-library-grid">
      <div className="panel compact-panel"><div className="panel-heading"><div><h3>Danh sách từ</h3><p>{filtered.length} mục</p></div></div>{filtered.length ? <div className="word-list compact-word-list">{filtered.map((item) => <button key={item.id} className={selected?.id === item.id ? 'selected' : ''} onClick={() => setSelected(item)}><div><strong>{item.word}</strong><span>{getAssignmentMeta(item)}</span></div><span className={`status ${item.status}`}>{STATUS_LABELS[item.status]}</span></button>)}</div> : <EmptyState title="Chưa có từ được giao" description="Từ giáo viên giao sẽ hiện ở đây." />}</div>
      {!isEmpty && <div className="panel word-detail compact-panel compact-word-detail">{selected ? <><div className="detail-title compact-detail-title"><div><h2>{selected.word}</h2><p>{getWordMeta(selected)}</p></div><button className="icon-button compact-audio-button" onClick={playAudio} disabled={!selected.audio_url} aria-label="Nghe phát âm"><Volume2 size={18} /></button></div><div className="detail-block compact-detail-block"><h4>Định nghĩa</h4><p>{selected.english_definition}</p></div><div className="detail-block compact-detail-block"><h4>Nghĩa Việt</h4><p>{selected.vietnamese_meaning}</p></div><div className="detail-block compact-detail-block"><h4>Ví dụ</h4>{selected.examples.length ? <ul>{selected.examples.slice(0, 2).map((example) => <li key={example}>{example}</li>)}</ul> : <p>Chưa có ví dụ.</p>}</div>{selected.note && <div className="detail-block compact-detail-block"><h4>Ghi chú</h4><p>{selected.note}</p></div>}<div className="status-actions compact-status-actions">{(['new', 'learning', 'known', 'difficult'] as const).map((status) => <button key={status} className={selected.status === status ? 'button primary' : 'button secondary'} onClick={() => void changeStatus(status)}>{STATUS_LABELS[status]}</button>)}</div></> : <EmptyState title="Chọn một từ" description="Chi tiết từ sẽ hiện ở đây." />}</div>}
    </section>
  </div>;
}
