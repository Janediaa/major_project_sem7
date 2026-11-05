
"""Test semantic retrieval directly from persistent ChromaDB."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.services.embedding_service import load_embedding_model
from src.services.chroma_service import get_chroma_collection
from src.services.retrieval_service import retrieve_from_chroma


def main():
    print("\n========== CHROMADB RETRIEVAL TEST ==========")

    # Connect to the existing persistent database.
    collection = get_chroma_collection()

    print(f"Stored chunks: {collection.count()}")

    # Load the same embedding model used for document indexing.
    model = load_embedding_model()

    questions = [
        "Which factors increase a person's risk of developing type 2 diabetes?",
        "How does tuberculosis spread from an infected person to another person?",
        "What sudden symptoms indicate a possible stroke?",
        "What are the common symptoms of asthma?",
    ]

    for question in questions:
        print("\n" + "=" * 80)
        print(f"QUESTION: {question}")
        print("=" * 80)

        results = retrieve_from_chroma(
            query=question,
            collection=collection,
            model=model,
            top_k=3,
        )

        for rank, result in enumerate(results, start=1):
            print(f"\n{rank}. {result.get('title', 'Unknown title')}")
            print(f"File: {result.get('filename')}")
            print(f"Chunk: {result.get('chunk_index')}")
            print(f"Similarity: {result['similarity_score']:.4f}")

            print(
                "Text:",
                result["text"][:400].replace("\n", " "),
            )

    print("\nChromaDB retrieval test completed.")


if __name__ == "__main__":
    main()
