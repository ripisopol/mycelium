import re
from nanoid import generate

LINK_PATTERN = re.compile(r'\[\[(.+?)\]\]')

def extract_links(content: str) -> list[str]:
    """Returns all [[titles]] found in content."""
    return LINK_PATTERN.findall(content)

def new_id() -> str:
    return generate(size=10)  # e.g. "V1StGXR8_Z"