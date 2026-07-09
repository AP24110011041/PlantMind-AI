from fastapi import APIRouter, HTTPException
from typing import Any

from services.entity_service import EntityService
from services.neo4j_service import Neo4jService

router = APIRouter(prefix="/kg", tags=["knowledge-graph"])


@router.post("/ingest")
def ingest_text(payload: dict[str, Any]):
    text = payload.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    entities = EntityService.extract_entities(text)

    # Create nodes and relationships in Neo4j
    created = []
    for ent in entities:
        label = ent.get("type", "Thing")
        name = ent.get("text")[:200]
        Neo4jService.create_entity(label, {"name": name, "source": payload.get("source")})
        created.append({"name": name, "type": label})

    # Simple heuristic: link Equipment -> Incident if text contains both
    equipments = [e for e in entities if e["type"] == "Equipment"]
    incidents = [e for e in entities if e["type"] == "Incident"]
    for eq in equipments:
        for inc in incidents:
            Neo4jService.create_relationship("Equipment", eq["text"], "related_to", "Incident", inc["text"])

    return {"created": created}


@router.get("/graph")
def get_graph(limit: int = 200):
    # Return nodes and relationships for frontend visualization
    cypher = (
        "MATCH (n)-[r]->(m) RETURN n.name AS source, labels(n)[0] AS source_label, type(r) AS rel, m.name AS target, labels(m)[0] AS target_label LIMIT $limit"
    )
    rows = Neo4jService.query_graph(cypher, {"limit": limit})
    return {"edges": rows}
