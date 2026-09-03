import type { ReactNode } from "react";

/* The screen a new organization sees first. It says what this page is for and
   offers the one action that fills it, instead of reporting that a list is
   empty. */
export function EmptyState({
  icon,
  title,
  text,
  action,
  hint
}: {
  icon?: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="empty-panel">
      {icon && <span className="empty-mark" aria-hidden="true">{icon}</span>}
      <strong>{title}</strong>
      <p>{text}</p>
      {action && <div className="actions">{action}</div>}
      {hint && <small>{hint}</small>}
    </div>
  );
}
