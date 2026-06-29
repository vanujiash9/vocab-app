import type {
  StudentAIRecommendedMode,
  StudentAIStudyResult,
  TeacherAIWordSetResponse,
  TeacherAIWordSetResult,
} from './ai.types';

function isWordList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRecommendedMode(value: unknown): value is StudentAIRecommendedMode {
  return value === 'flashcard' || value === 'quiz' || value === 'review';
}

export function getStudentModeLabel(mode: StudentAIRecommendedMode): string {
  return mode === 'flashcard'
    ? 'Flashcard'
    : mode === 'quiz'
      ? 'Quiz'
      : 'Ôn tập';
}

export function isStudentAIStudyResult(value: unknown): value is StudentAIStudyResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as StudentAIStudyResult;
  return typeof result.title === 'string'
    && typeof result.summary === 'string'
    && Array.isArray(result.sections)
    && result.sections.every((section) => typeof section.title === 'string'
      && isWordList(section.words)
      && ['flashcard', 'quiz', 'review'].includes(section.activity))
    && typeof result.tip === 'string'
    && isRecommendedMode(result.recommendedMode);
}

export function isTeacherAIWordSetResult(value: unknown): value is TeacherAIWordSetResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as TeacherAIWordSetResult;
  return typeof result.title === 'string'
    && typeof result.summary === 'string'
    && Array.isArray(result.groups)
    && result.groups.every((group) => typeof group.title === 'string' && isWordList(group.words))
    && typeof result.messageToStudent === 'string';
}

export function isTeacherAIWordSetResponse(value: unknown): value is TeacherAIWordSetResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as TeacherAIWordSetResponse;
  return isTeacherAIWordSetResult(response.result)
    && isWordList(response.selectedWords)
    && Array.isArray(response.candidates)
    && response.candidates.every((candidate) => candidate && typeof candidate.id === 'string' && typeof candidate.word === 'string');
}

export function isStudentAIStudyResponse(value: unknown): value is { result: StudentAIStudyResult } {
  if (!value || typeof value !== 'object') return false;
  return isStudentAIStudyResult((value as { result?: unknown }).result);
}
