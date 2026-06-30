import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CalendarDays, Search, Send, Users, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import {
  createVocabularyAssignments,
  getAssignableVocabularyForStudent,
  getAssignedVocabularyForStudent,
  getTeacherStudents,
  type AssignableDifficultyFilter,
  type AssignableSort,
} from '../services/assignments';
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

function buildAssignButtonLabel(count: number, assigning: boolean): string {
  if (assigning) return 'Đang giao từ...';
  return `Giao ${count} từ`;
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

  return <div className="page-wrap assign-page-wrap reference-layout">
    <div className="page-heading assign-page-heading compact simple">
      <div>
        <h1>Giao từ</h1>
      </div>
    </div>

    {message && <div className="form-message standalone">{message}</div>}
    {error && <div className="form-message standalone">{error}</div>}

    <section className="panel assign-reference-panel">
      <div className="assign-reference-header">
        <div>
          <h2>Giao từ</h2>
          <p>{selectedStudent ? `${selectedStudent.student_name} · ${selectedStudent.student_email}` : 'Chọn học viên để bắt đầu giao từ.'}</p>
        </div>
        {selectedStudent && <div className="assign-reference-stats">
          <div className="assign-reference-stat neutral">
            <strong>{assignedWords.length}</strong>
            <span>đã giao</span>
          </div>
          <div className="assign-reference-stat accent">
            <strong>{availableWords.length}</strong>
            <span>có thể giao</span>
          </div>
        </div>}
      </div>

      <div className="assign-reference-filters">
        <select value={selectedStudentId} onChange={(event) => {
          setSelectedStudentId(event.target.value);
          setSelectedWords([]);
          setMessage('');
        }}>
          <option value="">Chọn học viên</option>
          {students.map((student) => <option key={student.id} value={student.student_id}>{student.student_name} · {student.student_email}</option>)}
        </select>
        <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as 'unassigned' | 'recent' | AssignableDifficultyFilter)}>
          {ASSIGN_FILTER_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select value={sort} className="sort" onChange={(event) => setSort(event.target.value as AssignableSort)}>
          {ASSIGN_SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>

      {selectedStudent ? <>
        <div className="assign-reference-meta-row">
          <p>Tìm thấy <strong>{visibleWords.length}</strong> từ có thể giao</p>
          <button className="assign-reference-link" onClick={() => setMessage(`Đã giao ${assignedWords.length} từ cho ${selectedStudent.student_name}.`)}>Xem từ đã giao</button>
        </div>

        <div className="assign-reference-bulk-actions">
          <button className="btn secondary" onClick={() => quickSelect(5)}>Chọn 5 từ đầu</button>
          <button className="btn secondary" onClick={() => quickSelect(10)}>Chọn 10 từ đầu</button>
          <button className="btn secondary" onClick={() => quickSelect('all')}>Chọn tất cả</button>
          <button className="btn ghost" onClick={() => quickSelect('none')}><X size={14} /> Bỏ chọn</button>
        </div>

        <div className="assign-reference-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm từ trong kho..." />
        </div>

        {loadingWords ? <LoadingState /> : !availableWords.length ? <EmptyState title={assignedWords.length ? 'Học viên này đã được giao tất cả từ trong kho.' : 'Kho từ của bạn đang trống. Hãy nhập từ hoặc import Excel trước khi giao.'} description={assignedWords.length ? 'Hãy chọn bộ lọc khác hoặc chuyển sang học viên khác.' : 'Bạn có thể thêm từ mới ở Kho từ hoặc import Excel trước khi giao.'} /> : <div className="assign-reference-word-list">
          {visibleWords.map((word) => <label key={word.id} className="assign-reference-word-row">
            <input type="checkbox" checked={selectedWords.includes(word.dictionary_entry_id)} onChange={() => setSelectedWords((current) => toggleSelection(word.dictionary_entry_id, current))} />
            <div className="assign-reference-word-main">
              <div className="assign-reference-word-top">
                <span className="assign-reference-word-text">{word.word}</span>
                <span className="assign-reference-word-type">{word.part_of_speech ?? '—'}</span>
                <span className={`assign-reference-badge ${word.difficulty ?? 'none'}`}>{word.difficulty ? word.difficulty[0].toUpperCase() + word.difficulty.slice(1) : 'Chưa đặt độ khó'}</span>
              </div>
              <p className="assign-reference-word-def">{truncate(word.english_definition, 96)}</p>
              <p className="assign-reference-word-note">{truncate(word.note, 56)}</p>
            </div>
            <span className="assign-reference-word-date">{formatRelativeDate(word.created_at)}</span>
          </label>)}
        </div>}

        <div className="assign-reference-box">
          <p className="assign-reference-box-title">Đã chọn {selectedWords.length} từ · Giao từ cho {selectedStudent.student_name}</p>
          <div className="assign-reference-fields">
            <div className="assign-reference-field">
              <label htmlFor="assign-due-date">Due date (tùy chọn)</label>
              <input id="assign-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <div className="assign-reference-field wide">
              <label htmlFor="assign-note">Ghi chú cho học viên (tùy chọn)</label>
              <input id="assign-note" type="text" value={teacherNote} onChange={(event) => setTeacherNote(event.target.value)} placeholder="Ví dụ: ôn tập trước bài kiểm tra" />
            </div>
          </div>
          <button className="submit-btn assign-reference-submit" disabled={!selectedStudentId || !selectedWords.length || assigning} onClick={() => void assignWords()}>
            <Send size={16} /> {buildAssignButtonLabel(selectedWords.length, assigning)}
          </button>
        </div>
      </> : <div className="assign-reference-empty">
        <EmptyState title="Chọn học viên để xem các từ có thể giao." description="Sau khi chọn học viên, danh sách sẽ chỉ hiển thị các từ chưa từng giao cho học viên đó." />
      </div>}
    </section>
  </div>;
}
