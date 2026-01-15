// Action buttons for building, chatting, and managing workflows.
export default function ExecutionControls({ onBuild, chatOpen, onChatOpen, onManager }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={onBuild}>Build Stack</button>
      <button onClick={onChatOpen} disabled={!chatOpen}>Chat with Stack</button>
      <button onClick={onManager}>Save/Load</button>
    </div>
  );
}
