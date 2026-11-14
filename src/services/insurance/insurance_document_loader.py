
import json
from pathlib import Path

import pymupdf


# Project directory
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Insurance document directories
INSURANCE_DIR = PROJECT_ROOT / "data" / "insurance_documents"
METADATA_FILE = INSURANCE_DIR / "insurance_sources.json"


def load_insurance_metadata():
    """Load metadata for all insurance documents."""

    if not METADATA_FILE.exists():
        raise FileNotFoundError(
            f"Metadata file not found: {METADATA_FILE}"
        )

    with open(METADATA_FILE, "r", encoding="utf-8") as file:
        metadata = json.load(file)

    documents = metadata.get("documents", [])

    return {
        item["filename"]: item
        for item in documents
    }


def extract_pdf_pages(pdf_path, document_metadata):
    """Extract text from each page of an insurance PDF."""

    extracted_pages = []

    pdf = pymupdf.open(pdf_path)

    try:
        for page_index, page in enumerate(pdf):

            page_text = page.get_text("text").strip()

            if not page_text:
                continue

            page_data = {
                "text": page_text,
                "page_number": page_index + 1,
                "filename": pdf_path.name,
                "insurer": document_metadata.get("insurer", ""),
                "product_name": document_metadata.get("product_name", ""),
                "uin": document_metadata.get("uin", ""),
                "document_version": document_metadata.get(
                    "document_version", ""
                ),
                "effective_date": document_metadata.get(
                    "effective_date", ""
                ),
                "document_type": document_metadata.get(
                    "document_type", "policy_wording"
                )
            }

            extracted_pages.append(page_data)

    finally:
        pdf.close()

    return extracted_pages


def load_all_insurance_documents():
    """Load and extract text from all insurance PDFs."""

    if not INSURANCE_DIR.exists():
        raise FileNotFoundError(
            f"Insurance directory not found: {INSURANCE_DIR}"
        )

    metadata = load_insurance_metadata()

    pdf_files = sorted(INSURANCE_DIR.glob("*.pdf"))

    if not pdf_files:
        raise FileNotFoundError("No insurance PDFs found.")

    all_pages = []

    print("\nINSURANCE DOCUMENT EXTRACTION")
    print("=" * 55)

    for pdf_path in pdf_files:

        document_metadata = metadata.get(pdf_path.name, {})

        print(f"\nProcessing: {pdf_path.name}")

        pages = extract_pdf_pages(
            pdf_path,
            document_metadata
        )

        total_characters = sum(
            len(page["text"]) for page in pages
        )

        all_pages.extend(pages)

        print(f"Pages extracted: {len(pages)}")
        print(f"Characters extracted: {total_characters}")

    print("\n" + "=" * 55)
    print("EXTRACTION COMPLETED")
    print(f"Total PDFs: {len(pdf_files)}")
    print(f"Total pages extracted: {len(all_pages)}")
    print(
        f"Total characters: "
        f"{sum(len(page['text']) for page in all_pages)}"
    )

    return all_pages


if __name__ == "__main__":
    documents = load_all_insurance_documents()

    if documents:
        print("\nFIRST PAGE SAMPLE")
        print("-" * 55)
        print("Filename:", documents[0]["filename"])
        print("Page:", documents[0]["page_number"])
        print("Text preview:")
        print(documents[0]["text"][:500])
