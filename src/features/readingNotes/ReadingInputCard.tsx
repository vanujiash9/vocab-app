interface ReadingInputCardProps {
  passage: string;
  error: string;
  onChange: (value: string) => void;
  onStart: () => void;
}

export function ReadingInputCard({ passage, error, onChange, onStart }: ReadingInputCardProps) {
  return <section className="panel reading-input-card">
    <div className="reading-card-header">
      <h3>Đoạn văn tiếng Anh</h3>
      <p>Dán đoạn văn để bắt đầu đọc và click vào từ bạn chưa biết.</p>
    </div>
    <textarea
      className="reading-passage-input"
      value={passage}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Dán đoạn văn tiếng Anh tại đây..."
      rows={10}
    />
    {error && <div className="form-message">{error}</div>}
    <div className="reading-input-footer">
      <p>Bạn có thể click vào bất kỳ từ nào trong đoạn để xem giải thích theo ngữ cảnh.</p>
      <button className="button primary" onClick={onStart}>Bắt đầu đọc</button>
    </div>
  </section>;
}
