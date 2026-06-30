/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI__API_KEY') ?? Deno.env.get('OPENAI_API_KEY');
const OPENAI_BASE_URL = Deno.env.get('OPENAI__BASE_URL') ?? 'https://api.openai.com/v1';
const OPENAI_MODEL = Deno.env.get('OPENAI__MODEL') ?? Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const OPENAI_TIMEOUT_SECONDS = Number(Deno.env.get('OPENAI__TIMEOUT_SECONDS') ?? '30');
const OUT_OF_SCOPE_MESSAGE = 'Mình chỉ hỗ trợ gợi ý ôn tập dựa trên từ vựng của bạn.';
const OUT_OF_SCOPE_TIP = 'Bạn có thể hỏi: Tôi nên ôn gì hôm nay?';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY.');
}

interface ProfileRow {
  id: string;
  role: 'teacher' | 'student';
}

interface DictionaryEntryRow {
  id: string;
  word: string;
  phonetic: string | null;
  part_of_speech: string | null;
  english_definition: string;
  vietnamese_meaning: string;
}

interface UserVocabularyRow {
  status: 'new' | 'learning' | 'known' | 'difficult';
  updated_at: string;
  lookup_count: number;
  dictionary_entry_id: string;
  dictionary_entries: DictionaryEntryRow | null;
}

interface AssignmentRow {
  status: 'new' | 'learning' | 'known' | 'difficult';
  note: string | null;
  due_at: string | null;
  assigned_at: string;
  dictionary_entry_id: string;
  dictionary_entries: DictionaryEntryRow | null;
}

interface ReviewCoachBody {
  task: 'student_review_chat';
  message: string;
  context: {
    source: 'all' | 'learning' | 'difficult' | 'assigned';
    duration: number;
  };
}

interface ReviewCandidate {
  dictionaryEntryId: string;
  word: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  englishDefinition: string;
  vietnameseMeaning: string;
  status: 'new' | 'learning' | 'known' | 'difficult';
  isAssigned: boolean;
  dueAt: string | null;
  assignedAt: string | null;
  lookupCount: number;
  note: string | null;
  score: number;
}

interface ReviewCoachResponse {
  answerType: 'review_recommendation' | 'out_of_scope';
  message: string;
  reason: string;
  groups: Array<{
    title: string;
    words: string[];
    activity: 'flashcard' | 'quiz' | 'review';
    reason: string;
  }>;
  quickTip: string;
  primaryAction: {
    label: string;
    target: string;
  };
  secondaryAction: {
    label: string;
    target: string;
  } | null;
}

class GatewayConfigError extends Error {}
class GatewayRequestError extends Error {}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}

function badRequest(message: string): Response {
  return json({ error: message }, 400);
}

function normalizeOpenAIEndpoint(rawValue: string): string {
  const normalized = rawValue.trim().replace(/^['"]|['"]$/g, '');
  if (normalized.endsWith('/chat/completions')) return normalized;
  return `${normalized.replace(/\/$/, '')}/chat/completions`;
}

const OPENAI_CHAT_COMPLETIONS_URL = normalizeOpenAIEndpoint(OPENAI_BASE_URL);

function getBody(payload: unknown): ReviewCoachBody | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as Record<string, unknown>;
  if (body.task !== 'student_review_chat') return null;
  if (typeof body.message !== 'string' || !body.message.trim()) return null;
  if (!body.context || typeof body.context !== 'object') return null;
  const context = body.context as Record<string, unknown>;
  if (!['all', 'learning', 'difficult', 'assigned'].includes(String(context.source))) return null;
  if (typeof context.duration !== 'number' || !Number.isFinite(context.duration)) return null;
  return {
    task: 'student_review_chat',
    message: body.message.trim(),
    context: {
      source: context.source as ReviewCoachBody['context']['source'],
      duration: context.duration,
    },
  };
}

function buildOutOfScopeResponse(): ReviewCoachResponse {
  return {
    answerType: 'out_of_scope',
    message: OUT_OF_SCOPE_MESSAGE,
    reason: '',
    groups: [],
    quickTip: OUT_OF_SCOPE_TIP,
    primaryAction: {
      label: 'Mở Ôn tập',
      target: '/review',
    },
    secondaryAction: null,
  };
}

function isAllowedQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    'ôn',
    'flashcard',
    'quiz',
    'được giao',
    'từ nào',
    'hôm nay',
    'đang yếu',
    'bắt đầu',
    'review',
  ].some((keyword) => normalized.includes(keyword));
}

function dueSoon(dueAt: string | null): boolean {
  if (!dueAt) return false;
  const diff = new Date(dueAt).getTime() - Date.now();
  return diff <= 1000 * 60 * 60 * 24 * 3;
}

function scoreCandidate(candidate: Omit<ReviewCandidate, 'score'>): number {
  return (candidate.status === 'difficult' ? 50 : candidate.status === 'learning' ? 35 : candidate.status === 'new' ? 15 : 5)
    + (candidate.isAssigned ? 25 : 0)
    + (dueSoon(candidate.dueAt) ? 20 : 0);
}

