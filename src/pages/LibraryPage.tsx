import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Search, Volume2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { addVocabulary, incrementVocabularySearch, listVocabulary, updateVocabularyStatus } from '../services/data';
import type { Vocabulary, VocabularyStatus } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';

export function LibraryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Vocabulary[]>([]);
  const [selected, setSelected] = useState<Vocabulary | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | VocabularyStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try { const data = await listVocabulary(user.id); setItems(data); if (!selected && data[0]) setSelected(data[0]); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không tải được từ vựng.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!user || !query.trim()) return;
    const existing = items.find((item) => item.word.toLowerCase() === query.trim().toLowerCase());
    if (existing) {
      await incrementVocabularySearch(existing.id, existing.lookup_count);
      setSelected({ ...existing, lookup_count: existing.lookup_count + 1 });
    } else {
      const created = await addVocabulary(user.id, query);
      setSelected(created);
    }
    setQuery(''); await load();
  };
  const filtered = useMemo(() => filter === 'all' ? items : items.filter((item) => item.status === filter), [items, filter]);
  const changeStatus = async (status: VocabularyStatus) => {
    if (!selected) return; await updateVocabularyStatus(selected.id, status); setSelected({ ...selected, status }); await load();
  };
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Vocabulary library</span><h1>Từ điển cá nhân</h1><p>Học viên tự nhập từ mới, lưu và phân loại theo mức độ ghi nhớ.</p></div></div>
    <form className="search-bar panel" onSubmit={submit}><Search size={20} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nhập từ, phrase hoặc collocation..." /><button className="button primary">Thêm từ</button></form>
    <div className="filter-row">{(['all','new','known','difficult'] as const).map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Tất cả' : value === 'new' ? 'Từ mới' : value === 'known' ? 'Đã thuộc' : 'Khó nhớ'}</button>)}</div>
    <section className="library-grid">
      <div className="panel"><div className="panel-heading"><div><h3>Thư viện của bạn</h3><p>{filtered.length} kết quả</p></div></div>{filtered.length ? <div className="word-list">{filtered.map((item) => <button key={item.id} className={selected?.id === item.id ? 'selected' : ''} onClick={() => setSelected(item)}><div><strong>{item.word}</strong><span>{item.phonetic || 'Chưa có phiên âm'} · {item.lookup_count} lượt tra</span></div><span className={`status ${item.status}`}>{item.status}</span></button>)}</div> : <EmptyState title="Chưa có từ phù hợp" description="Tra cứu một từ mới để thêm vào thư viện." />}</div>
      <div className="panel word-detail">{selected ? <><div className="detail-title"><div><h2>{selected.word}</h2><p>{selected.phonetic || '/phonetic/'}</p></div><button className="icon-button" aria-label="Phát âm"><Volume2 size={19} /></button></div><div className="detail-block"><h4>Nghĩa tiếng Việt</h4><p>{selected.vietnamese_meaning}</p></div><div className="detail-block"><h4>Định nghĩa</h4><p>{selected.english_definition}</p></div><div className="detail-block"><h4>Ví dụ</h4><p>{selected.example_sentence || 'Chưa có ví dụ.'}</p></div><div className="status-actions"><button className="button secondary" onClick={() => void changeStatus('difficult')}>Khó nhớ</button><button className="button primary" onClick={() => void changeStatus('known')}>Đã thuộc</button></div></> : <EmptyState title="Chọn một từ" description="Thông tin chi tiết sẽ hiển thị ở đây." />}</div>
    </section>
  </div>;
}
