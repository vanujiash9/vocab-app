export type StudentAIWordSource =
  | 'all'
  | 'difficult'
  | 'learning'
  | 'assigned';

export type StudentAIRecommendedMode =
  | 'flashcard'
  | 'quiz'
  | 'review';

export interface AIStudySection {
  title: string;
  words: string[];
  activity: 'flashcard' | 'quiz' | 'review';
}

export interface StudentAIStudyResult {
  title: string;
  summary: string;
  sections: AIStudySection[];
  tip: string;
  recommendedMode: StudentAIRecommendedMode;
  rationale?: string;
  nextStep?: string;
}

export type TeacherAIGoal =
  | 'review'
  | 'ielts_writing'
  | 'speaking'
  | 'new_words';

export interface AIWordGroup {
  title: string;
  words: string[];
}

export interface TeacherAIWordSetResult {
  title: string;
  summary: string;
  groups: AIWordGroup[];
  messageToStudent: string;
}

export interface StudentAIStudyRequest {
  minutes: number;
  source: StudentAIWordSource;
}

export interface TeacherAIWordSetRequest {
  count: number;
  goal: TeacherAIGoal;
}

export interface TeacherAIWordCandidate {
  id: string;
  word: string;
}

export interface TeacherAIWordSetResponse {
  result: TeacherAIWordSetResult;
  selectedWords: string[];
  candidates: TeacherAIWordCandidate[];
}

export interface StudentAIStudyResponse {
  result: StudentAIStudyResult;
}
