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
  return <div className="ai-control-group">
    <h4>Nguồn từ</h4>
    <div className="filter-row ai-filter-row">
      {SOURCE_OPTIONS.map((option) => <button key={option.value} className={selectedSource === option.value ? 'active' : ''} onClick={() => onSelect(option.value)}>{option.label}</button>)}
    </div>
  </div>;
}
