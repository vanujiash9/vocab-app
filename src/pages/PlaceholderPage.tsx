import { EmptyState } from '../components/PageState';

const content: Record<string, { title: string; description: string }> = {
  assigned: { title: 'Chưa có từ được giao', description: 'Mục này sẽ hiển thị danh sách từ giáo viên giao cho học viên.' },
  notifications: { title: 'Chưa có thông báo', description: 'Thông báo học tập và nhắc nhở sẽ hiển thị ở đây.' },
  assign: { title: 'Chưa bật giao từ', description: 'Mục này dành cho giáo viên giao từ vựng cho học viên.' },
  import: { title: 'Import Excel', description: 'Dùng file mẫu đúng cột để nhập nhanh kho từ cho giáo viên.' },
  students: { title: 'Chưa có học viên', description: 'Danh sách học viên sẽ hiển thị khi có nghiệp vụ lớp học phù hợp.' },
};

export function PlaceholderPage({ type }: { type: keyof typeof content }) {
  const item = content[type];

  if (type === 'import') {
    return <div className="page-wrap notifications-page-wrap">
      <div className="page-heading notifications-page-heading">
        <div>
          <span>Teacher import guide</span>
          <h1>{item.title}</h1>
          <p>{item.description}</p>
        </div>
      </div>

      <section className="notifications-panel teacher-import-guide-panel">
        <div className="notifications-panel-heading">
          <h3>Import từ vựng cho giáo viên</h3>
          <p>Bạn có thể mở phần hướng dẫn ngắn gọn bên dưới khi cần chuẩn bị file.</p>
        </div>

        <details className="teacher-import-guide-details">
          <summary>
            <span>Hướng dẫn sử dụng</span>
            <small>Nhấn để mở / ẩn</small>
          </summary>
          <div className="compact-list teacher-dashboard-compact-list">
            <div><strong>Cột nên có</strong><span>word, part_of_speech, english_definition, vietnamese_meaning, example, difficulty</span></div>
            <div><strong>Dòng ví dụ</strong><span>ocean | noun | a large body of water | đại dương | The ocean is vast. | medium</span></div>
            <div><strong>Độ khó hợp lệ</strong><span>easy, medium, hard</span></div>
            <div><strong>Lưu ý</strong><span>Mỗi dòng là một từ. Không gộp nhiều ví dụ hoặc nhiều từ trong cùng một ô.</span></div>
          </div>
        </details>
      </section>
    </div>;
  }

  return <div className="page-wrap">
    <div className="page-heading">
      <div>
        <span>Coming soon</span>
        <h1>{item.title}</h1>
        <p>{item.description}</p>
      </div>
    </div>
    <EmptyState title={item.title} description={item.description} />
  </div>;
}

// ponytail: keep import guidance lightweight here until the real upload workflow exists.
