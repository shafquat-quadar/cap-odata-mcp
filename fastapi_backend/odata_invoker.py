import os
from typing import Any, Dict

import httpx
from fastapi import HTTPException
from dotenv import load_dotenv

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=ENV_PATH)


def _get_credentials() -> tuple[str, str]:
    """Return basic auth credentials from the environment."""

    user = os.getenv("ODATA_USER")
    password = os.getenv("ODATA_PASSWORD")
    if not user or not password:
        raise RuntimeError(
            "ODATA_USER and ODATA_PASSWORD must be set in the environment"
        )
    return user, password


def format_odata_error(resp: httpx.Response) -> Dict[str, Any]:
    """Return structured SAP-style error information."""
    try:
        data = resp.json()
    except Exception:
        return {"status_code": resp.status_code, "message": resp.text, "details": None}

    if isinstance(data, dict):
        error = data.get("error", data)
        message = error.get("message")
        if isinstance(message, dict):
            message = message.get("value") or message.get("message")
        details = None
        inner = error.get("innererror")
        if isinstance(inner, dict):
            details = inner.get("errordetails") or inner
        return {
            "status_code": resp.status_code,
            "message": message or error.get("code"),
            "details": details,
        }

    return {"status_code": resp.status_code, "message": data, "details": None}


async def call_odata_service(
    service_name: str,
    entity: str,
    params: Dict[str, Any] | None = None,
    base_url: str | None = None,
) -> Dict[str, Any]:
    """Call an OData service asynchronously and return the JSON payload."""
    if params is None:
        params = {}
    if not base_url:
        base_url = os.getenv("ODATA_BASE_URL", "").rstrip("/")
    user, password = _get_credentials()
    url = f"{base_url.rstrip('/')}/{service_name.strip('/')}/{entity.strip('/')}"
    if params:
        # helpful debug log of final URL
        query = "&".join(f"{k}={v}" for k, v in params.items())
        print(f"Invoking OData URL: {url}?{query}")
    else:
        print(f"Invoking OData URL: {url}")

    async with httpx.AsyncClient(auth=(user, password), timeout=10) as client:
        try:
            resp = await client.get(url, params=params, headers={"Accept": "application/json"})
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    if resp.is_error:
        raise HTTPException(status_code=resp.status_code, detail=format_odata_error(resp))
    return resp.json()


def call_sync_odata(
    service_name: str,
    entity: str,
    params: Dict[str, Any] | None = None,
    base_url: str | None = None,
) -> Dict[str, Any]:
    """Synchronous variant of :func:`call_odata_service`."""
    if params is None:
        params = {}
    if not base_url:
        base_url = os.getenv("ODATA_BASE_URL", "").rstrip("/")
    user, password = _get_credentials()
    url = f"{base_url.rstrip('/')}/{service_name.strip('/')}/{entity.strip('/')}"
    if params:
        query = "&".join(f"{k}={v}" for k, v in params.items())
        print(f"Invoking OData URL: {url}?{query}")
    else:
        print(f"Invoking OData URL: {url}")

    with httpx.Client(auth=(user, password), timeout=10) as client:
        try:
            resp = client.get(url, params=params, headers={"Accept": "application/json"})
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    if resp.is_error:
        raise HTTPException(status_code=resp.status_code, detail=format_odata_error(resp))
    return resp.json()
