export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      dictionary_entries: {
        Row: {
          id: string;
          normalized_word: string;
          word: string;
          phonetic: string | null;
          audio_url: string | null;
          part_of_speech: string | null;
          english_definition: string;
          vietnamese_meaning: string;
          examples: Json;
          synonyms: Json;
          antonyms: Json;
          collocations: Json;
          provider: string;
          raw_response: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          normalized_word: string;
          word: string;
          phonetic?: string | null;
          audio_url?: string | null;
          part_of_speech?: string | null;
          english_definition?: string;
          vietnamese_meaning?: string;
          examples?: Json;
          synonyms?: Json;
          antonyms?: Json;
          collocations?: Json;
          provider?: string;
          raw_response?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dictionary_entries']['Insert']>;
      };
      user_vocabulary: {
        Row: {
          id: string;
          user_id: string;
          dictionary_entry_id: string;
          lesson_id: string | null;
          status: Database['public']['Enums']['vocabulary_status'];
          personal_note: string | null;
          lookup_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          dictionary_entry_id: string;
          lesson_id?: string | null;
          status?: Database['public']['Enums']['vocabulary_status'];
          personal_note?: string | null;
          lookup_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_vocabulary']['Insert']>;
      };
      teacher_vocabulary: {
        Row: {
          id: string;
          teacher_id: string;
          dictionary_entry_id: string;
          note: string | null;
          difficulty: 'easy' | 'medium' | 'hard' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id?: string;
          dictionary_entry_id: string;
          note?: string | null;
          difficulty?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['teacher_vocabulary']['Insert']>;
      };
      vocabulary_assignments: {
        Row: {
          id: string;
          teacher_id: string;
          student_id: string;
          dictionary_entry_id: string;
          status: Database['public']['Enums']['vocabulary_status'];
          note: string | null;
          start_at: string;
          due_at: string | null;
          priority: 'low' | 'medium' | 'high';
          assigned_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          teacher_id?: string;
          student_id: string;
          dictionary_entry_id: string;
          status?: Database['public']['Enums']['vocabulary_status'];
          note?: string | null;
          start_at?: string;
          due_at?: string | null;
          priority?: 'low' | 'medium' | 'high';
          assigned_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['vocabulary_assignments']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: string;
          title: string;
          message: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: string;
          title: string;
          message?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      vocabulary: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string | null;
          word: string;
          phonetic: string | null;
          part_of_speech: string | null;
          english_definition: string;
          vietnamese_meaning: string;
          example_sentence: string | null;
          status: Database['public']['Enums']['vocabulary_status'];
          lookup_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          lesson_id?: string | null;
          word: string;
          phonetic?: string | null;
          part_of_speech?: string | null;
          english_definition?: string;
          vietnamese_meaning?: string;
          example_sentence?: string | null;
          status?: Database['public']['Enums']['vocabulary_status'];
          lookup_count?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['vocabulary']['Insert']>;
      };
      profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      courses: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      course_members: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      lessons: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      deadlines: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      quiz_results: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
    Views: {
      accessible_courses: { Row: Record<string, unknown> };
      accessible_lessons: { Row: Record<string, unknown> };
      teacher_students: { Row: Record<string, unknown> };
    };
    Functions: {
      is_course_member: { Args: { p_course_id: string }; Returns: boolean };
      is_course_teacher: { Args: { p_course_id: string }; Returns: boolean };
      is_teacher: { Args: never; Returns: boolean };
      join_course_by_code: { Args: { p_code: string }; Returns: undefined };
    };
    Enums: {
      user_role: 'teacher' | 'student';
      vocabulary_status: 'new' | 'learning' | 'known' | 'difficult';
    };
  };
};
