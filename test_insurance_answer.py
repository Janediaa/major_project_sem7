
from src.services.insurance.insurance_retrieval_service import (
    retrieve_insurance_chunks
)

from src.services.insurance.insurance_answer_service import (
    generate_insurance_answer
)


question = (
    "What is the standard waiting period for pre-existing "
    "diseases under Star Comprehensive Insurance Policy?"
)

filename = (
    "Policy_Star_Comprehensive_Insurance_Policy_"
    "V_21_3a414ab104.pdf"
)


# STEP 1: Retrieve relevant policy chunks
print("\nSTEP 1: RETRIEVING POLICY EVIDENCE")
print("=" * 65)

chunks = retrieve_insurance_chunks(
    query=question,
    top_k=5,
    filename=filename
)

print("Retrieved chunks:", len(chunks))

for index, chunk in enumerate(chunks, start=1):
    metadata = chunk["metadata"]

    print(f"\nChunk {index}")
    print("Page:", metadata.get("page_number"))
    print("Evidence:", chunk.get("evidence_type"))


# STEP 2: Send retrieved evidence to Gemini
print("\n\nSTEP 2: GENERATING ANSWER WITH GEMINI")
print("=" * 65)

answer = generate_insurance_answer(
    question=question,
    retrieved_chunks=chunks
)

print("\nGEMINI ANSWER")
print("=" * 65)
print(answer)
