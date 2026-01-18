import { useState, useRef, useEffect } from "react";

export default function ChatPanel({ open, api, workflow }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const nextHistory = [...messages, { role: "user", content: input }];
    setMessages(nextHistory);
    setInput("");
    setBusy(true);
    try {
      const res = await api.post("/chat/run", {
        workflow,
        message: input,
        history: nextHistory.map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          metadata: {
            provider: res.data.provider,
            context_used: res.data.context_used,
            context_samples: res.data.context_samples,
            web_used: res.data.web_used,
            web_samples: res.data.web_samples,
          },
        },
      ]);
    } catch (err) {
      console.error(err.response?.data?.detail || err.message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Error running workflow: " + (err.response?.data?.detail || err.message),
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#6b7280",
        textAlign: "center",
        flexDirection: "column",
        gap: "12px"
      }}>
        <div style={{ fontSize: "32px" }}>🚀</div>
        <div style={{ fontWeight: "600" }}>Build your workflow to start chatting</div>
        <div style={{ fontSize: "13px", color: "#9ca3af" }}>
          Configure nodes and click "Build & Chat" to begin
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#22d3ee" }}>💬 Chat</div>
        <div style={{ fontSize: "12px", color: "#9ca3af" }}>
          {messages.length > 0 ? `${messages.length} message${messages.length !== 1 ? 's' : ''}` : 'No messages yet'}
        </div>
      </div>

      <div className="chat-log">
        {messages.length === 0 ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#6b7280",
            textAlign: "center",
            flexDirection: "column",
            gap: "12px"
          }}>
            <div style={{ fontSize: "28px" }}>💭</div>
            <div style={{ fontWeight: "500" }}>Start a conversation</div>
            <div style={{ fontSize: "12px", color: "#9ca3af" }}>
              Ask your workflow any question
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.role}`}>
              <div className="chat-bubble-header">
                <span className="chat-role">
                  {m.role === "user" ? "👤 You" : "🤖 Assistant"}
                </span>
              </div>

              <div className="chat-bubble-content">
                {m.content}
              </div>

              {/* Display metadata for assistant messages */}
              {m.metadata && (
                <div className="chat-metadata">
                  <div className="metadata-row">
                    <span className="metadata-label">Provider:</span>
                    <span className="metadata-value">{m.metadata.provider}</span>
                  </div>

                  {m.metadata.context_used > 0 && (
                    <div className="metadata-section">
                      <div className="metadata-label">📚 Retrieved Context</div>
                      <div style={{ fontSize: "12px", color: "#d1d5db", marginTop: "6px" }}>
                        {m.metadata.context_used} chunk{m.metadata.context_used !== 1 ? 's' : ''}
                      </div>
                      {m.metadata.context_samples?.slice(0, 2).map((chunk, i) => (
                        <div key={i} className="context-sample">
                          "{chunk.substring(0, 80)}{chunk.length > 80 ? '...' : ''}"
                        </div>
                      ))}
                      {m.metadata.context_samples?.length > 2 && (
                        <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                          +{m.metadata.context_samples.length - 2} more
                        </div>
                      )}
                    </div>
                  )}

                  {m.metadata.web_used && (
                    <div className="metadata-section">
                      <div className="metadata-label">🌐 Web Search Results</div>
                      {m.metadata.web_samples?.slice(0, 2).map((snippet, i) => (
                        <div key={i} className="context-sample">
                          "{snippet.substring(0, 80)}{snippet.length > 80 ? '...' : ''}"
                        </div>
                      ))}
                      {m.metadata.web_samples?.length > 2 && (
                        <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                          +{m.metadata.web_samples.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {m.error && (
                <div className="chat-error">
                  {m.content}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your workflow something..."
          className="chat-input"
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !busy) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="chat-send-btn"
          title={busy ? "Processing..." : "Send message (Enter)"}
        >
          {busy ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}