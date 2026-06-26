import { supabase } from '../lib/supabase';
import type { DictionaryEntry } from '../features/dictionary/dictionary.types';
import type {
  Course,
  DashboardSummary,
  Deadline,
  DictionaryEntryRecord,
  Lesson,
  Profile,
  QuizResult,
  UserRole,
  UserVocabularyRecord,
  Vocabulary,
  VocabularyStatus,
} from '../types';

type JoinedUserVocabularyRow = UserVocabularyRecord & {
  dictionary_entries: DictionaryEntryRecord | null;
};

function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

function mapVocabularyRow(row: JoinedUserVocabularyRow): Vocabulary {
  const entry = row.dictionary_entries;
  if (!entry) {
    throw new Error('Không tìm thấy dữ liệu từ vựng liên kết.');
  }

  return {
    id: row.id,
    user_id: row.user_id,
    lesson_id: row.lesson_id,
    word: entry.word,
    phonetic: entry.phonetic,
    part_of_speech: entry.part_of_speech,
    english_definition: entry.english_definition,
    vietnamese_meaning: entry.vietnamese_meaning,
    example_sentence: entry.examples[0] ?? null,
    status: row.status,
    lookup_count: row.lookup_count,
    created_at: row.created_at,
  };
}

async function upsertDictionaryEntryFromWord(word: string): Promise<DictionaryEntryRecord> {
  const normalizedWord = normalizeWord(word);
  const payload = {
    normalized_word: normalizedWord,
    word: normalizedWord,
    phonetic: null,
    audio_url: null,
    part_of_speech: null,
    english_definition: 'Connect a dictionary provider to replace this placeholder definition.',
    vietnamese_meaning: 'Bạn có thể sửa nghĩa tiếng Việt sau khi lưu.',
    examples: [`Example sentence using “${normalizedWord}”.`],
    synonyms: [],
    antonyms: [],
    provider: 'manual',
    raw_response: null,
  };

  const { data, error } = await supabase.from('dictionary_entries').upsert(payload, { onConflict: 'normalized_word' }).select().single();
  if (error) throw error;
  return data as DictionaryEntryRecord;
}

async function upsertDictionaryEntryFromLookup(entry: DictionaryEntry): Promise<DictionaryEntryRecord> {
  const normalizedWord = normalizeWord(entry.word);
  const payload = {
    normalized_word: normalizedWord,
    word: entry.word,
    phonetic: entry.phonetic,
    audio_url: entry.audioUrl,
    part_of_speech: entry.primaryPartOfSpeech,
    english_definition: entry.primaryDefinition,
    vietnamese_meaning: entry.primaryDefinition,
    examples: entry.meanings.map((meaning) => meaning.example).filter((example): example is string => Boolean(example)),
    synonyms: [],
    antonyms: [],
    provider: 'dictionaryapi.dev',
    raw_response: null,
  };

  const { data, error } = await supabase.from('dictionary_entries').upsert(payload, { onConflict: 'normalized_word' }).select().single();
  if (error) throw error;
  return data as DictionaryEntryRecord;
}

async function getUserVocabularyByEntry(userId: string, dictionaryEntryId: string): Promise<Vocabulary | null> {
  const { data, error } = await supabase
    .from('user_vocabulary')
    .select('*, dictionary_entries(*)')
    .eq('user_id', userId)
    .eq('dictionary_entry_id', dictionaryEntryId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapVocabularyRow(data as JoinedUserVocabularyRow) : null;
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const [vocabulary, deadlines] = await Promise.all([
    supabase.from('user_vocabulary').select('id,status').eq('user_id', userId),
    supabase.from('deadlines').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', false),
  ]);
  const error = vocabulary.error ?? deadlines.error;
  if (error) throw error;
  const words = (vocabulary.data ?? []) as Pick<UserVocabularyRecord, 'id' | 'status'>[];
  return {
    vocabulary: words.length,
    known: words.filter((item) => item.status === 'known').length,
    difficult: words.filter((item) => item.status === 'difficult').length,
    openDeadlines: deadlines.count ?? 0,
  };
}

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from('accessible_courses').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Course[];
}

export async function createCourse(input: Pick<Course, 'title' | 'description' | 'cover_color'>): Promise<Course> {
  const { data, error } = await supabase.from('courses').insert(input).select().single();
  if (error) throw error;
  return data as Course;
}

