import { useState } from "react";
import type { TenantMembership } from "../api/client";

export function TenantsPage({ tenants, members, onCreateTenant, onAddMember, onRemoveMember }: {
  tenants: TenantMembership[];
  members: any[];
  onCreateTenant: (name: string) => Promise<void>;
  onAddMember: (email: string, role: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}) {
  const current = tenants.find((item) => item.tenantId === localStorage.getItem("tenantId")) ?? tenants[0];
  const [tenantName, setTenantName] = useState("");
  const [member, setMember] = useState({ email: "", role: "viewer" });

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
        <form className="panel" onSubmit={async (event) => { event.preventDefault(); await onAddMember(member.email, member.role); setMember({ email: "", role: "viewer" }); }}>
          <h3>Add member</h3>
          <p className="muted">The user must already exist. Platform admins can create users on the Users page first.</p>
          <label>Email<input type="email" value={member.email} onChange={(event) => setMember({ ...member, email: event.target.value })} required /></label>
          <label>Workspace role<select value={member.role} onChange={(event) => setMember({ ...member, role: event.target.value })}>
            <option value="viewer">Viewer</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select></label>
          <button>Add member</button>
        </form>
        <div className="panel">
          <h3>Members</h3>
          {members.map((item) => <div className="channel" key={item.userId}><strong>{item.email}</strong><span>{item.role}</span><button onClick={() => onRemoveMember(item.userId)}>Remove</button></div>)}
          {!members.length && <span className="muted">No members loaded.</span>}
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return <div className="info"><span>{label}</span><strong>{value || "-"}</strong></div>;
}
