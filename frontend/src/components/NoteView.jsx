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

function VersionHistory({ noteId, onRestored }) {
  const [versions,  setVersions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    api.listVersions(noteId)
      .then(v => { setVersions(v); setLoading(false); })
      .catch(() => setLoading(false));
  }, [noteId]);

  const handleRestore = async (verId) => {
    if (!confirm("Restore this version? Current content will be saved as a version.")) return;
    setRestoring(verId);
    try {
      const restored = await api.restoreVersion(noteId, verId);
      onRestored(restored);
    } finally {
      setRestoring(null);
    }
  };

  if (loading) return <div className="versions-empty">loading…</div>;
  if (!versions.length) return <div className="versions-empty">no previous versions yet</div>;

  return (
    <div>
      {versions.map(v => (
        <div key={v.id} className="version-item">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="version-meta">
              {new Date(v.saved_at).toLocaleString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit"
              })}
            </div>
            <div className="version-preview">{v.preview}…</div>
          </div>
          <button
            className="version-restore-btn"
            disabled={restoring === v.id}
            onClick={() => handleRestore(v.id)}
          >
            {restoring === v.id ? "…" : "restore"}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function NoteView({ noteId, notes, onClose, onEdit, onNavigate, onTagClick }) {
  const [note,         setNote]         = useState(null);
  const [backlinks,    setBacklinks]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    if (!noteId) { setNote(null); setBacklinks([]); setShowVersions(false); return; }
    setLoading(true);
    setShowVersions(false);
    api.getNote(noteId).then((n) => {
      setNote(n);
      setLoading(false);
      const bls = (n.backlinks || [])
        .map((id) => notes.find((x) => x.id === id))
        .filter(Boolean);
      setBacklinks(bls);
    });
  }, [noteId, notes]);

  const handleRestored = (restoredNote) => {
    setNote(restoredNote);
    setShowVersions(false);
    const bls = (restoredNote.backlinks || [])
      .map((id) => notes.find((x) => x.id === id))
      .filter(Boolean);
    setBacklinks(bls);
  };

  const noteType = note?.tags?.includes("moc")
    ? "moc"
    : note?.tags?.includes("doc")
    ? "doc"
    : "atomic";

  const typeLabel = { moc: "map of content", doc: "documentation", atomic: "atomic note" };
  const typeColor = { moc: "var(--amber)", doc: "var(--moss)", atomic: "var(--muted)" };

  return (
    <div className={`panel ${noteId ? "open" : ""}`}>
      {loading && <div className="panel-loading">loading…</div>}
      {note && !loading && (
        <>
          <div className="panel-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="panel-type" style={{ color: typeColor[noteType] }}>
                {typeLabel[noteType]}
              </div>
              <div className="panel-title">{note.title}</div>
            </div>
            <button
              className="btn-icon"
              title="Version history"
              style={{ color: showVersions ? "var(--accent)" : undefined }}
              onClick={() => setShowVersions(v => !v)}
            >
              ⟳
            </button>
            <button className="btn-icon" onClick={() => onEdit(note)} title="Edit note">✎</button>
            <button className="panel-close" onClick={onClose}>✕</button>
          </div>

          <div className="panel-body">
            {showVersions ? (
              <div className="versions-section">
                <div className="section-heading">version history</div>
                <VersionHistory noteId={noteId} onRestored={handleRestored} />
              </div>
            ) : (
              <>
                <div className="timestamp">
                  updated {new Date(note.updated_at).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </div>

                {note.tags?.length > 0 && (
                  <div className="meta-row">
                    {note.tags.map((t) => (
                      <span
                        key={t}
                        className="tag-pill"
                        onClick={() => onTagClick && onTagClick(t)}
                        title={`Filter by #${t}`}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                <WikiContent content={note.content} notes={notes} onNavigate={onNavigate} />

                {backlinks.length > 0 && (
                  <div className="backlinks-section">
                    <div className="section-heading">← referenced by ({backlinks.length})</div>
                    {backlinks.map((bl) => (
                      <button key={bl.id} className="backlink-item" onClick={() => onNavigate(bl.id)}>
                        {bl.title}
                      </button>
                    ))}
                  </div>
                )}

                {note.backlinks?.length === 0 && (
                  <div className="orphan-note">∅ no backlinks — this note is an orphan</div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}