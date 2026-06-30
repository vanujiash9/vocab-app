import { supabase } from '../lib/supabase';
import { listAssignmentsForStudent, listTeacherStudents, listTeacherVocabulary } from './data';
import type { TeacherStudent, TeacherVocabularyDifficulty, TeacherVocabularyItem, VocabularyAssignment } from '../types';

const RECENT_WORD_WINDOW_DAYS = 7;

export type AssignableDifficultyFilter = 'all' | 'unset' | TeacherVocabularyDifficulty;
export type AssignableSort = 'newest' | 'oldest' | 'az' | 'difficulty';

export interface AssignableVocabularyFilters {
  search?: string;
  difficulty?: AssignableDifficultyFilter;
  onlyRecent?: boolean;
  sort?: AssignableSort;
}

export interface AssignableVocabularyOverview {
  availableWords: TeacherVocabularyItem[];
  assignedCount: number;
  assignableCount: number;
}

export interface CreateVocabularyAssignmentsInput {
  teacherId: string;
  studentIds: string[];
  dictionaryEntryIds: string[];
  note?: string;
  dueDate?: string | null;
}

export interface CreateVocabularyAssignmentsResult {
  createdAssignments: number;
  skippedExistingAssignments: number;
  notifiedStudentIds: string[];
}

function normalizeSearch(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function isRecentWord(item: TeacherVocabularyItem): boolean {
  const createdAt = new Date(item.created_at).getTime();
  if (Number.isNaN(createdAt)) return false;
  const recentWindow = RECENT_WORD_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt <= recentWindow;
}

function difficultyRank(value: TeacherVocabularyDifficulty | null): number {
  if (value === 'hard') return 0;
  if (value === 'medium') return 1;
  if (value === 'easy') return 2;
  return 3;
}

function matchesSearch(item: TeacherVocabularyItem, search: string): boolean {
  if (!search) return true;
  const text = [item.word, item.english_definition, item.vietnamese_meaning, item.note ?? ''].join(' ').toLowerCase();
  return text.includes(search);
}

function matchesDifficulty(item: TeacherVocabularyItem, difficulty: AssignableDifficultyFilter): boolean {
  if (difficulty === 'all') return true;
  if (difficulty === 'unset') return !item.difficulty;
  return item.difficulty === difficulty;
}

function sortWords(items: TeacherVocabularyItem[], sort: AssignableSort): TeacherVocabularyItem[] {
  const nextItems = [...items];
  if (sort === 'az') {
    return nextItems.sort((left, right) => left.word.localeCompare(right.word, 'en', { sensitivity: 'base' }));
  }
  if (sort === 'oldest') {
    return nextItems.sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
  }
  if (sort === 'difficulty') {
    return nextItems.sort((left, right) => {
      const rankDiff = difficultyRank(left.difficulty) - difficultyRank(right.difficulty);
      if (rankDiff !== 0) return rankDiff;
      return left.word.localeCompare(right.word, 'en', { sensitivity: 'base' });
    });
  }
  return nextItems.sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

export async function getTeacherStudents(teacherId: string): Promise<TeacherStudent[]> {
  return listTeacherStudents(teacherId);
}

export async function getAssignedVocabularyForStudent(studentId: string): Promise<VocabularyAssignment[]> {
  return listAssignmentsForStudent(studentId);
}

export async function getAssignableVocabularyForStudent(
  teacherId: string,
  studentId: string,
  filters: AssignableVocabularyFilters = {},
): Promise<AssignableVocabularyOverview> {
  const [teacherWords, assignments] = await Promise.all([
    listTeacherVocabulary(teacherId),
    listAssignmentsForStudent(studentId),
  ]);

  const assignedIds = new Set(assignments.map((item) => item.dictionary_entry_id));
  const search = normalizeSearch(filters.search);
  const difficulty = filters.difficulty ?? 'all';
  const sort = filters.sort ?? 'newest';

  const availableWords = sortWords(teacherWords.filter((item) => {
    if (assignedIds.has(item.dictionary_entry_id)) return false;
    if (filters.onlyRecent && !isRecentWord(item)) return false;
    if (!matchesDifficulty(item, difficulty)) return false;
    if (!matchesSearch(item, search)) return false;
    return true;
  }), sort);

  return {
    availableWords,
    assignedCount: assignments.length,
    assignableCount: availableWords.length,
  };
}

export async function createVocabularyAssignments(input: CreateVocabularyAssignmentsInput): Promise<CreateVocabularyAssignmentsResult> {
  const uniqueStudentIds = [...new Set(input.studentIds)];
  const uniqueEntryIds = [...new Set(input.dictionaryEntryIds)];
  if (!uniqueStudentIds.length || !uniqueEntryIds.length) {
    return {
      createdAssignments: 0,
      skippedExistingAssignments: 0,
      notifiedStudentIds: [],
    };
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('vocabulary_assignments')
    .select('student_id, dictionary_entry_id')
    .eq('teacher_id', input.teacherId)
    .in('student_id', uniqueStudentIds)
    .in('dictionary_entry_id', uniqueEntryIds);

  if (existingError) throw existingError;

  const existingPairs = new Set(
    ((existingRows ?? []) as Array<{ student_id: string; dictionary_entry_id: string }>).map((row) => `${row.student_id}:${row.dictionary_entry_id}`),
  );

  const rowsToInsert = uniqueStudentIds.flatMap((studentId) => uniqueEntryIds
    .filter((dictionaryEntryId) => !existingPairs.has(`${studentId}:${dictionaryEntryId}`))
    .map((dictionaryEntryId) => ({
      teacher_id: input.teacherId,
      student_id: studentId,
      dictionary_entry_id: dictionaryEntryId,
      status: 'new',
      note: input.note?.trim() || null,
      // ponytail: dueDate is accepted by the UI/service contract but not persisted because the current schema in this repo does not confirm a due-date column on vocabulary_assignments.
    })));

  if (!rowsToInsert.length) {
    return {
      createdAssignments: 0,
      skippedExistingAssignments: uniqueStudentIds.length * uniqueEntryIds.length,
      notifiedStudentIds: [],
    };
  }

  const { error: insertError } = await supabase.from('vocabulary_assignments').insert(rowsToInsert);
  if (insertError) throw insertError;

  const createdCountByStudent = rowsToInsert.reduce<Record<string, number>>((counts, row) => ({
    ...counts,
    [row.student_id]: (counts[row.student_id] ?? 0) + 1,
  }), {});

  const notifications = Object.entries(createdCountByStudent).map(([studentId, count]) => ({
    user_id: studentId,
    actor_id: input.teacherId,
    type: 'vocabulary_assignment',
    title: 'Bạn có từ vựng mới được giao',
    message: `Giáo viên đã giao ${count} từ mới cho bạn.`,
  }));

  if (notifications.length) {
    const { error: notificationError } = await supabase.from('notifications').insert(notifications);
    if (notificationError) throw notificationError;
  }

  const requestedTotal = uniqueStudentIds.length * uniqueEntryIds.length;
  return {
    createdAssignments: rowsToInsert.length,
    skippedExistingAssignments: requestedTotal - rowsToInsert.length,
    notifiedStudentIds: Object.keys(createdCountByStudent),
  };
}
