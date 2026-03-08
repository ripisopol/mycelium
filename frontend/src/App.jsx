import { useState, useEffect, useCallback } from "react";
import Graph    from "./components/Graph";
import NoteView from "./components/NoteView";
import Editor   from "./components/Editor";
import { api }  from "./api";

// v5
document.title = "mycelium.kb";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #080a09;
    --bg2:       #0d110f;
    --bg3:       #131810;
    --border:    #1e2820;
    --muted:     #3a4a3e;
    --text:      #c8d5c0;
    --text2:     #7a9080;
    --accent:    #5ecba1;
    --amber:     #c9934a;
    --moss:      #7aab6a;
    --danger:    #c96a5e;
    --glow:      rgba(94,203,161,0.15);
    --font-mono: 'DM Mono', monospace;
    --font-body: 'Cormorant Garamond', serif;
    --bottom-nav-h: 0px;
  }

  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); font-size: 16px; line-height: 1.7; }

  /* ── Desktop shell ── */
  .shell { display: grid; grid-template-columns: 220px 1fr; grid-template-rows: 48px 1fr; height: 100vh; width: 100vw; }

  .topbar { grid-column: 1 / -1; display: flex; align-items: center; gap: 14px; padding: 0 18px; border-bottom: 1px solid var(--border); background: var(--bg); z-index: 10; }
  .topbar-logo { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.15em; color: var(--accent); cursor: pointer; }
  .topbar-logo span { color: var(--muted); }
  .topbar-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
  .menu-btn { display: none; background: none; border: none; color: var(--text2); font-size: 18px; cursor: pointer; padding: 4px 8px; }

  /* Search */
  .search-wrap { flex: 1; max-width: 340px; position: relative; }
  .search-input { width: 100%; background: var(--bg2); border: 1px solid var(--border); border-radius: 3px; padding: 5px 10px 5px 26px; font-family: var(--font-mono); font-size: 11px; color: var(--text); outline: none; transition: border-color 0.2s; }
  .search-input:focus { border-color: var(--muted); }
  .search-icon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 12px; pointer-events: none; }
  .search-results { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--bg2); border: 1px solid var(--border); border-radius: 3px; z-index: 200; overflow: hidden; max-height: 60vh; overflow-y: auto; }
  .search-result-item { padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.12s; }
  .search-result-item:last-child { border-bottom: none; }
  .search-result-item:hover { background: var(--bg3); }
  .search-result-title { font-family: var(--font-mono); font-size: 11px; color: var(--text); }
  .search-result-excerpt { font-family: var(--font-mono); font-size: 10px; color: var(--text2); margin-top: 2px; }
  .search-result-excerpt mark { background: none; color: var(--accent); font-style: normal; }

  /* Sidebar */
  .sidebar { border-right: 1px solid var(--border); background: var(--bg); overflow-y: auto; padding: 10px 0; }
  .sidebar::-webkit-scrollbar { width: 3px; }
  .sidebar::-webkit-scrollbar-thumb { background: var(--border); }
  .sidebar-section { padding: 0 14px; margin-bottom: 4px; }
  .sidebar-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.2em; color: var(--muted); text-transform: uppercase; padding: 8px 0 4px; }
  .sidebar-item { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 3px; cursor: pointer; font-family: var(--font-mono); font-size: 11px; color: var(--text2); transition: all 0.12s; border: none; background: none; width: 100%; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-item:hover { background: var(--bg3); color: var(--text); }
  .sidebar-item.active { background: var(--bg3); color: var(--accent); }
  .sidebar-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
  .sidebar-item.active .sidebar-dot { background: var(--accent); }

  /* Tag filter */
  .tag-filter-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-family: var(--font-mono); font-size: 10px; color: var(--text2); transition: all 0.12s; border: none; background: none; width: 100%; text-align: left; }
  .tag-filter-item:hover { background: var(--bg3); color: var(--moss); }
  .tag-filter-item.active { background: var(--bg3); color: var(--moss); }
  .tag-filter-count { font-size: 9px; color: var(--muted); }
  .tag-filter-active-bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; font-family: var(--font-mono); font-size: 9px; color: var(--moss); }
  .tag-clear-btn { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 10px; padding: 0; }
  .tag-clear-btn:hover { color: var(--danger); }

  /* Main */
  .main { position: relative; overflow: hidden; background: var(--bg); }

  /* Graph */
  .graph-container { width: 100%; height: 100%; position: relative; }
  .graph-svg { width: 100%; height: 100%; cursor: grab; display: block; }
  .graph-svg:active { cursor: grabbing; }
  .graph-hint { position: absolute; bottom: 14px; left: 14px; font-family: var(--font-mono); font-size: 10px; color: var(--muted); pointer-events: none; }

  /* Panel */
  .panel { position: absolute; top: 0; right: 0; width: 460px; height: 100%; background: var(--bg); border-left: 1px solid var(--border); display: flex; flex-direction: column; transform: translateX(100%); transition: transform 0.25s cubic-bezier(0.16,1,0.3,1); z-index: 20; }
  .panel.open { transform: translateX(0); }
  .panel-loading { padding: 24px; font-family: var(--font-mono); font-size: 11px; color: var(--muted); }
  .panel-header { padding: 14px 16px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; gap: 10px; }
  .panel-type { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 3px; }
  .panel-title { font-family: var(--font-mono); font-size: 13px; color: var(--text); font-weight: 500; line-height: 1.3; }
  .panel-close { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 15px; padding: 0; line-height: 1; transition: color 0.12s; flex-shrink: 0; margin-top: 2px; }
  .panel-close:hover { color: var(--text); }
  .panel-body { flex: 1; overflow-y: auto; padding: 18px 20px; }
  .panel-body::-webkit-scrollbar { width: 3px; }
  .panel-body::-webkit-scrollbar-thumb { background: var(--border); }

  /* Note content */
  .note-content { font-family: var(--font-body); font-size: 16px; line-height: 1.85; color: var(--text); white-space: pre-wrap; word-break: break-word; }
  .wiki-link { color: var(--accent); cursor: pointer; border-bottom: 1px solid transparent; transition: border-color 0.12s; }
  .wiki-link:hover { border-bottom-color: var(--accent); }
  .timestamp { font-family: var(--font-mono); font-size: 10px; color: var(--muted); margin-bottom: 12px; }
  .meta-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 14px; }
  .tag-pill { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--border); color: var(--moss); cursor: pointer; transition: all 0.12s; }
  .tag-pill:hover { border-color: var(--moss); background: var(--bg2); }
  .backlinks-section { margin-top: 28px; }
  .section-heading { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.2em; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
  .backlink-item { display: flex; align-items: center; gap: 8px; padding: 5px 0; cursor: pointer; font-family: var(--font-mono); font-size: 11px; color: var(--text2); border: none; background: none; width: 100%; text-align: left; transition: color 0.12s; }
  .backlink-item:hover { color: var(--accent); }
  .orphan-note { margin-top: 28px; font-family: var(--font-mono); font-size: 10px; color: var(--muted); font-style: italic; }

  /* Version history */
  .versions-section { margin-top: 28px; }
  .version-item { padding: 8px 0; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .version-item:last-child { border-bottom: none; }
  .version-meta { font-family: var(--font-mono); font-size: 10px; color: var(--muted); margin-bottom: 2px; }
  .version-preview { font-family: var(--font-mono); font-size: 10px; color: var(--text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
  .version-restore-btn { font-family: var(--font-mono); font-size: 9px; color: var(--accent); background: none; border: 1px solid var(--border); border-radius: 3px; padding: 2px 7px; cursor: pointer; white-space: nowrap; transition: all 0.12s; flex-shrink: 0; }
  .version-restore-btn:hover { border-color: var(--accent); background: var(--glow); }
  .versions-empty { font-family: var(--font-mono); font-size: 10px; color: var(--muted); font-style: italic; }

  /* Editor */
  .editor-wrap { display: flex; flex-direction: column; height: 100%; padding: 20px; gap: 10px; }
  .editor-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
  .editor-mode-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.2em; color: var(--muted); text-transform: uppercase; }
  .editor-shortcut { font-family: var(--font-mono); font-size: 10px; color: var(--muted); }
  .editor-field { background: var(--bg2); border: 1px solid var(--border); border-radius: 3px; padding: 9px 12px; font-family: var(--font-mono); font-size: 12px; color: var(--text); outline: none; transition: border-color 0.18s; resize: none; }
  .editor-field:focus { border-color: var(--accent); }
  .editor-title { font-size: 13px; }
  .editor-content-wrap { flex: 1; position: relative; display: flex; flex-direction: column; }
  .editor-content { flex: 1; font-family: var(--font-body); font-size: 15px; line-height: 1.75; }
  .editor-tags { font-size: 11px; }
  .editor-tag-preview { display: flex; flex-wrap: wrap; gap: 5px; }
  .editor-error { font-family: var(--font-mono); font-size: 11px; color: var(--danger); padding: 6px 0; }
  .editor-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }

  /* Wiki autocomplete */
  .wiki-suggestions { position: absolute; bottom: calc(100% + 4px); left: 0; right: 0; background: var(--bg2); border: 1px solid var(--border); border-radius: 3px; z-index: 50; overflow: hidden; }
  .wiki-suggestion-item { display: flex; align-items: center; gap: 8px; padding: 7px 12px; cursor: pointer; font-family: var(--font-mono); font-size: 11px; color: var(--text2); transition: background 0.1s; }
  .wiki-suggestion-item:hover { background: var(--bg3); color: var(--accent); }
  .wiki-suggestion-icon { font-size: 9px; color: var(--muted); }
  .wiki-suggestion-hint { padding: 4px 12px; font-family: var(--font-mono); font-size: 9px; color: var(--muted); border-top: 1px solid var(--border); }

  /* Buttons */
  .btn { font-family: var(--font-mono); font-size: 11px; padding: 6px 14px; border-radius: 3px; border: 1px solid var(--border); cursor: pointer; transition: all 0.12s; letter-spacing: 0.04em; }
  .btn-ghost { background: none; color: var(--text2); }
  .btn-ghost:hover { border-color: var(--muted); color: var(--text); }
  .btn-primary { background: var(--accent); color: var(--bg); border-color: var(--accent); font-weight: 500; }
  .btn-primary:hover { opacity: 0.85; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-danger { background: none; color: var(--danger); border-color: var(--danger); }
  .btn-danger:hover { background: var(--danger); color: var(--bg); }
  .btn-icon { background: none; border: 1px solid var(--border); color: var(--text2); padding: 4px 9px; border-radius: 3px; cursor: pointer; font-size: 13px; transition: all 0.12s; }
  .btn-icon:hover { border-color: var(--muted); color: var(--text); }

  /* View toggle */
  .view-toggle { display: flex; border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
  .view-toggle-btn { background: none; border: none; padding: 4px 10px; font-family: var(--font-mono); font-size: 10px; color: var(--muted); cursor: pointer; transition: all 0.12s; letter-spacing: 0.04em; }
  .view-toggle-btn.active { background: var(--bg3); color: var(--accent); }
  .view-toggle-btn:hover:not(.active) { color: var(--text); }

  /* List view */
  .list-view { padding: 22px; overflow-y: auto; height: 100%; }
  .list-view::-webkit-scrollbar { width: 3px; }
  .list-view::-webkit-scrollbar-thumb { background: var(--border); }
  .list-header { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.15em; color: var(--muted); text-transform: uppercase; margin-bottom: 14px; }
  .list-note-item { padding: 11px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
  .list-note-item:hover .list-note-title { color: var(--accent); }
  .list-note-title { font-family: var(--font-mono); font-size: 12px; color: var(--text); margin-bottom: 3px; transition: color 0.12s; }
  .list-note-meta { font-family: var(--font-mono); font-size: 10px; color: var(--muted); }

  /* Empty state */
  .empty-state { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; pointer-events: none; }
  .empty-glyph { font-size: 44px; opacity: 0.07; font-family: var(--font-mono); }
  .empty-text { font-family: var(--font-mono); font-size: 11px; color: var(--muted); letter-spacing: 0.1em; }

  /* Bottom nav (mobile only) */
  .bottom-nav { display: none; }

  /* Sidebar overlay (mobile) */
  .sidebar-overlay { display: none; }

  /* ── Mobile ── */
  @media (max-width: 640px) {
    :root { --bottom-nav-h: 56px; }

    .shell {
      grid-template-columns: 1fr;
      grid-template-rows: 48px 1fr var(--bottom-nav-h);
    }

    .menu-btn { display: block; }

    /* Hide view toggle and new button from topbar on mobile */
    .topbar-actions .view-toggle { display: none; }
    .topbar-actions .btn-primary { display: none; }

    /* Sidebar becomes a drawer */
    .sidebar {
      position: fixed;
      top: 48px;
      left: 0;
      width: 80vw;
      max-width: 280px;
      height: calc(100vh - 48px - var(--bottom-nav-h));
      z-index: 100;
      transform: translateX(-100%);
      transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
      border-right: 1px solid var(--border);
    }
    .sidebar.open { transform: translateX(0); }

    /* Overlay behind sidebar */
    .sidebar-overlay {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 99;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s;
    }
    .sidebar-overlay.visible { opacity: 1; pointer-events: all; }

    /* Main takes full column */
    .main { grid-column: 1; }

    /* Panel becomes full screen */
    .panel { width: 100%; border-left: none; }

    /* Bottom nav bar */
    .bottom-nav {
      display: flex;
      align-items: center;
      justify-content: space-around;
      border-top: 1px solid var(--border);
      background: var(--bg);
      height: var(--bottom-nav-h);
      z-index: 10;
      grid-column: 1;
    }
    .bottom-nav-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      background: none;
      border: none;
      color: var(--muted);
      font-family: var(--font-mono);
      font-size: 9px;
      letter-spacing: 0.08em;
      cursor: pointer;
      padding: 8px 0;
      transition: color 0.12s;
      height: 100%;
    }
    .bottom-nav-btn.active { color: var(--accent); }
    .bottom-nav-btn-icon { font-size: 18px; line-height: 1; }

    /* Editor full screen on mobile */
    .editor-wrap { padding: 14px; padding-bottom: calc(14px + var(--bottom-nav-h)); }

    /* Search takes more space on mobile */
    .search-wrap { max-width: none; flex: 1; }
  }
`;

// ── SearchBar ───────────────────────────────────────────────────────────────
function SearchBar({ onSelect }) {
  const [q,       setQ]       = useState("");
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(() =>
      api.search(q).then(r => { setResults(r); setOpen(r.length > 0); }), 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e) => { if (!e.target.closest(".search-wrap")) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="search-wrap">
      <span className="search-icon">⌕</span>
      <input
        className="search-input"
        placeholder="search notes…"
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && (
        <div className="search-results">
          {results.map(r => (
            <div key={r.id} className="search-result-item"
              onClick={() => { onSelect(r.id); setQ(""); setOpen(false); }}>
              <div className="search-result-title">{r.title}</div>
              <div className="search-result-excerpt"
                dangerouslySetInnerHTML={{ __html: r.excerpt }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ListView ────────────────────────────────────────────────────────────────
function ListView({ notes, activeId, onSelect }) {
  return (
    <div className="list-view">
      <div className="list-header">{notes.length} notes</div>
      {notes.map(n => (
        <div key={n.id} className="list-note-item" onClick={() => onSelect(n.id)}>
          <div className="list-note-title"
            style={{ color: n.id === activeId ? "var(--accent)" : undefined }}>
            {n.title}
          </div>
          <div className="list-note-meta">
            {new Date(n.updated_at).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SidebarContent ──────────────────────────────────────────────────────────
function SidebarContent({ notes, tags, activeId, activeTag, onOpenNote, onTagClick, onClearTag, onClose }) {
  return (
    <>
      {activeTag && (
        <div className="sidebar-section">
          <div className="tag-filter-active-bar">
            <span>#{activeTag}</span>
            <button className="tag-clear-btn" onClick={() => { onClearTag(); onClose?.(); }}>✕</button>
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-label">recent</div>
        {notes.slice(0, 10).map(n => (
          <button key={n.id}
            className={`sidebar-item ${n.id === activeId ? "active" : ""}`}
            onClick={() => { onOpenNote(n.id); onClose?.(); }}>
            <span className="sidebar-dot" />
            {n.title}
          </button>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-label">tags</div>
          {tags.map(t => (
            <button key={t.name}
              className={`tag-filter-item ${activeTag === t.name ? "active" : ""}`}
              onClick={() => { onTagClick(t.name); onClose?.(); }}>
              <span>#{t.name}</span>
              <span className="tag-filter-count">{t.count}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [notes,       setNotes]       = useState([]);
  const [graph,       setGraph]       = useState(null);
  const [activeId,    setActiveId]    = useState(null);
  const [view,        setView]        = useState("graph");
  const [mode,        setMode]        = useState("view");
  const [editNote,    setEditNote]    = useState(null);
  const [tags,        setTags]        = useState([]);
  const [activeTag,   setActiveTag]   = useState(null);
  const [tagNotes,    setTagNotes]    = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const reload = useCallback(async () => {
    const [n, g, t] = await Promise.all([api.listNotes(), api.getGraph(), api.listTags()]);
    setNotes(n);
    setGraph(g);
    setTags(t);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const openNote = (id) => {
    setActiveId(id);
    setMode("view");
    setSidebarOpen(false);
  };

  const openEditor = (note = null) => {
    setEditNote(note);
    setMode(note ? "edit" : "new");
    setSidebarOpen(false);
  };

  const handleSave = () => {
    reload();
    setMode("view");
    setEditNote(null);
  };

  const handleDelete = async (id) => {
    await api.deleteNote(id);
    setActiveId(null);
    setMode("view");
    reload();
  };

  const handleTagClick = async (tagName) => {
    if (activeTag === tagName) {
      setActiveTag(null);
      setTagNotes(null);
      return;
    }
    setActiveTag(tagName);
    setView("list");
    const results = await api.notesByTag(tagName);
    setTagNotes(results);
  };

  const clearTagFilter = () => {
    setActiveTag(null);
    setTagNotes(null);
  };

  const displayedNotes = activeTag && tagNotes ? tagNotes : notes;
  const isEditing = mode === "edit" || mode === "new";

  return (
    <>
      <style>{STYLES}</style>
      <div className="shell">

        {/* Sidebar overlay (mobile) */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Topbar */}
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(o => !o)}>☰</button>
          <div className="topbar-logo" onClick={() => { setActiveId(null); setMode("view"); }}>
            mycelium<span>.kb</span>
          </div>
          <SearchBar onSelect={openNote} />
          <div className="topbar-actions">
            <div className="view-toggle">
              <button className={`view-toggle-btn ${view === "graph" ? "active" : ""}`}
                onClick={() => setView("graph")}>graph</button>
              <button className={`view-toggle-btn ${view === "list" ? "active" : ""}`}
                onClick={() => setView("list")}>list</button>
            </div>
            <button className="btn btn-primary" onClick={() => openEditor()}>+ new</button>
          </div>
        </header>

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <SidebarContent
            notes={notes}
            tags={tags}
            activeId={activeId}
            activeTag={activeTag}
            onOpenNote={openNote}
            onTagClick={handleTagClick}
            onClearTag={clearTagFilter}
            onClose={() => setSidebarOpen(false)}
          />
        </aside>

        {/* Main */}
        <main className="main">
          {isEditing ? (
            <Editor
              note={editNote}
              notes={notes}
              onSave={handleSave}
              onDelete={handleDelete}
              onCancel={() => { setMode("view"); setEditNote(null); }}
            />
          ) : view === "graph" ? (
            <>
              <Graph data={graph} activeId={activeId} onNodeClick={openNote} />
              <NoteView
                noteId={activeId}
                notes={notes}
                onClose={() => setActiveId(null)}
                onEdit={openEditor}
                onNavigate={openNote}
                onTagClick={handleTagClick}
              />
            </>
          ) : (
            <>
              <ListView notes={displayedNotes} activeId={activeId} onSelect={openNote} />
              <NoteView
                noteId={activeId}
                notes={notes}
                onClose={() => setActiveId(null)}
                onEdit={openEditor}
                onNavigate={openNote}
                onTagClick={handleTagClick}
              />
            </>
          )}
        </main>

        {/* Bottom nav (mobile only) */}
        <nav className="bottom-nav">
          <button
            className={`bottom-nav-btn ${view === "graph" && !isEditing ? "active" : ""}`}
            onClick={() => { setView("graph"); setMode("view"); }}>
            <span className="bottom-nav-btn-icon">⬡</span>
            graph
          </button>
          <button
            className={`bottom-nav-btn ${view === "list" && !isEditing ? "active" : ""}`}
            onClick={() => { setView("list"); setMode("view"); }}>
            <span className="bottom-nav-btn-icon">≡</span>
            list
          </button>
          <button
            className={`bottom-nav-btn ${isEditing && mode === "new" ? "active" : ""}`}
            onClick={() => openEditor()}>
            <span className="bottom-nav-btn-icon">+</span>
            new
          </button>
        </nav>

      </div>
    </>
  );
}