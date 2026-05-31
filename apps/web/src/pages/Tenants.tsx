import { useState } from "react";
import type { TenantGroup, TenantInvite, TenantMembership } from "../api/client";

export function TenantsPage({ tenants, members, invites, groups, onCreateTenant, onInviteMember, onUpdateMember, onRemoveMember, onDeleteInvite, onSaveGroup, onDeleteGroup }: {
  tenants: TenantMembership[];
  members: any[];
  invites: TenantInvite[];
  groups: TenantGroup[];
  onCreateTenant: (name: string) => Promise<void>;
  onInviteMember: (email: string, role: string) => Promise<TenantInvite | null>;
  onUpdateMember: (userId: string, data: { role?: string; groupIds?: string[] }) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onDeleteInvite: (inviteId: string) => Promise<void>;
  onSaveGroup: (group: { id?: string; name: string; role: string; memberIds: string[] }) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
}) {
  const current = tenants.find((item) => item.tenantId === localStorage.getItem("tenantId")) ?? tenants[0];
  const [tenantName, setTenantName] = useState("");
  const [member, setMember] = useState({ email: "", role: "viewer" });
  const [group, setGroup] = useState<{ id?: string; name: string; role: string; memberIds: string[] }>({ name: "", role: "viewer", memberIds: [] });
  const [latestInvite, setLatestInvite] = useState("");

  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const invite = await onInviteMember(member.email, member.role);
    setLatestInvite(invite?.inviteUrl ?? "");
    setMember({ email: "", role: "viewer" });
  };
  const saveGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!group.name.trim()) return;
    await onSaveGroup({ ...group, name: group.name.trim() });
    setGroup({ name: "", role: "viewer", memberIds: [] });
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
          <button className="success">Create workspace</button>
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
          <button className="success">Invite member</button>
          {latestInvite && <div className="info invite-url"><span>Invite link</span><code>{latestInvite}</code><button type="button" onClick={() => navigator.clipboard.writeText(latestInvite)}>Copy</button></div>}
        </form>
        <div className="panel">
          <h3>Members</h3>
          {members.map((item) => <MemberRow member={item} groups={groups} onSave={onUpdateMember} onRemove={onRemoveMember} key={item.userId} />)}
          {!members.length && <span className="muted">No members loaded.</span>}
        </div>
      </div>
      <div className="grid two">
        <form className="panel" onSubmit={saveGroup}>
          <h3>{group.id ? "Edit access group" : "Create access group"}</h3>
          <p className="muted">Access groups bundle members and grant an additional workspace role. A member's effective role is the highest direct or group role.</p>
          <label>Name<input value={group.name} onChange={(event) => setGroup({ ...group, name: event.target.value })} /></label>
          <label>Granted role<select value={group.role} onChange={(event) => setGroup({ ...group, role: event.target.value })}>
            <option value="viewer">Viewer</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select></label>
          <RoleHint role={group.role} />
          <div className="member-picker">
            <div>
              <strong>Members</strong>
              <span className="muted">{group.memberIds.length} selected</span>
            </div>
            <button type="button" className="ghost" onClick={() => setGroup((current) => ({ ...current, memberIds: members.map((item) => item.userId) }))}>Select all</button>
            <button type="button" className="ghost" onClick={() => setGroup((current) => ({ ...current, memberIds: [] }))}>Clear</button>
          </div>
          <div className="checks">
            {members.map((item) => <label key={item.userId}><input type="checkbox" checked={group.memberIds.includes(item.userId)} onChange={() => setGroup((current) => ({ ...current, memberIds: toggle(current.memberIds, item.userId) }))} /> {item.email}</label>)}
          </div>
          <div className="actions"><button className="success">{group.id ? "Save group" : "Create group"}</button>{group.id && <button className="danger" type="button" onClick={() => setGroup({ name: "", role: "viewer", memberIds: [] })}>Cancel edit</button>}</div>
        </form>
        <div className="panel">
          <h3>Access groups</h3>
          {groups.map((item) => <div className="access-group-row" key={item.id}><div><strong>{item.name}</strong><span>{item.memberIds.length} members</span></div><span className={`role-pill role-${item.role}`}>{item.role}</span><div className="actions end"><button onClick={() => setGroup({ id: item.id, name: item.name, role: item.role, memberIds: item.memberIds })}>Edit</button><button className="danger" onClick={() => onDeleteGroup(item.id)}>Delete</button></div></div>)}
          {!groups.length && <span className="muted">No access groups created.</span>}
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
            <button className="danger" onClick={() => onDeleteInvite(invite.id)}>Revoke</button>
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

function MemberRow({ member, groups, onSave, onRemove }: { member: any; groups: TenantGroup[]; onSave: (userId: string, data: { role?: string; groupIds?: string[] }) => Promise<void>; onRemove: (userId: string) => Promise<void> }) {
  const [role, setRole] = useState(member.role);
  const [groupIds, setGroupIds] = useState<string[]>(member.groupIds ?? []);
  return (
    <div className="member-row">
      <div>
        <strong>{member.email}</strong>
        <span>Effective: {member.effectiveRole ?? member.role}{member.groupNames?.length ? ` via ${member.groupNames.join(", ")}` : ""}</span>
      </div>
      <label>Direct role<select value={role} onChange={(event) => setRole(event.target.value)}>
        <option value="viewer">Viewer</option>
        <option value="member">Member</option>
        <option value="admin">Admin</option>
        <option value="owner">Owner</option>
      </select></label>
      <div className="checks compact-checks">
        {groups.map((group) => <label key={group.id}><input type="checkbox" checked={groupIds.includes(group.id)} onChange={() => setGroupIds((current) => toggle(current, group.id))} /> {group.name}</label>)}
        {!groups.length && <span className="muted">No access groups</span>}
      </div>
      <div className="actions end"><button className="success" onClick={() => onSave(member.userId, { role, groupIds })}>Save</button><button className="danger" onClick={() => onRemove(member.userId)}>Remove</button></div>
    </div>
  );
}

const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

function RoleHint({ role }: { role: string }) {
  return <p className="muted role-hint">{roleDescriptions[role] ?? roleDescriptions.viewer}</p>;
}

const roleDescriptions: Record<string, string> = {
  viewer: "Viewer can inspect monitors, results, reports, and settings but cannot change checks.",
  member: "Member can create and update monitors and run checks.",
  admin: "Admin can manage monitors, alerts, providers, groups, invites, and members.",
  owner: "Owner has full workspace control, including ownership-sensitive membership changes."
};
