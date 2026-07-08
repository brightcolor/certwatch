# crt.watch – Optimization Backlog

Findings from a code review pass (2026-07-08). Ordered roughly by impact within each
section. Check items off as they're addressed.

## Backend / Flow

- [x] **Full DB export+rewrite on every write** — `db.exec`/`.run()` calls
      `fs.writeFileSync(sqlite.export())` synchronously on *every single* statement
      (`apps/api/src/storage/db.ts:15,20,34`). With many monitors this rewrites the
      whole SQLite file on disk for each insert/update — the single biggest
      bottleneck at scale. Fixed in v0.13.7: writes are now debounced (250ms) and
      flushed on SIGINT/SIGTERM.
- [x] **Missing indexes** — no index on `monitors(enabled, next_check_at)` (used by
      the due-monitor scan every 30s) or on `check_results(monitor_id, checked_at)`
      (used by `results.list/listRecent/consecutiveFailureStartedAt`). Fixed in
      v0.13.7.
- [ ] **N+1 queries per scheduler tick** — `apps/api/src/scheduler/scheduler.ts:59-73`
      queries `results.list(monitor.id, 1)`, looks up open incidents twice
      (once directly, once again inside `incidents.sync`), and loads
      `subscriptions.list()` unfiltered on every dispatch. Fix: use a batch/latest
      query and avoid the duplicate incident lookup.
- [ ] **Unbounded per-tick concurrency** — `Promise.allSettled(due.map(runMonitor))`
      (`scheduler.ts:16-17`) has no backpressure beyond `checkConcurrency`; a slow
      TLS/SSH check can hold a slot for its full timeout, and a burst of due
      monitors floods outbound connections simultaneously.
- [ ] **SSL Labs "24h cache" isn't a real TTL cache** —
      `apps/api/src/checks/sslLabs.ts:57-59` derives cache validity from DB history
      per monitor, not a shared per-host cache with in-flight dedupe. Multiple
      monitors on the same host enabled in the same tick can trigger duplicate
      live SSL Labs calls.
- [ ] **DNS resolution runs unconditionally every check** —
      `apps/api/src/checks/dnsResolution.ts:34-42`: `shouldRunDnsResolution`
      always returns `true`, so a full 5-resolver DNS lookup runs on every check
      cycle regardless of prior state, multiplying outbound DNS traffic.
- [ ] **Redundant result requery in flapping detection** —
      `apps/api/src/checks/monitorRunner.ts:19` re-queries
      `results.listRecent(monitor.id, 10)` right after the fresh result was
      already inserted; could compose in memory instead of a second DB round-trip.

## UI / UX

- [ ] **Blanket polling in `useLiveRefresh`** —
      `apps/web/src/hooks/useLiveRefresh.ts:22-30` refetches the full
      overview/dashboard every 10s on every page regardless of whether that page
      needs monitor-list data, plus a second fetch for monitor detail when one is
      selected. Fix: scope refresh to what the active page actually renders.
- [ ] **No backoff / error visibility on failed polls** — `useLiveRefresh` swallows
      repeated fetch failures silently every 10s with no user-facing "connection
      lost" state and no backoff.
- [ ] **Duplicated loading/error boilerplate per page** — Applications, Operations,
      Reports, and BulkImport each appear to reimplement their own
      loading/error handling around `useLiveRefresh` instead of sharing a common
      `useAsyncData`-style hook. Worth consolidating once the polling scope above
      is fixed.

## Feature Ideas

- [x] **Audit log viewer** — `audit_log` is written on every team/membership/invite
      action (`apps/api/src/routes/systemRoutes.ts`, via `auditLogs.record(...)`)
      but there is no `GET /api/audit-log` route and no UI page to view it. Fixed
      in v0.13.8: `GET /api/audit-log` (owner/admin only) plus an "Audit log" panel
      on the Operations page.
- [x] **Two-factor authentication (TOTP) for login** — no 2FA existed anywhere in
      `apps/api/src/auth/*`. Fixed in v0.13.8: TOTP-based 2FA (RFC 6238, no external
      dependency) with backup codes, set up from Profile and enforced as a second
      login step. WebAuthn is not implemented.
- [ ] **OIDC / LDAP / reverse-proxy-auth integrations** — already listed as a TODO
      in the README; relevant once used in orgs with existing SSO.
- [ ] **Full quiet-hours and maintenance-window enforcement** — already listed as
      a TODO in the README; current enforcement is described as partial.
- [ ] **Renewal-automation hooks** — crt.watch already tracks exact expiry dates;
      an optional webhook/script trigger fired N days before expiry (distinct
      from the existing alert notification) would let it kick off a renewal
      process instead of only reporting the problem.
- [ ] **CT-watch domain grouping** — Certificate Transparency watch is configured
      per domain; grouping related domains/wildcards would cut down on repeated
      noisy findings across many subdomains of the same root domain.

~~API token management~~ — already implemented (`GET/POST/DELETE /api/api-tokens`
in `apps/api/src/routes/opsRoutes.ts:117-126` plus an Operations page UI). The
README TODO list is stale on this point.

## Confirmed non-issues / clarifications

- No Certificate Authority (CA) CRUD exists. `CertificateAuthorityMark.tsx` is a
  display-only component that regex-matches the certificate issuer string against
  a hardcoded CA list (Let's Encrypt, DigiCert, Sectigo, ...). There is no
  `certificate_authorities` table, no CA routes, and no create/edit/delete UI for
  CAs — and none is currently planned as part of this backlog.
