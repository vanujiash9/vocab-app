import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { ErrorState, LoadingState } from '../../../components/PageState';
import { useAuth } from '../../../contexts/AuthContext';
import { VocabularyManualForm } from '../../vocabulary-manual/VocabularyManualForm';
import type { VocabularyManualInput } from '../../vocabulary-manual/vocabularyManual.types';
import { saveManualStudentVocabulary } from '../../../services/data';
import { getStudentVocabularyOverview, getUnifiedStudentVocabulary, removeFromLibrary, updateVocabularyStatus, type StudentVocabularyOverview, type UnifiedStudentVocabularyItem, type UnifiedVocabularyFilter } from '../../../services/vocabulary';
import { StudentVocabularyAssignedCard } from './StudentVocabularyAssignedCard';
import { StudentVocabularyList } from './StudentVocabularyList';

export type StudentVocabularySort = 'recent' | 'assigned-recent' | 'az' | 'za';
export type StudentVocabularyQuickFilter = 'all' | 'fresh-assigned';

function includesQuery(item: { word: string; englishDefinition: string; vietnameseMeaning: string }, query: string): boolean {
  const text = `${item.word} ${item.englishDefinition} ${item.vietnameseMeaning}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function playAudio(url: string | null) {
  if (!url) return;
  void new Audio(url).play();
}

function getDefaultSort(filter: UnifiedVocabularyFilter): StudentVocabularySort {
  return filter === 'assigned' ? 'assigned-recent' : 'recent';
}

function normalizeQuickFilter(filter: UnifiedVocabularyFilter, quickFilter: StudentVocabularyQuickFilter): StudentVocabularyQuickFilter {
  return filter === 'all' || filter === 'assigned' ? quickFilter : 'all';
}

function normalizeSort(filter: UnifiedVocabularyFilter, sort: StudentVocabularySort): StudentVocabularySort {
  const allowedSorts = filter === 'assigned' ? ['assigned-recent', 'az', 'za'] : ['recent', 'az', 'za'];
  return allowedSorts.includes(sort) ? sort : getDefaultSort(filter);
}

function compareByRecent(left: UnifiedStudentVocabularyItem, right: UnifiedStudentVocabularyItem): number {
  return new Date(right.assignedAt ?? right.createdAt).getTime() - new Date(left.assignedAt ?? left.createdAt).getTime();
}

function compareByAlphabet(left: UnifiedStudentVocabularyItem, right: UnifiedStudentVocabularyItem): number {
  return left.word.localeCompare(right.word, 'en', { sensitivity: 'base' });
}

function sortItems(items: UnifiedStudentVocabularyItem[], sort: StudentVocabularySort): UnifiedStudentVocabularyItem[] {
  const nextItems = [...items];
  if (sort === 'az') return nextItems.sort(compareByAlphabet);
  if (sort === 'za') return nextItems.sort((left, right) => compareByAlphabet(right, left));
  if (sort === 'assigned-recent') {
    return nextItems.sort((left, right) => {
      const sourceRank = Number(right.source === 'assigned') - Number(left.source === 'assigned');
      if (sourceRank !== 0) return sourceRank;
      return compareByRecent(left, right);
    });
  }
  return nextItems.sort(compareByRecent);
}

function isFreshAssigned(item: UnifiedStudentVocabularyItem): boolean {
  return item.source === 'assigned' && item.status === 'new';
}

interface StudentVocabularyPageProps {
  initialFilter: UnifiedVocabularyFilter;
  onFilterParamChange: (filter: UnifiedVocabularyFilter) => void;
}

export function StudentVocabularyPage({ initialFilter, onFilterParamChange }: StudentVocabularyPageProps) {
  const { user } = useAuth();
  const listRef = useRef<HTMLElement | null>(null);
  const [overview, setOverview] = useState<StudentVocabularyOverview | null>(null);
  const [items, setItems] = useState<UnifiedStudentVocabularyItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UnifiedVocabularyFilter>(initialFilter);
  const [quickFilter, setQuickFilter] = useState<StudentVocabularyQuickFilter>('all');
  const [sort, setSort] = useState<StudentVocabularySort>(getDefaultSort(initialFilter));
  const [showManualForm, setShowManualForm] = useState(false);
  const [showAssignedSection, setShowAssignedSection] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [nextOverview, nextItems] = await Promise.all([
        getStudentVocabularyOverview(user.id),
        getUnifiedStudentVocabulary(user.id),
      ]);
      setOverview(nextOverview);
      setItems(nextItems);
      setExpandedItemId((current) => current && nextItems.some((item) => item.id === current) ? current : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được từ vựng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);
  useEffect(() => {
    setFilter(initialFilter);
    setQuickFilter(normalizeQuickFilter(initialFilter, 'all'));
    setSort(getDefaultSort(initialFilter));
  }, [initialFilter]);

  const filteredItems = useMemo(() => {
    const nextQuickFilter = normalizeQuickFilter(filter, quickFilter);
    const nextSort = normalizeSort(filter, sort);
    const nextItems = items.filter((item) => {
      const matchesFilter = filter === 'all'
        ? true
        : filter === 'assigned'
          ? item.source === 'assigned'
          : item.status === filter;
      const matchesQuickFilter = nextQuickFilter === 'fresh-assigned' ? isFreshAssigned(item) : true;
      return matchesFilter && matchesQuickFilter && (!query.trim() || includesQuery(item, query));
    });
    return sortItems(nextItems, nextSort);
  }, [filter, items, query, quickFilter, sort]);

  const assignedPreviewItems = useMemo(() => sortItems(items.filter((item) => item.source === 'assigned'), 'assigned-recent').slice(0, 4), [items]);
  const selfFoundItems = useMemo(() => filteredItems.filter((item) => item.source === 'library'), [filteredItems]);
  const listItems = filter === 'all' ? selfFoundItems : filteredItems;

  const emptyState = useMemo(() => {
    if (filter === 'all' && !selfFoundItems.length) {
      return {
        title: 'Bạn chưa có từ tự lưu nào.',
        description: 'Hãy tra cứu hoặc nhập từ mới để bắt đầu danh sách từ của riêng bạn.',
      };
    }
    if (!items.length) {
      return {
        title: 'Bạn chưa có từ vựng nào.',
        description: 'Hãy tra cứu hoặc nhập từ mới để bắt đầu.',
      };
    }
    if (query.trim()) {
      return {
        title: 'Không tìm thấy từ phù hợp.',
        description: 'Hãy thử từ khóa khác hoặc đổi bộ lọc.',
      };
    }
    if (quickFilter === 'fresh-assigned') {
      return {
        title: 'Chưa có từ mới giao.',
        description: 'Các từ được giáo viên giao nhưng chưa học sẽ xuất hiện ở đây.',
      };
    }
    if (filter === 'assigned') {
      return {
        title: 'Bạn chưa có từ nào được giáo viên giao.',
        description: 'Các từ giáo viên giao sẽ xuất hiện ở đây.',
      };
    }
    return {
      title: 'Chưa có từ phù hợp.',
      description: 'Thử đổi bộ lọc để xem thêm từ vựng.',
    };
  }, [filter, items.length, query, quickFilter, selfFoundItems.length]);

  const applyFilter = (nextFilter: UnifiedVocabularyFilter) => {
    const normalizedQuickFilter = normalizeQuickFilter(nextFilter, quickFilter);
    const normalizedSort = normalizeSort(nextFilter, sort);
    setFilter(nextFilter);
    setQuickFilter(normalizedQuickFilter);
    setSort(normalizedSort);
    onFilterParamChange(nextFilter);
  };

  const showAssignedList = () => {
    applyFilter('assigned');
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openAssignedItem = (assignmentId: string) => {
    applyFilter('assigned');
    setExpandedItemId(`assigned:${assignmentId}`);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleDetail = (itemId: string) => {
    setExpandedItemId((current) => current === itemId ? null : itemId);
  };

  const changeStatus = async (item: UnifiedStudentVocabularyItem, status: 'new' | 'learning' | 'known' | 'difficult') => {
    setMessage('');
    await updateVocabularyStatus(item, status);
    await load();
    setExpandedItemId(item.id);
  };

  const deleteWord = async (item: UnifiedStudentVocabularyItem) => {
    if (!item.libraryId) return;
    setMessage('');
    await removeFromLibrary(item.libraryId);
    setMessage(item.source === 'assigned' ? 'Đã xóa từ khỏi thư viện cá nhân. Từ được giao vẫn được giữ lại.' : 'Đã xóa từ khỏi thư viện.');
    await load();
    setExpandedItemId(item.assignmentId ? `assigned:${item.assignmentId}` : null);
  };

  const saveManual = async (data: VocabularyManualInput) => {
    if (!user) return;
    const result = await saveManualStudentVocabulary(user.id, data);
    if (result.status === 'duplicate') {
      setMessage('Từ này đã có trong thư viện.');
      return;
    }
    setMessage('Đã lưu từ vào thư viện.');
    setShowManualForm(false);
    await load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!overview) return <ErrorState message="Không tải được tổng quan từ vựng." retry={() => void load()} />;

  return <div className="page-wrap student-vocabulary-page-wrap">
    <div className="page-heading student-vocabulary-page-heading compact">
      <div>
        <h1>Từ vựng</h1>
      </div>
      <button className="button primary" onClick={() => setShowManualForm(true)}><Plus size={17} /> Nhập từ vựng</button>
    </div>

    {message && <div className="form-message standalone">{message}</div>}
    <VocabularyManualForm role="student" open={showManualForm} onSubmit={saveManual} onClose={() => setShowManualForm(false)} />

    <section className="student-vocabulary-section student-vocabulary-section-collapsible">
      <div className="student-vocabulary-section-header student-vocabulary-section-header-toggle student-vocabulary-section-header-muted">
        <div>
          <h2>Từ được giao</h2>
          <p>{overview.assignedCount} từ để ưu tiên học trước.</p>
        </div>
        <button className="button secondary small" type="button" onClick={() => setShowAssignedSection((current) => !current)}>
          {showAssignedSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showAssignedSection ? 'Ẩn bớt' : 'Xem nhanh'}
        </button>
      </div>
      {showAssignedSection ? <StudentVocabularyAssignedCard
        assignedCount={overview.assignedCount}
        dueSoonCount={overview.dueSoonCount}
        items={assignedPreviewItems}
        onShowAssignedList={showAssignedList}
        onOpenAssignedItem={openAssignedItem}
      /> : null}
    </section>

    <section ref={listRef} className="student-vocabulary-section student-vocabulary-main-section">
      <StudentVocabularyList
        heading="Thư viện từ của bạn"
        description="Từ bạn đã lưu từ tra cứu và ghi chú cá nhân."
        items={listItems}
        expandedItemId={expandedItemId}
        filter={filter}
        quickFilter={quickFilter}
        sort={sort}
        query={query}
        resultSummary={`${listItems.length} kết quả`}
        emptyTitle={emptyState.title}
        emptyDescription={emptyState.description}
        onFilterChange={applyFilter}
        onQuickFilterChange={setQuickFilter}
        onSortChange={setSort}
        onQueryChange={setQuery}
        onToggleDetail={toggleDetail}
        onPlayAudio={playAudio}
        onChangeStatus={(item, status) => void changeStatus(item, status)}
        onDelete={(item) => void deleteWord(item)}
      />
    </section>

    {/* ponytail: the assigned section is collapsible to reduce default clutter while keeping the current data flow intact. */}
  </div>;
}
