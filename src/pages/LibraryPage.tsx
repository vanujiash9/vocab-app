import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { NavigateOptions } from 'react-router-dom';
import { Plus, Search, Upload, Volume2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { VocabularyManualForm } from '../features/vocabulary-manual/VocabularyManualForm';
import type { VocabularyManualInput } from '../features/vocabulary-manual/vocabularyManual.types';
import { StudentVocabularyPage } from '../features/library/student/StudentVocabularyPage';
import {
  listTeacherVocabulary,
  saveManualTeacherVocabulary,
  updateTeacherVocabularyDifficulty,
  updateTeacherVocabularyNote,
} from '../services/data';
import type { TeacherVocabularyDifficulty, TeacherVocabularyItem } from '../types';
import type { UnifiedVocabularyFilter } from '../services/vocabulary';

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
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  if (profile?.role === 'teacher') {
    return <TeacherVocabularyStore />;
  }

  const initialFilter: UnifiedVocabularyFilter = searchParams.get('filter') === 'assigned' ? 'assigned' : 'all';
  return <StudentVocabularyPage initialFilter={initialFilter} onFilterParamChange={(filter) => setSearchParams(filter === 'assigned' ? { filter: 'assigned' } : {})} />;
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
    await updateTeacherVocabularyNote(selected.id, note);
    await updateTeacherVocabularyDifficulty(selected.id, difficulty || null);
    await load();
  };

  const saveManual = async (data: VocabularyManualInput) => {
    if (!user) return;
    const result = await saveManualTeacherVocabulary(user.id, data);
    if (result.status === 'duplicate') {
      setMessage('Từ này đã có trong kho từ.');
      return;
    }
    setMessage('Đã lưu từ vào kho từ.');
    setShowManualForm(false);
    await load();
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
      <div className="panel word-detail">{selected ? <><div className="detail-title"><div><h2>{selected.word}</h2><p>{selected.phonetic || '/phonetic/'}{selected.part_of_speech ? ` · ${selected.part_of_speech}` : ''}</p></div><button className="icon-button" onClick={() => playAudio(selected.audio_url)} disabled={!selected.audio_url} aria-label="Nghe phát âm"><Volume2 size={19} /></button></div><div className="detail-block"><h4>Mức độ</h4><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as TeacherVocabularyDifficulty | '')}><option value="">Chưa đặt</option><option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option></select></div><div className="detail-block"><h4>Ghi chú giáo viên</h4><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú cách dạy, nhóm chủ đề..." /><div className="status-actions"><button className="button primary" onClick={() => void saveTeacherDetail()}>Lưu thay đổi</button></div></div></> : <EmptyState title="Chọn một từ" description="Thông tin chi tiết sẽ hiển thị ở đây." />}</div>
    </section>
  </div>;
}
