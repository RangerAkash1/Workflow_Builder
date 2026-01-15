"""
PostgreSQL database setup and persistence layer for workflows.
Handles workflow CRUD (create, read, update, delete) operations.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

import asyncpg

from .config import Settings, get_settings


# Module-level connection pool for efficient DB access across requests.
_pool: asyncpg.Pool | None = None


async def init_db() -> asyncpg.Pool:
    """Initialize the PostgreSQL connection pool and create schema if needed."""
    global _pool
    settings = get_settings()
    if not settings.database_url:
        raise ValueError("DATABASE_URL not set in environment")

    _pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=10)

    async with _pool.acquire() as conn:
        # Create workflows table to store workflow definitions and metadata.
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS workflows (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                nodes JSONB NOT NULL,
                edges JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
            """
        )
        
        # Create documents table to store metadata for uploaded documents.
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
                filename VARCHAR(512) NOT NULL,
                file_size INTEGER,
                collection_name VARCHAR(255) NOT NULL,
                chunk_count INTEGER DEFAULT 0,
                embedding_model VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            )
            """
        )
        
        # Create chat_logs table to store conversation history.
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_logs (
                id SERIAL PRIMARY KEY,
                uuid VARCHAR(36) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
                workflow_uuid VARCHAR(36),
                message TEXT NOT NULL,
                response TEXT NOT NULL,
                provider VARCHAR(50),
                context_used INTEGER DEFAULT 0,
                web_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (workflow_uuid) REFERENCES workflows(uuid) ON DELETE SET NULL
            )
            """
        )
    return _pool


async def get_pool() -> asyncpg.Pool:
    """Get or initialize the database connection pool."""
    global _pool
    if _pool is None:
        _pool = await init_db()
    return _pool


async def save_workflow(name: str, description: str, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Save a new workflow to the database.
    Returns the created workflow record with uuid, name, timestamp.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO workflows (name, description, nodes, edges)
            VALUES ($1, $2, $3::jsonb, $4::jsonb)
            RETURNING id, uuid, name, description, created_at, updated_at
            """,
            name,
            description or "",
            json.dumps(nodes),
            json.dumps(edges),
        )
    return dict(row) if row else {}


async def update_workflow(
    uuid: str, name: str, description: str, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Update an existing workflow by uuid."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE workflows
            SET name = $1, description = $2, nodes = $3::jsonb, edges = $4::jsonb, updated_at = NOW()
            WHERE uuid = $5
            RETURNING id, uuid, name, description, created_at, updated_at
            """,
            name,
            description or "",
            json.dumps(nodes),
            json.dumps(edges),
            uuid,
        )
    return dict(row) if row else {}


async def get_workflow(uuid: str) -> Optional[Dict[str, Any]]:
    """Retrieve a workflow by uuid."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, uuid, name, description, nodes, edges, created_at, updated_at FROM workflows WHERE uuid = $1", uuid)
    if not row:
        return None
    result = dict(row)
    # Parse JSON fields back from JSONB.
    result["nodes"] = json.loads(result["nodes"]) if isinstance(result["nodes"], str) else result["nodes"]
    result["edges"] = json.loads(result["edges"]) if isinstance(result["edges"], str) else result["edges"]
    return result


async def list_workflows() -> List[Dict[str, Any]]:
    """List all workflows (name, uuid, created/updated timestamps)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT uuid, name, description, created_at, updated_at FROM workflows ORDER BY updated_at DESC")
    return [dict(row) for row in rows]


async def delete_workflow(uuid: str) -> bool:
    """Delete a workflow by uuid. Returns True if found and deleted."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM workflows WHERE uuid = $1", uuid)
    # result is a string like "DELETE 1" or "DELETE 0"; parse the count.
    return "1" in result


async def save_document_metadata(
    filename: str,
    file_size: int,
    collection_name: str,
    chunk_count: int,
    embedding_model: Optional[str] = None
) -> Dict[str, Any]:
    """
    Save document metadata to PostgreSQL after successful upload.
    Returns the created document record with uuid.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO documents (filename, file_size, collection_name, chunk_count, embedding_model)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, uuid, filename, collection_name, chunk_count, created_at
            """,
            filename,
            file_size,
            collection_name,
            chunk_count,
            embedding_model,
        )
    return dict(row) if row else {}


async def list_documents(collection_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    List document metadata. Optionally filter by collection name.
    Returns list of documents with their upload info.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        if collection_name:
            rows = await conn.fetch(
                "SELECT uuid, filename, file_size, collection_name, chunk_count, created_at FROM documents WHERE collection_name = $1 ORDER BY created_at DESC",
                collection_name
            )
        else:
            rows = await conn.fetch(
                "SELECT uuid, filename, file_size, collection_name, chunk_count, created_at FROM documents ORDER BY created_at DESC"
            )
    return [dict(row) for row in rows]


async def save_chat_log(
    workflow_uuid: Optional[str],
    message: str,
    response: str,
    provider: str,
    context_used: int = 0,
    web_used: bool = False
) -> Dict[str, Any]:
    """
    Save a chat interaction to PostgreSQL for audit/history.
    Links to workflow if provided.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO chat_logs (workflow_uuid, message, response, provider, context_used, web_used)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, uuid, created_at
            """,
            workflow_uuid,
            message,
            response,
            provider,
            context_used,
            web_used,
        )
    return dict(row) if row else {}


async def list_chat_logs(workflow_uuid: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Retrieve chat history. Optionally filter by workflow uuid.
    Returns recent chat logs sorted by timestamp.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        if workflow_uuid:
            rows = await conn.fetch(
                "SELECT uuid, message, response, provider, context_used, web_used, created_at FROM chat_logs WHERE workflow_uuid = $1 ORDER BY created_at DESC LIMIT $2",
                workflow_uuid,
                limit
            )
        else:
            rows = await conn.fetch(
                "SELECT uuid, message, response, provider, context_used, web_used, created_at FROM chat_logs ORDER BY created_at DESC LIMIT $1",
                limit
            )
    return [dict(row) for row in rows]
