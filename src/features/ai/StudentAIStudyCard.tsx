import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardCheck, Sparkles } from 'lucide-react';
import { EmptyState } from '../../components/PageState';
import { useAuth } from '../../contexts/AuthContext';
import { AIResultCard } from './AIResultCard';
import { getStudentStudyOrganizer } from '../../services/ai';
import type { StudentAIRecommendedMode, StudentAIStudyResult, StudentAIWordSource } from './ai.types';

const minuteOptions = [10, 15, 30] as const;
const sourceOptions: Array<{ value: StudentAIWordSource; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'difficult', label: 'Từ khó nhớ' },
  { value: 'learning', label: 'Từ đang học' },
  { value: 'assigned', label: 'Từ được giao' },
];
const goalOptions = [
  { value: 'review', label: 'Ôn tập' },
  { value: 'new', label: 'Học từ mới' },
  { value: 'quick', label: 'Kiểm tra nhanh' },
] as const;

type StudyGoal = typeof goalOptions[number]['value'];

function isEmptyStudyResult(result: StudentAIStudyResult | null): boolean {
  return !!result
    && result.sections.length > 0
    && result.sections.every((section) => section.words.length === 0);
}

function getSourceDescription(source: StudentAIWordSource): string {
  return source === 'difficult'
    ? 'Tập trung vào các từ bạn hay quên để ôn lại có trọng tâm hơn.'
    : source === 'learning'
      ? 'Ưu tiên các từ đang học để giữ nhịp ghi nhớ mỗi ngày.'
      : source === 'assigned'
        ? 'Đi thẳng vào các từ được giao để hoàn thành việc học nhanh hơn.'
        : 'Trộn từ trong thư viện và bài được giao để tạo một phiên học cân bằng.';
}

function getSourceLabel(source: StudentAIWordSource): string {
  return source === 'difficult'
    ? 'Từ khó nhớ'
    : source === 'learning'
      ? 'Từ đang học'
      : source === 'assigned'
        ? 'Từ được giao'
        : 'Tất cả';
}

function getActivityLabel(mode: StudentAIRecommendedMode): string {
  return mode === 'flashcard' ? 'Flashcard' : mode === 'quiz' ? 'Quiz' : 'Review';
}

function getGoalHint(goal: StudyGoal): string {
  return goal === 'new'
    ? 'Phù hợp khi bạn muốn làm quen nhanh với một nhóm từ mới.'
    : goal === 'quick'
      ? 'Phù hợp khi bạn muốn kiểm tra lại trí nhớ trong một lượt ngắn.'
      : 'Phù hợp khi bạn muốn ôn có thứ tự và dễ bắt đầu ngay.';
}

function getPlanBadge(mode: StudentAIRecommendedMode): string {
  return mode === 'flashcard'
    ? 'Đề xuất: Ôn tập bằng Flashcard'
    : mode === 'quiz'
      ? 'Đề xuất: Kiểm tra nhanh bằng Quiz'
      : 'Đề xuất: Ôn tập bằng Flashcard';
}

function getPrimaryAction(mode: StudentAIRecommendedMode): 'flashcard' | 'quiz' {
  return mode === 'quiz' ? 'quiz' : 'flashcard';
}

function getSectionDisplayTitle(index: number): string {
  return index === 0 ? 'Bước 1 · Ôn từ cần nhớ' : index === 1 ? 'Bước 2 · Kiểm tra lại' : `Bước ${index + 1} · Củng cố thêm`;
}

