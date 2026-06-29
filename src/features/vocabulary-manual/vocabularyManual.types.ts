import type { TeacherVocabularyDifficulty } from '../../types';

export interface VocabularyManualInput {
  word: string;
  englishDefinition: string;
  vietnameseMeaning?: string;
  partOfSpeech?: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  collocations: string[];
  note?: string;
  difficulty?: TeacherVocabularyDifficulty | null;
}

export interface VocabularyExcelRow {
  stt?: number;
  word?: string;
  english_definition?: string;
  vietnamese_meaning?: string;
  part_of_speech?: string;
  examples?: string;
  synonyms?: string;
  antonyms?: string;
  collocations?: string;
  note?: string;
  difficulty?: string;
}

export type ImportRowStatus = 'valid' | 'invalid' | 'duplicate';

export interface VocabularyImportPreviewRow {
  rowNumber: number;
  input: VocabularyManualInput;
  status: ImportRowStatus;
  errors: string[];
  selected: boolean;
}
