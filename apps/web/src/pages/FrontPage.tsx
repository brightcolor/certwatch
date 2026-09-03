import { Activity, ArrowRight, Bell, Github, LockKeyhole, Radar, Server, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const githubUrl = "https://github.com/brightcolor/crt.watch";

export function FrontPage({ setupRequired, registrationEnabled, onAuth, onRegister }: {
  setupRequired: boolean;
  registrationEnabled: boolean;
  onAuth: () => void;
  onRegister: () => void;
}) {
  const primaryAction = setupRequired ? onAuth : registrationEnabled ? onRegister : onAuth;
  const primaryLabel = setupRequired ? "Create first admin" : registrationEnabled ? "Create organization" : "Open dashboard";
  return (
    <main className="frontpage">
      <header className="frontpage-nav">
        <a className="frontpage-brand" href="#top" aria-label="crt.watch home">
          <span><Activity size={18} /></span>
          <strong>crt.watch</strong>
        </a>
        <nav aria-label="Public navigation">
          <a href="#features">Features</a>
          <a href="#operations">Operations</a>
          <a href={githubUrl} target="_blank" rel="noreferrer"><Github size={16} /> GitHub</a>
          {!setupRequired && registrationEnabled && <button className="btn btn-outline-secondary" type="button" onClick={onRegister}>Register</button>}
          <button className="btn btn-primary" type="button" onClick={onAuth}>{setupRequired ? "Set up" : "Sign in"}</button>
        </nav>
      </header>

      <section className="frontpage-hero" id="top">
        <div className="frontpage-copy">
          <span className="eyebrow">TLS and service monitoring</span>
          <h1>Watch certificates before customers notice problems.</h1>
          <p>
            crt.watch monitors certificates, TLS posture, DNS drift, STARTTLS services, logins,
            public status pages, and notifications from one self-hosted operator interface.
          </p>
          <div className="frontpage-actions">
            <button className="btn btn-primary btn-lg" type="button" onClick={primaryAction}>{primaryLabel} <ArrowRight size={16} /></button>
            <a className="btn btn-outline-secondary" href={githubUrl} target="_blank" rel="noreferrer"><Github size={16} /> View on GitHub</a>
          </div>
        </div>
        <div className="frontpage-visual" aria-label="crt.watch monitoring overview">
          <div className="visual-header"><span></span><span></span><span></span></div>
          <div className="visual-score">
            <strong>All critical certificates covered</strong>
            <small>Live checks, expiry windows, TLS grading, DNS comparisons</small>
          </div>
          {[
            ["mail.example.net", "OK", "TLS A, 62 days remaining"],
            ["api.example.com", "Warning", "Certificate changes watched"],
            ["imap.example.org", "OK", "STARTTLS login succeeded"]
          ].map(([host, status, detail]) => (
            <div className={`visual-row visual-${status.toLowerCase()}`} key={host}>
              <span>{status}</span>
              <strong>{host}</strong>
              <small>{detail}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="frontpage-strip" aria-label="Core counters">
        <div><strong>30 / 14 / 7</strong><span>expiry thresholds</span></div>
        <div><strong>SMTP, IMAP, POP3</strong><span>STARTTLS and SSL checks</span></div>
        <div><strong>Public pages</strong><span>customer-facing status</span></div>
        <div><strong>Prometheus</strong><span>metrics for Grafana</span></div>
      </section>

      <section className="frontpage-section" id="features">
        <div>
          <span className="eyebrow">Built for operators</span>
          <h2>Certificate monitoring plus the service checks around it.</h2>
          <p className="muted">The goal is a calm control room for certificate operations, not another noisy alert source.</p>
        </div>
        <div className="frontpage-grid">
          <Feature icon={<ShieldCheck />} title="Certificate intelligence" text="Expiry windows, SAN and hostname validation, issuer and fingerprint changes, chain checks, and TLS grading." />
          <Feature icon={<Server />} title="Protocol coverage" text="HTTPS, TCP TLS, SMTP, IMAP, POP3, FTP, SSH, DNS, login checks, and STARTTLS/SSL transport modes." />
          <Feature icon={<Bell />} title="Quiet alerting" text="Notification routing, deduplication, recovery messages, escalation timing, quiet hours, and maintenance windows." />
          <Feature icon={<Radar />} title="Change awareness" text="Certificate Transparency watch, DNS resolver comparison, SSL Labs assessments, and change notifications." />
        </div>
      </section>

      <section className="frontpage-section frontpage-operations" id="operations">
        <div>
          <span className="eyebrow">Self-hosted by default</span>
          <h2>Deploy it like infrastructure.</h2>
          <p className="muted">Run it with Docker Compose, keep data in a local bind mount, and update with your existing Watchtower flow.</p>
        </div>
        <div className="frontpage-command">
          <LockKeyhole size={18} />
          <code>curl -fsSL https://raw.githubusercontent.com/brightcolor/crt.watch/main/scripts/quickstart.sh | sudo bash</code>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="frontpage-card">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
