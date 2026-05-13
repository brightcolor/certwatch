# Changelog

## 0.1.0 - 2026-05-12

- Initial CertWatch implementation.
- Added a Linux quickstart script that clones the repository into `/opt/certwatch`, creates `.env`, and starts Docker Compose.
- Added Docker Compose deployment on port `8080`.
- Added Express API, SQLite persistence, session authentication, CSRF header checks, and seeded admin user.
- Added monitor CRUD, manual checks, scheduler, TLS and STARTTLS check engine, status classification, and historical check storage.
- Added notification channels for SMTP email, Pushover, webhooks, Discord, Slack, Telegram, Gotify, and ntfy-compatible endpoints.
- Added alert deduplication and recovery notification behavior.
- Added React dashboard, monitor detail page, monitor editor, notification settings, search, filters, and dark/light mode.
- Added JSON import/export and CSV exports.
- Added tests for status classification, validation, and webhook payload shape.
