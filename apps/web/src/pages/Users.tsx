import { useState } from "react";
import type { FormEvent } from "react";

export function UsersPage({ users, currentUser, platformSettings, onSavePlatformSettings, onCreate, onUpdate, onDelete, onImpersonate }: any) {
  const [form, setForm] = useState({ email: "", password: "", role: "viewer", workspaceRole: "viewer" });
  const [settings, setSettings] = useState(platformSettings ?? { publicRegistrationEnabled: true });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const email = form.email.trim();
    if (!email) return setError("Email is required.");
    if (form.password.length < 12) return setError("Password must be at least 12 characters long.");
    setSaving(true);
    try {
      await onCreate({ ...form, email });
      setForm({ email: "", password: "", role: "viewer", workspaceRole: "viewer" });
      setMessage("User created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "User could not be created.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="content">
      <div className="grid two">
        <div className="panel">
          <h3>Registration</h3>
          <p className="muted">This controls public self-signup. Invite links still work when public registration is disabled.</p>
          <label><input type="checkbox" checked={settings.publicRegistrationEnabled} onChange={(event) => setSettings({ ...settings, publicRegistrationEnabled: event.target.checked })} /> Allow public organization registration</label>
          <button onClick={async () => { await onSavePlatformSettings(settings); setMessage("Registration settings saved."); }}>Save registration settings</button>
        </div>
        <form className="panel" onSubmit={submit}>
          <h3>Create user</h3>
          <p className="muted">Super admins manage the instance. Workspace rights are still assigned per organization.</p>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Password<input type="password" minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" /></label>
          <label>Platform role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{platformRoleOptions()}</select></label>
          <label>Current workspace role<select value={form.workspaceRole} onChange={(e) => setForm({ ...form, workspaceRole: e.target.value })}>{workspaceRoleOptions()}</select></label>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
          <button type="submit" disabled={saving}>{saving ? "Creating..." : "Create user"}</button>
        </form>
        <div className="panel">
          <h3>Platform users</h3>
          <p className="muted">Use impersonation only for support and troubleshooting. The yellow header button returns to your own account.</p>
          {users.map((user: any) => <UserRow user={user} currentUser={currentUser} onUpdate={onUpdate} onDelete={onDelete} onImpersonate={onImpersonate} key={user.id} />)}
          {!users.length && <span className="muted">No users found.</span>}
        </div>
      </div>
    </section>
  );
}

function UserRow({ user, currentUser, onUpdate, onDelete, onImpersonate }: any) {
  const [role, setRole] = useState(user.role);
  const [password, setPassword] = useState("");
  const self = currentUser?.id === user.id;
  return (
    <div className="member-row">
      <div>
        <strong>{user.email}</strong>
        <span>Created {user.createdAt ?? "-"}</span>
      </div>
      <label>Platform role<select value={role} onChange={(event) => setRole(event.target.value)}>{platformRoleOptions()}</select></label>
      <label>New password<input type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave empty to keep" /></label>
      <div className="actions end">
        <button onClick={() => { onUpdate(user.id, { role, password }); setPassword(""); }}>Save</button>
        <button disabled={self} onClick={() => onImpersonate(user.id)}>Impersonate</button>
        <button disabled={self} onClick={() => onDelete(user.id)}>Delete</button>
      </div>
    </div>
  );
}

const platformRoleOptions = () => <>
  <option value="viewer">Viewer</option>
  <option value="admin">Admin</option>
  <option value="super_admin">Super admin</option>
</>;

const workspaceRoleOptions = () => <>
  <option value="viewer">Viewer</option>
  <option value="member">Member</option>
  <option value="admin">Admin</option>
  <option value="owner">Owner</option>
</>;
