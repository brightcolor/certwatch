import { useState } from "react";

export function UsersPage({ users, onCreate, onDelete }: any) {
  const [form, setForm] = useState({ email: "", password: "", role: "viewer" });
  return (
    <section className="content">
      <div className="grid two">
        <div className="panel">
          <h3>Create user</h3>
          <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="viewer">Viewer</option><option value="admin">Admin</option></select></label>
          <button onClick={async () => { await onCreate(form); setForm({ email: "", password: "", role: "viewer" }); }}>Create user</button>
        </div>
        <div className="panel">
          <h3>Existing users</h3>
          {users.map((user: any) => <div className="channel" key={user.id}><strong>{user.email}</strong><span>{user.role}</span><button onClick={() => onDelete(user.id)}>Delete</button></div>)}
        </div>
      </div>
    </section>
  );
}
