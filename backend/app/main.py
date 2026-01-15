
import asyncio
import io
from collections import defaultdict, deque
from typing import Any, Dict, List, Optional
from uuid import uuid4
import time

import chromadb
import fitz  # PyMuPDF
import google.generativeai as genai
from fastapi import FastAPI, File, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from pydantic import BaseModel, ConfigDict, Field
from serpapi import GoogleSearch
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from chromadb.api import ClientAPI

from .config import Settings, get_settings
from .database import (
    delete_workflow,
    get_workflow,
    init_db,
    list_chat_logs,
    list_documents,
    list_workflows,
    save_chat_log,
    save_document_metadata,
    save_workflow,
    update_workflow,
)

# FastAPI initialization with proper CORS configuration
settings = get_settings()

app = FastAPI(title="Workflow Builder API", version="0.3.0")

# Configure CORS with environment-based origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Store for tracking request timestamps per IP (for throttling)
_request_timestamps: Dict[str, List[float]] = {}
_collection_request_timestamps: Dict[str, List[float]] = {}


# Initialize database on startup.
@app.on_event("startup")
async def startup_db():
    """Set up PostgreSQL pool when the API starts."""
    await init_db()


# Singletons for heavier resources; keep them module-level to avoid reloading per request.
_chroma_client: ClientAPI | None = None
_hf_model = None


async def check_throttle(client_ip: str, endpoint: str = "general") -> bool:
    """
    Check if client has exceeded throttle limits.
    Returns True if request should be allowed, False if throttled.
    """
    if not settings.throttle_enabled:
        return True
    
    current_time = time.time()
    
    if endpoint == "collections":
        timestamps = _collection_request_timestamps.get(client_ip, [])
        min_interval = 60 / settings.collection_endpoint_rate_limit  # Convert rate to seconds
    else:
        timestamps = _request_timestamps.get(client_ip, [])
        min_interval = settings.throttle_delay
    
    # Remove timestamps older than 1 minute
    timestamps = [ts for ts in timestamps if current_time - ts < 60]
    
    if timestamps:
        time_since_last = current_time - timestamps[-1]
        if time_since_last < min_interval:
            return False
    
    # Record this request
    timestamps.append(current_time)
    if endpoint == "collections":
        _collection_request_timestamps[client_ip] = timestamps
    else:
        _request_timestamps[client_ip] = timestamps
    
    return True


class ComponentConfig(BaseModel):
    # Generic config bag for nodes; real shape depends on component type.
    model_config = ConfigDict(extra="allow")

    id: str
    type: str
    params: Dict[str, Any] = Field(default_factory=dict)
    position: Optional[Dict[str, float]] = None  # Store node positions


class Edge(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: Optional[str] = None
    source: str
    target: str
    data: Dict[str, Any] = Field(default_factory=dict)


class WorkflowDefinition(BaseModel):
    # Nodes and edges mirror what React Flow sends.
    nodes: List[ComponentConfig]
    edges: List[Edge]


class ChatRequest(BaseModel):
    # Payload for running the workflow in chat mode.
    workflow: WorkflowDefinition
    message: str
    history: Optional[List[Dict[str, str]]] = None


def get_chroma_client(settings: Settings) -> chromadb.Client:
    """Singleton chroma client bound to the configured path."""

    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=settings.chroma_path)
    return _chroma_client


def get_chroma_collection(settings: Settings, collection_name: str):
    """Create or reuse a Chroma collection for embeddings."""

    client = get_chroma_client(settings)
    return client.get_or_create_collection(collection_name)


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 80) -> List[str]:
    """Simple sliding window chunker to keep context manageable for embeddings."""

    cleaned = text.replace("\r", " ").replace("\n", " ")
    chunks = []
    start = 0
    while start < len(cleaned):
        end = start + chunk_size
        chunks.append(cleaned[start:end])
        start = end - overlap
    return [c.strip() for c in chunks if c.strip()]


def extract_text_from_pdf_bytes(data: bytes) -> str:
    """Pull text from a PDF using PyMuPDF."""

    with fitz.open(stream=data, filetype="pdf") as doc:
        pages = [page.get_text() for page in doc]
    return "\n".join(pages).strip()


