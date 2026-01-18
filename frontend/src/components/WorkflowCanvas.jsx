import { useCallback, useEffect } from "react";
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  addEdge,
  useNodesState,
  useEdgesState,
  Panel
} from "reactflow";
import "reactflow/dist/style.css";

// Canvas responsible for node/edge interactions with improved UX.
export default function WorkflowCanvas({ nodes, edges, setNodes, setEdges, onSelectNode }) {
  // Use ReactFlow's built-in state management for smoother interactions
  const [localNodes, setLocalNodes, onNodesChange] = useNodesState(nodes);
  const [localEdges, setLocalEdges, onEdgesChange] = useEdgesState(edges);

  // Sync parent nodes when they change externally (e.g., loading workflow)
  useEffect(() => {
    if (nodes.length !== localNodes.length || nodes.some((n, i) => n.id !== localNodes[i]?.id)) {
      setLocalNodes(nodes);
    }
  }, [nodes]);

  // Sync parent edges when they change externally
  useEffect(() => {
    if (edges.length !== localEdges.length || edges.some((e, i) => e.id !== localEdges[i]?.id)) {
      setLocalEdges(edges);
    }
  }, [edges]);

  // Sync local nodes back to parent after changes are finalized
  useEffect(() => {
    setNodes(localNodes);
  }, [localNodes, setNodes]);

  // Sync local edges back to parent
  useEffect(() => {
    setEdges(localEdges);
  }, [localEdges, setEdges]);

  // Handle node changes including drag/position updates
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

  // Handle new connections between nodes
  const onConnect = useCallback((params) => {
    setLocalEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep' }, eds));
  }, [setLocalEdges]);

  // Handle node DOUBLE-CLICK for configuration (better UX)
  const onNodeDoubleClick = useCallback((event, node) => {
    event.stopPropagation();
    onSelectNode(node.id);
  }, [onSelectNode]);

  // Clear selection when clicking canvas background
  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  return (
    <div style={{ height: "60vh", width: "100%", position: "relative" }}>
      <ReactFlow
        nodes={localNodes}
        edges={localEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        
        // UX improvements for better interaction
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        
        // Perfect interaction modes for your UX requirement
        panOnScroll={false}
        panOnDrag={true}  // Left-click drag on empty canvas to pan
        selectionOnDrag={false}
        zoomOnScroll={true}
        zoomOnDoubleClick={false}  // Disable to use for node selection instead
        
        // Better connection behavior
        connectionMode="loose"
        snapToGrid={true}
        snapGrid={[15, 15]}
        
        attributionPosition="bottom-left"
        
        // Enable node dragging - single click and drag moves the node
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
      >
        <Panel position="top-right" style={{
          background: "rgba(17, 24, 39, 0.9)",
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid #1f2937",
          fontSize: "12px",
          color: "#9ca3af"
        }}>
          <div><strong>Controls:</strong></div>
          <div>• Double-click node to configure</div>
          <div>• Drag node to move it</div>
          <div>• Drag empty canvas to pan</div>
          <div>• Drag from handle to connect</div>
          <div>• Scroll to zoom in/out</div>
        </Panel>
        
        <MiniMap 
          nodeColor={(node) => node.selected ? '#22d3ee' : '#374151'}
          maskColor="rgba(0, 0, 0, 0.6)"
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "4px"
          }}
        />
        <Controls 
          showInteractive={false}
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "8px"
          }} 
        />
        <Background 
          gap={20} 
          size={1}
          color="#1f2937" 
          variant="dots"
        />
      </ReactFlow>
    </div>
  );
}