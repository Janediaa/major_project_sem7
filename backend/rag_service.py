from src.services.embedding_service import load_embedding_model
from src.services.chroma_service import get_chroma_collection
from src.services.retrieval_service import retrieve_from_chroma

from Gemini.gemini_service import generate_medical_answer
from Gemini.source_manager import extract_unique_sources


class RAGService:

    def __init__(self):
        self.embedding_model = None
        self.collection = None

    def initialize(self):

        print("Loading medical embedding model...")
        self.embedding_model = load_embedding_model()

        print("Connecting to ChromaDB...")
        self.collection = get_chroma_collection()

        total_chunks = self.collection.count()

        print(f"ChromaDB connected successfully.")
        print(f"Medical chunks available: {total_chunks}")

        if total_chunks == 0:
            raise RuntimeError("Medical knowledge base is empty.")

    def ask_question(self, question: str) -> dict:

        if self.embedding_model is None or self.collection is None:
            raise RuntimeError("RAG service has not been initialized.")

        retrieved_chunks = retrieve_from_chroma(
            query=question,
            collection=self.collection,
            model=self.embedding_model,
            top_k=3,
        )

        if not retrieved_chunks:
            raise ValueError("No relevant medical information was found.")

        answer = generate_medical_answer(
            question=question,
            retrieved_chunks=retrieved_chunks,
        )

        raw_sources = extract_unique_sources(retrieved_chunks)

        sources = [
        {
            "title": source["title"],
            "organization": source["source"],
            "url": source["url"],
            "published_date": source.get("published_date"),
       }
         for source in raw_sources
                        ]

        return {
            "answer": answer,
            "sources": sources,
        }

    def get_status(self) -> dict:

        if self.collection is None:
            return {
                "initialized": False,
                "total_chunks": 0,
            }

        return {
            "initialized": True,
            "total_chunks": self.collection.count(),
        }
