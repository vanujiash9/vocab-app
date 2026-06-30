import type { StudyVocabularySource } from '../../types';

const SOURCE_OPTIONS: Array<{ value: Exclude<StudyVocabularySource, 'new'>; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'learning', label: 'Từ đang học' },
  { value: 'difficult', label: 'Từ khó nhớ' },
  { value: 'assigned', label: 'Từ được giao' },
];

interface ReviewSourceSelectorProps {
  selectedSource: Exclude<StudyVocabularySource, 'new'>;
  onSelect: (source: Exclude<StudyVocabularySource, 'new'>) => void;
}

export function ReviewSourceSelector({ selectedSource, onSelect }: ReviewSourceSelectorProps) {
  return <div className="review-setup-group">
    <h3>Nguồn từ</h3>
    <div className="review-chip-row" role="group" aria-label="Chọn nguồn từ ôn tập">
      {SOURCE_OPTIONS.map((option) => <button key={option.value} type="button" className={selectedSource === option.value ? 'active' : ''} onClick={() => onSelect(option.value)}>{option.label}</button>)}
    </div>
  </div>;
}

// ponytail: source pills stay inline here; extract a shared pill group only if another screen needs the same markup.
