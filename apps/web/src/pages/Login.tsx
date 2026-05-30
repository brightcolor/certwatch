import { useState } from "react";
import { api } from "../api/client";

export function Login({ setupRequired, onLogin }: { setupRequired: boolean; onLogin: (result: any) => void }) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (setupRequired && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      const result = await api.request<any>(setupRequired ? "/auth/setup" : "/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      api.setCsrf(result.csrfToken);
      onLogin(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  };

  return (
    <main className="login">
      <form onSubmit={submit} className="login-panel">
        <span className="eyebrow">crt.watch</span>
        <h1>{setupRequired ? "Create admin" : "Sign in"}</h1>
        {setupRequired && <p className="muted">Create the first administrator account for this crt.watch instance.</p>}
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {setupRequired && <label>Confirm password<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>}
        {error && <p className="error">{error}</p>}
        <button type="submit">{setupRequired ? "Create admin" : "Sign in"}</button>
      </form>
    </main>
  );
}
