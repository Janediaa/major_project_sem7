
"""Gemini-powered answer generation for Insurance RAG."""

from Gemini.gemini_service import _generate_content_with_fallback


def build_insurance_prompt(
    question: str,
    retrieved_chunks: list[dict],
) -> str:
    """Build a grounded prompt using retrieved insurance policy clauses."""

    if not isinstance(question, str) or not question.strip():
        raise ValueError("question must not be empty")

    if not retrieved_chunks:
        raise ValueError("No insurance policy context was retrieved.")

    context_parts = []

    for index, chunk in enumerate(retrieved_chunks, start=1):
        metadata = chunk.get("metadata", {})

        filename = metadata.get("filename", "Unknown document")
        insurer = metadata.get("insurer") or "Not specified"
        product = metadata.get("product_name") or filename
        page = metadata.get("page_number")
        evidence_type = chunk.get("evidence_type", ["general"])

        text = chunk.get("text", "")

        if not isinstance(text, str) or not text.strip():
            continue

        page_reference = (
            str(page) if page is not None else "Not available"
        )

        context_parts.append(
            f"""
POLICY SOURCE {index}
Insurer: {insurer}
Product: {product}
Document: {filename}
Page: {page_reference}
Evidence Type: {evidence_type}

Policy Clause:
{text}
"""
        )

    if not context_parts:
        raise ValueError("Retrieved chunks contain no usable policy text.")

    context = "\n".join(context_parts)

    return f"""
You are an Insurance Policy Information Assistant
for the Healthcare Navigator application.

Your job is to explain Indian health insurance policies
accurately using the supplied policy documents.

STRICT GROUNDING RULES:

1. Answer ONLY using the supplied policy context.
2. Never invent policy terms, benefits, exclusions,
   waiting periods, premiums, limits or conditions.
3. If the context does not contain sufficient information,
   clearly state that the information is unavailable.
4. Never combine clauses from different insurance products.
5. If the user asks about a particular policy, answer
   only from that policy's retrieved evidence.
6. Explain insurance terminology in simple language.
7. Use headings and bullet points where appropriate.
8. Never guarantee claim approval or rejection.

IMPORTANT WAITING PERIOD RULES:

9. Distinguish Pre-Existing Disease (PED) waiting periods
   from Specified Disease/Procedure waiting periods.
10. Standard PED clauses generally appear under Code Excl01.
11. Specified Disease/Procedure clauses generally appear
    under Code Excl02.
12. Never use an Excl02 waiting period as the PED waiting period.
13. Distinguish standard policy conditions from optional
    add-ons, buybacks and modifications.
14. If an optional benefit reduces a waiting period,
    clearly explain that it applies only when the benefit
    has actually been selected and accepted, as supported
    by the supplied policy context.
15. Do not present an optional waiting period as the
    standard waiting period.
16. If standard and optional clauses appear together,
    explain both separately.
17. If the policy schedule is needed to determine which
    option applies to an individual, explicitly mention this.
18. EVIDENCE PRIORITY FOR PED QUESTIONS:

    a. First identify the standard PED clause under Code Excl01.

    b. Determine the standard waiting period from the
       standard policy wording, not from an optional
       buyback or modification clause.

    c. Treat clauses under Optional Cover, Buy Back,
       Modification or Reduction of PED Waiting Period
       as optional benefits.

    d. Never report an optional waiting period as the
       standard waiting period.

    e. If the standard clause is missing from the
       retrieved context, clearly state that the standard
       waiting period cannot be confirmed from the
       available evidence.

    f. Explain the optional waiting period separately
       and mention its conditions.

    g. If standard and optional clauses contradict each
       other, do not guess. Explain the distinction and
       cite both clauses.

CITATION RULES:

19. Cite every important policy-specific statement.
20. Use this exact citation format:
    [Policy: Product Name, Page: 30]
21. Use only the product names and page numbers supplied
    in the retrieved context.
22. Never invent page numbers or citations.
23. If the product name is unavailable, cite the filename.
24. If multiple policies support an answer, cite them separately.

RETRIEVED POLICY CONTEXT:

<context>
{context}
</context>

USER QUESTION:

{question.strip()}

Return the answer in clean Markdown.
"""


def generate_insurance_answer(
    question: str,
    retrieved_chunks: list[dict],
    max_retries: int = 3,
) -> str:
    """Generate an insurance answer grounded in retrieved policy clauses."""

    prompt = build_insurance_prompt(
        question=question,
        retrieved_chunks=retrieved_chunks,
    )

    return _generate_content_with_fallback(
        prompt=prompt,
        max_retries=max_retries,
    )
