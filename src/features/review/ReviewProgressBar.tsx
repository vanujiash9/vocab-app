import { type ReviewMode } from './ReviewModeTabs';

interface ReviewProgressBarProps {
  totalWords: number;
  selectedMode: ReviewMode;
  selectedDuration: 10 | 15 | 30;
  onCreateNewSession: () => void;
}

export function ReviewProgressBar({ totalWords, selectedMode, selectedDuration, onCreateNewSession }: ReviewProgressBarProps) {
  return <div className="review-progress-card">
    <strong>Phiên học: {totalWords} từ · {selectedMode === 'flashcard' ? 'Flashcard' : 'Quiz'} · còn khoảng {selectedDuration} phút</strong>
    <button type="button" className="review-text-button" onClick={onCreateNewSession}>Tạo phiên mới</button>
  </div>;
}
