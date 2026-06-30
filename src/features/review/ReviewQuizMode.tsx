import type { QuizMode } from '../../types';
import type { ReviewQuizQuestion } from './reviewQuiz.utils';

interface ReviewQuizModeProps {
  mode: QuizMode;
  question: ReviewQuizQuestion;
  currentIndex: number;
  totalQuestions: number;
  correctCount: number;
  selectedValue: string | null;
  submitted: boolean;
  saving: boolean;
  onChooseAnswer: (value: string) => void;
  onNextQuestion: () => void;
  onSwitchToFlashcard: () => void;
}

export function ReviewQuizMode({
  mode,
  question,
  currentIndex,
  totalQuestions,
  correctCount,
  selectedValue,
  submitted,
  saving,
  onChooseAnswer,
  onNextQuestion,
  onSwitchToFlashcard,
}: ReviewQuizModeProps) {
  return <section className="panel review-study-card review-quiz-card">
    <div className="quiz-progress review-quiz-progress"><span>Câu {currentIndex + 1}/{totalQuestions}</span><b>{correctCount} đúng</b></div>
    <h2>{mode === 'definition' ? `“${question.prompt}” có nghĩa nào đúng?` : `Từ nào đúng với nghĩa: ${question.prompt}?`}</h2>
    <div className="answer-list">
      {question.options.map((option) => {
        const isSelected = selectedValue === option.value;
        const isAnswerCorrect = submitted && option.value === question.correctAnswer;
        const isAnswerWrong = submitted && isSelected && option.value !== question.correctAnswer;
        return <button key={option.value} onClick={() => onChooseAnswer(option.value)} className={`${isSelected ? 'selected' : ''} ${isAnswerCorrect ? 'correct' : ''} ${isAnswerWrong ? 'wrong' : ''}`}>{option.label}</button>;
      })}
    </div>
    {submitted && <div className="quiz-feedback">{selectedValue === question.correctAnswer ? 'Đúng rồi, tiếp tục câu tiếp theo nhé.' : 'Chưa đúng, xem lại đáp án rồi tiếp tục nhé.'}</div>}
    <div className="status-actions review-study-actions review-quiz-actions">
      <button className="button secondary" onClick={onSwitchToFlashcard}>Quay về Flashcard</button>
      <button className="button primary" disabled={!submitted || saving} onClick={onNextQuestion}>Câu tiếp theo</button>
    </div>
  </section>;
}
