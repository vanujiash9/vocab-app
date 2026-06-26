export interface DictionaryApiPhonetic {
  text?: string;
  audio?: string;
}

export interface DictionaryApiDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface DictionaryApiMeaning {
  partOfSpeech: string;
  definitions: DictionaryApiDefinition[];
}

export interface DictionaryApiEntry {
  word: string;
  phonetic?: string;
  phonetics?: DictionaryApiPhonetic[];
  meanings?: DictionaryApiMeaning[];
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definition: string;
  example: string | null;
}

export interface DictionaryEntry {
  word: string;
  phonetic: string | null;
  audioUrl: string | null;
  meanings: DictionaryMeaning[];
  primaryDefinition: string;
  primaryExample: string | null;
  primaryPartOfSpeech: string | null;
}

export type DictionaryLookupResult =
  | { status: 'success'; entry: DictionaryEntry }
  | { status: 'not-found' }
  | { status: 'api-error'; message: string };
