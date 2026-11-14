
from src.services.insurance.insurance_document_loader import (
    load_all_insurance_documents
)
from src.services.insurance.insurance_chunker import (
    chunk_insurance_pages
)

pages = load_all_insurance_documents()
chunks = chunk_insurance_pages(pages)

target = "Policy_Star_Comprehensive_Insurance_Policy_V_21_3a414ab104.pdf"

print("\nSTAR COMPREHENSIVE SECTION CHECK")
print("=" * 75)

for chunk in chunks:
    if (
        chunk["filename"] == target
        and chunk["page_number"] in [30, 31]
    ):
        print("\nPage:", chunk["page_number"])
        print("Chunk:", chunk["chunk_index"])
        print("Section:", chunk["section_heading"])
        print("Section type:", chunk["section_type"])
        print("Text:", chunk["text"][:350])
        print("-" * 75)
