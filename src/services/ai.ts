import { supabase } from '../lib/supabase';
import type { ReviewCoachRequest, ReviewCoachResponse, VocabularyStatus } from '../types';
import type {
  StudentAIStudyRequest,
  StudentAIStudyResponse,
  TeacherAIWordSetRequest,
  TeacherAIWordSetResponse,
} from '../features/ai/ai.types';

const AI_AUTH_ERROR_MESSAGE = 'Bạn cần đăng nhập lại để dùng trợ lý ôn tập.';
const AI_GATEWAY_ERROR_MESSAGE = 'Trợ lý ôn tập đang tạm thời không khả dụng. Vui lòng thử lại sau.';

function isReviewCoachAction(value: unknown): value is ReviewCoachResponse['primaryAction'] {
  if (!value || typeof value !== 'object') return false;
  const action = value as ReviewCoachResponse['primaryAction'];
  return typeof action.label === 'string' && typeof action.target === 'string';
}

function isReviewCoachResponse(value: unknown): value is ReviewCoachResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as ReviewCoachResponse;
  return (response.answerType === 'review_recommendation' || response.answerType === 'out_of_scope')
    && typeof response.message === 'string'
    && typeof response.reason === 'string'
    && Array.isArray(response.groups)
    && response.groups.every((group) => group
      && typeof group.title === 'string'
      && Array.isArray(group.words)
      && group.words.every((word) => typeof word === 'string')
      && (group.activity === 'flashcard' || group.activity === 'quiz' || group.activity === 'review')
      && typeof group.reason === 'string')
    && typeof response.quickTip === 'string'
    && isReviewCoachAction(response.primaryAction)
    && (response.secondaryAction === null || isReviewCoachAction(response.secondaryAction));
}

async function getAuthorizationHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error(AI_AUTH_ERROR_MESSAGE);
  }

  return `Bearer ${accessToken}`;
}

function getFunctionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return AI_GATEWAY_ERROR_MESSAGE;
}

export async function sendReviewCoachMessage(params: ReviewCoachRequest): Promise<ReviewCoachResponse> {
  try {
    const authorization = await getAuthorizationHeader();
    const { data, error } = await supabase.functions.invoke('ai-study-organizer', {
      headers: {
        Authorization: authorization,
      },
      body: params,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!isReviewCoachResponse(data)) {
      throw new Error('Trợ lý ôn tập trả về dữ liệu không hợp lệ.');
    }

    return data;
  } catch (error: unknown) {
    throw new Error(getFunctionErrorMessage(error));
  }
}

export function scoreReviewCandidates(candidates: Array<{
  status: VocabularyStatus;
  isAssigned: boolean;
  dueAt: string | null;
}>): number[] {
  const now = Date.now();
  return candidates.map((candidate) => {
    const dueSoon = candidate.dueAt ? new Date(candidate.dueAt).getTime() - now <= 1000 * 60 * 60 * 24 * 3 : false;
    return (candidate.status === 'difficult' ? 50 : candidate.status === 'learning' ? 35 : candidate.status === 'new' ? 15 : 5)
      + (candidate.isAssigned ? 25 : 0)
      + (dueSoon ? 20 : 0);
  });
}

const reviewCoachSelfCheck = (() => {
  const scores = scoreReviewCandidates([
    { status: 'difficult', isAssigned: true, dueAt: new Date(Date.now() + 1000).toISOString() },
    { status: 'known', isAssigned: false, dueAt: null },
  ]);
  if (!(scores[0] > scores[1])) {
    throw new Error('Review coach scoring self-check failed.');
  }
  return true;
})();

void reviewCoachSelfCheck;

export async function getStudentStudyOrganizer(_params: StudentAIStudyRequest): Promise<StudentAIStudyResponse> {
  throw new Error('Tính năng Trợ lý AI cũ đã được thay bằng Trợ lý ôn tập trong màn Ôn tập.');
}

export async function getTeacherWordSetOrganizer(_params: TeacherAIWordSetRequest): Promise<TeacherAIWordSetResponse> {
  throw new Error('Tính năng Trợ lý AI cũ đã được thay bằng Trợ lý ôn tập trong màn Ôn tập.');
}

// ponytail: dueSoon uses a simple 3-day window because the product only needs prioritization, not a scheduler.
// add when there is a real spaced-repetition rule in the schema.
// ponytail: teacher/global AI flows are intentionally stubbed instead of expanded.
// add when a real teacher review assistant requirement exists.
