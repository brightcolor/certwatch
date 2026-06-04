# Changelog

## 0.12.6 - 2026-06-04

- Added tenant-scoped teams with private or tenant-visible visibility, team roles, team memberships, and a team selector in the app shell.
- Added team management to the workspace admin UI, including create, edit, archive, member assignment, role changes, and member removal.
- Added optional initial team assignment to workspace invites so accepted invitations can create both tenant and team memberships.
- Hardened multi-tenant access with server-side `X-Team-Id` validation, active membership checks, last-owner protections, disabled membership handling, and audit log entries for team changes.
- Stored new invite tokens as hashes at rest and only exposed the raw invite URL immediately after invite creation.
- Added focused multi-tenant tests for team boundaries and owner-count protections.

## 0.12.5 - 2026-06-04

- Split the monitor form into mobile-friendly steps for Basics, Checks, Alerts, and Advanced settings.
- Added a thin Bootstrap 5.3 soft-UI design layer with Inter, tabular numbers, rounded cards, tinted status pills, subtle glows, and left accent bars.
- Added Bootstrap Icons and used them in the new monitor form step navigation and summary pills.
- Reduced hard-coded dashboard/status colors in favor of Bootstrap CSS variables and `rgba(var(--bs-*-rgb), ...)` tints.
- Refined dashboard hero, KPI cards, status pills, and monitor status marks to match the new flat SaaS dashboard style.

## 0.12.4 - 2026-05-31

- Improved label/tag entry with stable chips, blur/tab commit behavior, text mode, quick suggestions, and clear/remove actions.
- Reused the label input in personal alert preferences and notification routing so label handling is consistent across forms.
- Clarified workspace groups as access groups with role explanations, selected member counts, select-all/clear controls, and clearer group rows.
- Added a sticky monitor form action bar so save, save-and-check, and cancel actions stay visible in long forms.
- Constrained the public frontpage content to 80% desktop width for a calmer landing-page layout.

## 0.12.3 - 2026-05-31

- Added a profile page with account details, logout, and self-service password changes that require the current password.
- Added a header profile menu so logout and profile actions are always discoverable.
- Added direct pause/resume controls for monitors in the dashboard list and monitor detail view.

## 0.12.2 - 2026-05-31

- Rebranded the visible product name to `crt.watch` across the web UI, public pages, notifications, documentation, tests, quickstart output, and logo asset.
- Updated package metadata and README logo references to use the `crt.watch` name.

## 0.12.1 - 2026-05-31

- Reduced UI font weights so interface text does not exceed `600`, including dashboard monitor names and targets.
- Made default and Bootstrap buttons more compact.
- Added consistent semantic button styling for success, warning, and destructive actions across monitor, user, workspace, settings, import, and operations screens.

## 0.12.0 - 2026-05-30

- Added a `super_admin` platform role and migrated existing platform admins to super admins.
- Made first-run setup create a super admin account.
- Added super-admin user management for creating users, changing platform roles, rotating passwords, deleting users, and impersonating users for support.
- Added an impersonation banner action so super admins can return to their own account.
- Added a platform setting to disable public organization registration from the web UI while keeping invite links usable.

## 0.11.9 - 2026-05-30

- Removed the redundant `Selfhosted TLS monitoring` eyebrow from the application title bar.

## 0.11.8 - 2026-05-30

- Made dashboard list view the default monitor layout.
- Filled monitor row status markers with their status color and added status-colored row and metric-card hover treatment.
- Darkened dashboard card borders so they sit below the card background instead of reading as light outlines.

## 0.11.7 - 2026-05-30

- Darkened the dashboard KPI cards and restored padded rounded status icon blocks inside each card.

## 0.11.6 - 2026-05-30

- Restored the earlier dark colorful dashboard checklist styling from the repository history.
- Removed the circular health score from that restored layout while keeping clickable status, KPI, message, and problem filters.

## 0.11.5 - 2026-05-30

