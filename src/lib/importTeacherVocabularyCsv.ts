import type { TeacherVocabularyImportRow } from '../types';
import { normalizeOptionalText, normalizeTeacherDifficulty, normalizeWord } from './teacherVocabularyNormalization';

const COLUMN_ALIASES = {
  word: ['word', 'từ', 'tu'],
  phonetic: ['phonetic', 'phiên âm', 'phien am'],
  partOfSpeech: ['part_of_speech', 'part of speech', 'loại từ', 'loai tu'],
  englishDefinition: ['english_definition', 'english definition', 'definition', 'nghĩa anh', 'nghia anh'],
  vietnameseMeaning: ['vietnamese_meaning', 'vietnamese meaning', 'meaning', 'nghĩa việt', 'nghia viet'],
  difficulty: ['difficulty', 'độ khó', 'do kho'],
} as const;

export interface TeacherVocabularyImportPreview {
  fileName: string;
  rows: TeacherVocabularyImportRow[];
  totalRows: number;
  validRows: number;
  skippedRows: number;
}

function normalizeHeader(value: string) {
  return normalizeWord(value);
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const isEscapedQuote = inQuotes && line[index + 1] === '"';
      if (isEscapedQuote) {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function getColumnIndex(headers: string[], aliases: readonly string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

function getOptionalValue(columns: string[], index: number) {
  if (index < 0) {
    return null;
  }

  return normalizeOptionalText(columns[index]);
}

function normalizeDifficulty(value: string | null) {
  return normalizeTeacherDifficulty(value);
}

export function parseTeacherVocabularyCsv(fileName: string, source: string): TeacherVocabularyImportPreview {
  const lines = source
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('File CSV cần có header và ít nhất một dòng dữ liệu.');
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const wordIndex = getColumnIndex(headers, COLUMN_ALIASES.word);
  if (wordIndex < 0) {
    throw new Error('File CSV cần có cột word.');
  }

  const phoneticIndex = getColumnIndex(headers, COLUMN_ALIASES.phonetic);
  const partOfSpeechIndex = getColumnIndex(headers, COLUMN_ALIASES.partOfSpeech);
  const englishDefinitionIndex = getColumnIndex(headers, COLUMN_ALIASES.englishDefinition);
  const vietnameseMeaningIndex = getColumnIndex(headers, COLUMN_ALIASES.vietnameseMeaning);
  const difficultyIndex = getColumnIndex(headers, COLUMN_ALIASES.difficulty);

  const rows = lines.slice(1).map(splitCsvLine);
  const validRows: TeacherVocabularyImportRow[] = [];
  let skippedRows = 0;

  rows.forEach((columns) => {
    const word = columns[wordIndex]?.trim();
    if (!word) {
      skippedRows += 1;
      return;
    }

    validRows.push({
      word,
      phonetic: getOptionalValue(columns, phoneticIndex),
      part_of_speech: getOptionalValue(columns, partOfSpeechIndex),
      english_definition: getOptionalValue(columns, englishDefinitionIndex) ?? 'Imported from CSV.',
      vietnamese_meaning: getOptionalValue(columns, vietnameseMeaningIndex) ?? 'Cần bổ sung nghĩa tiếng Việt.',
      difficulty: normalizeDifficulty(getOptionalValue(columns, difficultyIndex)),
    });
  });

  return {
    fileName,
    rows: validRows,
    totalRows: rows.length,
    validRows: validRows.length,
    skippedRows,
  };
}
