interface ReadingInputCardProps {
  passage: string;
  history: string[];
  error: string;
  onChange: (value: string) => void;
  onStart: () => void;
}

function previewPassage(passage: string): string {
  return passage.length > 120 ? `${passage.slice(0, 117).trimEnd()}...` : passage;
}

export function ReadingInputCard({ passage, history, error, onChange, onStart }: ReadingInputCardProps) {
  return <section className="panel reading-input-card">
    <div className="reading-card-header">
      <div>
        <span>Paste passage</span>
        <h3>Dán đoạn văn tiếng Anh</h3>
        <p>AI sẽ giải thích từ theo đúng câu và ngữ cảnh bạn đang đọc.</p>
      </div>
    </div>
    <label className="reading-input-label" htmlFor="reading-passage-input">Đoạn văn</label>
    <textarea
      id="reading-passage-input"
      className="reading-passage-input"
      value={passage}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Dán đoạn văn tiếng Anh tại đây..."
      rows={10}
    />
    {history.length > 0 && <div className="reading-history-list" aria-label="Lịch sử đoạn văn">
      <strong>Lịch sử gần đây</strong>
      <div>
        {history.map((item) => <button key={item} type="button" onClick={() => onChange(item)}>{previewPassage(item)}</button>)}
      </div>
    </div>}
    {error && <div className="form-message">{error}</div>}
    <div className="reading-input-footer">
      <p>Chọn một từ trong đoạn để xem nghĩa tiếng Việt, định nghĩa và giải thích bằng AI ở cột bên phải.</p>
      <button className="button primary reading-start-button" onClick={onStart}>Bắt đầu đọc</button>
    </div>
  </section>;
}
