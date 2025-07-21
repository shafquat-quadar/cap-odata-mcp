import sqlite3
from typing import List, Dict, Any


class MetadataStore:
    """Read service definitions from the shared SQLite database."""

    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_active_services(self) -> List[Dict[str, Any]]:
        """Return all active services regardless of column naming conventions."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.execute("SELECT * FROM odata_services WHERE active = 1")
        rows = []
        for row in cur.fetchall():
            data = dict(row)
            # Normalise potential column names across schemas
            data.setdefault("service_url", data.get("service_base_url"))
            data.setdefault("service_url", data.get("service_url"))
            data.setdefault("name", data.get("service_name") or data.get("name"))
            data.setdefault("metadata_xml", data.get("metadata") or data.get("metadata_xml"))
            rows.append(data)
        conn.close()
        return rows
