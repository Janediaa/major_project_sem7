from collections import Counter

from src.services.chroma_service import get_chroma_collection

collection = get_chroma_collection()

results = collection.get(
    include=["metadatas"],
)

document_counts = Counter(
    metadata.get("filename", "Unknown")
    for metadata in results["metadatas"]
)

print("\n========== DOCUMENT CHUNK COUNTS ==========")

for filename, count in sorted(document_counts.items()):
    print(f"{filename}: {count} chunks")

print("\nTotal documents:", len(document_counts))
print("Total chunks:", collection.count())