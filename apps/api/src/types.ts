export type MonitorType =
  | "https"
  | "tls"
  | "smtps"
  | "imaps"
  | "pop3s"
  | "ldaps"
  | "ftps"
  | "xmpps"
  | "smtp_starttls"
  | "imap_starttls"
  | "pop3_starttls"
  | "ftp_starttls";
export type ServiceMonitorType = "http" | "tcp" | "dns" | "http_login" | "ssh" | "ftp" | "smtp" | "imap" | "pop3";
export type MonitorStatus = "OK" | "WARNING" | "CRITICAL" | "DOWN" | "PAUSED" | "UNKNOWN";
export type Severity = "info" | "warning" | "critical" | "recovery";
export type TenantRole = "owner" | "admin" | "member" | "viewer";
export const DEFAULT_TENANT_ID = "00000000-0000-4000-8000-000000000001";
export type ChannelType =
  | "email"
  | "pushover"
  | "webhook"
  | "discord"
  | "slack"
  | "telegram"
  | "gotify"
  | "ntfy"
  | "teams"
  | "mattermost"
  | "matrix"
  | "pagerduty"
  | "opsgenie";

export interface Monitor {
  id: string;
  tenantId: string;
  name: string;
  host: string;
  port: number;
  type: MonitorType | ServiceMonitorType;
  enabled: boolean;
  intervalSeconds: number;
  timeoutSeconds: number;
  warningDays: number;
  criticalDays: number;
  gracePeriodSeconds: number;
  sniEnabled: boolean;
  sniHost?: string | null;
  validateCertificate: boolean;
  allowSelfSigned: boolean;
  tags: string[];
  notes?: string | null;
  owner?: string | null;
  notificationChannelIds: string[];
  notificationRecipients: Record<string, string>;
  config: Record<string, unknown>;
  maintenanceWindows?: string | null;
  lastStatus: MonitorStatus;
  nextCheckAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckResult {
  id: string;
  monitorId: string;
  status: MonitorStatus;
  severity: Severity;
  message: string;
  checkedAt: string;
  durationMs: number;
  daysRemaining?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  commonName?: string | null;
  subjectAltNames: string[];
  issuer?: string | null;
  serialNumber?: string | null;
  fingerprintSha256?: string | null;
  tlsVersion?: string | null;
  cipherSuite?: string | null;
  tlsGrade?: string | null;
  tlsScore?: number | null;
  tlsGradeReasons?: TlsGradeReason[];
  tlsSupportedVersions?: string[];
  sslLabsGrade?: string | null;
  sslLabsScore?: number | null;
  sslLabsStatus?: string | null;
  sslLabsUrl?: string | null;
  sslLabsCheckedAt?: string | null;
  sslLabsFindings?: string[];
  dns?: DnsResolutionSummary | null;
  flapping?: boolean;
  chain: CertificateChainItem[];
  problems: string[];
  rawError?: string | null;
}

export interface TlsGradeReason {
  reason: string;
  points: number;
}

export interface DnsResolutionSummary {
  host: string;
  checkedAt: string;
  fresh: boolean;
  addresses: string[];
  authoritativeZone?: string | null;
  authoritativeNameservers: string[];
  checks: DnsResolverCheck[];
  mismatches: string[];
  fingerprint: string;
}

export interface DnsResolverCheck {
  name: string;
  kind: "system" | "authoritative" | "public";
  servers: string[];
  addresses: string[];
  error?: string | null;
}

export interface CertificateChainItem {
  subject: string;
  issuer: string;
  validFrom?: string;
  validUntil?: string;
  fingerprintSha256?: string;
  serialNumber?: string;
}

export interface NotificationChannel {
  id: string;
  tenantId: string;
  name: string;
  type: ChannelType;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: "admin" | "viewer";
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "team" | "business" | "enterprise";
  status: "active" | "trialing" | "past_due" | "suspended";
  monitorLimit: number;
  userLimit: number;
  createdAt: string;
}

export interface TenantMembership {
  tenantId: string;
  userId: string;
  role: TenantRole;
  effectiveRole?: TenantRole;
  createdAt: string;
  tenant: Tenant;
  userEmail?: string;
  groupIds?: string[];
  groupNames?: string[];
}

export interface TenantInvite {
  id: string;
  tenantId: string;
  email: string;
  role: TenantRole;
  token: string;
  invitedByUserId?: string | null;
  acceptedAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface TenantGroup {
  id: string;
  tenantId: string;
  name: string;
  role: TenantRole;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserAlertSettings {
  tenantId: string;
  userId: string;
  enabled: boolean;
  tags: string[];
  severities: Exclude<Severity, "critical">[];
  channelIds: string[];
  recipients: Record<string, string>;
  updatedAt: string;
}

export interface AlertingSettings {
  resendAfterHours: number;
  recoveryEnabled: boolean;
  certificateChangeAlerts: boolean;
  dnsChangeAlerts: boolean;
  tlsDeteriorationAlerts: boolean;
  tlsDeteriorationThreshold: number;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  quietSuppressCritical: boolean;
  flappingThreshold: number;
}

export interface RetentionSettings {
  checkResultsDays: number;
  alertHistoryDays: number;
}

export interface NotificationRoute {
  id: string;
  name: string;
  tags: string[];
  severities: Severity[];
  channelIds: string[];
  recipients: Record<string, string>;
  delayMinutes?: number;
  enabled: boolean;
}

export interface Incident {
  id: string;
  monitorId: string;
  status: MonitorStatus;
  severity: Severity;
  message: string;
  startedAt: string;
  resolvedAt?: string | null;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  assignee?: string | null;
  notes: IncidentNote[];
}

export interface IncidentNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface StatusSubscription {
  id: string;
  tags: string[];
  type: "email" | "webhook";
  target: string;
  enabled: boolean;
  createdAt: string;
}

export interface CtWatchSettings {
  enabled: boolean;
  domains: string[];
  lastSeen: Record<string, string>;
}

export interface MaintenanceWindow {
  id: string;
  name: string;
  tags: string[];
  window: string;
  enabled: boolean;
}

export interface MaintenanceSettings {
  windows: MaintenanceWindow[];
}

export interface TlsPolicySettings {
  profile: "modern" | "strict" | "legacy";
  minimumTlsVersion: "TLSv1" | "TLSv1.1" | "TLSv1.2" | "TLSv1.3";
  weakCipherPenalty: number;
  requireSan: boolean;
  intensiveScan: boolean;
}

export interface SslLabsSettings {
  enabled: boolean;
  registeredEmail: string;
  intervalHours: number;
  maxAgeHours: number;
  timeoutSeconds: number;
  startNewScans: boolean;
  publishResults: boolean;
}

export interface StatusPageConfig {
  id: string;
  slug: string;
  title: string;
  description: string;
  logoUrl: string;
  tags: string[];
  hideHostnames: boolean;
  enabled: boolean;
}

export interface StatusPageSettings {
  pages: StatusPageConfig[];
}

export interface DiscoverySettings {
  enabled: boolean;
  intervalHours: number;
  domains: string[];
  suggestions: DiscoveredMonitor[];
  lastRunAt?: string | null;
}

export interface DiscoveredMonitor {
  name: string;
  host: string;
  port: number;
  type: Monitor["type"];
  tags: string[];
}

export interface BackupSettings {
  enabled: boolean;
  intervalHours: number;
  keep: number;
  lastRunAt?: string | null;
}

export interface ApiToken {
  id: string;
  name: string;
  tokenHash: string;
  scopes: string[];
  userId: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface NotificationDelivery {
  id: string;
  monitorId: string;
  channelId?: string | null;
  channelName: string;
  provider: string;
  target: string;
  severity: Severity;
  status: MonitorStatus;
  deliveryStatus: "sent" | "failed";
  message: string;
  error?: string | null;
  sentAt: string;
}

export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  secure: boolean;
  starttls: boolean;
}
