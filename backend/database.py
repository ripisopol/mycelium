import sqlite3
from pathlib import Path

DB_PATH = Path("data/mycelium.db")

def get_db():
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.row_factory = sqlite3.Row  # rows as dicts
    db.execute("PRAGMA foreign_keys = ON")
    db.execute("PRAGMA journal_mode = WAL")  # concurrent reads
    try:
        yield db
    finally:
        db.close()

def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.executescript("""
        CREATE TABLE IF NOT EXISTS notes (
            id         TEXT PRIMARY KEY,
            title      TEXT NOT NULL,
            content    TEXT NOT NULL DEFAULT '',
            created_at DATETIME DEFAULT (datetime('now')),
            updated_at DATETIME DEFAULT (datetime('now')),
            is_public  INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS links (
            source_id  TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
            target_id  TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
            PRIMARY KEY (source_id, target_id)
        );

        CREATE TABLE IF NOT EXISTS tags (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS note_tags (
            note_id TEXT    NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
            tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
            PRIMARY KEY (note_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS unresolved_links (
            source_id    TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
            target_title TEXT NOT NULL,
            PRIMARY KEY (source_id, target_title)
        );

        CREATE INDEX IF NOT EXISTS idx_links_target  ON links(target_id);
        CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);
        CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);

        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts
            USING fts5(title, content, content='notes', content_rowid='rowid');
    """)
    db.commit()
    db.close()