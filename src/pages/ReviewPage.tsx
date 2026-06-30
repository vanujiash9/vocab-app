import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState, LoadingState } from '../components/PageState';
import { listStudyVocabulary, saveQuizAttempt, updateVocabularyLearningStatus } from '../services/data';
import type { QuizAttemptAnswer, QuizMode, StudyVocabularyItem, StudyVocabularySource, VocabularyStatus } from '../types';
import { ReviewFlashcardMode } from '../features/review/ReviewFlashcardMode';
import { ReviewModeTabs, type ReviewMode } from '../features/review/ReviewModeTabs';
import { ReviewProgressBar } from '../features/review/ReviewProgressBar';
import { ReviewQuizMode } from '../features/review/ReviewQuizMode';
import { ReviewSessionCard } from '../features/review/ReviewSessionCard';
import { ReviewSummary } from '../features/review/ReviewSummary';
import { buildQuestions, buildQuizPool, buildWrongAnswers, type ReviewQuizQuestion } from '../features/review/reviewQuiz.utils';

const DURATION_OPTIONS = [10, 15, 30] as const;
const SESSION_LIMIT_BY_DURATION: Record<(typeof DURATION_OPTIONS)[number], number> = {
  10: 5,
  15: 10,
  30: 20,
};

const QUIZ_MODE: QuizMode = 'definition';

function buildEmptyDescription(source: Exclude<StudyVocabularySource, 'new'>): string {
  return source === 'assigned'
    ? 'Xem từ được giao hoặc thêm bài được giao để bắt đầu phiên học.'
    : 'Thêm từ vào thư viện hoặc xem từ được giao để tạo phiên học đầu tiên.';
}

function uniqueWords(items: StudyVocabularyItem[]): StudyVocabularyItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.dictionaryEntryId)) return false;
    seen.add(item.dictionaryEntryId);
    return true;
  });
}

