export type UserRole = 'teacher' | 'student';
export type VocabularyStatus = 'new' | 'known' | 'difficult';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  daily_goal: number;
  reminder_enabled: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  join_code: string;
  cover_color: string;
  created_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
  created_at: string;
}

export interface Vocabulary {
  id: string;
  user_id: string;
  lesson_id: string | null;
  word: string;
  phonetic: string | null;
  part_of_speech: string | null;
  english_definition: string;
  vietnamese_meaning: string;
  example_sentence: string | null;
  status: VocabularyStatus;
  lookup_count: number;
  created_at: string;
}

export interface Deadline {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  due_date: string;
  completed: boolean;
  created_at: string;
}

export interface QuizResult {
  id: string;
  user_id: string;
  lesson_id: string | null;
  score: number;
  total: number;
  created_at: string;
}

export interface DashboardSummary {
  vocabulary: number;
  known: number;
  difficult: number;
  openDeadlines: number;
}
