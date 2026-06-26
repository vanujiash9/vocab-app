import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { listVocabulary, updateVocabularyStatus } from '../services/data';
import type { Vocabulary } from '../types';
import { EmptyState, LoadingState } from '../components/PageState';

export function FlashcardsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Vocabulary[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (user) listVocabulary(user.id).then(setItems).finally(() => setLoading(false)); }, [user]);
  const item = useMemo(() => items[index], [items, index]);
  if (loading) return <LoadingState />;
  if (!item) return <div className="page-wrap"><EmptyState title="Chưa có flashcard" description="Hãy lưu từ vựng trong trang Từ điển trước." /></div>;
  const next = () => { setIndex((current) => (current + 1) % items.length); setFlipped(false); };
  const mark = async (status: 'known' | 'difficult') => { await updateVocabularyStatus(item.id, status); next(); };
  return <div className="page-wrap"><div className="page-heading"><div><span>Review session</span><h1>Flashcard ôn tập</h1><p>Nhấn vào thẻ để lật mặt và tự đánh giá mức độ ghi nhớ.</p></div></div><section className="flash-layout"><button className={`flash-card ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}><div className="flash-front"><span>Từ {index + 1}/{items.length}</span><h2>{item.word}</h2><p>{item.phonetic || 'Nhấn để xem nghĩa'}</p></div><div className="flash-back"><span>Nghĩa</span><h3>{item.vietnamese_meaning}</h3><p>{item.example_sentence}</p></div></button><aside className="panel flash-side"><RotateCcw size={28} /><h3>Tự đánh giá</h3><p>Đánh dấu từ để hệ thống ưu tiên ôn tập phù hợp.</p><button className="button secondary full" onClick={() => void mark('difficult')}>Khó nhớ</button><button className="button primary full" onClick={() => void mark('known')}>Đã thuộc</button><button className="text-button" onClick={next}>Bỏ qua →</button></aside></section></div>;
}
