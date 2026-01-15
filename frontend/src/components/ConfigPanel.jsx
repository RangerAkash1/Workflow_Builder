import { useEffect, useState, useRef } from "react";

// Dynamic configuration form per node type; currently minimal fields for clarity.
export default function ConfigPanel({ node, onChange, api }) {
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState("");
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  
  // Cache to prevent repeated fetches
  const collectionsCache = useRef({ data: null, timestamp: 0 });
  const fetchInProgress = useRef(false);
  const CACHE_DURATION = 30000; // 30 seconds

  useEffect(() => {
    setForm(node?.data?.params || {});
    setFile(null);
    setUploadInfo("");
    
    // Fetch available collections when knowledge base node is selected.
    if (node?.data?.type === "knowledge_base") {
      fetchCollections();
    }
  }, [node?.id, node?.data?.type]); // Only re-fetch when node ID or type changes

  const fetchCollections = async () => {
    // Check cache first
    const now = Date.now();
    if (collectionsCache.current.data && now - collectionsCache.current.timestamp < CACHE_DURATION) {
      setCollections(collectionsCache.current.data);
      return;
    }

    // Prevent concurrent fetches
    if (fetchInProgress.current) {
      return;
    }

    try {
      fetchInProgress.current = true;
      setLoadingCollections(true);
      const res = await api.get("/knowledge/collections");
      const fetchedCollections = res.data.collections || [];
      
      // Update cache
      collectionsCache.current = {
        data: fetchedCollections,
        timestamp: now
      };
      
      setCollections(fetchedCollections);
    } catch (err) {
      console.error("Failed to load collections:", err);
      // Don't clear cache on error to allow offline viewing
    } finally {
      setLoadingCollections(false);
      fetchInProgress.current = false;
    }
  };

  const uploadToCollection = async () => {
    if (!file) {
      setUploadInfo("Pick a PDF to upload.");
      return;
    }
    try {
      setUploading(true);
      setUploadInfo("Uploading and embedding...");
      const fd = new FormData();
      fd.append("file", file);
      const params = {
        collection: form.collection_name || "default",
        chunk_size: form.chunk_size || 800,
        chunk_overlap: form.chunk_overlap || 80,
        embedding_model: form.embedding_model || undefined,
      };
      const res = await api.post("/knowledge/upload", fd, { params });
      setUploadInfo(`Stored ${res.data.chunks} chunks in ${res.data.collection}`);
      
      // Invalidate cache after successful upload to refresh collections
      collectionsCache.current = { data: null, timestamp: 0 };
      fetchCollections();
    } catch (err) {
      console.error(err);
      const detail = err?.response?.data?.detail || "Upload failed";
      setUploadInfo(detail);
    } finally {
      setUploading(false);
    }
  };

  if (!node) {
    return <div>Select a node to configure it.</div>;
  }

  const update = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    onChange(node.id, next);
  };

  const renderFields = () => {
    switch (node.data.type) {
      case "knowledge_base":
        return (
          <>
            <label>Chunk size</label>
            <input value={form.chunk_size || ""} onChange={(e) => update("chunk_size", e.target.value)} />
            <label>Chunk overlap</label>
            <input value={form.chunk_overlap || ""} onChange={(e) => update("chunk_overlap", e.target.value)} />
            <label>Collection name</label>
            <div>
              {loadingCollections ? (
                <select disabled>
                  <option>Loading...</option>
                </select>
              ) : (
                <select
                  value={form.collection_name || ""}
                  onChange={(e) => update("collection_name", e.target.value)}
                >
                  <option value="">-- Select or type new --</option>
                  {collections.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                placeholder="Or type a new collection name"
                value={form.collection_name || ""}
                onChange={(e) => update("collection_name", e.target.value)}
                style={{ marginTop: 6 }}
              />
            </div>
            <label>Top K</label>
            <input value={form.top_k || ""} onChange={(e) => update("top_k", e.target.value)} />
            <label>Embedding model</label>
            <input value={form.embedding_model || ""} onChange={(e) => update("embedding_model", e.target.value)} />

            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1f2937" }}>
              <label>Upload PDF to this collection</label>
              <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <button onClick={uploadToCollection} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload & Index"}
              </button>
              {uploadInfo && <div style={{ marginTop: 6 }}>{uploadInfo}</div>}
            </div>
          </>
        );
      case "llm_engine":
        return (
          <>
            <label>LLM Provider</label>
            <input value={form.provider || ""} onChange={(e) => update("provider", e.target.value)} />
            <label>LLM Model</label>
            <input value={form.model || ""} onChange={(e) => update("model", e.target.value)} />
            <label>Custom Prompt</label>
            <textarea value={form.prompt || ""} onChange={(e) => update("prompt", e.target.value)} />
            <label>Use Web Search</label>
            <input
              type="checkbox"
              checked={!!form.web_search}
              onChange={(e) => update("web_search", e.target.checked)}
            />
          </>
        );
      default:
        return <div>No specific configuration for this node yet.</div>;
    }
  };

  return (
    <div>
      <div className="list-title">Config: {node.data.label}</div>
      <div className="config-fields">{renderFields()}</div>
    </div>
  );
}
