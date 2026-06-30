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

function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '—';
  return text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}…`;
}

interface StudentVocabularyAssignedCardProps {
  assignedCount: number;
  dueSoonCount: number;
  items: UnifiedStudentVocabularyItem[];
  onShowAssignedList: () => void;
  onOpenAssignedItem: (assignmentId: string) => void;
}

export function StudentVocabularyAssignedCard({ assignedCount, dueSoonCount, items, onShowAssignedList, onOpenAssignedItem }: StudentVocabularyAssignedCardProps) {
  return <section className="panel student-vocabulary-assigned-table">
    <div className="student-vocabulary-assigned-table-header">
      <div>
        <h3>Từ được giao</h3>
        <p>{assignedCount} từ được giao · {dueSoonCount} từ sắp đến hạn</p>
      </div>
      <div className="student-vocabulary-assigned-table-actions">
        {assignedCount > 0 && <Link className="button secondary" to="/review?source=assigned">Học</Link>}
        {assignedCount > 6 && <button className="button secondary" onClick={onShowAssignedList}>Xem tất cả</button>}
      </div>
    </div>

    {items.length ? <div className="student-vocabulary-assigned-strip" role="list" aria-label="Từ được giao gần đây">
      {items.map((item) => <button key={item.id} className="student-vocabulary-assigned-strip-item" role="listitem" onClick={() => onOpenAssignedItem(item.assignmentId ?? item.id)}>
        <strong>{item.word}</strong>
        <span>{STATUS_LABELS[item.status]}</span>
        <small>{item.dueAt ? `Hạn ${formatCompactDate(item.dueAt)}` : `Giao ${formatCompactDate(item.assignedAt)}`}</small>
        {item.teacherNote && <em>{truncate(item.teacherNote, 36)}</em>}
      </button>)}
    </div> : <div className="student-vocabulary-assigned-empty">Chưa có từ nào được giao.</div>}
  </section>;
}
