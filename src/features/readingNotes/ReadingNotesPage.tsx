import { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingState } from '../../components/PageState';
import type { UserRole } from '../../types';
import { analyzeSelectedWord, saveSelectedWordToStudentLibrary, saveSelectedWordToTeacherVocabulary } from '../../services/readingNotes';
import { ReadingInputCard } from './ReadingInputCard';
import { ReadingTextViewer } from './ReadingTextViewer';
import { WordExplanationPanel } from './WordExplanationPanel';
import type { AnalyzeSelectedWordResult, ReadingAnalysisCacheItem, ReadingToken } from './readingNotes.types';
import { buildReadingAnalysisCacheKey, findSentenceForWord, isWordToken, tokenizePassage, validateReadingPassage } from './readingNotes.utils';

function saveForRole(userId: string, role: UserRole, result: AnalyzeSelectedWordResult) {
  return role === 'teacher'
    ? saveSelectedWordToTeacherVocabulary(userId, result)
    : saveSelectedWordToStudentLibrary(userId, result);
}

export function ReadingNotesPage() {
  const { loading, profile, user } = useAuth();
  const [draftPassage, setDraftPassage] = useState('');
  const [passage, setPassage] = useState('');
  const [tokens, setTokens] = useState<ReadingToken[]>([]);
  const [isEditingPassage, setIsEditingPassage] = useState(false);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState('');
  const [selectedSentence, setSelectedSentence] = useState('');
  const [analysisCache, setAnalysisCache] = useState<Record<string, ReadingAnalysisCacheItem>>({});
  const [currentCacheKey, setCurrentCacheKey] = useState('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [inputError, setInputError] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const currentCacheItem = currentCacheKey ? analysisCache[currentCacheKey] ?? null : null;
  const analysisResult = currentCacheItem?.result ?? null;
  const saved = currentCacheItem?.saved ?? false;
  const hasStartedReading = tokens.length > 0;
  const savedTokenIndexes = useMemo(() => tokens.reduce<number[]>((items, token) => {
    if (!isWordToken(token)) return items;
    if (!Object.values(analysisCache).some((item) => item.saved && item.result.normalizedWord === token.normalized)) {
      return items;
    }
    return [...items, token.index];
  }, []), [analysisCache, tokens]);

  if (loading || !profile || !user) return <LoadingState />;

  const startReading = () => {
    const nextError = validateReadingPassage(draftPassage);
    if (nextError) {
      setInputError(nextError);
      return;
    }

    const nextPassage = draftPassage.trim();
    setInputError('');
    setPassage(nextPassage);
    setTokens(tokenizePassage(nextPassage));
    setIsEditingPassage(false);
    setSelectedTokenIndex(null);
    setSelectedWord('');
    setSelectedSentence('');
    setCurrentCacheKey('');
    setAnalysisError('');
    setSaveMessage('');
  };

  const selectWord = async (token: ReadingToken & { type: 'word'; normalized: string; index: number }) => {
    if (!token.normalized) {
      setAnalysisError('Từ được chọn không hợp lệ.');
      return;
    }

    const sentence = findSentenceForWord(passage, token.text, token.index);
    const cacheKey = buildReadingAnalysisCacheKey(token.normalized, sentence);
    setSelectedTokenIndex(token.index);
    setSelectedWord(token.text);
    setSelectedSentence(sentence);
    setCurrentCacheKey(cacheKey);
    setAnalysisError('');
    setSaveMessage('');

    if (analysisCache[cacheKey]) {
      return;
    }

    setLoadingExplanation(true);
    try {
      const result = await analyzeSelectedWord({
        passage,
        selectedText: token.text,
        sentence,
        level: 'B1',
      });
      setAnalysisCache((current) => ({
        ...current,
        [cacheKey]: {
          result,
          saved: false,
        },
      }));
    } catch (error: unknown) {
      setAnalysisError(error instanceof Error ? error.message : 'Chưa thể giải thích từ này. Vui lòng thử lại.');
    } finally {
      setLoadingExplanation(false);
    }
  };

  const saveWord = async () => {
    if (!analysisResult) return;
    setSaveLoading(true);
    setSaveMessage('');
    try {
      const result = await saveForRole(user.id, profile.role, analysisResult);
      const message = profile.role === 'teacher'
        ? result.status === 'duplicate' ? 'Từ này đã có trong kho từ.' : 'Đã lưu từ vào kho từ.'
        : result.status === 'duplicate' ? 'Từ này đã có trong thư viện.' : 'Đã lưu từ vào thư viện.';
      setSaveMessage(message);
      setAnalysisCache((current) => ({
        ...current,
        [currentCacheKey]: {
          result: analysisResult,
          saved: true,
        },
      }));
    } catch (error: unknown) {
      setSaveMessage(error instanceof Error ? error.message : 'Không lưu được từ này.');
    } finally {
      setSaveLoading(false);
    }
  };

  return <div className="page-wrap">
    <div className="page-heading">
      <div>
        <span>Reading notes</span>
        <h1>Đọc & Ghi chú từ</h1>
      </div>
    </div>
    <section className="reading-notes-layout">
      <div className="reading-notes-main">
        {(!hasStartedReading || isEditingPassage) ? <ReadingInputCard passage={draftPassage} error={inputError} onChange={setDraftPassage} onStart={startReading} /> : <section className="panel reading-toolbar-card">
          <div>
            <strong>Đang đọc đoạn văn</strong>
            <p>Chọn từ ở cột trái để xem AI giải thích ở cột phải.</p>
          </div>
          <button className="button secondary" onClick={() => setIsEditingPassage(true)}>Chỉnh sửa đoạn văn</button>
        </section>}
        {hasStartedReading && <ReadingTextViewer
          tokens={tokens}
          selectedTokenIndex={selectedTokenIndex}
          savedTokenIndexes={savedTokenIndexes}
          onSelectWord={(token) => void selectWord(token)}
        />}
      </div>
      <WordExplanationPanel
        role={profile.role}
        selectedWord={selectedWord}
        loading={loadingExplanation}
        error={analysisError}
        result={analysisResult}
        saved={saved}
        saveLoading={saveLoading}
        saveMessage={saveMessage}
        onSave={() => void saveWord()}
      />
    </section>
    {selectedSentence && !analysisResult && !loadingExplanation && !analysisError && <div className="reading-inline-note">Đang chuẩn bị giải thích cho câu: {selectedSentence}</div>}
  </div>;
}
