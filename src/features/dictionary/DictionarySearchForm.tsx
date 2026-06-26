import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export function DictionarySearchForm({ loading, onSearch }: { loading: boolean; onSearch: (word: string) => void }) {
  const [word, setWord] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(word);
  };

  return <form className="search-bar panel" onSubmit={submit}>
    <Search size={20} />
    <input value={word} onChange={(event) => setWord(event.target.value)} placeholder="Nhập từ tiếng Anh cần tra..." disabled={loading} />
    <button className="button primary" disabled={loading || !word.trim()}>{loading ? 'Đang tra...' : 'Tra cứu'}</button>
  </form>;
}
