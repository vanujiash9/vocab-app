import { mapDictionaryEntry } from './dictionary.mapper';
import type { DictionaryApiEntry, DictionaryLookupResult } from './dictionary.types';

const DICTIONARY_API_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export async function lookupDictionaryWord(word: string): Promise<DictionaryLookupResult> {
  const normalizedWord = word.trim().toLowerCase();
  if (!normalizedWord) return { status: 'not-found' };

  try {
    const response = await fetch(`${DICTIONARY_API_BASE_URL}/${encodeURIComponent(normalizedWord)}`);
    if (response.status === 404) return { status: 'not-found' };
    if (!response.ok) return { status: 'api-error', message: 'Dictionary API đang lỗi. Vui lòng thử lại sau.' };

    const payload = (await response.json()) as DictionaryApiEntry[];
    const entry = mapDictionaryEntry(payload);
    return entry ? { status: 'success', entry } : { status: 'not-found' };
  } catch {
    return { status: 'api-error', message: 'Không kết nối được Dictionary API. Kiểm tra mạng rồi thử lại.' };
  }
}
