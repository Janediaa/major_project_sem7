import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Check,
  CircleMinus,
  Minus,
  Send,
  Upload,
  FileText,
  ChevronDown,
  X,
  LoaderCircle,
} from "lucide-react";

import PageHeader from "../components/common/PageHeader";
import SampleBadge from "../components/common/SampleBadge";
import {
  CLAIM_STEPS,
  INSURANCE_SUGGESTIONS,
  POLICIES,
} from "../data/sampleData";

const API_BASE_URL = "http://127.0.0.1:8000";

const STATUS_ICON = {
  Covered: Check,
  Limited: Minus,
  "Not covered": CircleMinus,
};

export default function Insurance() {
  const [policyId, setPolicyId] = useState(POLICIES[0].id);
  const [text, setText] = useState("");
  const [activeModule, setActiveModule] = useState("assistant");
  // Policy Finder states
  const [finderPolicies, setFinderPolicies] = useState([]);
  const [finderLoading, setFinderLoading] = useState(false);
  const [finderError, setFinderError] = useState("");
  const [finderSearch, setFinderSearch] = useState("");
  const [finderCategory, setFinderCategory] = useState("all");
  // Policy Finder filters
  const [finderFilters, setFinderFilters] = useState({
    min_sum_insured: "",
    max_sum_insured: "",
    copay: "",
    deductible: "",
    initial_waiting: "",
    ped_waiting: "",
  });

  const [filterOptions, setFilterOptions] = useState({});
  // Selected policy details
  const [selectedFinderPolicy, setSelectedFinderPolicy] = useState(null);
  const [policyDetails, setPolicyDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // Backend documents
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState("");

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);

  // Answer and messages
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const policy = POLICIES.find((p) => p.id === policyId);

  // Fetch health insurance policies for Policy Finder
  const fetchFinderPolicies = async () => {
    setFinderLoading(true);
    setFinderError("");

    try {
      const params = new URLSearchParams();

      // Category filter
      if (finderCategory !== "all") {
        params.set("category", finderCategory);
      }

      // Search
      if (finderSearch.trim()) {
        params.set("search", finderSearch.trim());
      }

      // Five filters
      Object.entries(finderFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/api/policy-finder/cached-policies?${params.toString()}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to fetch insurance policies.");
      }

      setFinderPolicies(data.results || []);
      setFilterOptions(data.filter_options || {});
    } catch (err) {
      console.error("Policy Finder error:", err);
      setFinderError(err.message);
    } finally {
      setFinderLoading(false);
    }
  };
  const fetchPolicyDetails = async (uin) => {
    setDetailsLoading(true);
    setDetailsError("");
    setPolicyDetails(null);
    setSelectedFinderPolicy(uin);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/policy-finder/policies/${encodeURIComponent(uin)}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load policy details.");
      }

      setPolicyDetails(data);
    } catch (err) {
      console.error("Policy details error:", err);
      setDetailsError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closePolicyDetails = () => {
    setSelectedFinderPolicy(null);
    setPolicyDetails(null);
    setDetailsError("");
  };

  // Load uploaded documents from backend
  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/insurance/documents`);

      if (!response.ok) {
        throw new Error("Unable to load insurance documents.");
      }

      const data = await response.json();

      // Supports either an array or { documents: [...] }
      const documentList = Array.isArray(data) ? data : data.documents || [];

      setDocuments(
        documentList
          .map((doc) => ({
            filename: typeof doc === "string" ? doc : doc.filename,
            insurer: doc.insurer || "",
            product_name: doc.product_name || "",
          }))
          .filter((doc) => doc.filename),
      );
    } catch (err) {
      console.error("Document loading error:", err);
      setError(
        "Could not load uploaded policies. Check whether the backend is running.",
      );
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (activeModule === "finder" && finderPolicies.length === 0) {
      fetchFinderPolicies();
    }
  }, [activeModule]);

  // Upload PDF to FastAPI
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please upload a PDF file only.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError("");
    setUploadMessage("");
    setAnswer(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/api/insurance/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "PDF upload failed.");
      }

      setUploadMessage(`${data.filename || file.name} uploaded successfully!`);

      await fetchDocuments();

      setSelectedDocument(data.filename || file.name);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Unable to upload PDF.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Ask Gemini using selected insurance document
  const submit = async (e) => {
    e.preventDefault();

    if (!text.trim()) {
      setError("Please enter a question.");
      return;
    }

    if (!selectedDocument) {
      setError("Please select an insurance document first.");
      return;
    }

    setAsking(true);
    setError("");
    setAnswer(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/insurance/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: text.trim(),
          filename: selectedDocument,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to generate an answer.");
      }

      setAnswer(data);
    } catch (err) {
      console.error("Insurance question error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setAsking(false);
    }
  };

  const selectedDoc = documents.find(
    (doc) => doc.filename === selectedDocument,
  );

  const filteredFinderPolicies = finderPolicies.filter((policy) => {
    const search = finderSearch.toLowerCase();

    const matchesSearch =
      policy.name?.toLowerCase().includes(search) ||
      policy.insurer?.toLowerCase().includes(search) ||
      policy.uin?.toLowerCase().includes(search);

    const matchesCategory =
      finderCategory === "all" || policy.category === finderCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="page">
      <PageHeader
        title="Insurance"
        description={
          activeModule === "assistant"
            ? "Upload your insurance policy and ask questions about your coverage."
            : "Discover and explore health insurance policies that match your needs."
        }
        badge={<SampleBadge>Insurance Agent</SampleBadge>}
      />

      <div className="insurance-module-switcher">
        <button
          type="button"
          className={`insurance-module-tab ${
            activeModule === "assistant" ? "is-active" : ""
          }`}
          onClick={() => setActiveModule("assistant")}
          aria-pressed={activeModule === "assistant"}
        >
          <span className="insurance-module-number">01</span>
          <span className="insurance-module-details">
            <strong>Policy Assistant</strong>
            <small>Understand your existing policy</small>
          </span>
        </button>

        <button
          type="button"
          className={`insurance-module-tab ${
            activeModule === "finder" ? "is-active" : ""
          }`}
          onClick={() => setActiveModule("finder")}
          aria-pressed={activeModule === "finder"}
        >
          <span className="insurance-module-number">02</span>
          <span className="insurance-module-details">
            <strong>Find Insurance</strong>
            <small>Discover other insurance policies</small>
          </span>
        </button>
      </div>

      {activeModule === "assistant" && (
        <div className="split">
          <section className="panel" aria-labelledby="ask-h">
            <h2 id="ask-h" className="panel__title">
              Ask about insurance
            </h2>

            <form onSubmit={submit} className="stack">
              {/* Select uploaded document */}
              <div className="stack">
                <label htmlFor="insurance-document">
                  <strong>Select insurance document</strong>
                </label>

                <div className="insurance-select-wrap">
                  <FileText size={18} />

                  <select
                    id="insurance-document"
                    className="field insurance-select"
                    value={selectedDocument}
                    onChange={(e) => {
                      setSelectedDocument(e.target.value);
                      setAnswer(null);
                      setError("");
                    }}
                  >
                    <option value="">Choose a policy document</option>
                    <option value="all">All Documents</option>

                    {documents.map((doc) => (
                      <option key={doc.filename} value={doc.filename}>
                        {doc.filename}
                      </option>
                    ))}
                  </select>

                  <ChevronDown size={16} />
                </div>

                {selectedDocument === "all" ? (
                  <div className="insurance-selected-file">
                    <FileText size={16} />
                    <span>Searching across all uploaded policies</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDocument("")}
                      aria-label="Clear selection"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  selectedDoc && (
                    <div className="insurance-selected-file">
                      <FileText size={16} />
                      <span>{selectedDoc.filename}</span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDocument("");
                          setAnswer(null);
                        }}
                        aria-label="Clear selected document"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )
                )}

                {documents.length === 0 && (
                  <small className="muted">
                    No insurance documents uploaded yet.
                  </small>
                )}
              </div>

              {/* Upload PDF */}
              <div className="insurance-upload">
                <input
                  id="insurance-pdf-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleUpload}
                  hidden
                  disabled={uploading}
                />

                <label
                  htmlFor="insurance-pdf-upload"
                  className="insurance-upload__label"
                >
                  {uploading ? (
                    <LoaderCircle size={22} className="spin" />
                  ) : (
                    <Upload size={22} />
                  )}

                  <strong>
                    {uploading ? "Uploading PDF..." : "Upload insurance PDF"}
                  </strong>

                  <span>Click to select a policy document</span>

                  <small>PDF files only</small>
                </label>
              </div>

              {uploadMessage && (
                <p className="success-message" role="status">
                  {uploadMessage}
                </p>
              )}

              {/* Question input */}
              <textarea
                className="field field--area"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask a question about your selected insurance policy..."
                aria-label="Insurance question"
              />

              {/* Suggested questions */}
              <div className="chip-row">
                {INSURANCE_SUGGESTIONS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className="chip chip--btn"
                    onClick={() => setText(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button
                className="btn btn--primary"
                type="submit"
                disabled={
                  asking || uploading || !text.trim() || !selectedDocument
                }
              >
                {asking ? (
                  <>
                    <LoaderCircle size={16} className="spin" />
                    Thinking...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Ask
                  </>
                )}
              </button>
            </form>

            {/* Error message */}
            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            {/* Actual Gemini answer */}
            {answer && (
              <div
                className="answer-preview insurance-answer-card"
                aria-live="polite"
              >
                <div className="insurance-answer-header">
                  <div>
                    <span className="insurance-ai-label">
                      <FileText size={15} />
                      INSURANCE AI ASSISTANT
                    </span>
                    <h3>Policy Answer</h3>
                  </div>

                  <SampleBadge>AI Generated</SampleBadge>
                </div>

                <div className="insurance-document-info">
                  <FileText size={17} />
                  <span>{answer.filename}</span>
                </div>

                <div className="insurance-answer-content">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h2>{children}</h2>,
                      h2: ({ children }) => <h3>{children}</h3>,
                      h3: ({ children }) => <h4>{children}</h4>,
                      p: ({ children }) => <p>{children}</p>,
                      ul: ({ children }) => <ul>{children}</ul>,
                      ol: ({ children }) => <ol>{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      strong: ({ children }) => <strong>{children}</strong>,
                    }}
                  >
                    {(answer.answer || "").replace(
                      /\s*\[Policy:\s*[^,\]]+,\s*Page:\s*\d+\]/g,
                      "",
                    )}
                  </ReactMarkdown>
                </div>

                {/* Consolidated sources */}
                {answer.sources?.length > 0 && (
                  <div className="insurance-sources">
                    <div className="insurance-sources-heading">
                      <FileText size={18} />
                      <div>
                        <h4>Sources & References</h4>
                        <p>Information retrieved from your uploaded policy</p>
                      </div>
                    </div>

                    <div className="insurance-source-list">
                      {Array.from(
                        new Map(
                          answer.sources.map((source) => [
                            `${source.filename}-${source.page_number}`,
                            source,
                          ]),
                        ).values(),
                      ).map((source, index) => (
                        <div
                          className="insurance-source"
                          key={`${source.filename}-${source.page_number}-${index}`}
                        >
                          <span className="insurance-source-number">
                            {index + 1}
                          </span>

                          <div>
                            <strong>{source.filename}</strong>
                            <span>
                              Page {source.page_number}
                              {source.section_heading
                                ? ` · ${source.section_heading}`
                                : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Claim workflow */}
          <section className="panel" aria-labelledby="claim-h">
            <h2 id="claim-h" className="panel__title">
              How a claim usually works
            </h2>

            <ol className="steps">
              {CLAIM_STEPS.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>

            <small className="muted">
              General overview. Your insurer’s rules decide the details.
            </small>
          </section>
        </div>
      )}

      {activeModule === "finder" && (
        <div className="insurance-finder">
          {!selectedFinderPolicy ? (
            <>
              <section className="panel insurance-finder-intro">
                <h2>Find Your Health Insurance</h2>
                <p>
                  Explore health insurance policies from different insurers.
                  Compare their coverage, benefits and waiting periods.
                </p>
              </section>

              <section className="panel">
                <h2 className="panel__title">Discover Insurance Plans</h2>

                <p className="muted">
                  Search and explore available health insurance policies.
                </p>

                <div className="stack">
                  <input
                    type="text"
                    className="field"
                    placeholder="Search by policy name, insurer or UIN..."
                    value={finderSearch}
                    onChange={(e) => setFinderSearch(e.target.value)}
                  />

                  <select
                    className="field"
                    value={finderCategory}
                    onChange={(e) => setFinderCategory(e.target.value)}
                  >
                    <option value="all">All health insurance categories</option>
                    <option value="health-indemnity">Health Indemnity</option>
                    <option value="health-senior">Senior Citizen Health</option>
                    <option value="critical-illness">Critical Illness</option>
                    <option value="health-topup">Health Top-up</option>
                    <option value="hospital-cash">Hospital Cash</option>
                  </select>
                </div>
                {/* Policy Finder Filters */}

                <div className="insurance-finder-filters">
                  {/* Sum Insured Range */}
                  <div className="insurance-sum-range">
                    <div className="insurance-filter-heading">
                      <strong>Sum Insured Range</strong>
                      <small>Set your preferred coverage amount</small>
                    </div>

                    <div className="insurance-sum-range-inputs">
                      <div className="insurance-filter-field">
                        <label htmlFor="min-sum-insured">
                          Minimum Amount (₹)
                        </label>
                        <input
                          id="min-sum-insured"
                          type="number"
                          className="field"
                          placeholder="e.g. 50000"
                          min="0"
                          value={finderFilters.min_sum_insured}
                          onChange={(e) =>
                            setFinderFilters({
                              ...finderFilters,
                              min_sum_insured: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="insurance-filter-field">
                        <label htmlFor="max-sum-insured">
                          Maximum Amount (₹)
                        </label>
                        <input
                          id="max-sum-insured"
                          type="number"
                          className="field"
                          placeholder="e.g. 1000000"
                          min="0"
                          value={finderFilters.max_sum_insured}
                          onChange={(e) =>
                            setFinderFilters({
                              ...finderFilters,
                              max_sum_insured: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Co-payment */}

                  <select
                    className="field"
                    value={finderFilters.copay}
                    onChange={(e) =>
                      setFinderFilters({
                        ...finderFilters,
                        copay: e.target.value,
                      })
                    }
                  >
                    <option value="">All Co-payment</option>
                    <option value="no_copay">No Co-payment</option>
                    <option value="optional">Optional Co-payment</option>
                    <option value="5">5%</option>
                    <option value="10">10%</option>
                    <option value="20">20%</option>
                    <option value="conditional">Other / Conditional</option>
                  </select>

                  {/* Deductible */}
                  <select
                    className="field"
                    value={finderFilters.deductible}
                    onChange={(e) =>
                      setFinderFilters({
                        ...finderFilters,
                        deductible: e.target.value,
                      })
                    }
                  >
                    <option value="">All Deductibles</option>
                    <option value="no_deductible">No Deductible</option>
                    <option value="optional">Optional Deductible</option>
                    <option value="has_deductible">Has Deductible</option>
                  </select>

                  {/* Initial Waiting */}
                  <select
                    className="field"
                    value={finderFilters.initial_waiting}
                    onChange={(e) =>
                      setFinderFilters({
                        ...finderFilters,
                        initial_waiting: e.target.value,
                      })
                    }
                  >
                    <option value="">All Initial Waiting Periods</option>
                    {(filterOptions.initial_waiting || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  {/* PED Waiting */}
                  <select
                    className="field"
                    value={finderFilters.ped_waiting}
                    onChange={(e) =>
                      setFinderFilters({
                        ...finderFilters,
                        ped_waiting: e.target.value,
                      })
                    }
                  >
                    <option value="">All PED Waiting Periods</option>
                    {(filterOptions.ped_waiting || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={fetchFinderPolicies}
                  disabled={finderLoading}
                >
                  Apply Filters
                </button>
                {finderLoading && <p className="muted">Loading policies...</p>}

                {finderError && (
                  <div className="error-message" role="alert">
                    {finderError}
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={fetchFinderPolicies}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!finderLoading && !finderError && (
                  <p className="muted">
                    Showing {filteredFinderPolicies.length} policies
                  </p>
                )}

                <div className="card-grid card-grid--3">
                  {filteredFinderPolicies.map((policy) => (
                    <article className="policy-card" key={policy.uin}>
                      <span className="policy-card__kind">
                        {policy.category?.replaceAll("-", " ")}
                      </span>

                      <h3>{policy.name}</h3>

                      <p>
                        <strong>Insurer:</strong> {policy.insurer}
                      </p>

                      <p>
                        <strong>UIN:</strong> {policy.uin}
                      </p>

                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => fetchPolicyDetails(policy.uin)}
                      >
                        View Details
                      </button>
                    </article>
                  ))}
                </div>

                {!finderLoading &&
                  !finderError &&
                  filteredFinderPolicies.length === 0 && (
                    <p className="muted">
                      No matching insurance policies found.
                    </p>
                  )}
              </section>
            </>
          ) : (
            <section className="insurance-policy-details">
              <div className="section__head">
                <div>
                  <p className="muted">Insurance Policy</p>
                  <h2>Policy Details</h2>
                </div>

                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closePolicyDetails}
                >
                  ← Back to Policies
                </button>
              </div>

              {detailsLoading && (
                <div className="panel">
                  <p className="muted">Loading policy details...</p>
                </div>
              )}

              {detailsError && (
                <div className="panel error-message" role="alert">
                  {detailsError}
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => fetchPolicyDetails(selectedFinderPolicy)}
                  >
                    Retry
                  </button>
                </div>
              )}

              {policyDetails && (
                <>
                  <section className="panel">
                    <span className="policy-card__kind">
                      {policyDetails.category_name || policyDetails.category}
                    </span>

                    <h2>{policyDetails.name}</h2>

                    <p>
                      <strong>Insurer:</strong>{" "}
                      {typeof policyDetails.insurer === "object"
                        ? policyDetails.insurer?.name
                        : policyDetails.insurer}
                    </p>

                    <p>
                      <strong>UIN:</strong> {policyDetails.uin}
                    </p>

                    <p>
                      <strong>Status:</strong> {policyDetails.status}
                    </p>

                    <h3>Policy Summary</h3>

                    <p>{policyDetails.summary || "Summary not available."}</p>

                    {policyDetails.url && (
                      <a
                        href={policyDetails.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View policy on IndiaInsurances ↗
                      </a>
                    )}
                  </section>

                  <section className="panel">
                    <h3 className="panel__title">Key Features</h3>

                    {(() => {
                      const keywords =
                        /sum insured|co.?pay|room rent|waiting period|policy term|deductible|cumulative bonus/i;

                      const keyFacts = (policyDetails.facts || []).filter(
                        (fact) =>
                          keywords.test(
                            `${fact.label || ""} ${fact.key || ""}`,
                          ) &&
                          (fact.display || fact.value != null || fact.note),
                      );

                      return keyFacts.length > 0 ? (
                        <div className="stack">
                          {keyFacts.map((fact, index) => (
                            <div
                              className="insurance-policy-fact"
                              key={`${fact.key || fact.label}-${index}`}
                            >
                              <strong>{fact.label || fact.key}</strong>
                              <p>
                                {fact.display ||
                                  (typeof fact.value === "object"
                                    ? JSON.stringify(fact.value)
                                    : fact.value) ||
                                  fact.note}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="muted">
                          Key feature details are not available in the extracted
                          data.
                        </p>
                      );
                    })()}
                  </section>

                  <section className="panel">
                    <h3 className="panel__title">More Information</h3>

                    {[
                      {
                        title: "Coverage & Benefits",
                        pattern:
                          /coverage|benefit|hospitalisation|hospitalization|maternity|ambulance|treatment/i,
                      },
                      {
                        title: "Waiting Periods",
                        pattern:
                          /waiting period|pre.?existing|initial waiting/i,
                      },
                      {
                        title: "Exclusions",
                        pattern: /exclusion|not covered|excluded/i,
                      },
                      {
                        title: "Claim Process",
                        pattern:
                          /claim|reimbursement|cashless|pre.?authorisation/i,
                      },
                    ].map((group) => {
                      const facts = (policyDetails.facts || []).filter(
                        (fact) =>
                          group.pattern.test(
                            `${fact.label || ""} ${fact.key || ""}`,
                          ) &&
                          !/sum insured|co.?pay|room rent|waiting period|policy term|deductible|cumulative bonus/i.test(
                            `${fact.label || ""} ${fact.key || ""}`,
                          ),
                      );

                      return (
                        <details
                          className="insurance-info-accordion"
                          key={group.title}
                        >
                          <summary>
                            {group.title} ({facts.length})
                          </summary>

                          {facts.length > 0 ? (
                            <div className="stack">
                              {facts.map((fact, index) => (
                                <div
                                  className="insurance-policy-fact"
                                  key={`${fact.key || fact.label}-${index}`}
                                >
                                  <strong>{fact.label || fact.key}</strong>

                                  <p>
                                    {fact.display ||
                                      (typeof fact.value === "object"
                                        ? JSON.stringify(fact.value)
                                        : fact.value) ||
                                      fact.note ||
                                      "Not specified"}
                                  </p>

                                  {fact.quote && (
                                    <p className="insurance-policy-quote">
                                      {fact.quote}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="muted">
                              No extracted information available in this
                              section.
                            </p>
                          )}
                        </details>
                      );
                    })}
                  </section>

                  <section className="panel">
                    <h3 className="panel__title">Policy Documents</h3>

                    {policyDetails.documents?.length > 0 ? (
                      <div className="stack">
                        {policyDetails.documents.map((doc, index) => (
                          <div
                            className="insurance-policy-fact"
                            key={`${doc.kind}-${index}`}
                          >
                            <strong>{doc.label || doc.kind}</strong>

                            <p>
                              {doc.kind} ·{" "}
                              {doc.pages || "Page count unavailable"} pages
                            </p>

                            {doc.source_url && (
                              <a
                                href={doc.source_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open Original PDF ↗
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">No documents available.</p>
                    )}
                  </section>

                  <p className="muted">
                    Policy information is provided for research purposes. Always
                    verify current terms with the insurer and original policy
                    wording.
                  </p>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
