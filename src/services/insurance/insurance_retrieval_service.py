
import re
from difflib import SequenceMatcher
from src.services.embedding_service import load_embedding_model
from src.services.insurance.insurance_chroma_service import (
    get_insurance_collection
)


STOP_WORDS = {
    "what", "is", "the", "for", "a", "an", "of", "in",
    "on", "to", "and", "or", "are", "does", "do",
    "how", "much", "many", "can", "will", "with"
}


def tokenize(text):
    words = re.findall(r"[a-z0-9]+", text.lower())

    return {
        word for word in words
        if word not in STOP_WORDS and len(word) > 1
    }


def calculate_keyword_score(query, text):
    query_words = tokenize(query)
    text_words = tokenize(text)

    if not query_words:
        return 0.0

    return len(query_words.intersection(text_words)) / len(query_words)


def is_ped_waiting_period_query(query):
    query = query.lower()

    ped_terms = (
        "pre-existing disease",
        "pre existing disease",
        "ped"
    )

    waiting_terms = (
        "waiting period",
        "wait period",
        "waiting time"
    )

    return (
        any(term in query for term in ped_terms)
        and any(term in query for term in waiting_terms)
    )

def calculate_relevance_score(query, chunk):
    distance = chunk["distance"]

    semantic_score = max(
        0.0,
        min(1.0, 1.0 - distance / 2)
    )

    keyword_score = calculate_keyword_score(
        query,
        chunk["text"]
    )

    score = 0.80 * semantic_score + 0.20 * keyword_score

    text = chunk["text"].lower()
    metadata = chunk.get("metadata", {})
    section_type = metadata.get("section_type", "general")

    if is_ped_waiting_period_query(query):

        # Standard PED evidence: standard exclusions section.
        if (
            section_type == "standard_exclusions"
            and (
                "pre-existing disease" in text
                or "pre existing disease" in text
            )
        ):
            score += 0.35

        # Explicit standard PED coverage after 36 months.
        if (
            section_type == "standard_exclusions"
            and re.search(
                r"expiry of 36 months.*pre-existing disease",
                text,
                re.IGNORECASE | re.DOTALL
            )
        ):
            score += 0.20

        # Optional buy-back is relevant, but must not be
        # mistaken for the standard policy waiting period.
        if section_type == "optional_cover":
            if (
                "pre-existing disease" in text
                or "pre existing disease" in text
            ):
                score += 0.10

        # Excl02 is a different waiting period.
        if re.search(
            r"specified disease\s*/?\s*procedure.*"
            r"(?:waiting period|excl\s*0?2)",
            text,
            re.IGNORECASE | re.DOTALL
        ):
            score -= 0.30

        # Definitions alone do not establish the waiting period.
        if (
            "definition of pre-existing disease" in text
            and "waiting period" not in text
        ):
            score -= 0.10

    return max(0.0, min(score, 1.0))


def classify_insurance_evidence(text, metadata=None):
    """
    Classify insurance evidence using both text and section metadata.
    """

    metadata = metadata or {}

    normalized = re.sub(r"\s+", " ", text.lower())
    normalized = normalized.replace("-", "-").replace("—", "-")

    section_type = metadata.get("section_type", "general")

    categories = []

    has_ped_code = bool(
        re.search(
            r"pre[\s-]*existing diseases?\s*:\s*code\s*-?\s*excl\s*0?1",
            normalized
        )
    )

    has_ped_treatment = bool(
        re.search(
            r"expenses related to the treatment of a pre-existing disease",
            normalized
        )
    )

    has_standard_36_month_clause = bool(
        re.search(
            r"(?:expiry|after the expiry) of 36 months.*"
            r"pre-existing disease",
            normalized,
            re.DOTALL
        )
    )

    is_optional_section = section_type == "optional_cover"
 # Detect the actual standard PED clause even when
# section metadata incorrectly says optional_cover.

    has_explicit_standard_36_month_clause = bool(
    re.search(
        r"pre-existing disease.*?"
        r"excluded until the expiry of 36 months",
        normalized,
        re.DOTALL
    )
)

    # Optional PED must never be classified as standard PED
    # simply because it contains Code Excl 01.
    if is_optional_section and not has_explicit_standard_36_month_clause:
        if (
            has_ped_code
            or has_ped_treatment
            or "buy back of pre-existing" in normalized
            or "buy-back of pre-existing" in normalized
        ):
            categories.append("optional_ped_modification")

    else:
        # Standard PED clause.
         if (
            has_explicit_standard_36_month_clause
            or has_ped_code
            or (
                has_ped_treatment
                and section_type != "optional_cover"
            )
        ):
            categories.append("standard_ped")

    # Specified disease/procedure waiting period.
    if (
        "specified disease/procedure" in normalized
        or "specified disease / procedure" in normalized
        or re.search(r"code\s*-?\s*excl\s*0?2", normalized)
    ):
        categories.append("specified_disease")

    if not categories:
        categories.append("general")

    return categories


