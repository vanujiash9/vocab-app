import type { ReadingToken } from './readingNotes.types';
import { isWordToken } from './readingNotes.utils';

interface ReadingTextViewerProps {
  tokens: ReadingToken[];
  selectedTokenIndex: number | null;
  savedTokenIndexes: number[];
  onSelectWord: (token: ReadingToken & { type: 'word'; normalized: string; index: number }) => void;
}

export function ReadingTextViewer({ tokens, selectedTokenIndex, savedTokenIndexes, onSelectWord }: ReadingTextViewerProps) {
  const savedTokenIndexSet = new Set(savedTokenIndexes);

  return <section className="panel reading-text-card">
    <div className="reading-card-header">
      <h3>Đoạn văn</h3>
      <p>Chọn một từ để xem nghĩa theo đúng ngữ cảnh.</p>
    </div>
    <div className="reading-text-viewer" aria-label="Reading passage">
      {tokens.map((token, tokenPosition) => {
        if (!isWordToken(token)) {
          return <span key={`text:${tokenPosition}`} className="reading-text-chunk">{token.text}</span>;
        }

        const className = [
          'reading-word-token',
          selectedTokenIndex === token.index ? 'selected' : '',
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
