from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.appointment_routes import router as appointment_router
from backend.healthcare_routes import router as healthcare_router
from backend.schemas import RAGAnswerResponse, RAGQuestionRequest


@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Starting Healthcare Navigator API...")

    rag_service = None
    try:
        from backend.rag_service import RAGService

        rag_service = RAGService()
        rag_service.initialize()
    except Exception as error:
        print(f"Warning: RAG service unavailable at startup: {error}")

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
app.include_router(appointment_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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

    rag_service = getattr(request.app.state, "rag_service", None)
    if rag_service is None:
        return {
            "status": "degraded",
            "rag_initialized": False,
            "total_chunks": 0,
        }

    status = rag_service.get_status()

    return {
        "status": "healthy" if status["initialized"] else "degraded",
        "rag_initialized": status["initialized"],
        "total_chunks": status["total_chunks"],
    }


@app.post("/api/rag/ask", response_model=RAGAnswerResponse)
def ask_medical_question(
    payload: RAGQuestionRequest,
    request: Request,
):

    rag_service = getattr(request.app.state, "rag_service", None)
    if rag_service is None:
        raise HTTPException(
            status_code=503,
            detail="RAG service is not initialized.",
        )

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
