import { useState } from "react";
import type { TenantInvite, TenantMembership } from "../api/client";

export function TenantsPage({ tenants, members, invites, onCreateTenant, onInviteMember, onRemoveMember, onDeleteInvite }: {
  tenants: TenantMembership[];
  members: any[];
  invites: TenantInvite[];
  onCreateTenant: (name: string) => Promise<void>;
  onInviteMember: (email: string, role: string) => Promise<TenantInvite | null>;
  onRemoveMember: (userId: string) => Promise<void>;
  onDeleteInvite: (inviteId: string) => Promise<void>;
}) {
  const current = tenants.find((item) => item.tenantId === localStorage.getItem("tenantId")) ?? tenants[0];
  const [tenantName, setTenantName] = useState("");
  const [member, setMember] = useState({ email: "", role: "viewer" });
  const [latestInvite, setLatestInvite] = useState("");

  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const invite = await onInviteMember(member.email, member.role);
    setLatestInvite(invite?.inviteUrl ?? "");
    setMember({ email: "", role: "viewer" });
  };

  return (
    <section className="content">
      <div className="grid two">
        <div className="panel">
          <h3>Workspace</h3>
          {current && <>
            <Info label="Name" value={current.tenant.name} />
            <Info label="Plan" value={current.tenant.plan} />
            <Info label="Status" value={current.tenant.status} />
            <Info label="Monitor limit" value={String(current.tenant.monitorLimit)} />
            <Info label="User limit" value={String(current.tenant.userLimit)} />
            <Info label="Your role" value={current.role} />
          </>}
        </div>
        <form className="panel" onSubmit={async (event) => { event.preventDefault(); if (tenantName.trim()) { await onCreateTenant(tenantName.trim()); setTenantName(""); } }}>
          <h3>Create workspace</h3>
          <p className="muted">New workspaces are isolated from monitors, notification providers, and tenant-scoped settings.</p>
          <label>Name<input value={tenantName} onChange={(event) => setTenantName(event.target.value)} /></label>
          <button>Create workspace</button>
        </form>
      </div>
      <div className="grid two">
        <form className="panel" onSubmit={inviteMember}>
          <h3>Invite member</h3>
          <p className="muted">Existing users are added immediately. New users receive an invite link and create their own account.</p>
          <label>Email<input type="email" value={member.email} onChange={(event) => setMember({ ...member, email: event.target.value })} required /></label>
          <label>Workspace role<select value={member.role} onChange={(event) => setMember({ ...member, role: event.target.value })}>
            <option value="viewer">Viewer</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select></label>
          <button>Invite member</button>
          {latestInvite && <div className="info invite-url"><span>Invite link</span><code>{latestInvite}</code><button type="button" onClick={() => navigator.clipboard.writeText(latestInvite)}>Copy</button></div>}
        </form>
        <div className="panel">
          <h3>Members</h3>
          {members.map((item) => <div className="channel" key={item.userId}><strong>{item.email}</strong><span>{item.role}</span><button onClick={() => onRemoveMember(item.userId)}>Remove</button></div>)}
          {!members.length && <span className="muted">No members loaded.</span>}
        </div>
      </div>
      <div className="panel">
        <h3>Pending invites</h3>
        {invites.map((invite) => (
          <div className="channel invite-row" key={invite.id}>
            <strong>{invite.email}</strong>
            <span>{invite.role}</span>
            <code>{invite.inviteUrl}</code>
            <button onClick={() => navigator.clipboard.writeText(invite.inviteUrl)}>Copy</button>
            <button onClick={() => onDeleteInvite(invite.id)}>Revoke</button>
          </div>
        ))}
        {!invites.length && <span className="muted">No pending invites.</span>}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return <div className="info"><span>{label}</span><strong>{value || "-"}</strong></div>;
}
