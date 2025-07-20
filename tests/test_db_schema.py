import sqlite3


def create_schema(conn):
    conn.execute("""
    CREATE TABLE IF NOT EXISTS odata_services (
        id TEXT PRIMARY KEY,
        service_base_url TEXT NOT NULL,
        service_name TEXT NOT NULL,
        metadata TEXT,
        description TEXT,
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
        "service_base_url",
        "service_name",
        "metadata",
        "description",
        "active",
        "created_at",
        "last_updated",
    }
    assert expected.issubset(columns)
