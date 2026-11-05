
"""Index medical HTML/TXT documents into persistent ChromaDB."""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.services.document_loader import load_all_documents
from src.services.embedding_service import load_embedding_model
from src.services.knowledge_base import index_documents
from src.services.chroma_service import (
    get_chroma_collection,
    get_collection_count,
)


def main():
    print("\n========== MEDICAL KNOWLEDGE INDEXING ==========")

    # 1. Load existing medical documents.
    documents = load_all_documents()

    print(f"\nDocuments loaded: {len(documents)}")

    if not documents:
        print("No medical documents found.")
        return

    for document in documents:
        print(f" - {document['filename']}")

    # 2. Load embedding model.
    print("\nLoading Sentence Transformer model...")

    model = load_embedding_model()

    # 3. Connect to persistent ChromaDB.
    print("\nConnecting to ChromaDB...")

    collection = get_chroma_collection()

    previous_count = get_collection_count(collection)

    print(f"Existing stored chunks: {previous_count}")

    # 4. Chunk, embed, and store documents.
    print("\nIndexing documents...")

    chunks = index_documents(
        documents=documents,
        model=model,
        collection=collection,
    )

    # 5. Verify the final database count.
    final_count = get_collection_count(collection)

    print("\n========== INDEXING SUMMARY ==========")
    print(f"Documents processed: {len(documents)}")
    print(f"Chunks generated: {len(chunks)}")
    print(f"Chunks before indexing: {previous_count}")
    print(f"Chunks after indexing: {final_count}")
    print("======================================")

    print("\nIndexing completed successfully!")


if __name__ == "__main__":
    main()
