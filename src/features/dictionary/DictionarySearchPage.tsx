import { useState } from 'react';
import { EmptyState, LoadingState } from '../../components/PageState';
import { useAuth } from '../../contexts/AuthContext';
import { saveDictionaryVocabulary } from '../../services/data';
import { DictionaryResult, type DictionarySaveStatus } from './DictionaryResult';
import { DictionarySearchForm } from './DictionarySearchForm';
import { lookupDictionaryWord } from './dictionary.service';
import type { DictionaryEntry } from './dictionary.types';

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'api-error'; message: string }
  | { status: 'success'; entry: DictionaryEntry };

export function DictionarySearchPage() {
  const { user, profile } = useAuth();
  const [lookupState, setLookupState] = useState<LookupState>({ status: 'idle' });
  const [saveStatus, setSaveStatus] = useState<DictionarySaveStatus>('idle');

  const search = async (word: string) => {
    setSaveStatus('idle');
    setLookupState({ status: 'loading' });
    const result = await lookupDictionaryWord(word);
    if (result.status === 'success') setLookupState({ status: 'success', entry: result.entry });
    else if (result.status === 'not-found') setLookupState({ status: 'not-found' });
    else setLookupState({ status: 'api-error', message: result.message });
  };

  const save = async () => {
    if (!user || lookupState.status !== 'success') return;
    setSaveStatus('saving');
    try {
      const result = await saveDictionaryVocabulary(user.id, profile?.role, lookupState.entry);
      setSaveStatus(result.status === 'duplicate' ? 'duplicate' : 'saved');
    } catch {
      setSaveStatus('error');
    }
  };

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Dictionary lookup</span><h1>Tra cứu từ</h1><p>{profile?.role === 'teacher' ? 'Tra từ bằng Dictionary API rồi lưu vào Kho từ vựng.' : 'Tra từ bằng Dictionary API rồi lưu vào Thư viện từ.'}</p></div></div>
    <DictionarySearchForm loading={lookupState.status === 'loading'} onSearch={(word) => void search(word)} />
    {lookupState.status === 'idle' && <EmptyState title="Chưa tìm kiếm" description="Nhập một từ tiếng Anh để xem định nghĩa, ví dụ và phát âm." />}
    {lookupState.status === 'loading' && <LoadingState />}
    {lookupState.status === 'not-found' && <EmptyState title="Không tìm thấy" description="Dictionary API không có kết quả cho từ này. Kiểm tra chính tả rồi thử lại." />}
    {lookupState.status === 'api-error' && <EmptyState title="API lỗi" description={lookupState.message} />}
    {lookupState.status === 'success' && <DictionaryResult entry={lookupState.entry} role={profile?.role} saveStatus={saveStatus} onSave={() => void save()} />}
  </div>;
}
