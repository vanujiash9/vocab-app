import type { QuizAttemptAnswer, QuizMode, StudyVocabularyItem } from '../../types';

export interface ReviewQuizOption {
  value: string;
  label: string;
}

export interface ReviewQuizQuestion {
  id: string;
  prompt: string;
  correctAnswer: string;
  options: ReviewQuizOption[];
  item: StudyVocabularyItem;
}

function uniqueByDictionaryEntry(items: StudyVocabularyItem[]): StudyVocabularyItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.dictionaryEntryId)) return false;
    seen.add(item.dictionaryEntryId);
    return true;
  });
}

export function buildQuizPool(items: StudyVocabularyItem[], mode: QuizMode): StudyVocabularyItem[] {
  const filtered = items.filter((item) => item.word.trim() && item.englishDefinition.trim());
  return uniqueByDictionaryEntry(filtered.filter((item) => mode === 'definition' ? Boolean(item.englishDefinition.trim()) : Boolean(item.word.trim())));
}

function buildQuestion(item: StudyVocabularyItem, pool: StudyVocabularyItem[], mode: QuizMode): ReviewQuizQuestion {
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
    item,
  };
}

export function buildQuestions(items: StudyVocabularyItem[], count: number, mode: QuizMode): ReviewQuizQuestion[] {
  return items.slice(0, count).map((item) => buildQuestion(item, items, mode));
}

export function buildWrongAnswers(questions: ReviewQuizQuestion[], selectedAnswers: Record<string, string>): QuizAttemptAnswer[] {
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
