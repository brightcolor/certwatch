import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { mergeTags, parseTags } from "../utils/tags";

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

  const addDraft = (input = inputRef.current?.value ?? draft) => {
    const next = mergeTags(value, input);
    if (next.length !== value.length) flushSync(() => onChange(next));
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
          onBlur={(event) => addDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addDraft(event.currentTarget.value);
            }
            if (event.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
        />
      </div>
      <button type="button" className="ghost" onClick={() => setTextMode(true)}>Use text</button>
    </label>
  );
}
