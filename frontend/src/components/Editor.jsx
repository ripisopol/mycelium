import { useState, useRef, useEffect } from "react";
import { api } from "../api";

// Autocomplete [[wiki links]] while typing
function useWikiAutocomplete(content, notes, textareaRef, setContent) {
  const [suggestions, setSuggestions] = useState([]);
  const [suggestPos, setSuggestPos]   = useState({ top: 0, left: 0 });
  const [activeQuery, setActiveQuery] = useState(null);

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;
    if (e.key === "Escape") { setSuggestions([]); return; }
    if (e.key === "Tab" || e.key === "Enter") {
      if (suggestions.length > 0) {
        e.preventDefault();
        insertSuggestion(suggestions[0].title);
      }
    }
  };

  const insertSuggestion = (title) => {
    const ta = textareaRef.current;
    const before = content.slice(0, ta.selectionStart);
    const after  = content.slice(ta.selectionStart);
    const openBracket = before.lastIndexOf("[[");
    const newContent = before.slice(0, openBracket) + `[[${title}]]` + after;
    setContent(newContent);
    setSuggestions([]);
    setActiveQuery(null);
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = content.slice(0, cursor);
    const match  = before.match(/\[\[([^\]]{0,40})$/);
    if (!match) { setSuggestions([]); setActiveQuery(null); return; }

    const query = match[1].toLowerCase();
    setActiveQuery(query);
    const results = notes
      .filter((n) => n.title.toLowerCase().includes(query) && query.length > 0)
      .slice(0, 6);
    setSuggestions(results);
  }, [content, notes]);

  return { suggestions, suggestPos, insertSuggestion, handleKeyDown };
}

export default function Editor({ note, notes = [], onSave, onDelete, onCancel }) {
  const [title,   setTitle]   = useState(note?.title   ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [tags,    setTags]    = useState(note?.tags?.join(", ") ?? "");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const taRef = useRef(null);

  const { suggestions, insertSuggestion, handleKeyDown } = useWikiAutocomplete(
    content, notes, taRef, setContent
  );

  const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);

  const handleSave = async () => {
    if (!title.trim()) { setError("title is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { title: title.trim(), content, tags: parsedTags };
      if (note?.id) await api.updateNote(note.id, payload);
      else          await api.createNote(payload);
      onSave();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
    await api.deleteNote(note.id);
    onDelete(note.id);
  };

  // Cmd/Ctrl+Enter to save
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSave();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [title, content, tags]);

  return (
    <div className="editor-wrap">
      <div className="editor-topbar">
        <span className="editor-mode-label">
          {note?.id ? "editing note" : "new note"}
        </span>
        <span className="editor-shortcut">⌘↵ to save</span>
      </div>

      <input
        className="editor-field editor-title"
        placeholder="note title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />

      <div className="editor-content-wrap">
        <textarea
          ref={taRef}
          className="editor-field editor-content"
          placeholder={"write your note…\n\nuse [[note title]] to link to another note\nuse #tag in tags field below to categorize"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {suggestions.length > 0 && (
          <div className="wiki-suggestions">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="wiki-suggestion-item"
                onMouseDown={(e) => { e.preventDefault(); insertSuggestion(s.title); }}
              >
                <span className="wiki-suggestion-icon">⬡</span>
                {s.title}
              </div>
            ))}
            <div className="wiki-suggestion-hint">Tab to insert · Esc to close</div>
          </div>
        )}
      </div>

      <input
        className="editor-field editor-tags"
        placeholder="tags: zettel, moc, doc, project…"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />

      {parsedTags.length > 0 && (
        <div className="editor-tag-preview">
          {parsedTags.map((t) => (
            <span key={t} className="tag-pill">#{t}</span>
          ))}
        </div>
      )}

      {error && <div className="editor-error">{error}</div>}

      <div className="editor-actions">
        {note?.id && (
          <button className="btn btn-danger" onClick={handleDelete}>delete</button>
        )}
        <button className="btn btn-ghost" onClick={onCancel}>cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "saving…" : "save note"}
        </button>
      </div>
    </div>
  );
}
