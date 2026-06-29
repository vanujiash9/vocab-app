import type { ReactNode } from 'react';

interface AIResultCardProps {
  title: string;
  summary: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function AIResultCard({ title, summary, footer, children }: AIResultCardProps) {
  return <article className="panel ai-result-card">
    <div className="panel-heading ai-result-header">
      <div>
        <h3>{title}</h3>
        <p>{summary}</p>
      </div>
    </div>
    <div className="ai-result-body">{children}</div>
    {footer && <div className="ai-result-footer">{footer}</div>}
  </article>;
}
