import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Send } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { assignVocabularyToStudents, listTeacherStudents, listTeacherVocabulary } from '../services/data';
import type { TeacherStudent, TeacherVocabularyItem } from '../types';

interface AssignWordsLocationState {
  selectedWords?: string[];
}

function isAssignWordsLocationState(value: unknown): value is AssignWordsLocationState {
  if (!value || typeof value !== 'object') return false;
  const selectedWords = (value as AssignWordsLocationState).selectedWords;
  return selectedWords === undefined || (Array.isArray(selectedWords) && selectedWords.every((item) => typeof item === 'string'));
}

function includesQuery(word: TeacherVocabularyItem, query: string): boolean {
  return word.word.toLowerCase().includes(query.trim().toLowerCase());
}

function uniqueIds(values: string[]): string[] {
  return [...new Set(values)];
}

function selectInitialWords(words: TeacherVocabularyItem[], selectedWords: string[]): string[] {
  const available = new Set(words.map((word) => word.dictionary_entry_id));
  return uniqueIds(selectedWords.filter((item) => available.has(item)));
}

function buildAssignSuccessMessage(wordCount: number, studentCount: number): string {
  return `Đã giao ${wordCount} từ cho ${studentCount} học viên.`;
}

function buildAssignErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Không giao được từ cho học viên.';
}

function getLocationSelectedWords(state: unknown): string[] {
  if (!isAssignWordsLocationState(state)) return [];
  return state.selectedWords ?? [];
}

function toggleSelection(id: string, selected: string[]): string[] {
  return selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
}

function matchesSelection(current: string[], next: string[]): boolean {
  return current.length === next.length && current.every((item, index) => item === next[index]);
}

export function AssignWordsPage() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [words, setWords] = useState<TeacherVocabularyItem[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const preselectedWords = getLocationSelectedWords(location.state);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [studentData, wordData] = await Promise.all([listTeacherStudents(user.id), listTeacherVocabulary(user.id)]);
      setStudents(studentData);
      setWords(wordData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu giao từ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  useEffect(() => {
    if (!words.length || !preselectedWords.length) return;
    const nextSelectedWords = selectInitialWords(words, preselectedWords);
    setSelectedWords((current) => matchesSelection(current, nextSelectedWords) ? current : nextSelectedWords);
  }, [preselectedWords, words]);

  const filteredWords = useMemo(() => words.filter((word) => includesQuery(word, query)), [query, words]);

  const assign = async () => {
    if (!user || !selectedStudents.length || !selectedWords.length) return;
    setMessage('');
    setError('');
    try {
      await assignVocabularyToStudents(user.id, selectedStudents, selectedWords);
      setMessage(buildAssignSuccessMessage(selectedWords.length, selectedStudents.length));
      setSelectedWords([]);
      setSelectedStudents([]);
    } catch (err) {
      setError(buildAssignErrorMessage(err));
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((current) => toggleSelection(studentId, current));
  };

  const toggleWord = (dictionaryEntryId: string) => {
    setSelectedWords((current) => toggleSelection(dictionaryEntryId, current));
  };

  const selectedWordLabel = preselectedWords.length && selectedWords.length
    ? `${selectedWords.length} đã chọn từ Kho từ`
    : `${selectedWords.length} đã chọn`;

  // ponytail: only internal route-state preselection is supported; move to search params if deep links are needed later.

  if (profile?.role !== 'teacher') return <Navigate to="/dashboard" replace />;
  if (loading) return <LoadingState />;
  if (error && !students.length && !words.length) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Teacher assignment</span><h1>Giao từ</h1><p>Chọn một hoặc nhiều từ trong kho và giao cho học viên.</p></div><button className="button primary" disabled={!selectedStudents.length || !selectedWords.length} onClick={() => void assign()}><Send size={17} /> Giao từ</button></div>
    {message && <div className="form-message standalone">{message}</div>}
    {error && <div className="form-message standalone">{error}</div>}
    <section className="dashboard-grid">
      <article className="panel"><div className="panel-heading"><div><h3>Học viên</h3><p>{selectedStudents.length} đã chọn</p></div></div>{students.length ? <div className="word-list">{students.map((student) => <button key={student.id} className={selectedStudents.includes(student.student_id) ? 'selected' : ''} onClick={() => toggleStudent(student.student_id)}><div><strong>{student.student_name}</strong><span>{student.student_email}</span></div></button>)}</div> : <EmptyState title="Chưa có học viên" description="Thêm học viên trước khi giao từ." />}</article>
      <article className="panel"><div className="panel-heading"><div><h3>Kho từ vựng</h3><p>{selectedWordLabel}</p></div></div><div className="search-bar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm từ..." /></div>{filteredWords.length ? <div className="word-list">{filteredWords.map((word) => <button key={word.id} className={selectedWords.includes(word.dictionary_entry_id) ? 'selected' : ''} onClick={() => toggleWord(word.dictionary_entry_id)}><div><strong>{word.word}</strong><span>{word.difficulty ?? 'unset'} · {word.phonetic ?? 'no phonetic'}</span></div></button>)}</div> : <EmptyState title="Kho từ trống" description="Tra cứu từ và lưu vào Kho từ vựng trước." />}</article>
    </section>
  </div>;
}
