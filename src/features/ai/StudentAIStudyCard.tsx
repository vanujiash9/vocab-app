import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardCheck, Sparkles } from 'lucide-react';
import { EmptyState } from '../../components/PageState';
import { getStudentModeLabel } from './ai.utils';
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

function isEmptyStudyResult(result: StudentAIStudyResult | null): boolean {
  return !!result && result.sections.every((section) => section.words.length === 0);
}

function getActionLabel(mode: StudentAIRecommendedMode): string {
  return `Gợi ý ưu tiên: ${getStudentModeLabel(mode)}`;
}

function getSourceLabel(source: StudentAIWordSource): string {
  return source === 'difficult'
    ? 'Từ khó nhớ'
    : source === 'learning'
      ? 'Từ đang học'
      : source === 'assigned'
        ? 'Từ được giao'
        : 'Tất cả từ';
}

function getPsychologyHint(source: StudentAIWordSource): string {
  return source === 'difficult'
    ? 'Ưu tiên active recall với từ khó trước, rồi mới chuyển sang nhận diện đáp án.'
    : source === 'learning'
      ? 'Ôn theo cụm nhỏ để chuyển trí nhớ ngắn hạn thành trí nhớ dài hạn.'
      : source === 'assigned'
        ? 'Đi theo nhịp ngắn để học kịp các từ được giao và tránh quên nhanh.'
        : 'Bắt đầu từ cụm quan trọng nhất trước, rồi chuyển dần sang các từ ôn nhẹ hơn.';
}

function getNextActionLabel(mode: StudentAIRecommendedMode): string {
  return mode === 'flashcard'
    ? 'Bắt đầu bằng flashcard để nhớ chủ động từng từ.'
    : mode === 'quiz'
      ? 'Bắt đầu bằng quiz để kiểm tra nhận diện nhanh.'
      : 'Bắt đầu bằng lượt ôn tập ngắn để kích hoạt lại trí nhớ.';
}

function getSectionReasonLabel(activity: StudentAIRecommendedMode): string {
  return activity === 'review'
    ? 'Nhóm ôn kích hoạt trí nhớ'
    : activity === 'quiz'
      ? 'Nhóm luyện nhận diện nhanh'
      : 'Nhóm học mới bằng flashcard';
}

function getSectionPriority(index: number): string {
  return index === 0 ? 'Ưu tiên cao nhất' : index === 1 ? 'Ôn tiếp theo' : 'Cụm bổ sung';
}

export function StudentAIStudyCard() {
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState<number>(15);
  const [source, setSource] = useState<StudentAIWordSource>('all');
  const [result, setResult] = useState<StudentAIStudyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    console.log('[StudentAIStudyCard] generate', { minutes, source });
    setLoading(true);
    setError('');
    try {
      const data = await getStudentStudyOrganizer({ minutes, source });
      console.log('[StudentAIStudyCard] success', data);
      setResult(data.result);
    } catch (err) {
      console.error('[StudentAIStudyCard] error', err);
      setError(err instanceof Error ? err.message : 'Không tạo được gợi ý học.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };
  return <section className="dashboard-grid ai-assistant-grid">
    <article className="panel ai-control-card">
      <div className="panel-heading">
        <div>
          <h3>AI gợi ý phiên học hôm nay</h3>
          <p>Chọn thời lượng và nguồn từ để tạo phiên học ngắn, có kiểm soát.</p>
        </div>
      </div>
      <div className="detail-block ai-control-block">
        <h4>Thời lượng</h4>
        <div className="filter-row ai-filter-row">
          {minuteOptions.map((value) => <button key={value} className={minutes === value ? 'active' : ''} onClick={() => setMinutes(value)}>{value} phút</button>)}
        </div>
      </div>
      <div className="detail-block ai-control-block">
        <h4>Nguồn từ</h4>
        <div className="filter-row ai-filter-row">
          {sourceOptions.map((option) => <button key={option.value} className={source === option.value ? 'active' : ''} onClick={() => setSource(option.value)}>{option.label}</button>)}
        </div>
      </div>
      {error && <div className="form-message standalone">{error}</div>}
      <button className="button primary" disabled={loading} onClick={() => void generate()}>
        <Sparkles size={17} /> {loading ? 'Đang lấy gợi ý từ AI...' : 'Tạo gợi ý học'}
      </button>
    </article>

    <div>
      {!result && !loading && !error && <EmptyState title="Chưa chạy gợi ý AI" description="Chọn thời lượng, chọn nguồn từ rồi bấm Tạo gợi ý học để bắt đầu." />}
      {loading && <article className="state-card"><div className="loader" /><strong>AI đang tạo gợi ý học</strong><p>Hệ thống đang lấy dữ liệu từ Supabase và sắp xếp phiên học cho bạn...</p></article>}
      {isEmptyStudyResult(result) && !loading && <EmptyState title="Chưa đủ từ để gợi ý" description="Bạn chưa có đủ từ để AI gợi ý phiên học." />}
      {result && !isEmptyStudyResult(result) && <AIResultCard
        title={result.title}
        summary={result.summary}
        footer={<>
          <span className="role-pill">{getActionLabel(result.recommendedMode)}</span>
          <div className="status-actions">
            <button className="button secondary" onClick={() => navigate('/flashcards')}><BookOpen size={17} /> Học Flashcard</button>
            <button className="button primary" onClick={() => navigate('/quiz')}><ClipboardCheck size={17} /> Làm Quiz</button>
          </div>
        </>}
      >
        <div className="ai-section-stack">
          {result.sections.map((section) => <section key={section.title} className="ai-section-card">
            <div className="detail-title ai-section-title">
              <div>
                <h4>{section.title}</h4>
                <p>{getStudentModeLabel(section.activity)}</p>
              </div>
            </div>
            <div className="ai-pill-list">
              {section.words.map((word) => <span key={`${section.title}:${word}`} className="role-pill ai-word-pill">{word}</span>)}
            </div>
          </section>)}
        </div>
        <div className="detail-block">
          <h4>Mẹo học nhanh</h4>
          <p>{result.tip}</p>
        </div>
      </AIResultCard>}
    </div>
  </section>;
}
