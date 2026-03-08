from fastapi import APIRouter, Depends, HTTPException
from sqlite3 import Connection
from database import get_db
from auth import require_write
from models import NoteCreate, NoteUpdate, NoteOut
from utils.parser import extract_links, new_id
from datetime import datetime

router = APIRouter()

# ── helpers ────────────────────────────────────────────────────────────────

def _upsert_tags(db: Connection, note_id: str, tag_names: list[str]):
    db.execute("DELETE FROM note_tags WHERE note_id = ?", (note_id,))
    for name in tag_names:
        db.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (name,))
        tag_id = db.execute("SELECT id FROM tags WHERE name = ?", (name,)).fetchone()[0]
        db.execute("INSERT OR IGNORE INTO note_tags VALUES (?, ?)", (note_id, tag_id))

def _resolve_links(db: Connection, note_id: str, content: str):
    """
    Parse [[links]] in content, then:
      - If target title exists → insert into `links`
      - If not             → insert into `unresolved_links`
    Also check if this new note resolves anyone else's unresolved links.
    """
    titles = extract_links(content)

    db.execute("DELETE FROM links           WHERE source_id = ?", (note_id,))
    db.execute("DELETE FROM unresolved_links WHERE source_id = ?", (note_id,))

    for title in titles:
        row = db.execute(
            "SELECT id FROM notes WHERE title = ?", (title,)
        ).fetchone()

        if row:
            db.execute(
                "INSERT OR IGNORE INTO links VALUES (?, ?)",
                (note_id, row["id"])
            )
        else:
            db.execute(
                "INSERT OR IGNORE INTO unresolved_links VALUES (?, ?)",
                (note_id, title)
            )

def _promote_unresolved(db: Connection, new_note_id: str, new_title: str):
    """When a note is created, resolve any dangling links pointing to its title."""
    rows = db.execute(
        "SELECT source_id FROM unresolved_links WHERE target_title = ?",
        (new_title,)
    ).fetchall()

    for row in rows:
        db.execute(
            "INSERT OR IGNORE INTO links VALUES (?, ?)",
            (row["source_id"], new_note_id)
        )
    db.execute(
        "DELETE FROM unresolved_links WHERE target_title = ?", (new_title,)
    )

def _fetch_note(db: Connection, note_id: str) -> dict:
    note = db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    tags = db.execute("""
        SELECT t.name FROM tags t
        JOIN note_tags nt ON nt.tag_id = t.id
        WHERE nt.note_id = ?
    """, (note_id,)).fetchall()

    backlinks = db.execute("""
        SELECT source_id FROM links WHERE target_id = ?
    """, (note_id,)).fetchall()

    return {
        **dict(note),
        "is_public": bool(note["is_public"]),
        "tags": [r["name"] for r in tags],
        "backlinks": [r["source_id"] for r in backlinks],
    }

# ── routes ─────────────────────────────────────────────────────────────────

@router.get("/")
def list_notes(db: Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT id, title, updated_at FROM notes WHERE is_public = 1 ORDER BY updated_at DESC"
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/{note_id}", response_model=NoteOut)
def get_note(note_id: str, db: Connection = Depends(get_db)):
    return _fetch_note(db, note_id)


@router.post("/", response_model=NoteOut, dependencies=[Depends(require_write)])
def create_note(payload: NoteCreate, db: Connection = Depends(get_db)):
    note_id = new_id()

    db.execute(
        "INSERT INTO notes (id, title, content, is_public) VALUES (?, ?, ?, ?)",
        (note_id, payload.title, payload.content, int(payload.is_public))
    )
    # FTS index
    db.execute(
        "INSERT INTO notes_fts (rowid, title, content) "
        "SELECT rowid, title, content FROM notes WHERE id = ?", (note_id,)
    )

    _upsert_tags(db, note_id, payload.tags)
    _resolve_links(db, note_id, payload.content)
    _promote_unresolved(db, note_id, payload.title)

    db.commit()
    return _fetch_note(db, note_id)


@router.put("/{note_id}", response_model=NoteOut, dependencies=[Depends(require_write)])
def update_note(note_id: str, payload: NoteUpdate, db: Connection = Depends(get_db)):
    note = db.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Only update fields that were sent
    fields, values = [], []
    if payload.title is not None:
        fields.append("title = ?");      values.append(payload.title)
    if payload.content is not None:
        fields.append("content = ?");    values.append(payload.content)
    if payload.is_public is not None:
        fields.append("is_public = ?");  values.append(int(payload.is_public))

    if fields:
        fields.append("updated_at = ?")
        values.append(datetime.utcnow().isoformat())
        values.append(note_id)
        db.execute(f"UPDATE notes SET {', '.join(fields)} WHERE id = ?", values)

        # Rebuild FTS
        db.execute("DELETE FROM notes_fts WHERE rowid = (SELECT rowid FROM notes WHERE id = ?)", (note_id,))
        db.execute(
            "INSERT INTO notes_fts (rowid, title, content) "
            "SELECT rowid, title, content FROM notes WHERE id = ?", (note_id,)
        )

    if payload.tags is not None:
        _upsert_tags(db, note_id, payload.tags)
    if payload.content is not None:
        _resolve_links(db, note_id, payload.content)

    db.commit()
    return _fetch_note(db, note_id)


@router.delete("/{note_id}", dependencies=[Depends(require_write)])
def delete_note(note_id: str, db: Connection = Depends(get_db)):
    db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    db.execute("DELETE FROM notes_fts WHERE rowid = (SELECT rowid FROM notes WHERE id = ?)", (note_id,))
    db.commit()
    return {"deleted": note_id}