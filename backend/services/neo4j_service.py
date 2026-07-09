import os
import logging
from typing import Any

logger = logging.getLogger("plantmind.neo4j")


class Neo4jService:
    """Simple wrapper to interact with a Neo4j database using the official driver.

    Exposes minimal methods: `connect`, `create_entity`, `create_relationship`, `query_graph`.
    Connection config via `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` environment variables.
    """

    _driver = None

    @classmethod
    def connect(cls):
        if cls._driver:
            return cls._driver
        try:
            from neo4j import GraphDatabase

            uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
            user = os.getenv("NEO4J_USER", "neo4j")
            password = os.getenv("NEO4J_PASSWORD", "password")
            cls._driver = GraphDatabase.driver(uri, auth=(user, password))
            logger.info("Connected to Neo4j at %s", uri)
            return cls._driver
        except Exception as e:
            logger.exception("Failed to connect to Neo4j: %s", e)
            raise

    @classmethod
    def close(cls):
        if cls._driver:
            cls._driver.close()
            cls._driver = None

    @classmethod
    def create_entity(cls, label: str, properties: dict[str, Any]):
        drv = cls.connect()
        with drv.session() as session:
            props = ", ".join([f"{k}: $props.{k}" for k in properties.keys()]) if properties else ""
            cypher = f"MERGE (n:{label} {{name: $props.name}}) SET n += $props RETURN n"
            res = session.run(cypher, props=properties)
            return res.single()

    @classmethod
    def create_relationship(cls, source_label: str, source_name: str, rel: str, target_label: str, target_name: str):
        drv = cls.connect()
        with drv.session() as session:
            cypher = (
                "MATCH (a:%s {name: $source_name}), (b:%s {name: $target_name}) "
                "MERGE (a)-[r:%s]->(b) RETURN r"
                % (source_label, target_label, rel.upper())
            )
            res = session.run(cypher, source_name=source_name, target_name=target_name)
            return res.single()

    @classmethod
    def query_graph(cls, cypher: str, params: dict | None = None):
        drv = cls.connect()
        with drv.session() as session:
            res = session.run(cypher, **(params or {}))
            return [r.data() for r in res]
