"""Utilities for producing a customised OpenAPI schema."""

from fastapi.openapi.utils import get_openapi


def custom_openapi(app):
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="OData OpenAPI Bridge",
        version="1.0.0",
        description="Dynamically generated API from OData services",
        routes=app.routes,
    )
    # Advertise OpenAPI 3.1 for improved schema support
    openapi_schema["openapi"] = "3.1.0"
    app.openapi_schema = openapi_schema
    return app.openapi_schema
