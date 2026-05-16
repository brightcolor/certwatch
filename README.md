<p align="center">
  <img src="assets/certwatch-logo.svg" alt="CertWatch logo" width="720">
</p>

# CertWatch

CertWatch is a self-hosted monitoring service for SSL/TLS certificates, TLS service configuration, and lightweight service health checks. It is intentionally similar in operating style to Uptime Kuma, but focused on certificate expiry, hostname mismatches, certificate chain issues, STARTTLS services, protocol availability, and alert deduplication.

The codebase is deliberately simple and compact. It also shows the signs of a fast AI-assisted build, so review the security and operational defaults before exposing it beyond a trusted network.

## Stack Decision

- Backend: Node.js with TypeScript and Express
- Frontend: React with Vite
- Database: SQLite by default through a small repository layer, with a structure that can later be adapted for PostgreSQL
- Worker: in-process scheduler with bounded concurrent checks
- Deployment: one Docker image served on port `8080`

This stack keeps the application easy to self-host while still supporting real TLS checks, background jobs, API endpoints, and a modern UI.

## Features

- Dashboard with OK, warning, critical, down, paused, and unknown status counts
- Monitor types for HTTPS, custom TCP TLS, SMTPS, IMAPS, POP3S, LDAPS, implicit FTPS, XMPP TLS, SMTP STARTTLS, IMAP STARTTLS, POP3 STARTTLS, and explicit FTP AUTH TLS
- Service health checks for HTTP, HTTP login flows, raw TCP ports, DNS records, SSH, FTP, SMTP, IMAP, and POP3 banners
- Optional service login checks for HTTP Basic/Form, SSH password auth, FTP, SMTP AUTH LOGIN, IMAP LOGIN, and POP3 USER/PASS
- Per-monitor alert grace period before failed checks create notifications
- Label-based application rollups where one service can contain multiple checks
- Prometheus-compatible metrics at `/metrics`
- Certificate detail view with CN, SANs, issuer, serial number, SHA256 fingerprint, validity, chain, TLS version, and cipher suite
- Hostname mismatch, self-signed, expiry, weak TLS protocol, chain trust, and fingerprint-change detection
- Historical check results per monitor
- Manual "check now" action and automatic periodic scheduler
- Global and per-monitor warning and critical expiry thresholds
- Notification channels for SMTP email, Pushover, generic webhooks, Discord, Slack, Telegram, Gotify, and ntfy-compatible endpoints
- Alert deduplication with resend interval and recovery messages
- Local user login with bcrypt password hashes, secure sessions, CSRF token header, and admin seed user
- Encrypted storage for monitor login secrets, SMTP settings, and notification provider secrets using `SESSION_SECRET`
- JSON monitor import/export and CSV exports for certificate summary and check history
- REST API under `/api`
- Dark and light mode
- Reverse-proxy aware deployment settings

## Screenshots

Screenshots are not committed yet. Start the app and open `http://localhost:8080` to capture:

- Dashboard
- Monitor detail page
- Monitor form
- Notification channel settings

## Quick Start

For a fresh Linux server with Docker already installed, run:

```bash
curl -fsSL https://raw.githubusercontent.com/brightcolor/certwatch/main/scripts/quickstart.sh | sudo bash
```

The script clones the repository into `/opt/certwatch`, creates `/opt/certwatch/.env` with generated secrets, builds the image, and starts the stack with Docker Compose.

If the repository is private, use a GitHub token that can read the repository:

```bash
curl -fsSL -H "Authorization: Bearer ${GITHUB_TOKEN}" https://raw.githubusercontent.com/brightcolor/certwatch/main/scripts/quickstart.sh | sudo bash
```

Optional overrides:

```bash
curl -fsSL https://raw.githubusercontent.com/brightcolor/certwatch/main/scripts/quickstart.sh | sudo CERTWATCH_PORT=8080 bash
```

To publish CertWatch on a different host port, set `CERTWATCH_PORT`:

```bash
curl -fsSL https://raw.githubusercontent.com/brightcolor/certwatch/main/scripts/quickstart.sh | sudo CERTWATCH_PORT=8888 bash
```

For manual installs, use `HOST_PORT=8888` in `.env` and keep `PORT=8080` unless you intentionally want to change the internal application port too.

Manual setup:

1. Copy the environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and set at least:

```bash
SESSION_SECRET=use-a-long-random-secret
BASE_URL=http://localhost:8080
```

3. Start CertWatch:

```bash
docker compose up -d
```

4. Open:

```text
http://localhost:8080
```

On first launch, CertWatch shows a setup screen where the first user creates the administrator account.

## Example Monitors

- `example.com`, port `443`, type `HTTPS`
- `smtp.example.com`, port `465`, type `SMTPS`
- `mail.example.com`, port `993`, type `TCP TLS`
- `ldap.example.com`, port `636`, type `LDAPS`
- `ftp.example.com`, port `21`, type `FTP explicit TLS`
- `smtp.example.com`, port `587`, type `SMTP STARTTLS`
- `imap.example.com`, port `143`, type `IMAP STARTTLS`
- `pop3.example.com`, port `110`, type `POP3 STARTTLS`
- `app.example.com`, port `443`, type `HTTP login check`
- `ssh.example.com`, port `22`, type `SSH banner`
- `example.com`, port `53`, type `DNS record check`

