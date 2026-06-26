export function LoadingState() {
  return <div className="state-card"><div className="loader" /><p>Đang tải dữ liệu...</p></div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state-card"><strong>Không thể tải dữ liệu</strong><p>{message}</p>{retry && <button className="button secondary" onClick={retry}>Thử lại</button>}</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><div className="empty-orb">✦</div><strong>{title}</strong><p>{description}</p></div>;
}
