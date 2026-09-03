import { useState } from "react";

type Props = {
  onImport: (text: string) => Promise<any>;
  onDiscover: (domain: string) => Promise<any>;
  onAcceptDiscovery: (items: any[]) => Promise<any>;
  onRestore: (backup: any) => Promise<any>;
};

export function BulkImport({ onImport, onDiscover, onAcceptDiscovery, onRestore }: Props) {
  const [text, setText] = useState("example.com\nsmtp.example.com:587 starttls=smtp tags=mail,prod\nmail.example.com type=imaps");
  const [domain, setDomain] = useState("");
  const [backup, setBackup] = useState("");
  const [result, setResult] = useState<any>(null);
  const [discovery, setDiscovery] = useState<any[]>([]);

  const discover = async () => {
    const response = await onDiscover(domain);
    setDiscovery(response.monitors ?? []);
  };
  const addDiscoveryToImport = () => {
    const lines = discovery.map((item) => `${item.host}:${item.port} type=${item.type} tags=${item.tags.join(",")}`);
    setText((current) => [current, ...lines].filter(Boolean).join("\n"));
  };
  const acceptDiscovery = async (items: any[]) => {
    setResult(await onAcceptDiscovery(items));
    setDiscovery((current) => current.filter((item) => !items.some((accepted) => keyFor(accepted) === keyFor(item))));
  };
  const restore = async () => {
    setResult(await onRestore(JSON.parse(backup)));
    setBackup("");
  };

  return (
    <section className="content">
      <div className="grid two">
        <div className="panel">
          <h3>Bulk import</h3>
          <label>Targets<textarea value={text} onChange={(e) => setText(e.target.value)} /></label>
          <button className="btn btn-primary" onClick={async () => setResult(await onImport(text))}>Import monitors</button>
          {result && <p className="muted">Imported {result.imported} monitors. {result.errors?.length ? `${result.errors.length} lines failed.` : "No errors."}</p>}
        </div>
        <div className="panel">
          <h3>Auto-discovery</h3>
          <label>Domain<input value={domain} placeholder="example.com" onChange={(e) => setDomain(e.target.value)} /></label>
          <div className="actions"><button className="btn btn-primary" onClick={discover}>Discover</button>{!!discovery.length && <button className="btn btn-outline-secondary" onClick={addDiscoveryToImport}>Add to import</button>}{!!discovery.length && <button className="btn btn-primary" onClick={() => acceptDiscovery(discovery)}>Accept all</button>}</div>
          <div className="stack-list">{discovery.map((item) => <div key={`${item.host}-${item.port}-${item.type}`}><strong>{item.name}</strong><span>{item.host}:{item.port}</span><small>{item.type} - {item.tags.join(", ")}</small><button className="btn btn-outline-secondary btn-sm" onClick={() => acceptDiscovery([item])}>Accept</button></div>)}</div>
        </div>
      </div>
      <div className="grid two">
        <div className="panel">
          <h3>Backup</h3>
          <p className="muted">Exports monitor definitions, routing, and non-secret settings. Copy the SQLite volume for a full secret-bearing backup.</p>
          <a className="btn btn-outline-secondary" href="/api/export/backup.json">Download backup JSON</a>
        </div>
        <div className="panel">
          <h3>Restore</h3>
          <label>Backup JSON<textarea value={backup} placeholder="{ ... }" onChange={(e) => setBackup(e.target.value)} /></label>
          <button className="btn btn-outline-warning" disabled={!backup.trim()} onClick={restore}>Restore backup</button>
        </div>
      </div>
    </section>
  );
}

const keyFor = (item: any) => `${item.host}:${item.port}:${item.type}`;
