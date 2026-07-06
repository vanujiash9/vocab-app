import { useRef, useState, type ChangeEvent } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/PageState';
import { parseTeacherVocabularyCsv, type TeacherVocabularyImportPreview } from '../lib/importTeacherVocabularyCsv';
import { useAuth } from '../contexts/AuthContext';
import { importTeacherVocabularyFromRows } from '../services/data';

function ImportChecklist() {
  return <div className="compact-list import-checklist"><div><strong>Định dạng</strong><span>Dùng file CSV export từ Excel với cột bắt buộc <code>word</code>. Các cột hỗ trợ thêm: phonetic, part_of_speech, english_definition, vietnamese_meaning, difficulty.</span></div><div><strong>Làm sạch</strong><span>Xóa dòng trống và giữ một từ trên mỗi dòng để preview dễ quét hơn trước khi nhập.</span></div><div><strong>Sau khi nhập</strong><span>Quay lại Kho từ vựng hoặc Giao từ để chọn nhanh bộ từ vừa thêm.</span></div></div>;
}

function ImportPreviewCard({ preview }: { preview: TeacherVocabularyImportPreview }) {
  return <div className="import-preview-card"><div className="panel-heading"><div><h3>Xem trước dữ liệu CSV</h3><p>Kiểm tra nhanh file và vài dòng đầu trước khi lưu vào kho từ của giáo viên.</p></div></div><div className="assign-summary-stats import-preview-stats"><div><strong>{preview.totalRows}</strong><span>Tổng dòng</span></div><div><strong>{preview.validRows}</strong><span>Hợp lệ</span></div><div><strong>{preview.skippedRows}</strong><span>Bỏ qua</span></div></div><div className="compact-list import-preview-list">{preview.rows.slice(0, 5).map((row) => <div key={`${row.word}-${row.phonetic ?? 'none'}`}><strong>{row.word}</strong><span>{row.vietnamese_meaning}{row.difficulty ? ` · ${row.difficulty}` : ''}</span></div>)}</div>{preview.rows.length > 5 && <p className="import-hint">Đang hiển thị 5 dòng đầu để review nhanh.</p>}</div>;
}

export function ImportExcelPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<TeacherVocabularyImportPreview | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickFile = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsParsing(true);
    setMessage('');
    setError('');

    try {
      const source = await file.text();
      const parsedPreview = parseTeacherVocabularyCsv(file.name, source);
      setPreview(parsedPreview);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'Không đọc được file CSV này.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!user || !preview || isSubmitting) return;

    setIsSubmitting(true);
    setMessage('');
    setError('');

    try {
      const summary = await importTeacherVocabularyFromRows(user.id, preview.rows);
      setMessage(`Đã nhập ${summary.imported} từ. Trùng hoặc đã có: ${summary.duplicatesOrExisting}. Bỏ qua: ${summary.skipped + preview.skippedRows}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể import từ vựng lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = Boolean(preview?.rows.length) && !isSubmitting;

  return <div className="page-wrap import-page-wrap"><div className="page-heading import-page-heading"><div><span>Nhập dữ liệu cho giáo viên</span><h1>Nhập CSV từ Excel</h1><p>Dùng file CSV export từ Excel để thêm nhiều từ trong một bước gọn rồi quay lại giao bài.</p></div></div>{message && <div className="form-message standalone">{message}</div>}{error && <div className="form-message standalone import-error-message">{error}</div>}<section className="assign-hero-grid compact"><article className="panel import-dropzone"><div className="import-dropzone-head"><div className="icon-button import-dropzone-icon"><Upload size={20} /></div><div><h3>Chọn file CSV export từ Excel</h3><p>Dùng file CSV UTF-8 để hệ thống đọc cột dữ liệu, tạo preview và lưu vào kho từ của giáo viên.</p></div></div><input ref={inputRef} className="import-file-input" type="file" accept=".csv,text/csv" onChange={(event) => void handleFileChange(event)} />{preview ? <ImportPreviewCard preview={preview} /> : <EmptyState title={isParsing ? 'Đang đọc file CSV' : 'Chưa có file CSV nào được chọn'} description={isParsing ? 'Hệ thống đang đọc file, chuẩn hóa cột và tạo preview trước khi nhập.' : 'Chọn một file CSV export từ Excel để xem trước số dòng hợp lệ rồi mới nhập.'} primaryAction={{ label: isParsing ? 'Đang xử lý...' : 'Chọn file CSV', onClick: pickFile, variant: 'secondary' }} secondaryAction={{ label: 'Quay lại giao từ', onClick: () => navigate('/assign-words'), variant: 'secondary' }} />}<div className="assign-heading-actions import-actions">{preview && <button className="button secondary" onClick={pickFile} disabled={isParsing || isSubmitting}><FileSpreadsheet size={17} /> Chọn file khác</button>}<button className="button primary" onClick={() => void handleImport()} disabled={!canSubmit}><Upload size={17} /> {isSubmitting ? 'Đang nhập dữ liệu...' : 'Nhập vào kho từ'}</button></div><p className="import-hint">Hiện tại màn này hỗ trợ file CSV export từ Excel. Nếu cần đọc trực tiếp file .xlsx, mình sẽ thêm parser workbook ở pass sau.</p></article><aside className="assign-summary-card compact import-summary-card"><div className="assign-summary-head compact"><div><span className="eyebrow assign-eyebrow">Tài nguyên</span><h3>Checklist trước khi nhập</h3><p>Giữ dữ liệu sạch để thư viện và đợt giao từ dễ quản lý hơn.</p></div><div className="icon-button import-dropzone-icon"><FileSpreadsheet size={20} /></div></div><ImportChecklist /></aside></section></div>;
}
