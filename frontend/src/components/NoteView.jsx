import { useState, useEffect } from "react";
import { api } from "../api";

function WikiContent({ content, notes, onNavigate }) {
  const parts = content.split(/(\[\[.+?\]\])/g);
  return (
    <div className="note-content">
      {parts.map((part, i) => {
        const match = part.match(/^\[\[(.+?)\]\]$/);
        if (match) {
          const title = match[1];
          const target = notes.find((n) => n.title === title);
          return (
            <span
              key={i}
              className="wiki-link"
              style={{ opacity: target ? 1 : 0.45 }}
              title={target ? `Open: ${title}` : `Unresolved: ${title}`}
              onClick={() => target && onNavigate(target.id)}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

export default function NoteView({ noteId, notes, onClose, onEdit, onNavigate }) {
  const [note, setNote] = useState(null);
  const [backlinks, setBacklinks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!noteId) { setNote(null); setBacklinks([]); return; }
    setLoading(true);
    api.getNote(noteId).then((n) => {
      setNote(n);
      setLoading(false);
      // Resolve backlink titles from the notes list
      const bls = (n.backlinks || [])
        .map((id) => notes.find((x) => x.id === id))
        .filter(Boolean);
      setBacklinks(bls);
    });
  }, [noteId, notes]);

  const noteType = note?.tags?.includes("moc")
    ? "moc"
    : note?.tags?.includes("doc")
    ? "doc"
    : "atomic";

  const typeLabel = { moc: "map of content", doc: "documentation", atomic: "atomic note" };
  const typeColor = { moc: "var(--amber)", doc: "var(--moss)", atomic: "var(--muted)" };

  return (
    <div className={`panel ${noteId ? "open" : ""}`}>
      {loading && (
        <div className="panel-loading">loading…</div>
      )}
      {note && !loading && (
        <>
          <div className="panel-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="panel-type" style={{ color: typeColor[noteType] }}>
                {typeLabel[noteType]}
              </div>
              <div className="panel-title">{note.title}</div>
            </div>
            <button className="btn-icon" onClick={() => onEdit(note)} title="Edit note">✎</button>
            <button className="panel-close" onClick={onClose}>✕</button>
          </div>

          <div className="panel-body">
            <div className="timestamp">
              updated {new Date(note.updated_at).toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </div>

            {note.tags?.length > 0 && (
              <div className="meta-row">
                {note.tags.map((t) => (
                  <span key={t} className="tag-pill">#{t}</span>
                ))}
              </div>
            )}

            <WikiContent
              content={note.content}
              notes={notes}
              onNavigate={onNavigate}
            />

            {backlinks.length > 0 && (
              <div className="backlinks-section">
                <div className="section-heading">
                  ← referenced by ({backlinks.length})
                </div>
                {backlinks.map((bl) => (
                  <button
                    key={bl.id}
                    className="backlink-item"
                    onClick={() => onNavigate(bl.id)}
                  >
                    {bl.title}
                  </button>
                ))}
              </div>
            )}

            {note.backlinks?.length === 0 && (
              <div className="orphan-note">
                ∅ no backlinks — this note is an orphan
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
