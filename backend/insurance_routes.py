
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from src.services.insurance.insurance_document_loader import (
    INSURANCE_DIR,
    extract_pdf_pages,
)
from src.services.insurance.insurance_chunker import (
    chunk_insurance_pages,
)
from src.services.insurance.insurance_embedding_service import (
    generate_insurance_embeddings,
)
from src.services.insurance.insurance_chroma_service import (
    get_insurance_collection,
    store_insurance_chunks,
)
from src.services.insurance.insurance_retrieval_service import (
    retrieve_insurance_chunks,
)
from src.services.insurance.insurance_answer_service import (
    generate_insurance_answer,
)

router = APIRouter(prefix="/api/insurance", tags=["Insurance"])

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


class InsuranceQuestionRequest(BaseModel):
    question: str = Field(min_length=1)
    filename: str | None = None


@router.post("/upload")
async def upload_insurance_document(
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(400, "Filename is missing.")

    filename = Path(file.filename).name

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are allowed.")

    content = await file.read(MAX_FILE_SIZE + 1)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "PDF must be smaller than 25 MB.")

    if not content.startswith(b"%PDF-"):
        raise HTTPException(400, "Invalid PDF file.")

    INSURANCE_DIR.mkdir(parents=True, exist_ok=True)
    pdf_path = INSURANCE_DIR / filename

    if pdf_path.exists():
        raise HTTPException(
            409,
            "A document with this filename already exists."
        )

    try:
        pdf_path.write_bytes(content)

        # Extract only the newly uploaded PDF.
        pages = extract_pdf_pages(pdf_path, {})

        if not pages:
            raise ValueError(
                "No readable text found in this PDF. "
                "Scanned PDFs are not supported yet."
            )

        chunks = chunk_insurance_pages(pages)

        if not chunks:
            raise ValueError("No usable policy chunks were generated.")

        embeddings = generate_insurance_embeddings(chunks)

        store_insurance_chunks(chunks, embeddings)

        return {
            "success": True,
            "message": "Insurance PDF uploaded and indexed successfully.",
            "filename": filename,
            "total_pages": len(pages),
            "total_chunks": len(chunks),
        }

    except Exception as error:
        # Remove the new file if processing fails.
        pdf_path.unlink(missing_ok=True)

        if isinstance(error, ValueError):
            raise HTTPException(422, str(error)) from error

        print("Insurance upload failed:", error)
        raise HTTPException(
            500,
            "Unable to process the insurance PDF."
        ) from error


@router.get("/documents")
def get_insurance_documents():
    collection = get_insurance_collection()

    result = collection.get(include=["metadatas"])

    documents = {}

    for metadata in result.get("metadatas", []):
        if not metadata:
            continue

        filename = metadata.get("filename")

        if filename and filename not in documents:
            documents[filename] = {
                "filename": filename,
                "product_name": (
                    metadata.get("product_name") or filename
                ),
                "insurer": metadata.get("insurer") or "Not specified",
            }

    return {
        "documents": list(documents.values()),
        "total": len(documents),
    }


@router.post("/ask")
def ask_insurance_question(payload: InsuranceQuestionRequest):

    # "all" means search across every uploaded policy
    filename = payload.filename

    if filename and filename.lower() == "all":
        filename = None

    # Validate filename only for single-policy searches
    if filename:
        safe_filename = Path(filename).name

        if safe_filename != filename:
            raise HTTPException(400, "Invalid document filename.")

        collection = get_insurance_collection()

        existing = collection.get(
            where={"filename": filename},
            include=["metadatas"],
            limit=1,
        )

        if not existing.get("ids"):
            raise HTTPException(
                404,
                "Selected insurance document not found."
            )

    try:
        retrieved_chunks = retrieve_insurance_chunks(
            query=payload.question,
            top_k=5,
            filename=filename,
        )

        if not retrieved_chunks:
            raise HTTPException(
                404,
                "No relevant policy information found."
            )

        answer = generate_insurance_answer(
            question=payload.question,
            retrieved_chunks=retrieved_chunks,
        )

        sources = []

        for chunk in retrieved_chunks:
            metadata = chunk.get("metadata", {})

            sources.append({
                "filename": metadata.get("filename"),
                "page_number": metadata.get("page_number"),
                "section_heading": metadata.get("section_heading"),
            })

        return {
            "success": True,
            "answer": answer,
            "filename": filename or "All Documents",
            "sources": sources,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Insurance question failed:", error)

        raise HTTPException(
            500,
            "Unable to generate an insurance answer right now."
        ) from error