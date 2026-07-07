import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, Volume2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import {
  deleteStudentVocabulary,
  listStudentVocabulary,
  listTeacherVocabulary,
  updateStudentVocabularyNote,
  updateStudentVocabularyStatus,
  updateTeacherVocabularyDifficulty,
  updateTeacherVocabularyNote,
} from '../services/data';
import type { StudentVocabularyItem, TeacherVocabularyDifficulty, TeacherVocabularyItem, VocabularyStatus } from '../types';

type StudentFilter = 'all' | VocabularyStatus;
type TeacherFilter = 'all' | 'unset' | TeacherVocabularyDifficulty;

const studentFilters: StudentFilter[] = ['all', 'new', 'learning', 'known', 'difficult'];
const teacherFilters: TeacherFilter[] = ['all', 'unset', 'easy', 'medium', 'hard'];

function includesQuery(item: { word: string; english_definition: string; vietnamese_meaning: string }, query: string): boolean {
  const text = `${item.word} ${item.english_definition} ${item.vietnamese_meaning}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function playAudio(url: string | null) {
  if (!url) return;
  void new Audio(url).play();
}

function WordMeta({ item }: { item: StudentVocabularyItem | TeacherVocabularyItem }) {
  return <>
    <div className="detail-title"><div><h2>{item.word}</h2><p>{item.phonetic || '/phonetic/'}{item.part_of_speech ? ` · ${item.part_of_speech}` : ''}</p></div><button className="icon-button" onClick={() => playAudio(item.audio_url)} disabled={!item.audio_url} aria-label="Nghe phát âm"><Volume2 size={19} /></button></div>
    <div className="detail-block"><h4>Nghĩa tiếng Việt</h4><p>{item.vietnamese_meaning}</p></div>
    <div className="detail-block"><h4>Định nghĩa tiếng Anh</h4><p>{item.english_definition}</p></div>
    <div className="detail-block"><h4>Ví dụ</h4>{item.examples.length ? <ul>{item.examples.slice(0, 3).map((example) => <li key={example}>{example}</li>)}</ul> : <p>Chưa có ví dụ.</p>}</div>
    {item.synonyms.length > 0 && <div className="detail-block"><h4>Synonyms</h4><p>{item.synonyms.slice(0, 12).join(', ')}</p></div>}
    {item.antonyms.length > 0 && <div className="detail-block"><h4>Antonyms</h4><p>{item.antonyms.slice(0, 12).join(', ')}</p></div>}
  </>;
}

export function LibraryPage() {
  const { profile } = useAuth();
  return profile?.role === 'teacher' ? <TeacherVocabularyStore /> : <StudentLibrary />;
}

function StudentLibrary() {
  const { user } = useAuth();
  const [items, setItems] = useState<StudentVocabularyItem[]>([]);
  const [selected, setSelected] = useState<StudentVocabularyItem | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StudentFilter>('all');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const data = await listStudentVocabulary(user.id);
      setItems(data);
      const nextSelected = selected ? data.find((item) => item.id === selected.id) ?? null : data[0] ?? null;
      setSelected(nextSelected);
      setNote(nextSelected?.personal_note ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được thư viện từ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);

  const filtered = useMemo(() => items.filter((item) =>
    (filter === 'all' || item.status === filter) && (!query.trim() || includesQuery(item, query)),
  ), [filter, items, query]);

  const selectItem = (item: StudentVocabularyItem) => {
    setSelected(item);
    setNote(item.personal_note ?? '');
  };

  const changeStatus = async (status: VocabularyStatus) => {
    if (!selected) return;
    await updateStudentVocabularyStatus(selected.id, status);
    await load();
  };

  const saveNote = async () => {
    if (!selected) return;
    await updateStudentVocabularyNote(selected.id, note);
    await load();
  };

  const deleteWord = async () => {
    if (!selected) return;
    await deleteStudentVocabulary(selected.id);
    setSelected(null);
    setNote('');
    await load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Student library</span><h1>Thư viện từ</h1><p>Tìm kiếm, ghi chú và phân loại từ đã lưu từ trang Tra cứu từ.</p></div></div>
    <div className="search-bar panel"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong thư viện..." /></div>
    <div className="filter-row">{studentFilters.map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Tất cả' : value === 'new' ? 'Từ mới' : value === 'learning' ? 'Đang học' : value === 'known' ? 'Đã thuộc' : 'Khó nhớ'}</button>)}</div>
    <section className="library-grid">
      <div className="panel"><div className="panel-heading"><div><h3>Thư viện của bạn</h3><p>{filtered.length} kết quả</p></div></div>{filtered.length ? <div className="word-list">{filtered.map((item) => <button key={item.id} className={selected?.id === item.id ? 'selected' : ''} onClick={() => selectItem(item)}><div><strong>{item.word}</strong><span>{item.phonetic || 'Chưa có phiên âm'} · {item.lookup_count} lượt tra</span></div><span className={`status ${item.status}`}>{item.status}</span></button>)}</div> : <EmptyState title="Chưa có từ phù hợp" description="Tra cứu từ mới ở mục Tra cứu từ để thêm vào thư viện." />}</div>
      <div className="panel word-detail">{selected ? <><WordMeta item={selected} /><div className="detail-block"><h4>Trạng thái</h4><div className="status-actions">{(['new', 'learning', 'known', 'difficult'] as const).map((status) => <button key={status} className={selected.status === status ? 'button primary' : 'button secondary'} onClick={() => void changeStatus(status)}>{status}</button>)}</div></div><div className="detail-block"><h4>Ghi chú cá nhân</h4><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú cách nhớ, ví dụ riêng..." /><div className="status-actions"><button className="button primary" onClick={() => void saveNote()}>Lưu ghi chú</button><button className="button secondary" onClick={() => void deleteWord()}><Trash2 size={16} /> Xóa từ</button></div></div></> : <EmptyState title="Chọn một từ" description="Thông tin chi tiết sẽ hiển thị ở đây." />}</div>
    </section>
  </div>;
}

function TeacherVocabularyStore() {
  const { user } = useAuth();
  const [items, setItems] = useState<TeacherVocabularyItem[]>([]);
  const [selected, setSelected] = useState<TeacherVocabularyItem | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TeacherFilter>('all');
  const [note, setNote] = useState('');
  const [difficulty, setDifficulty] = useState<TeacherVocabularyDifficulty | ''>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const data = await listTeacherVocabulary(user.id);
      setItems(data);
      const nextSelected = selected ? data.find((item) => item.id === selected.id) ?? null : data[0] ?? null;
      setSelected(nextSelected);
      setNote(nextSelected?.note ?? '');
      setDifficulty(nextSelected?.difficulty ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được kho từ vựng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user]);

  const filtered = useMemo(() => items.filter((item) => {
    const matchesText = !query.trim() || includesQuery(item, query);
    const matchesDifficulty = filter === 'all' || (filter === 'unset' ? !item.difficulty : item.difficulty === filter);
    return matchesText && matchesDifficulty;
  }), [filter, items, query]);

  const selectItem = (item: TeacherVocabularyItem) => {
    setSelected(item);
    setNote(item.note ?? '');
    setDifficulty(item.difficulty ?? '');
  };

  const toggleChecked = (id: string) => {
    setChecked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const saveTeacherDetail = async () => {
    if (!selected) return;
    await updateTeacherVocabularyNote(selected.id, note);
    await updateTeacherVocabularyDifficulty(selected.id, difficulty || null);
    await load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap teacher-library-page">
    <div className="page-heading teacher-library-heading"><div><span>Teacher vocabulary store</span><h1>Kho từ vựng</h1><p>Quản lý từ đã tra, gắn độ khó và chuẩn bị giao từ cho học viên trong một workspace gọn hơn.</p></div><div className="teacher-library-heading-actions"><button className="button primary" disabled={!checked.length} onClick={() => setMessage(`Đã chọn ${checked.length} từ. Chức năng giao từ sẽ làm ở sprint sau.`)}>Giao từ</button></div></div>
    {message && <div className="form-message standalone">{message}</div>}
    <div className="teacher-library-toolbar"><div className="search-bar panel teacher-library-search"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong kho từ..." /></div><div className="filter-row teacher-library-filters">{teacherFilters.map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Tất cả' : value === 'unset' ? 'Chưa đặt' : value}</button>)}</div></div>
    <section className="library-grid teacher-library-grid">
      <div className="panel teacher-library-panel"><div className="panel-heading teacher-library-panel-heading"><div><h3>Kho giáo viên</h3><p>{filtered.length} kết quả · {checked.length} đã chọn</p></div></div>{filtered.length ? <div className="word-list teacher-word-list">{filtered.map((item) => <button key={item.id} className={`teacher-word-row ${selected?.id === item.id ? 'selected' : ''}`} onClick={() => selectItem(item)}><span className="teacher-word-check"><input type="checkbox" checked={checked.includes(item.id)} onChange={() => toggleChecked(item.id)} onClick={(event) => event.stopPropagation()} aria-label={`Chọn từ ${item.word}`} /></span><span className="teacher-word-main"><strong>{item.word}</strong><span>{item.phonetic || 'Chưa có phiên âm'}</span></span><span className="teacher-word-meta"><span className={`status ${item.difficulty ?? 'new'}`}>{item.difficulty ?? 'unset'}</span></span></button>)}</div> : <EmptyState title="Kho từ đang trống" description="Tra cứu từ rồi thêm vào Kho từ vựng." />}</div>
      <div className="panel word-detail teacher-library-detail">{selected ? <><WordMeta item={selected} /><div className="teacher-library-editing"><div className="detail-block teacher-library-edit-block"><h4>Mức độ</h4><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as TeacherVocabularyDifficulty | '')}><option value="">Chưa đặt</option><option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option></select></div><div className="detail-block teacher-library-edit-block"><h4>Ghi chú giáo viên</h4><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú cách dạy, nhóm chủ đề..." /><div className="status-actions teacher-library-actions"><button className="button primary" onClick={() => void saveTeacherDetail()}>Lưu thay đổi</button></div></div></div></> : <EmptyState title="Chọn một từ" description="Thông tin chi tiết sẽ hiển thị ở đây." />}</div>
    </section>
  </div>;
}
