
"""Manage unique source citations for medical RAG answers."""


def extract_unique_sources(retrieved_chunks: list[dict]) -> list[dict]:
    """
    Extract unique source references from retrieved chunks.

    Multiple chunks from the same document produce only one citation.
    """

    unique_sources = {}

    for chunk in retrieved_chunks:
        url = chunk.get("url", "").strip()

        # Ignore missing or invalid source URLs.
        if not url.startswith(("https://", "http://")):
            continue

        if url not in unique_sources:
            unique_sources[url] = {
                "title": chunk.get("title", "Medical information"),
                "source": chunk.get("source", "Unknown source"),
                "url": url,
                "published_date": chunk.get("published_date"),
            }

    return list(unique_sources.values())
