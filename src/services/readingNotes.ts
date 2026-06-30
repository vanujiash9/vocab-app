import { supabase } from '../lib/supabase';
import { saveAIContextStudentVocabulary, saveAIContextTeacherVocabulary } from './data';
import type { AnalyzeSelectedWordParams, AnalyzeSelectedWordResult } from '../features/readingNotes/readingNotes.types';

function isRelatedWordFromPassage(value: unknown): value is { word: string; reason: string } {
  return !!value
    && typeof value === 'object'
    && typeof (value as { word?: unknown }).word === 'string'
    && typeof (value as { reason?: unknown }).reason === 'string';
}

function isAnalyzeSelectedWordResult(value: unknown): value is AnalyzeSelectedWordResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as AnalyzeSelectedWordResult;
  return typeof result.word === 'string'
    && typeof result.normalizedWord === 'string'
    && (typeof result.partOfSpeech === 'string' || result.partOfSpeech === null)
    && typeof result.englishDefinition === 'string'
    && (typeof result.vietnameseMeaning === 'string' || result.vietnameseMeaning === null)
    && typeof result.meaningInContext === 'string'
    && typeof result.sentence === 'string'
    && typeof result.explanation === 'string'
    && Array.isArray(result.collocations)
    && result.collocations.every((item) => typeof item === 'string')
    && Array.isArray(result.examples)
    && result.examples.every((item) => typeof item === 'string')
    && Array.isArray(result.relatedWordsFromPassage)
    && result.relatedWordsFromPassage.every(isRelatedWordFromPassage)
    && ['easy', 'medium', 'hard'].includes(result.difficulty)
    && typeof result.shouldSave === 'boolean'
    && typeof result.saveReason === 'string';
}

function getFunctionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'AI gateway đang tạm thời không khả dụng. Vui lòng thử lại sau.';
}

export async function analyzeSelectedWord(params: AnalyzeSelectedWordParams): Promise<AnalyzeSelectedWordResult> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-selected-word', {
      body: params,
    });

    if (error) {
      throw new Error(error.message);
    }

    const result = (data as { result?: unknown })?.result;
    if (!isAnalyzeSelectedWordResult(result)) {
      throw new Error('AI trả về dữ liệu không hợp lệ cho từ đã chọn.');
    }

    return result;
  } catch (error: unknown) {
    throw new Error(getFunctionErrorMessage(error));
  }
}

export async function saveSelectedWordToStudentLibrary(userId: string, result: AnalyzeSelectedWordResult): Promise<{ status: 'saved' | 'duplicate' }> {
  return saveAIContextStudentVocabulary(userId, result);
}

export async function saveSelectedWordToTeacherVocabulary(teacherId: string, result: AnalyzeSelectedWordResult): Promise<{ status: 'saved' | 'duplicate' }> {
  return saveAIContextTeacherVocabulary(teacherId, result);
}