export async function updateCourse(id: string, input: Pick<Course, 'title' | 'description' | 'cover_color'>): Promise<void> {
  const { error } = await supabase.from('courses').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw error;
}

export async function joinCourse(code: string): Promise<void> {
  const { error } = await supabase.rpc('join_course_by_code', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
}

export async function listLessons(courseId?: string): Promise<Lesson[]> {
  let query = supabase.from('accessible_lessons').select('*').order('position');
  if (courseId) query = query.eq('course_id', courseId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Lesson[];
}

export async function createLesson(courseId: string, title: string, description: string): Promise<Lesson> {
  const { data: existing } = await supabase.from('lessons').select('position').eq('course_id', courseId).order('position', { ascending: false }).limit(1);
  const position = ((existing?.[0]?.position as number | undefined) ?? 0) + 1;
  const { data, error } = await supabase.from('lessons').insert({ course_id: courseId, title, description, position }).select().single();
  if (error) throw error;
  return data as Lesson;
}

export async function listVocabulary(userId: string): Promise<Vocabulary[]> {
  const { data, error } = await supabase
    .from('user_vocabulary')
    .select('*, dictionary_entries(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as JoinedUserVocabularyRow[]).map(mapVocabularyRow);
}

export async function addVocabulary(userId: string, word: string): Promise<Vocabulary> {
  const dictionaryEntry = await upsertDictionaryEntryFromWord(word);
  const existing = await getUserVocabularyByEntry(userId, dictionaryEntry.id);
  if (existing) return existing;

  const payload = {
    user_id: userId,
    dictionary_entry_id: dictionaryEntry.id,
    status: 'new' as VocabularyStatus,
    lookup_count: 1,
  };
  const { data, error } = await supabase.from('user_vocabulary').insert(payload).select().single();
  if (error) throw error;

  return mapVocabularyRow({ ...(data as UserVocabularyRecord), dictionary_entries: dictionaryEntry });
}

export async function saveDictionaryVocabulary(userId: string, role: UserRole | undefined, entry: DictionaryEntry): Promise<{ status: 'saved' | 'duplicate' }> {
  const dictionaryEntry = await upsertDictionaryEntryFromLookup(entry);

  if (role === 'teacher') {
    const { data: existing, error: existingError } = await supabase
      .from('teacher_vocabulary')
      .select('id')
      .eq('teacher_id', userId)
      .eq('dictionary_entry_id', dictionaryEntry.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return { status: 'duplicate' };

    const { error } = await supabase.from('teacher_vocabulary').insert({ teacher_id: userId, dictionary_entry_id: dictionaryEntry.id });
    if (error) throw error;
    return { status: 'saved' };
  }

  const existing = await getUserVocabularyByEntry(userId, dictionaryEntry.id);
  if (existing) return { status: 'duplicate' };

  const { error } = await supabase.from('user_vocabulary').insert({ user_id: userId, dictionary_entry_id: dictionaryEntry.id, status: 'new' });
  if (error) throw error;
  return { status: 'saved' };
}

export async function updateVocabularyStatus(id: string, status: VocabularyStatus): Promise<void> {
  const { error } = await supabase.from('user_vocabulary').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function incrementVocabularySearch(id: string, count: number): Promise<void> {
  const { error } = await supabase.from('user_vocabulary').update({ lookup_count: count + 1 }).eq('id', id);
  if (error) throw error;
}

export async function listDeadlines(userId: string): Promise<Deadline[]> {
  const { data, error } = await supabase.from('deadlines').select('*').eq('user_id', userId).order('due_date');
  if (error) throw error;
  return data as Deadline[];
}

export async function createDeadline(userId: string, title: string, dueDate: string): Promise<Deadline> {
  const { data, error } = await supabase.from('deadlines').insert({ user_id: userId, title, due_date: dueDate }).select().single();
  if (error) throw error;
  return data as Deadline;
}

export async function completeDeadline(id: string): Promise<void> {
  const { error } = await supabase.from('deadlines').update({ completed: true }).eq('id', id);
  if (error) throw error;
}

export async function saveQuizResult(userId: string, score: number, total: number): Promise<QuizResult> {
  const { data, error } = await supabase.from('quiz_results').insert({ user_id: userId, score, total }).select().single();
  if (error) throw error;
  return data as QuizResult;
}

export async function updateProfile(userId: string, updates: Partial<Pick<Profile, 'display_name' | 'daily_goal' | 'reminder_enabled'>>): Promise<void> {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  if (error) throw error;
}
