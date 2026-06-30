import { Sparkles } from 'lucide-react';
import type { StudyVocabularyItem, StudyVocabularySource } from '../../types';
import { ReviewModeTabs, type ReviewMode } from './ReviewModeTabs';
import { ReviewSourceSelector } from './ReviewSourceSelector';

const DURATION_OPTIONS = [10, 15, 30] as const;

interface ReviewSessionCardProps {
  selectedSource: Exclude<StudyVocabularySource, 'new'>;
  selectedDuration: (typeof DURATION_OPTIONS)[number];
  selectedMode: ReviewMode;
  availableWords: StudyVocabularyItem[];
  selectedWordIds: string[];
  loading: boolean;
  loadingWords: boolean;
  onSelectSource: (source: Exclude<StudyVocabularySource, 'new'>) => void;
  onSelectDuration: (duration: (typeof DURATION_OPTIONS)[number]) => void;
  onSelectMode: (mode: ReviewMode) => void;
  onToggleWord: (wordId: string) => void;
  onStart: () => void;
}

export function ReviewSessionCard({
  selectedSource,
  selectedDuration,
  selectedMode,
  availableWords,
  selectedWordIds,
  loading,
  loadingWords,
  onSelectSource,
  onSelectDuration,
  onSelectMode,
  onToggleWord,
  onStart,
}: ReviewSessionCardProps) {
  return <article className="panel review-setup-card">
    <div className="review-setup-header">
      <h2>Tạo phiên ôn tập</h2>
      <p>Chọn nguồn từ, thời lượng, cách bắt đầu và các từ bạn muốn đưa vào phiên học.</p>
    </div>

    <ReviewSourceSelector selectedSource={selectedSource} onSelect={onSelectSource} />

    <div className="review-setup-group">
      <h3>Thời lượng</h3>
      <div className="review-chip-row" role="group" aria-label="Chọn thời lượng ôn tập">
        {DURATION_OPTIONS.map((value) => <button key={value} type="button" className={selectedDuration === value ? 'active' : ''} onClick={() => onSelectDuration(value)}>{value} phút</button>)}
      </div>
    </div>

    <div className="review-setup-group">
      <h3>Bắt đầu bằng</h3>
      <ReviewModeTabs selectedMode={selectedMode} onSelect={onSelectMode} disabled={loading} />
    </div>

    <div className="review-setup-group">
      <div className="review-word-picker-header">
        <h3>Chọn từ</h3>
        <span>{selectedWordIds.length} đã chọn</span>
      </div>
      {loadingWords ? <div className="review-word-picker-empty">Đang tải danh sách từ...</div> : !availableWords.length ? <div className="review-word-picker-empty">Chưa có từ phù hợp trong nguồn này.</div> : <div className="review-word-picker-list" role="list" aria-label="Chọn từ cho phiên ôn tập">
        {availableWords.map((item) => {
          const isSelected = selectedWordIds.includes(item.id);
          return <button
            key={item.id}
            type="button"
            role="listitem"
            className={isSelected ? 'selected' : ''}
            onClick={() => onToggleWord(item.id)}
          >
            <strong>{item.word}</strong>
            <span>{item.vietnameseMeaning || item.englishDefinition}</span>
          </button>;
        })}
      </div>}
    </div>

    <div className="review-setup-actions">
      <button className="button primary" disabled={loading || loadingWords || !selectedWordIds.length} onClick={onStart}>
        <Sparkles size={17} /> {loading ? 'Đang chuẩn bị phiên ôn tập...' : 'Bắt đầu ôn tập'}
      </button>
      <p>Bạn có thể chuyển giữa Flashcard và Quiz trong cùng phiên học.</p>
    </div>
  </article>;
}
