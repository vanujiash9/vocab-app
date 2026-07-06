import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Search, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { assignVocabularyToStudents, listTeacherStudents, listTeacherVocabulary } from '../services/data';
import type { TeacherStudent, TeacherVocabularyItem } from '../types';

function StepBadge({ step, active }: { step: number; active: boolean }) {
  return <span className={`assign-step-badge ${active ? 'active' : ''}`}>{step}</span>;
}

function SearchToolbar({ query, onChange }: { query: string; onChange: (value: string) => void }) {
  return <div className="search-bar"><Search size={16} /><input value={query} onChange={(event) => onChange(event.target.value)} placeholder="Tìm từ..." /></div>;
}

function SelectedCount({ count }: { count: number }) {
  return <span className="role-pill">{count} đã chọn</span>;
}

function SectionHeader({ title, count, description }: { title: string; count: number; description: string }) {
  return <div className="panel-heading"><div><h3>{title}</h3><p>{description}</p></div><SelectedCount count={count} /></div>;
}

function StudentPanel({ students, selectedStudents, onToggle, onNavigate }: { students: TeacherStudent[]; selectedStudents: string[]; onToggle: (studentId: string) => void; onNavigate: () => void }) {
  if (!students.length) {
    return <article className="panel"><SectionHeader title="1. Chọn học viên" count={selectedStudents.length} description="Bắt đầu từ đúng nhóm người nhận." /><EmptyState title="Chưa có học viên" description="Thêm học viên trước khi giao từ để flow giao bài không bị ngắt quãng." primaryAction={{ label: 'Mở màn Học viên', onClick: onNavigate }} /></article>;
  }

  return <article className="panel"><SectionHeader title="1. Chọn học viên" count={selectedStudents.length} description="Bắt đầu từ đúng nhóm người nhận." /><div className="word-list">{students.map((student) => <button key={student.id} className={selectedStudents.includes(student.student_id) ? 'selected' : ''} onClick={() => onToggle(student.student_id)}><div><strong>{student.student_name}</strong><span>{student.student_email}</span></div></button>)}</div></article>;
}

function WordsPanel({ words, selectedWords, query, onQueryChange, onToggle, onNavigate }: { words: TeacherVocabularyItem[]; selectedWords: string[]; query: string; onQueryChange: (value: string) => void; onToggle: (wordId: string) => void; onNavigate: () => void }) {
  if (!words.length) {
    return <article className="panel"><SectionHeader title="2. Chọn từ" count={selectedWords.length} description="Lọc và chọn đúng nhóm từ cần giao." /><EmptyState title="Kho từ trống" description="Tra cứu từ và lưu vào Kho từ vựng trước khi tạo một đợt giao mới." primaryAction={{ label: 'Tra cứu từ mới', onClick: onNavigate }} /></article>;
  }

  return <article className="panel"><SectionHeader title="2. Chọn từ" count={selectedWords.length} description="Lọc và chọn đúng nhóm từ cần giao." /><SearchToolbar query={query} onChange={onQueryChange} /><div className="word-list">{words.map((word) => <button key={word.id} className={selectedWords.includes(word.dictionary_entry_id) ? 'selected' : ''} onClick={() => onToggle(word.dictionary_entry_id)}><div><strong>{word.word}</strong><span>{word.difficulty ?? 'Chưa gắn mức'}{word.phonetic ? ` · ${word.phonetic}` : ''}</span></div></button>)}</div></article>;
}

