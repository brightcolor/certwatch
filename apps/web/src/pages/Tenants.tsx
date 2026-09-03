import { useState } from "react";
import type { FormEvent } from "react";
import type { Team, TeamMembership, TenantInvite, TenantMembership } from "../api/client";
import { humanize } from "../utils/labels";

type TenantRole = "owner" | "admin" | "member" | "viewer";
type TeamRole = "team_owner" | "team_admin" | "team_member";

export function TenantsPage({ tenants, members, invites, teams, teamMembers, onCreateTenant, onInviteMember, onUpdateMember, onRemoveMember, onDeleteInvite, onCreateTeam, onUpdateTeam, onArchiveTeam, onAddTeamMember, onUpdateTeamMember, onRemoveTeamMember }: {
  tenants: TenantMembership[];
  members: Array<{ userId: string; email: string; role: TenantRole; status?: string; createdAt?: string }>;
  invites: TenantInvite[];
  teams: Team[];
  teamMembers: TeamMembership[];
  onCreateTenant: (name: string) => Promise<void>;
  onInviteMember: (input: { email: string; role: TenantRole; teamId?: string; teamRole?: TeamRole }) => Promise<TenantInvite | null>;
  onUpdateMember: (userId: string, data: { role?: TenantRole }) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onDeleteInvite: (inviteId: string) => Promise<void>;
  onCreateTeam: (team: { name: string; description: string; visibility: string }) => Promise<void>;
  onUpdateTeam: (id: string, team: { name: string; description: string; visibility: string; status: string }) => Promise<void>;
  onArchiveTeam: (id: string) => Promise<void>;
  onAddTeamMember: (teamId: string, email: string, role: TeamRole) => Promise<void>;
  onUpdateTeamMember: (teamId: string, userId: string, data: { role?: TeamRole; status?: string }) => Promise<void>;
  onRemoveTeamMember: (teamId: string, userId: string) => Promise<void>;
}) {
  const current = tenants.find((item) => item.tenantId === localStorage.getItem("tenantId")) ?? tenants[0];
  const [tenantName, setTenantName] = useState("");
  const [invite, setInvite] = useState<{ email: string; role: TenantRole; teamId: string; teamRole: TeamRole }>({ email: "", role: "viewer", teamId: "", teamRole: "team_member" });
  const [team, setTeam] = useState<{ id?: string; name: string; description: string; visibility: string; status: string }>({ name: "", description: "", visibility: "tenant_visible", status: "active" });
  const [teamMember, setTeamMember] = useState<{ teamId: string; email: string; role: TeamRole }>({ teamId: "", email: "", role: "team_member" });
  const [latestInvite, setLatestInvite] = useState("");

  const createTenant = async (event: FormEvent) => {
    event.preventDefault();
    if (!tenantName.trim()) return;
    await onCreateTenant(tenantName.trim());
    setTenantName("");
  };

  const inviteMember = async (event: FormEvent) => {
    event.preventDefault();
    const created = await onInviteMember({ ...invite, teamId: invite.teamId || undefined });
    setLatestInvite(created?.inviteUrl ?? "");
    setInvite({ ...invite, email: "", teamRole: "team_member" });
  };

  const saveTeam = async (event: FormEvent) => {
    event.preventDefault();
    if (!team.name.trim()) return;
    if (team.id) await onUpdateTeam(team.id, { name: team.name.trim(), description: team.description, visibility: team.visibility, status: team.status });
    else await onCreateTeam({ name: team.name.trim(), description: team.description, visibility: team.visibility });
    setTeam({ name: "", description: "", visibility: "tenant_visible", status: "active" });
  };

  const addTeamMember = async (event: FormEvent) => {
    event.preventDefault();
    const selectedTeamId = teamMember.teamId || teams[0]?.id;
    if (!selectedTeamId || !teamMember.email.trim()) return;
    await onAddTeamMember(selectedTeamId, teamMember.email.trim(), teamMember.role);
    setTeamMember({ teamId: selectedTeamId, email: "", role: "team_member" });
  };

  return (
    <section className="content">
      <div className="flow">
        <div className="panel">
          <h3>Organization</h3>
          {current ? <>
            <Info label="Name" value={current.tenant.name} />
            <Info label="Plan" value={humanize(current.tenant.plan)} />
            <Info label="Status" value={humanize(current.tenant.status)} />
            <Info label="Monitor limit" value={String(current.tenant.monitorLimit)} />
            <Info label="User limit" value={String(current.tenant.userLimit)} />
            <Info label="Your role" value={humanize(current.role)} />
          </> : <span className="muted">No organization selected.</span>}
        </div>
        <form className="panel" onSubmit={createTenant}>
          <h3>Create organization</h3>
          <p className="muted">Organizations isolate monitors, providers, settings, teams, and members.</p>
          <label>Name<input value={tenantName} onChange={(event) => setTenantName(event.target.value)} /></label>
          <button className="btn btn-primary">Create organization</button>
        </form>

        <form className="panel" onSubmit={inviteMember}>
          <h3>Invite member</h3>
          <p className="muted">Existing users are added immediately. New users receive a one-time invite link.</p>
          <label>Email<input type="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} required /></label>
          <label>Organization role<select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value as TenantRole })}>{tenantRoleOptions()}</select></label>
          <label>Initial team<select value={invite.teamId} onChange={(event) => setInvite({ ...invite, teamId: event.target.value })}>
            <option value="">No team</option>
            {teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          {invite.teamId && <label>Team role<select value={invite.teamRole} onChange={(event) => setInvite({ ...invite, teamRole: event.target.value as TeamRole })}>{teamRoleOptions()}</select></label>}
          <button className="btn btn-primary">Invite member</button>
          {latestInvite && <div className="info invite-url"><span>Invite link</span><code>{latestInvite}</code><button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => navigator.clipboard.writeText(latestInvite)}>Copy</button></div>}
        </form>
        <div className="panel">
          <h3>Organization members</h3>
          {members.map((item) => <MemberRow member={item} onSave={onUpdateMember} onRemove={onRemoveMember} key={item.userId} />)}
          {!members.length && <span className="muted">No members loaded.</span>}
        </div>

        <form className="panel" onSubmit={saveTeam}>
          <h3>{team.id ? "Edit team" : "Create team"}</h3>
          <p className="muted">Teams belong to exactly one organization. Private teams are visible only to members and organization admins.</p>
          <label>Name<input value={team.name} onChange={(event) => setTeam({ ...team, name: event.target.value })} /></label>
          <label>Description<input value={team.description} onChange={(event) => setTeam({ ...team, description: event.target.value })} /></label>
          <label>Visibility<select value={team.visibility} onChange={(event) => setTeam({ ...team, visibility: event.target.value })}><option value="tenant_visible">Organization visible</option><option value="private">Private</option></select></label>
          {team.id && <label>Status<select value={team.status} onChange={(event) => setTeam({ ...team, status: event.target.value })}><option value="active">Active</option><option value="archived">Archived</option></select></label>}
          <div className="actions"><button className="btn btn-primary">{team.id ? "Save team" : "Create team"}</button>{team.id && <button className="btn btn-outline-secondary" type="button" onClick={() => setTeam({ name: "", description: "", visibility: "tenant_visible", status: "active" })}>Cancel edit</button>}</div>
        </form>
        <div className="panel">
          <h3>Teams</h3>
          {teams.map((item) => <div className="access-group-row" key={item.id}><div><strong>{item.name}</strong><span>{humanize(item.visibility)} · {humanize(item.status)}</span></div><span className="pill na">{item.slug}</span><div className="actions end"><button className="btn btn-outline-secondary btn-sm" onClick={() => setTeam({ id: item.id, name: item.name, description: item.description, visibility: item.visibility, status: item.status })}>Edit</button><button className="btn btn-outline-secondary btn-sm" onClick={() => onArchiveTeam(item.id)}>Archive</button></div></div>)}
          {!teams.length && <span className="muted">No teams created.</span>}
        </div>

        <form className="panel" onSubmit={addTeamMember}>
          <h3>Add team member</h3>
          <label>Team<select value={teamMember.teamId || teams[0]?.id || ""} onChange={(event) => setTeamMember({ ...teamMember, teamId: event.target.value })}>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Email<input type="email" value={teamMember.email} onChange={(event) => setTeamMember({ ...teamMember, email: event.target.value })} /></label>
          <label>Team role<select value={teamMember.role} onChange={(event) => setTeamMember({ ...teamMember, role: event.target.value as TeamRole })}>{teamRoleOptions()}</select></label>
          <button className="btn btn-primary">Add to team</button>
        </form>
        <div className="panel">
          <h3>Team memberships</h3>
          {teamMembers.map((item) => <TeamMemberRow key={item.id} member={item} teams={teams} onSave={onUpdateTeamMember} onRemove={onRemoveTeamMember} />)}
          {!teamMembers.length && <span className="muted">No team members for the selected team.</span>}
        </div>
      </div>

      <div className="panel">
        <h3>Pending invites</h3>
        {invites.map((item) => (
          <div className="channel invite-row" key={item.id}>
            <strong>{item.email}</strong>
            <span>{item.role}</span>
            {item.teamId && <span>{teams.find((teamItem) => teamItem.id === item.teamId)?.name ?? "Team"} / {item.teamRole}</span>}
            <code>{item.inviteUrl || "Link only visible when the invite is created"}</code>
            {item.inviteUrl && <button className="btn btn-outline-secondary btn-sm" onClick={() => navigator.clipboard.writeText(item.inviteUrl)}>Copy</button>}
            <button className="btn btn-outline-danger" onClick={() => onDeleteInvite(item.id)}>Revoke</button>
          </div>
        ))}
        {!invites.length && <span className="muted">No pending invites.</span>}
      </div>
    </section>
  );
}

