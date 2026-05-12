import { useState } from "react";

export function Settings({ channels, onSave, onTest }: any) {
  const [form, setForm] = useState({ name: "", type: "webhook", enabled: true, configText: "{\n  \"url\": \"\"\n}" });
  const save = () => onSave({ name: form.name, type: form.type, enabled: form.enabled, config: JSON.parse(form.configText || "{}") });
  return (
    <section className="content">
      <div className="grid two">
        <div className="panel">
          <h3>Create Channel</h3>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="email">Email SMTP</option><option value="pushover">Pushover</option><option value="webhook">Webhook</option><option value="discord">Discord</option><option value="slack">Slack</option><option value="telegram">Telegram</option><option value="gotify">Gotify</option><option value="ntfy">ntfy.sh</option></select></label>
          <label>Config JSON<textarea value={form.configText} onChange={(e) => setForm({ ...form, configText: e.target.value })} /></label>
          <button onClick={save}>Save channel</button>
        </div>
        <div className="panel">
          <h3>Configured Channels</h3>
          {channels.map((channel: any) => <div className="channel" key={channel.id}><strong>{channel.name}</strong><span>{channel.type}</span><button onClick={() => onTest(channel.id)}>Test</button></div>)}
        </div>
      </div>
    </section>
  );
}
