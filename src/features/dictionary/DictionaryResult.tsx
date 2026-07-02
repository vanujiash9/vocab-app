import { Volume2 } from 'lucide-react';
import type { UserRole } from '../../types';
import type { DictionaryEntry } from './dictionary.types';

export type DictionarySaveStatus = 'idle' | 'saving' | 'saved' | 'duplicate' | 'error';

function getTargetLabel(role: UserRole | undefined) {
  return role === 'teacher' ? 'Kho từ vựng' : 'Thư viện từ';
}

function ChipList({ items }: { items: string[] }) {
  return <div className="filter-row">{items.slice(0, 12).map((item) => <span className="status new" key={item}>{item}</span>)}</div>;
}

export function DictionaryResult({
  entry,
  role,
  saveStatus,
  onSave,
}: {
  entry: DictionaryEntry;
  role: UserRole | undefined;
  saveStatus: DictionarySaveStatus;
  onSave: () => void;
}) {
  const targetLabel = getTargetLabel(role);
  const isSaving = saveStatus === 'saving';
  const isSaved = saveStatus === 'saved';
  const isDuplicate = saveStatus === 'duplicate';

  const playAudio = () => {
    if (!entry.audioUrl) return;
    void new Audio(entry.audioUrl).play();
  };

  return <section className="panel word-detail">
    <div className="detail-title">
      <div><h2>{entry.word}</h2><p>{entry.phonetic || '/phonetic/'}{entry.primaryPartOfSpeech ? ` · ${entry.primaryPartOfSpeech}` : ''}</p></div>
      <button className="icon-button" onClick={playAudio} disabled={!entry.audioUrl} aria-label="Nghe phát âm"><Volume2 size={19} /></button>
    </div>
    <div className="detail-block"><h3>Định nghĩa tiếng Anh</h3><p>{entry.primaryDefinition}</p></div>
    <div className="detail-block"><h3>Nghĩa tiếng Việt</h3><p>Chưa có bản dịch tự động đáng tin cậy. Bạn có thể bổ sung sau trong thư viện nếu cần.</p></div>
    {entry.examples.length > 0 && <div className="detail-block"><h3>Ví dụ</h3><ul>{entry.examples.slice(0, 3).map((example) => <li key={example}>{example}</li>)}</ul></div>}
    {entry.synonyms.length > 0 && <div className="detail-block"><h3>Synonyms</h3><ChipList items={entry.synonyms} /></div>}
    {entry.antonyms.length > 0 && <div className="detail-block"><h3>Antonyms</h3><ChipList items={entry.antonyms} /></div>}
    <div className="detail-block"><h3>Các nghĩa khác</h3><div className="compact-list">{entry.meanings.slice(0, 5).map((meaning, index) => <div key={`${meaning.partOfSpeech}-${index}`}><strong>{meaning.partOfSpeech}</strong><span>{meaning.definition}</span></div>)}</div></div>
    <div className="status-actions"><button className="button primary" onClick={onSave} disabled={isSaving || isSaved || isDuplicate}>{isSaving ? 'Đang lưu...' : `Thêm vào ${targetLabel}`}</button></div>
    {isSaved && <div className="form-message standalone">Đã lưu vào {targetLabel}.</div>}
    {isDuplicate && <div className="form-message standalone">Từ này đã tồn tại trong {targetLabel}.</div>}
    {saveStatus === 'error' && <div className="form-message standalone">Không lưu được từ. Vui lòng thử lại.</div>}
  </section>;
}
