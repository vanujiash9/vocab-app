import { Link } from 'react-router-dom';
import type { UnifiedStudentVocabularyItem } from '../../../services/vocabulary';

const STATUS_LABELS = {
  new: 'Mới',
  learning: 'Đang học',
  known: 'Đã thuộc',
  difficult: 'Khó nhớ',
} as const;

function formatCompactDate(value: string | null): string {
  if (!value) return '—';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

interface StudentVocabularyAssignedCardProps {
  assignedCount: number;
  dueSoonCount: number;
  items: UnifiedStudentVocabularyItem[];
  onOpenAssignedItem: (assignmentId: string) => void;
}

export function StudentVocabularyAssignedCard({ assignedCount, dueSoonCount, items, onOpenAssignedItem }: StudentVocabularyAssignedCardProps) {
  return <section className="panel student-vocabulary-assigned-strip-card">
    <div className="student-vocabulary-assigned-strip-header">
      <div className="student-vocabulary-assigned-strip-copy">
        <p>{assignedCount} từ đang chờ học · {dueSoonCount} từ sắp đến hạn ôn.</p>
      </div>
      <div className="student-vocabulary-assigned-strip-actions">
        {assignedCount > 0 && <Link className="button primary small" to="/review?source=assigned">Học ngay</Link>}
      </div>
    </div>

    {items.length ? <div className="student-vocabulary-assigned-inline-list" role="list" aria-label="Từ giáo viên giao gần đây">
      {items.map((item) => <button key={item.id} className="student-vocabulary-assigned-inline-item" role="listitem" onClick={() => onOpenAssignedItem(item.assignmentId ?? item.id)}>
        <div className="student-vocabulary-assigned-inline-top">
          <strong>{item.word}</strong>
          <em>{STATUS_LABELS[item.status]}</em>
        </div>
        <p>{item.vietnameseMeaning || item.englishDefinition}</p>
        <small>{item.dueAt ? `Hạn ${formatCompactDate(item.dueAt)}` : `Giao ${formatCompactDate(item.assignedAt)}`}</small>
      </button>)}
    </div> : <div className="student-vocabulary-assigned-empty">Chưa có từ nào được giáo viên giao.</div>}
  </section>;
}

// ponytail: assigned words now behave like a compact summary strip instead of a full section table.