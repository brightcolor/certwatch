export interface Monitor {
  id: string;
  name: string;
  host: string;
  port: number;
  type: string;
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
  config: Record<string, unknown>;
  notificationChannelIds: string[];
  notificationRecipients: Record<string, string>;
  maintenanceWindows?: string | null;
  lastStatus: string;
  latestResult?: CheckResult | null;
}

export interface CheckResult {
  id: string;
  monitorId: string;
  status: string;
  severity: string;
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
  tlsSupportedVersions?: string[];
  sslLabsGrade?: string | null;
  sslLabsScore?: number | null;
  sslLabsStatus?: string | null;
  sslLabsUrl?: string | null;
  sslLabsCheckedAt?: string | null;
  sslLabsFindings?: string[];
  flapping?: boolean;
  chain: Array<{ subject: string; issuer: string; validFrom?: string; validUntil?: string; fingerprintSha256?: string }>;
  problems: string[];
}

export interface Incident {
  id: string;
  monitorId: string;
  status: string;
  severity: string;
  message: string;
  startedAt: string;
  resolvedAt?: string | null;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  assignee?: string | null;
  notes: Array<{ id: string; author: string; text: string; createdAt: string }>;
}

export interface StatusSubscription {
  id: string;
  tags: string[];
  type: "email" | "webhook";
  target: string;
  enabled: boolean;
  createdAt: string;
}

let csrfToken = localStorage.getItem("csrfToken") ?? "";

export const api = {
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api${path}`, {
      credentials: "include",
      ...init,
      headers: {
        "content-type": "application/json",
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        ...(init.headers ?? {})
      }
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? `Request failed: ${response.status}`);
    return response.status === 204 ? (undefined as T) : response.json();
  },
  setCsrf(token: string) {
    csrfToken = token;
    localStorage.setItem("csrfToken", token);
  }
};
