"""Shared fixtures and state isolation for WhyLine E2E test suites."""
from __future__ import annotations

import json
from pathlib import Path
import shutil
import tempfile
import pytest
from fastapi.testclient import TestClient

from backend.app import REPO_DIR, app, store

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


@pytest.fixture(scope="session")
def client() -> TestClient:
    """FastAPI TestClient for executing opaque-box HTTP requests."""
    return TestClient(app)


@pytest.fixture
def repo_dir() -> Path:
    """Path to the HealthConnect demo repository."""
    return REPO_DIR


@pytest.fixture(autouse=True)
def preserve_demo_state():
    """Preserves and restores demo ledger files and configuration across tests to ensure complete isolation."""
    fences_file = REPO_DIR / ".whyline" / "fences.json"
    scorecard_file = REPO_DIR / ".whyline" / "scorecard.json"
    config_file = REPO_DIR / "config" / "application.yml"
    assumptions_file = REPO_DIR / ".whyline" / "assumptions.json"
    checkpoints_file = REPO_DIR / ".whyline" / "checkpoints.json"

    saved = {}
    for f in [fences_file, scorecard_file, config_file, assumptions_file, checkpoints_file]:
        if f.exists():
            saved[f] = f.read_text(encoding="utf-8")

    yield

    # Restore any modified files
    for f, content in saved.items():
        if f.exists() and f.read_text(encoding="utf-8") != content:
            f.write_text(content, encoding="utf-8")
        elif not f.exists():
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_text(content, encoding="utf-8")


@pytest.fixture
def temp_repo(tmp_path: Path) -> Path:
    """Creates a temporary standalone copy of the HealthConnect demo repository for destructive tests."""
    dst = tmp_path / "HealthConnect"
    shutil.copytree(REPO_DIR, dst, symlinks=True)
    return dst
