import { ArrowDownAZ, ArrowUpAZ, ChevronDown, ChevronUp, Clock3, Search } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '../../../components/PageState';
import type { UnifiedStudentVocabularyItem, UnifiedVocabularyFilter } from '../../../services/vocabulary';
import type { StudentVocabularyQuickFilter, StudentVocabularySort } from './StudentVocabularyPage';
import { StudentVocabularyDetail } from './StudentVocabularyDetail';

const FILTER_OPTIONS: Array<{ value: UnifiedVocabularyFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'assigned', label: 'Được giao' },
  { value: 'learning', label: 'Đang học' },
  { value: 'known', label: 'Đã thuộc' },
  { value: 'difficult', label: 'Khó nhớ' },
];

const QUICK_FILTER_OPTIONS: Array<{ value: StudentVocabularyQuickFilter; label: string }> = [
  { value: 'all', label: 'Mọi từ' },
  { value: 'fresh-assigned', label: 'Mới giao' },
];

const SORT_OPTIONS: Array<{ value: StudentVocabularySort; label: string }> = [
  { value: 'recent', label: 'Mới nhất' },
  { value: 'assigned-recent', label: 'Được giao gần đây' },
  { value: 'az', label: 'A → Z' },
  { value: 'za', label: 'Z → A' },
];

const STATUS_LABELS = {
  new: 'Mới',
  learning: 'Đang học',
  known: 'Đã thuộc',
  difficult: 'Khó nhớ',
} as const;

function formatCompactDate(value: string | null): string | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return new Date(value).toLocaleDateString('vi-VN');
}

function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  return text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}…`;
}

function getSortIcon(sort: StudentVocabularySort) {
  if (sort === 'az') return ArrowDownAZ;
  if (sort === 'za') return ArrowUpAZ;
  return Clock3;
}

interface StudentVocabularyListProps {
  heading: string;
  description: string;
  items: UnifiedStudentVocabularyItem[];
  expandedItemId: string | null;
  filter: UnifiedVocabularyFilter;
  quickFilter: StudentVocabularyQuickFilter;
  sort: StudentVocabularySort;
  query: string;
  resultSummary: string;
  emptyTitle: string;
  emptyDescription: string;
  onFilterChange: (filter: UnifiedVocabularyFilter) => void;
  onQuickFilterChange: (filter: StudentVocabularyQuickFilter) => void;
  onSortChange: (sort: StudentVocabularySort) => void;
  onQueryChange: (value: string) => void;
  onToggleDetail: (itemId: string) => void;
  onPlayAudio: (url: string | null) => void;
  onChangeStatus: (item: UnifiedStudentVocabularyItem, status: 'new' | 'learning' | 'known' | 'difficult') => void;
  onDelete: (item: UnifiedStudentVocabularyItem) => void;
}

export function StudentVocabularyList({
  heading,
  description,
  items,
  expandedItemId,
  filter,
  quickFilter,
  sort,
  query,
  resultSummary,
  emptyTitle,
  emptyDescription,
  onFilterChange,
  onQuickFilterChange,
  onSortChange,
  onQueryChange,
  onToggleDetail,
  onPlayAudio,
  onChangeStatus,
  onDelete,
}: StudentVocabularyListProps) {
  const SortIcon = getSortIcon(sort);
  const showQuickFilter = filter === 'all' || filter === 'assigned';
  const sortOptions = filter === 'assigned'
    ? SORT_OPTIONS.filter((item) => item.value !== 'recent')
    : SORT_OPTIONS.filter((item) => item.value !== 'assigned-recent');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return <section className="student-vocabulary-list-section compact">
    <div className="panel student-vocabulary-toolbar">
      <div className="filter-row student-vocabulary-filter-row" role="tablist" aria-label="Lọc danh sách từ vựng">
        {FILTER_OPTIONS.map((item) => <button key={item.value} className={filter === item.value ? 'active' : ''} onClick={() => onFilterChange(item.value)}>{item.label}</button>)}
      </div>

      <div className="student-vocabulary-toolbar-main student-vocabulary-toolbar-main-compact">
        <div className="search-bar student-vocabulary-search-bar"><Search size={18} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={filter === 'assigned' ? 'Tìm trong từ được giao...' : 'Tìm từ, nghĩa Anh hoặc nghĩa Việt...'} /></div>
        <button className="button secondary small student-vocabulary-advanced-toggle" type="button" onClick={() => setShowAdvancedFilters((current) => !current)}>
          {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showAdvancedFilters ? 'Ẩn bộ lọc nâng cao' : 'Bộ lọc nâng cao'}
        </button>
      </div>

      {showAdvancedFilters && <div className="student-vocabulary-toolbar-advanced">
        {showQuickFilter && <div className="student-vocabulary-toolbar-select">
          <span>Ưu tiên</span>
          <select value={quickFilter} onChange={(event) => onQuickFilterChange(event.target.value as StudentVocabularyQuickFilter)}>
            {QUICK_FILTER_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>}
        <div className="student-vocabulary-toolbar-select">
          <span>Sắp xếp</span>
          <div className="student-vocabulary-sort-wrap">
            <SortIcon size={16} />
            <select value={sort} onChange={(event) => onSortChange(event.target.value as StudentVocabularySort)}>
              {sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>
      </div>}
    </div>

    <div className="student-vocabulary-list-heading compact">
      <div>
        <h3>{heading}</h3>
        <p>{description} · {resultSummary}</p>
      </div>
    </div>

    {items.length ? <div className="student-vocabulary-list dense" role="list" aria-label="Danh sách từ vựng">
      {items.map((item) => {
        const isExpanded = expandedItemId === item.id;
        const dueLabel = formatCompactDate(item.dueAt);
        const assignedLabel = formatCompactDate(item.assignedAt);

        return <article key={item.id} className={`panel student-vocabulary-row dense ${isExpanded ? 'expanded' : ''}`} role="listitem">
          <button className="student-vocabulary-row-button dense" onClick={() => onToggleDetail(item.id)} aria-expanded={isExpanded}>
            <div className="student-vocabulary-row-main dense">
              <div className="student-vocabulary-row-headline dense">
                <strong>{item.word}</strong>
                <div className="student-vocabulary-row-badges compact">
                  <span className={`status ${item.status}`}>{STATUS_LABELS[item.status]}</span>
                </div>
              </div>
              <span className="student-vocabulary-subline">{[item.partOfSpeech, item.source === 'assigned' ? 'Được giao' : 'Thư viện', dueLabel ? `Hạn ${dueLabel}` : assignedLabel ? `Giao ${assignedLabel}` : ''].filter(Boolean).join(' · ')}</span>
              <p className="student-vocabulary-preview-line">{truncate(item.vietnameseMeaning || item.englishDefinition, 88)}</p>
            </div>
          </button>

          {isExpanded && <StudentVocabularyDetail item={item} onPlayAudio={onPlayAudio} onChangeStatus={onChangeStatus} onDelete={onDelete} />}
        </article>;
      })}
    </div> : <div className="panel student-vocabulary-empty-panel"><EmptyState title={emptyTitle} description={emptyDescription} /></div>}
  </section>;
}

// ponytail: one list heading is enough; filter state lives in the toolbar instead of becoming another title.
// ponytail: advanced filters are hidden by default to reduce visual noise; expose them only when users need control.
