# Workflow Builder Application - Architecture & Design Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [High-Level Design (HLD)](#high-level-design)
3. [Low-Level Design (LLD)](#low-level-design)
4. [Technology Stack](#technology-stack)
5. [Component Architecture](#component-architecture)
6. [Data Flow](#data-flow)
7. [API Design](#api-design)
8. [Database Schema](#database-schema)
9. [Source Code Structure](#source-code-structure)
10. [Key Design Patterns](#key-design-patterns)

---

## System Overview

### Purpose
The Workflow Builder Application is a visual, no-code platform for creating and executing AI-powered workflows with RAG (Retrieval Augmented Generation) capabilities. Users can build workflows by dragging and dropping components, upload knowledge bases, and interact with LLM models through an intuitive chat interface.

### Core Capabilities
- **Visual Workflow Design**: Drag-and-drop React Flow interface
- **RAG Pipeline**: Vector embeddings with ChromaDB for knowledge retrieval
- **Multi-LLM Support**: OpenAI GPT-4o and Google Gemini
- **Knowledge Management**: PDF upload, chunking, and embedding
- **Persistent Storage**: PostgreSQL for workflows, documents, and chat logs
- **User Authentication**: JWT-based auth system
- **Real-time Chat**: Interactive workflow execution with LLM responses

---

## High-Level Design (HLD)

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  React SPA (Vite)                                            │   │
│  │  - Component Library                                         │   │
│  │  - Workflow Canvas (React Flow)                             │   │
│  │  - Chat Panel                                                │   │
│  │  - Auth Panel                                                │   │
│  │  - Execution Logs                                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ REST API (axios)
┌──────────────────┴──────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  FastAPI (Port 8000)                                         │   │
│  │  - CORS Middleware                                           │   │
│  │  - Rate Limiting & Throttling                               │   │
│  │  - JWT Authentication                                        │   │
│  │  - Request Validation                                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────┬─────────────────┬──────────────────┬──────────────────────┘
          │                 │                  │
    ┌─────▼─────┐    ┌─────▼────────┐   ┌───▼──────────────┐
    │  AUTH     │    │  WORKFLOWS   │   │  KNOWLEDGE BASE  │
    │  LAYER    │    │  LAYER       │   │  LAYER           │
    └───────────┘    └──────────────┘   └──────────────────┘
          │                 │                  │
          └────────┬────────┴────────┬─────────┘
                   │                 │
          ┌────────▼───────┐  ┌─────▼──────────┐
          │  PostgreSQL    │  │  ChromaDB +    │
          │  (Relational)  │  │  FAISS (Vector)│
          └────────────────┘  └────────────────┘
```

### Key Components

| Component | Purpose | Technology |
|-----------|---------|-----------|
| **Frontend** | User interface for workflow building | React + Vite + React Flow |
| **API Server** | Request routing, auth, validation | FastAPI + Uvicorn |
| **Auth Module** | User management, JWT tokens | Python-Jose + Passlib |
| **Workflow Engine** | Execute workflows, orchestrate components | Python async functions |
| **RAG Pipeline** | Vector embeddings, retrieval | ChromaDB + Sentence-Transformers |
| **LLM Integration** | AI model calls | OpenAI SDK + Google SDK |
| **Relational DB** | Persistent storage | PostgreSQL + asyncpg |
| **Vector DB** | Semantic search | ChromaDB + FAISS |

---

## Low-Level Design (LLD)

### Backend Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI app, endpoint definitions
│   ├── config.py            # Settings management
│   ├── auth.py              # Authentication logic
│   ├── database.py          # Database operations
│   └── __pycache__/
├── requirements.txt         # Python dependencies
├── Dockerfile               # Docker configuration
└── render.yaml             # Render deployment config
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   ├── style.css            # Global styles
│   └── components/
│       ├── AuthPanel.jsx    # Login/Register
│       ├── ChatPanel.jsx    # Chat interface
│       ├── ComponentLibrary.jsx
│       ├── ConfigPanel.jsx  # Node configuration
│       ├── ExecutionControls.jsx
│       ├── ExecutionLogs.jsx
│       ├── WorkflowCanvas.jsx
│       └── WorkflowManager.jsx
├── package.json
├── vite.config.js
└── Dockerfile
```

### Request Flow

```
1. User Action (Frontend)
   ↓
2. Axios HTTP Request → API Endpoint
   ↓
3. FastAPI Route Handler
   ├→ CORS Middleware
   ├→ Rate Limit Check
   ├→ Auth Validation (JWT)
   └→ Input Validation (Pydantic)
   ↓
4. Business Logic Layer
   ├→ Auth: authenticate_user()
   ├→ Workflows: save/get/execute workflow
   ├→ RAG: query_collection(), embed_texts()
   └→ LLM: call_llm()
   ↓
5. Data Layer
   ├→ PostgreSQL (workflows, users, logs)
   ├→ ChromaDB (vector embeddings)
   └→ FileSystem (.chroma persistent storage)
   ↓
6. Response → Frontend
```

---

## Technology Stack

### Backend
```
Framework:        FastAPI 0.115.2
Server:           Uvicorn 0.31.1
Data Validation:  Pydantic 2.10.4
Database:         asyncpg 0.30.0 (async PostgreSQL)
Vector DB:        ChromaDB 1.3.6
ML/Embeddings:    Sentence-Transformers 3.4.1
LLM APIs:         OpenAI 1.58.1, Google Generative AI 0.8.3
Auth:             Python-Jose 3.3.0, Passlib 1.7.4
Rate Limiting:    SlowAPI 0.1.9
PDF Processing:   PyMuPDF 1.26.6
Search:           SerpAPI 2.4.2
```

### Frontend
```
Framework:        React 18 (via Vite)
Build Tool:       Vite (lightning fast)
HTTP Client:      Axios 1.x
Visualization:    React Flow (workflow canvas)
Styling:          CSS Modules/Plain CSS
State Mgmt:       React Hooks (useState, useEffect)
```

### Infrastructure
```
Database:         PostgreSQL 15+ (Neon cloud)
Vector Storage:   ChromaDB + FAISS
Container:        Docker + Docker Compose
Orchestration:    Kubernetes (optional)
Deployment:       Render (backend), Netlify (frontend)
Monitoring:       Prometheus + Grafana (optional)
```

---

## Component Architecture

### Backend Components

#### 1. **Main Application (main.py)**
**Responsibility**: Define FastAPI application, routes, and endpoint handlers

**Key Functions**:
- `app = FastAPI(...)` - Create app instance
- `/health` - Health check endpoint
- `/auth/register`, `/auth/login`, `/auth/me` - Authentication
- `/workflow/save`, `/workflow/get`, `/workflow/list` - Workflow CRUD
- `/knowledge/upload`, `/knowledge/query` - Knowledge management
- `/chat/run` - Execute workflow with chat
- `/execute-logs`, `/chat-logs` - History retrieval

**Code Pattern**:
```python
@app.post("/endpoint")
@limiter.limit("60/minute")
async def endpoint_handler(
    request: Request,
    payload: RequestModel,
    current_user: Optional[dict] = Depends(get_current_user)
) -> Dict[str, Any]:
    # 1. Rate limiting check
    # 2. Auth validation
    # 3. Business logic
    # 4. Database operations
    # 5. Return response
```

#### 2. **Configuration (config.py)**
**Responsibility**: Centralized settings management

**Key Settings**:
- `openai_api_key`, `gemini_api_key` - LLM credentials
- `database_url` - PostgreSQL connection
- `chroma_path` - Vector DB storage location
- `secret_key`, `jwt_algorithm` - Auth settings
- `rate_limit_requests`, `throttle_delay` - Rate limiting

**Pattern**: `Settings` Pydantic class with environment variable loading

#### 3. **Authentication (auth.py)**
**Responsibility**: User auth and JWT token management

**Key Functions**:
- `authenticate_user(username, password)` - Validate credentials
- `create_access_token(data)` - Generate JWT token
- `get_current_user()` - Extract user from token (optional)
- `get_current_user_required()` - Enforce authentication
- `get_password_hash()` - Secure password hashing

**Security Measures**:
- Bcrypt password hashing (passlib)
- JWT token with expiration
- Secure token storage (localStorage + HTTP only cookies)

#### 4. **Database Layer (database.py)**
**Responsibility**: Async PostgreSQL operations

**Key Functions**:
- `init_db()` - Create tables and connection pool
- Workflow CRUD: `save_workflow()`, `get_workflow()`, `list_workflows()`, `delete_workflow()`
- User Mgmt: `create_user()`, `get_user_by_username()`, `authenticate_user()`
- Document Tracking: `save_document_metadata()`, `list_documents()`
- Logging: `save_chat_log()`, `save_execution_log()`

**Database Tables**:
```
users (id, username, email, hashed_password, created_at)
workflows (uuid, user_id, name, description, nodes, edges, created_at)
documents (uuid, user_id, filename, collection_name, chunk_count, created_at)
chat_logs (uuid, workflow_uuid, message, response, provider, created_at)
execution_logs (uuid, workflow_uuid, status, error_message, execution_time_ms, created_at)
```

### Frontend Components

#### 1. **App.jsx**
**Responsibility**: Main application controller

**State Management**:
- `workflows` - List of saved workflows
- `currentWorkflow` - Active workflow
- `authToken` - JWT token
- `currentUser` - Logged-in user info
- `chatHistory` - Chat messages

**Key Functions**:
- `saveWorkflow()` - POST to backend
- `loadWorkflow()` - GET from backend
- `executeWorkflow()` - POST /chat/run
- `handleAuth()` - Login/Register flow

#### 2. **WorkflowCanvas.jsx**
**Responsibility**: Visualization and editing

**Uses**: React Flow library
- Nodes: Visual components (User Query, KB, LLM, etc.)
- Edges: Connections between components
- Callbacks: Add node, delete node, connect nodes

#### 3. **ChatPanel.jsx**
**Responsibility**: Conversational interface

**Features**:
- Message display
- Input field with submit
- Loading states
- Error handling

#### 4. **AuthPanel.jsx**
**Responsibility**: Login/Register

**State**:
- Login form: username, password
- Register form: username, email, password
- Auth token storage

---

## Data Flow

### Workflow Execution Flow

```
┌─────────────────────────────────────────┐
│ User Builds Workflow in Canvas          │
│ (Drag nodes, connect edges)             │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ User Saves Workflow                     │
│ POST /workflow/save                     │
│ Payload: { name, description, nodes,    │
│            edges }                       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Backend: Validate Topology              │
│ - Check required components             │
│ - Verify connections                    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Backend: Save to PostgreSQL             │
│ Store: uuid, nodes JSON, edges JSON     │
└────────────────┬────────────────────────┘
                 │
                 ▼ (Later)
┌─────────────────────────────────────────┐
│ User Starts Chat                        │
│ POST /chat/run                          │
│ Payload: { workflow, message, history } │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Backend: Extract Nodes                  │
│ - Find Knowledge Base node              │
│ - Find LLM Engine node                  │
│ - Find Web Search config                │
└────────────────┬────────────────────────┘
                 │
                 ├─────────────────────────────────────────────┐
                 │                                             │
                 ▼                                             ▼
         ┌──────────────────┐                        ┌──────────────────┐
         │ RAG Pipeline     │                        │ Web Search       │
         │                  │                        │                  │
         │ 1. Embed query   │                        │ 1. Query SerpAPI │
         │ 2. Query ChromaDB│                        │ 2. Get snippets  │
         │ 3. Retrieve      │                        │ 3. Format result │
         │    context chunks│                        │                  │
         └────────┬─────────┘                        └────────┬─────────┘
                  │                                           │
                  └─────────────────┬───────────────────────────┘
                                    │
                                    ▼
                        ┌────────────────────────────┐
                        │ Build Prompt               │
                        │ Context + Web + Question   │
                        └────────────┬───────────────┘
                                     │
                                     ▼
                        ┌────────────────────────────┐
                        │ Call LLM                   │
                        │ OpenAI or Gemini          │
                        │ Get streamed response      │
                        └────────────┬───────────────┘
                                     │
                                     ▼
                        ┌────────────────────────────┐
                        │ Store Chat Log             │
                        │ Save to PostgreSQL         │
                        └────────────┬───────────────┘
                                     │
                                     ▼
                        ┌────────────────────────────┐
                        │ Return Response            │
                        │ { answer, provider,        │
                        │   context_used, ... }      │
                        └────────────────────────────┘
```

### RAG Pipeline Details

```
1. USER QUERY
   "What is machine learning?"
   ↓
2. EMBEDDING
   - Convert query to vector using Sentence-Transformers
   - Vector dimension: 384 (all-MiniLM-L6-v2 model)
   ↓
3. VECTOR SEARCH (ChromaDB)
   - Query embedded vector store
   - Find top-k most similar documents
   - Use cosine similarity metric
   ↓
4. RETRIEVAL
   - Return ranked documents
   - Typically 3-5 most relevant chunks
   ↓
5. CONTEXT BUILDING
   - Format retrieved chunks into prompt
   - Add metadata (source, score)
   ↓
6. LLM AUGMENTATION
   - Combine context with user query
   - Send to LLM with full history
   ↓
7. RESPONSE
   - LLM generates response grounded in knowledge
   - More accurate than vanilla LLM
```

---

## API Design

### Authentication Endpoints

```
POST /auth/register
Request:  { username, email, password }
Response: { access_token, user: {id, username, email} }
Status:   201 Created

POST /auth/login
Request:  { username, password }
Response: { access_token, user: {id, username, email} }
Status:   200 OK

GET /auth/me
Headers:  Authorization: Bearer <token>
Response: { id, username, email, created_at }
Status:   200 OK
```

### Workflow Endpoints

```
POST /workflow/save
Request:  { name, description, nodes: [], edges: [] }
Response: { uuid, name, description, created_at }
Status:   201 Created

GET /workflow/{uuid}
Response: { uuid, name, description, nodes, edges, created_at, updated_at }
Status:   200 OK

GET /workflow/list
Query:    ?user_id=1 (optional)
Response: [{ uuid, name, description, created_at }]
Status:   200 OK

DELETE /workflow/{uuid}
Response: { status: "deleted" }
Status:   200 OK
```

### Knowledge Base Endpoints

```
POST /knowledge/upload
Multipart: file (PDF), collection, chunk_size, embedding_model
Response:  { collection, chunks, doc_uuid, ids: [] }
Status:    201 Created

GET /knowledge/collections
Response:  { collections: [{name, metadata}] }
Status:    200 OK

POST /knowledge/query
Request:   { collection, query, top_k, embedding_model }
Response:  { results: [{text, score, metadata}] }
Status:    200 OK
```

### Chat Endpoints

```
POST /chat/run
Request:  { workflow, message, history: [] }
Response: { answer, provider, context_used, 
            context_samples, web_used, web_samples,
            execution_time_ms }
Status:   200 OK

GET /chat-logs?workflow_uuid=&limit=100
Response: [{ uuid, message, response, provider, created_at }]
Status:   200 OK
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Workflows Table
```sql
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL,  -- Array of node objects
    edges JSONB NOT NULL,  -- Array of edge objects
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Documents Table
```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(512) NOT NULL,
    file_size INTEGER,
    collection_name VARCHAR(255) NOT NULL,
    chunk_count INTEGER DEFAULT 0,
    embedding_model VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Chat Logs Table
```sql
CREATE TABLE chat_logs (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    workflow_uuid VARCHAR(36),
    message TEXT NOT NULL,
    response TEXT,
    provider VARCHAR(50),  -- 'openai' or 'gemini'
    context_used INTEGER DEFAULT 0,
    web_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Execution Logs Table
```sql
CREATE TABLE execution_logs (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    workflow_uuid VARCHAR(36),
    workflow_name VARCHAR(255),
    status VARCHAR(50),  -- 'success', 'error', 'running'
    message TEXT,
    response TEXT,
    provider VARCHAR(50),
    execution_time_ms INTEGER,
    error_message TEXT,
    context_used INTEGER DEFAULT 0,
    web_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Source Code Structure

### Backend Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 [796 lines]
│   │   ├── FastAPI app initialization
│   │   ├── CORS & middleware setup
│   │   ├── Endpoint definitions
│   │   ├─ /auth/* endpoints
│   │   ├─ /workflow/* endpoints
│   │   ├─ /knowledge/* endpoints
│   │   └─ /chat/* endpoints
│   │
│   ├── config.py               [40 lines]
│   │   ├── Settings class
│   │   ├── Environment variable loading
│   │   └── Default configurations
│   │
│   ├── auth.py                 [120 lines]
│   │   ├── JWT token creation/validation
│   │   ├── Password hashing
│   │   ├── User authentication
│   │   ├── Dependency injection for auth
│   │   └── Password verification
│   │
│   ├── database.py             [471 lines]
│   │   ├── AsyncPG pool management
│   │   ├── Schema initialization
│   │   ├── User CRUD operations
│   │   ├── Workflow CRUD operations
│   │   ├── Document metadata operations
│   │   ├── Chat log operations
│   │   ├── Execution log operations
│   │   └── Database connection helpers
│   │
│   └── __pycache__/
│
├── requirements.txt            [33 dependencies]
├── Dockerfile                  [33 lines]
├── render.yaml                 [Configuration]
└── .env                        [Environment variables]
```

### Frontend Directory Structure

```
frontend/
├── src/
│   ├── App.jsx                 [319 lines]
│   │   ├── Main application controller
│   │   ├── State management (workflows, auth)
│   │   ├── API client setup (axios)
│   │   ├── Request/response interceptors
│   │   └── Route handlers
│   │
│   ├── main.jsx                [Entry point]
│   │
│   ├── style.css               [Global styles]
│   │
│   └── components/
│       ├── AuthPanel.jsx       [Login/Register UI]
│       ├── WorkflowCanvas.jsx  [React Flow canvas]
│       ├── ComponentLibrary.jsx[Available components]
│       ├── ConfigPanel.jsx     [Node configuration]
│       ├── ChatPanel.jsx       [Chat interface]
│       ├── ExecutionControls.jsx[Run/Save buttons]
│       ├── WorkflowManager.jsx [Workflow CRUD]
│       └── ExecutionLogs.jsx   [Logs display]
│
├── package.json
├── vite.config.js
└── Dockerfile
```

---

## Key Design Patterns

### 1. **Async/Await Pattern**
**Purpose**: Non-blocking I/O for database and API calls

**Implementation**:
```python
# Database queries
async with pool.acquire() as conn:
    row = await conn.fetchrow(query, params)

# API calls
response = await client.chat.completions.create(...)
```

**Benefits**:
- Handles concurrent requests efficiently
- Prevents blocking on I/O operations
- Better resource utilization

### 2. **Dependency Injection**
**Purpose**: Decouple components, easier testing

**Implementation** (FastAPI):
```python
@app.get("/endpoint")
async def handler(
    current_user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool)
):
    pass
```

**Benefits**:
- Loose coupling
- Testable code
- Automatic dependency resolution

### 3. **Repository Pattern**
**Purpose**: Abstract data access logic

**Implementation**:
```python
# database.py acts as repository
async def save_workflow(...) -> Dict:
    # Abstract database operations

async def get_workflow(...) -> Dict:
    # Abstract database queries
```

**Benefits**:
- Separation of concerns
- Easier to mock in tests
- Database-agnostic business logic

### 4. **Settings/Configuration Pattern**
**Purpose**: Centralized configuration management

**Implementation**:
```python
class Settings(BaseSettings):
    openai_api_key: str | None = None
    database_url: str | None = None
    # ...
    class Config:
        env_file = ".env"

settings = get_settings()
```

**Benefits**:
- Environment-based config
- Type-safe settings
- Secrets management

### 5. **Middleware Pattern**
**Purpose**: Cross-cutting concerns

**Implementation**:
```python
app.add_middleware(CORSMiddleware, ...)
app.add_exception_handler(RateLimitExceeded, ...)
api.interceptors.request.use(...)  # Frontend
```

**Concerns Handled**:
- CORS
- Rate limiting
- Authentication
- Error handling

### 6. **Lazy Loading Pattern**
**Purpose**: Defer expensive operations

**Implementation**:
```python
_chroma_client = None

def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(...)
    return _chroma_client
```

**Benefits**:
- Reduced startup time
- Memory optimization
- Only load when needed

### 7. **Cleanup Pattern**
**Purpose**: Prevent memory leaks

**Implementation**:
```python
async def cleanup_old_timestamps():
    # Remove entries older than 1 hour
    # Runs every 5 minutes
```

**Benefits**:
- Bounded memory usage
- Prevents accumulation
- Improved stability on limited resources

---

## Security Architecture

### Authentication Flow
```
1. User submits credentials
   ↓
2. Backend validates against PostgreSQL
   ↓
3. Generate JWT token (HS256)
   ↓
4. Token stored in localStorage
   ↓
5. Token included in Authorization header
   ↓
6. Backend validates token signature
   ↓
7. Extract user info from token claims
```

### API Security
- **CORS**: Restrict to known origins
- **Rate Limiting**: 100 req/min per IP
- **Throttling**: 100ms between requests per IP
- **Input Validation**: Pydantic models
- **SQL Injection**: Prepared statements (asyncpg)
- **Password Security**: Bcrypt hashing (passlib)
- **Token Security**: JWT with expiration

### Data Protection
- **In Transit**: HTTPS (enforced in production)
- **At Rest**: Encrypted database credentials
- **User Isolation**: User_id filtering in queries
- **PII**: No sensitive data in logs

---

## Performance Optimization

### Backend Optimizations
1. **Connection Pooling**: asyncpg pool (2-10 connections)
2. **Caching**: Singleton pattern for heavy resources
3. **Lazy Loading**: Models loaded on first use
4. **Memory Cleanup**: Periodic timestamp cleanup
5. **Limited Context**: Max 3 chunks, 2 web snippets
6. **Chat History**: Limited to last 5 messages

### Frontend Optimizations
1. **Code Splitting**: Lazy load components
2. **Memoization**: useMemo for expensive calculations
3. **Request Batching**: Combine multiple requests
4. **Retry Logic**: Exponential backoff on failures
5. **Token Management**: Reuse auth tokens

---

## Deployment Architecture

### Production Deployment
```
Frontend         Backend          Database
(Netlify) ← API → (Render) ← Connection → (Neon)
                                ↓
                           PostgreSQL 15
                           
Vector DB: ChromaDB (local .chroma directory)
```

### Infrastructure Components
- **Compute**: Render Web Service (backend), Netlify (frontend)
- **Database**: Neon (managed PostgreSQL)
- **Vector Store**: ChromaDB (local storage)
- **CDN**: Netlify CDN (frontend assets)
- **Monitoring**: Render logs, Netlify analytics

---

## Error Handling

### Backend Error Handling
```python
try:
    # Business logic
except HTTPException:
    # API error (400, 401, 404, 429, 500)
    return error response
except DatabaseError:
    # Database error
    return 500 error
except Exception:
    # Unhandled error
    log error
    return 500 error
```

### Frontend Error Handling
```javascript
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 429) {
      // Rate limited
    } else if (error.response?.status === 401) {
      // Unauthorized - redirect to login
    }
    // Generic error handling
  }
);
```

---

## Testing Strategy

### Backend Testing Areas
- **Unit Tests**: Utility functions, helpers
- **Integration Tests**: Database operations
- **API Tests**: Endpoint validation
- **Auth Tests**: JWT token validation
- **RAG Tests**: Embedding and retrieval

### Frontend Testing Areas
- **Component Tests**: Render logic
- **Integration Tests**: API integration
- **E2E Tests**: User workflows
- **UI Tests**: Visual regression

---

## Scalability Considerations

### Current Limitations (512MB Render)
- Limited concurrent users
- Memory-constrained RAG pipeline
- Single instance backend

### Scaling Strategies
1. **Horizontal Scaling**: Load balanced multiple instances
2. **Database Scaling**: Read replicas, connection pooling
3. **Vector DB Scaling**: External vector DB (Pinecone, Weaviate)
4. **Caching Layer**: Redis for session/data caching
5. **Message Queue**: Async task processing (Celery + RabbitMQ)
6. **CDN**: Optimize static assets delivery

---

## Monitoring & Observability

### Metrics to Track
- **Performance**: Response times, throughput
- **Reliability**: Error rates, uptime
- **Resource**: CPU, memory, database connections
- **Business**: User counts, workflow executions

### Logging Strategy
- **Application Logs**: FastAPI logs, execution logs
- **Database Logs**: Query performance
- **Error Logs**: Exceptions and failures
- **Audit Logs**: User actions, auth events

---

This comprehensive documentation provides both high-level and low-level design details, enabling developers to understand, maintain, and extend the Workflow Builder Application effectively.