function filterBySource(candidates: ReviewCandidate[], source: ReviewCoachBody['context']['source']): ReviewCandidate[] {
  return source === 'assigned'
    ? candidates.filter((candidate) => candidate.isAssigned)
    : source === 'learning'
      ? candidates.filter((candidate) => candidate.status === 'learning')
      : source === 'difficult'
        ? candidates.filter((candidate) => candidate.status === 'difficult')
        : candidates;
}

function dedupeCandidates(candidates: Array<Omit<ReviewCandidate, 'score'>>): ReviewCandidate[] {
  const map = new Map<string, ReviewCandidate>();
  for (const candidate of candidates) {
    const next = { ...candidate, score: scoreCandidate(candidate) };
    const current = map.get(candidate.dictionaryEntryId);
    if (!current || next.score > current.score) {
      map.set(candidate.dictionaryEntryId, next);
    }
  }
  return [...map.values()];
}

function buildFallbackResponse(candidates: ReviewCandidate[], source: ReviewCoachBody['context']['source']): ReviewCoachResponse {
  const topCandidates = candidates.slice(0, 6);
  const topWords = topCandidates.map((candidate) => candidate.word);
  const activity = source === 'assigned' ? 'review' : source === 'difficult' ? 'flashcard' : 'quiz';
  return {
    answerType: 'review_recommendation',
    message: topWords.length
      ? `Bạn nên bắt đầu với ${topWords.slice(0, 3).join(', ')}.`
      : 'Hôm nay bạn nên ôn một nhóm từ ngắn để lấy lại nhịp học.',
    reason: source === 'assigned'
      ? 'Nhóm này ưu tiên các từ được giáo viên giao và các từ sắp đến hạn.'
      : 'Nhóm này ưu tiên từ khó nhớ, từ đang học và các từ cần xử lý sớm.',
    groups: topWords.length ? [{
      title: 'Nhóm nên ôn trước',
      words: topWords,
      activity,
      reason: 'Các từ này có mức ưu tiên cao hơn theo trạng thái học và bài được giao.',
    }] : [],
    quickTip: activity === 'flashcard'
      ? 'Lật từng thẻ và tự nhớ nghĩa trước khi xem đáp án.'
      : activity === 'quiz'
        ? 'Làm nhanh một lượt Quiz để biết từ nào bạn còn yếu.'
        : 'Ôn các từ được giao trước rồi chuyển sang Flashcard hoặc Quiz.',
    primaryAction: {
      label: activity === 'quiz' ? 'Mở Quiz' : activity === 'flashcard' ? 'Mở Flashcard' : 'Mở Ôn tập',
      target: activity === 'quiz' ? '/review' : activity === 'flashcard' ? '/review' : '/review?source=assigned',
    },
    secondaryAction: {
      label: 'Xem thư viện từ',
      target: source === 'assigned' ? '/library?filter=assigned' : '/library',
    },
  };
}

