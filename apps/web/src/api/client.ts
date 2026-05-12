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
  sniEnabled: boolean;
  sniHost?: string | null;
  validateCertificate: boolean;
  allowSelfSigned: boolean;
  tags: string[];
  notes?: string | null;
  owner?: string | null;
  notificationChannelIds: string[];
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
  chain: Array<{ subject: string; issuer: string; validFrom?: string; validUntil?: string; fingerprintSha256?: string }>;
  problems: string[];
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
