import { useState } from "react";

export default function AuthPanel({ api, onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // 'login' or 'register'
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await api.post("/auth/login", { username, password });
      const { access_token, user } = res.data;
      
      // Store token and user info
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Configure axios to include token in future requests
      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      
      onAuthSuccess(user);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }
    
    if (password.length > 72) {
      setError("Password too long. Maximum 72 characters allowed");
      setLoading(false);
      return;
    }
    
    try {
      const res = await api.post("/auth/register", { username, email, password });
      const { access_token, user } = res.data;
      
      // Store token and user info
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Configure axios to include token in future requests
      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      
      onAuthSuccess(user);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-panel">
      <h2>{mode === "login" ? "Login" : "Register"}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        {mode === "register" && (
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        )}
        
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : mode === "login" ? "Login" : "Register"}
        </button>
      </form>
      
      <div className="auth-toggle">
        {mode === "login" ? (
          <p>
            Don't have an account?{" "}
            <button type="button" onClick={() => setMode("register")}>
              Register
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("login")}>
              Login
            </button>
          </p>
        )}
      </div>
      
      <div className="auth-skip">
        <button type="button" onClick={() => onAuthSuccess(null)}>
          Continue without login
        </button>
      </div>
    </div>
  );
}
