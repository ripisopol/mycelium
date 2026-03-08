from fastapi import APIRouter, Depends, Query
from database import get_db
from sqlite3 import Connection

router = APIRouter()

@router.get("")
@router.get("/")
def search(q: str = Query(..., min_length=1), db: Connection = Depends(get_db)):
    rows = db.execute("""
        SELECT
            n.id,
            n.title,
            snippet(notes_fts, 1, '<mark>', '</mark>', '…', 24) AS excerpt
        FROM notes_fts
        JOIN notes n ON n.rowid = notes_fts.rowid
        WHERE notes_fts MATCH ?
          AND n.is_public = 1
        ORDER BY rank
        LIMIT 20
    """, (q,)).fetchall()

    return [dict(r) for r in rows]


@router.get("/by-tag")
def search_by_tag(tag: str = Query(..., min_length=1), db: Connection = Depends(get_db)):
    rows = db.execute("""
        SELECT n.id, n.title, n.updated_at
        FROM notes n
        JOIN note_tags nt ON nt.note_id = n.id
        JOIN tags t ON t.id = nt.tag_id
        WHERE t.name = ? AND n.is_public = 1
        ORDER BY n.updated_at DESC
    """, (tag,)).fetchall()

    return [dict(r) for r in rows]


@router.get("/tags")
def list_tags(db: Connection = Depends(get_db)):
    rows = db.execute("""
        SELECT t.name, COUNT(nt.note_id) as count
        FROM tags t
        JOIN note_tags nt ON nt.tag_id = t.id
        JOIN notes n ON n.id = nt.note_id AND n.is_public = 1
        GROUP BY t.name
        ORDER BY count DESC, t.name ASC
    """).fetchall()

    return [dict(r) for r in rows]