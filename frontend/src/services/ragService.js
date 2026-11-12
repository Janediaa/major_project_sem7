const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');

export async function askMedicalQuestion(question) {
  const response = await fetch(`${API_BASE_URL}/api/rag/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      errorData.detail || `Request failed with status ${response.status}`
    );
  }

  const data = await response.json();

  return {
    answer: data.answer,
    sources: (data.sources || []).map((source) => ({
      id: source.url,
      title: source.title,
      organization: source.organization,
      url: source.url,
      published: source.published_date,
    })),
    isSample: false,
  };
}
