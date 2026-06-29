import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listStudyVocabulary, saveQuizAttempt } from '../services/data';
import type { QuizAttemptAnswer, QuizMode, StudyVocabularyItem, StudyVocabularySource } from '../types';
import { EmptyState, LoadingState } from '../components/PageState';

const SOURCE_OPTIONS: Array<{ value: StudyVocabularySource; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'new', label: 'Từ mới' },
  { value: 'learning', label: 'Đang học' },
  { value: 'difficult', label: 'Cần xem lại' },
  { value: 'assigned', label: 'Từ được giao' },
];

const COUNT_OPTIONS = [5, 10, 20] as const;
const MODE_OPTIONS: Array<{ value: QuizMode; label: string }> = [
  { value: 'definition', label: 'Chọn nghĩa đúng' },
  { value: 'word', label: 'Chọn từ đúng' },
];

type QuizStage = 'setup' | 'playing' | 'done';

interface QuizOption {
  value: string;
  label: string;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  correctAnswer: string;
  options: QuizOption[];
}

function uniqueByDictionaryEntry(items: StudyVocabularyItem[]): StudyVocabularyItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.dictionaryEntryId)) return false;
    seen.add(item.dictionaryEntryId);
    return true;
  });
}

function buildQuizPool(items: StudyVocabularyItem[], mode: QuizMode): StudyVocabularyItem[] {
  const filtered = items.filter((item) => item.word.trim() && item.englishDefinition.trim());
  return uniqueByDictionaryEntry(filtered.filter((item) => mode === 'definition' ? Boolean(item.englishDefinition.trim()) : Boolean(item.word.trim())));
}

function buildQuestion(item: StudyVocabularyItem, pool: StudyVocabularyItem[], mode: QuizMode): QuizQuestion {
  const distractors = pool.filter((candidate) => candidate.dictionaryEntryId !== item.dictionaryEntryId).slice(0, 3);
  const options = [item, ...distractors].map((candidate) => ({
    value: candidate.dictionaryEntryId,
    label: mode === 'definition' ? candidate.englishDefinition : candidate.word,
  }));
  return {
    id: item.id,
    prompt: mode === 'definition' ? item.word : item.englishDefinition,
    correctAnswer: item.dictionaryEntryId,
    options,
  };
}

function buildQuestions(items: StudyVocabularyItem[], count: number, mode: QuizMode): QuizQuestion[] {
  return items.slice(0, count).map((item) => buildQuestion(item, items, mode));
}

function buildWrongAnswers(questions: QuizQuestion[], selectedAnswers: Record<string, string>): QuizAttemptAnswer[] {
  return questions.reduce<QuizAttemptAnswer[]>((items, question) => {
    const selectedAnswer = selectedAnswers[question.id];
    if (!selectedAnswer || selectedAnswer === question.correctAnswer) return items;
    const correctOption = question.options.find((option) => option.value === question.correctAnswer);
    const selectedOption = question.options.find((option) => option.value === selectedAnswer);
    if (!correctOption || !selectedOption) return items;
    return [...items, {
      question: question.prompt,
      correctAnswer: correctOption.label,
      selectedAnswer: selectedOption.label,
      isCorrect: false,
    }];
  }, []);
}

