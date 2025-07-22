import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from dotenv import load_dotenv

from .metadata_store import MetadataStore
from .endpoint_generator import generate_routers
from .openapi_customizer import custom_openapi

# Load environment variables from `.env` once during import so
# `os.getenv` picks up values before the FastAPI application is created.
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=ENV_PATH)

# Default to the shared database in the repository root, but use an
# absolute path so the app can run from any location.
DEFAULT_DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "shared.sqlite")
)


def create_app(db_path: str = DEFAULT_DB_PATH) -> FastAPI:
    store = MetadataStore(db_path)
    app = FastAPI()
    services = store.get_active_services()
    service_map = {svc.get("name") or svc.get("service_name"): svc for svc in services}
    for router in generate_routers(services):
        app.include_router(router)

    @app.get("/tools/{service_name}")
    async def tool_spec(service_name: str):
        svc = service_map.get(service_name)
        if not svc:
            raise HTTPException(status_code=404, detail="Service not found")
        temp = FastAPI()
        for router in generate_routers([svc]):
            temp.include_router(router)
        schema = get_openapi(
            title=service_name,
            version="1.0.0",
            description=svc.get("description") or "",
            routes=temp.routes,
        )
        schema["openapi"] = "3.1.0"
        return JSONResponse(schema)


    app.openapi = lambda: custom_openapi(app)
    return app


DB_PATH = os.getenv("DB_PATH", DEFAULT_DB_PATH)
app = create_app(DB_PATH)

if __name__== "__main__":
    import uvicorn
    uvicorn.run("fastapi_backend.main:app", host="0.0.0.0", port=8000, reload=True)
