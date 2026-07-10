from typing import Any
import re
import logging

logger = logging.getLogger("plantmind.entity")


class EntityService:
    """Lightweight entity extraction with optional spaCy fallback.

    Tries to use spaCy's NER if available; otherwise falls back to regex heuristics
    to identify equipment-like tokens (e.g., 'Compressor C-12') and incident keywords.
    """

    INCIDENT_KEYWORDS = [
        r"fail", r"failure", r"leak", r"overheat", r"vibration", r"trip", r"fault", r"incident",
    ]

    EQUIPMENT_PATTERN = re.compile(r"\b([A-Z][a-zA-Z]+(?:\s+[A-Z0-9\-]+){0,2})\b")

    @classmethod
    def extract_entities(cls, text: str) -> list[dict[str, Any]]:
        text = text or ""
        entities: list[dict[str, Any]] = []

        # Try spaCy if available
        try:
            import spacy

            try:
                nlp = spacy.load("en_core_web_sm")
            except Exception:
                # try to download if missing
                try:
                    from spacy.cli import download

                    download("en_core_web_sm")
                    nlp = spacy.load("en_core_web_sm")
                except Exception:
                    nlp = None

            if nlp:
                doc = nlp(text)
                for ent in doc.ents:
                    label = ent.label_.upper()
                    kind = "Unknown"
                    if label in ("ORG", "PRODUCT"):
                        kind = "Equipment"
                    elif label in ("EVENT", "NORP"):
                        kind = "Incident"
                    elif label in ("PERSON", "GPE", "LOC"):
                        kind = "Thing"

                    entities.append({"text": ent.text, "type": kind, "start": ent.start_char, "end": ent.end_char})

                if entities:
                    logger.debug("Extracted %d entities via spaCy", len(entities))
                    return entities
        except Exception:
            logger.debug("spaCy extraction unavailable, falling back to heuristics")

        # Fallback heuristics: equipment-like patterns
        for m in cls.EQUIPMENT_PATTERN.finditer(text):
            token = m.group(1)
            # Simple filter: token that contains letters and digits or uppercase pattern
            if any(ch.isdigit() for ch in token) or token.split()[0][0].isupper():
                entities.append({"text": token, "type": "Equipment", "start": m.start(), "end": m.end()})

        # Incident keywords
        for kw in cls.INCIDENT_KEYWORDS:
            for m in re.finditer(r"\b" + kw + r"\w*\b", text, flags=re.IGNORECASE):
                snippet = text[max(0, m.start() - 40): m.end() + 40]
                entities.append({"text": snippet.strip(), "type": "Incident", "start": m.start(), "end": m.end()})

        # Deduplicate by text
        seen = set()
        unique = []
        for e in entities:
            key = (e["text"].strip(), e.get("type"))
            if key in seen:
                continue
            seen.add(key)
            unique.append(e)

        logger.debug("Heuristic extracted %d entities", len(unique))
        return unique