export function QuizPage() {
  const { user } = useAuth();
  const [source, setSource] = useState<StudyVocabularySource>('all');
  const [count, setCount] = useState<(typeof COUNT_OPTIONS)[number]>(5);
  const [mode, setMode] = useState<QuizMode>('definition');
  const [stage, setStage] = useState<QuizStage>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentQuestion = useMemo(() => questions[currentIndex] ?? null, [currentIndex, questions]);
  const correctCount = useMemo(() => questions.filter((question) => selectedAnswers[question.id] === question.correctAnswer).length, [questions, selectedAnswers]);
  const wrongAnswers = useMemo(() => buildWrongAnswers(questions, selectedAnswers), [questions, selectedAnswers]);

  const start = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const items = await listStudyVocabulary({ userId: user.id, source, limit: Math.max(count, 4) });
      const pool = buildQuizPool(items, mode);
      if (pool.length < 4) {
        setQuestions([]);
        setStage('setup');
        setError('Chưa đủ từ để tạo quiz.');
        return;
      }
      const nextQuestions = buildQuestions(pool, Math.min(count, pool.length), mode);
      setQuestions(nextQuestions);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setSubmitted(false);
      setStage('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được quiz.');
    } finally {
      setSaving(false);
    }
  };

  const chooseAnswer = (value: string) => {
    if (!currentQuestion || submitted) return;
    setSelectedAnswers((current) => ({ ...current, [currentQuestion.id]: value }));
    setSubmitted(true);
  };

  const nextQuestion = async () => {
    if (!currentQuestion) return;
    const isLast = currentIndex === questions.length - 1;
    if (!isLast) {
      setCurrentIndex((current) => current + 1);
      setSubmitted(false);
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await saveQuizAttempt({
        userId: user.id,
        score: correctCount,
        totalQuestions: questions.length,
        correctCount,
        mode,
        source,
        answers: questions.map((question) => {
          const selectedAnswer = selectedAnswers[question.id] ?? '';
          const correctOption = question.options.find((option) => option.value === question.correctAnswer);
          const selectedOption = question.options.find((option) => option.value === selectedAnswer);
          return {
            question: question.prompt,
            correctAnswer: correctOption?.label ?? '',
            selectedAnswer: selectedOption?.label ?? '',
            isCorrect: selectedAnswer === question.correctAnswer,
          };
        }),
      });
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được kết quả quiz.');
    } finally {
      setSaving(false);
    }
  };

  const restart = () => {
    setStage('setup');
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setSubmitted(false);
    setError('');
  };

  if (!user) return <LoadingState />;
  if (saving && stage === 'setup') return <LoadingState />;

  if (stage === 'setup') {
    return <div className="page-wrap">
      <div className="page-heading"><div><span>Practice quiz</span><h1>Kiểm tra từ vựng</h1><p>Chọn nhóm từ, số câu và dạng quiz thật đơn giản.</p></div></div>
      <section className="panel quiz-panel study-setup-panel">
        <div className="study-setup-grid study-setup-grid-quiz">
          <label className="manual-vocabulary-field">
            <span>Nhóm từ</span>
            <select value={source} onChange={(event) => setSource(event.target.value as StudyVocabularySource)}>
              {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="manual-vocabulary-field">
            <span>Số câu</span>
            <select value={count} onChange={(event) => setCount(Number(event.target.value) as (typeof COUNT_OPTIONS)[number])}>
              {COUNT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="manual-vocabulary-field">
            <span>Dạng quiz</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as QuizMode)}>
              {MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        {error && <div className="form-message standalone">{error}</div>}
        <button className="button primary" onClick={() => void start()}>Bắt đầu quiz</button>
      </section>
    </div>;
  }

  if (stage === 'done') {
    return <div className="page-wrap">
      <div className="page-heading"><div><span>Practice quiz</span><h1>Kiểm tra từ vựng</h1><p>Bạn đã hoàn thành bài quiz ngắn này.</p></div></div>
      <section className="panel quiz-panel study-summary-panel">
        <strong>Điểm: {correctCount}/{questions.length}</strong>
        <p>Bạn trả lời đúng {correctCount} trên tổng {questions.length} câu.</p>
        {wrongAnswers.length ? <div className="detail-block study-wrong-list"><h4>Câu sai</h4><ul>{wrongAnswers.map((answer) => <li key={`${answer.question}-${answer.selectedAnswer}`}><strong>{answer.question}</strong><span>Bạn chọn: {answer.selectedAnswer || 'Chưa chọn'}</span><span>Đáp án đúng: {answer.correctAnswer}</span></li>)}</ul></div> : <div className="quiz-feedback">Bạn đã trả lời đúng tất cả các câu.</div>}
        <div className="status-actions">
          <button className="button primary" onClick={restart}>Làm lại</button>
          <Link className="button secondary" to="/library">Về thư viện</Link>
        </div>
      </section>
    </div>;
  }

  if (!currentQuestion) return <div className="page-wrap"><EmptyState title="Chưa đủ dữ liệu quiz" description="Chưa đủ từ để tạo quiz." /></div>;

  const selectedValue = selectedAnswers[currentQuestion.id] ?? null;
  const isCorrect = selectedValue === currentQuestion.correctAnswer;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Practice quiz</span><h1>Kiểm tra từ vựng</h1><p>Chọn đáp án phù hợp rồi chuyển sang câu tiếp theo.</p></div></div>
    {error && <div className="form-message standalone">{error}</div>}
    <section className="panel quiz-panel">
      <div className="quiz-progress"><span>Câu {currentIndex + 1}/{questions.length}</span><b>{correctCount} đúng</b></div>
      <h2>{mode === 'definition' ? `“${currentQuestion.prompt}” có nghĩa nào đúng?` : `Từ nào đúng với nghĩa: ${currentQuestion.prompt}?`}</h2>
      <div className="answer-list">
        {currentQuestion.options.map((option) => {
          const isSelected = selectedValue === option.value;
          const isAnswerCorrect = submitted && option.value === currentQuestion.correctAnswer;
          const isAnswerWrong = submitted && isSelected && option.value !== currentQuestion.correctAnswer;
          return <button key={option.value} onClick={() => chooseAnswer(option.value)} className={`${isSelected ? 'selected' : ''} ${isAnswerCorrect ? 'correct' : ''} ${isAnswerWrong ? 'wrong' : ''}`}>{option.label}</button>;
        })}
      </div>
      {submitted && <div className="quiz-feedback">{isCorrect ? 'Đúng rồi, tiếp tục câu tiếp theo nhé.' : 'Chưa đúng, xem lại đáp án rồi tiếp tục nhé.'}</div>}
      <div className="status-actions">
        <button className="button primary" disabled={!submitted || saving} onClick={() => void nextQuestion()}>Câu tiếp theo</button>
      </div>
    </section>
  </div>;
}
