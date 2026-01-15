import ReactFlow, { Background, Controls, MiniMap, addEdge } from "reactflow";
import "reactflow/dist/style.css";

// Canvas responsible for node/edge interactions.
export default function WorkflowCanvas({ nodes, edges, setNodes, setEdges, onSelectNode }) {
  const onConnect = (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds));

  // Handle node changes including drag/position updates
  const onNodesChange = (changes) => {
    const updatedNodes = nodes.map((node) => {
      const change = changes.find((c) => c.id === node.id);
      
      // Handle position changes from dragging
      if (change?.type === "position" && change.position) {
        return { ...node, position: change.position };
      }
      
      // Handle selection changes
      if (change?.type === "select") {
        return { ...node, selected: change.selected };
      }
      
      return node;
    });
    
    // Only call setNodes if there were actual changes
    if (updatedNodes !== nodes) {
      setNodes(updatedNodes);
    }
  };

  const onNodeClick = (_, node) => onSelectNode(node.id);

  // Ensure all nodes have valid position data
  const validNodes = nodes.map((node) => ({
    ...node,
    position: node.position || { x: 100, y: 100 },
  }));

  return (
    <div style={{ height: "60vh", width: "100%" }}>
      <ReactFlow
        nodes={validNodes}
        edges={edges}
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <MiniMap 
          style={{
            background: "#111827",
            border: "1px solid #1f2937"
          }}
        />
        <Controls style={{
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "8px"
        }} />
        <Background gap={16} color="#1f2937" />
      </ReactFlow>
    </div>
  );
}
