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

Create `.env` files in both `fastapi_backend` and `cap_ui` containing `SAP_USER`
and `SAP_PASS` to enable basic authentication when retrieving remote
metadata.

## Demo OData Service

For a quick test use the public Northwind OData endpoint. Create a new record in
the CAP admin UI with the base URL `https://services.odata.org` and the service
name `northwind/northwind.svc`. After saving the record the service metadata is
automatically fetched and stored in the database. A `description` field can be
entered manually to document the service.
