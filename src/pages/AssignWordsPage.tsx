import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CalendarDays, CheckSquare, Search, Send, Users, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { getAssignableVocabularyForStudent, getAssignedVocabularyForStudent, getTeacherStudents, createVocabularyAssignments, type AssignableDifficultyFilter, type AssignableSort } from '../services/assignments';
import type { TeacherStudent, TeacherVocabularyItem, VocabularyAssignment } from '../types';

const ASSIGN_FILTER_OPTIONS: Array<{ value: 'unassigned' | 'recent' | AssignableDifficultyFilter; label: string }> = [
  { value: 'unassigned', label: 'Từ chưa giao' },
  { value: 'recent', label: 'Từ mới thêm' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'unset', label: 'Chưa đặt độ khó' },
];

const ASSIGN_SORT_OPTIONS: Array<{ value: AssignableSort; label: string }> = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'az', label: 'A-Z' },
  { value: 'difficulty', label: 'Độ khó' },
];

function formatRelativeDate(value: string): string {
  const target = new Date(value);
  const targetTime = target.getTime();
  if (Number.isNaN(targetTime)) return value;
  const diffDays = Math.floor((Date.now() - targetTime) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return 'hôm nay';
  if (diffDays === 1) return '1 ngày trước';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return target.toLocaleDateString('vi-VN');
}

function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '—';
  return text.length <= maxLength ? text : `${text.slice(0, maxLength).trim()}…`;
}

function toggleSelection(id: string, selected: string[]): string[] {
  return selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
}

function buildAssignSuccessMessage(createdAssignments: number, studentName: string, skippedCount: number): string {
  if (skippedCount > 0) {
    return `Đã giao ${createdAssignments} từ mới cho ${studentName}. Bỏ qua ${skippedCount} từ đã được giao trước đó.`;
  }
  return `Đã giao ${createdAssignments} từ cho ${studentName}.`;
}

