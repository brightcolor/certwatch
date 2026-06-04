import { useState } from "react";
import type { FormEvent } from "react";

export function Profile({ user, tenants, onChangePassword, onLogout }: any) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (form.newPassword !== form.confirmPassword) return setMessage("New passwords do not match.");
    try {
      await onChangePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Password changed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password change failed.");
    }
  };

  return (
    <section className="content">
      <div className="grid two">
        <div className="panel">
          <h3>Profile</h3>
          <Info label="Email" value={user?.email} />
          <Info label="Platform role" value={user?.role} />
          <Info label="Organizations" value={(tenants ?? []).map((item: any) => `${item.tenant.name} (${item.role})`).join(", ")} />
          <div className="actions">
            <button className="btn btn-outline-danger danger" type="button" onClick={onLogout}>Log out</button>
          </div>
        </div>
        <form className="panel" onSubmit={submit}>
          <h3>Change password</h3>
          <label>Current password<input type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} required /></label>
          <label>New password<input type="password" autoComplete="new-password" minLength={12} value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} required /></label>
          <label>Repeat new password<input type="password" autoComplete="new-password" minLength={12} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required /></label>
          {message && <p className={message === "Password changed." ? "success" : "error"}>{message}</p>}
          <button className="btn btn-success success" type="submit">Save password</button>
        </form>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div className="info"><span>{label}</span><strong>{value || "-"}</strong></div>;
}
