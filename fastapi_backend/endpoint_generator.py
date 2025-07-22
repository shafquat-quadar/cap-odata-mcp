"""Generate FastAPI routers based on OData metadata."""

from __future__ import annotations

from typing import Iterable
from fastapi import APIRouter, Query

from .metadata_parser import parse_metadata
from .odata_invoker import call_odata_service


def _create_invoke_route(service: dict, entity: dict):
    service_name = service.get("name") or service.get("service_name")
    base_url = service.get("service_url") or service.get("service_base_url")

    async def invoke(
        top: int | None = Query(None, alias="$top", ge=1),
        skip: int | None = Query(None, alias="$skip", ge=0),
        filter_: str | None = Query(None, alias="$filter"),
        select: str | None = Query(None, alias="$select"),
        orderby: str | None = Query(None, alias="$orderby"),
    ):
        params = {}
        if top is not None:
            params["$top"] = top
        if skip is not None:
            params["$skip"] = skip
        if filter_ is not None:
            params["$filter"] = filter_
        if select is not None:
            params["$select"] = select
        if orderby is not None:
            params["$orderby"] = orderby

        return await call_odata_service(service_name, entity["name"], params, base_url)

    invoke.__name__ = f"invoke_{service_name}_{entity['name']}"
    return invoke


def generate_routers(services: Iterable[dict]) -> Iterable[APIRouter]:
    routers = []
    for svc in services:
        meta = parse_metadata(svc.get("metadata_xml", svc.get("metadata", "")))
        name = svc.get("name") or svc.get("service_name")
        router = APIRouter()
        for entity in meta.get("entities", []):
            route = _create_invoke_route(svc, entity)
            router.add_api_route(
                f"/invoke/{name}/{entity['name']}",
                route,
                methods=["GET"],
                summary=f"Invoke {entity['name']} from {name}",
                tags=[name],
            )
        routers.append(router)
    return routers
