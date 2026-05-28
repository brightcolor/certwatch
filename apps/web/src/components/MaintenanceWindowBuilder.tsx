import { useMemo, useState } from "react";

type Props = {
  onUse: (value: string) => void;
  buttonLabel?: string;
};

export function MaintenanceWindowBuilder({ onUse, buttonLabel = "Use datetime range" }: Props) {
  const [start, setStart] = useState(defaultLocalDateTime(1));
  const [end, setEnd] = useState(defaultLocalDateTime(2));
  const value = useMemo(() => `${start}/${end}`, [start, end]);
  const valid = Boolean(start && end && new Date(start).getTime() < new Date(end).getTime());

  return (
    <div className="datetime-builder">
      <label>Start<input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} /></label>
      <label>End<input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
      <div className="datetime-preview">
        <span className="muted">Window</span>
        <code>{value}</code>
        <button type="button" className="ghost" disabled={!valid} onClick={() => onUse(value)}>{buttonLabel}</button>
      </div>
      {!valid && <span className="error">End must be after start.</span>}
    </div>
  );
}

const defaultLocalDateTime = (offsetHours: number) => {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + offsetHours);
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
};

const part = (value: number) => String(value).padStart(2, "0");
