import type { DictionaryApiEntry, DictionaryEntry, DictionaryMeaning } from './dictionary.types';

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  return values.find((value) => Boolean(value?.trim()))?.trim() ?? null;
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return values.reduce<string[]>((items, value) => {
    const text = value?.trim();
    const key = text?.toLowerCase();
    if (!text || !key || seen.has(key)) return items;
    seen.add(key);
    return [...items, text];
  }, []);
}

export function mapDictionaryEntry(entries: DictionaryApiEntry[]): DictionaryEntry | null {
  const entry = entries[0];
  if (!entry) return null;

  const definitions = (entry.meanings ?? []).flatMap((meaning) =>
    (meaning.definitions ?? []).map((definition) => ({ meaning, definition })),
  );

  const meanings: DictionaryMeaning[] = definitions.map(({ meaning, definition }) => ({
    partOfSpeech: meaning.partOfSpeech,
    definition: definition.definition,
    example: definition.example ?? null,
  }));

  const primaryMeaning = meanings[0];
  if (!primaryMeaning) return null;

  const examples = uniqueNonEmpty(definitions.map(({ definition }) => definition.example));
  const synonyms = uniqueNonEmpty(definitions.flatMap(({ meaning, definition }) => [...(meaning.synonyms ?? []), ...(definition.synonyms ?? [])]));
  const antonyms = uniqueNonEmpty(definitions.flatMap(({ meaning, definition }) => [...(meaning.antonyms ?? []), ...(definition.antonyms ?? [])]));
  const audioUrl = firstNonEmpty((entry.phonetics ?? []).map((phonetic) => phonetic.audio));
  const phonetic = firstNonEmpty([entry.phonetic, ...(entry.phonetics ?? []).map((item) => item.text)]);

  return {
    word: entry.word.trim().toLowerCase(),
    phonetic,
    audioUrl,
    meanings,
    examples,
    synonyms,
    antonyms,
    primaryDefinition: primaryMeaning.definition,
    primaryExample: primaryMeaning.example,
    primaryPartOfSpeech: primaryMeaning.partOfSpeech,
  };
}
