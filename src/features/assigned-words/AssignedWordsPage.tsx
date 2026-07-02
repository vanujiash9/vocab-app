import './assigned-words.css';
import { ChevronDown, Search, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState';
import { useAuth } from '../../contexts/AuthContext';
import { listAssignmentsForStudent } from '../../services/teacher';
import type { VocabularyAssignment, VocabularyStatus } from '../../types';

const STATUS_LABELS: Record<'all' | VocabularyStatus, string> = {
  all: 'Tất cả',
  new: 'Mới',
  learning: 'Đang học',
  known: 'Đã thuộc',
  difficult: 'Khó nhớ',
};

const STATUS_ORDER: VocabularyStatus[] = ['new', 'learning', 'known', 'difficult'];

const DATE_FILTERS = ['all', 'today', 'recent', 'older'] as const;
type DateFilter = (typeof DATE_FILTERS)[number];

interface AssignmentGroup {
  key: string;
  label: string;
  assignedAt: string;
  items: VocabularyAssignment[];
}

function includesQuery(item: { word: string; englishDefinition: string; vietnameseMeaning: string }, query: string): boolean {
  const text = `${item.word} ${item.englishDefinition} ${item.vietnameseMeaning}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function getSummaryItems(items: VocabularyAssignment[]) {
  return [
    { value: items.length, label: 'Được giao' },
    { value: items.filter((item) => item.status === 'learning').length, label: 'Đang học' },
    { value: items.filter((item) => item.status === 'new').length, label: 'Mới' },
  ];
}

function getDueAt(item: VocabularyAssignment): string | null {
  return typeof item.due_at === 'string' && item.due_at.trim() ? item.due_at : null;
}

function formatCompactDate(value: string | null): string | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return new Date(value).toLocaleDateString('vi-VN');
}

function getAssignedMeta(item: VocabularyAssignment): string {
  const dueAt = getDueAt(item);
  if (dueAt) {
    return `Hạn ${new Date(dueAt).toLocaleDateString('vi-VN')}`;
  }
  return `Giao ${new Date(item.assigned_at).toLocaleDateString('vi-VN')}`;
}

function getAssignedSubline(item: VocabularyAssignment): string {
  const dueLabel = formatCompactDate(getDueAt(item));
  const assignedLabel = formatCompactDate(item.assigned_at);
  return [item.part_of_speech, dueLabel ? `Hạn ${dueLabel}` : assignedLabel ? `Giao ${assignedLabel}` : 'Từ giáo viên'].filter(Boolean).join(' · ');
}

function getPreviewMeaning(item: VocabularyAssignment): string {
  return item.vietnamese_meaning || `EN: ${item.english_definition}`;
}

function playAudio(url: string | null) {
  if (!url) return;
  void new Audio(url).play();
}

function toDateFilter(item: VocabularyAssignment): DateFilter {
  const assignedTime = new Date(item.assigned_at).getTime();
  if (Number.isNaN(assignedTime)) return 'older';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const threeDaysAgo = startOfToday - (3 * 24 * 60 * 60 * 1000);

  if (assignedTime >= startOfToday) return 'today';
  if (assignedTime >= threeDaysAgo) return 'recent';
  return 'older';
}

function getDateFilterLabel(value: DateFilter): string {
  if (value === 'today') return 'Hôm nay';
  if (value === 'recent') return '3 ngày gần đây';
  if (value === 'older') return 'Cũ hơn';
  return 'Tất cả ngày';
}

function buildAssignmentGroups(items: VocabularyAssignment[]): AssignmentGroup[] {
  const byDay = new Map<string, VocabularyAssignment[]>();

  items.forEach((item) => {
    const dayKey = new Date(item.assigned_at).toISOString().slice(0, 10);
    const current = byDay.get(dayKey) ?? [];
    byDay.set(dayKey, [...current, item]);
  });

  return [...byDay.entries()]
    .sort((left, right) => new Date(right[0]).getTime() - new Date(left[0]).getTime())
    .map(([key, groupItems]) => {
      const sortedItems = [...groupItems].sort((left, right) => new Date(right.assigned_at).getTime() - new Date(left.assigned_at).getTime());
      return {
        key,
        label: `Lần giao ${formatCompactDate(sortedItems[0]?.assigned_at) ?? key}`,
        assignedAt: sortedItems[0]?.assigned_at ?? key,
        items: sortedItems,
      };
    });
}

function getStatusCounts(items: VocabularyAssignment[]) {
  return STATUS_ORDER.map((status) => ({
    status,
    count: items.filter((item) => item.status === status).length,
  })).filter((entry) => entry.count > 0);
}

export function AssignedWordsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<VocabularyAssignment[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | VocabularyStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await listAssignmentsForStudent(user.id);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được từ giáo viên giao.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);

  const filtered = useMemo(() => items.filter((item) => {
    const matchesText = !query.trim() || includesQuery({
      word: item.word,
      englishDefinition: item.english_definition,
      vietnameseMeaning: item.vietnamese_meaning,
    }, query);
    const matchesStatus = filter === 'all' || item.status === filter;
    const matchesDate = dateFilter === 'all' || toDateFilter(item) === dateFilter;
    return matchesText && matchesStatus && matchesDate;
  }), [dateFilter, filter, items, query]);

  const summaryItems = useMemo(() => getSummaryItems(items), [items]);
  const groups = useMemo(() => buildAssignmentGroups(filtered), [filtered]);

  useEffect(() => {
    if (!groups.length) {
      setOpenGroupKey(null);
      return;
    }
    setOpenGroupKey((current) => current && groups.some((group) => group.key === current) ? current : groups[0]?.key ?? null);
  }, [groups]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap student-vocabulary-page-wrap">
    <div className="page-heading student-vocabulary-page-heading compact">
      <div>
        <span>Bài được giao</span>
        <h1>Từ giáo viên</h1>
      </div>
      <div className="assigned-words-header-stats" aria-label="Tổng quan từ giáo viên giao">
        {summaryItems.map((item) => <div key={item.label} className="assigned-words-header-stat">
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>)}
      </div>
    </div>

    <section className="panel assigned-words-stack">
      <div className="assigned-words-toolbar">
        <div className="search-bar assigned-words-search-bar">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong từ giáo viên giao..." />
        </div>

        <div className="assigned-words-filter-groups">
          <div className="filter-row assigned-words-filter-row" role="tablist" aria-label="Lọc trạng thái từ giáo viên giao">
            {(['all', 'new', 'learning', 'known', 'difficult'] as const).map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{STATUS_LABELS[value]}</button>)}
          </div>
          <div className="assigned-words-filter-divider" aria-hidden="true" />
          <div className="filter-row assigned-words-filter-row" role="tablist" aria-label="Lọc ngày giao từ giáo viên">
            {DATE_FILTERS.map((value) => <button key={value} className={dateFilter === value ? 'active' : ''} onClick={() => setDateFilter(value)}>{getDateFilterLabel(value)}</button>)}
          </div>
        </div>
      </div>

      <div className="assigned-words-summary-strip">
        <span>{filtered.length} từ · {groups.length} lần giao đang hiển thị</span>
      </div>

      {groups.length ? <div className="assigned-words-group-list">
        {groups.map((group) => {
          const isOpen = openGroupKey === group.key;
          const statusCounts = getStatusCounts(group.items);

          return <section key={group.key} className="assigned-word-group panel">
            <button className={`assigned-word-group-toggle ${isOpen ? 'open' : ''}`} onClick={() => setOpenGroupKey(isOpen ? null : group.key)} aria-expanded={isOpen}>
              <div className="assigned-word-group-toggle-copy">
                <div className="assigned-word-group-toggle-headline">
                  <strong>{group.label}</strong>
                  <span className="assigned-word-group-count">{group.items.length} từ</span>
                </div>
                <div className="assigned-word-group-composition" role="img" aria-label={statusCounts.map((entry) => `${STATUS_LABELS[entry.status]}: ${entry.count}`).join(', ')}>
                  {statusCounts.map((entry) => <span
                    key={entry.status}
                    className={`assigned-word-group-composition-segment status-${entry.status}`}
                    style={{ flexGrow: entry.count }}
                  />)}
                </div>
              </div>
              <div className="assigned-word-group-toggle-meta">
                <span>{formatCompactDate(group.assignedAt) ?? group.key}</span>
                <ChevronDown size={18} />
              </div>
            </button>

            {!isOpen ? <div className="assigned-word-group-empty">
              <p>Xem nhanh các từ trong lượt giao này:</p>
              <div className="assigned-words-group-preview">{group.items.slice(0, 3).map((item) => <span key={item.id}>{item.word}</span>)}{group.items.length > 3 ? <span className="assigned-words-group-more">+{group.items.length - 3} từ khác</span> : null}</div>
            </div> : <div className="assigned-words-card-list" role="list" aria-label={`Danh sách từ của ${group.label}`}>
              {group.items.map((item) => <article key={item.id} className="assigned-word-card" role="listitem">
                <div className="assigned-word-card-top">
                  <div className="assigned-word-card-title">
                    <div className="assigned-word-card-headline">
                      <strong>{item.word}</strong>
                      <span className={`status ${item.status}`}>{STATUS_LABELS[item.status]}</span>
                    </div>
                    <p>{getAssignedSubline(item)}</p>
                  </div>
                  <button className="icon-button" onClick={() => playAudio(item.audio_url)} disabled={!item.audio_url} aria-label={`Nghe phát âm từ ${item.word}`}>
                    <Volume2 size={19} />
                  </button>
                </div>

                <div className="assigned-word-card-body">
                  <div className="assigned-word-card-section">
                    <strong>Nghĩa</strong>
                    <p>{getPreviewMeaning(item)}</p>
                  </div>

                  {item.examples[0] ? <div className="assigned-word-card-section">
                    <strong>Ví dụ</strong>
                    <p>{item.examples[0]}</p>
                  </div> : null}

                  {item.note ? <div className="assigned-word-card-section assigned-word-card-note">
                    <strong>Ghi chú</strong>
                    <p>{item.note}</p>
                  </div> : null}
                </div>

                <div className="assigned-word-card-footer">
                  <span className="assigned-word-card-meta">{getAssignedMeta(item)}</span>
                </div>
              </article>)}
            </div>}
          </section>;
        })}
      </div> : <div className="student-vocabulary-empty-panel assigned-words-empty-panel">
        <EmptyState title="Chưa có từ giáo viên giao phù hợp" description="Bạn chưa có lượt giao phù hợp với bộ lọc hiện tại hoặc giáo viên chưa giao từ mới cho bạn." />
        <div className="compact-list">
          <div><strong>Mẹo</strong><span>Đổi bộ lọc về “Tất cả” để xem toàn bộ lượt giao nếu có.</span></div>
          <div><strong>Học tiếp</strong><span>Các từ được giao cũng đã đi vào thư viện học chung và có thể xuất hiện trong phần ôn tập.</span></div>
        </div>
        <div className="assigned-words-assist-text"><p>Nếu bạn vừa được giao từ mà chưa thấy ở đây, hãy mở <Link to="/notifications">Thông báo</Link> hoặc tải lại trang sau ít giây.</p></div>
        <div className="status-actions">
          <Link className="button secondary" to="/library">Mở thư viện cá nhân</Link>
          <Link className="button primary" to="/review?source=assigned">Ôn từ được giao</Link>
        </div>
      </div>}
    </section>
  </div>;
}

// ponytail: groups are inferred from assigned_at because the schema has no assignment batch id yet; replace with a real batch field when the backend supports it.