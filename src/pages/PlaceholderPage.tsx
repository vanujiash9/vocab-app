import { EmptyState } from '../components/PageState';

const content: Record<string, { title: string; description: string }> = {
  assigned: { title: 'Chưa có từ được giao', description: 'Mục này sẽ hiển thị danh sách từ giáo viên giao cho học viên.' },
  notifications: { title: 'Chưa có thông báo', description: 'Thông báo học tập và nhắc nhở sẽ hiển thị ở đây.' },
  assign: { title: 'Chưa bật giao từ', description: 'Mục này dành cho giáo viên giao từ vựng cho học viên.' },
  import: { title: 'Chưa bật Import Excel', description: 'Mục này sẽ dùng để nhập danh sách từ vựng từ file Excel.' },
  students: { title: 'Chưa có học viên', description: 'Danh sách học viên sẽ hiển thị khi có nghiệp vụ lớp học phù hợp.' },
};

export function PlaceholderPage({ type }: { type: keyof typeof content }) {
  const item = content[type];
  return <div className="page-wrap"><div className="page-heading"><div><span>Coming soon</span><h1>{item.title}</h1><p>{item.description}</p></div></div><EmptyState title={item.title} description={item.description} /></div>;
}
