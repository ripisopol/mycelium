import os
from fastapi import Header, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

API_KEY = os.environ.get("MYCELIUM_API_KEY", "changeme")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def require_write(key: str = Security(api_key_header)):
    if key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")