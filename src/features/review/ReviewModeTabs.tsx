export type ReviewMode = 'flashcard' | 'quiz';

interface ReviewModeTabsProps {
  selectedMode: ReviewMode;
  onSelect: (mode: ReviewMode) => void;
  disabled?: boolean;
}

export function ReviewModeTabs({ selectedMode, onSelect, disabled = false }: ReviewModeTabsProps) {
  return <div className="review-mode-tabs" role="tablist" aria-label="Chọn chế độ học">
    {(['flashcard', 'quiz'] as const).map((mode) => <button
      key={mode}
      type="button"
      role="tab"
      aria-selected={selectedMode === mode}
      className={selectedMode === mode ? 'active' : ''}
      disabled={disabled}
      onClick={() => onSelect(mode)}
    >
      {mode === 'flashcard' ? 'Flashcard' : 'Quiz'}
    </button>)}
  </div>;
}
