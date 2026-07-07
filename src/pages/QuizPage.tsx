import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listVocabulary, saveQuizResult } from '../services/data';
import type { Vocabulary } from '../types';
import { EmptyState, LoadingState } from '../components/PageState';

export function QuizPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Vocabulary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (user) listVocabulary(user.id).then(setItems).finally(() => setLoading(false)); }, [user]);
  const quizItems = useMemo(() => items.slice(0, 4), [items]);
  const correct = quizItems[0];
  if (loading) return <LoadingState />;
  if (quizItems.length < 2 || !correct) return <div className="page-wrap"><EmptyState title="Chưa đủ dữ liệu quiz" description="Hãy lưu ít nhất hai từ vựng để tạo câu hỏi." /></div>;
  const submit = async () => { if (!selected || !user || saved) return; await saveQuizResult(user.id, selected === correct.id ? 1 : 0, 1); setSaved(true); };
  return <div className="page-wrap"><div className="page-heading"><div><span>Practice quiz</span><h1>Kiểm tra từ vựng</h1><p>Chọn nghĩa đúng của từ bên dưới.</p></div></div><section className="panel quiz-panel"><div className="quiz-progress"><span>Câu 1/1</span><b>{saved && selected === correct.id ? '10 điểm' : '0 điểm'}</b></div><h2>“<span className="vocabulary-emphasis">{correct.word}</span>” có nghĩa là gì?</h2><div className="answer-list">{quizItems.map((item) => <button key={item.id} onClick={() => !saved && setSelected(item.id)} className={`${selected === item.id ? 'selected' : ''} ${saved && item.id === correct.id ? 'correct' : ''} ${saved && selected === item.id && item.id !== correct.id ? 'wrong' : ''}`}>{item.vietnamese_meaning}</button>)}</div><button className="button primary" disabled={!selected || saved} onClick={() => void submit()}>Nộp đáp án</button>{saved && <div className="quiz-feedback panel">{selected === correct.id ? 'Chính xác! Bạn đã trả lời đúng.' : `Chưa đúng. Đáp án chính xác là: ${correct.vietnamese_meaning}`}</div>}</section></div>;
}
