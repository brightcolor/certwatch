import { useState } from "react";
import { api } from "../api/client";

export function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const result = await api.request<any>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      api.setCsrf(result.csrfToken);
      onLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  };

  return (
    <main className="login">
      <form onSubmit={submit} className="login-panel">
        <span className="eyebrow">CertWatch</span>
        <h1>Sign in</h1>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
