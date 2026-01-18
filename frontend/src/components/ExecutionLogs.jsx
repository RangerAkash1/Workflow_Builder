import { useEffect, useState } from "react";

export default function ExecutionLogs({ api, workflowUuid = null }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchLogs();
  }, [workflowUuid, statusFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (workflowUuid) params.append("workflow_uuid", workflowUuid);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("limit", "50");
      
      const res = await api.get(`/execution/logs?${params.toString()}`);
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error("Failed to fetch execution logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      success: "#22c55e",
      error: "#ef4444",
      timeout: "#f59e0b",
    };
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "4px",
          backgroundColor: colors[status] || "#6b7280",
          color: "white",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="execution-logs">Loading execution logs...</div>;
  }

  return (
    <div className="execution-logs">
      <div className="logs-header">
        <h3>Execution Logs</h3>
        <div className="filter-controls">
          <label>Status: </label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="timeout">Timeout</option>
          </select>
          <button onClick={fetchLogs}>Refresh</button>
        </div>
      </div>

      {logs.length === 0 ? (
        <p>No execution logs found.</p>
      ) : (
        <div className="logs-list">
          {logs.map((log) => (
            <div key={log.uuid} className="log-entry">
              <div className="log-header">
                <span className="log-date">{formatDate(log.created_at)}</span>
                {getStatusBadge(log.status)}
                {log.execution_time_ms && (
                  <span className="log-time">{log.execution_time_ms}ms</span>
                )}
              </div>
              
              {log.workflow_name && (
                <div className="log-workflow">
                  <strong>Workflow:</strong> {log.workflow_name}
                </div>
              )}
              
              {log.message && (
                <div className="log-message">
                  <strong>Query:</strong> {log.message}
                </div>
              )}
              
              {log.response && (
                <div className="log-response">
                  <strong>Response:</strong> {log.response.substring(0, 200)}
                  {log.response.length > 200 && "..."}
                </div>
              )}
              
              {log.error_message && (
                <div className="log-error">
                  <strong>Error:</strong> {log.error_message}
                </div>
              )}
              
              <div className="log-metadata">
                {log.provider && <span>Provider: {log.provider}</span>}
                {log.context_used > 0 && <span>Context chunks: {log.context_used}</span>}
                {log.web_used && <span>Web search: Yes</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
