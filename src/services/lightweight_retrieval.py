"""Pure-Python lexical retrieval over bundled WHO medical documents."""

from collections import Counter
import math
import re

from src.services.document_loader import load_all_documents
from src.services.text_chunker import chunk_text


_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "common", "do",
    "does", "for", "from", "how", "in", "is", "it", "of", "on", "or", "some",
    "that", "the", "their", "this", "to", "what", "when", "which", "who",
    "with", "you", "your",
}

_SYNONYMS = {
    "pressure": "hypertension",
    "sugar": "diabetes",
    "diabetic": "diabetes",
    "tb": "tuberculosis",
    "heart": "cardiovascular",
    "cardiac": "cardiovascular",
    "breathing": "asthma",
    "wheezing": "asthma",
    "lung": "pulmonary",
    "sad": "depression",
    "mental": "depression",
    "aids": "hiv",
    "tumor": "cancer",
    "tumour": "cancer",
}


def _tokenize(text: str) -> list[str]:
    """Extract normalized tokens with lightweight medical synonym expansion."""
    raw_tokens = re.findall(r"[a-z0-9]{2,}", text.lower())
    tokens: list[str] = []
    for token in raw_tokens:
        if token in _STOPWORDS:
            continue
        tokens.append(token)
        if token in _SYNONYMS:
            tokens.append(_SYNONYMS[token])
    return tokens


class LightweightMedicalRetriever:
    """BM25-style lexical retriever over WHO fact sheets without ML dependencies."""

    def __init__(self, chunk_size: int = 800, overlap: int = 120):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.chunks: list[dict] = []
        self._doc_term_freqs: list[Counter[str]] = []
        self._title_terms: list[set[str]] = []
        self._idf: dict[str, float] = {}
        self._avg_doc_len: float = 1.0

    def build_index(self) -> int:
        """Load WHO documents, split into chunks, and compute BM25 statistics."""
        documents = load_all_documents()
        self.chunks = []
        self._doc_term_freqs = []
        self._title_terms = []

        doc_freq: Counter[str] = Counter()
        total_len = 0

        for document in documents:
            text_chunks = chunk_text(
                document["text"],
                chunk_size=self.chunk_size,
                overlap=self.overlap,
            )
            title = document.get("title", "")
            title_tokens = set(_tokenize(title))

            for idx, text in enumerate(text_chunks):
                chunk_record = {
                    "id": f"{document['filename']}::{idx}",
                    "filename": document["filename"],
                    "chunk_index": idx,
                    "title": title,
                    "source": document.get("source", "World Health Organization"),
                    "url": document.get("url", ""),
                    "published_date": document.get("published_date"),
                    "text": text,
                }
                tokens = _tokenize(f"{title} {text}")
                tf = Counter(tokens)
                self.chunks.append(chunk_record)
                self._doc_term_freqs.append(tf)
                self._title_terms.append(title_tokens)
                total_len += max(len(tokens), 1)

                for term in tf:
                    doc_freq[term] += 1

        total_chunks = len(self.chunks)
        self._avg_doc_len = (total_len / total_chunks) if total_chunks else 1.0
        self._idf = {
            term: math.log(1.0 + (total_chunks - df + 0.5) / (df + 0.5))
            for term, df in doc_freq.items()
        }
        return total_chunks

    def retrieve(self, query: str, top_k: int = 3) -> list[dict]:
        """Return top_k matching WHO medical chunks for the user query."""
        if not isinstance(query, str) or not query.strip():
            raise ValueError("query must not be empty")
        if not self.chunks:
            return []

        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        k1 = 1.5
        b = 0.75
        scored: list[tuple[float, int]] = []

        for idx, tf in enumerate(self._doc_term_freqs):
            doc_len = sum(tf.values()) or 1
            score = 0.0
            title_overlap = 0

            for term in set(query_tokens):
                freq = tf.get(term, 0)
                if freq > 0:
                    idf = self._idf.get(term, 0.0)
                    denom = freq + k1 * (1.0 - b + b * (doc_len / self._avg_doc_len))
                    score += idf * ((freq * (k1 + 1.0)) / denom)
                if term in self._title_terms[idx]:
                    title_overlap += 1

            # Boost chunks belonging to a directly matching WHO topic title.
            if title_overlap:
                score += 2.0 * title_overlap

            if score > 0.0:
                scored.append((score, idx))

        scored.sort(key=lambda item: item[0], reverse=True)
        if not scored:
            return []

        max_score = scored[0][0]
        results = []
        for score, idx in scored[:top_k]:
            chunk = self.chunks[idx].copy()
            chunk["similarity_score"] = round(score / max_score, 4) if max_score else 0.0
            results.append(chunk)
        return results
