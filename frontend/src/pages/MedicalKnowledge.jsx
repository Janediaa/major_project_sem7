import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  FileText,
  SendHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import PageHeader from "../components/common/PageHeader";
import Notice from "../components/common/Notice";
import { askMedicalQuestion } from "../services/ragService";
import { RAG_SUGGESTIONS, RAG_TOPICS } from "../data/sampleData";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function Sources({ sources }) {
  if (!sources?.length) return null;

  return (
    <div className="sources">
      <h4>
        <FileText size={15} aria-hidden="true" /> Sources
      </h4>

      <ul>
        {sources.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              <span>
                <strong>{s.title}</strong>
                <small>
                  {s.organization}
                  {s.published ? ` · Published ${formatDate(s.published)}` : ""}
                </small>
              </span>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MedicalKnowledge() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const endRef = useRef(null);
  const areaRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  const resize = () => {
    const el = areaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const send = async (text) => {
    const question = text.trim();

    if (!question || loading) return;

    setMessages((m) => [
      ...m,
      {
        id: `u${Date.now()}`,
        role: "user",
        text: question,
      },
    ]);

    setInput("");
    requestAnimationFrame(resize);
    setLoading(true);

    try {
      const res = await askMedicalQuestion(question);

      setMessages((m) => [
        ...m,
        {
          id: `a${Date.now()}`,
          role: "ai",
          text: res.answer,
          sources: res.sources,
        },
      ]);
    } catch (error) {
      console.error("RAG API Error:", error);

      setMessages((m) => [
        ...m,
        {
          id: `e${Date.now()}`,
          role: "ai",
          error: true,
          text:
            error.message ||
            "Unable to connect to the medical assistant. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="page page--chat">
      <PageHeader
        title="Medical Knowledge"
        description="Ask a health question. Answers are generated using relevant medical documents, with supporting sources shown below."
        actions={
          <button
            className="btn btn--ghost"
            onClick={() => setMessages([])}
            disabled={!messages.length && !loading}
          >
            <Trash2 size={16} /> Clear chat
          </button>
        }
      />

      <div className="chat-layout">
        <section className="chat" aria-label="Medical knowledge chat">
          <div className="chat__banner">
            <Notice tone="info">
              Answers are generated using your medical knowledge base and Google
              Gemini. Supporting sources are displayed below each answer.
            </Notice>
          </div>

          <div className="chat__scroll" role="log" aria-live="polite">
            {messages.length === 0 && !loading ? (
              <div className="chat-empty">
                <span className="chat-empty__icon">
                  <Sparkles size={26} aria-hidden="true" />
                </span>

                <h2>What would you like to know?</h2>

                <p>
                  Ask about a condition, its symptoms, how it spreads or how it
                  is managed.
                </p>

                <div className="suggest-grid">
                  {RAG_SUGGESTIONS.map((q) => (
                    <button key={q} className="suggest" onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="messages">
                {messages.map((m) => (
                  <li key={m.id} className={`msg msg--${m.role}`}>
                    {m.role === "ai" && (
                      <span className="msg__avatar" aria-hidden="true">
                        <BookOpen size={16} />
                      </span>
                    )}

                    <div className={`bubble ${m.error ? "bubble--error" : ""}`}>
                      <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.text}
                        </ReactMarkdown>
                      </div>
                      <Sources sources={m.sources} />
                    </div>
                  </li>
                ))}

                {loading && (
                  <li className="msg msg--ai">
                    <span className="msg__avatar" aria-hidden="true">
                      <BookOpen size={16} />
                    </span>

                    <div
                      className="bubble bubble--loading"
                      role="status"
                      aria-label="Preparing an answer"
                    >
                      <span className="dots">
                        <i />
                        <i />
                        <i />
                      </span>
                      <small>Searching the knowledge base…</small>
                    </div>
                  </li>
                )}

                <li ref={endRef} aria-hidden="true" />
              </ul>
            )}
          </div>

          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              ref={areaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                resize();
              }}
              onKeyDown={onKeyDown}
              placeholder="Ask a medical question…"
              aria-label="Medical question"
            />

            <button
              className="composer__send"
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send question"
            >
              <SendHorizontal size={19} />
            </button>
          </form>

          <p className="chat__fine">
            General information only, not medical advice or a diagnosis. Ask a
            doctor about your own health.
          </p>
        </section>

        <aside className="panel about" aria-label="About this assistant">
          <h2 className="panel__title">Knowledge base</h2>

          <p>Documents from the World Health Organization on:</p>

          <div className="chip-row">
            {RAG_TOPICS.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>

          <h3>How answers are made</h3>

          <ol className="plain-steps">
            <li>Your question is matched to the most relevant passages.</li>
            <li>The assistant generates an answer using those passages.</li>
            <li>The documents used are listed under the answer.</li>
          </ol>
        </aside>
      </div>
    </div>
  );
}