function AssignSummary({ selectedStudentsCount, selectedWordsCount, canAssign, actionLabel, onAssign }: { selectedStudentsCount: number; selectedWordsCount: number; canAssign: boolean; actionLabel: string; onAssign: () => void }) {
  return <aside className="assign-summary-card compact"><div className="assign-summary-head compact"><div><span className="eyebrow assign-eyebrow">Xác nhận</span><h3>Đợt giao hiện tại</h3><p>Một bề mặt xác nhận duy nhất để kiểm tra nhanh trước khi gửi.</p></div><button className="button primary" disabled={!canAssign} onClick={onAssign}><Send size={16} /> {actionLabel}</button></div><div className="assign-summary-stats compact"><div><strong>{selectedStudentsCount}</strong><span>Học viên</span></div><div><strong>{selectedWordsCount}</strong><span>Từ</span></div></div><div className="assign-step-list compact"><div><StepBadge step={1} active={selectedStudentsCount > 0} /><span>Chọn đúng nhóm học viên.</span></div><div><StepBadge step={2} active={selectedWordsCount > 0} /><span>Giữ lại đúng các từ cần giao.</span></div><div><StepBadge step={3} active={canAssign} /><span>Gửi một lần khi mọi thứ đã sẵn sàng.</span></div></div></aside>;
}

function AssignHeading({ canAssign, actionLabel, onAssign, onImport }: { canAssign: boolean; actionLabel: string; onAssign: () => void; onImport: () => void }) {
  return <div className="page-heading assign-page-heading"><div><span>Teacher assignment</span><h1>Giao từ</h1><p>Chọn học viên, chọn từ rồi xác nhận trong một flow ngắn gọn.</p></div><div className="assign-heading-actions"><button className="button secondary" onClick={onImport}><FileSpreadsheet size={17} /> Import Excel</button><button className="button primary" disabled={!canAssign} onClick={onAssign}><Send size={17} /> {actionLabel}</button></div></div>;
}

function getFilteredWords(words: TeacherVocabularyItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return words;
  return words.filter((word) => word.word.toLowerCase().includes(normalizedQuery));
}

export function AssignWordsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [words, setWords] = useState<TeacherVocabularyItem[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');

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

  const filteredWords = useMemo(() => getFilteredWords(words, query), [query, words]);
  const canAssign = selectedStudents.length > 0 && selectedWords.length > 0;
  const canSubmit = canAssign && !submitting;
  const assignLabel = submitting ? 'Đang giao từ...' : 'Giao từ';
  const summaryAssignLabel = submitting ? 'Đang giao từ...' : 'Giao ngay';

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((current) => current.includes(studentId) ? current.filter((item) => item !== studentId) : [...current, studentId]);
  };

  const toggleWord = (wordId: string) => {
    setSelectedWords((current) => current.includes(wordId) ? current.filter((item) => item !== wordId) : [...current, wordId]);
  };

  const assign = async () => {
    if (!user || !canAssign || submitting) return;
    setMessage('');
    setSubmitError('');
    setSubmitting(true);
    try {
      await assignVocabularyToStudents(user.id, selectedStudents, selectedWords);
      setMessage(`Đã giao ${selectedWords.length} từ cho ${selectedStudents.length} học viên.`);
      setSelectedStudents([]);
      setSelectedWords([]);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không thể giao từ trong lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Đang chuẩn bị dữ liệu cho đợt giao từ..." />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap assign-page-wrap"><AssignHeading canAssign={canSubmit} actionLabel={assignLabel} onAssign={() => void assign()} onImport={() => navigate('/import-excel')} />{message && <div className="form-message standalone">{message}</div>}{submitError && <div className="form-message standalone">{submitError}</div>}<section className="assign-hero-grid compact"><div className="assign-grid compact"><StudentPanel students={students} selectedStudents={selectedStudents} onToggle={toggleStudent} onNavigate={() => navigate('/students')} /><WordsPanel words={filteredWords} selectedWords={selectedWords} query={query} onQueryChange={setQuery} onToggle={toggleWord} onNavigate={() => navigate('/lookup')} /></div><AssignSummary selectedStudentsCount={selectedStudents.length} selectedWordsCount={selectedWords.length} canAssign={canSubmit} actionLabel={summaryAssignLabel} onAssign={() => void assign()} /></section></div>;
}
