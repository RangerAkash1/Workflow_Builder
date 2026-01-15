import { useEffect, useState } from "react";

// Modal panel for saving, loading, and listing workflows.
export default function WorkflowManager({ api, onLoad, onNew, onSave, currentWorkflow, onClose }) {
  const [view, setView] = useState("menu"); // "menu", "save", "load"
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: "", description: "" });
  const [message, setMessage] = useState("");

  // Fetch the list of saved workflows.
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/workflows");
      setWorkflows(res.data.workflows || []);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "load") {
      fetchWorkflows();
    }
  }, [view]);

  const handleSaveCurrentWorkflow = async () => {
    if (!saveForm.name.trim()) {
      setMessage("Workflow name is required");
      return;
    }
    try {
      setLoading(true);
      await api.post("/workflow/save", {
        name: saveForm.name,
        description: saveForm.description,
        nodes: currentWorkflow.nodes,
        edges: currentWorkflow.edges,
      });
      setMessage(`Saved workflow "${saveForm.name}"`);
      setSaveForm({ name: "", description: "" });
      setTimeout(() => {
        onClose();
        setMessage("");
      }, 1500);
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.detail || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadWorkflow = async (uuid) => {
    try {
      setLoading(true);
      const res = await api.get(`/workflow/${uuid}`);
      onLoad(res.data.nodes, res.data.edges);
      setMessage(`Loaded workflow "${res.data.name}"`);
      setTimeout(() => {
        onClose();
        setMessage("");
      }, 1500);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load workflow");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uuid) => {
    if (!confirm("Delete this workflow?")) return;
    try {
      setLoading(true);
      await api.delete(`/workflow/${uuid}`);
      setMessage("Workflow deleted");
      await fetchWorkflows();
    } catch (err) {
      console.error(err);
      setMessage("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modal: {
      background: "#111827",
      border: "1px solid #1f2937",
      borderRadius: 12,
      padding: 20,
      minWidth: 400,
      maxWidth: 600,
      maxHeight: 500,
      overflowY: "auto",
    },
    button: {
      marginRight: 8,
      marginBottom: 8,
    },
  };

  return (
    <div style={styles.overlay} onClick={() => view === "menu" && onClose()}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {view === "menu" && (
          <>
            <h2>Workflow Manager</h2>
            <button style={styles.button} onClick={() => setView("save")}>
              Save Workflow
            </button>
            <button style={styles.button} onClick={() => setView("load")}>
              Load Workflow
            </button>
            <button style={styles.button} onClick={() => onNew()}>
              New Workflow
            </button>
            <button style={styles.button} onClick={() => onClose()}>
              Close
            </button>
            {message && <div style={{ marginTop: 12, color: "#22d3ee" }}>{message}</div>}
          </>
        )}

        {view === "save" && (
          <>
            <h3>Save Workflow</h3>
            <label>Workflow Name *</label>
            <input
              value={saveForm.name}
              onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
              placeholder="My workflow name"
              style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 4, border: "1px solid #1f2937", background: "#0b1221", color: "#e2e8f0" }}
            />
            <label>Description</label>
            <textarea
              value={saveForm.description}
              onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
              placeholder="Optional description"
              style={{ width: "100%", marginBottom: 12, minHeight: 60, padding: 8, borderRadius: 4, border: "1px solid #1f2937", background: "#0b1221", color: "#e2e8f0" }}
            />
            <button
              style={styles.button}
              disabled={loading}
              onClick={handleSaveCurrentWorkflow}
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button style={styles.button} onClick={() => setView("menu")}>
              Back
            </button>
            {message && <div style={{ marginTop: 12, color: message.includes("Saved") ? "#34d399" : "#ef4444" }}>{message}</div>}
          </>
        )}

        {view === "load" && (
          <>
            <h3>Load Workflow</h3>
            {loading ? (
              <div>Loading...</div>
            ) : workflows.length === 0 ? (
              <div>No saved workflows yet.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {workflows.map((w) => (
                  <li
                    key={w.uuid}
                    style={{
                      background: "#0b1221",
                      padding: 10,
                      marginBottom: 8,
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{w.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{w.description}</div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>
                        Updated: {new Date(w.updated_at).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <button
                        style={{ ...styles.button, background: "#22d3ee", color: "#0b1221", fontWeight: 700 }}
                        onClick={() => handleLoadWorkflow(w.uuid)}
                        disabled={loading}
                      >
                        Load
                      </button>
                      <button
                        style={{ ...styles.button, background: "#ef4444", color: "#fff" }}
                        onClick={() => handleDelete(w.uuid)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button style={styles.button} onClick={() => setView("menu")}>
              Back
            </button>
            {message && <div style={{ marginTop: 12, color: "#ef4444" }}>{message}</div>}
          </>
        )}
      </div>
    </div>
  );
}
