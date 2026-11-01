"""Step-by-step multilingual narration for git_scanner flowchart nodes (Gnani Timbre TTS, lazy)."""
from __future__ import annotations

import hashlib
from pathlib import Path
from urllib.parse import urlencode

from backend.whyline.gnani_speech import synthesize_timbre_audio

_TEMPLATES = {
    "en-IN": "Step {n}. {label}. {summary}. It lives in {file}.",
    "hi-IN": "चरण {n}। {label}। {summary}। यह {file} में है।",
    "te-IN": "దశ {n}. {label}. {summary}. ఇది {file} లో ఉంది.",
}
_VOICES = {"en-IN": "Nalini", "hi-IN": "Bhavna", "te-IN": "Nalini"}


def _order(graph: dict) -> list[dict]:
    """Nodes in flow order: BFS from nodes with no incoming edge, following edges."""
    nodes = {n["id"]: n for n in graph["nodes"]}
    incoming = {e["target"] for e in graph["edges"]}
    queue = [i for i in nodes if i not in incoming] or list(nodes)
    seen: list[str] = []
    while queue:
        cur = queue.pop(0)
        if cur in seen:
            continue
        seen.append(cur)
        queue += [e["target"] for e in graph["edges"] if e["source"] == cur]
    seen += [i for i in nodes if i not in seen]
    return [nodes[i] for i in seen]


def narrate_flowchart(graph: dict, language: str) -> list[dict]:
    """Ordered steps [{step, node_id, text, audio_url}].

    Text is instant; audio is synthesized lazily per step via GET /api/git/speak, so the scan
    returns immediately and the UI can prefetch the next step while the current one plays.
    """
    lang = language if language in _TEMPLATES else "en-IN"
    steps = []
    for i, n in enumerate(_order(graph), start=1):
        text = _TEMPLATES[lang].format(
            n=i, label=n["label"], summary=n.get("summary", ""), file=n.get("file_path", "")
        )
        steps.append(
            {
                "step": i,
                "node_id": n["id"],
                "text": text,
                "audio_url": f"/api/git/speak?{urlencode({'text': text, 'language': lang})}",
            }
        )
    return steps


def speak(text: str, language: str, output_dir: Path) -> dict:
    lang = language if language in _TEMPLATES else "en-IN"
    stem = "git_" + hashlib.sha1(f"{lang}:{text}".encode()).hexdigest()[:16]
    return synthesize_timbre_audio(
        text=text[:420], output_dir=output_dir, file_stem=stem, language=lang, voice=_VOICES[lang]
    )
