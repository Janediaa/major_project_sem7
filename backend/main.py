

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.rag_service import RAGService
from backend.schemas import RAGQuestionRequest, RAGAnswerResponse
from backend.healthcare_routes import router as healthcare_router


@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Starting Healthcare Navigator API...")

    rag_service = RAGService()
    rag_service.initialize()

    app.state.rag_service = rag_service

    print("Healthcare Navigator API is ready!")

    yield

    print("Shutting down Healthcare Navigator API...")


app = FastAPI(
    title="Healthcare Navigator API",
    description="API for the Agentic AI Healthcare Navigator",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(healthcare_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Healthcare Navigator API is running."
    }


@app.get("/api/health")
def health_check(request: Request):
    """Check whether the RAG service is initialized."""

    rag_service = request.app.state.rag_service
    status = rag_service.get_status()

    return {
        "status": "healthy" if status["initialized"] else "unavailable",
        "rag_initialized": status["initialized"],
        "total_chunks": status["total_chunks"],
    }


@app.post("/api/rag/ask", response_model=RAGAnswerResponse)
def ask_medical_question(
    payload: RAGQuestionRequest,
    request: Request,
):

    rag_service = request.app.state.rag_service

    try:
        result = rag_service.ask_question(payload.question)
        return result

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error

    except Exception as error:
        print(f"RAG request failed: {error}")

        raise HTTPException(
            status_code=500,
            detail="Unable to generate a medical answer right now. Please try again.",
        ) from error
