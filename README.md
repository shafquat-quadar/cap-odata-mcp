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

Create a `.env` file in `fastapi_backend` with `SAP_USER` and `SAP_PASS` to use
basic authentication when fetching remote metadata.

## Demo OData Service

For a quick test use the public Northwind OData endpoint. Create a new record in
the CAP admin UI with `base_url` set to `https://services.odata.org` and
`service_name` to `northwind/northwind.svc`. After executing the
`refreshMetadata` action the metadata JSON will be stored in the database and the
`odata_version` column will indicate whether the service is v2 or v4.
