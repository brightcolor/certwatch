/* Placeholder shapes shown while the first payload is on its way. They match
   the layout that replaces them, so the page does not jump when data lands. */
export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton" aria-hidden="true">
      <div className="skeleton-hero">
        <span className="skeleton-ring" />
        <div className="skeleton-lines">
          <span style={{ width: "40%" }} />
          <span style={{ width: "68%" }} />
        </div>
      </div>
      <div className="skeleton-list">
        {Array.from({ length: rows }, (_, index) => (
          <div className="skeleton-row" key={index}>
            <span className="skeleton-mark" />
            <span style={{ width: `${52 + ((index * 13) % 30)}%` }} />
            <span style={{ width: `${34 + ((index * 7) % 20)}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* The full-page state before the session is known. */
export function BootScreen() {
  return (
    <main className="login">
      <div className="boot" role="status" aria-live="polite">
        <span className="boot-mark" />
        <span className="boot-label">Loading crt.watch</span>
      </div>
    </main>
  );
}
