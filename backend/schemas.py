from pydantic import BaseModel, Field, HttpUrl


class RAGQuestionRequest(BaseModel):
    """Request model for asking a medical question."""

    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Medical question asked by the user",
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


class AppointmentCreateRequest(BaseModel):
    """Request body for booking a new doctor appointment."""

    doctor_id: int = Field(..., gt=0)
    appointment_date: str = Field(..., min_length=10, max_length=10, description="YYYY-MM-DD")
    appointment_time: str = Field(..., min_length=4, max_length=12, description="HH:MM or HH:MM AM/PM")
    patient_name: str = Field(..., min_length=1, max_length=120)
    patient_phone: str | None = Field(default=None, max_length=30)
    patient_age: int | None = Field(default=None, ge=0, le=120)
    patient_sex: str | None = Field(default=None, max_length=20)
    reason: str | None = Field(default=None, max_length=500)


class AppointmentRescheduleRequest(BaseModel):
    """Request body for rescheduling an existing appointment."""

    appointment_date: str = Field(..., min_length=10, max_length=10, description="YYYY-MM-DD")
    appointment_time: str = Field(..., min_length=4, max_length=12, description="HH:MM or HH:MM AM/PM")
