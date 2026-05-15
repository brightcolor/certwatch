import { useState } from "react";

export function BulkImport({ onImport }: { onImport: (text: string) => Promise<any> }) {
  const [text, setText] = useState("example.com\nsmtp.example.com:587 starttls=smtp tags=mail,prod\nmail.example.com type=imaps");
  const [result, setResult] = useState<any>(null);
  return (
    <section className="content">
      <div className="panel">
        <h3>Import monitors</h3>
        <label>Targets<textarea value={text} onChange={(e) => setText(e.target.value)} /></label>
        <button onClick={async () => setResult(await onImport(text))}>Import monitors</button>
        {result && <p className="muted">Imported {result.imported} monitors. {result.errors?.length ? `${result.errors.length} lines failed.` : "No errors."}</p>}
      </div>
    </section>
  );
}
