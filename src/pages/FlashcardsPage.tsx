import { useMemo, useState } from 'react';
import { RotateCcw, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listStudyVocabulary, updateVocabularyLearningStatus } from '../services/data';
import type { StudyVocabularyItem, StudyVocabularySource, VocabularyStatus } from '../types';
import { EmptyState, LoadingState } from '../components/PageState';

const SOURCE_OPTIONS: Array<{ value: StudyVocabularySource; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'new', label: 'Từ mới' },
  { value: 'learning', label: 'Đang học' },
  { value: 'difficult', label: 'Cần xem lại' },
  { value: 'assigned', label: 'Từ được giao' },
];

const COUNT_OPTIONS = [5, 10, 20] as const;

type FlashcardsStage = 'setup' | 'studying' | 'done';

function playAudio(url: string | null) {
  if (!url) return;
  void new Audio(url).play();
}

function buildEmptyDescription(source: StudyVocabularySource): string {
  return source === 'assigned'
    ? 'Bạn chưa có từ được giáo viên giao trong nhóm này.'
    : 'Chưa có từ phù hợp để bắt đầu phiên học.';
}

export function FlashcardsPage() {
  const { user } = useAuth();
  const [source, setSource] = useState<StudyVocabularySource>('all');
  const [count, setCount] = useState<(typeof COUNT_OPTIONS)[number]>(10);
  const [items, setItems] = useState<StudyVocabularyItem[]>([]);
  const [stage, setStage] = useState<FlashcardsStage>('setup');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const item = useMemo(() => items[index] ?? null, [index, items]);

  const start = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const nextItems = await listStudyVocabulary({ userId: user.id, source, limit: count });
      setItems(nextItems);
      setIndex(0);
      setFlipped(false);
      setStage(nextItems.length ? 'studying' : 'done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách học.');
      setItems([]);
      setStage('setup');
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStage('setup');
    setItems([]);
    setIndex(0);
    setFlipped(false);
    setError('');
  };

  const mark = async (status: VocabularyStatus) => {
    if (!item) return;
    setLoading(true);
    setError('');
    try {
      await updateVocabularyLearningStatus(item, status);
      const isLast = index === items.length - 1;
      if (isLast) {
        setStage('done');
        setFlipped(false);
        return;
      }
      setIndex((current) => current + 1);
      setFlipped(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được trạng thái học.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <LoadingState />;
  if (loading && stage === 'setup') return <LoadingState />;

  if (stage === 'setup') {
    return <div className="page-wrap">
      <div className="page-heading"><div><span>Review session</span><h1>Flashcard ôn tập</h1><p>Chọn nhóm từ và bắt đầu một phiên học gọn nhẹ.</p></div></div>
      <section className="panel quiz-panel study-setup-panel">
        <div className="study-setup-grid">
          <label className="manual-vocabulary-field">
            <span>Nhóm từ</span>
            <select value={source} onChange={(event) => setSource(event.target.value as StudyVocabularySource)}>
              {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="manual-vocabulary-field">
            <span>Số lượng</span>
            <select value={count} onChange={(event) => setCount(Number(event.target.value) as (typeof COUNT_OPTIONS)[number])}>
              {COUNT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        {error && <div className="form-message standalone">{error}</div>}
        <button className="button primary" onClick={() => void start()}>Bắt đầu học</button>
      </section>
    </div>;
  }

  if (stage === 'done' && !items.length) {
    return <div className="page-wrap">
      <div className="page-heading"><div><span>Review session</span><h1>Flashcard ôn tập</h1><p>Chọn nhóm từ và bắt đầu một phiên học gọn nhẹ.</p></div></div>
      <EmptyState title="Chưa có flashcard" description={buildEmptyDescription(source)} />
      <div className="status-actions"><button className="button secondary" onClick={restart}>Chọn lại</button></div>
    </div>;
  }

  if (stage === 'done') {
    return <div className="page-wrap">
      <div className="page-heading"><div><span>Review session</span><h1>Flashcard ôn tập</h1><p>Bạn đã hoàn thành phiên học đơn giản này.</p></div></div>
      <section className="panel quiz-panel study-summary-panel">
        <strong>Bạn đã học xong {items.length} từ</strong>
        <p>Tiếp tục một phiên mới hoặc quay về thư viện để xem lại các từ đã lưu.</p>
        <div className="status-actions">
          <button className="button primary" onClick={restart}>Học lại</button>
          <Link className="button secondary" to="/library">Về thư viện</Link>
        </div>
      </section>
    </div>;
  }

  if (!item) return <LoadingState />;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Review session</span><h1>Flashcard ôn tập</h1><p>Học từng thẻ, đánh giá nhanh, rồi chuyển sang thẻ tiếp theo.</p></div></div>
    {error && <div className="form-message standalone">{error}</div>}
    <section className="flash-layout">
      <div className={`flash-card-shell ${flipped ? 'flipped' : ''}`}>
        <div className={`flash-card ${flipped ? 'flipped' : ''}`}>
          <div className="flash-front">
            <span>{index + 1}/{items.length}</span>
            <h2>{item.word}</h2>
            <p>{item.partOfSpeech ? `${item.partOfSpeech}${item.phonetic ? ` · ${item.phonetic}` : ''}` : item.phonetic || 'Nhấn lật thẻ để xem nghĩa'}</p>
            {item.audioUrl && <button className="icon-button" onClick={() => playAudio(item.audioUrl)} aria-label="Nghe phát âm"><Volume2 size={18} /></button>}
          </div>
          <div className="flash-back">
            <span>Nghĩa</span>
            <h3>{item.englishDefinition}</h3>
            {item.vietnameseMeaning && <p>{item.vietnameseMeaning}</p>}
            {item.examples[0] && <p>{item.examples[0]}</p>}
          </div>
        </div>
      </div>
      <aside className="panel flash-side">
        <RotateCcw size={28} />
        <h3>Tiến độ {index + 1}/{items.length}</h3>
        <p>Lật thẻ để xem nghĩa rồi tự đánh giá mức độ ghi nhớ của bạn.</p>
        <button className="button secondary full" onClick={() => setFlipped((current) => !current)}>{flipped ? 'Xem mặt trước' : 'Lật thẻ'}</button>
        <button className="button secondary full" disabled={loading} onClick={() => void mark('learning')}>Chưa nhớ</button>
        <button className="button secondary full" disabled={loading} onClick={() => void mark('difficult')}>Cần xem lại</button>
        <button className="button primary full" disabled={loading} onClick={() => void mark('known')}>Đã nhớ</button>
      </aside>
    </section>
  </div>;
}
