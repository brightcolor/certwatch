import { useEffect, useRef, useState } from "react";
import { mergeTags, parseTags } from "../utils/tags";

export function TagInput({ value, onChange, placeholder = "Add label and press Enter" }: { value: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const [textMode, setTextMode] = useState(false);
  const valueRef = useRef(value);
  const text = value.join(", ");
  useEffect(() => { valueRef.current = value; }, [value]);

  if (textMode) {
    return (
      <label>Labels
        <textarea value={text} onChange={(event) => onChange(parseTags(event.target.value))} />
        <button type="button" className="ghost" onClick={() => setTextMode(false)}>Use blocks</button>
      </label>
    );
  }

  const addDraft = (input = draft) => {
    const current = valueRef.current;
    const next = mergeTags(current, input);
    valueRef.current = next;
    if (!sameTags(current, next)) onChange(next);
    setDraft("");
  };

  return (
    <label>Labels
      <div className="tag-input">
        {value.map((tag) => <button type="button" className="tag-chip" key={tag} onClick={() => onChange(value.filter((item) => item !== tag))}>{tag}</button>)}
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => addDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addDraft(event.currentTarget.value);
            }
            if (event.key === "Backspace" && !draft && valueRef.current.length) {
              const next = valueRef.current.slice(0, -1);
              valueRef.current = next;
              onChange(next);
            }
          }}
        />
      </div>
      <button type="button" className="ghost" onClick={() => setTextMode(true)}>Use text</button>
    </label>
  );
}

const sameTags = (left: string[], right: string[]) =>
  left.length === right.length && left.every((tag, index) => tag === right[index]);
