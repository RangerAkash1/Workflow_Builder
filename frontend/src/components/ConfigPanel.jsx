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
      if (err.message?.includes("Too many requests")) {
        setUploadInfo("Rate limited. Please wait a moment.");
      }
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
      const detail = err?.response?.data?.detail || err.message || "Upload failed";
      setUploadInfo(detail);
    } finally {
      setUploading(false);
    }
  };

  if (!node) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚙️</div>
        <div style={{ fontWeight: "600", marginBottom: "8px" }}>No Node Selected</div>
        <div style={{ fontSize: "13px" }}>Click on a node in the canvas to configure it</div>
      </div>
    );
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
            <input 
              type="number"
              value={form.chunk_size || ""} 
              onChange={(e) => update("chunk_size", e.target.value)}
              placeholder="800"
            />
            
            <label>Chunk overlap</label>
            <input 
              type="number"
              value={form.chunk_overlap || ""} 
              onChange={(e) => update("chunk_overlap", e.target.value)}
              placeholder="80"
            />
            
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
                      {c.name} ({c.metadata?.count || 0} docs)
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
            
            <label>Top K (results to retrieve)</label>
            <input 
              type="number"
              value={form.top_k || ""} 
              onChange={(e) => update("top_k", e.target.value)}
              placeholder="5"
            />
            
            <label>Embedding model</label>
            <input 
              value={form.embedding_model || ""} 
              onChange={(e) => update("embedding_model", e.target.value)}
              placeholder="text-embedding-3-small"
            />

            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1f2937" }}>
              <label>Upload PDF to this collection</label>
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ marginBottom: 8 }}
              />
              <button onClick={uploadToCollection} disabled={uploading || !file}>
                {uploading ? "Uploading..." : "Upload & Index"}
              </button>
              {uploadInfo && (
                <div style={{ 
                  marginTop: 8, 
                  padding: "8px", 
                  background: "#0b1221", 
                  borderRadius: "6px",
                  fontSize: "13px"
                }}>
                  {uploadInfo}
                </div>
              )}
            </div>
          </>
        );
        
      case "llm_engine":
        return (
          <>
            <label>LLM Provider</label>
            <select
              value={form.provider || ""}
              onChange={(e) => update("provider", e.target.value)}
            >
              <option value="">-- Select Provider --</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
            </select>
            
            <label>LLM Model</label>
            <input 
              value={form.model || ""} 
              onChange={(e) => update("model", e.target.value)}
              placeholder="gpt-4 or gemini-pro"
            />
            
            <label>Custom Prompt</label>
            <textarea 
              value={form.prompt || ""} 
              onChange={(e) => update("prompt", e.target.value)}
              placeholder="Enter custom system prompt (optional)"
            />
            
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!form.web_search}
                onChange={(e) => update("web_search", e.target.checked)}
                style={{ width: "auto", margin: 0 }}
              />
              <span>Use Web Search</span>
            </label>
          </>
        );
        
      case "user_query":
        return (
          <div style={{ color: "#9ca3af", fontSize: "13px" }}>
            This node receives user input. No configuration needed.
          </div>
        );
        
      case "output":
        return (
          <div style={{ color: "#9ca3af", fontSize: "13px" }}>
            This node displays the final output. No configuration needed.
          </div>
        );
        
      default:
        return (
          <div style={{ color: "#9ca3af", fontSize: "13px" }}>
            No specific configuration available for this node type.
          </div>
        );
    }
  };

  return (
    <div>
      <div className="list-title">
        Config: <span style={{ color: "#22d3ee" }}>{node.data.label}</span>
      </div>
      <div className="config-fields" style={{ marginTop: "16px" }}>
        {renderFields()}
      </div>
    </div>
  );
}