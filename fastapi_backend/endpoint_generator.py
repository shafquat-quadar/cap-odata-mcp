from typing import Iterable
from fastapi import APIRouter

from .metadata_parser import parse_metadata


def _create_list_route(entity_name: str):
    async def list_entities():
        return []

    list_entities.__name__ = f"list_{entity_name}"
    return list_entities


def generate_routers(services: Iterable[dict]) -> Iterable[APIRouter]:
    routers = []
    for svc in services:
        meta = parse_metadata(svc.get("metadata_json", "{}"))
        prefix = f"/{svc['service_name'].strip('/')}"
        router = APIRouter(prefix=prefix)
        for entity in meta.get("entities", []):
            route = _create_list_route(entity["name"])
            router.add_api_route(
                f"/{entity['name']}",
                route,
                methods=["GET"],
                summary=f"List {entity['name']}",
                tags=[svc["service_name"]],
            )
        routers.append(router)
    return routers
