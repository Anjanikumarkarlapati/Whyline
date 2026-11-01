"""Unit tests for WhyLine Git Repository Scanner & Architecture Flowchart Engine."""
from __future__ import annotations

import os
from pathlib import Path
import subprocess
import tempfile
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.whyline.git_scanner import scan_repository

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


def test_scan_local_workspace():
    """Verify scanning the local WhyLine workspace returns genuine analysis and flowchart graph."""
    result = scan_repository(str(ROOT_DIR), branch="main", max_depth=5)

    assert result["status"] == "success"
    assert "scan_timestamp" in result

    meta = result["repo_metadata"]
    assert meta["is_local"] is True
    assert Path(meta["resolved_path"]).resolve() == ROOT_DIR.resolve()
    assert meta["total_files"] > 10
    assert meta["total_lines"] > 500

    # Language breakdown checks
    languages = result["languages"]
    assert len(languages) >= 2
    lang_names = [l["language"] for l in languages]
    assert "Python" in lang_names
    assert any("JavaScript" in name or "JSX" in name for name in lang_names)

    # Check colors are valid tokens/hex
    for lang in languages:
        assert "color" in lang
        assert lang["color"].startswith("#")
        assert lang["files"] > 0
        assert lang["lines"] > 0

    # Directory tree checks
    tree = result["directory_tree"]
    assert tree["type"] == "directory"
    assert len(tree["children"]) > 0

    # Entry points
    entry_points = result["entry_points"]
    assert len(entry_points) > 0
    ep_paths = [ep["file_path"] for ep in entry_points]
    assert any("backend/app.py" in p or "app.py" in p for p in ep_paths)

    # Components
    components = result["components"]
    assert len(components) >= 2
    comp_ids = [c["id"] for c in components]
    assert "comp-backend" in comp_ids
    assert "comp-frontend" in comp_ids

    # Flowchart graph connectivity
    graph = result["flowchart_graph"]
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) >= 5
    assert len(graph["edges"]) >= 4

    node_ids = {n["id"] for n in graph["nodes"]}
    for edge in graph["edges"]:
        assert edge["source"] in node_ids, f"Edge source {edge['source']} not found in nodes"
        assert edge["target"] in node_ids, f"Edge target {edge['target']} not found in nodes"
        assert "type" in edge
        assert "label" in edge


def test_scan_non_existent_path():
    """Verify that scanning a non-existent path raises FileNotFoundError."""
    non_existent = str(ROOT_DIR / "some_completely_non_existent_directory_xyz123")
    with pytest.raises(FileNotFoundError):
        scan_repository(non_existent)

    with pytest.raises(ValueError):
        scan_repository("")


def test_scan_isolated_temp_git_repo():
    """Verify scanner handles an isolated git repo with real commits, SLOC, and branch resolution."""
    with tempfile.TemporaryDirectory() as tmp_dir_str:
        tmp_dir = Path(tmp_dir_str)

        # Initialize git repo
        subprocess.run(["git", "init"], cwd=str(tmp_dir), check=True, capture_output=True)
        subprocess.run(
            ["git", "config", "user.name", "Test Committer"],
            cwd=str(tmp_dir),
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["git", "config", "user.email", "test@whyline.dev"],
            cwd=str(tmp_dir),
            check=True,
            capture_output=True,
        )

        # Add sample files
        py_file = tmp_dir / "service.py"
        py_file.write_text("def run():\n    print('Hello World')\n    return True\n", encoding="utf-8")

        js_file = tmp_dir / "index.js"
        js_file.write_text("console.log('Running frontend');\n", encoding="utf-8")

        subprocess.run(["git", "add", "."], cwd=str(tmp_dir), check=True, capture_output=True)
        subprocess.run(
            ["git", "commit", "-m", "feat: initial test commit"],
            cwd=str(tmp_dir),
            check=True,
            capture_output=True,
        )

        scan = scan_repository(str(tmp_dir))
        assert scan["status"] == "success"
        assert scan["repo_metadata"]["is_git_repo"] is True
        assert scan["repo_metadata"]["total_commits"] >= 1
        assert scan["repo_metadata"]["head_commit"]["message"] == "feat: initial test commit"

        recent = scan["git_history"]["recent_commits"]
        assert len(recent) >= 1
        assert recent[0]["author"] == "Test Committer"

        # Check flowchart node positions
        for node in scan["flowchart_graph"]["nodes"]:
            assert "position" in node
            assert "x" in node["position"]
            assert "y" in node["position"]


def test_scan_non_git_directory():
    """Verify scanner handles a plain non-git directory gracefully."""
    with tempfile.TemporaryDirectory() as tmp_dir_str:
        tmp_dir = Path(tmp_dir_str)
        script_file = tmp_dir / "tool.py"
        script_file.write_text("import os\nprint(os.getcwd())\n", encoding="utf-8")

        scan = scan_repository(str(tmp_dir))
        assert scan["status"] == "success"
        assert scan["repo_metadata"]["is_git_repo"] is False
        assert scan["repo_metadata"]["total_commits"] == 0
        assert scan["repo_metadata"]["head_commit"] is None
        assert scan["git_history"]["recent_commits"] == []
        assert len(scan["languages"]) >= 1
        assert scan["languages"][0]["language"] == "Python"


def test_fastapi_endpoint_git_scan():
    """Verify POST /api/git/scan endpoint works with valid and invalid requests."""
    client = TestClient(app)

    # 1. Valid workspace scan
    resp = client.post(
        "/api/git/scan",
        json={"repo_path_or_url": str(ROOT_DIR), "branch": "main", "max_depth": 4},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["repo_metadata"]["is_local"] is True
    assert "languages" in data
    assert "flowchart_graph" in data

    # 2. Invalid path returns 400
    resp_err = client.post(
        "/api/git/scan",
        json={"repo_path_or_url": "/definitely/invalid/path/12345"},
    )
    assert resp_err.status_code == 400
    assert "detail" in resp_err.json()
