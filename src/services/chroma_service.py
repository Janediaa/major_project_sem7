"""Persistent ChromaDB storage for the medical knowledge base."""

import hashlib
import json
from pathlib import Path

import chromadb
import numpy as np


# Project paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]
CHROMA_DB_DIR = PROJECT_ROOT / "data" / "chroma_db"

COLLECTION_NAME = "medical_knowledge"


def get_chroma_collection(
    persist_directory: Path = CHROMA_DB_DIR,
    collection_name: str = COLLECTION_NAME,
):
    """Open or create a persistent ChromaDB collection."""

    client = chromadb.PersistentClient(
        path=str(persist_directory)
    )

    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    return collection


def _generate_chunk_id(chunk: dict) -> str:
    """Generate a stable ID using the filename and chunk index."""

    filename = chunk["filename"]
    chunk_index = chunk["chunk_index"]

    unique_value = f"{filename}::{chunk_index}"

    return hashlib.sha256(
        unique_value.encode("utf-8")
    ).hexdigest()


def _prepare_metadata(chunk: dict) -> dict:
    """Convert chunk metadata into ChromaDB-compatible values."""

    metadata = {}

    for key, value in chunk.items():

        # Chunk text is stored separately in ChromaDB documents.
        if key in {"text", "path"} or value is None:
            continue

        if isinstance(value, Path):
            metadata[key] = str(value)

        elif isinstance(value, (str, int, float, bool)):
            metadata[key] = value

        else:
            # Convert other metadata types into JSON strings.
            metadata[key] = json.dumps(
                value,
                ensure_ascii=False,
                default=str,
            )

    return metadata


def upsert_document_chunks(
    collection,
    chunks: list[dict],
    embeddings,
) -> int:
    """
    Insert or update document chunks and their embeddings.

    Existing chunks belonging to the same filename are updated.
    Old chunks that no longer exist are deleted.
    """

    if not chunks:
        return 0

    vectors = np.asarray(embeddings, dtype=np.float32)

    if vectors.ndim != 2:
        raise ValueError("embeddings must be a 2D array")

    if len(chunks) != vectors.shape[0]:
        raise ValueError(
            "Number of chunks must match number of embeddings"
        )

    if not np.isfinite(vectors).all():
        raise ValueError("embeddings must contain finite values")

    # Group chunks by their source filename.
    documents_by_filename = {}

    for index, chunk in enumerate(chunks):

        filename = chunk.get("filename")

        if not isinstance(filename, str) or not filename.strip():
            raise ValueError("Every chunk must have a filename")

        if not isinstance(chunk.get("text"), str) or not chunk["text"].strip():
            raise ValueError("Every chunk must contain non-empty text")

        documents_by_filename.setdefault(filename, []).append(
            (chunk, vectors[index])
        )

    stored_count = 0

    for filename, records in documents_by_filename.items():

        ids = [
            _generate_chunk_id(chunk)
            for chunk, _ in records
        ]

        texts = [
            chunk["text"]
            for chunk, _ in records
        ]

        metadatas = [
            _prepare_metadata(chunk)
            for chunk, _ in records
        ]

        document_embeddings = [
            vector.tolist()
            for _, vector in records
        ]

        # Find previously stored chunks for this document.
        existing = collection.get(
            where={"filename": filename},
        )

        existing_ids = set(existing["ids"])
        new_ids = set(ids)

        # Insert new chunks or update existing chunk IDs.
        collection.upsert(
            ids=ids,
            documents=texts,
            metadatas=metadatas,
            embeddings=document_embeddings,
        )

        # Remove old chunks that are no longer part of the document.
        stale_ids = list(existing_ids - new_ids)

        if stale_ids:
            collection.delete(ids=stale_ids)

        stored_count += len(ids)

    return stored_count


def delete_document(collection, filename: str) -> int:
    """Delete all stored chunks belonging to a filename."""

    existing = collection.get(
        where={"filename": filename},
    )

    ids = existing["ids"]

    if ids:
        collection.delete(ids=ids)

    return len(ids)


def get_stored_chunks(
    collection,
    limit: int | None = None,
) -> list[dict]:
    """Read stored chunk text and metadata from ChromaDB."""

    result = collection.get(
        limit=limit,
        include=["documents", "metadatas"],
    )

    stored_chunks = []

    for index, chunk_id in enumerate(result["ids"]):

        record = {
            "id": chunk_id,
            "text": result["documents"][index],
            **(result["metadatas"][index] or {}),
        }

        stored_chunks.append(record)

    return stored_chunks


def get_collection_count(collection) -> int:
    """Return the total number of stored chunks."""

    return collection.count()