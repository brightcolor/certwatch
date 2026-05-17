import { useState } from "react";

export function TagInput({ value, onChange, placeholder = "Add label and press Enter" }: { value: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const [textMode, setTextMode] = useState(false);
  const text = value.join(", ");

  if (textMode) {
    return (
      <label>Labels
        <textarea value={text} onChange={(event) => onChange(parseTags(event.target.value))} />
        <button type="button" className="ghost" onClick={() => setTextMode(false)}>Use blocks</button>
      </label>
    );
  }

  const addDraft = () => {
    const tags = parseTags(draft);
    if (tags.length) onChange([...new Set([...value, ...tags])]);
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
          onBlur={addDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addDraft();
            }
            if (event.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
        />
      </div>
      <button type="button" className="ghost" onClick={() => setTextMode(true)}>Use text</button>
    </label>
  );
}

const parseTags = (input: string) => input.split(/[,\n]/).map((tag) => tag.trim()).filter(Boolean);
