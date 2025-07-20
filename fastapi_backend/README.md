# FastAPI Backend

This backend reads OData service metadata from the shared SQLite database and
exposes dynamic endpoints for each active service. Install dependencies and run
with `uvicorn`:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
