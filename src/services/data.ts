import { supabase } from '../lib/supabase';
import type { DictionaryEntry } from '../features/dictionary/dictionary.types';
import { normalizeManualInput, normalizeWordKey, validateManualInput } from '../features/vocabulary-manual/vocabularyManual.utils';
import type { VocabularyImportPreviewRow, VocabularyManualInput } from '../features/vocabulary-manual/vocabularyManual.types';
import type {
  AppNotification,
  Course,
  DashboardSummary,
  Deadline,
  DictionaryEntryRecord,
  Lesson,
  ListStudyVocabularyOptions,
  Profile,
  QuizAttemptInput,
  QuizResult,
  StudentVocabularyItem,
  StudyVocabularyItem,
  TeacherStudent,
  TeacherVocabularyDifficulty,
  TeacherVocabularyItem,
  TeacherVocabularyRecord,
  VocabularyAssignment,
  UserRole,
  UserVocabularyRecord,
  Vocabulary,
  VocabularyStatus,
} from '../types';

type JoinedUserVocabularyRow = UserVocabularyRecord & {
  dictionary_entries: DictionaryEntryRecord | null;
};

type JoinedTeacherVocabularyRow = TeacherVocabularyRecord & {
  dictionary_entries: DictionaryEntryRecord | null;
};

type TeacherStudentRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  created_at: string;
  profiles: Pick<Profile, 'display_name' | 'email'> | null;
};

type JoinedAssignmentRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  dictionary_entry_id: string;
  status: VocabularyStatus;
  note: string | null;
  assigned_at: string;
  completed_at: string | null;
  dictionary_entries: DictionaryEntryRecord | null;
};

function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function requireDictionaryEntry(entry: DictionaryEntryRecord | null): DictionaryEntryRecord {
  if (!entry) throw new Error('Không tìm thấy dữ liệu từ vựng liên kết.');
  return {
    ...entry,
    examples: textArray(entry.examples),
    synonyms: textArray(entry.synonyms),
    antonyms: textArray(entry.antonyms),
  };
}

