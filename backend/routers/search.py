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