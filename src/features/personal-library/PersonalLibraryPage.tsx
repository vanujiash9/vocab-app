import './personal-library.css';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, ChevronDown, ChevronUp, Clock3, Plus, Search, Trash2, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState';
import { useAuth } from '../../contexts/AuthContext';
import { VocabularyManualForm } from '../vocabulary-manual/VocabularyManualForm';
import type { VocabularyManualInput } from '../vocabulary-manual/vocabularyManual.types';
import { saveManualStudentVocabulary } from '../../services/vocabulary';
import { getUnifiedStudentVocabulary, removeFromLibrary, updateVocabularyStatus, type UnifiedStudentVocabularyItem, type UnifiedVocabularyFilter } from '../../services/vocabulary';
import type { VocabularyStatus } from '../../types';

const INITIAL_FILTER: UnifiedVocabularyFilter = 'all';
const FILTER_OPTIONS: Array<{ value: UnifiedVocabularyFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'learning', label: 'Đang học' },
  { value: 'known', label: 'Đã thuộc' },
  { value: 'difficult', label: 'Khó nhớ' },
];
const SORT_OPTIONS = [
  { value: 'recent', label: 'Mới nhất' },
  { value: 'az', label: 'A → Z' },
  { value: 'za', label: 'Z → A' },
] as const;
const STATUS_LABELS: Record<VocabularyStatus, string> = {
  new: 'Mới',
  learning: 'Đang học',
  known: 'Đã thuộc',
  difficult: 'Khó nhớ',
};

type StudentVocabularySort = (typeof SORT_OPTIONS)[number]['value'];

