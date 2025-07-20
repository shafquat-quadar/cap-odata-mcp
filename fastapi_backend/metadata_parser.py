from xml.etree import ElementTree as ET


def parse_metadata(text: str) -> dict:
    """Extract entity set names from stored XML metadata."""
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        return {}

    entities = []
    for es in root.findall('.//{*}EntitySet'):
        name = es.attrib.get('Name')
        if name:
            entities.append({'name': name})

    return {'entities': entities}
