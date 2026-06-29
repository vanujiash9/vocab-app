import { useMemo, useState, type ReactNode } from 'react';
import { BookOpen, Layers3, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
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

const SOURCE_SUMMARY_LABELS: Record<StudyVocabularySource, string> = {
  all: 'Tất cả từ',
  new: 'Từ mới',
  learning: 'Từ đang học',
  difficult: 'Cần xem lại',
  assigned: 'Từ được giao',
};

type FlashcardsStage = 'setup' | 'studying' | 'done';

function getFlashcardsPaceLabel(cardCount: number): string {
  return cardCount <= 5 ? 'Lật nhanh' : cardCount <= 10 ? 'Ôn nhanh' : 'Ôn sâu hơn';
}

function SetupFieldLabel({ icon, title }: { icon: ReactNode; title: string }) {
  return <span className="study-field-label"><i>{icon}</i>{title}</span>;
}

function getFlashcardsActionLabel(source: StudyVocabularySource): string {
  return source === 'difficult' ? 'Xem lại kỹ' : source === 'assigned' ? 'Theo lượt được giao' : 'Lật thẻ linh hoạt';
}

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
      <section className="panel quiz-panel study-setup-panel study-setup-card">
        <div className="study-setup-intro">
          <div>
            <span className="eyebrow">Review ready</span>
            <h2>Thiết lập phiên flashcard</h2>
            <p>Chọn nhóm từ phù hợp và số lượng vừa sức để bắt đầu một lượt ôn tập nhanh, gọn và dễ theo dõi.</p>
          </div>
          <div className="study-setup-note">
            <strong>Gợi ý</strong>
            <span>Bắt đầu với 5–10 từ nếu bạn muốn ôn nhanh trong vài phút.</span>
          </div>
        </div>
        <div className="study-setup-grid study-setup-grid-compact">
          <label className="manual-vocabulary-field study-setup-field">
            <SetupFieldLabel icon={<Layers3 size={14} />} title="Nhóm từ" />
            <small>Chọn danh sách muốn ôn tập trước.</small>
            <select value={source} onChange={(event) => setSource(event.target.value as StudyVocabularySource)}>
              {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="manual-vocabulary-field study-setup-field">
            <SetupFieldLabel icon={<BookOpen size={14} />} title="Số lượng" />
            <small>Số thẻ sẽ xuất hiện trong phiên này.</small>
            <select value={count} onChange={(event) => setCount(Number(event.target.value) as (typeof COUNT_OPTIONS)[number])}>
              {COUNT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <div className="study-quick-card" aria-label="Thông tin nhanh của flashcards">
          <div className="study-quick-chip"><strong>{count} từ</strong><span>{getFlashcardsPaceLabel(count)}</span></div>
          <div className="study-quick-chip"><strong>{SOURCE_SUMMARY_LABELS[source]}</strong><span>Nhóm từ đang chọn</span></div>
          <div className="study-quick-chip"><strong>{getFlashcardsActionLabel(source)}</strong><span>Lật thẻ và tự đánh giá</span></div>
        </div>
        <div className="study-setup-footer">
          {error ? <div className="form-message standalone">{error}</div> : <div className="study-setup-hint">Bạn có thể đổi nhóm từ bất cứ lúc nào sau khi hoàn thành một phiên.</div>}
          <div className="study-setup-actions">
            <button className="button primary" onClick={() => void start()}>Bắt đầu học</button>
          </div>
        </div>
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
