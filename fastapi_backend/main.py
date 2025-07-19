import os
from fastapi import FastAPI
from dotenv import load_dotenv

from .metadata_store import MetadataStore
from .endpoint_generator import generate_routers
from .openapi_customizer import custom_openapi


def create_app(db_path: str = "../shared.sqlite") -> FastAPI:
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
    store = MetadataStore(db_path)
    app = FastAPI()
    services = store.get_active_services()
    for router in generate_routers(services):
        app.include_router(router)

    app.openapi = lambda: custom_openapi(app)
    return app


app = create_app(os.getenv("DB_PATH", "../shared.sqlite"))
