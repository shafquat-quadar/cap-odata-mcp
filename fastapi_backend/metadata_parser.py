"""Utility functions for parsing OData ``$metadata`` documents."""

from __future__ import annotations

from typing import Any, Dict, List

import xmltodict


def _extract_version(edmx: Dict[str, Any]) -> str:
    """Return ``v2`` or ``v4`` based on the EDMX version attribute."""

    version = (edmx.get("@Version") or "").split(".")[0]
    if version == "4":
        return "v4"
    return "v2"


def parse_metadata(text: str) -> Dict[str, Any]:
    """Parse an OData metadata XML string into a simplified dictionary.

    The returned structure contains the OData version and a list of entity
    definitions with their properties. Only a subset of the metadata is
    extracted as required by the dynamic endpoint generator.
    """

    try:
        doc = xmltodict.parse(text)
    except Exception:
        return {}

    edmx = doc.get("edmx:Edmx") or doc.get("Edmx")
    if not edmx:
        return {}

    version = _extract_version(edmx)

    dataservices = edmx.get("edmx:DataServices") or edmx.get("DataServices")
    if not dataservices:
        return {}

    schemas = dataservices.get("Schema") or []
    if not isinstance(schemas, list):
        schemas = [schemas]

    entities: List[Dict[str, Any]] = []

    for schema in schemas:
        container = schema.get("EntityContainer")
        if not container:
            continue
        sets = container.get("EntitySet") or []
        if not isinstance(sets, list):
            sets = [sets]

        # Map entity type name to its property definitions
        entity_types = schema.get("EntityType") or []
        if not isinstance(entity_types, list):
            entity_types = [entity_types]
        type_map = {et.get("@Name"): et for et in entity_types}

        for es in sets:
            name = es.get("@Name")
            etype = es.get("@EntityType")
            if not name or not etype:
                continue
            et_name = etype.split(".")[-1]
            et_def = type_map.get(et_name, {})
            props = et_def.get("Property") or []
            if not isinstance(props, list):
                props = [props]
            properties = []
            for prop in props:
                properties.append(
                    {
                        "name": prop.get("@Name"),
                        "type": prop.get("@Type"),
                        "filterable": prop.get("sap:filterable", "true") != "false",
                        "label": prop.get("sap:label"),
                        "maxlength": prop.get("@MaxLength"),
                        "nullable": prop.get("@Nullable", "true") != "false",
                    }
                )

            keys = []
            key_def = et_def.get("Key", {})
            refs = key_def.get("PropertyRef") or []
            if not isinstance(refs, list):
                refs = [refs]
            for ref in refs:
                key_name = ref.get("@Name")
                if key_name:
                    keys.append(key_name)

            entities.append({"name": name, "properties": properties, "keys": keys})

    return {"entities": entities, "version": version}
