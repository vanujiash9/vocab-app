import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingState } from '../../components/PageState';
import type { UserRole } from '../../types';
import { analyzeSelectedWord, saveSelectedWordToStudentLibrary, saveSelectedWordToTeacherVocabulary } from '../../services/readingNotes';
import { ReadingInputCard } from './ReadingInputCard';
import { ReadingTextViewer } from './ReadingTextViewer';
import { WordExplanationPanel } from './WordExplanationPanel';
import type { AnalyzeSelectedWordResult, ReadingAnalysisCacheItem, ReadingToken } from './readingNotes.types';
import { buildReadingAnalysisCacheKey, getContextForSelection, getSelectedTextFromIndexes, getWordIndexesBetween, isWordToken, tokenizePassage, validateReadingPassage } from './readingNotes.utils';

const MAX_READING_HISTORY_ITEMS = 5;

function saveForRole(userId: string, role: UserRole, result: AnalyzeSelectedWordResult) {
  return role === 'teacher'
    ? saveSelectedWordToTeacherVocabulary(userId, result)
    : saveSelectedWordToStudentLibrary(userId, result);
}

function getReadingHistoryKey(userId: string): string {
  return `reading-notes-history:${userId}`;
}

function readPassageHistory(userId: string): string[] {
  try {
    const value = window.localStorage.getItem(getReadingHistoryKey(userId));
    const items = value ? JSON.parse(value) as unknown : [];
    return Array.isArray(items) ? items.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function savePassageHistory(userId: string, passage: string): string[] {
  const nextHistory = [passage, ...readPassageHistory(userId).filter((item) => item !== passage)].slice(0, MAX_READING_HISTORY_ITEMS);
  window.localStorage.setItem(getReadingHistoryKey(userId), JSON.stringify(nextHistory));
  return nextHistory;
}

export function ReadingNotesPage() {
  const { loading, profile, user } = useAuth();
  const [draftPassage, setDraftPassage] = useState('');
  const [passage, setPassage] = useState('');
  const [tokens, setTokens] = useState<ReadingToken[]>([]);
  const [isEditingPassage, setIsEditingPassage] = useState(false);
  const [selectedTokenIndexes, setSelectedTokenIndexes] = useState<number[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [selectedSentence, setSelectedSentence] = useState('');
  const [analysisCache, setAnalysisCache] = useState<Record<string, ReadingAnalysisCacheItem>>({});
  const [currentCacheKey, setCurrentCacheKey] = useState('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [inputError, setInputError] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [passageHistory, setPassageHistory] = useState<string[]>([]);
  const selectionRequestIdRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    setPassageHistory(readPassageHistory(user.id));
  }, [user]);

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
    setPassageHistory(savePassageHistory(user.id, nextPassage));
    setInputError('');
    selectionRequestIdRef.current += 1;
    setPassage(nextPassage);
    setTokens(tokenizePassage(nextPassage));
    setIsEditingPassage(false);
    setSelectedTokenIndexes([]);
    setSelectedText('');
    setSelectedSentence('');
    setCurrentCacheKey('');
    setAnalysisError('');
    setSaveMessage('');
  };

  const clearSelection = () => {
    selectionRequestIdRef.current += 1;
    setSelectedTokenIndexes([]);
    setSelectedText('');
    setSelectedSentence('');
    setCurrentCacheKey('');
    setAnalysisError('');
    setSaveMessage('');
    setLoadingExplanation(false);
  };

  const analyzeSelection = async (nextSelectedText: string, nextSelectedIndexes: number[]) => {
    const nextText = nextSelectedText.trim();
    if (!nextText) {
      setAnalysisError('Phần được chọn không hợp lệ.');
      return;
    }

    const requestId = selectionRequestIdRef.current + 1;
    selectionRequestIdRef.current = requestId;
    const sentence = getContextForSelection(passage, nextText);
    const cacheKey = buildReadingAnalysisCacheKey(nextText, sentence);
    setSelectedTokenIndexes(nextSelectedIndexes);
    setSelectedText(nextText);
    setSelectedSentence(sentence);
    setCurrentCacheKey(cacheKey);
    setAnalysisError('');
    setSaveMessage('');

    if (analysisCache[cacheKey]) {
      setLoadingExplanation(false);
      return;
    }

    setLoadingExplanation(true);
    try {
      const result = await analyzeSelectedWord({
        passage,
        selectedText: nextText,
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
      if (selectionRequestIdRef.current === requestId) {
        setAnalysisError(error instanceof Error ? error.message : 'Chưa thể giải thích phần này. Vui lòng thử lại.');
      }
    } finally {
      if (selectionRequestIdRef.current === requestId) {
        setLoadingExplanation(false);
      }
    }
  };

  const selectWord = async (token: ReadingToken & { type: 'word'; normalized: string; index: number }) => {
    if (selectedTokenIndexes.includes(token.index)) {
      clearSelection();
      return;
    }

    const nextIndexes = selectedTokenIndexes.length === 1
      ? getWordIndexesBetween(selectedTokenIndexes[0], token.index)
      : [token.index];
    const nextText = getSelectedTextFromIndexes(tokens, nextIndexes);
    await analyzeSelection(nextText || token.text, nextIndexes);
  };

  const translatePassage = async () => {
    if (selectedText === passage && selectedTokenIndexes.length === 0) {
      clearSelection();
      return;
    }

    await analyzeSelection(passage, []);
  };

  const saveWord = async () => {
    if (!analysisResult || selectedTokenIndexes.length === 0) return;
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

  return <div className="page-wrap reading-notes-page">
    <div className="page-heading reading-notes-heading">
      <div>
        <span>Reading notes</span>
        <h1>Đọc & Ghi chú từ</h1>
        <p>Dán đoạn văn, chọn từ chưa biết và xem AI giải thích nghĩa theo đúng ngữ cảnh.</p>
      </div>
    </div>
    <section className="reading-notes-layout">
      <div className="reading-notes-main">
        {(!hasStartedReading || isEditingPassage) ? <ReadingInputCard passage={draftPassage} history={passageHistory} error={inputError} onChange={setDraftPassage} onStart={startReading} /> : <section className="panel reading-toolbar-card">
          <div>
            <span>Reading mode</span>
            <strong>Đang đọc đoạn văn</strong>
            <p>Click 1 từ để dịch từ đó, click thêm từ khác để chọn cụm từ, hoặc dịch toàn đoạn.</p>
          </div>
          <button className="button secondary" onClick={() => setIsEditingPassage(true)}>Chỉnh sửa đoạn văn</button>
        </section>}
        {hasStartedReading && <ReadingTextViewer
          tokens={tokens}
          selectedTokenIndexes={selectedTokenIndexes}
          savedTokenIndexes={savedTokenIndexes}
          onSelectWord={(token) => void selectWord(token)}
          onTranslatePassage={() => void translatePassage()}
        />}
      </div>
      <WordExplanationPanel
        role={profile.role}
        selectedWord={selectedText}
        loading={loadingExplanation}
        error={analysisError}
        result={analysisResult}
        saved={saved}
        canSave={selectedTokenIndexes.length > 0}
        saveLoading={saveLoading}
        saveMessage={saveMessage}
        onSave={() => void saveWord()}
      />
    </section>
    {selectedSentence && !analysisResult && !loadingExplanation && !analysisError && <div className="reading-inline-note">Đang chuẩn bị giải thích cho câu: {selectedSentence}</div>}
  </div>;
}
