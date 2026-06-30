import { MessageSquare, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendReviewCoachMessage } from '../../services/ai';
import type { ReviewCoachContext, ReviewCoachResponse } from '../../types';

const QUICK_PROMPTS = [
  'Tôi nên ôn gì hôm nay?',
  'Nên bắt đầu bằng Flashcard hay Quiz?',
  'Ưu tiên từ được giao',
  'Từ nào tôi đang yếu?',
] as const;

interface ReviewCoachCardProps {
  context: ReviewCoachContext;
}

export function ReviewCoachCard({ context }: ReviewCoachCardProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<ReviewCoachResponse | null>(null);

  const askCoach = async (nextMessage: string) => {
    const trimmedMessage = nextMessage.trim();
    if (!trimmedMessage) return;
    setLoading(true);
    setError('');
    try {
      const nextResponse = await sendReviewCoachMessage({
        task: 'student_review_chat',
        message: trimmedMessage,
        context,
      });
      setResponse(nextResponse);
      setMessage('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Không gửi được câu hỏi cho trợ lý ôn tập.');
    } finally {
      setLoading(false);
    }
  };

  const submitMessage = () => {
    void askCoach(message);
  };

  const openTarget = (target: string) => {
    setOpen(false);
    navigate(target);
  };
  const secondaryAction = response?.secondaryAction ?? null;

  return <>
    <article className="panel review-coach-card">
      <div className="review-coach-card-copy">
        <div>
          <span className="eyebrow">Trợ lý ôn tập</span>
          <h2>Trợ lý ôn tập</h2>
          <p>Chưa biết bắt đầu từ đâu? Nhận gợi ý ôn tập từ thư viện và bài được giao.</p>
        </div>
        <button className="button secondary" type="button" onClick={() => setOpen(true)}>
          <MessageSquare size={17} /> Hỏi trợ lý
        </button>
      </div>
    </article>

    {open && <div className="review-coach-drawer-wrap">
      <button className="review-coach-backdrop" type="button" aria-label="Đóng trợ lý ôn tập" onClick={() => setOpen(false)} />
      <aside className="panel review-coach-drawer" aria-label="Trợ lý ôn tập">
        <div className="review-coach-drawer-header">
          <div>
            <h3>Trợ lý ôn tập</h3>
            <p>Chỉ phân tích từ trong thư viện và bài được giao.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Đóng trợ lý ôn tập" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="review-coach-quick-prompts">
          {QUICK_PROMPTS.map((prompt) => <button key={prompt} type="button" className="button secondary" disabled={loading} onClick={() => void askCoach(prompt)}>{prompt}</button>)}
        </div>

        <div className="review-coach-chat-body">
          {error && <div className="form-message standalone">{error}</div>}
          {response && <article className="review-coach-response-card">
            <div className="review-coach-response-head">
              <strong>{response.message}</strong>
              {response.reason && <p>{response.reason}</p>}
            </div>
            {response.groups.length > 0 && <div className="review-coach-groups">
              {response.groups.map((group) => <section key={group.title} className="review-coach-group">
                <div className="review-coach-group-head">
                  <strong>{group.title}</strong>
                  <span>{group.activity === 'flashcard' ? 'Flashcard' : group.activity === 'quiz' ? 'Quiz' : 'Ôn tập'}</span>
                </div>
                <div className="ai-pill-list">
                  {group.words.map((word) => <span key={`${group.title}:${word}`} className="ai-word-pill">{word}</span>)}
                </div>
                <p>{group.reason}</p>
              </section>)}
            </div>}
            <div className="review-coach-tip">
              <Sparkles size={15} />
              <span>{response.quickTip}</span>
            </div>
            <div className="status-actions review-coach-actions">
              <button type="button" className="button primary" onClick={() => openTarget(response.primaryAction.target)}>{response.primaryAction.label}</button>
              {secondaryAction ? <button type="button" className="button secondary" onClick={() => openTarget(secondaryAction.target)}>{secondaryAction.label}</button> : null}
            </div>
          </article>}
        </div>

        <div className="review-coach-input-row">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Hỏi về phiên ôn tập của bạn..."
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitMessage();
              }
            }}
          />
          <button type="button" className="button primary" disabled={loading || !message.trim()} onClick={submitMessage}>{loading ? 'Đang hỏi...' : 'Gửi'}</button>
        </div>
      </aside>
    </div>}
  </>;
}
