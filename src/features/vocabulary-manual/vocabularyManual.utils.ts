import type { TeacherVocabularyDifficulty } from '../../types';
import type { VocabularyExcelRow, VocabularyManualInput } from './vocabularyManual.types';

export const PARTS_OF_SPEECH = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'phrase', 'other'] as const;
export const DIFFICULTIES: TeacherVocabularyDifficulty[] = ['easy', 'medium', 'hard'];

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.reduce<string[]>((items, value) => {
    const text = value.trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return items;
    seen.add(key);
    return [...items, text];
  }, []);
}

export function parseSemicolonList(value: string): string[] {
  return unique(value.split(';'));
}

export function parseExamples(value: string): string[] {
  return unique(value.split('\n'));
}

export function normalizeDifficulty(value: string | null | undefined): TeacherVocabularyDifficulty | null {
  const normalized = value?.trim().toLowerCase();
  return DIFFICULTIES.includes(normalized as TeacherVocabularyDifficulty) ? normalized as TeacherVocabularyDifficulty : null;
}

export function normalizeManualInput(input: VocabularyManualInput): VocabularyManualInput {
  return {
    word: input.word.trim(),
    englishDefinition: input.englishDefinition.trim(),
    vietnameseMeaning: input.vietnameseMeaning?.trim() || undefined,
    partOfSpeech: input.partOfSpeech?.trim() || undefined,
    examples: unique(input.examples),
    synonyms: unique(input.synonyms),
    antonyms: unique(input.antonyms),
    collocations: unique(input.collocations),
    note: input.note?.trim() || undefined,
    difficulty: input.difficulty ?? null,
  };
}

export function validateManualInput(input: VocabularyManualInput): string[] {
  const normalized = normalizeManualInput(input);
  const errors: string[] = [];
  if (!normalized.word) errors.push('Vui lòng nhập từ tiếng Anh.');
  if (!normalized.englishDefinition) errors.push('Vui lòng nhập nghĩa Anh – Anh.');
  return errors;
}

export function mapExcelRowToManualInput(row: VocabularyExcelRow): VocabularyManualInput {
  return normalizeManualInput({
    word: String(row.word ?? ''),
    englishDefinition: String(row.english_definition ?? ''),
    vietnameseMeaning: row.vietnamese_meaning ? String(row.vietnamese_meaning) : undefined,
    partOfSpeech: row.part_of_speech ? String(row.part_of_speech) : undefined,
    examples: row.examples ? parseExamples(String(row.examples).replaceAll('|', '\n')) : [],
    synonyms: row.synonyms ? parseSemicolonList(String(row.synonyms)) : [],
    antonyms: row.antonyms ? parseSemicolonList(String(row.antonyms)) : [],
    collocations: row.collocations ? parseSemicolonList(String(row.collocations)) : [],
    note: row.note ? String(row.note) : undefined,
    difficulty: normalizeDifficulty(row.difficulty ? String(row.difficulty) : null),
  });
}

export function normalizeWordKey(word: string): string {
  return word.trim().toLowerCase();
}
