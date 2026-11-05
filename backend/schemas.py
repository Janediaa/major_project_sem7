
from pydantic import BaseModel, Field, HttpUrl


class RAGQuestionRequest(BaseModel):
    """Request model for asking a medical question."""

    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Medical question asked by the user"
    )


class MedicalSource(BaseModel):
    """Verified source reference returned with an answer."""

    title: str
    organization: str
    url: HttpUrl
    published_date: str | None = None


class RAGAnswerResponse(BaseModel):
    """Response model containing the generated answer and sources."""

    answer: str
    sources: list[MedicalSource]
