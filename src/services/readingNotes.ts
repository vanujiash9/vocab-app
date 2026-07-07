import type { DictionaryEntry } from '../features/dictionary/dictionary.types';
import type { AnalyzeSelectedWordParams, AnalyzeSelectedWordResult } from '../features/readingNotes/readingNotes.types';
import { saveDictionaryVocabulary } from './data';

const GATEWAY_API_BASE_URL = (import.meta.env.VITE_GATEWAY_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';
const ANALYSIS_MODEL = import.meta.env.VITE_GATEWAY_MODEL as string | undefined;

interface GatewayChatResponse {
  output: string;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];
}

function asDifficulty(value: unknown): AnalyzeSelectedWordResult['difficulty'] {
  return value === 'easy' || value === 'hard' ? value : 'medium';
}

function parseAnalysisResult(payload: unknown, fallback: AnalyzeSelectedWordParams): AnalyzeSelectedWordResult {
  if (!payload || typeof payload !== 'object') {
    throw new Error('AI không trả về JSON hợp lệ.');
  }

  const item = payload as Record<string, unknown>;
  const word = asString(item.word) || fallback.selectedText;
  const englishDefinition = asString(item.englishDefinition);
  const meaningInContext = asString(item.meaningInContext);
  const explanation = asString(item.explanation);

  if (!englishDefinition || !meaningInContext || !explanation) {
    throw new Error('AI trả về thiếu dữ liệu giải thích.');
  }

  return {
    word,
    normalizedWord: asString(item.normalizedWord) || word.toLowerCase(),
    partOfSpeech: asString(item.partOfSpeech) || null,
    englishDefinition,
    vietnameseMeaning: asString(item.vietnameseMeaning) || null,
    meaningInContext,
    sentence: asString(item.sentence) || fallback.sentence,
    explanation,
    collocations: asStringArray(item.collocations),
    examples: asStringArray(item.examples),
    relatedWordsFromPassage: Array.isArray(item.relatedWordsFromPassage)
      ? item.relatedWordsFromPassage.flatMap((related) => {
        if (!related || typeof related !== 'object') return [];
        const relatedItem = related as Record<string, unknown>;
        const relatedWord = asString(relatedItem.word);
        const reason = asString(relatedItem.reason);
        return relatedWord && reason ? [{ word: relatedWord, reason }] : [];
      })
      : [],
    difficulty: asDifficulty(item.difficulty),
    shouldSave: typeof item.shouldSave === 'boolean' ? item.shouldSave : true,
    saveReason: asString(item.saveReason) || 'Từ này hữu ích trong ngữ cảnh đoạn đọc.',
  };
}