Use the same label on related monitors to model one application with multiple checks, for example `mail` on DNS, SMTP STARTTLS, IMAP STARTTLS, and webmail login monitors.

## Service Checks

CertWatch can monitor certificate-focused targets and general service availability from the same monitor list.

- HTTP checks validate the status code and can optionally require a response substring.
- HTTP login checks support Basic Auth or form POST checks. Login credentials are encrypted at rest and masked in API/UI responses.
- TCP checks validate that a port accepts connections.
- DNS checks validate record resolution and can require an expected value.
- SSH, FTP, SMTP, IMAP, and POP3 checks validate the protocol banner or capability response.
- Service login checks can validate credentials. SSH uses the SSH protocol; plain FTP, SMTP, IMAP, and POP3 login tests require explicit plaintext approval on the monitor. Prefer TLS or STARTTLS variants for credential-bearing checks.
- STARTTLS checks for SMTP, IMAP, and POP3 can optionally validate login credentials after the TLS upgrade.
- Direct SSL/TLS checks remain available for SMTPS, IMAPS, POP3S, LDAPS, implicit FTPS, and custom TLS ports.
- Explicit TLS upgrade checks are available for SMTP, IMAP, POP3, and FTP.

Keep `SESSION_SECRET` stable after first deployment. It is used to decrypt stored service-login passwords and provider secrets.
Monitor JSON exports mask stored secrets and are suitable for moving monitor definitions, not for full secret-bearing backups.

## Notification Setup

Notification channels are configured in the Alerts page as JSON.

Email SMTP example:

```json
{
  "host": "smtp.example.com",
  "port": 587,
  "username": "alerts@example.com",
  "password": "secret",
  "from": "certwatch@example.com",
  "to": "ops@example.com",
  "starttls": true,
  "secure": false
}
```

Webhook example:

```json
{
  "url": "https://example.com/certwatch-webhook"
}
```

Webhook payloads include monitor ID, monitor name, host, port, status, severity, message, days remaining, validity dates, issuer, SHA256 fingerprint, and check time.

## REST API

All API routes require login session authentication except `/api/auth/login`.

- `GET /api/monitors`
- `POST /api/monitors`
- `GET /api/monitors/{id}`
- `PUT /api/monitors/{id}`
- `DELETE /api/monitors/{id}`
- `POST /api/monitors/{id}/check`
- `GET /api/monitors/{id}/results`
- `GET /api/status`
- `GET /api/alerts`
- `POST /api/notification-channels/test`
- `GET /api/export/monitors.json`
- `POST /api/export/monitors.json`
- `GET /api/export/certificates.csv`
- `GET /api/export/history.csv`

## Public Status And Badges

Public status pages are available by label/tag:

```text
/public/status/prod.html
/public/status/prod
/public/status/prod+mail.html
/public/status/prod+mail
```

Monitor badges are SVG URLs:

```text
/public/badge/{monitorId}.svg
/public/badge/tags/prod+mail.svg
```

## Prometheus

Scrape:

```text
http://localhost:8080/metrics
```

Exported metrics include `certwatch_monitor_status`, `certwatch_cert_days_remaining`, `certwatch_last_check_timestamp`, and `certwatch_check_duration_seconds`.

## Watchtower Updates

The Compose file uses the published image `ghcr.io/brightcolor/certwatch:latest` and includes an optional Watchtower service. Enable it during quickstart:

```bash
curl -fsSL https://raw.githubusercontent.com/brightcolor/certwatch/main/scripts/quickstart.sh | sudo CERTWATCH_ENABLE_WATCHTOWER=true bash
```

Or enable it later:

```bash
cd /opt/certwatch
docker compose --profile watchtower up -d watchtower
```

Watchtower updates containers that have `com.centurylinklabs.watchtower.enable=true`.

## Reverse Proxy

Set:

```env
BASE_URL=https://certwatch.example.com
TRUST_PROXY=true
COOKIE_SECURE=true
```

Example nginx config:

```nginx
server {
  listen 443 ssl http2;
  server_name certwatch.example.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

## Backups

SQLite data is stored in the Docker volume mounted at `/data`. Back up `certwatch.sqlite` and its WAL files while the container is stopped, or use a SQLite online backup command from a maintenance shell.

## Updates

```bash
docker compose pull
docker compose build
docker compose up -d
```

The schema migration currently creates missing tables only. Back up the database before upgrading.

## Troubleshooting

- Login fails on a fresh install: open the setup screen and create the first admin user. For an existing install, reset the password in the SQLite database or recreate the data volume if no data must be kept.
- Checks fail for private hosts: set `ALLOW_PRIVATE_TARGETS=true` if the instance is intentionally allowed to monitor internal networks.
- Cookies fail behind HTTPS: set `COOKIE_SECURE=true` and ensure `X-Forwarded-Proto` is passed by the proxy.
- STARTTLS fails: verify the service advertises STARTTLS and that firewalls allow the configured port.
- Stored secrets cannot be read after changing `SESSION_SECRET`: restore the previous secret or re-enter affected monitor, SMTP, and notification provider passwords.

## TODO

- Add API token management
- Add full quiet-hours and maintenance-window enforcement
- Add Prometheus metrics endpoint
- Add OIDC, LDAP, and reverse-proxy-auth integrations
