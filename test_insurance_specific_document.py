
from src.services.insurance.insurance_retrieval_service import (
    retrieve_insurance_chunks
)

question = "What is the waiting period for pre-existing diseases?"

selected_document = "PolicyWordings_myOptimaSecure-76673175551.pdf"

retrieved_chunks = retrieve_insurance_chunks(
    query=question,
    top_k=5,
    filename=selected_document
)

print("\nSelected document:", selected_document)
print("Retrieved chunks:", len(retrieved_chunks))

for index, chunk in enumerate(retrieved_chunks, start=1):
    metadata = chunk.get("metadata", {})

    print(f"\nResult {index}")
    print("Filename:", metadata.get("filename"))
    print("Page:", metadata.get("page_number"))
    print("Text:", chunk.get("text", "")[:300])

assert all(
    chunk.get("metadata", {}).get("filename") == selected_document
    for chunk in retrieved_chunks
), "ERROR: Other documents were retrieved!"

print("\nSUCCESS: Only the selected document was searched!")