function buildAnalysisPrompt({ passage, selectedText, sentence, level = 'B1' }: AnalyzeSelectedWordParams): string {
  return `Bạn là biên dịch viên Anh-Việt chuyên dịch bài đọc IELTS/National Geographic/Economist cho người học Việt Nam.

Mục tiêu:
- Dịch và giải thích phần được chọn theo đúng ngữ cảnh trong đoạn văn.
- Phần được chọn có thể là một từ, cụm từ, mệnh đề, câu hoặc toàn bộ đoạn.
- Dịch tự nhiên như tiếng Việt biên tập, không bám cấu trúc tiếng Anh một cách cứng nhắc.
- Không dịch word-by-word nếu làm câu Việt lủng củng hoặc sai sắc thái.
- Được phép đảo trật tự câu, gộp/tách mệnh đề nhẹ để bản dịch mượt, nhưng không thêm/bớt ý.
- Giữ đúng hình ảnh, sắc thái và quan hệ logic của bản gốc.
- Với văn miêu tả, ưu tiên câu Việt giàu hình ảnh nhưng rõ nghĩa.
- Nếu có nhiều nghĩa, chỉ chọn nghĩa phù hợp nhất với đoạn văn.

Tiêu chuẩn bản dịch tiếng Việt:
- Trôi chảy, tự nhiên, đúng văn cảnh.
- Tránh các cụm vụng như "trang trại nông nghiệp trên mái nhà lớn nhất thế giới ở đô thị"; hãy viết tự nhiên hơn như "trang trại đô thị trên mái nhà lớn nhất thế giới" nếu phù hợp.
- Với cấu trúc đảo như "From ... burst row upon row...", hãy diễn đạt lại tự nhiên trong tiếng Việt, ví dụ "Từ những ống thẳng đứng giống hệt gần đó, từng hàng xà lách chen nhau vươn ra...".
- Với cụm/câu/đoạn dài, "vietnameseMeaning" phải là bản dịch hoàn chỉnh, không chỉ là giải nghĩa ngắn.
- Với một từ/cụm ngắn, "vietnameseMeaning" là nghĩa tiếng Việt sát nhất trong ngữ cảnh.
- "explanation" giải thích ngắn vì sao dịch như vậy, bằng tiếng Việt.

Trả lời CHỈ bằng JSON object hợp lệ, không markdown, không thêm text ngoài JSON, theo schema:
{
  "word": string,
  "normalizedWord": string,
  "partOfSpeech": string | null,
  "englishDefinition": string,
  "vietnameseMeaning": string,
  "meaningInContext": string,
  "sentence": string,
  "explanation": string,
  "collocations": string[],
  "examples": string[],
  "relatedWordsFromPassage": [{ "word": string, "reason": string }],
  "difficulty": "easy" | "medium" | "hard",
  "shouldSave": boolean,
  "saveReason": string
}

Quy tắc điền field:
- "word": giữ nguyên phần được chọn.
- "normalizedWord": dạng thường hóa của phần được chọn.
- "partOfSpeech": nếu là một từ thì trả loại từ; nếu là cụm/câu/đoạn thì trả null hoặc loại cụm như "phrase".
- "englishDefinition": giải nghĩa bằng tiếng Anh đơn giản, sát ngữ cảnh.
- "vietnameseMeaning": bản dịch tiếng Việt tự nhiên, sát nghĩa; nếu chọn toàn đoạn thì dịch toàn bộ đoạn thành văn Việt mượt.
- "meaningInContext": giải thích nghĩa trong ngữ cảnh bằng tiếng Anh đơn giản; nếu chọn toàn đoạn thì tóm tắt ý chính bằng tiếng Anh.
- "sentence": câu hoặc đoạn ngữ cảnh liên quan nhất.
- "explanation": giải thích bằng tiếng Việt vì sao dịch như vậy.
- "collocations": cụm hay dùng liên quan nếu chắc chắn phù hợp; nếu không chắc, trả [].
- "examples": ví dụ mới, ngắn, dễ hiểu; nếu phần được chọn là toàn đoạn hoặc không cần ví dụ, trả [].
- "relatedWordsFromPassage": từ/cụm trong đoạn giúp hiểu nghĩa; nếu không rõ, trả [].
- "shouldSave": true nếu phần được chọn là từ/cụm hữu ích để học; false nếu là toàn đoạn dài.
- "saveReason": lý do nên hoặc không nên lưu.

Learner level: ${level}
Selected text: ${selectedText}
Context sentence or passage: ${sentence}
Full passage: ${passage}`;
}

function toDictionaryEntry(result: AnalyzeSelectedWordResult): DictionaryEntry {
  return {
    word: result.word,
    phonetic: null,
    audioUrl: null,
    meanings: [{ partOfSpeech: result.partOfSpeech ?? 'context', definition: result.englishDefinition, example: result.sentence }],
    examples: [result.sentence, ...result.examples].filter(Boolean),
    synonyms: [],
    antonyms: [],
    primaryDefinition: result.englishDefinition,
    primaryExample: result.sentence,
    primaryPartOfSpeech: result.partOfSpeech,
  };
}

export async function analyzeSelectedWord(params: AnalyzeSelectedWordParams): Promise<AnalyzeSelectedWordResult> {
  let response: Response;
  try {
    response = await fetch(`${GATEWAY_API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: buildAnalysisPrompt(params) }],
        model: ANALYSIS_MODEL,
        temperature: 0.1,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
        stream: false,
      }),
    });
  } catch {
    throw new Error(`Không kết nối được Gateway AI (${GATEWAY_API_BASE_URL}). Hãy chạy FastAPI gateway trước.`);
  }

  if (!response.ok) {
    throw new Error('Gateway AI đang lỗi. Vui lòng thử lại sau.');
  }

  const data = (await response.json()) as GatewayChatResponse;
  const output = asString(data.output);
  if (!output) throw new Error('Gateway AI không trả về nội dung.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(output) as unknown;
  } catch {
    throw new Error('AI không trả về JSON hợp lệ.');
  }

  return parseAnalysisResult(parsed, params);
}

export async function saveSelectedWordToStudentLibrary(userId: string, result: AnalyzeSelectedWordResult): Promise<{ status: 'saved' | 'duplicate' }> {
  return saveDictionaryVocabulary(userId, 'student', toDictionaryEntry(result));
}

export async function saveSelectedWordToTeacherVocabulary(userId: string, result: AnalyzeSelectedWordResult): Promise<{ status: 'saved' | 'duplicate' }> {
  return saveDictionaryVocabulary(userId, 'teacher', toDictionaryEntry(result));
}
