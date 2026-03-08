from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import notes, graph, search

app = FastAPI(title="Mycelium", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in prod
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

app.include_router(notes.router,  prefix="/api/notes",  tags=["notes"])
app.include_router(graph.router,  prefix="/api/graph",  tags=["graph"])
app.include_router(search.router, prefix="/api/search", tags=["search"])