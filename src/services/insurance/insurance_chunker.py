
import re


# ---------------------------------------------------------
# HEADING PATTERNS
# ---------------------------------------------------------

HEADING_PATTERNS = [
    r"^\s*(SECTION\s+[IVX0-9]+.{0,120})$",
    r"^\s*(CHAPTER\s+[IVX0-9]+.{0,120})$",

    # Exclusions
    r"^\s*(III\s*[-–—]\s*EXCLUSIONS)\s*$",
    r"^\s*(STANDARD EXCLUSIONS|EXCLUSIONS)\s*$",

    # Other policy sections
    r"^\s*(DEFINITIONS|WAITING PERIOD|"
    r"PRE-EXISTING DISEASES?|CO-PAYMENT|"
    r"ROOM RENT|POLICY CONDITIONS)\s*$",

    # Optional cover
    r"^\s*(OPTIONAL COVER.{0,120})$",
]


# ---------------------------------------------------------
# CLEAN POLICY TEXT
# ---------------------------------------------------------

def clean_policy_text(text):
    """Clean extracted PDF text without removing policy information."""

    if not isinstance(text, str):
        return ""

    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# ---------------------------------------------------------
# NORMALIZE HEADINGS
# ---------------------------------------------------------

def normalize_heading(line):
    """Normalize headings extracted from PDF text."""

    line = re.sub(r"\s+", " ", line).strip()

    # Convert spaced-out capital letters into normal words.
    # Example: S T A N D A R D E X C L U S I O N S
    if re.fullmatch(r"(?:[A-Z]\s+){3,}[A-Z]", line):
        line = line.replace(" ", "")

    return line.strip()


# ---------------------------------------------------------
# DETECT HEADINGS WITH POSITIONS
# ---------------------------------------------------------


def detect_headings_with_positions(text):
    """Detect only known structural headings."""

    headings = []

    lines = text.splitlines()
    position = 0

    for original_line in lines:
        line = normalize_heading(original_line.strip())

        if not line or len(line) > 150:
            position += len(original_line) + 1
            continue

        # Ignore page counters.
        if re.fullmatch(r"\d+\s*/\s*\d+", line):
            position += len(original_line) + 1
            continue

        # Star Comprehensive optional buy-back heading.
        if re.search(
            r"25\.\s*Optional Cover\s*\(Buy Back of Pre-Existing",
            line,
            re.IGNORECASE
        ):
            headings.append({
                "position": position,
                "heading": (
                    "25. Optional Cover "
                    "(Buy Back of Pre-Existing Disease Waiting Period)"
                )
            })

        # Star Comprehensive standard exclusions.
        elif re.search(
            r"III\s*[-–—]\s*EXCLUSIONS",
            line,
            re.IGNORECASE
        ):
            headings.append({
                "position": position,
                "heading": "III - EXCLUSIONS"
            })

        # Other known standalone headings.
        else:
            for pattern in HEADING_PATTERNS:
                if re.match(pattern, line, re.IGNORECASE):
                    candidate = re.match(
                        pattern, line, re.IGNORECASE
                    ).group(1).strip()

                    # Reject references and numbered body text.
                    if "above" not in candidate.lower():
                        headings.append({
                            "position": position,
                            "heading": candidate
                        })
                    break

        position += len(original_line) + 1

    return headings

# ---------------------------------------------------------
# SPLIT TEXT INTO CHUNKS
# ---------------------------------------------------------

def split_text(text, chunk_size=1200, overlap=200):
    """Split text using paragraph and sentence boundaries."""

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("Invalid overlap value")

    text = clean_policy_text(text)

    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):

        end = min(start + chunk_size, len(text))

        if end < len(text):

            # Prefer paragraph boundaries.
            paragraph_boundary = text.rfind("\n", start, end)

            # Otherwise prefer sentence boundaries.
            sentence_boundary = text.rfind(". ", start, end)

            boundary = max(
                paragraph_boundary,
                sentence_boundary
            )

            if boundary > start + chunk_size // 2:
                end = boundary + 1

        chunk = text[start:end].strip()

        if chunk:
            chunks.append({
                "text": chunk,
                "position": start
            })

        if end >= len(text):
            break

        start = max(end - overlap, start + 1)

    return chunks


# ---------------------------------------------------------
# CLASSIFY SECTION TYPE
# ---------------------------------------------------------

def get_section_type(heading):
    """Classify the detected section heading."""

    heading = heading.lower()

    if "optional cover" in heading or "buy back" in heading:
        return "optional_cover"

    if "exclusion" in heading:
        return "standard_exclusions"

    if "waiting period" in heading:
        return "waiting_period"

    if "definition" in heading:
        return "definitions"

    return "general"


# ---------------------------------------------------------
# CHUNK INSURANCE PAGES
# ---------------------------------------------------------

def chunk_insurance_pages(pages, chunk_size=1200, overlap=200):
    """
    Create insurance chunks with page and section metadata.

    Section context is carried forward across pages.
    """

    all_chunks = []

    # Active section is maintained across pages.
    current_heading = "General Policy Information"

    for page in pages:

        text = clean_policy_text(page.get("text", ""))

        if not text:
            continue

        headings = detect_headings_with_positions(text)

        page_chunks = split_text(
            text,
            chunk_size=chunk_size,
            overlap=overlap
        )

        heading_index = 0

        for index, chunk in enumerate(page_chunks):

            chunk_position = chunk["position"]
            chunk_text = chunk["text"]

            # Update the active section based on headings
            # appearing before the start of this chunk.
            while (
                heading_index < len(headings)
                and headings[heading_index]["position"] <= chunk_position
            ):

                current_heading = headings[heading_index]["heading"]
                heading_index += 1

            chunk_data = {
                "text": chunk_text,

                "filename": page.get("filename", ""),
                "insurer": page.get("insurer", ""),
                "product_name": page.get("product_name", ""),
                "uin": page.get("uin", ""),
                "document_version": page.get("document_version", ""),
                "effective_date": page.get("effective_date", ""),

                "document_type": page.get(
                    "document_type",
                    "policy_wording"
                ),

                "page_number": page.get("page_number"),

                "section_heading": current_heading,
                "section_type": get_section_type(current_heading),

                "chunk_index": index
            }

            all_chunks.append(chunk_data)

    return all_chunks


# ---------------------------------------------------------
# TEST CHUNKING
# ---------------------------------------------------------

if __name__ == "__main__":

    from src.services.insurance.insurance_document_loader import (
        load_all_insurance_documents
    )

    pages = load_all_insurance_documents()

    chunks = chunk_insurance_pages(pages)

    print("\nINSURANCE CHUNKING RESULTS")
    print("=" * 55)

    print("Total pages:", len(pages))
    print("Total chunks:", len(chunks))

    if chunks:

        print("\nFIRST CHUNK SAMPLE")
        print("-" * 55)

        print("Filename:", chunks[0]["filename"])
        print("Page:", chunks[0]["page_number"])
        print("Section:", chunks[0]["section_heading"])
        print("Section type:", chunks[0]["section_type"])

        print("Text:")
        print(chunks[0]["text"][:500])
