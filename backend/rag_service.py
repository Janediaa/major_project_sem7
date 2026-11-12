from Gemini.gemini_service import (
    generate_general_medical_answer,
    generate_medical_answer,
    has_gemini_api_key,
)
from Gemini.source_manager import extract_unique_sources
from src.services.lightweight_retrieval import LightweightMedicalRetriever


class RAGService:
    """Medical Q&A service using ChromaDB vectors or lightweight WHO retrieval."""

    def __init__(self):
        self.embedding_model = None
        self.collection = None
        self.lightweight_retriever: LightweightMedicalRetriever | None = None
        self.total_chunks: int = 0
        self.mode: str | None = None

    def _try_init_chroma(self) -> bool:
        """Attempt to initialize ChromaDB + SentenceTransformer when available."""
        try:
            from src.services.chroma_service import get_chroma_collection
            from src.services.embedding_service import load_embedding_model

            collection = get_chroma_collection()
            total_chunks = collection.count()
            if total_chunks == 0:
                return False

            self.embedding_model = load_embedding_model()
            self.collection = collection
            self.total_chunks = total_chunks
            self.mode = "chroma"
            return True
        except Exception as error:
            print(f"ChromaDB unavailable, using lightweight WHO retrieval: {error}")
            self.embedding_model = None
            self.collection = None
            return False

    def initialize(self):
        """Initialize the medical retriever and verify GEMINI_API_KEY is configured."""
        if not has_gemini_api_key():
            raise RuntimeError("GEMINI_API_KEY is not configured.")

        if self._try_init_chroma():
            print(f"ChromaDB connected successfully ({self.total_chunks} chunks).")
            return

        retriever = LightweightMedicalRetriever()
        total_chunks = retriever.build_index()
        if total_chunks == 0:
            raise RuntimeError("Medical knowledge base is empty.")

        self.lightweight_retriever = retriever
        self.total_chunks = total_chunks
        self.mode = "lightweight"
        print(f"Lightweight WHO retriever initialized ({self.total_chunks} chunks).")

    def ask_question(self, question: str) -> dict:
        """Retrieve relevant WHO passages and generate a Gemini medical answer."""
        if self.mode is None:
            raise RuntimeError("RAG service has not been initialized.")

        if not isinstance(question, str) or not question.strip():
            raise ValueError("Question must not be empty.")

        if self.mode == "chroma":
            from src.services.retrieval_service import retrieve_from_chroma

            retrieved_chunks = retrieve_from_chroma(
                query=question,
                collection=self.collection,
                model=self.embedding_model,
                top_k=3,
            )
        else:
            retrieved_chunks = self.lightweight_retriever.retrieve(
                query=question,
                top_k=3,
            )

        if not retrieved_chunks:
            answer = generate_general_medical_answer(question=question)
            return {
                "answer": answer,
                "sources": [],
            }

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
        """Return initialization state and indexed chunk count."""
        if self.mode is None:
            return {
                "initialized": False,
                "total_chunks": 0,
            }

        total_chunks = (
            self.collection.count()
            if self.mode == "chroma" and self.collection is not None
            else self.total_chunks
        )
        return {
            "initialized": True,
            "total_chunks": total_chunks,
        }
