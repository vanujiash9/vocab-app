import { supabase } from '../lib/supabase';
import { assignVocabularyToStudents, listAssignmentsForStudent, listTeacherStudents, listTeacherVocabulary } from './data';
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

  await assignVocabularyToStudents(input.teacherId, uniqueStudentIds, uniqueEntryIds);

  const requestedTotal = uniqueStudentIds.length * uniqueEntryIds.length;
  const createdAssignments = requestedTotal - existingPairs.size;
  return {
    createdAssignments,
    skippedExistingAssignments: existingPairs.size,
    notifiedStudentIds: createdAssignments ? uniqueStudentIds : [],
  };
}

// ponytail: assignment creation now delegates to the DB RPC so assignment + notification side effects stay in one transaction; add note/dueDate support there when the schema really uses them.