def remove_near_duplicates(chunks, threshold=0.90):
    """
    Remove highly similar chunks from the same document and page.

    Different evidence types are always preserved.
    """

    unique_chunks = []

    for chunk in chunks:

        metadata = chunk["metadata"]

        current_text = " ".join(
            chunk["text"].lower().split()
        )

        is_duplicate = False

        for existing in unique_chunks:

            existing_metadata = existing["metadata"]

            # Compare only chunks from the same document and page.
            if (
                metadata.get("filename")
                != existing_metadata.get("filename")
                or metadata.get("page_number")
                != existing_metadata.get("page_number")
            ):
                continue

            # Never remove different types of evidence.
            if (
                chunk["evidence_type"]
                != existing["evidence_type"]
            ):
                continue

            existing_text = " ".join(
                existing["text"].lower().split()
            )

            similarity = SequenceMatcher(
                None,
                current_text,
                existing_text
            ).ratio()

            if similarity >= threshold:
                is_duplicate = True
                break

        if not is_duplicate:
            unique_chunks.append(chunk)

    return unique_chunks


def add_continuation_bonus(chunks):
    for chunk in chunks:
        chunk["continuation_bonus"] = 0.0

    anchors = [
        chunk for chunk in chunks
        if chunk["relevance_score"] >= 0.60
    ]

    for anchor in anchors:
        metadata = anchor["metadata"]

        anchor_page = metadata.get("page_number")
        anchor_index = metadata.get("chunk_index")
        anchor_filename = metadata.get("filename")

        if anchor_page is None:
            continue

        for candidate in chunks:
            if candidate is anchor:
                continue

            candidate_metadata = candidate["metadata"]

            if candidate_metadata.get("filename") != anchor_filename:
                continue

            candidate_page = candidate_metadata.get("page_number")
            candidate_index = candidate_metadata.get("chunk_index")

            same_page_next = (
                candidate_page == anchor_page
                and isinstance(anchor_index, int)
                and isinstance(candidate_index, int)
                and candidate_index == anchor_index + 1
            )

            next_page_first = (
                candidate_page == anchor_page + 1
                and candidate_index == 0
            )

            if same_page_next or next_page_first:
                candidate["continuation_bonus"] = max(
                    candidate["continuation_bonus"],
                    0.10
                )

    for chunk in chunks:
        chunk["final_score"] = min(
            chunk["relevance_score"] + chunk["continuation_bonus"],
            1.0
        )


def retrieve_insurance_chunks(query, top_k=5, filename=None):

    if not isinstance(query, str) or not query.strip():
        raise ValueError("Query cannot be empty.")

    if not isinstance(top_k, int) or top_k < 1:
        raise ValueError("top_k must be a positive integer.")

    if filename is not None and not filename.strip():
        raise ValueError("Filename cannot be empty.")

    model = load_embedding_model()
    collection = get_insurance_collection()

    total_chunks = collection.count()

    if total_chunks == 0:
        raise ValueError("Insurance collection is empty.")

    query_embedding = model.encode(
        query.strip(),
        convert_to_numpy=True,
        normalize_embeddings=True
    ).tolist()

    candidate_count = min(150, total_chunks)

    filters = None

    if filename:
        filters = {"filename": filename.strip()}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=candidate_count,
        where=filters,
        include=[
            "documents",
            "metadatas",
            "distances"
        ]
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    ids = results.get("ids", [[]])[0]

    retrieved_chunks = []

    for chunk_id, text, metadata, distance in zip(
        ids, documents, metadatas, distances
    ):

        if not text or not metadata:
            continue

        if filename and metadata.get("filename") != filename.strip():
            continue

        chunk = {
            "chunk_id": chunk_id,
            "text": text,
            "metadata": metadata,
            "distance": distance
        }

        chunk["relevance_score"] = calculate_relevance_score(
            query,
            chunk
        )

        chunk["evidence_type"] = classify_insurance_evidence(
         chunk["text"],
         chunk["metadata"]
        )

        retrieved_chunks.append(chunk)

    add_continuation_bonus(retrieved_chunks)

    retrieved_chunks.sort(
        key=lambda item: item["final_score"],
        reverse=True
    )

    retrieved_chunks = remove_near_duplicates(
        retrieved_chunks
    )

    return retrieved_chunks[:top_k]


if __name__ == "__main__":

    question = "What is the waiting period for pre-existing diseases?"

    results = retrieve_insurance_chunks(
        query=question,
        top_k=5
    )

    print("\nINSURANCE RETRIEVAL RESULTS")
    print("=" * 60)
    print("Question:", question)
    print("Final chunks returned:", len(results))

    for index, result in enumerate(results, start=1):

        metadata = result["metadata"]

        print(f"\nRESULT {index}")
        print("-" * 60)
        print("Filename:", metadata.get("filename"))
        print("Product:", metadata.get("product_name"))
        print("Page:", metadata.get("page_number"))
        print("Section:", metadata.get("section_heading"))
        print("Semantic distance:", result["distance"])
        print("Keyword score:", calculate_keyword_score(
            question, result["text"]
        ))
        print("Final relevance score:", result["final_score"])
        print("Text:")
        print(result["text"][:700])
        print("Section type:", metadata.get("section_type"))
        print("Evidence type:", result["evidence_type"])
