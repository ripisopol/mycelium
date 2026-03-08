from fastapi import APIRouter, Depends
from database import get_db
from sqlite3 import Connection

router = APIRouter()

@router.get("")
@router.get("/")
def get_graph(db: Connection = Depends(get_db)):
    nodes = db.execute("""
        SELECT
            n.id,
            n.title,
            COUNT(DISTINCT l_out.target_id) AS out_degree,
            COUNT(DISTINCT l_in.source_id)  AS in_degree,
            GROUP_CONCAT(DISTINCT t.name)   AS tags
        FROM notes n
        LEFT JOIN links l_out ON l_out.source_id = n.id
        LEFT JOIN links l_in  ON l_in.target_id  = n.id
        LEFT JOIN note_tags nt ON nt.note_id = n.id
        LEFT JOIN tags t       ON t.id = nt.tag_id
        WHERE n.is_public = 1
        GROUP BY n.id
    """).fetchall()

    edges = db.execute("""
        SELECT l.source_id AS source, l.target_id AS target
        FROM links l
        JOIN notes s ON s.id = l.source_id AND s.is_public = 1
        JOIN notes t ON t.id = l.target_id AND t.is_public = 1
    """).fetchall()

    return {
        "nodes": [
            {
                **dict(n),
                "tags": n["tags"].split(",") if n["tags"] else []
            }
            for n in nodes
        ],
        "edges": [dict(e) for e in edges],
    }