
"""Test the complete ChromaDB + Gemini RAG pipeline."""

import sys
from pathlib import Path
from Gemini.source_manager import extract_unique_sources

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.services.chroma_service import get_chroma_collection
from src.services.embedding_service import load_embedding_model
from src.services.retrieval_service import retrieve_from_chroma

from Gemini.gemini_service import generate_medical_answer


def main():

    print("\n========== HEALTHCARE RAG PIPELINE ==========")

    # Step 1: Connect to persistent ChromaDB.
    collection = get_chroma_collection()

    print(f"\nStored medical chunks: {collection.count()}")

    if collection.count() == 0:
        print("No medical documents found in ChromaDB.")
        return

    # Step 2: Load the embedding model.
    print("\nLoading embedding model...")

    model = load_embedding_model()

    # Step 3: Get the user's question.
    question = input("\nEnter your medical question: ").strip()

    if not question:
        print("Question cannot be empty.")
        return

    # Step 4: Retrieve relevant medical chunks.
    print("\nRetrieving relevant medical information...")

    retrieved_chunks = retrieve_from_chroma(
        query=question,
        collection=collection,
        model=model,
        top_k=3,
    )

    if not retrieved_chunks:
        print("No relevant medical information was retrieved.")
        return

    print(f"\nRetrieved {len(retrieved_chunks)} chunks:")

    for index, chunk in enumerate(retrieved_chunks, start=1):
        print(
            f"{index}. {chunk.get('title')} "
            f"| Similarity: {chunk['similarity_score']:.4f}"
        )

    # Step 5: Generate the answer using Gemini.
    print("\nGenerating answer using Gemini...")

    answer = generate_medical_answer(
        question=question,
        retrieved_chunks=retrieved_chunks,
    )

    # Step 6: Display the final answer.
    print("\n========== GEMINI MEDICAL ANSWER ==========")

    print(answer)
    # Display unique source citations separately.
    sources = extract_unique_sources(retrieved_chunks)

    print("\n========== SOURCES USED ==========")

    if not sources:
        print("No verified source links available.")

    for index, source in enumerate(sources, start=1):
       print(f"\n{index}. {source['source']} - {source['title']}")
       print(f"   Link: {source['url']}")

       if source["published_date"]:
           print(f"   Published: {source['published_date']}")

   

    print("\n============================================")


if __name__ == "__main__":
    main()
