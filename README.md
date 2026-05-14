<p align="center">
  <img src="assets/certwatch-logo.svg" alt="CertWatch logo" width="720">
</p>

# CertWatch

CertWatch is a self-hosted monitoring service for SSL/TLS certificates and TLS service configuration. It is intentionally similar in operating style to Uptime Kuma, but focused on certificate expiry, hostname mismatches, certificate chain issues, STARTTLS services, and alert deduplication.

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
- Monitor types for HTTPS, direct TCP TLS, SMTP STARTTLS, IMAP STARTTLS, and POP3 STARTTLS
- Certificate detail view with CN, SANs, issuer, serial number, SHA256 fingerprint, validity, chain, TLS version, and cipher suite
- Hostname mismatch, self-signed, expiry, weak TLS protocol, chain trust, and fingerprint-change detection
- Historical check results per monitor
- Manual "check now" action and automatic periodic scheduler
- Global and per-monitor warning and critical expiry thresholds
- Notification channels for SMTP email, Pushover, generic webhooks, Discord, Slack, Telegram, Gotify, and ntfy-compatible endpoints
- Alert deduplication with resend interval and recovery messages
- Local user login with bcrypt password hashes, secure sessions, CSRF token header, and admin seed user
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
curl -fsSL https://raw.githubusercontent.com/brightcolor/certwatch/main/scripts/quickstart.sh | sudo CERTWATCH_PORT=8080 CERTWATCH_ADMIN_EMAIL=admin@example.com bash
```

Manual setup:

1. Copy the environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and set at least:

```bash
SESSION_SECRET=use-a-long-random-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-password
```

3. Start CertWatch:

```bash
docker compose up -d
```

4. Open:

```text
http://localhost:8080
```

The first user is created automatically from `ADMIN_EMAIL` and `ADMIN_PASSWORD` if the database is empty.

## Example Monitors

- `example.com`, port `443`, type `HTTPS`
- `mail.example.com`, port `993`, type `TCP TLS`
- `smtp.example.com`, port `587`, type `SMTP STARTTLS`
- `imap.example.com`, port `143`, type `IMAP STARTTLS`
- `pop3.example.com`, port `110`, type `POP3 STARTTLS`

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

- Login fails: verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` were set before the first database initialization.
- Checks fail for private hosts: set `ALLOW_PRIVATE_TARGETS=true` if the instance is intentionally allowed to monitor internal networks.
- Cookies fail behind HTTPS: set `COOKIE_SECURE=true` and ensure `X-Forwarded-Proto` is passed by the proxy.
- STARTTLS fails: verify the service advertises STARTTLS and that firewalls allow the configured port.

## TODO

- Add API token management
- Add full quiet-hours and maintenance-window enforcement
- Add public status pages and badge URLs
- Add Prometheus metrics endpoint
- Add OIDC, LDAP, and reverse-proxy-auth integrations
- Add encrypted storage for notification secrets
