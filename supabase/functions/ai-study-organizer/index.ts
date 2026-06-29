/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI__API_KEY') ?? Deno.env.get('OPENAI_API_KEY');
const OPENAI_BASE_URL = Deno.env.get('OPENAI__BASE_URL') ?? 'https://api.openai.com/v1';
const OPENAI_MODEL = Deno.env.get('OPENAI__MODEL') ?? Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const OPENAI_TIMEOUT_SECONDS = Number(Deno.env.get('OPENAI__TIMEOUT_SECONDS') ?? '30');
const OPENAI_MAX_RETRIES = Number(Deno.env.get('OPENAI__MAX_RETRIES') ?? '1');

function normalizeOpenAIEndpoint(rawValue: string): string {
  const normalized = rawValue.trim().replace(/^['"]|['"]$/g, '');
  if (normalized.endsWith('/chat/completions')) return normalized;
  return `${normalized.replace(/\/$/, '')}/chat/completions`;
}

const OPENAI_CHAT_COMPLETIONS_URL = normalizeOpenAIEndpoint(OPENAI_BASE_URL);

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
  english_definition: string;
  vietnamese_meaning: string;
}

interface UserVocabularyRow {
  status: 'new' | 'learning' | 'known' | 'difficult';
  dictionary_entries: DictionaryEntryRow | null;
}

interface AssignmentRow {
  id: string;
  status: 'new' | 'learning' | 'known' | 'difficult';
  note: string | null;
  due_at: string | null;
  priority: 'low' | 'medium' | 'high';
  dictionary_entries: DictionaryEntryRow | null;
}

interface TeacherVocabularyRow {
  dictionary_entry_id: string;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  note: string | null;
  dictionary_entries: DictionaryEntryRow | null;
}

interface StudentAIWordInput {
  word: string;
  definition: string;
  vietnameseMeaning?: string | null;
  status: 'new' | 'learning' | 'known' | 'difficult';
  source: 'library' | 'assignment';
  dueAt?: string | null;
}

interface TeacherAIWordInput {
  id: string;
  word: string;
  definition: string;
  vietnameseMeaning?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  note?: string | null;
}

interface StudentTaskBody {
  task: 'student_study_organizer';
  minutes: 10 | 15 | 30;
  source: 'all' | 'difficult' | 'learning' | 'assigned';
}

interface TeacherTaskBody {
  task: 'teacher_word_set_organizer';
  count: 5 | 10 | 15;
  goal: 'review' | 'ielts_writing' | 'speaking' | 'new_words';
}

interface StudentAIStudyResult {
  title: string;
  summary: string;
  sections: Array<{
    title: string;
    words: string[];
    activity: 'flashcard' | 'quiz' | 'review';
  }>;
  tip: string;
  recommendedMode: 'flashcard' | 'quiz' | 'review';
}

interface TeacherAIWordSetResult {
  title: string;
  summary: string;
  groups: Array<{
    title: string;
    words: string[];
  }>;
  messageToStudent: string;
}

class GatewayConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GatewayConfigError';
  }
}

class GatewayRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GatewayRequestError';
  }
}

class GatewayParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GatewayParseError';
  }
}

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

function getBody(payload: unknown): StudentTaskBody | TeacherTaskBody | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as Record<string, unknown>;

  if (body.task === 'student_study_organizer'
    && (body.minutes === 10 || body.minutes === 15 || body.minutes === 30)
    && ['all', 'difficult', 'learning', 'assigned'].includes(String(body.source))) {
    return body as unknown as StudentTaskBody;
  }

  if (body.task === 'teacher_word_set_organizer'
    && (body.count === 5 || body.count === 10 || body.count === 15)
    && ['review', 'ielts_writing', 'speaking', 'new_words'].includes(String(body.goal))) {
    return body as unknown as TeacherTaskBody;
  }

  return null;
}

function daysUntil(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;
  const diff = new Date(dateValue).getTime() - Date.now();
  return diff / (1000 * 60 * 60 * 24);
}

function scoreStudentWord(item: StudentAIWordInput): number {
  const statusScore = item.status === 'difficult'
    ? 50
    : item.status === 'learning'
      ? 35
      : item.status === 'new'
        ? 20
        : 5;
  const sourceScore = item.source === 'assignment' ? 20 : 0;
  const dueDays = daysUntil(item.dueAt);
  const dueScore = dueDays === null
    ? 0
    : dueDays <= 1
      ? 30
      : dueDays <= 3
        ? 20
        : dueDays <= 7
          ? 10
          : 0;
  return statusScore + sourceScore + dueScore;
}

