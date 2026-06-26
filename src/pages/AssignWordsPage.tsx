import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { assignVocabularyToStudents, listTeacherStudents, listTeacherVocabulary } from '../services/data';
import type { TeacherStudent, TeacherVocabularyItem } from '../types';

export function AssignWordsPage() {
  const { user, profile } = useAuth();
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [words, setWords] = useState<TeacherVocabularyItem[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
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

  useEffect(() => { void load(); }, [user]);

  const filteredWords = useMemo(() => words.filter((word) => word.word.includes(query.trim().toLowerCase())), [query, words]);
  const toggle = (id: string, selected: string[], setSelected: (value: string[]) => void) => setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);

  const assign = async () => {
    if (!user || !selectedStudents.length || !selectedWords.length) return;
    setMessage('');
    await assignVocabularyToStudents(user.id, selectedStudents, selectedWords);
    setMessage(`Đã giao ${selectedWords.length} từ cho ${selectedStudents.length} học viên.`);
    setSelectedWords([]); setSelectedStudents([]);
  };

  if (profile?.role !== 'teacher') return <Navigate to="/dashboard" replace />;
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Teacher assignment</span><h1>Giao từ</h1><p>Chọn một hoặc nhiều từ trong kho và giao cho học viên.</p></div><button className="button primary" disabled={!selectedStudents.length || !selectedWords.length} onClick={() => void assign()}><Send size={17} /> Giao từ</button></div>
    {message && <div className="form-message standalone">{message}</div>}
    <section className="dashboard-grid">
      <article className="panel"><div className="panel-heading"><div><h3>Học viên</h3><p>{selectedStudents.length} đã chọn</p></div></div>{students.length ? <div className="word-list">{students.map((student) => <button key={student.id} className={selectedStudents.includes(student.student_id) ? 'selected' : ''} onClick={() => toggle(student.student_id, selectedStudents, setSelectedStudents)}><div><strong>{student.student_name}</strong><span>{student.student_email}</span></div></button>)}</div> : <EmptyState title="Chưa có học viên" description="Thêm học viên trước khi giao từ." />}</article>
      <article className="panel"><div className="panel-heading"><div><h3>Kho từ vựng</h3><p>{selectedWords.length} đã chọn</p></div></div><div className="search-bar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm từ..." /></div>{filteredWords.length ? <div className="word-list">{filteredWords.map((word) => <button key={word.id} className={selectedWords.includes(word.dictionary_entry_id) ? 'selected' : ''} onClick={() => toggle(word.dictionary_entry_id, selectedWords, setSelectedWords)}><div><strong>{word.word}</strong><span>{word.difficulty ?? 'unset'} · {word.phonetic ?? 'no phonetic'}</span></div></button>)}</div> : <EmptyState title="Kho từ trống" description="Tra cứu từ và lưu vào Kho từ vựng trước." />}</article>
    </section>
  </div>;
}