function isReviewCoachResponse(value: unknown): value is ReviewCoachResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as ReviewCoachResponse;
  return (response.answerType === 'review_recommendation' || response.answerType === 'out_of_scope')
    && typeof response.message === 'string'
    && typeof response.reason === 'string'
    && typeof response.quickTip === 'string'
    && Array.isArray(response.groups)
    && response.groups.every((group) => typeof group.title === 'string'
      && Array.isArray(group.words)
      && group.words.every((word) => typeof word === 'string')
      && (group.activity === 'flashcard' || group.activity === 'quiz' || group.activity === 'review')
      && typeof group.reason === 'string')
    && response.primaryAction
    && typeof response.primaryAction.label === 'string'
    && typeof response.primaryAction.target === 'string'
    && (response.secondaryAction === null || (typeof response.secondaryAction.label === 'string' && typeof response.secondaryAction.target === 'string'));
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const normalizedApiKey = OPENAI_API_KEY?.trim();
  if (!normalizedApiKey) {
    throw new GatewayConfigError('Thiếu OPENAI__API_KEY trong Supabase secrets.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_SECONDS * 1000);

  try {
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${normalizedApiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new GatewayRequestError(`AI gateway từ chối yêu cầu (HTTP ${response.status}).`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      throw new GatewayRequestError('AI gateway không trả về nội dung hợp lệ.');
    }
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseJson(content: string): unknown {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(cleaned);
}

const reviewCoachSelfCheck = (() => {
  const difficultAssigned = scoreCandidate({
    dictionaryEntryId: '1',
    word: 'retain',
    phonetic: null,
    partOfSpeech: 'verb',
    englishDefinition: 'keep in memory',
    vietnameseMeaning: 'ghi nhớ',
    status: 'difficult',
    isAssigned: true,
    dueAt: new Date(Date.now() + 1000).toISOString(),
    assignedAt: new Date().toISOString(),
    lookupCount: 0,
    note: null,
  });
  const knownLibrary = scoreCandidate({
    dictionaryEntryId: '2',
    word: 'book',
    phonetic: null,
    partOfSpeech: 'noun',
    englishDefinition: 'book',
    vietnameseMeaning: 'sách',
    status: 'known',
    isAssigned: false,
    dueAt: null,
    assignedAt: null,
    lookupCount: 0,
    note: null,
  });
  if (!(difficultAssigned > knownLibrary)) {
    throw new Error('Review coach edge scoring self-check failed.');
  }
  return true;
})();

void reviewCoachSelfCheck;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return badRequest('Chỉ hỗ trợ phương thức POST.');

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Bạn cần đăng nhập để dùng trợ lý ôn tập.' }, 401);

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Phiên đăng nhập không hợp lệ.' }, 401);
  }

  const body = getBody(await req.json());
  if (!body) return badRequest('Payload trợ lý ôn tập không hợp lệ.');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single<ProfileRow>();

  if (profileError || !profile || profile.role !== 'student') {
    return json({ error: 'Chỉ học viên mới dùng được trợ lý ôn tập.' }, 403);
  }

  if (!isAllowedQuestion(body.message)) {
    return json(buildOutOfScopeResponse());
  }

  const [libraryResponse, assignmentResponse] = await Promise.all([
    client
      .from('user_vocabulary')
      .select('status, updated_at, lookup_count, dictionary_entry_id, dictionary_entries(id, word, phonetic, part_of_speech, english_definition, vietnamese_meaning)')
      .eq('user_id', user.id),
    client
      .from('vocabulary_assignments')
      .select('status, note, due_at, assigned_at, dictionary_entry_id, dictionary_entries(id, word, phonetic, part_of_speech, english_definition, vietnamese_meaning)')
      .eq('student_id', user.id),
  ]);

  if (libraryResponse.error || assignmentResponse.error) {
    return json({ error: libraryResponse.error?.message ?? assignmentResponse.error?.message ?? 'Không tải được dữ liệu ôn tập.' }, 500);
  }

  const libraryCandidates = ((libraryResponse.data ?? []) as UserVocabularyRow[])
    .filter((row) => row.dictionary_entries)
    .map((row) => ({
      dictionaryEntryId: row.dictionary_entry_id,
      word: row.dictionary_entries!.word,
      phonetic: row.dictionary_entries!.phonetic,
      partOfSpeech: row.dictionary_entries!.part_of_speech,
      englishDefinition: row.dictionary_entries!.english_definition,
      vietnameseMeaning: row.dictionary_entries!.vietnamese_meaning,
      status: row.status,
      isAssigned: false,
      dueAt: null,
      assignedAt: row.updated_at,
      lookupCount: row.lookup_count,
      note: null,
    }));

  const assignmentCandidates = ((assignmentResponse.data ?? []) as AssignmentRow[])
    .filter((row) => row.dictionary_entries)
    .map((row) => ({
      dictionaryEntryId: row.dictionary_entry_id,
      word: row.dictionary_entries!.word,
      phonetic: row.dictionary_entries!.phonetic,
      partOfSpeech: row.dictionary_entries!.part_of_speech,
      englishDefinition: row.dictionary_entries!.english_definition,
      vietnameseMeaning: row.dictionary_entries!.vietnamese_meaning,
      status: row.status,
      isAssigned: true,
      dueAt: row.due_at,
      assignedAt: row.assigned_at,
      lookupCount: 0,
      note: row.note,
    }));

  const shortlisted = filterBySource(dedupeCandidates([...libraryCandidates, ...assignmentCandidates]), body.context.source)
    .sort((left, right) => right.score - left.score)
    .slice(0, 20);

  if (!shortlisted.length) {
    return json(buildFallbackResponse([], body.context.source));
  }

  const prompt = JSON.stringify({
    message: body.message,
    context: body.context,
    candidates: shortlisted.map((candidate) => ({
      word: candidate.word,
      phonetic: candidate.phonetic,
      partOfSpeech: candidate.partOfSpeech,
      englishDefinition: candidate.englishDefinition,
      vietnameseMeaning: candidate.vietnameseMeaning,
      status: candidate.status,
      assigned: candidate.isAssigned,
      dueSoon: dueSoon(candidate.dueAt),
      note: candidate.note,
      score: candidate.score,
    })),
    requiredOutput: {
      answerType: 'review_recommendation | out_of_scope',
      message: 'string',
      reason: 'string',
      groups: [{
        title: 'string',
        words: ['string'],
        activity: 'flashcard | quiz | review',
        reason: 'string',
      }],
      quickTip: 'string',
      primaryAction: { label: 'string', target: 'string' },
      secondaryAction: { label: 'string', target: 'string' } | null,
    },
  });

  try {
    const content = await callOpenAI(
      'You are a focused vocabulary review coach for Vietnamese English learners. You only help the learner decide what vocabulary to review and how to start reviewing. Use only the provided vocabulary data. Do not invent words. Do not answer unrelated questions. Return only valid JSON.',
      prompt,
    );
    const parsed = parseJson(content);
    if (!isReviewCoachResponse(parsed)) {
      return json(buildFallbackResponse(shortlisted, body.context.source));
    }
    return json(parsed);
  } catch (error: unknown) {
    if (error instanceof GatewayConfigError) {
      return json({ error: error.message }, 500);
    }
    return json(buildFallbackResponse(shortlisted, body.context.source));
  }
});
