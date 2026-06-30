/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI__API_KEY') ?? Deno.env.get('OPENAI_API_KEY');
const OPENAI_BASE_URL = Deno.env.get('OPENAI__BASE_URL') ?? 'https://api.openai.com/v1';
const OPENAI_MODEL = Deno.env.get('OPENAI__MODEL') ?? Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const OPENAI_TIMEOUT_SECONDS = Number(Deno.env.get('OPENAI__TIMEOUT_SECONDS') ?? '30');
const OPENAI_MAX_RETRIES = Number(Deno.env.get('OPENAI__MAX_RETRIES') ?? '1');
const MAX_PASSAGE_LENGTH = 2500;

type Difficulty = 'easy' | 'medium' | 'hard';
type ReadingLevel = 'A2' | 'B1' | 'B2' | 'IELTS';

interface ProfileRow {
  id: string;
  role: 'teacher' | 'student';
}

interface AnalyzeSelectedWordBody {
  passage: string;
  selectedText: string;
  sentence: string;
  level?: ReadingLevel;
}

interface RelatedWordFromPassage {
  word: string;
  reason: string;
}

interface AnalyzeSelectedWordResult {
  word: string;
  normalizedWord: string;
  partOfSpeech: string | null;
  englishDefinition: string;
  vietnameseMeaning: string | null;
  meaningInContext: string;
  sentence: string;
  explanation: string;
  collocations: string[];
  examples: string[];
  relatedWordsFromPassage: RelatedWordFromPassage[];
  difficulty: Difficulty;
  shouldSave: boolean;
  saveReason: string;
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

function normalizeOpenAIEndpoint(rawValue: string): string {
  const normalized = rawValue.trim().replace(/^['"]|['"]$/g, '');
  if (normalized.endsWith('/chat/completions')) return normalized;
  return `${normalized.replace(/\/$/, '')}/chat/completions`;
}

const OPENAI_CHAT_COMPLETIONS_URL = normalizeOpenAIEndpoint(OPENAI_BASE_URL);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY.');
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isRelatedWordList(value: unknown): value is RelatedWordFromPassage[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === 'object' && typeof item.word === 'string' && typeof item.reason === 'string');
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeNullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeDifficulty(value: unknown): Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard' ? value : 'medium';
}

function normalizeStringList(value: unknown): string[] {
  if (!isStringArray(value)) return [];
  const seen = new Set<string>();
  return value.reduce<string[]>((items, item) => {
    const text = item.trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return items;
    seen.add(key);
    return [...items, text];
  }, []);
}

function normalizeRelatedWords(value: unknown): RelatedWordFromPassage[] {
  if (!isRelatedWordList(value)) return [];
  return value.reduce<RelatedWordFromPassage[]>((items, item) => {
    const word = item.word.trim();
    const reason = item.reason.trim();
    if (!word || !reason) return items;
    return [...items, { word, reason }];
  }, []);
}

function getBody(payload: unknown): AnalyzeSelectedWordBody | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as Record<string, unknown>;
  if (typeof body.passage !== 'string' || typeof body.selectedText !== 'string' || typeof body.sentence !== 'string') {
    return null;
  }
  if (body.level && !['A2', 'B1', 'B2', 'IELTS'].includes(String(body.level))) {
    return null;
  }
  return {
    passage: body.passage,
    selectedText: body.selectedText,
    sentence: body.sentence,
    level: body.level as ReadingLevel | undefined,
  };
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
  if (start === undefined) throw new GatewayParseError('AI trả về dữ liệu không phải JSON hợp lệ.');
  return trimmed.slice(start);
}

function parseJson<T>(content: string): T {
  try {
    return JSON.parse(extractJsonBlock(content)) as T;
  } catch {
    throw new GatewayParseError('AI trả về dữ liệu không hợp lệ.');
  }
}

function normalizeAnalyzeSelectedWordResult(value: unknown, body: AnalyzeSelectedWordBody): AnalyzeSelectedWordResult {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const selectedWord = body.selectedText.trim();
  const normalizedWord = selectedWord.toLowerCase();
  return {
    word: normalizeText(input.word, selectedWord),
    normalizedWord: normalizeText(input.normalizedWord, normalizedWord).toLowerCase(),
    partOfSpeech: normalizeNullableText(input.partOfSpeech),
    englishDefinition: normalizeText(input.englishDefinition, `Definition for ${selectedWord}`),
    vietnameseMeaning: normalizeNullableText(input.vietnameseMeaning),
    meaningInContext: normalizeText(input.meaningInContext, 'Nghĩa của từ trong câu này đang được giải thích theo ngữ cảnh.'),
    sentence: normalizeText(input.sentence, body.sentence.trim()),
    explanation: normalizeText(input.explanation, 'Từ này được dùng theo đúng ngữ cảnh của câu đã chọn.'),
    collocations: normalizeStringList(input.collocations),
    examples: normalizeStringList(input.examples).slice(0, 2),
    relatedWordsFromPassage: normalizeRelatedWords(input.relatedWordsFromPassage),
    difficulty: normalizeDifficulty(input.difficulty),
    shouldSave: typeof input.shouldSave === 'boolean' ? input.shouldSave : true,
    saveReason: normalizeText(input.saveReason, 'Đây là từ đáng để lưu lại và ôn thêm sau.'),
  };
}

function buildPrompt(body: AnalyzeSelectedWordBody): string {
  return JSON.stringify({
    level: body.level ?? 'B1',
    selectedText: body.selectedText.trim(),
    sentence: body.sentence.trim(),
    passage: body.passage.trim(),
    outputSchema: {
      word: 'string',
      normalizedWord: 'string',
      partOfSpeech: 'string | null',
      englishDefinition: 'string',
      vietnameseMeaning: 'string | null',
      meaningInContext: 'string',
      sentence: 'string',
      explanation: 'string',
      collocations: ['string'],
      examples: ['string'],
      relatedWordsFromPassage: [
        {
          word: 'string',
          reason: 'string',
        },
      ],
      difficulty: 'easy | medium | hard',
      shouldSave: 'boolean',
      saveReason: 'string',
    },
  });
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
        console.error('analyze-selected-word gateway request failed', {
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

      console.error('analyze-selected-word gateway exception', {
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

  const passage = body.passage.trim();
  const selectedText = body.selectedText.trim();
  const sentence = body.sentence.trim();

  if (!passage) return badRequest('Vui lòng nhập đoạn văn tiếng Anh.');
  if (!selectedText) return badRequest('Từ được chọn không hợp lệ.');
  if (!sentence) return badRequest('Thiếu câu chứa từ được chọn.');
  if (passage.length > MAX_PASSAGE_LENGTH) return badRequest('Vui lòng nhập đoạn văn dưới 2500 ký tự.');
  if (!passage.toLowerCase().includes(selectedText.toLowerCase())) return badRequest('Từ được chọn không hợp lệ.');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single<ProfileRow>();

  if (profileError || !profile) {
    return json({ error: 'Không tải được hồ sơ người dùng.' }, 403);
  }

  try {
    const content = await callOpenAI(
      `You are an English vocabulary learning assistant for Vietnamese learners.
Your task is to explain a selected word from a reading passage in context.
Return only valid JSON.

Rules:
- Explain the selected word based on the sentence and passage context.
- Do not invent the selected word.
- The selected word must appear in the passage.
- Keep explanations short, clear, and learner-friendly.
- Give Vietnamese meaning.
- Give an English definition.
- Explain how the word is used in this sentence.
- Give useful collocations if appropriate.
- Give 1-2 new examples.
- Suggest related words only if they appear in the passage.
- Decide whether the word should be saved for later vocabulary study.
- Return JSON only.`,
      buildPrompt(body),
    );

    return json({ result: normalizeAnalyzeSelectedWordResult(parseJson<unknown>(content), body) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Không thể giải thích từ đã chọn.';
    const status = error instanceof GatewayConfigError ? 500 : 502;
    return json({ error: message }, status);
  }
});
