import type { DictionaryApiEntry, DictionaryEntry, DictionaryMeaning } from './dictionary.types';

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  return values.find((value) => Boolean(value?.trim()))?.trim() ?? null;
}

export function mapDictionaryEntry(entries: DictionaryApiEntry[]): DictionaryEntry | null {
  const entry = entries[0];
  if (!entry) return null;

  const meanings: DictionaryMeaning[] = (entry.meanings ?? []).flatMap((meaning) =>
    (meaning.definitions ?? []).map((definition) => ({
      partOfSpeech: meaning.partOfSpeech,
      definition: definition.definition,
      example: definition.example ?? null,
    })),
  );

  const primaryMeaning = meanings[0];
  if (!primaryMeaning) return null;

  const audioUrl = firstNonEmpty((entry.phonetics ?? []).map((phonetic) => phonetic.audio));
  const phonetic = firstNonEmpty([entry.phonetic, ...(entry.phonetics ?? []).map((item) => item.text)]);

  return {
    word: entry.word.trim().toLowerCase(),
    phonetic,
    audioUrl,
    meanings,
    primaryDefinition: primaryMeaning.definition,
    primaryExample: primaryMeaning.example,
    primaryPartOfSpeech: primaryMeaning.partOfSpeech,
  };
}
