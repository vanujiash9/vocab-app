import type { UserRole } from '../../types';
import type { AnalyzeSelectedWordResult } from './readingNotes.types';

interface WordExplanationPanelProps {
  role: UserRole;
  selectedWord: string;
  loading: boolean;
  error: string;
  result: AnalyzeSelectedWordResult | null;
  saved: boolean;
  canSave: boolean;
  saveLoading: boolean;
  saveMessage: string;
  onSave: () => void;
}

function getSaveButtonLabel(role: UserRole): string {
  return role === 'teacher' ? 'Lưu vào kho từ' : 'Lưu vào thư viện';
}

export function WordExplanationPanel({ role, selectedWord, loading, error, result, saved, canSave, saveLoading, saveMessage, onSave }: WordExplanationPanelProps) {
  if (!selectedWord) {
    return <section className="panel reading-explanation-panel reading-explanation-empty">
      <span>AI context</span>
      <strong>Chọn từ, cụm từ hoặc dịch toàn đoạn</strong>
      <p>Nghĩa theo ngữ cảnh, nghĩa tiếng Việt, ví dụ và gợi ý lưu sẽ xuất hiện tại đây.</p>
    </section>;
  }

  if (loading) {
    return <section className="panel reading-explanation-panel reading-explanation-empty">
      <div className="loader" />
      <strong>Đang giải thích phần được chọn...</strong>
    </section>;
  }

  if (error) {
    return <section className="panel reading-explanation-panel reading-explanation-empty">
      <strong>Chưa thể giải thích phần này. Vui lòng thử lại.</strong>
      <p>{error}</p>
    </section>;
  }

  if (!result) {
    return <section className="panel reading-explanation-panel reading-explanation-empty">
      <span>AI context</span>
      <strong>Chọn từ, cụm từ hoặc dịch toàn đoạn</strong>
      <p>AI sẽ phân tích ngữ cảnh để tránh dịch máy từng chữ.</p>
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
      <h3>Nghĩa trong ngữ cảnh</h3>
      <p>{result.meaningInContext}</p>
    </div>
    {result.vietnameseMeaning && <div className="detail-block">
      <h3>Nghĩa tiếng Việt</h3>
      <p>{result.vietnameseMeaning}</p>
    </div>}
    <div className="detail-block">
      <h3>Định nghĩa tiếng Anh</h3>
      <p>{result.englishDefinition}</p>
    </div>
    <div className="detail-block">
      <h3>Câu chứa từ</h3>
      <p>{result.sentence}</p>
    </div>
    <div className="detail-block">
      <h3>Giải thích</h3>
      <p>{result.explanation}</p>
    </div>
    <div className="detail-block">
      <h3>Cụm hay dùng</h3>
      {result.collocations.length ? <ul>{result.collocations.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Chưa có gợi ý thêm.</p>}
    </div>
    <div className="detail-block">
      <h3>Ví dụ</h3>
      {result.examples.length ? <ul>{result.examples.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Chưa có ví dụ.</p>}
    </div>
    <div className="detail-block">
      <h3>Từ liên quan trong đoạn</h3>
      {result.relatedWordsFromPassage.length ? <ul>{result.relatedWordsFromPassage.map((item) => <li key={`${item.word}:${item.reason}`}><strong>{item.word}</strong>: {item.reason}</li>)}</ul> : <p>Không có từ liên quan rõ ràng trong đoạn.</p>}
    </div>
    <div className="detail-block">
      <h3>Có nên lưu?</h3>
      <p>{result.shouldSave ? result.saveReason : `Không bắt buộc lưu. ${result.saveReason}`}</p>
      <p>Độ khó: <strong>{result.difficulty}</strong></p>
      {saveMessage && <div className="form-message standalone">{saveMessage}</div>}
      {canSave ? <div className="status-actions">
        <button className={saved ? 'button secondary' : 'button primary'} disabled={saved || saveLoading} onClick={onSave}>
          {saved ? 'Đã lưu' : saveLoading ? 'Đang lưu...' : getSaveButtonLabel(role)}
        </button>
      </div> : <p className="reading-save-hint">Dịch toàn đoạn chỉ dùng để tham khảo, không lưu vào thư viện từ.</p>}
    </div>
  </section>;
}
