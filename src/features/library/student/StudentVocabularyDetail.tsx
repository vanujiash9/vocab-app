import { Link } from 'react-router-dom';
import { Trash2, Volume2 } from 'lucide-react';
import type { UnifiedStudentVocabularyItem } from '../../../services/vocabulary';
import type { VocabularyStatus } from '../../../types';

const STATUS_LABELS: Record<VocabularyStatus, string> = {
  new: 'Mới',
  learning: 'Đang học',
  known: 'Đã thuộc',
  difficult: 'Khó nhớ',
};

interface StudentVocabularyDetailProps {
  item: UnifiedStudentVocabularyItem;
  onPlayAudio: (url: string | null) => void;
  onChangeStatus: (item: UnifiedStudentVocabularyItem, status: VocabularyStatus) => void;
  onDelete: (item: UnifiedStudentVocabularyItem) => void;
}

export function StudentVocabularyDetail({ item, onPlayAudio, onChangeStatus, onDelete }: StudentVocabularyDetailProps) {
  return <div className="student-vocabulary-detail">
    <div className="detail-title">
      <div>
        <h2>{item.word}</h2>
        <p>{item.phonetic || '/phonetic/'}{item.partOfSpeech ? ` · ${item.partOfSpeech}` : ''}</p>
      </div>
      <button className="icon-button" onClick={() => onPlayAudio(item.audioUrl)} disabled={!item.audioUrl} aria-label="Nghe phát âm">
        <Volume2 size={19} />
      </button>
    </div>

    <div className="detail-block">
      <h4>Nghĩa tiếng Việt</h4>
      <p>{item.vietnameseMeaning || 'Chưa có nghĩa tiếng Việt.'}</p>
    </div>

    <div className="detail-block">
      <h4>Định nghĩa tiếng Anh</h4>
      <p>{item.englishDefinition}</p>
    </div>

    <div className="detail-block">
      <h4>Ví dụ</h4>
      {item.examples.length ? <ul>{item.examples.slice(0, 3).map((example) => <li key={example}>{example}</li>)}</ul> : <p>Chưa có ví dụ.</p>}
    </div>

    {item.teacherNote && <div className="detail-block"><h4>Ghi chú giáo viên</h4><p>{item.teacherNote}</p></div>}
    {item.personalNote && <div className="detail-block"><h4>Ghi chú cá nhân</h4><p>{item.personalNote}</p></div>}

    <div className="detail-block">
      <h4>Cập nhật trạng thái</h4>
      <div className="status-actions">
        {(['new', 'learning', 'difficult', 'known'] as const).map((status) => <button key={status} className={item.status === status ? 'button primary' : 'button secondary'} onClick={() => onChangeStatus(item, status)}>{STATUS_LABELS[status]}</button>)}
      </div>
    </div>

    <div className="status-actions student-vocabulary-detail-actions">
      <Link className="button secondary" to={item.source === 'assigned' ? '/review?source=assigned' : `/review?source=${item.status === 'new' ? 'all' : item.status}`}>Ôn tập từ này</Link>
      {item.libraryId && <button className="button secondary" onClick={() => onDelete(item)}><Trash2 size={16} /> Xóa khỏi thư viện</button>}
    </div>
  </div>;
}