- Restored the larger dark dashboard health header and KPI card styling while removing the old circular score display.
- Kept the dashboard summary chips, KPI cards, status chips, messages, and problem chips clickable as monitor filters.

## 0.11.4 - 2026-05-30

- Rebranded the visible product name, public pages, authentication screens, notifications, README, license, and logo asset to `crt.watch`.
- Updated the quickstart script to install into `/opt/crt.watch` while keeping the current GitHub repository URL stable until the repository is renamed.
- Kept existing internal compatibility identifiers such as `crtwatch` metric names, database defaults, cookie names, and workspace package scopes unchanged.

## 0.11.3 - 2026-05-30

- Added clickable dashboard status summaries, metric cards, row status marks, result messages, and problem chips as filters.
- Added issue filters so operators can isolate monitors with the same warning, error, DNS mismatch, TLS deduction, or SSL Labs finding.
- Kept the dashboard row design compact by showing the first problem inline and expanding additional clickable messages only on demand.
- Changed DNS resolver comparison to run fresh on every monitor check instead of reusing cached DNS samples.
- Removed the per-monitor DNS comparison interval field from the monitor form.

## 0.11.2 - 2026-05-30

- Fixed dashboard status filter chips so inactive filters stay neutral gray and only selected filters use status colors.
- Kept the `All` filter selected only when no individual status filters are active.

## 0.11.1 - 2026-05-30

- Added a manual SSL Labs trigger API for public HTTPS targets and eligible monitor detail pages.
- Added an Operations UI form to trigger SSL Labs assessments for arbitrary public hosts.
- Stored monitor-triggered SSL Labs assessments in check history so the dashboard and monitor detail views update immediately.

## 0.11.0 - 2026-05-30

- Added workspace permission groups with group roles and effective per-organization member roles.
- Added member role editing, group assignment, group creation, group editing, and group deletion to the Workspaces UI.
- Extended user management so platform admins can update platform roles and rotate user passwords.
- Kept users multi-organization capable with independent rights per organization, including invite-time role selection that defaults to viewer.
- Added personal alert preferences for non-critical events while critical delivery remains controlled by workspace admin routes.

## 0.10.0 - 2026-05-30

- Added public registration that creates an isolated organization workspace for new users.
- Added workspace invite links so owners and admins can invite users who do not yet have an account.
- Added environment switches for the public frontpage and public registration while keeping first-run admin setup direct.
- Updated the workspace UI to show pending invites, copy invite links, and revoke unused invites.
- Added an Operations UI action to register an SSL Labs v4 API email directly through crt.watch and save it for assessments.
- Made dashboard status filter chips visibly color-coded in active and inactive states.

## 0.9.9 - 2026-05-30

- Added a public crt.watch frontpage that explains the service, links to GitHub, and keeps setup or sign-in one click away.
- Updated README and quickstart URLs for the renamed GitHub repository at `brightcolor/crt.watch`.
- Updated the local repository remote to the renamed GitHub repository.

## 0.9.8 - 2026-05-30

- Rebranded the product UI, public status pages, notifications, documentation, logo, package metadata, and server logs to `crt.watch`.
- Normalized Docker service, container, backup, export, database, cookie, and Prometheus metric names to the `crtwatch` / `crt-watch` naming scheme.
- Updated quickstart configuration variables to the `CRTWATCH_` prefix while keeping the current GitHub repository URL as the source checkout.

## 0.9.7 - 2026-05-30

- Removed the duplicate header brand so crt.watch is only shown in the sidebar brand area.
- Added a functional desktop sidebar collapse that keeps icon-only navigation visible and shows labels on hover.
- Removed the dashboard score ring while keeping the contextual health header and colored status summary chips.
- Tuned dashboard row typography, certificate validity display, TLS/SSL grade alignment, and hover surfaces for a denser operator view.

## 0.9.6 - 2026-05-30

