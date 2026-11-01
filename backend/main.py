"""WhyLine FastAPI Main Entrypoint (`backend/main.py`).
Exposes the FastAPI `app` instance and core services (`gnani_client`, `rag_service`, `test_compiler`)
so both `uvicorn backend.main:app` and `uvicorn backend.app:app` work seamlessly.
"""
from __future__ import annotations

from backend.app import REPO_DIR, app, mcp_engine, store
from backend.services.gnani_client import GnaniSpeechClient
from backend.services.rag_service import HybridRagService
from backend.services.test_compiler import TestCompiler, TestCompiler as InvariantTestCompiler

__all__ = [
    "app",
    "REPO_DIR",
    "store",
    "mcp_engine",
    "GnaniSpeechClient",
    "HybridRagService",
    "InvariantTestCompiler",
    "TestCompiler",
]
