export type UserRole = 'teacher' | 'student';
export type VocabularyStatus = 'new' | 'learning' | 'known' | 'difficult';
export type TeacherVocabularyDifficulty = 'easy' | 'medium' | 'hard';

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

export interface DictionaryEntryRecord {
  id: string;
  normalized_word: string;
  word: string;
  phonetic: string | null;
  audio_url: string | null;
  part_of_speech: string | null;
  english_definition: string;
  vietnamese_meaning: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  provider: string;
  raw_response: unknown;
  created_at: string;
  updated_at: string;
}

export interface UserVocabularyRecord {
  id: string;
  user_id: string;
  dictionary_entry_id: string;
  lesson_id: string | null;
  status: VocabularyStatus;
  personal_note: string | null;
  lookup_count: number;
  created_at: string;
  updated_at: string;
}

export interface TeacherVocabularyRecord {
  id: string;
  teacher_id: string;
  dictionary_entry_id: string;
  note: string | null;
  difficulty: TeacherVocabularyDifficulty | null;
  created_at: string;
  updated_at: string;
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

export interface StudentVocabularyItem extends Vocabulary {
  dictionary_entry_id: string;
  audio_url: string | null;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  personal_note: string | null;
  updated_at: string;
}

export interface TeacherVocabularyItem {
  id: string;
  teacher_id: string;
  dictionary_entry_id: string;
  word: string;
  phonetic: string | null;
  audio_url: string | null;
  part_of_speech: string | null;
  english_definition: string;
  vietnamese_meaning: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  note: string | null;
  difficulty: TeacherVocabularyDifficulty | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherStudent {
  id: string;
  teacher_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  created_at: string;
}

export interface VocabularyAssignment {
  id: string;
  teacher_id: string;
  student_id: string;
  dictionary_entry_id: string;
  word: string;
  phonetic: string | null;
  audio_url: string | null;
  part_of_speech: string | null;
  english_definition: string;
  vietnamese_meaning: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  status: VocabularyStatus;
  note: string | null;
  assigned_at: string;
  completed_at: string | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
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

export type StudyVocabularySource = 'all' | 'new' | 'learning' | 'difficult' | 'assigned';
export type StudyVocabularyRecordType = 'library' | 'assigned';
export type QuizMode = 'definition' | 'word';

export interface StudyVocabularyItem {
  id: string;
  recordId: string;
  recordType: StudyVocabularyRecordType;
  dictionaryEntryId: string;
  word: string;
  partOfSpeech: string | null;
  phonetic: string | null;
  audioUrl: string | null;
  englishDefinition: string;
  vietnameseMeaning: string;
  examples: string[];
  status: VocabularyStatus;
}

export interface ListStudyVocabularyOptions {
  userId: string;
  source: StudyVocabularySource;
  limit?: number;
}

export interface QuizAttemptAnswer {
  question: string;
  correctAnswer: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

export interface QuizAttemptInput {
  userId: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  mode: QuizMode;
  source: StudyVocabularySource;
  answers: QuizAttemptAnswer[];
}

export interface QuizResult {
  id: string;
  user_id: string;
  lesson_id: string | null;
  score: number;
  total: number;
  total_questions: number;
  correct_count: number;
  mode: QuizMode;
  source: StudyVocabularySource;
  answers: QuizAttemptAnswer[];
  created_at: string;
}

export interface DashboardSummary {
  vocabulary: number;
  known: number;
  difficult: number;
  openDeadlines: number;
}
