import { useState, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';
import { EmptyState, ErrorState } from '../components/PageState';
import { useAuth } from '../contexts/AuthContext';
import { importTeacherVocabularyBatch, validateVocabularyImportRows } from '../services/data';
import type { VocabularyExcelRow, VocabularyImportPreviewRow } from '../features/vocabulary-manual/vocabularyManual.types';
import { mapExcelRowToManualInput } from '../features/vocabulary-manual/vocabularyManual.utils';

const REQUIRED_HEADERS = ['word', 'english_definition'];

export function ImportExcelPage() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<VocabularyImportPreviewRow[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setLoading(true); setError(''); setMessage('');
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<VocabularyExcelRow>(firstSheet, { defval: '' });
      if (!rawRows.length) throw new Error('File Excel không có dữ liệu.');

      const headers = Object.keys(rawRows[0] ?? {}).map((item) => item.trim().toLowerCase());
      const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
      if (missingHeaders.length) throw new Error(`Thiếu cột: ${missingHeaders.join(', ')}`);

      const mapped = rawRows.map(mapExcelRowToManualInput);
      const preview = await validateVocabularyImportRows(user.id, mapped);
      setRows(preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đọc được file Excel.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (rowNumber: number) => {
    setRows((current) => current.map((row) => row.rowNumber === rowNumber ? { ...row, selected: !row.selected } : row));
  };

  const reset = () => {
    setRows([]);
    setMessage('');
    setError('');
  };

  const runImport = async () => {
    if (!user) return;
    setLoading(true); setError(''); setMessage('');
    try {
      const selectedRows = rows.filter((row) => row.status === 'valid' && row.selected).map((row) => row.input);
      const result = await importTeacherVocabularyBatch(user.id, selectedRows);
      setMessage(`Đã import ${result.imported} dòng hợp lệ. Bỏ qua ${result.duplicates} dòng trùng.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import thất bại.');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'teacher') return <Navigate to="/dashboard" replace />;

  const total = rows.length;
  const valid = rows.filter((row) => row.status === 'valid').length;
  const invalid = rows.filter((row) => row.status === 'invalid').length;
  const duplicate = rows.filter((row) => row.status === 'duplicate').length;

  return <div className="page-wrap">
    <div className="page-heading"><div><span>Teacher import</span><h1>Import Excel</h1><p>Chọn file Excel, preview dữ liệu rồi xác nhận import.</p></div></div>
    <div className="panel">
      <input type="file" accept=".xlsx,.xls" onChange={(event) => void onFileChange(event)} disabled={loading} />
      {error && <ErrorState message={error} retry={reset} />}
      {message && <div className="form-message standalone">{message}</div>}
      {loading && <div className="form-message standalone">Đang xử lý file...</div>}
    </div>
    {total > 0 ? <>
      <section className="stats-grid">
        <article className="stat-card"><strong>{total}</strong><span>Tổng số dòng</span></article>
        <article className="stat-card"><strong>{valid}</strong><span>Hợp lệ</span></article>
        <article className="stat-card"><strong>{invalid}</strong><span>Lỗi</span></article>
        <article className="stat-card"><strong>{duplicate}</strong><span>Trùng</span></article>
      </section>
      <div className="panel table-wrap"><table><thead><tr><th>Chọn</th><th>Dòng</th><th>Word</th><th>Definition</th><th>Difficulty</th><th>Trạng thái</th><th>Lỗi</th></tr></thead><tbody>{rows.map((row) => <tr key={row.rowNumber}><td>{row.status === 'valid' ? <input type="checkbox" checked={row.selected} onChange={() => toggleRow(row.rowNumber)} /> : '-'}</td><td>{row.rowNumber}</td><td>{row.input.word}</td><td>{row.input.englishDefinition}</td><td>{row.input.difficulty ?? 'unset'}</td><td>{row.status}</td><td>{row.errors.join(', ') || '-'}</td></tr>)}</tbody></table></div>
      <div className="status-actions"><button className="button secondary" onClick={reset}>Quay lại</button><button className="button primary" disabled={loading || !rows.some((row) => row.status === 'valid' && row.selected)} onClick={() => void runImport()}>Import từ hợp lệ</button></div>
    </> : <EmptyState title="Chưa có file Excel" description="Upload file để xem preview trước khi import." />}
  </div>;
}