function includesQuery(item: { word: string; englishDefinition: string; vietnameseMeaning: string }, query: string): boolean {
  const text = `${item.word} ${item.englishDefinition} ${item.vietnameseMeaning}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function playAudio(url: string | null) {
  if (!url) return;
  void new Audio(url).play();
}

function compareByRecent(left: UnifiedStudentVocabularyItem, right: UnifiedStudentVocabularyItem): number {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function compareByAlphabet(left: UnifiedStudentVocabularyItem, right: UnifiedStudentVocabularyItem): number {
  return left.word.localeCompare(right.word, 'en', { sensitivity: 'base' });
}

function sortItems(items: UnifiedStudentVocabularyItem[], sort: StudentVocabularySort): UnifiedStudentVocabularyItem[] {
  const nextItems = [...items];
  if (sort === 'az') return nextItems.sort(compareByAlphabet);
  if (sort === 'za') return nextItems.sort((left, right) => compareByAlphabet(right, left));
  return nextItems.sort(compareByRecent);
}

function formatCompactDate(value: string | null): string | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return new Date(value).toLocaleDateString('vi-VN');
}

function getSortIcon(sort: StudentVocabularySort) {
  if (sort === 'az') return ArrowDownAZ;
  if (sort === 'za') return ArrowUpAZ;
  return Clock3;
}

export function PersonalLibraryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<UnifiedStudentVocabularyItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UnifiedVocabularyFilter>(INITIAL_FILTER);
  const [sort, setSort] = useState<StudentVocabularySort>('recent');
  const [showManualForm, setShowManualForm] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMore, setShowMore] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const nextItems = await getUnifiedStudentVocabulary(user.id);
      const libraryItems = nextItems.filter((item) => item.source === 'library');
      setItems(libraryItems);
      setSelectedItemId((current) => current && libraryItems.some((item) => item.id === current) ? current : libraryItems[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được thư viện từ cá nhân.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);
  useEffect(() => {
    setFilter(INITIAL_FILTER);
  }, []);

  const filteredItems = useMemo(() => {
    const nextItems = items.filter((item) => {
      const matchesFilter = filter === 'all' ? true : item.status === filter;
      return matchesFilter && (!query.trim() || includesQuery(item, query));
    });
    return sortItems(nextItems, sort);
  }, [filter, items, query, sort]);

  const selectedItem = useMemo(() => filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? null, [filteredItems, selectedItemId]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedItemId(null);
      return;
    }
    setSelectedItemId((current) => current && filteredItems.some((item) => item.id === current) ? current : filteredItems[0]?.id ?? null);
  }, [filteredItems]);

  useEffect(() => {
    setShowMore(false);
  }, [selectedItem?.id]);

  const emptyState = useMemo(() => {
    if (!items.length) {
      return {
        title: 'Bạn chưa có từ tự lưu nào.',
        description: 'Hãy tra cứu hoặc nhập từ mới để bắt đầu thư viện từ cá nhân.',
      };
    }
    if (query.trim()) {
      return {
        title: 'Không tìm thấy từ phù hợp.',
        description: 'Hãy thử từ khóa khác hoặc đổi bộ lọc.',
      };
    }
    return {
      title: 'Chưa có từ phù hợp.',
      description: 'Thử đổi bộ lọc để xem thêm từ vựng.',
    };
  }, [items.length, query]);

  const summaryItems = useMemo(() => [
    { value: items.length, label: 'Tự lưu' },
    { value: items.filter((item) => item.status === 'learning').length, label: 'Đang học' },
    { value: items.filter((item) => item.status === 'known').length, label: 'Đã thuộc' },
  ], [items]);

  const changeStatus = async (item: UnifiedStudentVocabularyItem, status: VocabularyStatus) => {
    setMessage('');
    await updateVocabularyStatus(item, status);
    await load();
    setSelectedItemId(item.id);
  };

  const deleteWord = async (item: UnifiedStudentVocabularyItem) => {
    if (!item.libraryId) return;
    setMessage('');
    await removeFromLibrary(item.libraryId);
    setMessage('Đã xóa từ khỏi thư viện.');
    await load();
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

  const SortIcon = getSortIcon(sort);
  const shouldShowMoreToggle = (selectedItem?.examples.length ?? 0) > 1;

  return <div className="page-wrap student-vocabulary-page-wrap student-vocabulary-single-flow">
    <div className="page-heading student-vocabulary-page-heading compact">
      <div>
        <span>Personal library</span>
        <h1>Thư viện từ cá nhân</h1>
        <p>Quản lý các từ đã lưu, cập nhật trạng thái học và mở nhanh phiên ôn tập từ thư viện của bạn.</p>
      </div>
      <button className="button primary" onClick={() => setShowManualForm(true)}><Plus size={17} /> Nhập từ vựng</button>
    </div>

    {message && <div className="form-message standalone">{message}</div>}
    <VocabularyManualForm role="student" open={showManualForm} onSubmit={saveManual} onClose={() => setShowManualForm(false)} />

    <div className="student-vocabulary-columns">
      <section className="panel student-vocabulary-browse-panel">
        <div className="panel-heading student-vocabulary-browse-header">
          <div>
            <h3>Danh sách từ đã lưu</h3>
            <p>Lọc, tìm kiếm và chọn nhanh một từ để xem chi tiết ở cột bên phải.</p>
          </div>
        </div>
        <div className="student-vocabulary-left-top">
          <div className="student-vocabulary-stats-row">
            {summaryItems.map((item) => <div key={item.label} className="student-vocabulary-stat-chip"><strong>{item.value}</strong><span>{item.label}</span></div>)}
          </div>
        </div>

        <section className="student-vocabulary-list-pane student-vocabulary-table-pane student-vocabulary-list-section compact">
          <div className="student-vocabulary-toolbar">
            <div className="search-bar student-vocabulary-search-bar"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm từ, nghĩa Anh hoặc nghĩa Việt..." /></div>

            <div className="filter-row student-vocabulary-filter-row" role="tablist" aria-label="Lọc thư viện từ cá nhân">
              {FILTER_OPTIONS.map((item) => <button key={item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>)}
            </div>

            <div className="student-vocabulary-summary-strip">
              <small>{filteredItems.length} từ</small>
              <div className="student-vocabulary-sort-wrap">
                <SortIcon size={16} />
                <select value={sort} onChange={(event) => setSort(event.target.value as StudentVocabularySort)}>
                  {SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {filteredItems.length ? <div className="table-wrap student-vocabulary-table-wrap">
            <table className="student-vocabulary-table" aria-label="Danh sách từ trong thư viện cá nhân">
              <thead>
                <tr>
                  <th>Từ</th>
                  <th>Loại từ</th>
                  <th>Ngày lưu</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const savedLabel = formatCompactDate(item.createdAt);

                  return <tr key={item.id} className={isSelected ? 'selected' : ''} onClick={() => setSelectedItemId(item.id)}>
                    <td><strong>{item.word}</strong></td>
                    <td>{item.partOfSpeech || '—'}</td>
                    <td>{savedLabel || '—'}</td>
                    <td><span className={`status ${item.status}`}>{STATUS_LABELS[item.status]}</span></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div> : <div className="student-vocabulary-empty-panel"><EmptyState title={emptyState.title} description={emptyState.description} /></div>}
        </section>
      </section>

      <section className="panel student-vocabulary-detail-main-panel">
        {selectedItem ? <>
          <div className="student-vocabulary-detail-shell-header">
            <div>
              <span className="student-vocabulary-detail-source">Thư viện cá nhân</span>
              <div className="student-vocabulary-word-row">
                <h2>{selectedItem.word}</h2>
                <button className="icon-button" onClick={() => playAudio(selectedItem.audioUrl)} disabled={!selectedItem.audioUrl} aria-label="Nghe phát âm">
                  <Volume2 size={17} />
                </button>
              </div>
              <p>{selectedItem.phonetic || '/phonetic/'}{selectedItem.partOfSpeech ? ` · ${selectedItem.partOfSpeech}` : ''}</p>
            </div>
            <div className="student-vocabulary-detail-status-card">
              <strong>Trạng thái: {STATUS_LABELS[selectedItem.status]}</strong>
              <span>{selectedItem.createdAt ? `Lưu ${new Date(selectedItem.createdAt).toLocaleDateString('vi-VN')}` : 'Thư viện cá nhân'}</span>
            </div>
          </div>

          <div className="student-vocabulary-detail">
            <div className="detail-block">
              <h3>Nghĩa tiếng Việt</h3>
              <p>{selectedItem.vietnameseMeaning || 'Chưa có nghĩa tiếng Việt.'}</p>
            </div>

            <div className="detail-block">
              <h3>Định nghĩa tiếng Anh</h3>
              <p>{selectedItem.englishDefinition}</p>
            </div>

            <div className="detail-block student-vocabulary-status-block">
              <h3>Cập nhật trạng thái</h3>
              <p className="student-vocabulary-status-copy">Chọn trạng thái gần nhất để hệ thống gợi ý ôn tập phù hợp hơn.</p>
              <div className="status-actions">
                {(['new', 'learning', 'difficult', 'known'] as const).map((status) => <button key={status} className={selectedItem.status === status ? 'button primary' : 'button secondary'} onClick={() => void changeStatus(selectedItem, status)}>{STATUS_LABELS[status]}</button>)}
              </div>
            </div>

            {(selectedItem.teacherNote || selectedItem.personalNote) && <div className="detail-block student-vocabulary-notes-inline">
              {selectedItem.teacherNote ? <div className="student-vocabulary-note-chip"><strong>Ghi chú giáo viên</strong><p>{selectedItem.teacherNote}</p></div> : null}
              {selectedItem.personalNote ? <div className="student-vocabulary-note-chip"><strong>Ghi chú cá nhân</strong><p>{selectedItem.personalNote}</p></div> : null}
            </div>}

            {selectedItem.examples.length > 0 && <div className="detail-block student-vocabulary-example-preview">
              <h3>Ví dụ nổi bật</h3>
              <p>{selectedItem.examples[0]}</p>
            </div>}

            {shouldShowMoreToggle && <div className="detail-block student-vocabulary-more-block">
              <button className="text-button student-vocabulary-more-toggle" type="button" onClick={() => setShowMore((current) => !current)}>
                {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showMore ? 'Thu gọn chi tiết' : 'Xem thêm ví dụ'}
              </button>

              {showMore && <div className="student-vocabulary-more-content">
                <div className="detail-block">
                  <h3>Ví dụ khác</h3>
                  <ul>{selectedItem.examples.slice(1, 3).map((example) => <li key={example}>{example}</li>)}</ul>
                </div>
              </div>}
            </div>}

            <div className="status-actions student-vocabulary-detail-actions">
              <Link className="button secondary" to={selectedItem.source === 'assigned' ? '/review?source=assigned' : `/review?source=${selectedItem.status === 'new' ? 'all' : selectedItem.status}`}>Ôn tập từ này</Link>
              {selectedItem.libraryId && <button className="button secondary" onClick={() => void deleteWord(selectedItem)}><Trash2 size={16} /> Xóa khỏi thư viện</button>}
            </div>
          </div>
        </> : <div className="student-vocabulary-detail-empty"><EmptyState title="Chọn một từ trong thư viện" description="Danh sách bên trái là nơi bạn chọn nhanh từ để mở chi tiết ở đây." /></div>}
      </section>
    </div>

    {/* ponytail: personal-library now owns its full student browse/detail surface; re-extract subcomponents only if another route needs the same UI. */}
  </div>;
}