import { useEffect, useRef, useState } from "react";
import { mergeTags, parseTags } from "../utils/tags";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  hint?: string;
  suggestions?: string[];
};

export function TagInput({ value, onChange, label = "Labels", placeholder = "Add label", hint, suggestions = [] }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [textMode, setTextMode] = useState(false);
  const valueRef = useRef(value);
  const text = value.join(", ");
  useEffect(() => { valueRef.current = value; }, [value]);

  const addTags = (input: string) => {
    const current = valueRef.current;
    const next = mergeTags(current, input);
    valueRef.current = next;
    if (!sameTags(current, next)) onChange(next);
    setDraft("");
  };
  const removeTag = (tag: string) => {
    const next = valueRef.current.filter((item) => item !== tag);
    valueRef.current = next;
    onChange(next);
  };
  const availableSuggestions = suggestions.filter((tag) => !valueRef.current.includes(tag)).slice(0, 8);

  if (textMode) {
    return (
      <label className="tag-field">{label}
        <textarea value={text} onChange={(event) => onChange(parseTags(event.target.value))} />
        {hint && <small className="muted">{hint}</small>}
        <div className="tag-actions"><button type="button" className="btn btn-outline-secondary" onClick={() => setTextMode(false)}>Use chips</button></div>
      </label>
    );
  }

  return (
    <label className="tag-field">{label}
      <div className="tag-input">
        {value.map((tag) => <button type="button" className="tag-chip" key={tag} title={`Remove ${tag}`} onClick={() => removeTag(tag)}>{tag}<span aria-hidden="true">x</span></button>)}
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => addTags(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
              if (!event.currentTarget.value.trim() && event.key === "Tab") return;
              event.preventDefault();
              addTags(event.currentTarget.value);
            }
            if (event.key === "Backspace" && !draft && valueRef.current.length) {
              const next = valueRef.current.slice(0, -1);
              valueRef.current = next;
              onChange(next);
            }
          }}
        />
      </div>
      {(hint || availableSuggestions.length > 0) && <div className="tag-meta">
        {hint && <small className="muted">{hint}</small>}
        {!!availableSuggestions.length && <div className="tag-suggestions">{availableSuggestions.map((tag) => <button type="button" className="tag-suggestion" key={tag} onClick={() => addTags(tag)}>{tag}</button>)}</div>}
      </div>}
      <div className="tag-actions">
        <button type="button" className="btn btn-outline-secondary" onClick={() => setTextMode(true)}>Use text</button>
        {!!value.length && <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => { valueRef.current = []; onChange([]); }}>Clear labels</button>}
      </div>
    </label>
  );
}

const sameTags = (left: string[], right: string[]) =>
  left.length === right.length && left.every((tag, index) => tag === right[index]);
