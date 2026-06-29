import { useEffect, useState, type FormEvent } from 'react';
import { DIFFICULTIES, PARTS_OF_SPEECH, parseExamples, parseSemicolonList, validateManualInput } from './vocabularyManual.utils';
import type { VocabularyManualInput } from './vocabularyManual.types';

export interface VocabularyManualFormProps {
  role: 'student' | 'teacher';
  open: boolean;
  onClose: () => void;
  onSubmit: (data: VocabularyManualInput) => Promise<void>;
}

const INITIAL_FORM = {
  word: '',
  englishDefinition: '',
  vietnameseMeaning: '',
  partOfSpeech: '',
  exampleText: '',
  synonymsText: '',
  antonymsText: '',
  collocationsText: '',
  note: '',
  difficulty: '',
};

export function VocabularyManualForm({ role, open, onClose, onSubmit }: VocabularyManualFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(INITIAL_FORM);
  }, [open]);

  if (!open) return null;

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const data: VocabularyManualInput = {
      word: form.word,
      englishDefinition: form.englishDefinition,
      vietnameseMeaning: form.vietnameseMeaning,
      partOfSpeech: form.partOfSpeech || undefined,
      examples: parseExamples(form.exampleText),
      synonyms: parseSemicolonList(form.synonymsText),
      antonyms: parseSemicolonList(form.antonymsText),
      collocations: parseSemicolonList(form.collocationsText),
      note: form.note,
      difficulty: role === 'teacher' && form.difficulty ? form.difficulty as VocabularyManualInput['difficulty'] : null,
    };
    const errors = validateManualInput(data);
    if (errors.length) {
      setError(errors[0]);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được từ vựng.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="manual-vocabulary-title">
    <form className="panel manual-vocabulary-modal" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <span>{role === 'teacher' ? 'Teacher manual entry' : 'Student manual entry'}</span>
          <h3 id="manual-vocabulary-title">{role === 'teacher' ? 'Nhập từ vào kho từ' : 'Nhập từ vào thư viện'}</h3>
          <p>{role === 'teacher' ? 'Lưu từ mới vào kho từ để phân loại và giao cho học viên sau.' : 'Lưu nhanh từ mới vào thư viện cá nhân để tiếp tục học.'}</p>
        </div>
      </div>
      {error && <div className="form-message standalone">{error}</div>}
      <div className="manual-vocabulary-grid">
        <label className="manual-vocabulary-field">
          <span>Từ tiếng Anh *</span>
          <input value={form.word} onChange={(event) => update('word', event.target.value)} placeholder="sustainable" disabled={saving} />
        </label>
        <label className="manual-vocabulary-field manual-vocabulary-field-wide">
          <span>Nghĩa Anh – Anh *</span>
          <textarea value={form.englishDefinition} onChange={(event) => update('englishDefinition', event.target.value)} placeholder="able to continue for a long time" rows={3} disabled={saving} />
        </label>
      </div>
      <section className="detail-block manual-vocabulary-extra">
        <h4>Thông tin bổ sung</h4>
        <div className="manual-vocabulary-grid">
          <label className="manual-vocabulary-field">
            <span>Nghĩa tiếng Việt</span>
            <input value={form.vietnameseMeaning} onChange={(event) => update('vietnameseMeaning', event.target.value)} placeholder="bền vững" disabled={saving} />
          </label>
          <label className="manual-vocabulary-field">
            <span>Loại từ</span>
            <select value={form.partOfSpeech} onChange={(event) => update('partOfSpeech', event.target.value)} disabled={saving}>
              <option value="">Chọn loại từ</option>
              {PARTS_OF_SPEECH.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          {role === 'teacher' && <label className="manual-vocabulary-field">
            <span>Độ khó</span>
            <select value={form.difficulty} onChange={(event) => update('difficulty', event.target.value)} disabled={saving}>
              <option value="">Chưa đặt</option>
              {DIFFICULTIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>}
          <label className="manual-vocabulary-field manual-vocabulary-field-wide">
            <span>Ví dụ</span>
            <textarea value={form.exampleText} onChange={(event) => update('exampleText', event.target.value)} placeholder="Mỗi ví dụ một dòng" rows={4} disabled={saving} />
          </label>
          <label className="manual-vocabulary-field">
            <span>Từ đồng nghĩa</span>
            <textarea value={form.synonymsText} onChange={(event) => update('synonymsText', event.target.value)} placeholder="durable; lasting" rows={3} disabled={saving} />
          </label>
          <label className="manual-vocabulary-field">
            <span>Từ trái nghĩa</span>
            <textarea value={form.antonymsText} onChange={(event) => update('antonymsText', event.target.value)} placeholder="temporary; unstable" rows={3} disabled={saving} />
          </label>
          <label className="manual-vocabulary-field manual-vocabulary-field-wide">
            <span>Collocations</span>
            <textarea value={form.collocationsText} onChange={(event) => update('collocationsText', event.target.value)} placeholder="sustainable growth; sustainable energy" rows={3} disabled={saving} />
          </label>
          <label className="manual-vocabulary-field manual-vocabulary-field-wide">
            <span>Ghi chú</span>
            <textarea value={form.note} onChange={(event) => update('note', event.target.value)} placeholder={role === 'teacher' ? 'Ghi chú cách dạy, nhóm chủ đề...' : 'Ghi chú cách nhớ, ví dụ riêng...'} rows={3} disabled={saving} />
          </label>
        </div>
      </section>
      <div className="status-actions">
        <button type="button" className="button secondary" onClick={onClose} disabled={saving}>Hủy</button>
        <button className="button primary" disabled={saving}>{saving ? 'Đang lưu...' : role === 'teacher' ? 'Lưu vào kho từ' : 'Lưu vào thư viện'}</button>
      </div>
    </form>
  </div>;
}
