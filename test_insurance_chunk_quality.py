
from src.services.insurance.insurance_document_loader import (
    load_all_insurance_documents
)

from src.services.insurance.insurance_chunker import (
    chunk_insurance_pages
)


pages = load_all_insurance_documents()

chunks = chunk_insurance_pages(pages)

target_filename = "PolicyWordings_myOptimaSecure-76673175551.pdf"

print("\n========== PED CHUNK INSPECTION ==========\n")

for chunk in chunks:

    if chunk["filename"] != target_filename:
        continue

    text = chunk["text"].lower()

    if (
        "pre-existing disease" in text
        or "pre existing disease" in text
        or "24 months" in text
    ):

        print("\nPage:", chunk["page_number"])
        print("Chunk index:", chunk["chunk_index"])
        print("Section:", chunk["section_heading"])
        print("-" * 60)
        print(chunk["text"][:1200])
        print("=" * 60)
