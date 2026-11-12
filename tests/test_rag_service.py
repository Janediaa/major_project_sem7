"""Tests for lightweight WHO retrieval, stdlib HTML extraction, and chatbot API routes."""

from fastapi.testclient import TestClient

from backend.main import app
from backend.rag_service import RAGService
import Gemini.gemini_service as gemini_service
import src.services.document_loader as document_loader
from src.services.lightweight_retrieval import LightweightMedicalRetriever


def test_stdlib_html_fallback_extracts_main_text(monkeypatch):
    html = """
    <html>
      <head><script>console.log("ignore")</script><style>body{}</style></head>
      <body>
        <header>Nav header</header>
        <main>
          <h1>Diabetes</h1>
          <p>Diabetes is a chronic disease.</p>
        </main>
        <footer>Copyright WHO</footer>
      </body>
    </html>
    """
    monkeypatch.setattr(document_loader, "BeautifulSoup", None)
    text = document_loader.extract_html_text(html)
    assert "Diabetes" in text
    assert "Diabetes is a chronic disease." in text
    assert "Nav header" not in text
    assert "Copyright WHO" not in text
    assert "console.log" not in text


def test_lightweight_retriever_indexes_and_matches_who_topics():
    retriever = LightweightMedicalRetriever()
    total_chunks = retriever.build_index()

    assert total_chunks > 10

    diabetes_hits = retriever.retrieve("What are the symptoms of diabetes?", top_k=3)
    assert diabetes_hits
    assert any("diabetes" in hit["title"].lower() for hit in diabetes_hits)
    assert diabetes_hits[0]["url"].startswith("https://www.who.int/")

    asthma_hits = retriever.retrieve("wheezing and asthma triggers", top_k=3)
    assert asthma_hits
    assert any("asthma" in hit["title"].lower() for hit in asthma_hits)

    unrelated_hits = retriever.retrieve("zxqvblorp nonexistenttoken", top_k=3)
    assert unrelated_hits == []


def test_rag_service_grounded_and_general_paths(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-value")
    monkeypatch.setattr(
        "backend.rag_service.generate_medical_answer",
        lambda question, retrieved_chunks: f"Grounded answer for: {question}",
    )
    monkeypatch.setattr(
        "backend.rag_service.generate_general_medical_answer",
        lambda question: f"General answer for: {question}",
    )

    service = RAGService()
    monkeypatch.setattr(service, "_try_init_chroma", lambda: False)
    service.initialize()

    status = service.get_status()
    assert status["initialized"] is True
    assert status["total_chunks"] > 0

    grounded = service.ask_question("What are the symptoms of diabetes?")
    assert grounded["answer"].startswith("Grounded answer for:")
    assert grounded["sources"]
    assert grounded["sources"][0]["organization"] == "World Health Organization"

    general = service.ask_question("zxqvblorp nonexistenttoken")
    assert general["answer"].startswith("General answer for:")
    assert general["sources"] == []


def test_rag_endpoints_via_test_client(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-value")
    monkeypatch.setattr(
        gemini_service,
        "_generate_content_with_fallback",
        lambda prompt, max_retries=3: "## Hypertension\n- High **blood pressure** check.",
    )

    with TestClient(app) as client:
        health_resp = client.get("/api/health")
        assert health_resp.status_code == 200
        health = health_resp.json()
        assert health["status"] == "healthy"
        assert health["rag_initialized"] is True
        assert health["total_chunks"] > 0

        ask_resp = client.post(
            "/api/rag/ask",
            json={"question": "How is high blood pressure detected?"},
        )
        assert ask_resp.status_code == 200
        payload = ask_resp.json()
        assert "Hypertension" in payload["answer"]
        assert payload["sources"]
        assert payload["sources"][0]["url"].startswith("https://www.who.int/")

        bad_resp = client.post("/api/rag/ask", json={"question": ""})
        assert bad_resp.status_code == 422
