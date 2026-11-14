
from pathlib import Path

import chromadb


PROJECT_ROOT = Path(__file__).resolve().parents[3]

INSURANCE_CHROMA_PATH = (
    PROJECT_ROOT / "data" / "insurance_chroma_db"
)

COLLECTION_NAME = "insurance_policies"


def get_insurance_collection():
    """Create or retrieve the separate Insurance collection."""

    client = chromadb.PersistentClient(
        path=str(INSURANCE_CHROMA_PATH)
    )

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"}
    )

    return collection


def store_insurance_chunks(chunks, embeddings):
    """Store insurance chunks, embeddings and metadata in ChromaDB."""

    if len(chunks) != len(embeddings):
        raise ValueError(
            "Number of chunks and embeddings must match."
        )

    if not chunks:
        raise ValueError("No chunks to store.")

    collection = get_insurance_collection()

    ids = []
    documents = []
    metadatas = []
    vectors = []

    for index, (chunk, embedding) in enumerate(
        zip(chunks, embeddings)
    ):

        chunk_id = (
            f"{chunk['filename']}_"
            f"page_{chunk['page_number']}_"
            f"chunk_{chunk['chunk_index']}_"
            f"{index}"
        )

        ids.append(chunk_id)
        documents.append(chunk["text"])
        vectors.append(embedding.tolist())
        metadatas.append({
            "filename": chunk.get("filename", ""),
            "insurer": chunk.get("insurer", ""),
            "product_name": chunk.get("product_name", ""),
            "uin": chunk.get("uin", ""),
            "document_version": chunk.get(
                "document_version", ""
            ),
            "effective_date": chunk.get("effective_date", ""),
            "document_type": chunk.get(
                "document_type", "policy_wording"
            ),
            "page_number": int(chunk.get("page_number", 0)),
           "section_heading": chunk.get(
               "section_heading", ""
           ),
            "section_type": chunk.get(
               "section_type", "general"
           ),
           "chunk_index": int(chunk.get("chunk_index", 0))
        })

    # Upsert prevents duplicate records when the script is rerun.
    batch_size = 100

    for start in range(0, len(ids), batch_size):
        end = start + batch_size

        collection.upsert(
            ids=ids[start:end],
            documents=documents[start:end],
            metadatas=metadatas[start:end],
            embeddings=vectors[start:end]
        )

    print("\nINSURANCE CHROMADB STORAGE")
    print("=" * 50)
    print("Collection:", collection.name)
    print("Stored chunks:", collection.count())
    print("Storage location:", INSURANCE_CHROMA_PATH)

    return collection


if __name__ == "__main__":
    from src.services.insurance.insurance_document_loader import (
        load_all_insurance_documents
    )
    from src.services.insurance.insurance_chunker import (
        chunk_insurance_pages
    )
    from src.services.insurance.insurance_embedding_service import (
        generate_insurance_embeddings
    )

    pages = load_all_insurance_documents()
    chunks = chunk_insurance_pages(pages)
    embeddings = generate_insurance_embeddings(chunks)

    store_insurance_chunks(chunks, embeddings)
