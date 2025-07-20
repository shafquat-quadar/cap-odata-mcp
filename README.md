# OData OpenAPI Bridge with CAP Admin UI

This project demonstrates a minimal integration of a CAP-based Node.js service
with a Python FastAPI backend. The CAP project owns the SQLite database and
exposes the `ODataServices` entity, while the FastAPI app reads the same
database to generate REST endpoints and an OpenAPI specification.

```
📦 cap_ui/           # CAP Project (Node.js)
📦 fastapi_backend/  # FastAPI app
📂 tests/            # Pytest tests
```

## Running Tests

Install `pytest` and required packages then execute the tests:

```bash
pip install -r fastapi_backend/requirements.txt pytest
pytest -q
```
