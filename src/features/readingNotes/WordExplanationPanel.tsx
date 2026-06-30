import type { UserRole } from '../../types';
import type { AnalyzeSelectedWordResult } from './readingNotes.types';

interface WordExplanationPanelProps {
  role: UserRole;
  selectedWord: string;
  loading: boolean;
  error: string;
  result: AnalyzeSelectedWordResult | null;
  saved: boolean;
  saveLoading: boolean;
  saveMessage: string;
  onSave: () => void;
}

function getSaveButtonLabel(role: UserRole): string {
  return role === 'teacher' ? 'Lưu vào kho từ' : 'Lưu vào thư viện';
}

export function WordExplanationPanel({ role, selectedWord, loading, error, result, saved, saveLoading, saveMessage, onSave }: WordExplanationPanelProps) {
  if (!selectedWord) {
    return <section className="panel reading-explanation-panel reading-explanation-empty">
      <strong>Chọn một từ trong đoạn văn để xem giải thích.</strong>
    </section>;
  }

  if (loading) {
    return <section className="panel reading-explanation-panel reading-explanation-empty">
      <div className="loader" />
      <strong>Đang giải thích từ trong ngữ cảnh...</strong>
    </section>;
  }

  if (error) {
    return <section className="panel reading-explanation-panel reading-explanation-empty">
      <strong>Chưa thể giải thích từ này. Vui lòng thử lại.</strong>
      <p>{error}</p>
    </section>;
  }

  if (!result) {
    return <section className="panel reading-explanation-panel reading-explanation-empty">
      <strong>Chọn một từ trong đoạn văn để xem giải thích.</strong>
    </section>;
  }

  return <section className="panel reading-explanation-panel">
    <div className="detail-title reading-explanation-title">
      <div>
        <h2>{result.word}</h2>
        <p>{result.partOfSpeech || 'Từ vựng theo ngữ cảnh'}</p>
      </div>
    </div>
    <div className="detail-block">
      <h4>Nghĩa trong ngữ cảnh</h4>
      <p>{result.meaningInContext}</p>
    </div>
    {result.vietnameseMeaning && <div className="detail-block">
      <h4>Nghĩa tiếng Việt</h4>
      <p>{result.vietnameseMeaning}</p>
    </div>}
    <div className="detail-block">
      <h4>Định nghĩa tiếng Anh</h4>
      <p>{result.englishDefinition}</p>
    </div>
    <div className="detail-block">
      <h4>Câu chứa từ</h4>
      <p>{result.sentence}</p>
    </div>
    <div className="detail-block">
      <h4>Giải thích</h4>
      <p>{result.explanation}</p>
    </div>
    <div className="detail-block">
      <h4>Cụm hay dùng</h4>
      {result.collocations.length ? <ul>{result.collocations.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Chưa có gợi ý thêm.</p>}
    </div>
    <div className="detail-block">
      <h4>Ví dụ</h4>
      {result.examples.length ? <ul>{result.examples.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Chưa có ví dụ.</p>}
    </div>
    <div className="detail-block">
      <h4>Từ liên quan trong đoạn</h4>
      {result.relatedWordsFromPassage.length ? <ul>{result.relatedWordsFromPassage.map((item) => <li key={`${item.word}:${item.reason}`}><strong>{item.word}</strong>: {item.reason}</li>)}</ul> : <p>Không có từ liên quan rõ ràng trong đoạn.</p>}
    </div>
    <div className="detail-block">
      <h4>Có nên lưu?</h4>
      <p>{result.shouldSave ? result.saveReason : `Không bắt buộc lưu. ${result.saveReason}`}</p>
      <p>Độ khó: <strong>{result.difficulty}</strong></p>
      {saveMessage && <div className="form-message standalone">{saveMessage}</div>}
      <div className="status-actions">
        <button className={saved ? 'button secondary' : 'button primary'} disabled={saved || saveLoading} onClick={onSave}>
          {saved ? 'Đã lưu' : saveLoading ? 'Đang lưu...' : getSaveButtonLabel(role)}
        </button>
      </div>
    </div>
  </section>;
}
