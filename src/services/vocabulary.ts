import {
  deleteStudentVocabulary,
  listAssignmentsForStudent,
  listStudentVocabulary,
  saveManualStudentVocabulary,
  updateAssignmentStatus,
  updateStudentVocabularyStatus,
} from './data';
import type { StudentVocabularyItem, VocabularyAssignment, VocabularyStatus } from '../types';

const ASSIGNED_PREVIEW_LIMIT = 5;
const DUE_SOON_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export type UnifiedVocabularyFilter = 'all' | 'assigned' | 'learning' | 'difficult' | 'known';

export interface StudentVocabularyOverview {
  assignedCount: number;
  dueSoonCount: number;
  latestAssignedWords: UnifiedStudentVocabularyItem[];
  hasMoreAssignedWords: boolean;
}

export interface UnifiedStudentVocabularyItem {
  id: string;
  dictionaryEntryId: string;
  source: 'assigned' | 'library';
  libraryId: string | null;
  assignmentId: string | null;
  word: string;
  phonetic: string | null;
  audioUrl: string | null;
  partOfSpeech: string | null;
  englishDefinition: string;
  vietnameseMeaning: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  status: VocabularyStatus;
  assignedAt: string | null;
  dueAt: string | null;
  teacherNote: string | null;
  personalNote: string | null;
  lookupCount: number;
  createdAt: string;
}

function getDueAt(item: VocabularyAssignment): string | null {
  return typeof item.due_at === 'string' && item.due_at.trim() ? item.due_at : null;
}

function buildLibraryItem(item: StudentVocabularyItem): UnifiedStudentVocabularyItem {
  return {
    id: `library:${item.id}`,
    dictionaryEntryId: item.dictionary_entry_id,
    source: 'library',
    libraryId: item.id,
    assignmentId: null,
    word: item.word,
    phonetic: item.phonetic,
    audioUrl: item.audio_url,
    partOfSpeech: item.part_of_speech,
    englishDefinition: item.english_definition,
    vietnameseMeaning: item.vietnamese_meaning,
    examples: item.examples,
    synonyms: item.synonyms,
    antonyms: item.antonyms,
    status: item.status,
    assignedAt: null,
    dueAt: null,
    teacherNote: null,
    personalNote: item.personal_note,
    lookupCount: item.lookup_count,
    createdAt: item.created_at,
  };
}

function buildAssignedItem(item: VocabularyAssignment): UnifiedStudentVocabularyItem {
  return {
    id: `assigned:${item.id}`,
    dictionaryEntryId: item.dictionary_entry_id,
    source: 'assigned',
    libraryId: null,
    assignmentId: item.id,
    word: item.word,
    phonetic: item.phonetic,
    audioUrl: item.audio_url,
    partOfSpeech: item.part_of_speech,
    englishDefinition: item.english_definition,
    vietnameseMeaning: item.vietnamese_meaning,
    examples: item.examples,
    synonyms: item.synonyms,
    antonyms: item.antonyms,
    status: item.status,
    assignedAt: item.assigned_at,
    dueAt: getDueAt(item),
    teacherNote: item.note,
    personalNote: null,
    lookupCount: 0,
    createdAt: item.assigned_at,
  };
}

function mergeAssignedWithLibrary(assignment: VocabularyAssignment, library: StudentVocabularyItem): UnifiedStudentVocabularyItem {
  const base = buildAssignedItem(assignment);
  return {
    ...base,
    libraryId: library.id,
    personalNote: library.personal_note,
    lookupCount: library.lookup_count,
    createdAt: library.created_at,
  };
}

export { saveManualStudentVocabulary };

export async function getStudentVocabularyOverview(userId: string): Promise<StudentVocabularyOverview> {
  const assignments = await listAssignmentsForStudent(userId);
  const latestAssignedWords = assignments.slice(0, ASSIGNED_PREVIEW_LIMIT).map(buildAssignedItem);
  const dueSoonCount = assignments.filter((item) => {
    const dueAt = getDueAt(item);
    if (!dueAt) return false;
    const dueTime = new Date(dueAt).getTime();
    if (Number.isNaN(dueTime)) return false;
    return dueTime >= Date.now() && dueTime - Date.now() <= DUE_SOON_WINDOW_MS;
  }).length;

  return {
    assignedCount: assignments.length,
    dueSoonCount,
    latestAssignedWords,
    hasMoreAssignedWords: assignments.length > ASSIGNED_PREVIEW_LIMIT,
  };
}

export async function getUnifiedStudentVocabulary(userId: string): Promise<UnifiedStudentVocabularyItem[]> {
  const [libraryItems, assignedItems] = await Promise.all([
    listStudentVocabulary(userId),
    listAssignmentsForStudent(userId),
  ]);

  const libraryByDictionaryEntryId = libraryItems.reduce<Record<string, StudentVocabularyItem>>((items, item) => ({
    ...items,
    [item.dictionary_entry_id]: item,
  }), {});

  const assignedDictionaryEntryIds = new Set(assignedItems.map((item) => item.dictionary_entry_id));

  const mergedAssignedItems = assignedItems.map((item) => {
    const libraryItem = libraryByDictionaryEntryId[item.dictionary_entry_id];
    return libraryItem ? mergeAssignedWithLibrary(item, libraryItem) : buildAssignedItem(item);
  });

  const libraryOnlyItems = libraryItems
    .filter((item) => !assignedDictionaryEntryIds.has(item.dictionary_entry_id))
    .map(buildLibraryItem);

  return [...mergedAssignedItems, ...libraryOnlyItems];
}

export async function updateVocabularyStatus(item: UnifiedStudentVocabularyItem, status: VocabularyStatus): Promise<void> {
  if (item.assignmentId) {
    await updateAssignmentStatus(item.assignmentId, status);
    return;
  }

  if (!item.libraryId) {
    throw new Error('Không tìm thấy bản ghi thư viện để cập nhật trạng thái.');
  }

  await updateStudentVocabularyStatus(item.libraryId, status);
}

export async function removeFromLibrary(libraryId: string): Promise<void> {
  await deleteStudentVocabulary(libraryId);
}