function scoreTeacherWord(item: TeacherAIWordInput, goal: TeacherTaskBody['goal']): number {
  const note = (item.note ?? '').toLowerCase();
  if (goal === 'ielts_writing') {
    return (note.includes('ielts') ? 30 : 0)
      + (note.includes('writing') ? 30 : 0)
      + (note.includes('academic') ? 15 : 0)
      + (item.difficulty === 'hard' ? 10 : item.difficulty === 'medium' ? 5 : 0);
  }

  if (goal === 'speaking') {
    return (note.includes('speaking') ? 30 : 0)
      + (note.includes('discussion') ? 15 : 0)
      + (item.difficulty === 'medium' ? 10 : item.difficulty === 'easy' ? 5 : 0);
  }

  if (goal === 'review') {
    return item.difficulty === 'hard' ? 30 : item.difficulty === 'medium' ? 20 : item.difficulty === 'easy' ? 10 : 5;
  }

  return item.difficulty === 'easy' ? 20 : item.difficulty === 'medium' ? 18 : item.difficulty === null ? 16 : 10;
}

function dedupeStudentWords(items: StudentAIWordInput[], source: StudentTaskBody['source']): StudentAIWordInput[] {
  const byWord = new Map<string, StudentAIWordInput>();
  for (const item of items) {
    if (source === 'assigned' && item.source !== 'assignment') continue;
    if (source === 'difficult' && item.status !== 'difficult') continue;
    if (source === 'learning' && item.status !== 'learning') continue;
    const existing = byWord.get(item.word.toLowerCase());
    if (!existing || scoreStudentWord(item) > scoreStudentWord(existing)) {
      byWord.set(item.word.toLowerCase(), item);
    }
  }
  return [...byWord.values()];
}

function buildStudentPrompt(words: StudentAIWordInput[], minutes: number): string {
  return JSON.stringify({
    task: 'student_study_organizer',
    minutes,
    rules: [
      'Use only words from the input list.',
      'Prioritize difficult, learning, assigned, then new words.',
      'Recommend flashcard, quiz, or review.',
      'Keep Vietnamese text short and friendly.',
      'Do not invent new words.',
    ],
    words,
  });
}

function buildTeacherPrompt(words: TeacherAIWordInput[], goal: TeacherTaskBody['goal'], count: number): string {
  return JSON.stringify({
    task: 'teacher_word_set_organizer',
    goal,
    count,
    rules: [
      'Use only words from the input list.',
      'Group words by difficulty, usage, or learning order.',
      'Write a short Vietnamese message for students.',
      'Do not assign words automatically.',
      'Do not invent new words.',
    ],
    words,
  });
}

