export type ReadingLevel = 'A2' | 'B1' | 'B2' | 'IELTS';

export interface ReadingToken {
  type: 'word' | 'text';
  text: string;
  normalized?: string;
  index?: number;
}

export interface AnalyzeSelectedWordParams {
  passage: string;
  selectedText: string;
  sentence: string;
  level?: ReadingLevel;
}

export interface RelatedWordFromPassage {
  word: string;
  reason: string;
}

export interface AnalyzeSelectedWordResult {
  word: string;
  normalizedWord: string;
  partOfSpeech: string | null;
  englishDefinition: string;
  vietnameseMeaning: string | null;
  meaningInContext: string;
  sentence: string;
  explanation: string;
  collocations: string[];
  examples: string[];
  relatedWordsFromPassage: RelatedWordFromPassage[];
  difficulty: 'easy' | 'medium' | 'hard';
  shouldSave: boolean;
  saveReason: string;
}

export interface ReadingAnalysisCacheItem {
  result: AnalyzeSelectedWordResult;
  saved: boolean;
}
