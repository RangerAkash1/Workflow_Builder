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

export default function WorkflowCanvas({ nodes, edges, setNodes, setEdges, onSelectNode }) {
  
  // 1. Internal React Flow state (handles smooth 60fps dragging)
  const [localNodes, setLocalNodes, onNodesChange] = useNodesState(nodes);
  const [localEdges, setLocalEdges, onEdgesChange] = useEdgesState(edges);

  // 2. Sync Local State if Parent 'nodes' changes externally
  useEffect(() => {
    setLocalNodes(nodes || []);
  }, [nodes, setLocalNodes]);

  useEffect(() => {
    setLocalEdges(edges || []);
  }, [edges, setLocalEdges]);

  // 3. Handle Node Changes (Dragging, Selecting, Deleting)
  const handleNodesChange = useCallback((changes) => {
    // Apply changes locally first so the UI remains responsive
    onNodesChange(changes);
    
    // Only update the parent state when a change is "finalized"
    // (e.g., node dragging stopped, or a node was removed)
    const isFinalized = changes.some(
      (c) => c.type === 'remove' || (c.type === 'position' && !c.dragging)
    );
    
    if (isFinalized) {
      setLocalNodes((currentNodes) => {
        setNodes([...currentNodes]); // Push to parent
        return currentNodes;
      });
    }
  }, [onNodesChange, setNodes, setLocalNodes]);

  // 4. Handle Edge Changes
  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    setLocalEdges((currentEdges) => {
      setEdges([...currentEdges]); // Push to parent
      return currentEdges;
    });
  }, [onEdgesChange, setEdges, setLocalEdges]);

  // 5. Handle New Connections
  const onConnect = useCallback((params) => {
    const edgeConfig = { 
      ...params, 
      animated: true, 
      type: 'smoothstep',
      style: { stroke: '#22d3ee' } 
    };
    
    setLocalEdges((eds) => {
      const newEdges = addEdge(edgeConfig, eds);
      setEdges(newEdges);
      return newEdges;
    });
  }, [setLocalEdges, setEdges]);

  // 6. Interaction Handlers
  const onNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    onSelectNode(node.id);
  }, [onSelectNode]);

  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  return (
    <div style={{ height: "60vh", width: "100%", position: "relative", border: "1px solid #1f2937", borderRadius: "8px", overflow: "hidden" }}>
      <ReactFlow
        // Important: Always use the local versions here
        nodes={localNodes}
        edges={localEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        
        // Dragging & Interaction Settings
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        
        // Grid & View Config
        fitView
        snapToGrid={true}
        snapGrid={[15, 15]}
        connectionMode="loose"
      >
        <Panel position="top-right" style={{
          background: "rgba(17, 24, 39, 0.9)",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #374151",
          fontSize: "12px",
          color: "#d1d5db"
        }}>
          <div style={{ marginBottom: "4px", color: "#22d3ee" }}><strong>Workflow Controls</strong></div>
          <div>• Drag node to move</div>
          <div>• Drag handles to connect</div>
          <div>• Click node to edit data</div>
          <div>• Backspace/Delete to remove</div>
        </Panel>
        
        <MiniMap 
          nodeColor={(node) => node.selected ? '#22d3ee' : '#374151'}
          maskColor="rgba(0, 0, 0, 0.7)"
          style={{ background: "#111827", border: "1px solid #1f2937" }}
        />
        <Controls style={{ background: "#111827", border: "1px solid #1f2937", fill: "#fff" }} />
        <Background gap={20} size={1} color="#374151" variant="dots" />
      </ReactFlow>
    </div>
  );
}