function mapStudentVocabularyRow(row: JoinedUserVocabularyRow): StudentVocabularyItem {
  const entry = requireDictionaryEntry(row.dictionary_entries);
  return {
    id: row.id,
    user_id: row.user_id,
    dictionary_entry_id: row.dictionary_entry_id,
    lesson_id: row.lesson_id,
    word: entry.word,
    phonetic: entry.phonetic,
    audio_url: entry.audio_url,
    part_of_speech: entry.part_of_speech,
    english_definition: entry.english_definition,
    vietnamese_meaning: entry.vietnamese_meaning,
    example_sentence: entry.examples[0] ?? null,
    examples: entry.examples,
    synonyms: entry.synonyms,
    antonyms: entry.antonyms,
    status: row.status,
    personal_note: row.personal_note,
    lookup_count: row.lookup_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapVocabularyRow(row: JoinedUserVocabularyRow): Vocabulary {
  const item = mapStudentVocabularyRow(row);
  return {
    id: item.id,
    user_id: item.user_id,
    lesson_id: item.lesson_id,
    word: item.word,
    phonetic: item.phonetic,
    part_of_speech: item.part_of_speech,
    english_definition: item.english_definition,
    vietnamese_meaning: item.vietnamese_meaning,
    example_sentence: item.example_sentence,
    status: item.status,
    lookup_count: item.lookup_count,
    created_at: item.created_at,
  };
}

function mapTeacherVocabularyRow(row: JoinedTeacherVocabularyRow): TeacherVocabularyItem {
  const entry = requireDictionaryEntry(row.dictionary_entries);
  return {
    id: row.id,
    teacher_id: row.teacher_id,
    dictionary_entry_id: row.dictionary_entry_id,
    word: entry.word,
    phonetic: entry.phonetic,
    audio_url: entry.audio_url,
    part_of_speech: entry.part_of_speech,
    english_definition: entry.english_definition,
    vietnamese_meaning: entry.vietnamese_meaning,
    examples: entry.examples,
    synonyms: entry.synonyms,
    antonyms: entry.antonyms,
    note: row.note,
    difficulty: row.difficulty,
    created_at: row.created_at,
    updated_at: row.updated_at,
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
  return requireDictionaryEntry(data as DictionaryEntryRecord);
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
    examples: entry.examples,
    synonyms: entry.synonyms,
    antonyms: entry.antonyms,
    provider: 'dictionaryapi.dev',
    raw_response: null,
  };

  const { data, error } = await supabase.from('dictionary_entries').upsert(payload, { onConflict: 'normalized_word' }).select().single();
  if (error) throw error;
  return requireDictionaryEntry(data as DictionaryEntryRecord);
}

export async function createOrGetDictionaryEntry(input: VocabularyManualInput): Promise<DictionaryEntryRecord> {
  const normalized = normalizeManualInput(input);
  const errors = validateManualInput(normalized);
  if (errors.length) throw new Error(errors.join(', '));

  const normalizedWord = normalizeWordKey(normalized.word);
  const { data: existing, error: existingError } = await supabase.from('dictionary_entries').select('*').eq('normalized_word', normalizedWord).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return requireDictionaryEntry(existing as DictionaryEntryRecord);

  const payload = {
    normalized_word: normalizedWord,
    word: normalized.word.trim(),
    phonetic: null,
    audio_url: null,
    part_of_speech: normalized.partOfSpeech ?? null,
    english_definition: normalized.englishDefinition,
    vietnamese_meaning: normalized.vietnameseMeaning ?? normalized.englishDefinition,
    examples: normalized.examples,
    synonyms: normalized.synonyms,
    antonyms: normalized.antonyms,
    provider: 'manual',
    raw_response: { collocations: normalized.collocations },
  };
  const { data, error } = await supabase.from('dictionary_entries').insert(payload).select().single();
  if (error) throw error;
  return requireDictionaryEntry(data as DictionaryEntryRecord);
}

async function getUserVocabularyByEntry(userId: string, dictionaryEntryId: string): Promise<StudentVocabularyItem | null> {
  const { data, error } = await supabase
    .from('user_vocabulary')
    .select('*, dictionary_entries(*)')
    .eq('user_id', userId)
    .eq('dictionary_entry_id', dictionaryEntryId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapStudentVocabularyRow(data as JoinedUserVocabularyRow) : null;
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

export async function listStudentVocabulary(userId: string): Promise<StudentVocabularyItem[]> {
  const { data, error } = await supabase
    .from('user_vocabulary')
    .select('*, dictionary_entries(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as JoinedUserVocabularyRow[]).map(mapStudentVocabularyRow);
}

export async function listVocabulary(userId: string): Promise<Vocabulary[]> {
  const items = await listStudentVocabulary(userId);
  return items.map((item) => ({
    id: item.id,
    user_id: item.user_id,
    lesson_id: item.lesson_id,
    word: item.word,
    phonetic: item.phonetic,
    part_of_speech: item.part_of_speech,
    english_definition: item.english_definition,
    vietnamese_meaning: item.vietnamese_meaning,
    example_sentence: item.example_sentence,
    status: item.status,
    lookup_count: item.lookup_count,
    created_at: item.created_at,
  }));
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

export async function saveManualStudentVocabulary(userId: string, input: VocabularyManualInput): Promise<{ status: 'saved' | 'duplicate' }> {
  const normalized = normalizeManualInput(input);
  const entry = await createOrGetDictionaryEntry(normalized);
  const existing = await getUserVocabularyByEntry(userId, entry.id);
  if (existing) return { status: 'duplicate' };

  const { error } = await supabase.from('user_vocabulary').insert({
    user_id: userId,
    dictionary_entry_id: entry.id,
    status: 'new' as VocabularyStatus,
    personal_note: normalized.note ?? null,
  });
  if (error) throw error;
  return { status: 'saved' };
}

export async function saveManualTeacherVocabulary(teacherId: string, input: VocabularyManualInput): Promise<{ status: 'saved' | 'duplicate' }> {
  const normalized = normalizeManualInput(input);
  const entry = await createOrGetDictionaryEntry(normalized);
  const { data: existing, error: existingError } = await supabase
    .from('teacher_vocabulary')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('dictionary_entry_id', entry.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { status: 'duplicate' };

  const { error } = await supabase.from('teacher_vocabulary').insert({
    teacher_id: teacherId,
    dictionary_entry_id: entry.id,
    note: normalized.note ?? null,
    difficulty: normalized.difficulty ?? null,
  });
  if (error) throw error;
  return { status: 'saved' };
}

export async function validateVocabularyImportRows(teacherId: string, rows: VocabularyManualInput[]): Promise<VocabularyImportPreviewRow[]> {
  const { data, error } = await supabase
    .from('teacher_vocabulary')
    .select('dictionary_entries(normalized_word)')
    .eq('teacher_id', teacherId);
  if (error) throw error;

  const existingWords = new Set(
    ((data ?? []) as Array<{ dictionary_entries: Array<{ normalized_word: string }> | null }>)
      .map((row) => row.dictionary_entries?.[0]?.normalized_word)
      .filter(Boolean),
  );
  const seen = new Set<string>();

  return rows.map((row, index) => {
    const input = normalizeManualInput(row);
    const wordKey = normalizeWordKey(input.word);
    const errors = validateManualInput(input);
    if (row.difficulty && !input.difficulty) errors.push('difficulty không hợp lệ');
    const isDuplicateInFile = Boolean(wordKey && seen.has(wordKey));
    if (wordKey) seen.add(wordKey);
    const isDuplicateInStore = existingWords.has(wordKey);
    const duplicateErrors = [isDuplicateInFile ? 'từ bị trùng trong file' : '', isDuplicateInStore ? 'từ đã có trong Kho từ vựng' : ''].filter(Boolean);
    const status = errors.length ? 'invalid' : duplicateErrors.length ? 'duplicate' : 'valid';
    return { rowNumber: index + 2, input, status, errors: [...errors, ...duplicateErrors], selected: status === 'valid' };
  });
}

export async function importTeacherVocabularyBatch(teacherId: string, rows: VocabularyManualInput[]): Promise<{ imported: number; duplicates: number }> {
  let imported = 0;
  let duplicates = 0;
  for (const row of rows) {
    const result = await saveManualTeacherVocabulary(teacherId, row);
    if (result.status === 'saved') imported += 1;
    else duplicates += 1;
  }
  return { imported, duplicates };
}

export async function updateVocabularyStatus(id: string, status: VocabularyStatus): Promise<void> {
  await updateStudentVocabularyStatus(id, status);
}

export async function updateStudentVocabularyStatus(id: string, status: VocabularyStatus): Promise<void> {
  const { error } = await supabase.from('user_vocabulary').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateStudentVocabularyNote(id: string, personalNote: string): Promise<void> {
  const { error } = await supabase.from('user_vocabulary').update({ personal_note: personalNote.trim() || null }).eq('id', id);
  if (error) throw error;
}

export async function deleteStudentVocabulary(id: string): Promise<void> {
  const { error } = await supabase.from('user_vocabulary').delete().eq('id', id);
  if (error) throw error;
}

export async function incrementVocabularySearch(id: string, count: number): Promise<void> {
  const { error } = await supabase.from('user_vocabulary').update({ lookup_count: count + 1 }).eq('id', id);
  if (error) throw error;
}

export async function listTeacherVocabulary(teacherId: string): Promise<TeacherVocabularyItem[]> {
  const { data, error } = await supabase
    .from('teacher_vocabulary')
    .select('*, dictionary_entries(*)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as JoinedTeacherVocabularyRow[]).map(mapTeacherVocabularyRow);
}

export async function updateTeacherVocabularyNote(id: string, note: string): Promise<void> {
  const { error } = await supabase.from('teacher_vocabulary').update({ note: note.trim() || null }).eq('id', id);
  if (error) throw error;
}

export async function updateTeacherVocabularyDifficulty(id: string, difficulty: TeacherVocabularyDifficulty | null): Promise<void> {
  const { error } = await supabase.from('teacher_vocabulary').update({ difficulty }).eq('id', id);
  if (error) throw error;
}

function mapTeacherStudent(row: TeacherStudentRow): TeacherStudent {
  return {
    id: row.id,
    teacher_id: row.teacher_id,
    student_id: row.student_id,
    student_name: row.profiles?.display_name ?? 'Học viên',
    student_email: row.profiles?.email ?? '',
    created_at: row.created_at,
  };
}

function mapAssignment(row: JoinedAssignmentRow): VocabularyAssignment {
  const entry = requireDictionaryEntry(row.dictionary_entries);
  return {
    id: row.id,
    teacher_id: row.teacher_id,
    student_id: row.student_id,
    dictionary_entry_id: row.dictionary_entry_id,
    word: entry.word,
    phonetic: entry.phonetic,
    audio_url: entry.audio_url,
    part_of_speech: entry.part_of_speech,
    english_definition: entry.english_definition,
    vietnamese_meaning: entry.vietnamese_meaning,
    examples: entry.examples,
    synonyms: entry.synonyms,
    antonyms: entry.antonyms,
    status: row.status,
    note: row.note,
    assigned_at: row.assigned_at,
    completed_at: row.completed_at,
  };
}

function mapStudyLibraryItem(item: StudentVocabularyItem): StudyVocabularyItem {
  return {
    id: `library:${item.id}`,
    recordId: item.id,
    recordType: 'library',
    dictionaryEntryId: item.dictionary_entry_id,
    word: item.word,
    partOfSpeech: item.part_of_speech,
    phonetic: item.phonetic,
    audioUrl: item.audio_url,
    englishDefinition: item.english_definition,
    vietnameseMeaning: item.vietnamese_meaning,
    examples: item.examples,
    status: item.status,
  };
}

function mapStudyAssignedItem(item: VocabularyAssignment): StudyVocabularyItem {
  return {
    id: `assigned:${item.id}`,
    recordId: item.id,
    recordType: 'assigned',
    dictionaryEntryId: item.dictionary_entry_id,
    word: item.word,
    partOfSpeech: item.part_of_speech,
    phonetic: item.phonetic,
    audioUrl: item.audio_url,
    englishDefinition: item.english_definition,
    vietnameseMeaning: item.vietnamese_meaning,
    examples: item.examples,
    status: item.status,
  };
}

function uniqueStudyItems(items: StudyVocabularyItem[]): StudyVocabularyItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.dictionaryEntryId)) return false;
    seen.add(item.dictionaryEntryId);
    return true;
  });
}

export async function listTeacherStudents(teacherId: string): Promise<TeacherStudent[]> {
  const { data, error } = await supabase
    .from('teacher_students')
    .select('id, teacher_id, student_id, created_at, profiles!teacher_students_student_id_fkey(display_name,email)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as TeacherStudentRow[]).map(mapTeacherStudent);
}

export async function addTeacherStudentByEmail(email: string): Promise<void> {
  const { error } = await supabase.rpc('add_teacher_student_by_email', { p_email: email.trim().toLowerCase() });
  if (error) throw error;
}

export async function removeTeacherStudent(id: string): Promise<void> {
  const { error } = await supabase.from('teacher_students').delete().eq('id', id);
  if (error) throw error;
}

export async function assignVocabularyToStudents(teacherId: string, studentIds: string[], dictionaryEntryIds: string[]): Promise<void> {
  const rows = studentIds.flatMap((studentId) => dictionaryEntryIds.map((dictionaryEntryId) => ({
    teacher_id: teacherId,
    student_id: studentId,
    dictionary_entry_id: dictionaryEntryId,
    status: 'new' as VocabularyStatus,
  })));
  if (!rows.length) return;

  const { error } = await supabase.from('vocabulary_assignments').upsert(rows, { onConflict: 'teacher_id,student_id,dictionary_entry_id' });
  if (error) throw error;

  const notifications = studentIds.map((studentId) => ({
    user_id: studentId,
    actor_id: teacherId,
    type: 'vocabulary_assignment',
    title: 'Bạn có từ vựng mới được giao',
    message: `Giáo viên đã giao ${dictionaryEntryIds.length} từ mới cho bạn.`,
  }));
  const { error: notificationError } = await supabase.from('notifications').insert(notifications);
  if (notificationError) throw notificationError;
}

export async function listAssignmentsForStudent(studentId: string): Promise<VocabularyAssignment[]> {
  const { data, error } = await supabase
    .from('vocabulary_assignments')
    .select('*, dictionary_entries(*)')
    .eq('student_id', studentId)
    .order('assigned_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as JoinedAssignmentRow[]).map(mapAssignment);
}

export async function updateAssignmentStatus(id: string, status: VocabularyStatus): Promise<void> {
  const { error } = await supabase.from('vocabulary_assignments').update({ status, completed_at: status === 'known' ? new Date().toISOString() : null }).eq('id', id);
  if (error) throw error;
}

export async function listStudyVocabulary(options: ListStudyVocabularyOptions): Promise<StudyVocabularyItem[]> {
  const [libraryItems, assignedItems] = await Promise.all([
    listStudentVocabulary(options.userId),
    listAssignmentsForStudent(options.userId),
  ]);

  const libraryStudyItems = libraryItems.map(mapStudyLibraryItem);
  const assignedStudyItems = assignedItems.map(mapStudyAssignedItem);

  const items = options.source === 'assigned'
    ? assignedStudyItems
    : options.source === 'all'
      ? uniqueStudyItems([...libraryStudyItems, ...assignedStudyItems])
      : libraryStudyItems.filter((item) => item.status === options.source);

  return typeof options.limit === 'number' ? items.slice(0, options.limit) : items;
}

export async function updateVocabularyLearningStatus(item: StudyVocabularyItem, status: VocabularyStatus): Promise<void> {
  if (item.recordType === 'assigned') {
    await updateAssignmentStatus(item.recordId, status);
    return;
  }

  await updateStudentVocabularyStatus(item.recordId, status);
}

export async function saveQuizAttempt(input: QuizAttemptInput): Promise<QuizResult> {
  const { data, error } = await supabase.from('quiz_results').insert({
    user_id: input.userId,
    score: input.score,
    total: input.totalQuestions,
    total_questions: input.totalQuestions,
    correct_count: input.correctCount,
    mode: input.mode,
    source: input.source,
    answers: input.answers,
  }).select().single();
  if (error) throw error;
  return data as QuizResult;
}

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
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
