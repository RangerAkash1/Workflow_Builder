// Component library shows draggable (or clickable) items to add onto the canvas.
export default function ComponentLibrary({ components, onAdd }) {
  return (
    <div>
      <div className="list-title">Components</div>
      <div className="component-list">
        {components.map((c) => (
          <button key={c.type} onClick={() => onAdd(c)}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
