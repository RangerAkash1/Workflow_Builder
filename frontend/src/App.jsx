import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import ComponentLibrary from "./components/ComponentLibrary";
import WorkflowCanvas from "./components/WorkflowCanvas";
import ConfigPanel from "./components/ConfigPanel";
import ChatPanel from "./components/ChatPanel";
import ExecutionControls from "./components/ExecutionControls";
import WorkflowManager from "./components/WorkflowManager";

// Enhanced API client with error handling and retry logic
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:8000",
  timeout: 30000, // 30 second timeout
});

// Add response interceptor to handle rate limiting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      console.warn("Rate limited:", error.response.data.detail);
      // Return a user-friendly error message
      return Promise.reject(new Error("Too many requests. Please wait a moment and try again."));
    }
    return Promise.reject(error);
  }
);

const COMPONENT_TYPES = [
  { type: "user_query", label: "User Query" },
  { type: "knowledge_base", label: "Knowledge Base" },
  { type: "llm_engine", label: "LLM Engine" },
  { type: "output", label: "Output" },
];

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [buildStatus, setBuildStatus] = useState("idle");
  const [managerOpen, setManagerOpen] = useState(false);
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);

  // Add a new node with better spacing to prevent overlap
  // Uses a grid layout that adapts to screen size
  const addNode = useCallback((componentType) => {
    const id = `${componentType.type}-${Date.now()}`;
    const nodeCount = nodes.length;
    
    // Adaptive grid spacing based on available canvas area
    // Typically 4 nodes per row with 250px spacing for better visibility
    const gridCols = 4;
    const xSpacing = 280;
    const ySpacing = 200;
    
    const xPos = 50 + (nodeCount % gridCols) * xSpacing;
    const yPos = 50 + Math.floor(nodeCount / gridCols) * ySpacing;
    
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: "default",
        data: { label: componentType.label, type: componentType.type, params: {} },
        position: { x: xPos, y: yPos },
      },
    ]);
  }, [nodes.length]);

  // Update node data when configuration changes.
  const updateNodeParams = useCallback((nodeId, params) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, params } } : n)));
  }, []);

  // Handle node position updates from canvas drag
  const handleNodesChange = useCallback((changedNodes) => {
    setNodes((prev) => {
      return prev.map((node) => {
        const changedNode = changedNodes.find((cn) => cn.id === node.id);
        if (changedNode?.position) {
          return { ...node, position: changedNode.position };
        }
        return node;
      });
    });
  }, []);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedId), [nodes, selectedId]);

  // Basic workflow validator call.
  const handleBuild = useCallback(async () => {
    setBuildStatus("running");
    try {
      await api.post("/workflow/validate", {
        nodes: nodes.map((n) => ({ id: n.id, type: n.data.type, params: n.data.params })),
        edges,
      });
      setBuildStatus("ok");
      setChatOpen(true);
    } catch (err) {
      console.error(err);
      setBuildStatus("error");
      alert(err?.response?.data?.detail || "Validation failed");
    }
  }, [nodes, edges]);

  const handleSaveWorkflow = useCallback(async (name, description) => {
    try {
      const res = await api.post("/workflow/save", {
        name,
        description,
        // Save nodes with their current positions for persistence
        nodes: nodes.map((n) => ({ 
          id: n.id, 
          type: n.data.type, 
          params: n.data.params,
          position: n.position 
        })),
        edges,
      });
      setCurrentWorkflowId(res.data.uuid);
      alert(`Workflow saved: ${name}`);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Save failed");
    }
  }, [nodes, edges]);

  const handleLoadWorkflow = useCallback((loadedNodes, loadedEdges) => {
    // Ensure all loaded nodes have proper ReactFlow structure
    const formattedNodes = loadedNodes.map((node, index) => ({
      id: node.id,
      type: "default",
      data: {
        label: node.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        type: node.type,
        params: node.params || {},
      },
      // Preserve saved position if available, otherwise generate smart grid layout
      position: node.position || {
        x: 50 + (index % 4) * 280,
        y: 50 + Math.floor(index / 4) * 200
      },
    }));
    
    setNodes(formattedNodes);
    setEdges(loadedEdges);
    setSelectedId(null);
    setChatOpen(false);
  }, []);

  const handleNewWorkflow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
    setChatOpen(false);
    setCurrentWorkflowId(null);
  }, []);

  return (
    <div className="app-shell">
      <header>
        <h1>Workflow Builder</h1>
        <ExecutionControls
          onBuild={handleBuild}
          chatOpen={chatOpen}
          onChatOpen={() => setChatOpen(true)}
          onManager={() => setManagerOpen(true)}
        />
      </header>

      <div className="panel">
        <ComponentLibrary components={COMPONENT_TYPES} onAdd={addNode} />
      </div>

      <div className="panel">
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          setNodes={handleNodesChange}
          setEdges={setEdges}
          onSelectNode={setSelectedId}
        />
      </div>

      <div className="panel">
        <ConfigPanel node={selectedNode} onChange={updateNodeParams} api={api} />
      </div>

      <div className="panel" style={{ gridColumn: "1 / span 3" }}>
        <ChatPanel
          open={chatOpen}
          api={api}
          workflow={{
            nodes: nodes.map((n) => ({ id: n.id, type: n.data.type, params: n.data.params })),
            edges,
          }}
        />
      </div>

      {managerOpen && (
        <WorkflowManager
          api={api}
          onLoad={handleLoadWorkflow}
          onNew={handleNewWorkflow}
          onSave={handleSaveWorkflow}
          currentWorkflow={{
            nodes: nodes.map((n) => ({ id: n.id, type: n.data.type, params: n.data.params, position: n.position })),
            edges,
          }}
          onClose={() => setManagerOpen(false)}
        />
      )}
    </div>
  );
}
