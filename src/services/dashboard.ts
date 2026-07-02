import type { DashboardSummary } from '../types';
import { getUnifiedStudentVocabulary } from './vocabulary';
export { listTeacherAssignmentSummaries, listTeacherStudents, listTeacherVocabulary } from './data';

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const items = await getUnifiedStudentVocabulary(userId);
  return {
    vocabulary: items.length,
    known: items.filter((item) => item.status === 'known').length,
    difficult: items.filter((item) => item.status === 'difficult').length,
    openDeadlines: 0,
  };
}
