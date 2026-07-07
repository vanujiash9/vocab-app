interface StateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface LoadingStateProps {
  message?: string;
}

interface ErrorStateProps {
  message: string;
  retry?: () => void;
}

interface EmptyStateProps {
  title: string;
  description: string;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
}

export function LoadingState({ message = 'Đang tải dữ liệu...' }: LoadingStateProps) {
  return <div className="state-card"><div className="loader" /><strong>Đang chuẩn bị nội dung</strong><p>{message}</p></div>;
}

export function ErrorState({ message, retry }: ErrorStateProps) {
  return <div className="state-card"><strong>Không thể tải dữ liệu</strong><p>{message}</p><div className="state-card-actions">{retry && <button className="button secondary" onClick={retry}>Thử lại</button>}</div></div>;
}

export function EmptyState({ title, description, primaryAction, secondaryAction }: EmptyStateProps) {
  return <div className="empty-state"><strong>{title}</strong><p>{description}</p>{(primaryAction || secondaryAction) && <div className="empty-state-actions">{primaryAction && <button className={`button ${primaryAction.variant ?? 'primary'}`} onClick={primaryAction.onClick}>{primaryAction.label}</button>}{secondaryAction && <button className={`button ${secondaryAction.variant ?? 'secondary'}`} onClick={secondaryAction.onClick}>{secondaryAction.label}</button>}</div>}</div>;
}
