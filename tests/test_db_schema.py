import sqlite3


def create_schema(conn):
    conn.execute("""
    CREATE TABLE IF NOT EXISTS odata_services (
        id TEXT PRIMARY KEY,
        service_url TEXT NOT NULL,
        metadata_json TEXT,
        version_hash TEXT,
        odata_version TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)


def test_schema_columns():
    conn = sqlite3.connect(":memory:")
    create_schema(conn)
    cursor = conn.execute("PRAGMA table_info(odata_services)")
    columns = {row[1] for row in cursor.fetchall()}
    expected = {
        "id",
        "service_url",
        "metadata_json",
        "version_hash",
        "odata_version",
        "active",
        "created_at",
        "last_updated",
    }
    assert expected.issubset(columns)
