import { useState } from "react";
import type { FormEvent } from "react";

export function UsersPage({ users, onCreate, onUpdate, onDelete }: any) {
  const [form, setForm] = useState({ email: "", password: "", role: "viewer" });
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
      setForm({ email: "", password: "", role: "viewer" });
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
        <form className="panel" onSubmit={submit}>
          <h3>Create user</h3>
          <p className="muted">Passwords must be at least 12 characters long.</p>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Password<input type="password" minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" /></label>
          <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="viewer">Viewer</option><option value="admin">Admin</option></select></label>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
          <button type="submit" disabled={saving}>{saving ? "Creating..." : "Create user"}</button>
        </form>
        <div className="panel">
          <h3>Platform users</h3>
          <p className="muted">Platform roles control instance-wide administration. Workspace roles are managed per organization on the Workspaces page.</p>
          {users.map((user: any) => <UserRow user={user} onUpdate={onUpdate} onDelete={onDelete} key={user.id} />)}
          {!users.length && <span className="muted">No users found.</span>}
        </div>
      </div>
    </section>
  );
}

function UserRow({ user, onUpdate, onDelete }: any) {
  const [role, setRole] = useState(user.role);
  const [password, setPassword] = useState("");
  return (
    <div className="member-row">
      <div>
        <strong>{user.email}</strong>
        <span>Created {user.createdAt ?? "-"}</span>
      </div>
      <label>Platform role<select value={role} onChange={(event) => setRole(event.target.value)}><option value="viewer">Viewer</option><option value="admin">Admin</option></select></label>
      <label>New password<input type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave empty to keep" /></label>
      <div className="actions end">
        <button onClick={() => { onUpdate(user.id, { role, password }); setPassword(""); }}>Save</button>
        <button onClick={() => onDelete(user.id)}>Delete</button>
      </div>
    </div>
  );
}