function stripCodeFences(value: string): string {
  return value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function extractJsonBlock(value: string): string {
  const trimmed = stripCodeFences(value);
  if (!trimmed) throw new GatewayParseError('AI gateway không trả về nội dung hợp lệ.');
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  const start = [firstBrace, firstBracket].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  if (start === undefined) {
    throw new GatewayParseError('AI trả về dữ liệu không phải JSON hợp lệ.');
  }
  return trimmed.slice(start);
}

function parseJson<T>(content: string): T {
  try {
    return JSON.parse(extractJsonBlock(content)) as T;
  } catch {
    throw new GatewayParseError('AI trả về dữ liệu không hợp lệ.');
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

function normalizeStudentStudyResult(value: unknown): StudentAIStudyResult {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const sections: StudentAIStudyResult['sections'] = Array.isArray(input.sections)
    ? input.sections
      .filter((section) => section && typeof section === 'object')
      .map((section) => {
        const item = section as Record<string, unknown>;
        const activity: StudentAIStudyResult['recommendedMode'] = item.activity === 'flashcard' || item.activity === 'quiz' || item.activity === 'review'
          ? item.activity
          : 'review';
        const words = isStringArray(item.words) ? item.words.map((word) => word.trim()) : [];
        return {
          title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Nhóm ôn tập',
          words,
          activity,
        };
      })
      .filter((section) => section.words.length > 0)
    : [];

  const recommendedMode: StudentAIStudyResult['recommendedMode'] = input.recommendedMode === 'flashcard' || input.recommendedMode === 'quiz' || input.recommendedMode === 'review'
    ? input.recommendedMode
    : (sections[0]?.activity ?? 'review');

  return {
    title: typeof input.title === 'string' && input.title.trim() ? input.title.trim() : 'Phiên học gợi ý',
    summary: typeof input.summary === 'string' && input.summary.trim() ? input.summary.trim() : 'AI đã sắp xếp một phiên học ngắn cho bạn.',
    sections,
    tip: typeof input.tip === 'string' && input.tip.trim() ? input.tip.trim() : 'Hãy học theo từng nhóm nhỏ và ưu tiên nhớ chủ động.',
    recommendedMode,
  };
}

function chunkWords<T>(items: T[], chunkCount: number): T[][] {
  if (!items.length) return [];
  const normalizedChunkCount = Math.max(1, Math.min(chunkCount, items.length));
  const chunkSize = Math.ceil(items.length / normalizedChunkCount);
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function buildFallbackStudentStudyResult(words: StudentAIWordInput[], minutes: number, source: StudentTaskBody['source']): StudentAIStudyResult {
  const chunkCount = minutes === 30 ? 3 : minutes === 15 ? 2 : 1;
  const chunks = chunkWords(words.slice(0, 9), chunkCount);
  const sections: StudentAIStudyResult['sections'] = chunks.map((chunk, index) => ({
    title: index === 0 ? 'Cụm ưu tiên cao nhất' : index === 1 ? 'Cụm củng cố trí nhớ' : 'Cụm ôn bổ sung',
    words: chunk.map((item) => item.word),
    activity: index === 0 ? 'review' : index === 1 ? 'quiz' : 'flashcard',
  }));
  const focusLabel = source === 'difficult'
    ? 'từ khó nhớ'
    : source === 'learning'
      ? 'từ đang học'
      : source === 'assigned'
        ? 'từ được giao'
        : 'những từ cần ưu tiên nhất';

  return {
    title: 'Kế hoạch học cá nhân hoá',
    summary: `AI đã sắp xếp phiên học ngắn dựa trên ${focusLabel}, độ khó và mức độ gần quên của bạn.`,
    sections,
    tip: 'Bắt đầu với cụm đầu tiên, cố nhớ nghĩa trước khi lật đáp án và chuyển sang quiz khi đã thấy quen từ.',
    recommendedMode: sections[0]?.activity ?? 'review',
  };
}
function normalizeTeacherWordSetResult(value: unknown): TeacherAIWordSetResult {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const groups = Array.isArray(input.groups)
    ? input.groups
      .filter((group) => group && typeof group === 'object')
      .map((group) => {
        const item = group as Record<string, unknown>;
        return {
          title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Nhóm từ',
          words: isStringArray(item.words) ? item.words.map((word) => word.trim()) : [],
        };
      })
    : [];

  return {
    title: typeof input.title === 'string' && input.title.trim() ? input.title.trim() : 'Bộ từ gợi ý',
    summary: typeof input.summary === 'string' && input.summary.trim() ? input.summary.trim() : 'AI đã nhóm bộ từ phù hợp với mục tiêu hiện tại.',
    groups,
    messageToStudent: typeof input.messageToStudent === 'string' && input.messageToStudent.trim()
      ? input.messageToStudent.trim()
      : 'Hãy học theo từng nhóm nhỏ và thực hành đều đặn nhé.',
  };
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const normalizedApiKey = OPENAI_API_KEY?.trim();
  if (!normalizedApiKey) {
    throw new GatewayConfigError('Thiếu OPENAI__API_KEY trong Supabase secrets.');
  }

  const payload = {
    model: OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  let lastErrorMessage = 'AI gateway hiện không phản hồi.';

  for (let attempt = 0; attempt <= OPENAI_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_SECONDS * 1000);

    try {
      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${normalizedApiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text();
        console.error('ai-study-organizer gateway request failed', {
          status: response.status,
          url: OPENAI_CHAT_COMPLETIONS_URL,
          model: OPENAI_MODEL,
          attempt: attempt + 1,
          responseBody,
        });
        lastErrorMessage = response.status >= 500
          ? 'AI gateway đang lỗi phía máy chủ.'
          : `AI gateway từ chối yêu cầu (HTTP ${response.status}).`;
        continue;
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new GatewayRequestError('AI gateway không trả về nội dung hợp lệ.');
      }
      return content;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastErrorMessage = `AI gateway hết thời gian phản hồi sau ${OPENAI_TIMEOUT_SECONDS} giây.`;
      } else if (error instanceof GatewayRequestError || error instanceof GatewayConfigError || error instanceof GatewayParseError) {
        lastErrorMessage = error.message;
      } else {
        lastErrorMessage = error instanceof Error ? error.message : 'AI gateway hiện không phản hồi.';
      }

      console.error('ai-study-organizer gateway exception', {
        url: OPENAI_CHAT_COMPLETIONS_URL,
        model: OPENAI_MODEL,
        attempt: attempt + 1,
        message: lastErrorMessage,
      });

      if (attempt === OPENAI_MAX_RETRIES) {
        throw new GatewayRequestError(lastErrorMessage);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new GatewayRequestError(lastErrorMessage);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return badRequest('Chỉ hỗ trợ phương thức POST.');

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Bạn cần đăng nhập để dùng AI.' }, 401);

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
  if (!body) return badRequest('Payload AI không hợp lệ.');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single<ProfileRow>();

  if (profileError || !profile) {
    return json({ error: 'Không tải được hồ sơ người dùng.' }, 403);
  }

  try {
    if (body.task === 'student_study_organizer') {
      if (profile.role !== 'student') return json({ error: 'Teacher không thể dùng tác vụ Student AI.' }, 403);

      const [libraryResponse, assignmentResponse] = await Promise.all([
        client
          .from('user_vocabulary')
          .select('status, dictionary_entries(id, word, english_definition, vietnamese_meaning)')
          .eq('user_id', user.id),
        body.source === 'assigned' || body.source === 'all'
          ? client
            .from('vocabulary_assignments')
            .select('id, status, note, due_at, priority, dictionary_entries(id, word, english_definition, vietnamese_meaning)')
            .eq('student_id', user.id)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (libraryResponse.error) throw libraryResponse.error;
      if (assignmentResponse.error) throw assignmentResponse.error;

      const libraryItems = ((libraryResponse.data ?? []) as UserVocabularyRow[])
        .filter((item) => item.dictionary_entries)
        .map((item) => ({
          word: item.dictionary_entries!.word,
          definition: item.dictionary_entries!.english_definition,
          vietnameseMeaning: item.dictionary_entries!.vietnamese_meaning,
          status: item.status,
          source: 'library' as const,
          dueAt: null,
        }));

      const assignmentItems = ((assignmentResponse.data ?? []) as AssignmentRow[])
        .filter((item) => item.dictionary_entries)
        .map((item) => ({
          word: item.dictionary_entries!.word,
          definition: item.dictionary_entries!.english_definition,
          vietnameseMeaning: item.dictionary_entries!.vietnamese_meaning,
          status: item.status,
          source: 'assignment' as const,
          dueAt: item.due_at,
        }));

      const shortlisted = dedupeStudentWords([...libraryItems, ...assignmentItems], body.source)
        .sort((left, right) => scoreStudentWord(right) - scoreStudentWord(left))
        .slice(0, 15);

      if (!shortlisted.length) {
        return json({
          result: normalizeStudentStudyResult({
            title: 'Chưa có đủ dữ liệu học',
            summary: 'Bạn chưa có đủ từ để AI gợi ý phiên học.',
            sections: [],
            tip: 'Hãy thêm từ vào thư viện hoặc nhận từ được giao trước.',
            recommendedMode: 'review',
          }),
        });
      }

      const content = await callOpenAI(
        'You are an English vocabulary study organizer. You help students study vocabulary effectively using active recall, spaced review, and context. Return only valid JSON. Do not invent words outside the provided list.',
        buildStudentPrompt(shortlisted, body.minutes),
      );
      const result = normalizeStudentStudyResult(parseJson<unknown>(content));
      return json({ result });
    }

    if (profile.role !== 'teacher') return json({ error: 'Student không thể dùng tác vụ Teacher AI.' }, 403);

    const { data: teacherWords, error: teacherWordsError } = await client
      .from('teacher_vocabulary')
      .select('dictionary_entry_id, difficulty, note, dictionary_entries(id, word, english_definition, vietnamese_meaning)')
      .eq('teacher_id', user.id);

    if (teacherWordsError) throw teacherWordsError;

    const candidates = ((teacherWords ?? []) as TeacherVocabularyRow[])
      .filter((item) => item.dictionary_entries)
      .map((item) => ({
        id: item.dictionary_entry_id,
        word: item.dictionary_entries!.word,
        definition: item.dictionary_entries!.english_definition,
        vietnameseMeaning: item.dictionary_entries!.vietnamese_meaning,
        difficulty: item.difficulty,
        note: item.note,
      }))
      .sort((left, right) => scoreTeacherWord(right, body.goal) - scoreTeacherWord(left, body.goal))
      .slice(0, 20);

    if (!candidates.length) {
      return json({
        result: normalizeTeacherWordSetResult({
          title: 'Kho từ chưa đủ',
          summary: 'Kho từ của bạn chưa có đủ từ để AI sắp xếp.',
          groups: [],
          messageToStudent: '',
        }),
        selectedWords: [],
        candidates: [],
      });
    }

    const content = await callOpenAI(
      'You are an English vocabulary teaching assistant. You help teachers organize a selected vocabulary set for students. Return only valid JSON. Do not invent words outside the provided list.',
      buildTeacherPrompt(candidates, body.goal, body.count),
    );

    const result = normalizeTeacherWordSetResult(parseJson<unknown>(content));
    const candidateByWord = new Map(candidates.map((candidate) => [candidate.word.toLowerCase(), candidate]));
    const selectedWords = [...new Set(
      result.groups
        .flatMap((group) => group.words)
        .map((word) => candidateByWord.get(word.toLowerCase())?.id ?? '')
        .filter(Boolean),
    )].slice(0, body.count);

    return json({
      result,
      selectedWords,
      candidates: candidates.map((candidate) => ({ id: candidate.id, word: candidate.word })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Không thể tạo gợi ý AI.';
    const status = error instanceof GatewayConfigError ? 500 : 502;
    return json({ error: message }, status);
  }
});
