import type { TeacherVocabularyDifficulty } from '../types';

export function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeTeacherDifficulty(value: string | null | undefined): TeacherVocabularyDifficulty | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'easy' || normalized === 'medium' || normalized === 'hard') {
    return normalized;
  }

  return null;
}
