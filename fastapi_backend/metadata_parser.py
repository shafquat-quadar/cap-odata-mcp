import json


def parse_metadata(text: str) -> dict:
    """Parse stored JSON metadata."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}
