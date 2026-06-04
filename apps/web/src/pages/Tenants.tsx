import { useState } from "react";
import type { Team, TeamMembership, TenantGroup, TenantInvite, TenantMembership } from "../api/client";

export function TenantsPage({ tenants, members, invites, groups, teams, teamMembers, onCreateTenant, onInviteMember, onUpdateMember, onRemoveMember, onDeleteInvite, onSaveGroup, onDeleteGroup, onCreateTeam, onUpdateTeam, onArchiveTeam, onAddTeamMember, onUpdateTeamMember, onRemoveTeamMember }: {
  tenants: TenantMembership[];
  members: any[];
  invites: TenantInvite[];
  groups: TenantGroup[];
  teams: Team[];
  teamMembers: TeamMembership[];
  onCreateTenant: (name: string) => Promise<void>;
  onInviteMember: (input: { email: string; role: string; teamId?: string; teamRole?: string }) => Promise<TenantInvite | null>;
  onUpdateMember: (userId: string, data: { role?: string; groupIds?: string[] }) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onDeleteInvite: (inviteId: string) => Promise<void>;
  onSaveGroup: (group: { id?: string; name: string; role: string; memberIds: string[] }) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onCreateTeam: (team: { name: string; description: string; visibility: string }) => Promise<void>;
  onUpdateTeam: (id: string, team: { name: string; description: string; visibility: string; status: string }) => Promise<void>;
  onArchiveTeam: (id: string) => Promise<void>;
  onAddTeamMember: (teamId: string, email: string, role: string) => Promise<void>;
  onUpdateTeamMember: (teamId: string, userId: string, data: { role?: string; status?: string }) => Promise<void>;
  onRemoveTeamMember: (teamId: string, userId: string) => Promise<void>;
}) {
  const current = tenants.find((item) => item.tenantId === localStorage.getItem("tenantId")) ?? tenants[0];
  const [tenantName, setTenantName] = useState("");
  const [member, setMember] = useState({ email: "", role: "viewer", teamId: "", teamRole: "team_member" });
  const [group, setGroup] = useState<{ id?: string; name: string; role: string; memberIds: string[] }>({ name: "", role: "viewer", memberIds: [] });
  const [team, setTeam] = useState<{ id?: string; name: string; description: string; visibility: string; status: string }>({ name: "", description: "", visibility: "tenant_visible", status: "active" });
  const [teamMember, setTeamMember] = useState({ teamId: "", email: "", role: "team_member" });
  const [latestInvite, setLatestInvite] = useState("");

  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const invite = await onInviteMember(member);
    setLatestInvite(invite?.inviteUrl ?? "");
    setMember({ email: "", role: "viewer", teamId: member.teamId, teamRole: "team_member" });
  };
  const saveTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!team.name.trim()) return;
    if (team.id) await onUpdateTeam(team.id, { name: team.name.trim(), description: team.description, visibility: team.visibility, status: team.status });
    else await onCreateTeam({ name: team.name.trim(), description: team.description, visibility: team.visibility });
    setTeam({ name: "", description: "", visibility: "tenant_visible", status: "active" });
  };
  const addTeamMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedTeamId = teamMember.teamId || teams[0]?.id;
    if (!selectedTeamId || !teamMember.email.trim()) return;
    await onAddTeamMember(selectedTeamId, teamMember.email, teamMember.role);
    setTeamMember({ teamId: selectedTeamId, email: "", role: "team_member" });
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
          <label>Initial team<select value={member.teamId} onChange={(event) => setMember({ ...member, teamId: event.target.value })}>
            <option value="">No team</option>
            {teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          {member.teamId && <label>Team role<select value={member.teamRole} onChange={(event) => setMember({ ...member, teamRole: event.target.value })}>
            <option value="team_member">Team member</option>
            <option value="team_admin">Team admin</option>
            <option value="team_owner">Team owner</option>
          </select></label>}
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
        <form className="panel" onSubmit={saveTeam}>
          <h3>{team.id ? "Edit team" : "Create team"}</h3>
          <p className="muted">Teams live inside the current workspace. Private teams are visible only to members and workspace admins.</p>
          <label>Name<input value={team.name} onChange={(event) => setTeam({ ...team, name: event.target.value })} /></label>
          <label>Description<input value={team.description} onChange={(event) => setTeam({ ...team, description: event.target.value })} /></label>
          <label>Visibility<select value={team.visibility} onChange={(event) => setTeam({ ...team, visibility: event.target.value })}><option value="tenant_visible">Workspace visible</option><option value="private">Private</option></select></label>
          {team.id && <label>Status<select value={team.status} onChange={(event) => setTeam({ ...team, status: event.target.value })}><option value="active">Active</option><option value="archived">Archived</option></select></label>}
          <div className="actions"><button className="success">{team.id ? "Save team" : "Create team"}</button>{team.id && <button className="danger" type="button" onClick={() => setTeam({ name: "", description: "", visibility: "tenant_visible", status: "active" })}>Cancel edit</button>}</div>
        </form>
        <div className="panel">
          <h3>Teams</h3>
          {teams.map((item) => <div className="access-group-row" key={item.id}><div><strong>{item.name}</strong><span>{item.visibility} - {item.status}</span></div><span className={`role-pill role-${item.status === "active" ? "member" : "viewer"}`}>{item.slug}</span><div className="actions end"><button onClick={() => setTeam({ id: item.id, name: item.name, description: item.description, visibility: item.visibility, status: item.status })}>Edit</button><button className="danger" onClick={() => onArchiveTeam(item.id)}>Archive</button></div></div>)}
          {!teams.length && <span className="muted">No teams created.</span>}
        </div>
      </div>
      <div className="grid two">
        <form className="panel" onSubmit={addTeamMember}>
          <h3>Add team member</h3>
          <label>Team<select value={teamMember.teamId || teams[0]?.id || ""} onChange={(event) => setTeamMember({ ...teamMember, teamId: event.target.value })}>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Email<input type="email" value={teamMember.email} onChange={(event) => setTeamMember({ ...teamMember, email: event.target.value })} /></label>
          <label>Team role<select value={teamMember.role} onChange={(event) => setTeamMember({ ...teamMember, role: event.target.value })}><option value="team_member">Team member</option><option value="team_admin">Team admin</option><option value="team_owner">Team owner</option></select></label>
          <button className="success">Add to team</button>
        </form>
        <div className="panel">
          <h3>Team memberships</h3>
          {teamMembers.map((item) => <TeamMemberRow key={item.id} member={item} teams={teams} onSave={onUpdateTeamMember} onRemove={onRemoveTeamMember} />)}
          {!teamMembers.length && <span className="muted">No team members for the selected team.</span>}
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
            {invite.teamId && <span>{teams.find((item) => item.id === invite.teamId)?.name ?? "Team"} / {invite.teamRole}</span>}
            <code>{invite.inviteUrl || "Link only visible when the invite is created"}</code>
            {invite.inviteUrl && <button onClick={() => navigator.clipboard.writeText(invite.inviteUrl)}>Copy</button>}
            <button className="danger" onClick={() => onDeleteInvite(invite.id)}>Revoke</button>
          </div>
        ))}
        {!invites.length && <span className="muted">No pending invites.</span>}
      </div>
    </section>
  );
}

function TeamMemberRow({ member, teams, onSave, onRemove }: { member: TeamMembership; teams: Team[]; onSave: (teamId: string, userId: string, data: { role?: string; status?: string }) => Promise<void>; onRemove: (teamId: string, userId: string) => Promise<void> }) {
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const team = teams.find((item) => item.id === member.teamId);
  return (
    <div className="member-row">
      <div><strong>{member.userEmail ?? member.userId}</strong><span>{team?.name ?? member.teamId}</span></div>
      <label>Role<select value={role} onChange={(event) => setRole(event.target.value as TeamMembership["role"])}><option value="team_member">Team member</option><option value="team_admin">Team admin</option><option value="team_owner">Team owner</option></select></label>
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as TeamMembership["status"])}><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
      <div className="actions end"><button className="success" onClick={() => onSave(member.teamId, member.userId, { role, status })}>Save</button><button className="danger" onClick={() => onRemove(member.teamId, member.userId)}>Remove</button></div>
    </div>
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
