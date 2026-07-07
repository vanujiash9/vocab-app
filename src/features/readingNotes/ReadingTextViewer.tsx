import type { ReadingToken } from './readingNotes.types';
import { isWordToken } from './readingNotes.utils';

interface ReadingTextViewerProps {
  tokens: ReadingToken[];
  selectedTokenIndexes: number[];
  savedTokenIndexes: number[];
  onSelectWord: (token: ReadingToken & { type: 'word'; normalized: string; index: number }) => void;
  onTranslatePassage: () => void;
}

export function ReadingTextViewer({ tokens, selectedTokenIndexes, savedTokenIndexes, onSelectWord, onTranslatePassage }: ReadingTextViewerProps) {
  const savedTokenIndexSet = new Set(savedTokenIndexes);
  const selectedTokenIndexSet = new Set(selectedTokenIndexes);

  return <section className="panel reading-text-card">
    <div className="reading-card-header">
      <div>
        <h3>Đoạn văn</h3>
        <p>Click một từ, rồi click từ khác để chọn cụm từ liên tiếp.</p>
      </div>
      <button className="button secondary reading-translate-passage-button" type="button" onClick={onTranslatePassage}>Dịch toàn đoạn</button>
    </div>
    <div className="reading-text-viewer" aria-label="Reading passage">
      {tokens.map((token, tokenPosition) => {
        if (!isWordToken(token)) {
          return <span key={`text:${tokenPosition}`} className="reading-text-chunk">{token.text}</span>;
        }

        const className = [
          'reading-word-token',
          selectedTokenIndexSet.has(token.index) ? 'selected' : '',
          savedTokenIndexSet.has(token.index) ? 'saved' : '',
        ].filter(Boolean).join(' ');

        return <button
          key={`word:${token.index}:${token.text}:${tokenPosition}`}
          type="button"
          className={className}
          onClick={() => onSelectWord(token)}
        >
          {token.text}
        </button>;
      })}
    </div>
  </section>;
}
