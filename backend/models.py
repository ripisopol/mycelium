from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NoteCreate(BaseModel):
    title: str
    content: str = ""
    is_public: bool = True
    tags: list[str] = []

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_public: Optional[bool] = None
    tags: Optional[list[str]] = None

class NoteOut(BaseModel):
    id: str
    title: str
    content: str
    is_public: bool
    created_at: datetime
    updated_at: datetime
    tags: list[str] = []
    backlinks: list[str] = []   # IDs of notes that link TO this one