function MemberRow({ member, onSave, onRemove }: { member: { userId: string; email: string; role: TenantRole; status?: string }; onSave: (userId: string, data: { role?: TenantRole }) => Promise<void>; onRemove: (userId: string) => Promise<void> }) {
  const [role, setRole] = useState(member.role);
  return (
    <div className="member-row">
      <div><strong>{member.email}</strong><span>Status: {member.status ?? "active"}</span></div>
      <label>Organization role<select value={role} onChange={(event) => setRole(event.target.value as TenantRole)}>{tenantRoleOptions()}</select></label>
      <div className="actions end"><button className="btn btn-primary" onClick={() => onSave(member.userId, { role })}>Save</button><button className="btn btn-outline-danger" onClick={() => onRemove(member.userId)}>Remove</button></div>
    </div>
  );
}

function TeamMemberRow({ member, teams, onSave, onRemove }: { member: TeamMembership; teams: Team[]; onSave: (teamId: string, userId: string, data: { role?: TeamRole; status?: string }) => Promise<void>; onRemove: (teamId: string, userId: string) => Promise<void> }) {
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const team = teams.find((item) => item.id === member.teamId);
  return (
    <div className="member-row">
      <div><strong>{member.userEmail ?? member.userId}</strong><span>{team?.name ?? member.teamId}</span></div>
      <label>Role<select value={role} onChange={(event) => setRole(event.target.value as TeamRole)}>{teamRoleOptions()}</select></label>
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as TeamMembership["status"])}><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
      <div className="actions end"><button className="btn btn-primary" onClick={() => onSave(member.teamId, member.userId, { role, status })}>Save</button><button className="btn btn-outline-danger" onClick={() => onRemove(member.teamId, member.userId)}>Remove</button></div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return <div className="info"><span>{label}</span><strong>{value || "-"}</strong></div>;
}

const tenantRoleOptions = () => <>
  <option value="viewer">Viewer</option>
  <option value="member">Member</option>
  <option value="admin">Admin</option>
  <option value="owner">Owner</option>
</>;

const teamRoleOptions = () => <>
  <option value="team_member">Team member</option>
  <option value="team_admin">Team admin</option>
  <option value="team_owner">Team owner</option>
</>;
