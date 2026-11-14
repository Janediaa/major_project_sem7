
import numpy as np

from src.services.embedding_service import load_embedding_model


def generate_insurance_embeddings(chunks):
    """
    Generate embeddings for insurance document chunks
    using the existing Sentence Transformer model.
    """

    if not chunks:
        raise ValueError("No insurance chunks provided.")

    model = load_embedding_model()

    texts = [
        chunk["text"]
        for chunk in chunks
    ]

    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    embeddings = np.asarray(embeddings, dtype=np.float32)

    if embeddings.ndim != 2:
        raise ValueError("Unexpected embedding dimensions.")

    if embeddings.shape[0] != len(chunks):
        raise ValueError("Embedding count does not match chunk count.")

    if not np.isfinite(embeddings).all():
        raise ValueError("Embeddings contain invalid numerical values.")

    print("\nINSURANCE EMBEDDING RESULTS")
    print("=" * 50)
    print("Total chunks:", len(chunks))
    print("Embedding shape:", embeddings.shape)
    print("Embedding dimension:", embeddings.shape[1])
    print("All vectors finite:", np.isfinite(embeddings).all())

    return embeddings


if __name__ == "__main__":
    from src.services.insurance.insurance_document_loader import (
        load_all_insurance_documents
    )
    from src.services.insurance.insurance_chunker import (
        chunk_insurance_pages
    )

    pages = load_all_insurance_documents()
    chunks = chunk_insurance_pages(pages)

    embeddings = generate_insurance_embeddings(chunks)
