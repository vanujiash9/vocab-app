import { supabase } from '../lib/supabase';
import { isStudentAIStudyResponse, isTeacherAIWordSetResponse } from '../features/ai/ai.utils';
import type {
  StudentAIStudyRequest,
  StudentAIStudyResponse,
  TeacherAIWordSetRequest,
  TeacherAIWordSetResponse,
} from '../features/ai/ai.types';

function getFunctionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'AI gateway đang tạm thời không khả dụng. Vui lòng kiểm tra lại cấu hình gateway hoặc thử lại sau.';
}

export async function getStudentStudyOrganizer(params: StudentAIStudyRequest): Promise<StudentAIStudyResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-study-organizer', {
      body: {
        task: 'student_study_organizer',
        ...params,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!isStudentAIStudyResponse(data)) {
      throw new Error('AI trả về dữ liệu không hợp lệ cho phiên học.');
    }

    return data;
  } catch (error: unknown) {
    throw new Error(getFunctionErrorMessage(error));
  }
}

export async function getTeacherWordSetOrganizer(params: TeacherAIWordSetRequest): Promise<TeacherAIWordSetResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-study-organizer', {
      body: {
        task: 'teacher_word_set_organizer',
        ...params,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!isTeacherAIWordSetResponse(data)) {
      throw new Error('AI trả về dữ liệu không hợp lệ cho bộ từ.');
    }

    return data;
  } catch (error: unknown) {
    throw new Error(getFunctionErrorMessage(error));
  }
}
