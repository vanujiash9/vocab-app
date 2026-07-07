import type { ReadingToken } from './readingNotes.types';

export const MAX_READING_PASSAGE_LENGTH = 2500;
const MIN_READING_SENTENCE_COUNT = 2;
const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+/;
const TOKEN_REGEX = /([A-Za-z]+(?:'[A-Za-z]+)*)|([^A-Za-z]+)/g;

function normalizeWord(text: string): string {
  return text.trim().toLowerCase();
}

function countSentences(text: string): number {
  return text
    .split(SENTENCE_SPLIT_REGEX)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .length;
}

export function validateReadingPassage(passage: string): string {
  const trimmed = passage.trim();
  if (!trimmed) return 'Vui lòng nhập đoạn văn tiếng Anh.';
  if (trimmed.length > MAX_READING_PASSAGE_LENGTH) return 'Vui lòng nhập đoạn văn dưới 2500 ký tự.';
  if (countSentences(trimmed) < MIN_READING_SENTENCE_COUNT) return 'Đoạn văn cần ít nhất 2 câu để phân tích tốt hơn.';
  return '';
}

export function tokenizePassage(passage: string): ReadingToken[] {
  const matches = passage.matchAll(TOKEN_REGEX);
  let wordIndex = 0;
  return [...matches].map((match) => {
    const [text, word] = match;
    if (word) {
      const token: ReadingToken = {
        type: 'word',
        text,
        normalized: normalizeWord(word),
        index: wordIndex,
      };
      wordIndex += 1;
      return token;
    }

    return {
      type: 'text',
      text,
    };
  });
}

function clipPassage(passage: string): string {
  const trimmed = passage.trim();
  return trimmed.length <= 220 ? trimmed : `${trimmed.slice(0, 217).trimEnd()}...`;
}

export function findSentenceForWord(passage: string, selectedWord: string, tokenIndex: number): string {
  const sentences = passage
    .split(SENTENCE_SPLIT_REGEX)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (!sentences.length) return clipPassage(passage);

  let seenWordIndex = -1;
  for (const sentence of sentences) {
    const tokens = tokenizePassage(sentence);
    const wordCount = tokens.filter((token) => token.type === 'word').length;
    const startIndex = seenWordIndex + 1;
    const endIndex = seenWordIndex + wordCount;
    if (tokenIndex >= startIndex && tokenIndex <= endIndex) {
      return sentence;
    }
    seenWordIndex = endIndex;
  }

  const normalizedSelectedWord = normalizeWord(selectedWord);
  const matchedSentence = sentences.find((sentence) =>
    tokenizePassage(sentence).some((token) => token.type === 'word' && token.normalized === normalizedSelectedWord),
  );
  return matchedSentence ?? clipPassage(passage);
}

export function buildReadingAnalysisCacheKey(word: string, sentence: string): string {
  return `${normalizeWord(word)}::${sentence.trim().toLowerCase()}`;
}

export function isWordToken(token: ReadingToken | null | undefined): token is ReadingToken & { type: 'word'; normalized: string; index: number } {
  return token?.type === 'word' && typeof token.normalized === 'string' && typeof token.index === 'number';
}

export function getWordIndexesBetween(startIndex: number, endIndex: number): number[] {
  const start = Math.min(startIndex, endIndex);
  const end = Math.max(startIndex, endIndex);
  return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
}

export function getSelectedTextFromIndexes(tokens: ReadingToken[], selectedIndexes: number[]): string {
  const selectedIndexSet = new Set(selectedIndexes);
  return tokens
    .filter((token) => isWordToken(token) && selectedIndexSet.has(token.index))
    .map((token) => token.text)
    .join(' ')
    .trim();
}

export function getContextForSelection(passage: string, selectedText: string): string {
  const trimmedSelection = selectedText.trim();
  if (trimmedSelection === passage.trim()) return clipPassage(passage);

  const normalizedSelection = trimmedSelection.toLowerCase();
  const matchedSentence = passage
    .split(SENTENCE_SPLIT_REGEX)
    .map((sentence) => sentence.trim())
    .find((sentence) => sentence.toLowerCase().includes(normalizedSelection));

  return matchedSentence ?? clipPassage(passage);
}

export function getReadingUtilsSelfCheck(): true {
  const tokens = tokenizePassage('Hello, world! New day.');
  if (tokens.filter((token) => token.type === 'word').length !== 4) {
    throw new Error('tokenizePassage self-check failed');
  }
  const sentence = findSentenceForWord('Alpha beta. Gamma delta!', 'gamma', 2);
  if (sentence !== 'Gamma delta!') {
    throw new Error('findSentenceForWord self-check failed');
  }
  const phrase = getSelectedTextFromIndexes(tokens, [1, 2]);
  if (phrase !== 'world New') {
    throw new Error('getSelectedTextFromIndexes self-check failed');
  }
  return true;
}

getReadingUtilsSelfCheck();
