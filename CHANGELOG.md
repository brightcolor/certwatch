# Changelog

## 0.8.3 - 2026-05-28

- Added DNS resolution details to monitor results, including resolved IP addresses, authoritative nameservers, and comparison against Cloudflare, Quad9, and Google public resolvers.
- Added configurable DNS resolution change alerting with a global policy, per-monitor override, and per-monitor DNS comparison interval.
- Added per-monitor certificate change alert overrides while keeping the global certificate-change alert policy.
- Extended notification payloads and certificate CSV exports with DNS resolution data.

## 0.8.2 - 2026-05-28

- Replaced the fixed-width public SVG badges with a responsive badge renderer that dynamically sizes content and safely clips long hostnames.
- Added `?label=` and `?alias=` support for monitor and label badges so embeds can use short customer-facing names.
- Exposed alias badge URLs in the monitor and application embed panels.

## 0.8.1 - 2026-05-28

- Reworked the dark theme to use a neutral dark blue/gray palette and removed the green/olive cast.
- Strengthened status colors across pills, table rows, dashboard info boxes, and status counters with clear green/yellow/red/gray states.
- Added datetime range builders for global and per-monitor maintenance windows while keeping text rules for recurring schedules.

## 0.8.0 - 2026-05-28

- Made AdminLTE 4 the only frontend shell and removed the previous native/AdminLTE skin switch.
- Rebuilt the main operator layout around AdminLTE navbar, sidebar, content header, footer, Bootstrap cards, info boxes, callouts, and responsive admin forms.
- Added a global monitor quick search in the header so operators can jump directly to a monitor by name, host, type, or label.
- Added a status center dropdown and sidebar health summary using the existing live status counts.
- Kept dark and light mode as the remaining interface preference.

## 0.7.1 - 2026-05-28

- Added a Vite development proxy for `/api`, `/metrics`, and `/public` so the frontend on `localhost:5173` can talk to the API on `localhost:8080`.
- Restarted the local development server after dependency and lockfile updates so Vite re-optimized AdminLTE and rendered the app again.

## 0.7.0 - 2026-05-28

- Added AdminLTE `4.0.0` as an optional frontend skin.
- Added an Appearance panel in Settings to switch between the native CertWatch design and AdminLTE 4.
- Reworked the main layout to use AdminLTE app wrapper, navbar, sidebar, content header, and content area classes when the AdminLTE skin is selected.
- Mapped existing CertWatch dashboard cards, panels, tables, forms, and modals into the AdminLTE/Bootstrap visual system while preserving the existing React workflows.

## 0.6.0 - 2026-05-19

- Added optional Qualys SSL Labs v4 assessments for public HTTPS hosts on port `443`, configured from the Operations UI with a registered API email.
- Cached SSL Labs assessments per host for at least 24 hours and carried the last external grade into regular check results between external scans.
- Added SSL Labs grade, status, findings, URL, CSV export fields, webhook payload fields, dashboard badges, and monitor detail rows.
- Added alert escalation when an SSL Labs grade deteriorates compared with the previous monitor result.
- Added direct import for discovery suggestions, including one-click accept and accept-all actions in the UI.
- Marked MX-derived discovery suggestions with `mail` and `mx` labels.
- Fixed label chip entry so Enter, comma, and blur commits keep all labels until they are explicitly removed.
- Standardized UI and public status dates to include leading zeroes for day and month.

## 0.5.0 - 2026-05-19

- Added an intensive TLS assessment that can probe supported TLS versions and flag deprecated protocol support, weak cipher patterns, missing forward secrecy, small certificate keys, and incomplete chains.
- Persisted supported TLS versions in check history and displayed them in monitor details.
- Added configurable alerting when a monitor's TLS grade or score deteriorates compared with the previous check.
- Extended webhook payloads with TLS grade, score, and supported protocol versions.

## 0.4.9 - 2026-05-19

- Fixed user creation feedback in the Users page by adding client-side validation, submit state, and visible API error messages.
- Added a clear password-length hint for new users.
- Added duplicate-email handling for user creation with a readable API response.

## 0.4.8 - 2026-05-18

