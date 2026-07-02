import './review.css';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, Layers, PenLine, Shuffle, Sparkles, SquareCheck, Volume2 } from 'lucide-react';
import { EmptyState, LoadingState } from '../../components/PageState';
import { useAuth } from '../../contexts/AuthContext';
import { listStudyVocabulary, saveQuizAttempt, updateVocabularyLearningStatus } from '../../services/data';
import type {
  QuizAttemptAnswer,
  QuizMode,
  StudyVocabularyItem,
  StudyVocabularySource,
  VocabularyStatus,
} from '../../types';
import { buildQuestions, buildQuizPool, buildWrongAnswers, type ReviewQuizQuestion } from './reviewQuiz.utils';

const DURATION_OPTIONS = [10, 15, 30] as const;
const SESSION_LIMIT_BY_DURATION: Record<(typeof DURATION_OPTIONS)[number], number> = {
  10: 5,
  15: 10,
  30: 20,
};
const SOURCE_OPTIONS: Array<{ value: Exclude<StudyVocabularySource, 'new'>; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'learning', label: 'Từ đang học' },
  { value: 'difficult', label: 'Từ khó nhớ' },
  { value: 'assigned', label: 'Từ được giao' },
];
const QUIZ_MODE: QuizMode = 'definition';
const MATCH_ROUND_SIZE = 6;

type ReviewMode = 'flashcard' | 'quiz' | 'typing' | 'matching';
type ReviewSource = Exclude<StudyVocabularySource, 'new'>;

const MODE_META: Record<ReviewMode, { label: string; icon: typeof Layers }> = {
  flashcard: { label: 'Flashcard', icon: Layers },
  quiz: { label: 'Trắc nghiệm', icon: SquareCheck },
  typing: { label: 'Gõ đáp án', icon: PenLine },
  matching: { label: 'Ghép cặp', icon: Shuffle },
};
const MODE_ORDER: ReviewMode[] = ['flashcard', 'quiz', 'typing', 'matching'];

function parseReviewSource(value: string | null): ReviewSource {
  return value === 'learning' || value === 'difficult' || value === 'assigned' ? value : 'all';
}

function parseReviewMode(value: string | null): ReviewMode {
  return value === 'quiz' || value === 'typing' || value === 'matching' ? value : 'flashcard';
}

