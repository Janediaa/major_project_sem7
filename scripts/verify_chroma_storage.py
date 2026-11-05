
"""Verify persistent medical knowledge stored in ChromaDB."""

import sys
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.services.chroma_service import get_chroma_collection


def main():
    print("\n========== CHROMADB STORAGE VERIFICATION ==========")

    # Connect to the existing persistent database.
    collection = get_chroma_collection()

    # Read stored records, including their actual vectors.
    result = collection.get(
        limit=5,
        include=["documents", "metadatas", "embeddings"],
    )

    total_count = collection.count()

    print(f"\nTotal stored chunks: {total_count}")
    print(f"Records inspected: {len(result['ids'])}")

    if not result["ids"]:
        print("No records found!")
        return

    # Verify that vectors exist and have the expected dimensions.
    embeddings = np.asarray(result["embeddings"])

    print(f"Embedding shape: {embeddings.shape}")
    print(f"All vectors finite: {np.isfinite(embeddings).all()}")

    assert embeddings.ndim == 2
    assert embeddings.shape[1] == 384
    assert np.isfinite(embeddings).all()

    # Inspect stored text and metadata.
    for index, chunk_id in enumerate(result["ids"]):
        print(f"\nRecord {index + 1}")
        print(f"ID: {chunk_id}")
        print(f"Filename: {result['metadatas'][index].get('filename')}")
        print(f"Title: {result['metadatas'][index].get('title')}")
        print(f"Chunk index: {result['metadatas'][index].get('chunk_index')}")
        print(f"Text: {result['documents'][index][:200]}...")

    print("\nSUCCESS: Vectors, text and metadata are stored.")
    print("===================================================")


if __name__ == "__main__":
    main()
