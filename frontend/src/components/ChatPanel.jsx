import { useState } from "react";

// Chat panel reuses the built stack to send messages to the backend runner.
// Now includes metadata (retrieved context, web search usage) for transparency.
export default function ChatPanel({ open, api, workflow }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);

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
      // Store answer along with metadata for UI rendering.
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
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error running workflow" }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return <div>Build the stack to enable chat.</div>;
  }

  return (
    <div className="chat-panel">
      <div className="chat-log">
        {messages.map((m, idx) => (
          <div key={idx} className={`bubble ${m.role}`}>
            <strong>{m.role === "user" ? "You" : "Assistant"}:</strong> {m.content}
            {/* Display metadata for assistant messages showing retrieval/web search info. */}
            {m.metadata && (
              <div style={{ marginTop: 8, fontSize: "12px", opacity: 0.8, borderTop: "1px solid #4b5563", paddingTop: 6 }}>
                <div>Provider: {m.metadata.provider}</div>
                {m.metadata.context_used > 0 && (
                  <div>
                    <div>Retrieved {m.metadata.context_used} context chunk(s):</div>
                    {m.metadata.context_samples?.map((chunk, i) => (
                      <div key={i} style={{ marginLeft: 8, marginTop: 4, opacity: 0.7 }}>
                        "{chunk.substring(0, 60)}..."
                      </div>
                    ))}
                  </div>
                )}
                {m.metadata.web_used && (
                  <div>
                    <div>Web search snippets:</div>
                    {m.metadata.web_samples?.map((snippet, i) => (
                      <div key={i} style={{ marginLeft: 8, marginTop: 4, opacity: 0.7 }}>
                        "{snippet.substring(0, 60)}..."
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your workflow..."
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button onClick={send} disabled={busy}>Send</button>
      </div>
    </div>
  );
}
