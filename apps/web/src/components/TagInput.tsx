import { useRef, useState } from "react";

export function TagInput({ value, onChange, placeholder = "Add label and press Enter" }: { value: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const [textMode, setTextMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
    const currentDraft = inputRef.current?.value ?? draft;
    const tags = parseTags(currentDraft);
    if (tags.length) onChange([...new Set([...value, ...tags])]);
    setDraft("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <label>Labels
      <div className="tag-input">
        {value.map((tag) => <button type="button" className="tag-chip" key={tag} onClick={() => onChange(value.filter((item) => item !== tag))}>{tag}</button>)}
        <input
          ref={inputRef}
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
