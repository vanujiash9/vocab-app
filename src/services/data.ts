import { supabase } from '../lib/supabase';
import type { Course, DashboardSummary, Deadline, Lesson, Profile, QuizResult, Vocabulary, VocabularyStatus } from '../types';

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const [vocabulary, deadlines] = await Promise.all([
    supabase.from('vocabulary').select('id,status').eq('user_id', userId),
    supabase.from('deadlines').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', false),
  ]);
  const error = vocabulary.error ?? deadlines.error;
  if (error) throw error;
  const words = (vocabulary.data ?? []) as Pick<Vocabulary, 'id' | 'status'>[];
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
  const { data, error } = await supabase.from('vocabulary').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Vocabulary[];
}

export async function addVocabulary(userId: string, word: string): Promise<Vocabulary> {
  const normalized = word.trim().toLowerCase();
  const payload = {
    user_id: userId,
    word: normalized,
    phonetic: null,
    part_of_speech: null,
    english_definition: 'Connect a dictionary provider to replace this placeholder definition.',
    vietnamese_meaning: 'Bạn có thể sửa nghĩa tiếng Việt sau khi lưu.',
    example_sentence: `Example sentence using “${normalized}”.`,
    status: 'new' as VocabularyStatus,
    lookup_count: 1,
  };
  const { data, error } = await supabase.from('vocabulary').upsert(payload, { onConflict: 'user_id,word' }).select().single();
  if (error) throw error;
  return data as Vocabulary;
}

export async function updateVocabularyStatus(id: string, status: VocabularyStatus): Promise<void> {
  const { error } = await supabase.from('vocabulary').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function incrementVocabularySearch(id: string, count: number): Promise<void> {
  const { error } = await supabase.from('vocabulary').update({ lookup_count: count + 1 }).eq('id', id);
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
