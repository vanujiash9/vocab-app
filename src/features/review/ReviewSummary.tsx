interface ReviewSummaryProps {
  reviewedCount: number;
  difficultCount: number;
  quizScore: number | null;
  quizTotal: number;
  onReviewDifficult: () => void;
  onRetryQuiz: () => void;
  onCreateNewSession: () => void;
}

export function ReviewSummary({
  reviewedCount,
  difficultCount,
  quizScore,
  quizTotal,
  onReviewDifficult,
  onRetryQuiz,
  onCreateNewSession,
}: ReviewSummaryProps) {
  return <section className="panel review-summary-panel">
    <div className="review-summary-header">
      <h2>Bạn đã hoàn thành phiên ôn tập</h2>
      <p>Tiếp tục ôn lại các từ chưa chắc hoặc bắt đầu một phiên mới ngay bây giờ.</p>
    </div>
    <div className="review-summary-grid">
      <div className="study-quick-chip"><strong>{reviewedCount}</strong><span>Số từ đã học</span></div>
      <div className="study-quick-chip"><strong>{difficultCount}</strong><span>Số từ cần xem lại</span></div>
      <div className="study-quick-chip"><strong>{quizScore === null ? 'Chưa làm' : `${quizScore}/${quizTotal}`}</strong><span>Điểm quiz</span></div>
    </div>
    <div className="status-actions review-summary-actions">
      <button className="button secondary" disabled={!difficultCount} onClick={onReviewDifficult}>Ôn lại từ khó</button>
      <button className="button secondary" onClick={onRetryQuiz}>Làm quiz lại</button>
      <button className="button primary" onClick={onCreateNewSession}>Tạo phiên mới</button>
    </div>
  </section>;
}
