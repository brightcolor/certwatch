import { ShieldCheck } from "lucide-react";

type CertificateAuthorityMarkProps = {
  issuer?: string | null;
};

const authorities = [
  { match: /let'?s encrypt/i, name: "Let's Encrypt", shortName: "LE", tone: "success" },
  { match: /digicert/i, name: "DigiCert", shortName: "DC", tone: "info" },
  { match: /sectigo|comodoca|comodo/i, name: "Sectigo", shortName: "SC", tone: "warning" },
  { match: /global\s*sign/i, name: "GlobalSign", shortName: "GS", tone: "success" },
  { match: /google trust|gts/i, name: "Google Trust Services", shortName: "GTS", tone: "info" },
  { match: /amazon|aws/i, name: "Amazon Trust Services", shortName: "ATS", tone: "warning" },
  { match: /cloudflare/i, name: "Cloudflare", shortName: "CF", tone: "warning" },
  { match: /zerossl/i, name: "ZeroSSL", shortName: "ZSSL", tone: "info" }
];

export function CertificateAuthorityMark({ issuer }: CertificateAuthorityMarkProps) {
  const authority = authorities.find((item) => item.match.test(issuer ?? "")) ?? {
    name: issuer || "Unknown CA",
    shortName: initials(issuer || "CA"),
    tone: "secondary"
  };

  return (
    <div className={`ca-mark ca-${authority.tone}`}>
      <div className="ca-logo" aria-hidden="true">
        <ShieldCheck size={18} />
        <strong>{authority.shortName}</strong>
      </div>
      <div>
        <span>Certificate Authority</span>
        <strong>{authority.name}</strong>
      </div>
    </div>
  );
}

const initials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CA";