export function StudentAIStudyCard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [minutes, setMinutes] = useState<number>(15);
  const [source, setSource] = useState<StudentAIWordSource>('all');
  const [goal, setGoal] = useState<StudyGoal>('review');
  const [result, setResult] = useState<StudentAIStudyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (authLoading) return;
    if (!user) {
      setError('Bạn cần đăng nhập lại để dùng trợ lý AI.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await getStudentStudyOrganizer({ minutes, source });
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được gợi ý học.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const isGenerateDisabled = loading || authLoading || !user;
  const primaryAction = result ? getPrimaryAction(result.recommendedMode) : 'flashcard';

  return <section className="ai-assistant-grid">
    <article className="panel ai-control-card">
      <div className="ai-control-header">
        <h3>Bạn muốn học thế nào hôm nay?</h3>
        <p>Chọn thời lượng và nhóm từ, AI sẽ tạo một phiên học ngắn từ dữ liệu thật của bạn.</p>
      </div>

      <div className="ai-control-group">
        <strong>Thời lượng</strong>
        <div className="filter-row ai-filter-row">
          {minuteOptions.map((value) => <button key={value} className={minutes === value ? 'active' : ''} onClick={() => setMinutes(value)}>{value} phút</button>)}
        </div>
      </div>

      <div className="ai-control-group">
        <strong>Nguồn từ</strong>
        <div className="filter-row ai-filter-row">
          {sourceOptions.map((option) => <button key={option.value} className={source === option.value ? 'active' : ''} onClick={() => setSource(option.value)}>{option.label}</button>)}
        </div>
      </div>

      <div className="ai-control-group">
        <strong>Mục tiêu</strong>
        <div className="filter-row ai-filter-row">
          {goalOptions.map((option) => <button key={option.value} className={goal === option.value ? 'active' : ''} onClick={() => setGoal(option.value)}>{option.label}</button>)}
        </div>
      </div>

      <div className="ai-control-note-card">
        <strong>{getSourceLabel(source)} · {minutes} phút</strong>
        <p>{getSourceDescription(source)} {getGoalHint(goal)}</p>
      </div>

      {error && <div className="form-message standalone">{error}</div>}

      <div className="ai-control-footer">
        <button className="button primary" disabled={isGenerateDisabled} onClick={() => void generate()}>
          <Sparkles size={17} /> {loading ? 'Đang tạo kế hoạch...' : '✨ Tạo kế hoạch học'}
        </button>
        <p className="ai-control-note">AI chỉ dùng từ vựng có trong thư viện và bài được giao của bạn.</p>
      </div>
    </article>

    <div className="ai-result-column">
      {!result && !loading && !error && <div className="ai-empty-wrap"><EmptyState title="Chưa có kế hoạch học" description="Chọn thông tin bên trái rồi bấm Tạo kế hoạch học để AI sắp xếp phiên học cho bạn." /></div>}
      {loading && <article className="state-card"><div className="loader" /><strong>AI đang tạo kế hoạch học</strong><p>Hệ thống đang lấy dữ liệu từ Supabase và sắp xếp phiên học cho bạn...</p></article>}
      {isEmptyStudyResult(result) && !loading && <EmptyState title="Chưa đủ từ để gợi ý" description="Bạn chưa có đủ từ để AI gợi ý phiên học." />}
      {result && !isEmptyStudyResult(result) && <AIResultCard
        title={result.title}
        summary={result.summary}
        footer={<div className="ai-result-actions">
          <div className="ai-result-actions-title">
            <strong>Bắt đầu học</strong>
            <span>{getPlanBadge(result.recommendedMode)}</span>
          </div>
          <div className="status-actions ai-result-action-buttons">
            <button className={primaryAction === 'flashcard' ? 'button primary' : 'button secondary'} onClick={() => navigate(`/review?source=${source}&mode=flashcard`)}><BookOpen size={17} /> Học Flashcard</button>
            <button className={primaryAction === 'quiz' ? 'button primary' : 'button secondary'} onClick={() => navigate(`/review?source=${source}&mode=quiz`)}><ClipboardCheck size={17} /> Làm Quiz</button>
          </div>
        </div>}
      >
        <div className="ai-section-stack">
          {result.sections.map((section, index) => <section key={`${section.title}:${index}`} className="ai-section-card">
            <div className="ai-step-badge">Bước {index + 1}</div>
            <div className="detail-title ai-section-title">
              <div>
                <h3>{getSectionDisplayTitle(index)}</h3>
                <p>{getActivityLabel(section.activity)}</p>
              </div>
            </div>
            <div className="ai-pill-list">
              {section.words.map((word) => <span key={`${section.title}:${word}`} className="ai-word-pill">{word}</span>)}
            </div>
          </section>)}
        </div>
        <div className="ai-tip-card">
          <strong>Mẹo học nhanh</strong>
          <p>{result.tip}</p>
        </div>
      </AIResultCard>}
    </div>
  </section>;
}
