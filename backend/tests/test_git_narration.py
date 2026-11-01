"""Integration tests: git scan -> flowchart -> synchronized multilingual narration."""
from __future__ import annotations

import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.whyline.git_narration import narrate_flowchart
from backend.whyline.git_scanner import scan_repository

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize("lang", ["en-IN", "hi-IN", "te-IN"])
def test_narration_one_step_per_node_in_order(lang):
    g = scan_repository(str(ROOT))["flowchart_graph"]
    steps = narrate_flowchart(g, lang)
    assert [s["step"] for s in steps] == list(range(1, len(steps) + 1))
    assert {s["node_id"] for s in steps} == {n["id"] for n in g["nodes"]}


def test_scan_narrated_is_fast_and_audio_playable():
    with TestClient(app) as c:
        t = time.time()
        r = c.post("/api/git/scan-narrated", json={"repo_path_or_url": str(ROOT), "language": "te-IN"})
        assert r.status_code == 200 and time.time() - t < 5
        body = r.json()
        assert len(body["narration"]) == len(body["flowchart_graph"]["nodes"])
        a = c.get(body["narration"][0]["audio_url"])
        assert a.status_code == 200 and a.content[:4] == b"RIFF"


def test_scan_narrated_rejects_missing_path():
    with TestClient(app) as c:
        assert c.post("/api/git/scan-narrated", json={"repo_path_or_url": str(ROOT / "nope")}).status_code == 400
