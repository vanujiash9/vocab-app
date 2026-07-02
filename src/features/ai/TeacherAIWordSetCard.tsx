import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles } from 'lucide-react';
import { EmptyState } from '../../components/PageState';
import { AIResultCard } from './AIResultCard';
import { getTeacherWordSetOrganizer } from '../../services/ai';
import type { TeacherAIGoal, TeacherAIWordSetResponse } from './ai.types';

const countOptions = [5, 10, 15] as const;
const goalOptions: Array<{ value: TeacherAIGoal; label: string }> = [
  { value: 'review', label: 'Ôn tập' },
  { value: 'ielts_writing', label: 'IELTS Writing' },
  { value: 'speaking', label: 'Speaking' },
  { value: 'new_words', label: 'Từ mới' },
];

function hasWords(response: TeacherAIWordSetResponse | null): boolean {
  return !!response && response.result.groups.some((group) => group.words.length > 0);
}

export function TeacherAIWordSetCard() {
  const navigate = useNavigate();
  const [count, setCount] = useState<number>(10);
  const [goal, setGoal] = useState<TeacherAIGoal>('ielts_writing');
  const [response, setResponse] = useState<TeacherAIWordSetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTeacherWordSetOrganizer({ count, goal });
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được bộ từ gợi ý.');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  const goToAssignWords = () => {
    if (!response?.selectedWords.length) return;
    navigate('/assign-words', { state: { selectedWords: response.selectedWords } });
  };

  return <section className="dashboard-grid ai-assistant-grid">
    <article className="panel ai-control-card">
      <div className="panel-heading">
        <div>
          <h3>AI sắp xếp bộ từ</h3>
          <p>Chọn mục tiêu dạy học và số lượng từ để AI nhóm bộ từ trước khi giao.</p>
        </div>
      </div>
      <div className="detail-block ai-control-block">
        <strong>Mục tiêu</strong>
        <div className="filter-row ai-filter-row">
          {goalOptions.map((option) => <button key={option.value} className={goal === option.value ? 'active' : ''} onClick={() => setGoal(option.value)}>{option.label}</button>)}
        </div>
      </div>
      <div className="detail-block ai-control-block">
        <strong>Số lượng từ</strong>
        <div className="filter-row ai-filter-row">
          {countOptions.map((value) => <button key={value} className={count === value ? 'active' : ''} onClick={() => setCount(value)}>{value}</button>)}
        </div>
      </div>
      {error && <div className="form-message standalone">{error}</div>}
      <button className="button primary" disabled={loading} onClick={() => void generate()}>
        <Sparkles size={17} /> {loading ? 'Đang tạo...' : 'Tạo gợi ý bộ từ'}
      </button>
    </article>

    <div>
      {!response && !loading && !error && <EmptyState title="Chưa có gợi ý" description="Chọn mục tiêu rồi bấm tạo để AI nhóm bộ từ cho học viên." />}
      {loading && <article className="state-card"><div className="loader" /><p>AI đang nhóm bộ từ...</p></article>}
      {response && !loading && !hasWords(response) && <EmptyState title="Kho từ chưa đủ" description="Kho từ của bạn chưa có đủ từ để AI sắp xếp." />}
      {response && hasWords(response) && <AIResultCard
        title={response.result.title}
        summary={response.result.summary}
        footer={<div className="status-actions"><button className="button primary" onClick={goToAssignWords}><Send size={17} /> Đi tới Giao từ</button></div>}
      >
        <div className="ai-section-stack">
          {response.result.groups.map((group) => <section key={group.title} className="ai-section-card">
            <div className="detail-title ai-section-title"><div><h3>{group.title}</h3></div></div>
            <div className="ai-pill-list">
              {group.words.map((word) => <span key={`${group.title}:${word}`} className="role-pill ai-word-pill">{word}</span>)}
            </div>
          </section>)}
        </div>
        <div className="detail-block">
          <h3>Lời nhắn cho học viên</h3>
          <p>{response.result.messageToStudent}</p>
        </div>
      </AIResultCard>}
    </div>
  </section>;
}