function buildEmptyDescription(source: ReviewSource): string {
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

function playAudio(url: string | null) {
  if (!url) return;
  void new Audio(url).play();
}

function shuffleItems<T>(input: T[]): T[] {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

interface ReviewModeTabsProps {
  selectedMode: ReviewMode;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  onSelectMode: (mode: ReviewMode) => void;
}

function ReviewModeTabs({ selectedMode, disabled, variant = 'default', onSelectMode }: ReviewModeTabsProps) {
  return (
    <div className={`review-mode-tabs ${variant === 'compact' ? 'review-mode-tabs-compact' : ''}`} role="tablist" aria-label="Chọn chế độ học">
      {MODE_ORDER.map((mode) => {
        const Icon = MODE_META[mode].icon;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={selectedMode === mode}
            className={selectedMode === mode ? 'active' : ''}
            disabled={disabled}
            onClick={() => onSelectMode(mode)}
          >
            <Icon size={15} />
            {MODE_META[mode].label}
          </button>
        );
      })}
    </div>
  );
}

interface ReviewSessionSetupProps {
  selectedSource: ReviewSource;
  selectedMode: ReviewMode;
  availableWords: StudyVocabularyItem[];
  selectedWordIds: string[];
  loading: boolean;
  loadingWords: boolean;
  onSelectSource: (source: ReviewSource) => void;
  onSelectMode: (mode: ReviewMode) => void;
  onToggleWord: (wordId: string) => void;
  onStart: () => void;
}

function ReviewSessionSetup({
  selectedSource,
  selectedMode,
  availableWords,
  selectedWordIds,
  loading,
  loadingWords,
  onSelectSource,
  onSelectMode,
  onToggleWord,
  onStart,
}: ReviewSessionSetupProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showWordPicker, setShowWordPicker] = useState(false);
  const selectedSourceLabel = SOURCE_OPTIONS.find((option) => option.value === selectedSource)?.label ?? 'Tất cả';
  const selectedModeLabel = MODE_META[selectedMode].label;

  return (
    <article className="panel review-setup-card">
      <div className="review-setup-fixed">
        <button className="review-setup-toggle" type="button" onClick={() => setShowFilters((current) => !current)} aria-expanded={showFilters}>
          <div className="review-setup-toggle-copy">
            <strong>Thiết lập phiên học</strong>
            <span>{selectedSourceLabel} · {selectedModeLabel} · {selectedWordIds.length} từ</span>
          </div>
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showFilters ? (
          <div className="review-setup-filters">
            <div className="review-setup-row">
              <span className="review-setup-row-label">Nguồn từ</span>
              <div className="review-chip-row" role="group" aria-label="Chọn nguồn từ ôn tập">
                {SOURCE_OPTIONS.map((option) => (
                  <button key={option.value} type="button" className={selectedSource === option.value ? 'active' : ''} onClick={() => onSelectSource(option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="review-setup-row">
              <span className="review-setup-row-label">Bắt đầu bằng</span>
              <ReviewModeTabs selectedMode={selectedMode} disabled={loading} variant="compact" onSelectMode={onSelectMode} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="review-setup-group">
        <div className="review-word-picker-header">
          <div>
            <h3>Chọn từ</h3>
            <p className="review-word-picker-note">{availableWords.length} từ khả dụng · {selectedWordIds.length} từ đã chọn</p>
          </div>
          <button type="button" className="review-text-button" onClick={() => setShowWordPicker((current) => !current)}>
            {showWordPicker ? 'Ẩn danh sách' : 'Tùy chỉnh'}
          </button>
        </div>

        {loadingWords ? (
          <div className="review-word-picker-empty">Đang tải danh sách từ...</div>
        ) : !availableWords.length ? (
          <div className="review-word-picker-empty">Chưa có từ phù hợp trong nguồn này.</div>
        ) : showWordPicker ? (
          <div className="review-word-picker-list" role="list" aria-label="Chọn từ cho phiên ôn tập">
            {availableWords.map((item) => {
              const isSelected = selectedWordIds.includes(item.id);
              return (
                <button key={item.id} type="button" role="listitem" className={isSelected ? 'selected' : ''} onClick={() => onToggleWord(item.id)}>
                  {isSelected && (
                    <span className="review-word-check" aria-hidden="true">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  <strong>{item.word}</strong>
                  <span>{item.vietnameseMeaning || `EN: ${item.englishDefinition}`}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="review-word-picker-note">Đã chọn {selectedWordIds.length} từ để bắt đầu. Mở “Tùy chỉnh” nếu bạn muốn đổi danh sách.</div>
        )}
      </div>

      <div className="review-setup-actions">
        <button className="button primary review-start-button" disabled={loading || loadingWords || !selectedWordIds.length} onClick={onStart}>
          <Sparkles size={17} /> {loading ? 'Đang chuẩn bị phiên ôn tập...' : 'Bắt đầu ôn tập'}
        </button>
      </div>
    </article>
  );
}

interface ReviewProgressCardProps {
  totalWords: number;
  selectedMode: ReviewMode;
  selectedDuration: 10 | 15 | 30;
  onCreateNewSession: () => void;
}

function ReviewProgressCard({ totalWords, selectedMode, selectedDuration, onCreateNewSession }: ReviewProgressCardProps) {
  return (
    <div className="review-progress-card">
      <strong>Phiên học: {totalWords} từ · {MODE_META[selectedMode].label} · còn khoảng {selectedDuration} phút</strong>
      <button type="button" className="review-text-button" onClick={onCreateNewSession}>
        Tạo phiên mới
      </button>
    </div>
  );
}

interface ReviewFlashcardSectionProps {
  item: StudyVocabularyItem;
  currentIndex: number;
  totalWords: number;
  flipped: boolean;
  loading: boolean;
  onToggleFlip: () => void;
  onMark: (status: VocabularyStatus) => void;
}

function ReviewFlashcardSection({ item, currentIndex, totalWords, flipped, loading, onToggleFlip, onMark }: ReviewFlashcardSectionProps) {
  return (
    <section className="review-flashcard-shell">
      <div
        className={`flash-card review-flashcard-button ${flipped ? 'flipped' : ''}`}
        role="button"
        tabIndex={0}
        onClick={onToggleFlip}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggleFlip();
          }
        }}
        aria-label={flipped ? 'Lật về mặt trước' : 'Lật sang mặt sau'}
      >
        <div className="flash-front review-flashcard-face">
          <span className="review-flashcard-eyebrow">Từ {currentIndex + 1}/{totalWords}</span>
          <h2>{item.word}</h2>
          <p>{item.partOfSpeech ? `${item.partOfSpeech}${item.phonetic ? ` · ${item.phonetic}` : ''}` : item.phonetic || 'Nhấn vào thẻ để lật xem nghĩa và ví dụ.'}</p>
          {item.audioUrl && (
            <button
              className="icon-button review-audio-button"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                playAudio(item.audioUrl);
              }}
              aria-label="Nghe phát âm"
            >
              <Volume2 size={18} />
            </button>
          )}
        </div>
        <div className="flash-back review-flashcard-face">
          <span className="review-flashcard-eyebrow">Nghĩa</span>
          <h3>{item.englishDefinition}</h3>
          <p>{item.vietnameseMeaning || 'Chưa có nghĩa tiếng Việt.'}</p>
          {item.examples[0] && <p className="review-flashcard-example">{item.examples[0]}</p>}
        </div>
      </div>
      <div className="review-study-actions">
        <button className="button secondary" disabled={loading} onClick={() => onMark('difficult')}>Cần ôn lại</button>
        <button className="button primary" disabled={loading} onClick={() => onMark('known')}>Đã nhớ</button>
      </div>
    </section>
  );
}

interface ReviewQuizSectionProps {
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
}

function ReviewQuizSection({
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
}: ReviewQuizSectionProps) {
  return (
    <section className="panel review-study-card review-quiz-card">
      <div className="quiz-progress review-quiz-progress">
        <span>Câu {currentIndex + 1}/{totalQuestions}</span>
        <b>{correctCount} đúng</b>
      </div>
      <h2>{mode === 'definition' ? `"${question.prompt}" có nghĩa nào đúng?` : `Từ nào đúng với nghĩa: ${question.prompt}?`}</h2>
      <div className="answer-list">
        {question.options.map((option) => {
          const isSelected = selectedValue === option.value;
          const isAnswerCorrect = submitted && option.value === question.correctAnswer;
          const isAnswerWrong = submitted && isSelected && option.value !== question.correctAnswer;
          return (
            <button key={option.value} onClick={() => onChooseAnswer(option.value)} className={`${isSelected ? 'selected' : ''} ${isAnswerCorrect ? 'correct' : ''} ${isAnswerWrong ? 'wrong' : ''}`}>
              {option.label}
            </button>
          );
        })}
      </div>
      {submitted && (
        <div className={`quiz-feedback ${selectedValue === question.correctAnswer ? 'correct' : 'wrong'}`}>
          {selectedValue === question.correctAnswer ? 'Đúng rồi, tiếp tục câu tiếp theo nhé.' : 'Chưa đúng, xem lại đáp án rồi tiếp tục nhé.'}
        </div>
      )}
      <div className="status-actions review-study-actions review-quiz-actions">
        <button className="button primary" disabled={!submitted || saving} onClick={onNextQuestion}>Câu tiếp theo</button>
      </div>
    </section>
  );
}

interface ReviewTypingSectionProps {
  item: StudyVocabularyItem;
  currentIndex: number;
  totalWords: number;
  value: string;
  submitted: boolean;
  isCorrect: boolean | null;
  loading: boolean;
  onChangeValue: (value: string) => void;
  onSubmit: () => void;
  onNext: () => void;
}

function ReviewTypingSection({ item, currentIndex, totalWords, value, submitted, isCorrect, loading, onChangeValue, onSubmit, onNext }: ReviewTypingSectionProps) {
  return (
    <section className="panel review-study-card review-typing-card">
      <div className="quiz-progress review-quiz-progress">
        <span>Từ {currentIndex + 1}/{totalWords}</span>
      </div>
      <div className="review-typing-prompt">
        <span className="review-typing-eyebrow">Nghĩa của từ này là gì?</span>
        <h2>{item.vietnameseMeaning || item.englishDefinition}</h2>
        {item.examples[0] && <p className="review-typing-example">{item.examples[0]}</p>}
      </div>
      <div className="review-typing-input-row">
        <input
          className={`review-typing-input ${submitted ? (isCorrect ? 'correct' : 'wrong') : ''}`}
          value={value}
          disabled={submitted}
          placeholder="Nhập từ tiếng Anh..."
          autoFocus
          onChange={(event) => onChangeValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            if (submitted) {
              onNext();
            } else if (value.trim()) {
              onSubmit();
            }
          }}
        />
        {item.audioUrl && (
          <button className="icon-button review-audio-button-inline" type="button" onClick={() => playAudio(item.audioUrl)} aria-label="Nghe phát âm">
            <Volume2 size={18} />
          </button>
        )}
      </div>
      {submitted && (
        <div className={`review-typing-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
          {isCorrect ? 'Chính xác!' : (
            <span>Chưa đúng. Đáp án đúng là <strong>{item.word}</strong>.</span>
          )}
        </div>
      )}
      <div className="status-actions review-study-actions">
        {!submitted ? (
          <button className="button primary" disabled={loading || !value.trim()} onClick={onSubmit}>Kiểm tra</button>
        ) : (
          <button className="button primary" disabled={loading} onClick={onNext}>Từ tiếp theo</button>
        )}
      </div>
    </section>
  );
}

interface MatchCard {
  id: string;
  cardId: string;
  label: string;
}

interface ReviewMatchingSectionProps {
  words: StudyVocabularyItem[];
  onFinish: (matchedCount: number, totalCount: number) => void;
}

function ReviewMatchingSection({ words, onFinish }: ReviewMatchingSectionProps) {
  const totalRounds = Math.max(1, Math.ceil(words.length / MATCH_ROUND_SIZE));
  const [roundIndex, setRoundIndex] = useState(0);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [selectedWordCard, setSelectedWordCard] = useState<string | null>(null);
  const [selectedDefCard, setSelectedDefCard] = useState<string | null>(null);
  const [mismatchPair, setMismatchPair] = useState<[string, string] | null>(null);
  const [totalMatched, setTotalMatched] = useState(0);

  const roundWords = useMemo(
    () => words.slice(roundIndex * MATCH_ROUND_SIZE, roundIndex * MATCH_ROUND_SIZE + MATCH_ROUND_SIZE),
    [roundIndex, words],
  );
  const wordCards = useMemo<MatchCard[]>(
    () => shuffleItems(roundWords.map((item) => ({ id: item.id, cardId: `w:${item.id}`, label: item.word }))),
    [roundWords],
  );
  const defCards = useMemo<MatchCard[]>(
    () => shuffleItems(roundWords.map((item) => ({ id: item.id, cardId: `d:${item.id}`, label: item.vietnameseMeaning || item.englishDefinition }))),
    [roundWords],
  );
  const roundComplete = roundWords.length > 0 && matchedIds.length === roundWords.length;

  useEffect(() => {
    setMatchedIds([]);
    setSelectedWordCard(null);
    setSelectedDefCard(null);
    setMismatchPair(null);
  }, [roundIndex]);

  useEffect(() => {
    if (!selectedWordCard || !selectedDefCard) return;
    const wordId = selectedWordCard.slice(2);
    const defId = selectedDefCard.slice(2);
    if (wordId === defId) {
      setMatchedIds((current) => [...current, wordId]);
      setTotalMatched((current) => current + 1);
      setSelectedWordCard(null);
      setSelectedDefCard(null);
      return;
    }
    setMismatchPair([selectedWordCard, selectedDefCard]);
    const timeout = setTimeout(() => {
      setMismatchPair(null);
      setSelectedWordCard(null);
      setSelectedDefCard(null);
    }, 500);
    return () => clearTimeout(timeout);
  }, [selectedDefCard, selectedWordCard]);

  const goNextRound = () => {
    if (roundIndex + 1 >= totalRounds) {
      onFinish(totalMatched, words.length);
      return;
    }
    setRoundIndex((current) => current + 1);
  };

  return (
    <section className="panel review-study-card review-matching-card">
      <div className="quiz-progress review-quiz-progress">
        <span>Vòng {roundIndex + 1}/{totalRounds}</span>
        <b>{matchedIds.length}/{roundWords.length} đã ghép</b>
      </div>
      <p className="review-matching-hint">Chọn một từ và một nghĩa tương ứng để ghép cặp.</p>
      <div className="review-matching-grid">
        <div className="review-matching-column">
          {wordCards.map((card) => {
            const isMatched = matchedIds.includes(card.id);
            return (
              <button
                key={card.cardId}
                type="button"
                disabled={isMatched || Boolean(mismatchPair)}
                className={`review-match-card ${isMatched ? 'matched' : ''} ${selectedWordCard === card.cardId ? 'selected' : ''} ${mismatchPair?.[0] === card.cardId ? 'mismatch' : ''}`}
                onClick={() => setSelectedWordCard(card.cardId)}
              >
                {card.label}
              </button>
            );
          })}
        </div>
        <div className="review-matching-column">
          {defCards.map((card) => {
            const isMatched = matchedIds.includes(card.id);
            return (
              <button
                key={card.cardId}
                type="button"
                disabled={isMatched || Boolean(mismatchPair)}
                className={`review-match-card review-match-card-def ${isMatched ? 'matched' : ''} ${selectedDefCard === card.cardId ? 'selected' : ''} ${mismatchPair?.[1] === card.cardId ? 'mismatch' : ''}`}
                onClick={() => setSelectedDefCard(card.cardId)}
              >
                {card.label}
              </button>
            );
          })}
        </div>
      </div>
      {roundComplete && (
        <div className="review-matching-round-complete">
          <span>Hoàn thành vòng {roundIndex + 1}!</span>
          <button className="button primary" type="button" onClick={goNextRound}>
            {roundIndex + 1 >= totalRounds ? 'Hoàn tất' : 'Vòng tiếp theo'}
          </button>
        </div>
      )}
    </section>
  );
}

interface ReviewSummarySectionProps {
  reviewedCount: number;
  difficultCount: number;
  quizScore: number | null;
  quizTotal: number;
  typingScore: number | null;
  typingTotal: number;
  matchingResult: { matched: number; total: number } | null;
  onReviewDifficult: () => void;
  onRetryQuiz: () => void;
  onCreateNewSession: () => void;
}

function ReviewSummarySection({
  reviewedCount,
  difficultCount,
  quizScore,
  quizTotal,
  typingScore,
  typingTotal,
  matchingResult,
  onReviewDifficult,
  onRetryQuiz,
  onCreateNewSession,
}: ReviewSummarySectionProps) {
  return (
    <section className="panel review-summary-panel">
      <div className="review-summary-header">
        <h2>Bạn đã hoàn thành phiên ôn tập</h2>
        <p>Tiếp tục ôn lại các từ chưa chắc hoặc bắt đầu một phiên mới ngay bây giờ.</p>
      </div>
      <div className="review-summary-grid">
        <div className="study-quick-chip"><strong>{reviewedCount}</strong><span>Số từ đã học</span></div>
        <div className="study-quick-chip"><strong>{difficultCount}</strong><span>Số từ cần xem lại</span></div>
        {quizScore !== null && <div className="study-quick-chip"><strong>{quizScore}/{quizTotal}</strong><span>Điểm quiz</span></div>}
        {typingScore !== null && <div className="study-quick-chip"><strong>{typingScore}/{typingTotal}</strong><span>Điểm gõ đáp án</span></div>}
        {matchingResult && <div className="study-quick-chip"><strong>{matchingResult.matched}/{matchingResult.total}</strong><span>Cặp đã ghép</span></div>}
      </div>
      <div className="status-actions review-summary-actions">
        <button className="button secondary" disabled={!difficultCount} onClick={onReviewDifficult}>Ôn lại từ khó</button>
        <button className="button secondary" onClick={onRetryQuiz}>Làm quiz lại</button>
        <button className="button primary" onClick={onCreateNewSession}>Tạo phiên mới</button>
      </div>
    </section>
  );
}

export function ReviewPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedSource, setSelectedSource] = useState<ReviewSource>(() => parseReviewSource(searchParams.get('source')));
  const [selectedDuration] = useState<(typeof DURATION_OPTIONS)[number]>(15);
  const [selectedMode, setSelectedMode] = useState<ReviewMode>(() => parseReviewMode(searchParams.get('mode')));
  const isAssignedReview = selectedSource === 'assigned';
  const reviewTitle = isAssignedReview ? 'Ôn tập từ giáo viên' : 'Ôn tập';
  const sourceLinks = isAssignedReview
    ? { add: '/assigned-words', addLabel: 'Xem từ giáo viên', secondary: '/library', secondaryLabel: 'Mở thư viện cá nhân' }
    : { add: '/library', addLabel: 'Thêm từ vào thư viện', secondary: '/assigned-words', secondaryLabel: 'Xem từ giáo viên giao' };
  const emptyHintTitle = isAssignedReview ? 'Chưa có từ được giao phù hợp để ôn tập.' : 'Chưa có từ phù hợp để ôn tập.';
  const emptyHintDescription = isAssignedReview ? 'Xem từ giáo viên giao hoặc nhận thêm bài để bắt đầu phiên học.' : buildEmptyDescription(selectedSource);
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
  const [typingValue, setTypingValue] = useState('');
  const [typingSubmitted, setTypingSubmitted] = useState(false);
  const [typingCorrect, setTypingCorrect] = useState<boolean | null>(null);
  const [typingScore, setTypingScore] = useState<number | null>(null);
  const [typingAttempts, setTypingAttempts] = useState(0);
  const [matchingResult, setMatchingResult] = useState<{ matched: number; total: number } | null>(null);

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
    if (sessionStarted) return;
    setSelectedSource(parseReviewSource(searchParams.get('source')));
    setSelectedMode(parseReviewMode(searchParams.get('mode')));
  }, [searchParams, sessionStarted]);

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
    setTypingValue('');
    setTypingSubmitted(false);
    setTypingCorrect(null);
    setTypingScore(null);
    setTypingAttempts(0);
    setMatchingResult(null);
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
    setSelectedWordIds((current) => (current.includes(wordId) ? current.filter((id) => id !== wordId) : [...current, wordId]));
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
    setTypingValue('');
    setTypingSubmitted(false);
    setTypingCorrect(null);
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
      setDifficultWords((current) => [
        ...current,
        ...wrongAnswers
          .map((answer) => {
            const matchingQuestion = quizQuestions.find((question) => question.prompt === answer.question);
            return matchingQuestion?.item;
          })
          .filter((item): item is StudyVocabularyItem => Boolean(item)),
      ]);
      setQuizScore(nextScore);
      setSessionCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được kết quả quiz.');
    } finally {
      setLoading(false);
    }
  };

  const submitTypingAnswer = () => {
    if (!flashcardItem || typingSubmitted || !typingValue.trim()) return;
    const isCorrect = normalizeAnswer(typingValue) === normalizeAnswer(flashcardItem.word);
    setTypingCorrect(isCorrect);
    setTypingSubmitted(true);
  };

  const nextTypingWord = async () => {
    if (!flashcardItem) return;
    setLoading(true);
    setError('');
    try {
      await updateVocabularyLearningStatus(flashcardItem, typingCorrect ? 'known' : 'difficult');
      setReviewedWords((current) => [...current, flashcardItem]);
      if (!typingCorrect) {
        setDifficultWords((current) => [...current, flashcardItem]);
      }
      const nextAttempts = typingAttempts + 1;
      const nextScore = (typingScore ?? 0) + (typingCorrect ? 1 : 0);
      setTypingAttempts(nextAttempts);
      setTypingScore(nextScore);
      const isLast = currentIndex === sessionWords.length - 1;
      if (isLast) {
        setSessionCompleted(true);
      } else {
        setCurrentIndex((current) => current + 1);
      }
      setTypingValue('');
      setTypingSubmitted(false);
      setTypingCorrect(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được trạng thái học.');
    } finally {
      setLoading(false);
    }
  };

  const finishMatching = (matched: number, total: number) => {
    setMatchingResult({ matched, total });
    setReviewedWords((current) => [...current, ...sessionWords]);
    setSessionCompleted(true);
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
    setTypingValue('');
    setTypingSubmitted(false);
    setTypingCorrect(null);
    setTypingScore(null);
    setTypingAttempts(0);
    setMatchingResult(null);
    setSessionCompleted(false);
    setFlipped(false);
    setSessionStarted(true);
  };

  if (!user) return <LoadingState />;

  const renderSetupView = () => (
    <section className="review-shell review-setup-shell review-setup-stack review-simple-stack">
      {error && <div className="form-message standalone">{error}</div>}
      <ReviewSessionSetup
        selectedSource={selectedSource}
        selectedMode={selectedMode}
        availableWords={availableWords}
        selectedWordIds={selectedWordIds}
        loading={loading}
        loadingWords={loadingWords}
        onSelectSource={setSelectedSource}
        onSelectMode={switchMode}
        onToggleWord={toggleWord}
        onStart={() => void startSession()}
      />
    </section>
  );

  const renderStudyView = () => {
    if (!sessionWords.length) {
      return (
        <section className="review-shell review-study-shell">
          {error && <div className="form-message standalone">{error}</div>}
          <div className="panel review-empty-panel">
            <div className="review-empty-state">
              <EmptyState title={emptyHintTitle} description={emptyHintDescription} />
              <div className="status-actions">
                <Link className="button secondary" to={sourceLinks.add}>{sourceLinks.addLabel}</Link>
                <Link className="button secondary" to={sourceLinks.secondary}>{sourceLinks.secondaryLabel}</Link>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="review-shell review-study-shell">
        {error && <div className="form-message standalone">{error}</div>}
        <ReviewProgressCard totalWords={sessionWords.length} selectedMode={selectedMode} selectedDuration={selectedDuration} onCreateNewSession={createNewSession} />
        {selectedMode === 'quiz' && quizSuggestion ? <p className="review-inline-note">{quizSuggestion}</p> : null}
        {selectedMode === 'flashcard' && flashcardItem && (
          <ReviewFlashcardSection
            item={flashcardItem}
            currentIndex={currentIndex}
            totalWords={sessionWords.length}
            flipped={flipped}
            loading={loading}
            onToggleFlip={() => setFlipped((current) => !current)}
            onMark={(status) => void markFlashcard(status)}
          />
        )}
        {selectedMode === 'quiz' && currentQuizQuestion && (
          <ReviewQuizSection
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
          />
        )}
        {selectedMode === 'quiz' && !currentQuizQuestion && (
          <EmptyState title="Chưa đủ từ để tạo quiz" description="Bạn cần ít nhất 4 từ phù hợp trong session để làm quiz." />
        )}
        {selectedMode === 'typing' && flashcardItem && (
          <ReviewTypingSection
            item={flashcardItem}
            currentIndex={currentIndex}
            totalWords={sessionWords.length}
            value={typingValue}
            submitted={typingSubmitted}
            isCorrect={typingCorrect}
            loading={loading}
            onChangeValue={setTypingValue}
            onSubmit={submitTypingAnswer}
            onNext={() => void nextTypingWord()}
          />
        )}
        {selectedMode === 'matching' &&
          (sessionWords.length >= 2 ? (
            <ReviewMatchingSection words={sessionWords} onFinish={finishMatching} />
          ) : (
            <EmptyState title="Chưa đủ từ để ghép cặp" description="Bạn cần ít nhất 2 từ trong phiên để chơi ghép cặp." />
          ))}
      </section>
    );
  };

  const renderSummaryView = () => (
    <section className="review-shell review-summary-shell">
      {error && <div className="form-message standalone">{error}</div>}
      <ReviewSummarySection
        reviewedCount={reviewedCount}
        difficultCount={difficultCount}
        quizScore={quizScore}
        quizTotal={quizQuestions.length}
        typingScore={typingScore}
        typingTotal={typingAttempts}
        matchingResult={matchingResult}
        onReviewDifficult={reviewDifficultWords}
        onRetryQuiz={retryQuiz}
        onCreateNewSession={createNewSession}
      />
    </section>
  );

  return (
    <div className="page-wrap review-page-wrap">
      <div className="page-heading review-page-heading">
        <div>
          <span>Study review</span>
          <h1>{reviewTitle}</h1>
          <p>{isAssignedReview ? 'Ôn lại từ giáo viên giao, chọn phiên phù hợp và theo dõi tiến độ học ngay trên một màn hình.' : 'Chọn nhóm từ cần ôn, bắt đầu bằng flashcard, quiz, gõ đáp án hoặc ghép cặp và duy trì nhịp học đều mỗi ngày.'}</p>
        </div>
      </div>
      {!sessionStarted ? renderSetupView() : sessionCompleted ? renderSummaryView() : renderStudyView()}
    </div>
  );
}