export function AssignWordsPage() {
  const { user, profile } = useAuth();
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [assignedWords, setAssignedWords] = useState<VocabularyAssignment[]>([]);
  const [availableWords, setAvailableWords] = useState<TeacherVocabularyItem[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'unassigned' | 'recent' | AssignableDifficultyFilter>('unassigned');
  const [sort, setSort] = useState<AssignableSort>('newest');
  const [teacherNote, setTeacherNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingWords, setLoadingWords] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  const selectedStudent = students.find((student) => student.student_id === selectedStudentId) ?? null;

  useEffect(() => {
    if (!user) return;
    let active = true;

    const loadStudents = async () => {
      setLoading(true);
      setError('');
      try {
        const teacherStudents = await getTeacherStudents(user.id);
        if (!active) return;
        setStudents(teacherStudents);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không tải được danh sách học viên.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadStudents();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedStudentId) {
      setAssignedWords([]);
      setAvailableWords([]);
      setSelectedWords([]);
      return;
    }

    let active = true;

    const loadAssignableWords = async () => {
      setLoadingWords(true);
      setError('');
      try {
        const [assignable, assigned] = await Promise.all([
          getAssignableVocabularyForStudent(user.id, selectedStudentId, {
            search: query,
            difficulty: activeFilter === 'recent' || activeFilter === 'unassigned' ? 'all' : activeFilter,
            onlyRecent: activeFilter === 'recent',
            sort,
          }),
          getAssignedVocabularyForStudent(selectedStudentId),
        ]);

        if (!active) return;
        setAvailableWords(assignable.availableWords);
        setAssignedWords(assigned);
        setSelectedWords((current) => current.filter((id) => assignable.availableWords.some((word) => word.dictionary_entry_id === id)));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không tải được danh sách từ có thể giao.');
      } finally {
        if (active) setLoadingWords(false);
      }
    };

    void loadAssignableWords();
    return () => {
      active = false;
    };
  }, [activeFilter, query, selectedStudentId, sort, user]);

  const visibleWords = useMemo(() => availableWords, [availableWords]);

  const quickSelect = (count: number | 'all' | 'none') => {
    if (count === 'none') {
      setSelectedWords([]);
      return;
    }
    const nextWords = count === 'all' ? visibleWords : visibleWords.slice(0, count);
    setSelectedWords(nextWords.map((word) => word.dictionary_entry_id));
  };

  const assignWords = async () => {
    if (!user || !selectedStudentId || !selectedWords.length || !selectedStudent) return;
    setAssigning(true);
    setMessage('');
    setError('');
    try {
      const result = await createVocabularyAssignments({
        teacherId: user.id,
        studentIds: [selectedStudentId],
        dictionaryEntryIds: selectedWords,
        note: teacherNote,
        dueDate: dueDate || null,
      });
      setMessage(buildAssignSuccessMessage(result.createdAssignments, selectedStudent.student_name, result.skippedExistingAssignments));
      setSelectedWords([]);
      setTeacherNote('');
      setDueDate('');
      const [assignable, assigned] = await Promise.all([
        getAssignableVocabularyForStudent(user.id, selectedStudentId, {
          search: query,
          difficulty: activeFilter === 'recent' || activeFilter === 'unassigned' ? 'all' : activeFilter,
          onlyRecent: activeFilter === 'recent',
          sort,
        }),
        getAssignedVocabularyForStudent(selectedStudentId),
      ]);
      setAvailableWords(assignable.availableWords);
      setAssignedWords(assigned);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không giao được từ cho học viên.');
    } finally {
      setAssigning(false);
    }
  };

  if (profile?.role !== 'teacher') return <Navigate to="/dashboard" replace />;
  if (loading) return <LoadingState />;
  if (error && !students.length) return <ErrorState message={error} retry={() => window.location.reload()} />;

  return <div className="page-wrap assign-page-wrap">
    <div className="page-heading assign-page-heading">
      <div>
        <span>Teacher assignment</span>
        <h1>Giao từ</h1>
        <p>Chọn học viên, lọc từ phù hợp và giao một nhóm từ trong kho của bạn.</p>
      </div>
    </div>

    {message && <div className="form-message standalone">{message}</div>}
    {error && <div className="form-message standalone">{error}</div>}

    <section className="panel assign-step-card">
      <div className="assign-step-header">
        <h2>Bước 1 — Chọn học viên</h2>
        <p>Chọn một học viên để xem các từ có thể giao.</p>
      </div>
      <div className="assign-student-selector">
        <select value={selectedStudentId} onChange={(event) => {
          setSelectedStudentId(event.target.value);
          setSelectedWords([]);
          setMessage('');
        }}>
          <option value="">Chọn học viên</option>
          {students.map((student) => <option key={student.id} value={student.student_id}>{student.student_name} · {student.student_email}</option>)}
        </select>
        {selectedStudent && <div className="assign-student-summary"><Users size={16} /> Đã giao: {assignedWords.length} từ · Có thể giao: {availableWords.length} từ</div>}
      </div>
    </section>

    {!selectedStudent ? <section className="panel assign-empty-panel">
      <EmptyState title="Chọn học viên để xem các từ có thể giao." description="Sau khi chọn học viên, danh sách sẽ chỉ hiển thị các từ chưa từng giao cho học viên đó." />
    </section> : <>
      <section className="panel assign-filter-card">
        <div className="assign-step-header compact">
          <h2>Bước 2 — Bộ lọc từ</h2>
        </div>
        <div className="filter-row assign-filter-row">
          {ASSIGN_FILTER_OPTIONS.map((item) => <button key={item.value} className={activeFilter === item.value ? 'active' : ''} onClick={() => setActiveFilter(item.value)}>{item.label}</button>)}
        </div>
        <div className="assign-filter-toolbar">
          <div className="search-bar panel assign-search-bar"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm từ trong kho..." /></div>
          <select value={sort} onChange={(event) => setSort(event.target.value as AssignableSort)}>
            {ASSIGN_SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </section>

      <section className="panel assign-list-card">
        <div className="assign-list-header">
          <div>
            <h3>Tìm thấy {visibleWords.length} từ có thể giao</h3>
            <p>Các từ đã giao cho học viên này sẽ không xuất hiện lại trong danh sách.</p>
          </div>
          <button className="button secondary small" onClick={() => setMessage(`Đã giao ${assignedWords.length} từ cho ${selectedStudent.student_name}.`)}>Xem từ đã giao</button>
        </div>

        <div className="assign-quick-actions">
          <button className="button secondary small" onClick={() => quickSelect(5)}>Chọn 5 từ đầu</button>
          <button className="button secondary small" onClick={() => quickSelect(10)}>Chọn 10 từ đầu</button>
          <button className="button secondary small" onClick={() => quickSelect('all')}>Chọn tất cả đang lọc</button>
          <button className="button secondary small" onClick={() => quickSelect('none')}><X size={14} /> Bỏ chọn</button>
        </div>

        {loadingWords ? <LoadingState /> : !availableWords.length ? <EmptyState title={assignedWords.length ? 'Học viên này đã được giao tất cả từ trong kho.' : 'Kho từ của bạn đang trống. Hãy nhập từ hoặc import Excel trước khi giao.'} description={assignedWords.length ? 'Hãy chọn bộ lọc khác hoặc chuyển sang học viên khác.' : 'Bạn có thể thêm từ mới ở Kho từ hoặc import Excel trước khi giao.'} /> : <div className="assign-word-table-wrap">
          <div className="assign-word-table-head">
            <span />
            <span>Word</span>
            <span>Loại từ</span>
            <span>Độ khó</span>
            <span>Ghi chú</span>
            <span>Thêm vào</span>
            <span>Định nghĩa</span>
          </div>
          <div className="assign-word-table-body">
            {visibleWords.map((word) => <button key={word.id} className={`assign-word-table-row ${selectedWords.includes(word.dictionary_entry_id) ? 'selected' : ''}`} onClick={() => setSelectedWords((current) => toggleSelection(word.dictionary_entry_id, current))}>
              <span><input type="checkbox" checked={selectedWords.includes(word.dictionary_entry_id)} onChange={() => setSelectedWords((current) => toggleSelection(word.dictionary_entry_id, current))} onClick={(event) => event.stopPropagation()} /></span>
              <strong>{word.word}</strong>
              <span>{word.part_of_speech ?? '—'}</span>
              <span>{word.difficulty ?? 'Chưa đặt'}</span>
              <span>{truncate(word.note, 42)}</span>
              <span>{formatRelativeDate(word.created_at)}</span>
              <span>{truncate(word.english_definition, 72)}</span>
            </button>)}
          </div>
        </div>}
      </section>

      <section className="panel assign-footer-card">
        <div className="assign-footer-summary">
          <strong>Đã chọn {selectedWords.length} từ</strong>
          <p>Giao từ cho {selectedStudent.student_name}</p>
        </div>
        <div className="assign-footer-fields">
          <label>
            <span><CalendarDays size={15} /> Due date (optional)</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
          <label>
            <span>Teacher note optional</span>
            <textarea value={teacherNote} onChange={(event) => setTeacherNote(event.target.value)} placeholder="Ghi chú ngắn cho nhóm từ này..." rows={2} />
          </label>
        </div>
        <button className="button primary" disabled={!selectedStudentId || !selectedWords.length || assigning} onClick={() => void assignWords()}>
          <Send size={17} /> {assigning ? 'Đang giao từ...' : 'Giao từ'}
        </button>
      </section>
    </>}
  </div>;
}