async def embed_with_hf(texts: List[str], model_name: Optional[str]) -> List[List[float]]:
    """Hugging Face fallback embedding (runs in a worker thread)."""

    global _hf_model
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:  # pragma: no cover - defensive for missing dep
        raise HTTPException(status_code=500, detail="sentence-transformers is not installed") from exc

    if _hf_model is None:
        _hf_model = SentenceTransformer(model_name or "all-MiniLM-L6-v2")

    def _encode() -> List[List[float]]:
        vectors = _hf_model.encode(texts, convert_to_numpy=False, show_progress_bar=False)
        return [v.tolist() if hasattr(v, "tolist") else list(v) for v in vectors]

    return await asyncio.to_thread(_encode)


async def embed_texts(texts: List[str], settings: Settings, embedding_model: Optional[str] = None) -> List[List[float]]:
    """Embed text via OpenAI first; fall back to Hugging Face if no key."""

    if settings.openai_api_key:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.embeddings.create(model=embedding_model or "text-embedding-3-small", input=texts)
        return [item.embedding for item in response.data]

    return await embed_with_hf(texts, embedding_model)


async def upsert_documents(collection, documents: List[str], embeddings: List[List[float]]) -> List[str]:
    """Persist embeddings into Chroma."""

    ids = [str(uuid4()) for _ in documents]
    await asyncio.to_thread(collection.add, documents=documents, embeddings=embeddings, ids=ids)
    return ids


async def query_collection(collection, query_embedding: List[float], top_k: int = 4) -> List[str]:
    """Retrieve the closest chunks for a query embedding."""

    result = await asyncio.to_thread(collection.query, query_embeddings=[query_embedding], n_results=top_k)
    docs = result.get("documents", [[]])
    return docs[0] if docs else []


def run_web_search(query: str, settings: Settings, max_results: int = 3) -> List[str]:
    """Optional SerpAPI search to enrich context."""

    if not settings.serpapi_key:
        return []

    search = GoogleSearch({"api_key": settings.serpapi_key, "q": query})
    data = search.get_dict()
    organic = data.get("organic_results") or []
    snippets = []
    for item in organic:
        snippet = item.get("snippet") or item.get("title")
        if snippet:
            snippets.append(snippet)
        if len(snippets) >= max_results:
            break
    return snippets


def build_prompt(question: str, context: List[str], web_snippets: List[str], custom_prompt: Optional[str]) -> str:
    """Assemble a simple RAG-style prompt."""

    parts: List[str] = []
    if custom_prompt:
        parts.append(custom_prompt)
    if context:
        parts.append("Context:\n" + "\n---\n".join(context))
    if web_snippets:
        parts.append("Web search hints:\n" + "\n".join(web_snippets))
    parts.append(f"Question: {question}")
    parts.append("Answer concisely. If unsure, say you are unsure.")
    return "\n\n".join(parts)


async def call_llm(provider: str, prompt: str, settings: Settings, model: Optional[str], history: Optional[List[Dict[str, str]]]) -> str:
    """Send the prompt to the requested provider with light history support."""

    if provider == "gemini":
        if not settings.gemini_api_key:
            raise HTTPException(status_code=400, detail="Gemini provider selected but GEMINI_API_KEY is missing")
        genai.configure(api_key=settings.gemini_api_key)
        model_name = model or "gemini-2.5-flash"
        gemini_model = genai.GenerativeModel(model_name)
        response = await asyncio.to_thread(gemini_model.generate_content, prompt)
        return response.text

    # Default to OpenAI.
    if not settings.openai_api_key:
        raise HTTPException(status_code=400, detail="OpenAI provider selected but OPENAI_API_KEY is missing")

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    messages: List[Dict[str, str]] = [
        {
            "role": "system",
            "content": "You are an assistant that answers using provided context first. Be concise.",
        }
    ]
    if history:
        for turn in history:
            if turn.get("role") in {"user", "assistant"} and turn.get("content"):
                messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({"role": "user", "content": prompt})
    response = await client.chat.completions.create(model=model or "gpt-4o-mini", messages=messages)
    return response.choices[0].message.content