export function ReviewPage() {
  const { user } = useAuth();
  const [selectedSource, setSelectedSource] = useState<Exclude<StudyVocabularySource, 'new'>>('all');
  const [selectedDuration, setSelectedDuration] = useState<(typeof DURATION_OPTIONS)[number]>(15);
  const [selectedMode, setSelectedMode] = useState<ReviewMode>('flashcard');
  const [availableWords, setAvailableWords] = useState<StudyVocabularyItem[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [sessionWords, setSessionWords] = useState<StudyVocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedWords, setReviewedWords] = useState<StudyVocabularyItem[]>([]);
  const [difficultWords, setDifficultWords] = useState<StudyVocabularyItem[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizSaved, setQuizSaved] = useState(false);

  const sessionLimit = SESSION_LIMIT_BY_DURATION[selectedDuration];
  const flashcardItem = sessionWords[currentIndex] ?? null;
  const quizQuestions = useMemo<ReviewQuizQuestion[]>(() => {
    const pool = buildQuizPool(sessionWords, QUIZ_MODE);
    return pool.length < 4 ? [] : buildQuestions(pool, Math.min(sessionLimit, pool.length), QUIZ_MODE);
  }, [sessionLimit, sessionWords]);
  const currentQuizQuestion = quizQuestions[currentIndex] ?? null;
  const wrongAnswers = useMemo(() => buildWrongAnswers(quizQuestions, quizAnswers), [quizAnswers, quizQuestions]);
  const correctCount = useMemo(() => quizQuestions.filter((question) => quizAnswers[question.id] === question.correctAnswer).length, [quizAnswers, quizQuestions]);
  const reviewedCount = uniqueWords(reviewedWords).length;
  const difficultCount = uniqueWords(difficultWords).length;
  const quizSuggestion = selectedMode === 'quiz' && wrongAnswers.length > 0 ? `Có ${wrongAnswers.length} từ chưa chắc. Bạn có thể quay lại Flashcard để ôn nhanh.` : '';

  useEffect(() => {
    if (!user || sessionStarted) return;

    let active = true;

    const loadWords = async () => {
      setLoadingWords(true);
      setError('');
      try {
        const items = await listStudyVocabulary({ userId: user.id, source: selectedSource });
        if (!active) return;
        setAvailableWords(items);
        setSelectedWordIds((current) => {
          const nextIds = items.slice(0, sessionLimit).map((item) => item.id);
          const kept = current.filter((id) => items.some((item) => item.id === id));
          return kept.length ? kept : nextIds;
        });
      } catch (err) {
        if (!active) return;
        setAvailableWords([]);
        setSelectedWordIds([]);
        setError(err instanceof Error ? err.message : 'Không tải được danh sách từ.');
      } finally {
        if (active) setLoadingWords(false);
      }
    };

    void loadWords();

    return () => {
      active = false;
    };
  }, [selectedSource, sessionLimit, sessionStarted, user]);

  const resetSessionState = () => {
    setCurrentIndex(0);
    setReviewedWords([]);
    setDifficultWords([]);
    setQuizAnswers({});
    setSessionCompleted(false);
    setFlipped(false);
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizSaved(false);
  };

  const startSession = async () => {
    if (!selectedWordIds.length) {
      setError('Hãy chọn ít nhất 1 từ để bắt đầu phiên ôn tập.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const items = availableWords.filter((item) => selectedWordIds.includes(item.id)).slice(0, sessionLimit);
      setSessionWords(items);
      resetSessionState();
      setSessionStarted(true);
      setSessionCompleted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không chuẩn bị được phiên ôn tập.');
      setSessionWords([]);
      setSessionStarted(false);
      setSessionCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = () => {
    setSessionStarted(false);
    setSessionCompleted(false);
    setSessionWords([]);
    resetSessionState();
    setError('');
  };

  const toggleWord = (wordId: string) => {
    setSelectedWordIds((current) => current.includes(wordId) ? current.filter((id) => id !== wordId) : [...current, wordId]);
  };

  const markFlashcard = async (status: VocabularyStatus) => {
    if (!flashcardItem) return;
    setLoading(true);
    setError('');
    try {
      await updateVocabularyLearningStatus(flashcardItem, status);
      setReviewedWords((current) => [...current, flashcardItem]);
      if (status === 'difficult') {
        setDifficultWords((current) => [...current, flashcardItem]);
      }
      const isLast = currentIndex === sessionWords.length - 1;
      if (isLast) {
        setSessionCompleted(true);
        setFlipped(false);
        return;
      }
      setCurrentIndex((current) => current + 1);
      setFlipped(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được trạng thái học.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode: ReviewMode) => {
    setSelectedMode(mode);
    setCurrentIndex(0);
    setFlipped(false);
    setQuizSubmitted(false);
  };

  const chooseQuizAnswer = (value: string) => {
    if (!currentQuizQuestion || quizSubmitted) return;
    setQuizAnswers((current) => ({ ...current, [currentQuizQuestion.id]: value }));
    setQuizSubmitted(true);
  };

  const saveQuizIfNeeded = async (nextScore: number, answers: QuizAttemptAnswer[]) => {
    if (!user || quizSaved) return;
    await saveQuizAttempt({
      userId: user.id,
      score: nextScore,
      totalQuestions: quizQuestions.length,
      correctCount: nextScore,
      mode: QUIZ_MODE,
      source: selectedSource,
      answers,
    });
    setQuizSaved(true);
  };

  const nextQuizQuestion = async () => {
    if (!currentQuizQuestion) return;
    const isLast = currentIndex === quizQuestions.length - 1;
    if (!isLast) {
      setCurrentIndex((current) => current + 1);
      setQuizSubmitted(false);
      return;
    }

    const answers = quizQuestions.map((question) => {
      const selectedAnswer = quizAnswers[question.id] ?? '';
      const correctOption = question.options.find((option) => option.value === question.correctAnswer);
      const selectedOption = question.options.find((option) => option.value === selectedAnswer);
      return {
        question: question.prompt,
        correctAnswer: correctOption?.label ?? '',
        selectedAnswer: selectedOption?.label ?? '',
        isCorrect: selectedAnswer === question.correctAnswer,
      };
    });

    setLoading(true);
    setError('');
    try {
      const nextScore = quizQuestions.filter((question) => quizAnswers[question.id] === question.correctAnswer).length;
      await saveQuizIfNeeded(nextScore, answers);
      setReviewedWords((current) => [...current, ...quizQuestions.map((question) => question.item)]);
      setDifficultWords((current) => [...current, ...wrongAnswers.map((answer) => {
        const matchingQuestion = quizQuestions.find((question) => question.prompt === answer.question);
        return matchingQuestion?.item;
      }).filter((item): item is StudyVocabularyItem => Boolean(item))]);
      setQuizScore(nextScore);
      setSessionCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được kết quả quiz.');
    } finally {
      setLoading(false);
    }
  };

  const retryQuiz = () => {
    setSelectedMode('quiz');
    setCurrentIndex(0);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizSaved(false);
    setSessionCompleted(false);
  };

  const reviewDifficultWords = () => {
    if (!difficultWords.length) return;
    setSessionWords(uniqueWords(difficultWords));
    setSelectedMode('flashcard');
    setCurrentIndex(0);
    setReviewedWords([]);
    setDifficultWords([]);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizSaved(false);
    setSessionCompleted(false);
    setFlipped(false);
    setSessionStarted(true);
  };

  if (!user) return <LoadingState />;

  const renderSetupView = () => <section className="review-shell review-setup-shell">
    {error && <div className="form-message standalone">{error}</div>}
    <ReviewSessionCard
      selectedSource={selectedSource}
      selectedDuration={selectedDuration}
      selectedMode={selectedMode}
      availableWords={availableWords}
      selectedWordIds={selectedWordIds}
      loading={loading}
      loadingWords={loadingWords}
      onSelectSource={setSelectedSource}
      onSelectDuration={setSelectedDuration}
      onSelectMode={switchMode}
      onToggleWord={toggleWord}
      onStart={() => void startSession()}
    />
  </section>;

  const renderStudyView = () => {
    if (!sessionWords.length) {
      return <section className="review-shell review-study-shell">
        {error && <div className="form-message standalone">{error}</div>}
        <div className="review-empty-state">
          <EmptyState title="Chưa có từ phù hợp để ôn tập." description={buildEmptyDescription(selectedSource)} />
          <div className="status-actions">
            <Link className="button secondary" to="/library">Thêm từ vào thư viện</Link>
            <Link className="button secondary" to="/assigned-words">Xem từ được giao</Link>
          </div>
        </div>
      </section>;
    }

    return <section className="review-shell review-study-shell">
      {error && <div className="form-message standalone">{error}</div>}
      <ReviewProgressBar totalWords={sessionWords.length} selectedMode={selectedMode} selectedDuration={selectedDuration} onCreateNewSession={createNewSession} />
      <ReviewModeTabs selectedMode={selectedMode} onSelect={switchMode} />
      {quizSuggestion && <p className="review-inline-note">{quizSuggestion}</p>}
      {selectedMode === 'flashcard' && flashcardItem && <ReviewFlashcardMode
        item={flashcardItem}
        currentIndex={currentIndex}
        totalWords={sessionWords.length}
        flipped={flipped}
        loading={loading}
        onToggleFlip={() => setFlipped((current) => !current)}
        onMark={(status) => void markFlashcard(status)}
      />}
      {selectedMode === 'quiz' && currentQuizQuestion && <ReviewQuizMode
        mode={QUIZ_MODE}
        question={currentQuizQuestion}
        currentIndex={currentIndex}
        totalQuestions={quizQuestions.length}
        correctCount={correctCount}
        selectedValue={quizAnswers[currentQuizQuestion.id] ?? null}
        submitted={quizSubmitted}
        saving={loading}
        onChooseAnswer={chooseQuizAnswer}
        onNextQuestion={() => void nextQuizQuestion()}
        onSwitchToFlashcard={() => switchMode('flashcard')}
      />}
      {selectedMode === 'quiz' && !currentQuizQuestion && <EmptyState title="Chưa đủ từ để tạo quiz" description="Bạn cần ít nhất 4 từ phù hợp trong session để làm quiz." />}
    </section>;
  };

  const renderSummaryView = () => <section className="review-shell review-summary-shell">
    {error && <div className="form-message standalone">{error}</div>}
    <ReviewSummary
      reviewedCount={reviewedCount}
      difficultCount={difficultCount}
      quizScore={quizScore}
      quizTotal={quizQuestions.length}
      onReviewDifficult={reviewDifficultWords}
      onRetryQuiz={retryQuiz}
      onCreateNewSession={createNewSession}
    />
  </section>;

  return <div className="page-wrap review-page-wrap">
    <div className="page-heading review-page-heading">
      <div>
        <h1>Ôn tập</h1>
        <p>Ôn từ theo flashcard hoặc quiz trong một phiên học gọn.</p>
      </div>
    </div>
    {!sessionStarted ? renderSetupView() : sessionCompleted ? renderSummaryView() : renderStudyView()}
  </div>;
}