- Clarified plain service checks versus TLS/STARTTLS certificate checks in monitor details, dashboard rows, and monitor type labels.
- Hid empty certificate-chain sections for plain service checks and replaced blank certificate fields with actionable guidance.
- Limited TLS validation options in the monitor form to monitor types that actually collect certificate data.
- Added per-service transport security modes for TCP, FTP, SMTP, IMAP, and POP3: Auto, STARTTLS where supported, SSL/TLS, and Plain.
- Added certificate collection, TLS grading, certificate-change watch, and secure login checks to service monitors when a secure transport mode is active.
- Grouped the dashboard monitor list by primary label and surfaced TLS grades directly in overview rows.

## 0.4.7 - 2026-05-18

- Redesigned public status pages with a polished customer-facing layout, summary cards, monitor list, incident timeline, and responsive styling.
- Changed public status page subscriptions to double opt-in so email and webhook targets must confirm before alerts are enabled.
- Added tests for public status page rendering, escaping, hostname hiding, and opt-in copy.

## 0.4.6 - 2026-05-18

- Fixed label blur commits with synchronous state updates so typed labels remain when moving into another field or saving.
- Improved monitor, operations, settings, and login form layout with aligned label/control rows.
- Simplified form section styling to reduce nested card clutter and improve scanability.

## 0.4.5 - 2026-05-18

- Fixed label inputs so a typed label is committed when the field loses focus instead of being discarded.
- Kept Enter/comma label entry and text-mode switching behavior intact.

## 0.4.4 - 2026-05-18

- Added a dynamic browser favicon that glows green when no actionable problems exist.
- Made the favicon blink red when warning, critical, down, or unknown monitor states need attention.
- Added periodic status polling so the favicon can update while the dashboard remains open.

## 0.4.3 - 2026-05-18

- Switched Docker Compose service settings to compact list/string syntax where supported.
- Changed the `/data` bind mount to the short Compose volume form while keeping the relative `DATA_DIR` default.
- Removed the bundled Watchtower service while keeping the update label for external Watchtower instances.

## 0.4.2 - 2026-05-18

- Removed `build: .` from the production Compose file so deployments and Watchtower use the published GHCR image.
- Added `docker-compose.dev.yml` for explicit local image builds.
- Updated quickstart and update docs to pull and run the published container image.

## 0.4.1 - 2026-05-18

- Changed Docker Compose persistence to an explicit relative bind mount using `DATA_DIR=./data`.
- Removed the image-level `/data` volume declaration to avoid implicit anonymous Docker volumes.
- Added missing runtime environment variables to Compose for scheduler defaults and timezone-sensitive windows.
- Added `.dockerignore` entries so local data and `.env` files are not copied into Docker build context.

## 0.4.0 - 2026-05-17

- Added monitor and label-based maintenance windows that suppress notifications while checks continue to run.
- Added API token management with read-only and read/write scopes.
- Added incident acknowledgement, assignment, and notes.
- Added notification delivery logging for sent and failed provider deliveries.
- Added TLS policy settings for security grading.
- Added custom public status page settings with slugs, titles, descriptions, logo URLs, and hostname hiding.
- Added scheduled auto-discovery jobs and persisted discovery suggestions.
- Added availability reports with check counts, incident counts, availability percentage, and MTTR.
- Added scheduled SQLite backups with UI download and retention controls.
- Reworked monitor labels into Enter-driven chips with a copy-friendly text mode.
- Added HTTP expected-header and redirect-follow checks.

## 0.3.0 - 2026-05-17

- Added SSL Labs-style TLS security grading and displayed grades in the dashboard and monitor detail view.
- Added flapping detection with a configurable global transition threshold.
- Added incident timelines for monitor details and public status pages.
- Added public status page subscriptions with email and webhook delivery for incident open and recovery events.
- Added route-level escalation delay controls for configurable notification policies.
- Added Certificate Transparency watch settings with manual check support.
- Added auto-discovery suggestions for common web and mail monitors.
- Added backup and restore UI for portable non-secret JSON exports.

## 0.2.2 - 2026-05-17

- Added browser history support for monitor details so mouse/browser Back returns to the monitor overview.
- Made Dashboard navigation always clear the selected monitor and return to the overview.

## 0.2.1 - 2026-05-16

- Reworked the main UI around clearer navigation, dashboard scanning, application rollups, detail actions, and grouped monitor form sections.
- Moved public status embed controls into the Applications area and added clearer empty states for first-run usage.

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
