
from src.services.insurance.insurance_retrieval_service import (
    retrieve_insurance_chunks
)

question = "What is the waiting period for pre-existing diseases?"

policies = [
    (
        "MYOPTIMA SECURE",
        "PolicyWordings_myOptimaSecure-76673175551.pdf"
    ),
    (
        "STAR COMPREHENSIVE",
        "Policy_Star_Comprehensive_Insurance_Policy_V_21_3a414ab104.pdf"
    )
]

for policy_name, filename in policies:

    print("\n" + "=" * 80)
    print(policy_name)
    print("=" * 80)

    results = retrieve_insurance_chunks(
        query=question,
        top_k=10,
        filename=filename
    )

    for i, result in enumerate(results, 1):

        metadata = result["metadata"]

        print(f"\nRESULT {i}")
        print("-" * 60)

        print("Filename:", metadata.get("filename"))
        print("Page:", metadata.get("page_number"))
        print("Chunk:", metadata.get("chunk_index"))
        print("Score:", round(result["final_score"], 4))
        print("Evidence types:", result.get("evidence_type"))
        print("Section:", metadata.get("section_heading"))
        print("Text:\n", result["text"][:1200])
