
import numpy as np
from sentence_transformers import SentenceTransformer, util

from src.services.embedding_service import generate_embeddings


def retrieve_relevant_chunks(
    query: str,
    chunks: list[dict],
    chunk_embeddings,
    model: SentenceTransformer,
    top_k: int = 3,
) -> list[dict]:
    """Rank chunks by cosine similarity to a user's query."""
    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must not be empty")

    if not isinstance(top_k, int) or isinstance(top_k, bool):
        raise TypeError("top_k must be an integer")

    if top_k <= 0:
        raise ValueError("top_k must be positive")

    if not chunks:
        return []

    embeddings = np.asarray(chunk_embeddings)

    if embeddings.ndim != 2:
        raise ValueError("chunk_embeddings must be a 2D array")

    if len(chunks) != embeddings.shape[0]:
        raise ValueError(
            "Number of chunks must match number of chunk embeddings"
        )

    if not np.isfinite(embeddings).all():
        raise ValueError("chunk_embeddings must contain only finite values")

    query_embeddings = np.asarray(
        generate_embeddings([query], model)
    )

    if query_embeddings.ndim != 2 or query_embeddings.shape[0] != 1:
        raise ValueError("query embedding must contain exactly one vector")

    if query_embeddings.shape[1] != embeddings.shape[1]:
        raise ValueError(
            "Query and chunk embeddings must have the same dimensions"
        )

    if not np.isfinite(query_embeddings).all():
        raise ValueError("query embedding must contain only finite values")

    similarities = util.cos_sim(query_embeddings, embeddings)[0]
    ranked_indices = similarities.argsort(descending=True)[:top_k]

    results = []

    for index in ranked_indices:
        chunk_index = int(index)
        result = chunks[chunk_index].copy()
        result["similarity_score"] = float(similarities[chunk_index])
        results.append(result)

    return results



def retrieve_from_chroma(
    query: str,
    collection,
    model: SentenceTransformer,
    top_k: int = 3,
) -> list[dict]:
    """Retrieve relevant medical chunks from persistent ChromaDB."""

    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must not be empty")

    if not isinstance(top_k, int) or isinstance(top_k, bool):
        raise TypeError("top_k must be an integer")

    if top_k <= 0:
        raise ValueError("top_k must be positive")

    total_chunks = collection.count()

    if total_chunks == 0:
        return []

    # Embed only the user's question.
    query_embedding = np.asarray(
        generate_embeddings([query], model),
        dtype=np.float32,
    )

    if query_embedding.ndim != 2 or query_embedding.shape[0] != 1:
        raise ValueError("query embedding must contain exactly one vector")

    if not np.isfinite(query_embedding).all():
        raise ValueError("query embedding must contain only finite values")

    # Search the vectors already stored in ChromaDB.
    search_results = collection.query(
        query_embeddings=query_embedding.tolist(),
        n_results=min(top_k, total_chunks),
        include=["documents", "metadatas", "distances"],
    )

    results = []

    ids = search_results["ids"][0]
    documents = search_results["documents"][0]
    metadatas = search_results["metadatas"][0]
    distances = search_results["distances"][0]

    for chunk_id, text, metadata, distance in zip(
        ids,
        documents,
        metadatas,
        distances,
    ):
        result = {
            "id": chunk_id,
            **(metadata or {}),
            "text": text,
            "similarity_score": float(1.0 - distance),
        }

        results.append(result)

    return results
