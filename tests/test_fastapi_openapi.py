import sqlite3
import tempfile
from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


SAMPLE_METADATA = """<?xml version='1.0' encoding='utf-8'?>
<edmx:Edmx xmlns:edmx='http://docs.oasis-open.org/odata/ns/edmx' Version='4.0'>
  <edmx:DataServices>
    <Schema Namespace='Test' xmlns='http://docs.oasis-open.org/odata/ns/edm'>
      <EntityContainer Name='Container'>
        <EntitySet Name='Products' EntityType='Test.Product'/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>"""


def setup_db(path: str):
    conn = sqlite3.connect(path)
    conn.execute(
        """CREATE TABLE odata_services (
            id TEXT,
            service_base_url TEXT,
            service_name TEXT,
            metadata TEXT,
            description TEXT,
            active INTEGER
        )"""
    )
    conn.execute(
        "INSERT INTO odata_services VALUES (?,?,?,?,?,1)",
        ("1", "http://example.com", "demo", SAMPLE_METADATA, "Demo"),
    )
    conn.commit()
    conn.close()


def test_openapi_contains_entity_path():
    with tempfile.NamedTemporaryFile() as tmp:
        setup_db(tmp.name)
        import os
        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        os.environ["DB_PATH"] = tmp.name
        from fastapi_backend.main import app
        client = TestClient(app)
        schema = client.get("/openapi.json").json()
        assert "/demo/Products" in schema["paths"]
