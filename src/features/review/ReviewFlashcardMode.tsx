import { Volume2 } from 'lucide-react';
import type { StudyVocabularyItem, VocabularyStatus } from '../../types';

interface ReviewFlashcardModeProps {
  item: StudyVocabularyItem;
  currentIndex: number;
  totalWords: number;
  flipped: boolean;
  loading: boolean;
  onToggleFlip: () => void;
  onMark: (status: VocabularyStatus) => void;
}

function playAudio(url: string | null) {
  if (!url) return;
  void new Audio(url).play();
}

export function ReviewFlashcardMode({
  item,
  currentIndex,
  totalWords,
  flipped,
  loading,
  onToggleFlip,
  onMark,
}: ReviewFlashcardModeProps) {
  return <section className="review-flashcard-shell">
    <button type="button" className={`flash-card review-flashcard-button ${flipped ? 'flipped' : ''}`} onClick={onToggleFlip} aria-label={flipped ? 'Lật về mặt trước' : 'Lật sang mặt sau'}>
      <div className="flash-front review-flashcard-face">
        <span>Từ {currentIndex + 1}/{totalWords}</span>
        <h2>{item.word}</h2>
        <p>{item.partOfSpeech ? `${item.partOfSpeech}${item.phonetic ? ` · ${item.phonetic}` : ''}` : item.phonetic || 'Nhấn vào thẻ để lật xem nghĩa và ví dụ.'}</p>
        {item.audioUrl && <button className="icon-button review-audio-button" type="button" onClick={(event) => {
          event.stopPropagation();
          playAudio(item.audioUrl);
        }} aria-label="Nghe phát âm"><Volume2 size={18} /></button>}
      </div>
      <div className="flash-back review-flashcard-face">
        <span>Nghĩa</span>
        <h3>{item.englishDefinition}</h3>
        {item.vietnameseMeaning && <p>{item.vietnameseMeaning}</p>}
        {item.examples[0] && <p>{item.examples[0]}</p>}
      </div>
    </button>
    <div className="review-study-actions">
      <button className="button secondary" onClick={onToggleFlip}>{flipped ? 'Ẩn mặt sau' : 'Lật thẻ'}</button>
      <button className="button secondary" disabled={loading} onClick={() => onMark('difficult')}>Cần ôn lại</button>
      <button className="button primary" disabled={loading} onClick={() => onMark('known')}>Đã nhớ</button>
    </div>
  </section>;
}
