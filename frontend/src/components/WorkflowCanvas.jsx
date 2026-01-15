import { useCallback } from "react";
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

  // Sync local state with parent when changes are finalized
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes);
    
    // Update parent state after internal state is updated
    const hasPositionChange = changes.some(c => c.type === 'position' && c.dragging === false);
    const hasRemove = changes.some(c => c.type === 'remove');
    
    if (hasPositionChange || hasRemove) {
      setTimeout(() => {
        setLocalNodes((currentNodes) => {
          setNodes(currentNodes);
          return currentNodes;
        });
      }, 0);
    }
  }, [onNodesChange, setNodes, setLocalNodes]);

  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    
    // Update parent state for edge changes
    setTimeout(() => {
      setLocalEdges((currentEdges) => {
        setEdges(currentEdges);
        return currentEdges;
      });
    }, 0);
  }, [onEdgesChange, setEdges, setLocalEdges]);

  // Handle new connections between nodes
  const onConnect = useCallback((params) => {
    setLocalEdges((eds) => {
      const newEdges = addEdge({ ...params, animated: true, type: 'smoothstep' }, eds);
      setEdges(newEdges);
      return newEdges;
    });
  }, [setLocalEdges, setEdges]);

  // Handle node selection for configuration
  const onNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    onSelectNode(node.id);
  }, [onSelectNode]);

  // Clear selection when clicking canvas background
  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  // Sync nodes from parent (when loading workflow)
  const displayNodes = nodes.length !== localNodes.length ? nodes : localNodes;
  const displayEdges = edges.length !== localEdges.length ? edges : localEdges;

  return (
    <div style={{ height: "60vh", width: "100%", position: "relative" }}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        
        // UX improvements for better interaction
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        
        // Clear interaction modes
        panOnScroll={false}  // Use middle mouse or space+drag for panning
        panOnDrag={true}    // Left-click drag to pan canvas
        selectionOnDrag={false}  // Disable box selection to avoid conflicts
        zoomOnScroll={true}  // Scroll to zoom
        zoomOnDoubleClick={false}  // Disable double-click zoom
        
        // Better connection behavior
        connectionMode="loose"
        snapToGrid={true}
        snapGrid={[15, 15]}
        
        attributionPosition="bottom-left"
        
        // Improve node dragging feel
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
          <div>• Click & drag canvas to pan</div>
          <div>• Click node to select/configure</div>
          <div>• Drag node to move it</div>
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
