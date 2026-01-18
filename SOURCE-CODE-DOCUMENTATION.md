# Complete Source Code Documentation

## Table of Contents
1. [Backend Source Code Overview](#backend-source-code-overview)
2. [Frontend Source Code Overview](#frontend-source-code-overview)
3. [Key Components & Implementation](#key-components--implementation)
4. [Code Interactions & Flow](#code-interactions--flow)
5. [API Endpoints Detailed](#api-endpoints-detailed)
6. [Frontend Components Detailed](#frontend-components-detailed)
7. [Module Dependencies](#module-dependencies)
8. [Code Examples & Patterns](#code-examples--patterns)

---

## Backend Source Code Overview

### Structure
```
backend/
├── app/
│   ├── main.py          # FastAPI application, all endpoints (796 lines)
│   ├── config.py        # Configuration management (40 lines)
│   ├── auth.py          # Authentication logic (155 lines)
│   ├── database.py      # Database operations (471 lines)
│   └── __pycache__/
├── requirements.txt     # Python dependencies
├── Dockerfile           # Container configuration
└── render.yaml          # Deployment configuration
```

### Backend Technology Stack
```
Framework:        FastAPI 0.115.2
Async Runtime:    asyncpg 0.30.0 (async PostgreSQL driver)
Authentication:   python-jose, passlib, bcrypt
Vector DB:        chromadb 1.3.6, faiss-cpu 1.13.0
Embeddings:       sentence-transformers 3.4.1
LLM APIs:         openai 1.58.1, google-generativeai 0.8.3
Search:           google-search-results 2.4.2
Rate Limiting:    slowapi 0.1.9
PDF Processing:   PyMuPDF 1.26.6
```

---

## Backend Module Detailed Documentation

### 1. **main.py** - Application Entry Point & Endpoints

#### File Purpose
Central FastAPI application definition with all HTTP endpoints for:
- Authentication (register, login)
- Workflow management (CRUD operations)
- Knowledge base management (upload, query)
- Chat execution
- Logging and history

#### Key Sections

**A. Imports & Initialization**
```python
# Core imports
import asyncio, chromadb, fitz
from fastapi import FastAPI, File, HTTPException, UploadFile, Request, Depends
from openai import AsyncOpenAI
from serpapi import GoogleSearch

# App initialization
app = FastAPI(title="Workflow Builder API", version="0.3.0")

# CORS middleware
app.add_middleware(CORSMiddleware, allow_origins=[...])

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```

**B. Global State & Cleanup**
```python
_request_timestamps: Dict[str, List[float]] = {}          # Track requests per IP
_collection_request_timestamps: Dict[str, List[float]] = {}
_last_cleanup = time.time()

async def cleanup_old_timestamps():
    """Prevent memory leak by removing old IP entries after 1 hour"""
```

**C. Database Startup**
```python
@app.on_event("startup")
async def startup_db():
    """Initialize PostgreSQL pool on app startup"""
    await init_db()
```

#### Endpoint Categories

**Authentication Endpoints**
```python
# POST /auth/register
# Body: { username, email, password }
# Returns: { access_token, user: {...} }
# Status: 201 Created

# POST /auth/login
# Body: { username, password }
# Returns: { access_token, user: {...} }
# Status: 200 OK

# GET /auth/me
# Headers: Authorization: Bearer <token>
# Returns: { id, username, email, created_at }
# Status: 200 OK (if authenticated)
```

**Workflow Endpoints**
```python
# POST /workflow/save
# Body: { name, description, nodes, edges }
# Returns: { uuid, name, description, created_at }
# Rate: 30/minute

# GET /workflow/{uuid}
# Returns: { uuid, name, description, nodes, edges, created_at, updated_at }

# GET /workflow/list
# Query params: ?user_id=1 (optional)
# Returns: [{ uuid, name, description, created_at }]

# PUT /workflow/{uuid}
# Body: { name, description, nodes, edges }

# DELETE /workflow/{uuid}
# Returns: { status: "deleted" }
```

**Knowledge Base Endpoints**
```python
# POST /knowledge/upload
# Form: file (PDF), collection, chunk_size, embedding_model
# Returns: { collection, chunks, doc_uuid, ids }
# Rate: 20/minute

# GET /knowledge/collections
# Returns: { collections: [{name, metadata}] }

# POST /knowledge/query
# Body: { collection, query, top_k, embedding_model }
# Returns: { results: [{text, score, metadata}] }
```

**Chat Endpoints**
```python
# POST /chat/run
# Body: { workflow, message, history }
# Returns: { answer, provider, context_used, context_samples, web_used, web_samples, execution_time_ms }
# Rate: 40/minute

# GET /chat-logs
# Query: ?workflow_uuid=&limit=100
# Returns: [{ uuid, message, response, provider, created_at }]

# GET /execution-logs
# Query: ?workflow_uuid=&status=&limit=100
# Returns: [{ uuid, status, execution_time_ms, error_message, created_at }]
```

#### Helper Functions

**Text Processing**
```python
def extract_text_from_pdf_bytes(data: bytes) -> str:
    """Convert PDF bytes to text using PyMuPDF (fitz)"""
    with fitz.open(stream=data, filetype="pdf") as doc:
        return "\n".join([page.get_text() for page in doc])

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 80) -> List[str]:
    """Split text into overlapping chunks for embeddings"""
    # Sliding window: each chunk overlaps with next
```

**Embedding**
```python
async def embed_texts(texts: List[str], settings: Settings, 
                     embedding_model: Optional[str] = None) -> List[List[float]]:
    """
    Embed text using OpenAI (preferred) or fallback to Sentence-Transformers
    Returns vector embeddings (384-dim for all-MiniLM-L6-v2 model)
    """
    if settings.openai_api_key:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.embeddings.create(...)
        return [item.embedding for item in response.data]
    else:
        # Fallback to Hugging Face model
        return await embed_with_hf(texts, embedding_model)
```

**LLM Integration**
```python
async def call_llm(provider: str, prompt: str, settings: Settings, 
                  model: Optional[str], history: Optional[List]) -> str:
    """
    Call either OpenAI GPT-4o or Google Gemini
    Returns LLM response text
    """
    if provider == "openai":
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model=model or "gpt-4o-mini",
            messages=build_messages(prompt, history)
        )
    else:  # gemini
        genai.configure(api_key=settings.gemini_api_key)
        model_obj = genai.GenerativeModel(model or "gemini-1.5-flash")
        response = model_obj.generate_content(prompt)
    return response.choices[0].message.content if provider == "openai" else response.text
```

**Workflow Validation**
```python
def validate_topology(workflow: WorkflowDefinition) -> Dict[str, ComponentConfig]:
    """
    Validate workflow has required components in valid configuration:
    - Must have exactly 1 LLM Engine
    - Optional Knowledge Base
    - Optional Web Search
    Returns dict of nodes keyed by type for easy access
    """
```

**Web Search**
```python
def run_web_search(query: str, settings: Settings) -> List[str]:
    """Query SerpAPI to get relevant web snippets for context"""
    search = GoogleSearch({"q": query, "api_key": settings.serpapi_key})
    results = search.get_dict()
    return [result.get("snippet", "") for result in results.get("organic_results", [])]
```

**Prompt Building**
```python
def build_prompt(question: str, context: List[str], web_snippets: List[str], 
                custom_prompt: Optional[str] = None) -> str:
    """
    Construct final prompt for LLM:
    - Context from knowledge base (RAG)
    - Web search results
    - User question
    - Custom system prompt if provided
    Returns formatted prompt string
    """
```

### 2. **config.py** - Configuration Management

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LLM API Keys
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    serpapi_key: str | None = None
    brave_api_key: str | None = None
    
    # Database
    database_url: str | None = None  # PostgreSQL connection string
    chroma_path: str = ".chroma"     # Vector DB storage path
    
    # Authentication
    secret_key: str = "your-secret-key-change-this-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_days: int = 7
    
    # CORS Settings
    cors_origins: list[str] = ["*"]
    cors_credentials: bool = False
    cors_methods: list[str] = ["*"]
    cors_headers: list[str] = ["*"]
    
    # Rate Limiting (requests per minute per IP)
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_period: int = 60
    
    # Throttling (min seconds between requests)
    throttle_enabled: bool = True
    throttle_delay: float = 0.1  # 100ms
    
    # Collection endpoint specific throttling
    collection_endpoint_rate_limit: int = 10  # 10 requests/min
    
    class Config:
        env_file = ".env"
        extra = "ignore"

def get_settings() -> Settings:
    """Lazy singleton getter for settings"""
    return Settings()
```

**Environment Variables Used**
```
DATABASE_URL=postgresql://user:pass@host:port/db
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIzaSy...
SERPAPI_KEY=...
SECRET_KEY=your-jwt-secret
```

### 3. **auth.py** - Authentication & Authorization

```python
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compare plain text password to bcrypt hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a plain text password using bcrypt"""
    return pwd_context.hash(password)

def create_access_token(data: dict, settings: Settings, 
                       expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT token with expiration (default 7 days)
    Payload contains: sub (user_id), username, exp (expiration timestamp)
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)

def decode_access_token(token: str, settings: Settings) -> Optional[dict]:
    """
    Validate and decode JWT token
    Returns payload dict if valid, None if invalid/expired
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None

async def authenticate_user(username: str, password: str) -> Optional[dict]:
    """
    Validate username + password combination
    1. Get user from database
    2. Verify password against hash
    3. Check if user is active
    Returns user dict if valid, None otherwise
    """
    user = await get_user_by_username(username)
    if not user or not verify_password(password, user["hashed_password"]):
        return None
    if not user.get("is_active", True):
        return None
    return user

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    settings: Settings = Depends(get_settings)
) -> Optional[dict]:
    """
    OPTIONAL authentication dependency
    Returns user dict if valid token, None if no/invalid token
    Used for endpoints that support both authenticated and anonymous users
    """
    if not credentials:
        return None
    token = credentials.credentials
    payload = decode_access_token(token, settings)
    if not payload:
        return None
    user = await get_user_by_id(payload.get("sub"))
    return user if user and user.get("is_active", True) else None

async def get_current_user_required(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings)
) -> dict:
    """
    REQUIRED authentication dependency
    Raises 401 if no valid token
    Used for protected endpoints that require authentication
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_access_token(credentials.credentials, settings)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = await get_user_by_id(payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user
```

**Authentication Flow**
```
User → POST /auth/register or /auth/login
         ↓
      Backend validates credentials
         ↓
      Generate JWT token (HS256)
         ↓
      Store token in localStorage (frontend)
         ↓
      Include in Authorization header for future requests
         ↓
      Middleware validates token signature
         ↓
      Extract user info from token payload
```

### 4. **database.py** - Data Persistence Layer

```python
import asyncpg
from typing import Any, Dict, List, Optional

_pool: asyncpg.Pool | None = None

async def init_db() -> asyncpg.Pool:
    """
    Initialize PostgreSQL connection pool and create schema
    Called once on app startup
    Creates tables: users, workflows, documents, chat_logs, execution_logs
    """
    global _pool
    settings = get_settings()
    
    # Create connection pool (2-10 connections)
    _pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)
    
    # Create tables if not exist
    async with _pool.acquire() as conn:
        # Users table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(36) UNIQUE NOT NULL,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # Workflows table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS workflows (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(36) UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                nodes JSONB NOT NULL,      -- Node definitions as JSON
                edges JSONB NOT NULL,      -- Edge connections as JSON
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # Documents table (tracks uploaded PDFs)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(36) UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                filename VARCHAR(512) NOT NULL,
                file_size INTEGER,
                collection_name VARCHAR(255) NOT NULL,  -- ChromaDB collection
                chunk_count INTEGER DEFAULT 0,
                embedding_model VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # Chat logs (conversation history)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_logs (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(36) UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id),
                workflow_uuid VARCHAR(36),
                message TEXT NOT NULL,
                response TEXT,
                provider VARCHAR(50),              -- 'openai' or 'gemini'
                context_used INTEGER DEFAULT 0,   -- Number of context chunks
                web_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        # Execution logs (workflow run history)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS execution_logs (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(36) UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id),
                workflow_uuid VARCHAR(36),
                workflow_name VARCHAR(255),
                status VARCHAR(50) NOT NULL,       -- 'success', 'error'
                message TEXT,
                response TEXT,
                provider VARCHAR(50),
                execution_time_ms INTEGER,
                error_message TEXT,
                context_used INTEGER DEFAULT 0,
                web_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
    
    return _pool

# User Management Functions
async def create_user(username: str, email: str, hashed_password: str) -> Dict[str, Any]:
    """Create new user in database"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO users (username, email, hashed_password)
            VALUES ($1, $2, $3)
            RETURNING id, uuid, username, email, created_at
        """, username, email, hashed_password)
    return dict(row) if row else {}

async def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Retrieve user by username (used for login)"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, uuid, username, email, hashed_password, is_active, created_at FROM users WHERE username = $1",
            username
        )
    return dict(row) if row else None

async def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve user by ID (used for auth validation)"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, uuid, username, email, is_active, created_at FROM users WHERE id = $1",
            user_id
        )
    return dict(row) if row else None

# Workflow CRUD Functions
async def save_workflow(name: str, description: str, nodes: List[Dict[str, Any]], 
                       edges: List[Dict[str, Any]], user_id: Optional[int] = None) -> Dict[str, Any]:
    """Save workflow to database"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO workflows (name, description, nodes, edges, user_id)
            VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
            RETURNING id, uuid, name, description, created_at, updated_at
        """, name, description or "", json.dumps(nodes), json.dumps(edges), user_id)
    return dict(row) if row else {}

async def get_workflow(uuid: str) -> Optional[Dict[str, Any]]:
    """Retrieve workflow by UUID"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, uuid, name, description, nodes, edges, created_at, updated_at FROM workflows WHERE uuid = $1",
            uuid
        )
    if not row:
        return None
    data = dict(row)
    data["nodes"] = json.loads(data["nodes"])
    data["edges"] = json.loads(data["edges"])
    return data

async def list_workflows(user_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """List all workflows (optionally filtered by user)"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if user_id:
            rows = await conn.fetch(
                "SELECT uuid, name, description, created_at, updated_at FROM workflows WHERE user_id = $1 ORDER BY updated_at DESC",
                user_id
            )
        else:
            rows = await conn.fetch(
                "SELECT uuid, name, description, created_at, updated_at FROM workflows ORDER BY updated_at DESC"
            )
    return [dict(row) for row in rows]

async def update_workflow(uuid: str, name: str, description: str, 
                         nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Update existing workflow"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE workflows
            SET name = $1, description = $2, nodes = $3::jsonb, edges = $4::jsonb, updated_at = NOW()
            WHERE uuid = $5
            RETURNING id, uuid, name, description, created_at, updated_at
        """, name, description or "", json.dumps(nodes), json.dumps(edges), uuid)
    return dict(row) if row else {}

async def delete_workflow(uuid: str) -> bool:
    """Delete workflow by UUID"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM workflows WHERE uuid = $1", uuid)
    return result == "DELETE 1"

# Document Tracking Functions
async def save_document_metadata(filename: str, file_size: int, collection_name: str,
                                chunk_count: int, embedding_model: str,
                                user_id: Optional[int] = None) -> Dict[str, Any]:
    """Track uploaded document in database"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO documents (filename, file_size, collection_name, chunk_count, embedding_model, user_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING uuid, filename, collection_name, chunk_count, created_at
        """, filename, file_size, collection_name, chunk_count, embedding_model, user_id)
    return dict(row) if row else {}

async def list_documents(collection_name: Optional[str] = None,
                        user_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """List documents with optional filtering"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if collection_name and user_id:
            rows = await conn.fetch("""
                SELECT uuid, filename, file_size, collection_name, chunk_count, created_at
                FROM documents WHERE collection_name = $1 AND user_id = $2 ORDER BY created_at DESC
            """, collection_name, user_id)
        elif user_id:
            rows = await conn.fetch("""
                SELECT uuid, filename, file_size, collection_name, chunk_count, created_at
                FROM documents WHERE user_id = $1 ORDER BY created_at DESC
            """, user_id)
        else:
            rows = await conn.fetch(
                "SELECT uuid, filename, file_size, collection_name, chunk_count, created_at FROM documents ORDER BY created_at DESC"
            )
    return [dict(row) for row in rows]

# Logging Functions
async def save_chat_log(workflow_uuid: Optional[str], message: str, response: str,
                       provider: str, context_used: int, web_used: bool,
                       user_id: Optional[int] = None) -> Dict[str, Any]:
    """Log chat interaction"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO chat_logs (workflow_uuid, message, response, provider, context_used, web_used, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING uuid, message, response, provider, created_at
        """, workflow_uuid, message, response, provider, context_used, web_used, user_id)
    return dict(row) if row else {}

async def list_chat_logs(user_id: Optional[int] = None, workflow_uuid: Optional[str] = None,
                        limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieve chat history"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        query = "SELECT uuid, message, response, provider, context_used, web_used, created_at FROM chat_logs WHERE 1=1"
        params = []
        
        if workflow_uuid:
            query += " AND workflow_uuid = $" + str(len(params) + 1)
            params.append(workflow_uuid)
        if user_id:
            query += " AND user_id = $" + str(len(params) + 1)
            params.append(user_id)
        
        query += " ORDER BY created_at DESC LIMIT $" + str(len(params) + 1)
        params.append(limit)
        
        rows = await conn.fetch(query, *params)
    return [dict(row) for row in rows]

async def save_execution_log(user_id: Optional[int], workflow_uuid: Optional[str],
                            workflow_name: Optional[str], status: str, message: str,
                            response: Optional[str], provider: Optional[str],
                            execution_time_ms: int, error_message: Optional[str],
                            context_used: int, web_used: bool) -> Dict[str, Any]:
    """Log workflow execution"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO execution_logs (user_id, workflow_uuid, workflow_name, status, message,
                                       response, provider, execution_time_ms, error_message,
                                       context_used, web_used)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING uuid, status, execution_time_ms, created_at
        """, user_id, workflow_uuid, workflow_name, status, message,
            response, provider, execution_time_ms, error_message, context_used, web_used)
    return dict(row) if row else {}

async def list_execution_logs(user_id: Optional[int] = None, workflow_uuid: Optional[str] = None,
                             status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieve execution history"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        query = "SELECT uuid, workflow_uuid, workflow_name, status, message, response, provider, execution_time_ms, error_message, context_used, web_used, created_at FROM execution_logs WHERE 1=1"
        params = []
        
        if user_id:
            query += " AND user_id = $" + str(len(params) + 1)
            params.append(user_id)
        if workflow_uuid:
            query += " AND workflow_uuid = $" + str(len(params) + 1)
            params.append(workflow_uuid)
        if status:
            query += " AND status = $" + str(len(params) + 1)
            params.append(status)
        
        query += " ORDER BY created_at DESC LIMIT $" + str(len(params) + 1)
        params.append(limit)
        
        rows = await conn.fetch(query, *params)
    return [dict(row) for row in rows]
```

---

## Frontend Source Code Overview

### Structure
```
frontend/
├── src/
│   ├── App.jsx                  # Main app controller (319 lines)
│   ├── main.jsx                 # Entry point
│   ├── style.css                # Global styles
│   └── components/
│       ├── AuthPanel.jsx        # Login/Register
│       ├── WorkflowCanvas.jsx   # Visual editor
│       ├── ComponentLibrary.jsx # Available components
│       ├── ConfigPanel.jsx      # Node settings
│       ├── ChatPanel.jsx        # Chat interface
│       ├── ExecutionControls.jsx # Run/Save buttons
│       ├── WorkflowManager.jsx  # Save/Load workflows
│       └── ExecutionLogs.jsx    # History display
├── package.json
├── vite.config.js
└── Dockerfile
```

### Frontend Technology Stack
```
Framework:        React 18 + Vite
HTTP Client:      Axios with interceptors
Visualization:    React Flow (workflow canvas)
State Management: React Hooks (useState, useEffect, useCallback)
Styling:          CSS
```

### **App.jsx** - Main Application Controller

```javascript
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { WorkflowCanvas, ChatPanel, AuthPanel, ... } from "./components";

// 1. API Client Setup
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:8000",
  timeout: 30000,
});

// 2. Request Interceptor - Add Auth Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Response Interceptor - Handle Errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      // Rate limited
      return Promise.reject(new Error("Too many requests. Please wait."));
    }
    if (error.response?.status === 401) {
      // Token expired
      localStorage.removeItem("access_token");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// 4. Main App Component
export default function App() {
  // State Management
  const [nodes, setNodes] = useState([]);                // Workflow nodes
  const [edges, setEdges] = useState([]);                // Workflow edges
  const [selectedId, setSelectedId] = useState(null);    // Selected node
  const [chatOpen, setChatOpen] = useState(false);       // Chat panel visibility
  const [user, setUser] = useState(null);                // Current user
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);  // Active workflow
  const [showLogs, setShowLogs] = useState(false);       // Execution logs visibility
  
  // Check for saved authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } catch (err) {
        console.error("Failed to parse saved user:", err);
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      }
    }
  }, []);
  
  // Handle Authentication Success
  const handleAuthSuccess = useCallback((authenticatedUser) => {
    setUser(authenticatedUser);
  }, []);
  
  // Handle Logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
    setNodes([]);
    setEdges([]);
  }, []);
  
  // Save Workflow to Backend
  const saveWorkflow = useCallback(async () => {
    const workflowName = prompt("Enter workflow name:");
    if (!workflowName) return;
    
    try {
      const response = await api.post("/workflow/save", {
        name: workflowName,
        description: "Saved workflow",
        nodes,
        edges,
      });
      setCurrentWorkflowId(response.data.uuid);
      alert("Workflow saved successfully!");
    } catch (error) {
      alert("Failed to save workflow: " + error.message);
    }
  }, [nodes, edges]);
  
  // Load Workflow from Backend
  const loadWorkflow = useCallback(async (workflowId) => {
    try {
      const response = await api.get(`/workflow/${workflowId}`);
      setNodes(response.data.nodes);
      setEdges(response.data.edges);
      setCurrentWorkflowId(workflowId);
    } catch (error) {
      alert("Failed to load workflow: " + error.message);
    }
  }, []);
  
  // Execute Workflow with Chat
  const executeWorkflow = useCallback(async (message) => {
    try {
      const response = await api.post("/chat/run", {
        workflow: { nodes, edges },
        message: message,
        history: [],
      });
      return response.data;
    } catch (error) {
      throw new Error("Workflow execution failed: " + error.message);
    }
  }, [nodes, edges]);
  
  // Component Configuration
  const COMPONENT_TYPES = [
    { type: "user_query", label: "User Query" },
    { type: "knowledge_base", label: "Knowledge Base" },
    { type: "llm_engine", label: "LLM Engine" },
    { type: "output", label: "Output" },
  ];
  
  return (
    <div className="app-container">
      {!user ? (
        <AuthPanel onAuthSuccess={handleAuthSuccess} />
      ) : (
        <>
          <header>
            <h1>Workflow Builder</h1>
            <div className="user-info">
              <span>Welcome, {user.username}!</span>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </header>
          
          <main className="app-main">
            <aside className="sidebar">
              <ComponentLibrary components={COMPONENT_TYPES} />
              <WorkflowManager onLoadWorkflow={loadWorkflow} />
            </aside>
            
            <section className="canvas-section">
              <WorkflowCanvas
                nodes={nodes}
                setNodes={setNodes}
                edges={edges}
                setEdges={setEdges}
                onSelectNode={setSelectedId}
              />
            </section>
            
            <aside className="config-section">
              <ConfigPanel
                selectedNode={nodes.find((n) => n.id === selectedId)}
                onUpdate={(updatedNode) => {
                  setNodes(nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
                }}
              />
              <ExecutionControls
                onSave={saveWorkflow}
                onExecute={() => setChatOpen(true)}
              />
              <ExecutionLogs open={showLogs} onClose={() => setShowLogs(false)} />
            </aside>
          </main>
          
          {chatOpen && (
            <ChatPanel
              onExecuteWorkflow={executeWorkflow}
              onClose={() => setChatOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
```

### Frontend Components

#### **AuthPanel.jsx** - Authentication
```javascript
// Handles user registration and login
// Features:
// - Username/email input
// - Password hashing (done on backend)
// - JWT token storage
// - Error handling
// - Redirect to app on success
```

#### **WorkflowCanvas.jsx** - Visual Editor
```javascript
// React Flow based workflow designer
// Features:
// - Drag-and-drop nodes
// - Connect nodes with edges
// - Delete nodes/edges
// - Node validation
// - Undo/redo support
```

#### **ComponentLibrary.jsx** - Available Components
```javascript
// Displays available component types:
// - User Query: Input for questions
// - Knowledge Base: RAG retrieval configuration
// - LLM Engine: LLM model selection
// - Output: Display results
```

#### **ConfigPanel.jsx** - Node Configuration
```javascript
// Edit selected node properties
// - Collection name (for KB nodes)
// - Model selection (for LLM nodes)
// - Parameters and settings
// - Web search toggle
```

#### **ChatPanel.jsx** - Chat Interface
```javascript
// Execute workflow and chat
// - Message input
// - Message history display
// - Loading states
// - Response streaming
// - Error handling
```

#### **ExecutionControls.jsx** - Actions
```javascript
// Save and Execute buttons
// - Save workflow to backend
// - Execute workflow with current message
// - Loading and error states
```

#### **WorkflowManager.jsx** - Workflow CRUD
```javascript
// Load/Save workflows
// - List saved workflows
// - Create new workflow
// - Delete workflows
// - Load into canvas
```

#### **ExecutionLogs.jsx** - History
```javascript
// Display execution history
// - Chat logs
// - Execution logs
// - Timestamps and provider info
// - Error messages
```

---

## Code Interactions & Flow

### Complete Request/Response Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: User interacts with UI                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┴───────────────┐
        │                              │
        ▼                              ▼
   ┌─────────────┐            ┌──────────────┐
   │ AuthPanel   │            │ WorkflowCanvas│
   │ - Login     │            │ - Add node   │
   │ - Register  │            │ - Connect    │
   └──────┬──────┘            └────────┬─────┘
          │                            │
          └────────────┬───────────────┘
                       │
        ┌──────────────▼───────────────┐
        │ App.jsx - Main Controller    │
        │ Handles state & calls API    │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼───────────────┐
        │ Axios API Client             │
        │ - Request interceptor        │
        │ - Auth token injection       │
        │ - Response interceptor       │
        └──────────────┬───────────────┘
                       │
        HTTP Request   │
        ┌──────────────▼──────────────────────────────┐
        │ BACKEND: FastAPI Application                │
        │ app.py main.py                              │
        └──────────────┬──────────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────────┐
        │ FastAPI Route Handler                       │
        │ @app.post("/endpoint")                      │
        │ - CORS middleware (✓)                       │
        │ - Rate limiter (✓)                          │
        │ - Auth validation (✓)                       │
        │ - Input validation (✓)                      │
        └──────────────┬──────────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────────┐
        │ Business Logic Layer                        │
        │ - Workflow validation                       │
        │ - RAG pipeline                              │
        │ - LLM calls                                 │
        └───┬──────────────────────────────────────┬──┘
            │                                       │
            ▼                                       ▼
        ┌─────────────────┐                   ┌────────────────┐
        │ PostgreSQL      │                   │ ChromaDB +     │
        │ - workflows     │                   │ FAISS          │
        │ - users         │                   │ - embeddings   │
        │ - chat_logs     │                   │ - vectors      │
        └─────────────────┘                   └────────────────┘
            │                                       │
            └───────────────┬───────────────────────┘
                            │
                    HTTP Response
        ┌───────────────────▼────────────────────┐
        │ Response JSON                          │
        │ { data, status, errors }               │
        └───────────────────┬────────────────────┘
                            │
        ┌───────────────────▼────────────────────┐
        │ Axios Response Interceptor             │
        │ - Check status codes                   │
        │ - Handle errors                        │
        │ - Parse JSON                           │
        └───────────────────┬────────────────────┘
                            │
        ┌───────────────────▼────────────────────┐
        │ App.jsx State Update                   │
        │ setNodes(), setChatHistory()            │
        └───────────────────┬────────────────────┘
                            │
        ┌───────────────────▼────────────────────┐
        │ FRONTEND: Re-render Components         │
        │ - Update UI with new data              │
        │ - Display results                      │
        │ - Show errors if any                   │
        └───────────────────────────────────────┘
```

### Chat Execution Flow

```
User types message in ChatPanel
    ↓
executeWorkflow(message) called
    ↓
POST /chat/run with { workflow, message, history }
    ↓ (Backend)
validate_topology(workflow)
    ├→ Check LLM node exists
    ├→ Check connections valid
    └→ Extract node types
    ↓
IF Knowledge Base node:
    ├→ Get embeddings for message
    ├→ Query ChromaDB
    ├→ Retrieve top-3 chunks
    └→ context_chunks = [...]
    ↓
IF Web Search enabled:
    ├→ Query SerpAPI
    ├→ Get snippets
    └→ web_snippets = [...]
    ↓
build_prompt(question, context, web_snippets)
    └→ final_prompt = "..."
    ↓
call_llm(provider, prompt, history)
    ├→ IF OpenAI:
    │   └→ AsyncOpenAI.chat.completions.create()
    └→ IF Gemini:
        └→ gemini.GenerativeModel.generate_content()
    ↓
answer = LLM response
    ↓
save_chat_log(message, response, provider, context_used, ...)
    └→ Store in PostgreSQL
    ↓
RETURN { answer, provider, context_used, web_used, execution_time_ms }
    ↓ (Frontend)
Display response in ChatPanel
Update chat history
Show execution metrics
```

---

## Module Dependencies

### Backend Dependencies Graph

```
main.py
├── config.py
│   └── pydantic_settings
├── auth.py
│   ├── passlib
│   ├── python-jose
│   └── database.py
├── database.py
│   ├── asyncpg (PostgreSQL)
│   └── config.py
├── chromadb (Vector DB)
├── sentence-transformers (Embeddings)
├── openai (GPT models)
├── google-generativeai (Gemini)
├── serpapi (Web search)
├── PyMuPDF (PDF processing)
├── slowapi (Rate limiting)
└── fastapi (Web framework)
```

### Frontend Dependencies Graph

```
App.jsx
├── React (useCallback, useEffect, useState)
├── axios (HTTP client)
├── AuthPanel.jsx
├── WorkflowCanvas.jsx
│   └── react-flow-renderer
├── ConfigPanel.jsx
├── ChatPanel.jsx
├── ExecutionControls.jsx
├── WorkflowManager.jsx
└── ExecutionLogs.jsx
```

---

## Code Examples & Patterns

### Example 1: Workflow Save Flow

**Frontend (App.jsx)**
```javascript
const saveWorkflow = useCallback(async () => {
  const workflowName = prompt("Enter workflow name:");
  if (!workflowName) return;
  
  try {
    // Call backend API
    const response = await api.post("/workflow/save", {
      name: workflowName,
      description: "Saved workflow",
      nodes: nodes,  // Array of node objects
      edges: edges,  // Array of edge objects
    });
    
    // Update state with saved workflow ID
    setCurrentWorkflowId(response.data.uuid);
    alert("Workflow saved successfully!");
  } catch (error) {
    // Error handling
    alert("Failed to save workflow: " + error.message);
  }
}, [nodes, edges]);
```

**Backend (main.py)**
```python
@app.post("/workflow/save", response_model=None)
@limiter.limit("30/minute")
async def save_workflow_endpoint(
    request: Request,
    workflow_request: WorkflowSaveRequest,
    current_user: Optional[dict] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Save workflow to database"""
    
    # Validate workflow topology
    validate_topology(
        WorkflowDefinition(nodes=workflow_request.nodes, edges=workflow_request.edges)
    )
    
    # Extract user ID if authenticated
    user_id = current_user["id"] if current_user else None
    
    # Save to database
    result = await save_workflow(
        workflow_request.name,
        workflow_request.description or "",
        [node.model_dump() for node in workflow_request.nodes],
        [edge.model_dump() for edge in workflow_request.edges],
        user_id
    )
    
    return result
```

**Database (database.py)**
```python
async def save_workflow(name: str, description: str, nodes: List[Dict[str, Any]], 
                       edges: List[Dict[str, Any]], user_id: Optional[int] = None) -> Dict[str, Any]:
    """Save workflow to PostgreSQL"""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO workflows (name, description, nodes, edges, user_id)
            VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
            RETURNING id, uuid, name, description, created_at, updated_at
            """,
            name,
            description,
            json.dumps(nodes),      # Convert to JSON string
            json.dumps(edges),      # Convert to JSON string
            user_id,
        )
    return dict(row) if row else {}
```

---

### Example 2: Chat Execution Flow

**Frontend (App.jsx)**
```javascript
const executeWorkflow = useCallback(async (message) => {
  try {
    // Call chat endpoint with current workflow
    const response = await api.post("/chat/run", {
      workflow: { 
        nodes: nodes,      // Current workflow definition
        edges: edges 
      },
      message: message,    // User's question
      history: chatHistory // Previous messages
    });
    
    // Extract response data
    const { answer, provider, context_used, web_used, execution_time_ms } = response.data;
    
    // Update chat history
    setChatHistory(prev => [...prev, {
      role: "user",
      content: message
    }, {
      role: "assistant",
      content: answer,
      metadata: { provider, context_used, web_used, execution_time_ms }
    }]);
    
    return response.data;
  } catch (error) {
    throw new Error("Workflow execution failed: " + error.message);
  }
}, [nodes, edges]);
```

**Backend (main.py)**
```python
@app.post("/chat/run", response_model=None)
@limiter.limit("40/minute")
async def run_chat(
    request: Request,
    chat_request: ChatRequest,
    current_user: Optional[dict] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Execute workflow with chat"""
    
    start_time = time.time()
    settings = get_settings()
    user_id = current_user["id"] if current_user else None
    
    try:
        # 1. Validate workflow
        nodes_by_type = validate_topology(chat_request.workflow)
        llm_node = nodes_by_type["llm_engine"]
        kb_node = nodes_by_type.get("knowledge_base")
        
        # 2. Retrieve knowledge base context if present
        context_chunks: List[str] = []
        if kb_node:
            kb_params = kb_node.params or {}
            collection_name = kb_params.get("collection_name", "default")
            top_k = min(int(kb_params.get("top_k", 4)), 3)  # Max 3
            embedding_model = kb_params.get("embedding_model")
            
            # Embed the query
            collection_handle = get_chroma_collection(settings, collection_name)
            query_embedding = (await embed_texts([chat_request.message], settings, embedding_model))[0]
            
            # Retrieve similar documents
            context_chunks = await query_collection(collection_handle, query_embedding, top_k=top_k)
        
        # 3. Get web search results if enabled
        web_snippets: List[str] = []
        if llm_node.params.get("web_search"):
            web_snippets = run_web_search(chat_request.message, settings)
            web_snippets = web_snippets[:2]  # Max 2
        
        # 4. Build final prompt
        prompt = build_prompt(
            question=chat_request.message,
            context=context_chunks,
            web_snippets=web_snippets,
            custom_prompt=llm_node.params.get("prompt"),
        )
        
        # 5. Call LLM
        provider = llm_node.params.get("provider") or ("openai" if settings.openai_api_key else "gemini")
        llm_model = llm_node.params.get("model")
        answer = await call_llm(provider, prompt, settings, llm_model, chat_request.history[-5:])
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        # 6. Save logs
        await save_chat_log(
            workflow_uuid=None,
            message=chat_request.message,
            response=answer,
            provider=provider,
            context_used=len(context_chunks),
            web_used=bool(web_snippets),
            user_id=user_id
        )
        
        # 7. Return response
        return {
            "answer": answer,
            "provider": provider,
            "context_used": len(context_chunks),
            "context_samples": context_chunks[:1],
            "web_used": bool(web_snippets),
            "web_samples": web_snippets[:1],
            "execution_time_ms": execution_time_ms,
        }
    
    except Exception as e:
        # Error logging
        execution_time_ms = int((time.time() - start_time) * 1000)
        await save_execution_log(
            user_id=user_id,
            workflow_uuid=None,
            workflow_name=None,
            status="error",
            message=chat_request.message,
            response=None,
            provider=None,
            execution_time_ms=execution_time_ms,
            error_message=str(e),
            context_used=0,
            web_used=False
        )
        raise
```

---

### Example 3: Authentication Flow

**Frontend (AuthPanel.jsx)**
```javascript
const handleLogin = async (username, password) => {
  try {
    // Call login endpoint
    const response = await axios.post("http://localhost:8000/auth/login", {
      username,
      password
    });
    
    // Extract token and user data
    const { access_token, user } = response.data;
    
    // Store in localStorage
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("user", JSON.stringify(user));
    
    // Set axios default header
    axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    
    // Notify parent component
    onAuthSuccess(user);
  } catch (error) {
    setError("Login failed: " + error.response.data.detail);
  }
};
```

**Backend (main.py - Login Endpoint)**
```python
@app.post("/auth/login", response_model=TokenResponse)
@limiter.limit("20/minute")
async def login_user(request: Request, login_request: UserLoginRequest) -> TokenResponse:
    """Authenticate and log in a user"""
    
    # Verify credentials
    user = await authenticate_user(login_request.username, login_request.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )
    
    # Create JWT token
    settings = get_settings()
    access_token = create_access_token(
        data={"sub": user["id"], "username": user["username"]},
        settings=settings
    )
    
    # Return token and user info
    user_data = {k: v for k, v in user.items() if k != "hashed_password"}
    return TokenResponse(access_token=access_token, user=user_data)
```

**Backend (auth.py - Authentication Logic)**
```python
async def authenticate_user(username: str, password: str) -> Optional[dict]:
    """Validate username and password"""
    
    # 1. Get user from database
    user = await get_user_by_username(username)
    if not user:
        return None  # User not found
    
    # 2. Verify password
    if not verify_password(password, user["hashed_password"]):
        return None  # Password incorrect
    
    # 3. Check if active
    if not user.get("is_active", True):
        return None  # User deactivated
    
    return user  # Valid user
```

---

This comprehensive documentation provides developers with complete understanding of:
1. ✅ Source code organization and structure
2. ✅ Key components and their responsibilities
3. ✅ Interactions between frontend and backend
4. ✅ Complete request/response flows
5. ✅ Database operations and queries
6. ✅ Authentication and authorization
7. ✅ API endpoint details
8. ✅ Code patterns and examples