def validate_topology(payload: WorkflowDefinition) -> Dict[str, ComponentConfig]:
    """Enforce required nodes and a reachable path User -> (KB) -> LLM -> Output."""

    if not payload.nodes:
        raise HTTPException(status_code=400, detail="Workflow must have at least one node")
    if not payload.edges:
        raise HTTPException(status_code=400, detail="Workflow must have at least one edge")

    node_ids = {n.id for n in payload.nodes}
    for edge in payload.edges:
        if edge.source not in node_ids or edge.target not in node_ids:
            raise HTTPException(status_code=400, detail="Edges reference unknown nodes")

    by_type: Dict[str, ComponentConfig] = {}
    for node in payload.nodes:
        if node.type in by_type:
            raise HTTPException(status_code=400, detail=f"Only one {node.type} node is allowed for now")
        by_type[node.type] = node

    for required in ("user_query", "llm_engine", "output"):
        if required not in by_type:
            raise HTTPException(status_code=400, detail=f"Missing required node: {required}")

    # Simple reachability: user_query must reach llm_engine and output.
    adjacency: Dict[str, List[str]] = defaultdict(list)
    for edge in payload.edges:
        adjacency[edge.source].append(edge.target)

    start = by_type["user_query"].id
    needed = {by_type["llm_engine"].id, by_type["output"].id}
    visited = set()
    queue = deque([start])
    while queue:
        current = queue.popleft()
        if current in visited:
            continue
        visited.add(current)
        queue.extend(adjacency.get(current, []))

    if not needed.issubset(visited):
        raise HTTPException(status_code=400, detail="Flow must connect User Query to LLM and Output")

    return by_type


@app.get("/health")
@limiter.limit("100/minute")
async def health_check(request: Request) -> Dict[str, str]:
    """Simple liveliness probe."""
    return {"status": "ok"}


@app.post("/workflow/validate", response_model=None)
@limiter.limit("60/minute")
async def validate_workflow(request: Request, payload: WorkflowDefinition) -> Dict[str, str]:
    """Topology validation with basic single-instance constraints."""
    validate_topology(payload)
    return {"status": "valid"}


@app.post("/knowledge/upload", response_model=None)
@limiter.limit("20/minute")
async def upload_knowledge(
    request: Request,
    file: UploadFile = File(...),
    collection: str = "default",
    chunk_size: int = 800,
    chunk_overlap: int = 80,
    embedding_model: Optional[str] = None,
) -> Dict[str, Any]:
    """Upload a PDF, chunk it, embed it, and store it in Chroma."""

    settings = get_settings()
    
    # Check throttle for heavy operation
    client_ip = request.client.host
    if not await check_throttle(client_ip, endpoint="upload"):
        raise HTTPException(
            status_code=429,
            detail="Too many upload requests. Please wait before uploading again."
        )
    
    data = await file.read()
    text = extract_text_from_pdf_bytes(data)
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded file")

    chunks = chunk_text(text, chunk_size=chunk_size, overlap=chunk_overlap)
    embeddings = await embed_texts(chunks, settings, embedding_model)
    collection_handle = get_chroma_collection(settings, collection)
    ids = await upsert_documents(collection_handle, chunks, embeddings)
    
    # Store document metadata in PostgreSQL for tracking.
    doc_metadata = await save_document_metadata(
        filename=file.filename,
        file_size=len(data),
        collection_name=collection,
        chunk_count=len(chunks),
        embedding_model=embedding_model or "default"
    )
    
    return {
        "collection": collection,
        "chunks": len(chunks),
        "ids": ids[:5],
        "document_uuid": doc_metadata.get("uuid")
    }


@app.get("/knowledge/collections",response_model=None)
@limiter.limit("30/minute")  # Lower rate limit for this endpoint
async def list_collections(request: Request) -> Dict[str, Any]:
    """Return available Chroma collections to help the UI pick targets."""

    settings = get_settings()
    
    # Additional throttling for this specific endpoint to prevent abuse
    client_ip = request.client.host
    if not await check_throttle(client_ip, endpoint="collections"):
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests to collections endpoint. Max {settings.collection_endpoint_rate_limit} requests per minute."
        )
    
    client = get_chroma_client(settings)
    collections = await asyncio.to_thread(client.list_collections)
    return {"collections": [{"name": c.name, "metadata": c.metadata} for c in collections]}


