export type MonitorType = "https" | "tls" | "smtp_starttls" | "imap_starttls" | "pop3_starttls";
export type MonitorStatus = "OK" | "WARNING" | "CRITICAL" | "DOWN" | "PAUSED" | "UNKNOWN";
export type Severity = "info" | "warning" | "critical" | "recovery";
export type ChannelType = "email" | "pushover" | "webhook" | "discord" | "slack" | "telegram" | "gotify" | "ntfy";

export interface Monitor {
  id: string;
  name: string;
  host: string;
  port: number;
  type: MonitorType;
  enabled: boolean;
  intervalSeconds: number;
  timeoutSeconds: number;
  warningDays: number;
  criticalDays: number;
  sniEnabled: boolean;
  sniHost?: string | null;
  validateCertificate: boolean;
  allowSelfSigned: boolean;
  tags: string[];
  notes?: string | null;
  owner?: string | null;
  notificationChannelIds: string[];
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
  chain: CertificateChainItem[];
  problems: string[];
  rawError?: string | null;
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