- Reworked the dashboard into a dark, colorful score-and-checklist layout inspired by audit result interfaces.
- Added an overall health score ring with contextual headline, description, and status summary chips.
- Replaced the monitor table with compact status rows that show a colored status mark, monitor reason, target, certificate details, and actions.
- Fixed monitor row hover styling by removing the old table-cell surface model and making each monitor row a single interactive surface.
- Switched informational accent color to cyan for a darker but more colorful interface.

## 0.9.5 - 2026-05-30

- Made dashboard monitor rows denser with shorter row height, tighter text spacing, and compact icon actions.
- Added monitor cloning from the dashboard and monitor detail view; cloned monitors are created paused to avoid duplicate checks and alerts.
- Preserved monitor secrets during server-side cloning while continuing to redact them in API responses.
- Strengthened filled status indicators for OK, Warning, Critical, Down, Paused, and Unknown states.
- Fixed status filter chip behavior so clicking a status selects that status from the All view, and colored every chip by its status.
- Adjusted dashboard row hover styling so text cells, pills, and action areas visually move with the hovered row.

## 0.9.4 - 2026-05-29

- Removed the sidebar live overview block and made dashboard monitor rows more compact.
- Added dashboard view switching between grouped and flat list modes.
- Added multi-select status filters so operators can combine states such as OK and Warning while excluding Critical or Down.
- Enlarged dashboard summary numbers for quicker scanning.
- Added explicit TLS grade deduction reasons, persisted them with check results, and included them in TLS/SSL Labs deterioration alerts.
- Added status reason text to monitor details so operators can see why the latest status was assigned.
- Added certificate expiry threshold reasons to warning and critical status classification.

## 0.9.3 - 2026-05-29

- Added live UI refresh for visible pages so dashboards, monitor details, users, workspaces, settings, operations, and reports update without manual reloads.
- Refreshed visible data immediately when the browser tab becomes active again while pausing refreshes during form editing.
- Added dashboard problem chips that surface certificate, TLS, DNS, SSL Labs, and service issues directly in the monitor overview.

## 0.9.2 - 2026-05-28

- Removed the remaining cool-toned UI accents and moved the operator interface to a Discord-like neutral gray palette.
- Overrode AdminLTE/Bootstrap primary buttons, links, callouts, focus rings, navigation highlights, and label chips so the UI stays gray outside explicit status colors.
- Tightened custom panels to behave more like AdminLTE cards with card headers, card backgrounds, and table-style monitor rows.

## 0.9.1 - 2026-05-28

- Polished the AdminLTE operator interface with a more coherent shell, card, table, form, and monitor-detail treatment.
- Added explicit `Dark`, `Bright`, and `Auto` color modes, with dark mode as the default and auto mode following the operating system preference.
- Replaced the remaining color-heavy surfaces with a neutral charcoal and bright palette.
- Improved dashboard rows, embed controls, status surfaces, focused inputs, and theme persistence.

## 0.9.0 - 2026-05-28

- Added a SaaS-ready workspace model with tenant records, plan/status/limit fields, and role-based memberships.
- Scoped monitors, notification providers, and tenant settings by selected workspace while preserving existing installs through a default workspace migration.
- Added workspace roles for owners, admins, members, and viewers plus API enforcement for monitor writes, provider changes, and settings updates.
- Added a workspace switcher and workspace/member management page to the AdminLTE UI.

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

- Reworked the dark theme to use a neutral gray palette and removed the green/olive cast.
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
- Added an Appearance panel in Settings to switch between the native crt.watch design and AdminLTE 4.
- Reworked the main layout to use AdminLTE app wrapper, navbar, sidebar, content header, and content area classes when the AdminLTE skin is selected.
- Mapped existing crt.watch dashboard cards, panels, tables, forms, and modals into the AdminLTE/Bootstrap visual system while preserving the existing React workflows.

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

- Initial crt.watch implementation.
- Added a Linux quickstart script that clones the repository into `/opt/crt.watch`, creates `.env`, and starts Docker Compose.
- Added configurable Docker host port publishing through `HOST_PORT` and the quickstart `CRTWATCH_PORT` override.
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
