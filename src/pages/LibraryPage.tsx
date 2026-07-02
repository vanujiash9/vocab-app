import { useEffect, useMemo, useState } from 'react';
import './LibraryPage.css';
import { useNavigate } from 'react-router-dom';
import type { NavigateOptions } from 'react-router-dom';
import { Plus, Search, Upload, Volume2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { VocabularyManualForm } from '../features/vocabulary-manual/VocabularyManualForm';
import type { VocabularyManualInput } from '../features/vocabulary-manual/vocabularyManual.types';
import {
  listTeacherVocabulary,
  saveManualTeacherVocabulary,
  saveTeacherVocabularyDetails,
} from '../services/teacher';
import type { TeacherVocabularyDifficulty, TeacherVocabularyItem } from '../types';

type TeacherFilter = 'all' | 'unset' | TeacherVocabularyDifficulty;

const teacherFilters: TeacherFilter[] = ['all', 'unset', 'easy', 'medium', 'hard'];

function includesQuery(item: { word: string; englishDefinition: string; vietnameseMeaning: string }, query: string): boolean {
  const text = `${item.word} ${item.englishDefinition} ${item.vietnameseMeaning}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function playAudio(url: string | null) {
  if (!url) return;
  void new Audio(url).play();
}

export function LibraryPage() {
  return <TeacherVocabularyStore />;
}

function TeacherVocabularyStore() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<TeacherVocabularyItem[]>([]);
  const [selected, setSelected] = useState<TeacherVocabularyItem | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TeacherFilter>('all');
  const [note, setNote] = useState('');
  const [difficulty, setDifficulty] = useState<TeacherVocabularyDifficulty | ''>('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const goToAssignWords = (selectedWords: string[]) => {
    const options: NavigateOptions | undefined = selectedWords.length ? { state: { selectedWords } } : undefined;
    navigate('/assign-words', options);
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
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
    const matchesText = !query.trim() || includesQuery({
      word: item.word,
      englishDefinition: item.english_definition,
      vietnameseMeaning: item.vietnamese_meaning,
    }, query);
    const matchesDifficulty = filter === 'all' || (filter === 'unset' ? !item.difficulty : item.difficulty === filter);
    return matchesText && matchesDifficulty;
  }), [filter, items, query]);

  const saveTeacherDetail = async () => {
    if (!selected) return;
    setMessage('');
    setError('');
    try {
      await saveTeacherVocabularyDetails(selected.id, { note, difficulty: difficulty || null });
      setMessage('Đã lưu ghi chú và mức độ.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thay đổi trong kho từ.');
    }
  };

  const saveManual = async (data: VocabularyManualInput) => {
    if (!user) return;
    setMessage('');
    setError('');
    try {
      const result = await saveManualTeacherVocabulary(user.id, data);
      if (result.status === 'duplicate') {
        setMessage('Từ này đã có trong kho từ.');
        setShowManualForm(false);
        await load();
        return;
      }
      setMessage('Đã lưu từ vào kho từ.');
      setShowManualForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được từ vào kho từ.');
    }
  };

  const toggleChecked = (id: string) => {
    setChecked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Teacher vocabulary store</span><h1>Kho từ vựng</h1><p>Quản lý từ đã tra, ghi chú độ khó và chuẩn bị giao từ cho học viên.</p></div><div className="status-actions"><button className="button secondary" onClick={() => setShowManualForm(true)}><Plus size={17} /> Nhập từ vựng</button><button className="button secondary" onClick={() => navigate('/import-excel')}><Upload size={17} /> Import Excel</button><button className="button primary" disabled={!checked.length} onClick={() => goToAssignWords(checked)}>{checked.length ? `Giao ${checked.length} từ đã chọn` : 'Giao từ'}</button></div></div>
    {message && <div className="form-message standalone">{message}</div>}
    <VocabularyManualForm role="teacher" open={showManualForm} onSubmit={saveManual} onClose={() => setShowManualForm(false)} />
    <div className="search-bar panel"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong kho từ..." /></div>
    <div className="filter-row">{teacherFilters.map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Tất cả' : value === 'unset' ? 'Chưa đặt' : value}</button>)}</div>
    <section className="library-grid">
      <div className="panel"><div className="panel-heading"><div><h3>Kho giáo viên</h3><p>{filtered.length} kết quả · {checked.length} đã chọn</p></div></div>{filtered.length ? <div className="word-list">{filtered.map((item) => <button key={item.id} className={selected?.id === item.id ? 'selected' : ''} onClick={() => {
        setSelected(item);
        setNote(item.note ?? '');
        setDifficulty(item.difficulty ?? '');
      }}><input type="checkbox" checked={checked.includes(item.dictionary_entry_id)} onChange={() => toggleChecked(item.dictionary_entry_id)} onClick={(event) => event.stopPropagation()} /><div><strong>{item.word}</strong><span>{item.phonetic || 'Chưa có phiên âm'}</span></div><span className={`status ${item.difficulty ?? 'new'}`}>{item.difficulty ?? 'unset'}</span></button>)}</div> : <EmptyState title="Kho từ đang trống" description="Tra cứu từ rồi thêm vào Kho từ vựng." />}</div>
      <div className="panel word-detail">{selected ? <><div className="detail-title"><div><h2>{selected.word}</h2><p>{selected.phonetic || '/phonetic/'}{selected.part_of_speech ? ` · ${selected.part_of_speech}` : ''}</p></div><button className="icon-button" onClick={() => playAudio(selected.audio_url)} disabled={!selected.audio_url} aria-label="Nghe phát âm"><Volume2 size={19} /></button></div><div className="detail-block"><h3>Mức độ</h3><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as TeacherVocabularyDifficulty | '')}><option value="">Chưa đặt</option><option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option></select></div><div className="detail-block"><h3>Ghi chú giáo viên</h3><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú cách dạy, nhóm chủ đề..." /><div className="status-actions"><button className="button primary" onClick={() => void saveTeacherDetail()}>Lưu thay đổi</button></div></div></> : <EmptyState title="Chọn một từ" description="Thông tin chi tiết sẽ hiển thị ở đây." />}</div>
    </section>
  </div>;
}
