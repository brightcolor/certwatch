# Changelog

## 0.2.0 - 2026-05-16

- Added SemVer versioning and a subtle UI version display.
- Added label-based application rollups so one service can contain multiple checks.
- Added optional login checks after SMTP, IMAP, and POP3 STARTTLS negotiation.
- Added Prometheus-compatible `/metrics` output.

## 0.1.0 - 2026-05-12

- Initial CertWatch implementation.
- Added a Linux quickstart script that clones the repository into `/opt/certwatch`, creates `.env`, and starts Docker Compose.
- Added configurable Docker host port publishing through `HOST_PORT` and the quickstart `CERTWATCH_PORT` override.
- Replaced environment-seeded admin credentials with a first-run web setup screen for creating the initial administrator.
- Fixed STARTTLS negotiation by using protocol-aware multiline response parsing for SMTP, IMAP, and POP3.
- Added direct SSL/TLS protocol presets with default ports for SMTPS, IMAPS, POP3S, LDAPS, implicit FTPS, and XMPP TLS.
- Added certificate-change alerts, public status pages, SVG badges, notification routing, user management, bulk import, retention settings, Docker health checks, and Watchtower/GHCR update support.
- Split notification provider configuration from per-monitor and per-route recipients.
- Added Uptime Kuma-style service checks for HTTP, HTTP login, TCP, DNS, SSH, FTP, SMTP, IMAP, and POP3.
- Added explicit FTP AUTH TLS certificate checks alongside the existing mail STARTTLS and direct SSL/TLS presets.
- Added optional service login checks for HTTP, SSH, FTP, SMTP, IMAP, and POP3, with plaintext credential checks gated per monitor.
- Added per-monitor alert grace periods so transient failures do not notify until the configured duration is exceeded.
- Added monitor deletion from the detail view and explicit cleanup of monitor history and alert history.
- Added public status pages and SVG badges for combined label/tag filters such as `prod+mail`.
- Added encrypted-at-rest storage for monitor login secrets, SMTP settings, and notification provider secrets.
- Added UI fields for service-check configuration and masked saved login/provider secrets in API responses.
- Added Docker Compose deployment on port `8080`.
- Added Express API, SQLite persistence, session authentication, CSRF header checks, and seeded admin user.
- Added monitor CRUD, manual checks, scheduler, TLS and STARTTLS check engine, status classification, and historical check storage.
- Added notification channels for SMTP email, Pushover, webhooks, Discord, Slack, Telegram, Gotify, and ntfy-compatible endpoints.
- Added alert deduplication and recovery notification behavior.
- Added React dashboard, monitor detail page, monitor editor, notification settings, search, filters, and dark/light mode.
- Added JSON import/export and CSV exports.
- Added tests for status classification, validation, and webhook payload shape.