@app.post("/chat/run", response_model=None)
@limiter.limit("40/minute")
async def run_chat(request: Request, chat_request: ChatRequest) -> Dict[str, Any]:
    """Execute the built workflow with retrieval + LLM generation."""

    settings = get_settings()
    nodes_by_type = validate_topology(chat_request.workflow)

    llm_node = nodes_by_type["llm_engine"]
    kb_node = nodes_by_type.get("knowledge_base")

    context_chunks: List[str] = []
    if kb_node:
        kb_params = kb_node.params or {}
        collection_name = kb_params.get("collection_name", "default")
        top_k = int(kb_params.get("top_k", 4))
        embedding_model = kb_params.get("embedding_model")
        collection_handle = get_chroma_collection(settings, collection_name)
        query_embedding = (await embed_texts([chat_request.message], settings, embedding_model))[0]
        context_chunks = await query_collection(collection_handle, query_embedding, top_k=top_k)

    web_snippets: List[str] = []
    if llm_node.params.get("web_search"):
        web_snippets = run_web_search(chat_request.message, settings)

    prompt = build_prompt(
        question=chat_request.message,
        context=context_chunks,
        web_snippets=web_snippets,
        custom_prompt=llm_node.params.get("prompt"),
    )

    provider = llm_node.params.get("provider") or ("openai" if settings.openai_api_key else "gemini")
    llm_model = llm_node.params.get("model")
    answer = await call_llm(provider, prompt, settings, llm_model, chat_request.history)

    # Save chat log to PostgreSQL for audit trail and history.
    await save_chat_log(
        workflow_uuid=None,  # Could link to saved workflow if user provides it
        message=chat_request.message,
        response=answer,
        provider=provider,
        context_used=len(context_chunks),
        web_used=bool(web_snippets)
    )

    return {
        "answer": answer,
        "provider": provider,
        "context_used": len(context_chunks),
        "context_samples": context_chunks[:2],
        "web_used": bool(web_snippets),
        "web_samples": web_snippets[:2],
    }


class WorkflowSaveRequest(BaseModel):
    # Request model for saving/updating workflows.
    name: str
    description: Optional[str] = None
    nodes: List[ComponentConfig]
    edges: List[Edge]


@app.post("/workflow/save", response_model=None)
@limiter.limit("30/minute")
async def save_workflow_endpoint(request: Request, workflow_request: WorkflowSaveRequest) -> Dict[str, Any]:
    """Save a new workflow to the database. Returns uuid and metadata."""
    # Validate before saving.
    validate_topology(
        WorkflowDefinition(nodes=workflow_request.nodes, edges=workflow_request.edges)
    )
    result = await save_workflow(
        workflow_request.name,
        workflow_request.description or "",
        [node.model_dump() for node in workflow_request.nodes],
        [edge.model_dump() for edge in workflow_request.edges]
    )
    return result


@app.get("/workflow/{uuid}", response_model=None)
@limiter.limit("60/minute")
async def get_workflow_endpoint(request: Request, uuid: str) -> Dict[str, Any]:
    """Retrieve a saved workflow by uuid."""
    result = await get_workflow(uuid)
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return result


@app.get("/workflows", response_model=None)
@limiter.limit("60/minute")
async def list_workflows_endpoint(request: Request) -> Dict[str, Any]:
    """List all saved workflows (name, uuid, timestamps)."""
    workflows = await list_workflows()
    return {"workflows": workflows}


@app.post("/workflow/{uuid}/update", response_model=None)
@limiter.limit("30/minute")
async def update_workflow_endpoint(request: Request, uuid: str, workflow_request: WorkflowSaveRequest) -> Dict[str, Any]:
    """Update an existing workflow by uuid."""
    # Validate before updating.
    validate_topology(
        WorkflowDefinition(nodes=workflow_request.nodes, edges=workflow_request.edges)
    )
    result = await update_workflow(
        uuid,
        workflow_request.name,
        workflow_request.description or "",
        [node.model_dump() for node in workflow_request.nodes],
        [edge.model_dump() for edge in workflow_request.edges]
    )
    if not result:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return result


@app.delete("/workflow/{uuid}", response_model=None)
@limiter.limit("30/minute")
async def delete_workflow_endpoint(request: Request, uuid: str) -> Dict[str, str]:
    """Delete a workflow by uuid."""
    success = await delete_workflow(uuid)
    if not success:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"status": "deleted"}


@app.get("/documents", response_model=None)
@limiter.limit("60/minute")
async def list_documents_endpoint(request: Request, collection: Optional[str] = None) -> Dict[str, Any]:
    """
    List uploaded documents with metadata.
    Optionally filter by collection name.
    """
    documents = await list_documents(collection)
    return {"documents": documents}


@app.get("/chat/history", response_model=None)
@limiter.limit("60/minute")
async def get_chat_history(request: Request, workflow_uuid: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
    """
    Retrieve chat conversation history.
    Optionally filter by workflow uuid and limit results.
    """
    logs = await list_chat_logs(workflow_uuid, limit)
    return {"logs": logs}
