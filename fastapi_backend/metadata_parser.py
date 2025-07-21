"""Utility functions for parsing OData $metadata documents."""

from typing import Any, Dict, List

import xmltodict


def parse_metadata(text: str) -> Dict[str, Any]:
    """Parse an OData metadata XML string into a simplified dict."""

    try:
        doc = xmltodict.parse(text)
    except Exception:
        return {}

    edmx = doc.get("edmx:Edmx") or doc.get("Edmx")
    if not edmx:
        return {}
    dataservices = edmx.get("edmx:DataServices") or edmx.get("DataServices")
    if not dataservices:
        return {}

    schemas = dataservices.get("Schema") or []
    if not isinstance(schemas, list):
        schemas = [schemas]

    entities: List[Dict[str, str]] = []
    for schema in schemas:
        container = schema.get("EntityContainer")
        if not container:
            continue
        sets = container.get("EntitySet") or []
        if not isinstance(sets, list):
            sets = [sets]
        for es in sets:
            name = es.get("@Name")
            if name:
                entities.append({"name": name})

    return {"entities": entities}
