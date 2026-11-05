
"""Prepare, embed, and persist medical knowledge-base documents."""

from sentence_transformers import SentenceTransformer

from src.services.embedding_service import generate_embeddings
from src.services.text_chunker import chunk_text
from src.services.chroma_service import (
    get_chroma_collection,
    upsert_document_chunks,
)


def chunk_documents(
    documents: list[dict],
    chunk_size: int = 800,
    overlap: int = 120,
) -> list[dict]:
    """Split documents into chunks while preserving their metadata."""

    all_chunks = []

    for document in documents:
        text_chunks = chunk_text(
            document["text"],
            chunk_size=chunk_size,
            overlap=overlap,
        )

        for chunk_index, text in enumerate(text_chunks):
            chunk_record = {
                **{
                    key: value
                    for key, value in document.items()
                    if key != "text"
                },
                "chunk_index": chunk_index,
                "text": text,
            }

            all_chunks.append(chunk_record)

    return all_chunks


def embed_chunks(
    chunks: list[dict],
    model: SentenceTransformer,
):
    """Generate embeddings for chunks without modifying their records."""

    texts = [chunk["text"] for chunk in chunks]
    embeddings = generate_embeddings(texts, model)

    return embeddings


def index_documents(
    documents: list[dict],
    model: SentenceTransformer,
    collection=None,
    chunk_size: int = 800,
    overlap: int = 120,
) -> list[dict]:
    """
    Chunk, embed, and persist documents in ChromaDB.

    Existing chunks are updated, new chunks are inserted,
    and obsolete chunks from updated documents are removed.
    """

    if not documents:
        return []

    # Step 1: Split documents into chunks.
    chunks = chunk_documents(
        documents,
        chunk_size=chunk_size,
        overlap=overlap,
    )

    if not chunks:
        return []

    # Step 2: Generate embeddings using the existing model.
    embeddings = embed_chunks(chunks, model)

    # Step 3: Open the persistent collection if one was not supplied.
    if collection is None:
        collection = get_chroma_collection()

    # Step 4: Store vectors, text, and metadata.
    stored_count = upsert_document_chunks(
        collection=collection,
        chunks=chunks,
        embeddings=embeddings,
    )

    print(f"Successfully stored {stored_count} chunks in ChromaDB.")

    return chunks
