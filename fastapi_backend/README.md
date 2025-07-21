# FastAPI Backend

This backend reads OData service metadata from the shared SQLite database and
exposes dynamic endpoints for each active service. The resulting OpenAPI
definitions can be consumed directly by LLM agents.

## Running

Create a virtual environment and start the server:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Create a `.env` file in this directory and set `DB_PATH` to the absolute
location of the shared SQLite database. Example:

```env
DB_PATH=/absolute/path/to/shared.sqlite
```

### Endpoints

- `/tools/{service_name}` - return an OpenAPI JSON spec for a single service
- `/invoke/{service_name}/{entity}` - mock invocation endpoint used by agents
