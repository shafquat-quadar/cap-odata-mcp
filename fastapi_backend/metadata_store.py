import sqlite3
from typing import List, Dict, Any


class MetadataStore:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def get_active_services(self) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.execute(
            "SELECT service_base_url, service_name, metadata FROM odata_services WHERE active = 1"
        )
        rows = [dict(row) for row in cur.fetchall()]
        for row in rows:
            row["service_url"] = row["service_name"]
        conn.close()
        return rows
