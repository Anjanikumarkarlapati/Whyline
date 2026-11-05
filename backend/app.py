"""WhyLine FastAPI Backend Service (`http://localhost:8000`).
Serves the Cream-and-Olive Engineering Field-Report Studio, Gnani Vachana Speech Bridge,
Hook-Enforced `whyline-mcp` endpoints, Cross-Boundary Expiry Watcher, and Hybrid RRF Co-Pilot.
"""
from __future__ import annotations

import binascii
from datetime import datetime, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import threading
import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from pydantic import BaseModel
import yaml

from backend.services.gnani_client import _load_dotenv_once, normalize_gnani_language
from backend.whyline.ast_scanner import extract_repository_vocabulary
from backend.whyline.cli_and_hooks import install_git_hooks
from backend.whyline.fence_compiler import generate_junit_and_pytest_artifacts
from backend.whyline.gnani_speech import synthesize_timbre_audio, transcribe_voice_confirmation
from backend.whyline.git_narration import narrate_flowchart
from backend.whyline.git_scanner import scan_repository
from backend.whyline.mcp_server import WhyLineMcpEngine
from backend.whyline.repo_flowchart import scan_github_repo_flowchart
from backend.whyline.store import WhyLineStore

_load_dotenv_once()

ROOT_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = ROOT_DIR / "demo-repos" / "HealthConnect"

store = WhyLineStore(REPO_DIR)
if not hasattr(WhyLineStore, "get_incidents"):
    def _store_get_incidents(self) -> list[dict]:
        self.ensure_initialized()
        if self.incidents_path.exists():
            try:
                return json.loads(self.incidents_path.read_text(encoding="utf-8"))
            except Exception:
                return []
        return []
    WhyLineStore.get_incidents = _store_get_incidents

mcp_engine = WhyLineMcpEngine(store)

app = FastAPI(
    title="WhyLine Engineering Field-Report Studio API",
    version="1.0.0",
    description="Voice ADRs, Recover-First Spoken Fences, Gnani Vachana Speech Stack & Hybrid RRF Graph-RAG",
)

EXPLICIT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=EXPLICIT_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConfirmFenceRequest(BaseModel):
    transcript_text: str | None = None
    language: str = "te-IN"
    author_handle: str = "@anjani"


class InterceptTestRequest(BaseModel):
    file_path: str = "src/main/java/com/healthconnect/payments/GatewayRouter.java"
    proposed_diff: str = "- int retryCount = 5;\n+ int retryCount = 1;"
    agent_name: str = "Claude Code / Cursor Agent"
    declared_assumptions: list[str] = [
        "Assumes gateway responds on first attempt without packet drop",
        "Assumes retryCount = 5 is redundant legacy boilerplate",
    ]


class GatewayVersionRequest(BaseModel):
    version: str = "v2"


class IncidentWebhookRequest(BaseModel):
    incident_id: str = "INC-10204"
    source: str = "PagerDuty Webhook"
    service: str = "HealthConnect Payment Gateway v1"
    title: str = "Midnight Settlement SYN Packet Drop"
    oncall_engineer: str = "@anjani"
    language: str = "te-IN"
    voice_postmortem: str = (
        "gateway router lo retry count = 5 alage unchandi, Razorpay v1 midnight packet drop inka reproduce avtundi."
    )
    linked_fence_id: str = "FENCE-001"


class CheckpointRequest(BaseModel):
    branch_name: str = "fix/payment-double-charge"
    action: str = "pause"
    author_handle: str = "@anjani"
    summary: str = "Investigating duplicate settlement webhook retries during 00:00 IST window."
    ruled_out_dead_ends: list[str] = [
        "Dropping retryCount from 5 to 1 in GatewayRouter.java (re-triggered midnight packet loss)"
    ]
    next_untested_action: str = "Add deterministic X-Idempotency-Key header before upgrading gateway.version to v2."


class CoPilotAskRequest(BaseModel):
    question: str = (
        "How do we fix the double-charge bug in GatewayRouter.java without breaking the PR #212 midnight retry fence?"
    )
    language: str = "te-IN"
    fence_id: str | None = None
    voice: str = "Nalini"
    audio_base64: str | None = None


def _read_gateway_version() -> str:
    cfg_path = REPO_DIR / "config" / "application.yml"
    if not cfg_path.exists():
        return "v1"
    data = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) or {}
    return str(data.get("healthconnect", {}).get("payment", {}).get("gateway", {}).get("version", "v1"))


@app.on_event("startup")
def on_startup() -> None:
    store.ensure_initialized(force_rescan=False)
    install_git_hooks(REPO_DIR)


@app.get("/api/briefing")
async def get_briefing() -> dict:
    fences = store.get_fences()
    scorecard = (
        json.loads(store.scorecard_path.read_text(encoding="utf-8"))
        if store.scorecard_path.exists()
        else store.run_benchmark_scorecard(fences)
    )
    verified_count = sum(1 for f in fences if f["status"] == "VERIFIED_ACTIVE")
    pending_count = sum(1 for f in fences if f["status"] == "PENDING_CONFIRMATION")
    historical_count = sum(1 for f in fences if f["status"] == "UNVERIFIED_HISTORICAL")
    expired_count = sum(1 for f in fences if f["status"] == "EXPIRED_SAFE_TO_REMOVE")

    return {
        "repo_name": "HealthConnect",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "gateway_version": _read_gateway_version(),
        "kpis": {
            "total_fences": len(fences),
            "verified_active": verified_count,
            "pending_confirmations": pending_count,
            "unverified_historical": historical_count,
            "expired_safe_to_remove": expired_count,
            "intercepted_agent_breaks": scorecard.get("total_intercepted_agent_breaks", 10),
            "live_intercept_events": scorecard.get("live_intercept_events", 4),
        },
        "scorecard": scorecard,
        "pending_fences": [f for f in fences if f["status"] == "PENDING_CONFIRMATION"],
        "fences": fences,
    }


@app.get("/api/fences")
async def list_fences() -> dict:
    fences = store.get_fences()
    junit_path = REPO_DIR / "src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java"
    junit_code = junit_path.read_text(encoding="utf-8") if junit_path.exists() else ""
    return {
        "fences": fences,
        "gateway_version": _read_gateway_version(),
        "junit_invariant_source": junit_code,
    }


@app.post("/api/fences/scan")
async def rescan_repository() -> dict:
    fences = store.ensure_initialized(force_rescan=True)
    scorecard = store.run_benchmark_scorecard(fences)
    return {"fences": fences, "scorecard": scorecard}


@app.post("/api/fences/{fence_id}/confirm")
async def confirm_fence_by_voice(fence_id: str, req: ConfirmFenceRequest) -> dict:
    fences = store.get_fences()
    target = next((f for f in fences if f["id"].upper() == fence_id.upper()), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Fence {fence_id} not found")

    vocab = extract_repository_vocabulary(REPO_DIR)
    stt_result = transcribe_voice_confirmation(
        audio_bytes=None,
        fallback_text=req.transcript_text,
        language=req.language,
        repo_vocab=vocab,
    )

    target["status"] = "VERIFIED_ACTIVE"
    target["language"] = req.language
    target["transcript"] = stt_result["rescored_transcript"]
    target["confirmed_by"] = req.author_handle
    target["confirmed_at"] = datetime.now(timezone.utc).isoformat()

    spoken_warning = (
        f"Confirmed Spoken Fence {target['id']} on {target['symbol_name']}. "
        f"{target['constraint_summary']}"
    )
    tts_meta = synthesize_timbre_audio(
        text=spoken_warning,
        output_dir=store.audio_dir,
        file_stem=f"{target['id'].lower()}_confirmed",
        language=req.language,
    )
    target["audio_url"] = tts_meta["audio_url"]

    store.save_fences(fences)
    test_artifacts = generate_junit_and_pytest_artifacts(REPO_DIR, fences)
    scorecard = store.run_benchmark_scorecard(fences)

    return {
        "fence": target,
        "stt_telemetry": stt_result,
        "tts_telemetry": tts_meta,
        "test_artifacts": test_artifacts,
        "scorecard": scorecard,
    }


@app.post("/api/fences/intercept-test")
async def simulate_agent_intercept(req: InterceptTestRequest) -> dict:
    verification = mcp_engine.verify_diff_against_fences(
        target_file=req.file_path,
        proposed_diff=req.proposed_diff,
        agent_assumptions=req.declared_assumptions,
        agent_name=req.agent_name,
    )
    return verification


@app.post("/api/config/gateway-version")
async def update_gateway_version(req: GatewayVersionRequest) -> dict:
    cfg_path = REPO_DIR / "config" / "application.yml"
    data = yaml.safe_load(cfg_path.read_text(encoding="utf-8")) if cfg_path.exists() else {}
    data.setdefault("healthconnect", {}).setdefault("payment", {}).setdefault("gateway", {})["version"] = req.version
    dumped = yaml.safe_dump(data, sort_keys=False)
    dumped = dumped.replace("version: v1", 'version: "v1"').replace("version: v2", 'version: "v2"')
    cfg_path.write_text(dumped, encoding="utf-8")

    fences = store.get_fences()
    generate_junit_and_pytest_artifacts(REPO_DIR, fences)
    gateway_fence = next((f for f in fences if f["id"] == "FENCE-001"), fences[0])
    return {
        "gateway_version": req.version,
        "config_path": "config/application.yml",
        "updated_fence": gateway_fence,
        "fences": fences,
    }


@app.get("/api/incidents")
async def get_incidents_and_memory() -> dict:
    incidents = (
        json.loads(store.incidents_path.read_text(encoding="utf-8")) if store.incidents_path.exists() else []
    )
    checkpoints = (
        json.loads(store.checkpoints_path.read_text(encoding="utf-8")) if store.checkpoints_path.exists() else []
    )
    assumptions = (
        json.loads(store.assumptions_path.read_text(encoding="utf-8")) if store.assumptions_path.exists() else []
    )
    return {
        "incidents": incidents,
        "checkpoints": checkpoints,
        "assumptions": assumptions,
    }


@app.post("/api/incidents/webhook")
async def receive_incident_webhook(request: Request) -> dict:
    secret = (os.getenv("WEBHOOK_SECRET") or os.getenv("INCIDENT_WEBHOOK_SECRET") or "").strip()
    if not secret:
        raise HTTPException(status_code=401, detail="Webhook verification failed: secret not configured")

    sig_header = (
        request.headers.get("X-PagerDuty-Signature")
        or request.headers.get("X-Whyline-Signature")
        or request.headers.get("X-Hub-Signature-256")
        or request.headers.get("X-Signature-256")
        or ""
    ).strip()

    if not sig_header:
        raise HTTPException(status_code=401, detail="Missing HMAC signature header")

    raw_body = await request.body()
    provided_sig = sig_header
    for prefix in ("v1=", "sha256="):
        if provided_sig.startswith(prefix):
            provided_sig = provided_sig[len(prefix):]
            break

    computed_sig = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(computed_sig.lower(), provided_sig.lower()):
        raise HTTPException(status_code=401, detail="Invalid HMAC-SHA256 webhook signature")

    try:
        body_dict = json.loads(raw_body.decode("utf-8"))
        req = IncidentWebhookRequest(**body_dict)
    except Exception as err:
        raise HTTPException(status_code=400, detail=f"Invalid webhook JSON payload: {err}")

    vocab = extract_repository_vocabulary(REPO_DIR)
    stt_res = transcribe_voice_confirmation(
        audio_bytes=None,
        fallback_text=req.voice_postmortem,
        language=req.language,
        repo_vocab=vocab,
    )
    incidents = (
        store.get_incidents()
        if hasattr(store, "get_incidents")
        else (json.loads(store.incidents_path.read_text(encoding="utf-8")) if store.incidents_path.exists() else [])
    )
    for existing in incidents:
        if str(existing.get("id")) == str(req.incident_id):
            return {
                "status": "duplicate_ignored",
                "incident_id": req.incident_id,
                "incident": existing,
            }
    new_incident = {
        "id": req.incident_id,
        "source": req.source,
        "service": req.service,
        "title": req.title,
        "oncall_engineer": req.oncall_engineer,
        "language": req.language,
        "voice_postmortem": stt_res["rescored_transcript"],
        "ast_replacements": stt_res["ast_replacements"],
        "linked_fence_id": req.linked_fence_id,
        "resolved_at": datetime.now(timezone.utc).isoformat(),
    }
    incidents.insert(0, new_incident)
    store.incidents_path.write_text(json.dumps(incidents, indent=2), encoding="utf-8")
    return {"incident": new_incident, "stt_telemetry": stt_res}


@app.post("/api/checkpoints")
async def create_or_resume_checkpoint(req: CheckpointRequest) -> dict:
    return mcp_engine.log_or_resume_context(
        branch_name=req.branch_name,
        action=req.action,
        author_handle=req.author_handle,
        summary=req.summary,
        ruled_out_dead_ends=req.ruled_out_dead_ends,
        next_untested_action=req.next_untested_action,
    )


class GitScanRequest(BaseModel):
    repo_path_or_url: str
    branch: str = "main"
    max_depth: int = 5
    include_anomalies: bool = True


class RepoFlowchartRequest(BaseModel):
    github_url: str = "https://github.com/healthconnect-india/payment-gateway-service"
    language: str = "te-IN"
    force_refresh: bool = False


class GnaniSttRequest(BaseModel):
    audio_base64: str
    language: str = "indic-auto"
    fallback_text: str = ""


class GnaniTtsRequest(BaseModel):
    text: str
    language: str = "en-IN"
    voice: str = "Nalini"


@app.post("/api/copilot/ask")
async def ask_copilot(req: CoPilotAskRequest) -> dict:
    q_text = req.question
    if req.audio_base64:
        import base64

        try:
            raw_b64 = req.audio_base64.split(",", 1)[-1].strip()
            audio_bytes = base64.b64decode(raw_b64)
            vocab = extract_repository_vocabulary(REPO_DIR)
            stt = transcribe_voice_confirmation(
                audio_bytes=audio_bytes,
                fallback_text=req.question,
                language=req.language,
                repo_vocab=vocab,
            )
            if stt.get("rescored_transcript"):
                q_text = stt["rescored_transcript"]
            target_lang = stt.get("detected_language") if req.language in {"indic-auto", ""} else req.language
        except Exception:
            target_lang = req.language
    else:
        target_lang = req.language
    return store.ask_repo_copilot(question=q_text, language=target_lang, voice=req.voice)


@app.post("/api/gemini/explain-codebase")
async def explain_codebase_endpoint(req: CoPilotAskRequest) -> dict:
    """Gemini-Brain simple reasoning & real-world analogy generator with Gnani Voice Agent narration."""
    return await ask_copilot(req)


@app.post("/api/repo/scan-flowchart")
async def scan_repo_flowchart_post(req: RepoFlowchartRequest) -> dict:
    return scan_github_repo_flowchart(
        store=store,
        github_url=req.github_url,
        language=req.language,
        force_refresh=req.force_refresh,
    )


@app.post("/api/gemini/explain-flowchart")
async def explain_flowchart_endpoint(req: RepoFlowchartRequest) -> dict:
    """Gemini-Brain repository scanner & 5-step simple flowchart reasoning with Gnani Voice narration."""
    return await scan_repo_flowchart_post(req)


@app.post("/api/gnani/stt")
async def gnani_stt_endpoint(req: GnaniSttRequest) -> dict:
    """Dedicated Gnani Prisma v3.0 STT endpoint with indic-auto language detection and AST vocabulary rescoring."""
    import base64

    raw_b64 = req.audio_base64.split(",", 1)[-1].strip()
    try:
        audio_bytes = base64.b64decode(raw_b64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="Invalid base64 audio payload")
    vocab = extract_repository_vocabulary(REPO_DIR)
    return transcribe_voice_confirmation(
        audio_bytes=audio_bytes,
        fallback_text=req.fallback_text,
        language=req.language,
        repo_vocab=vocab,
    )


@app.post("/api/gnani/tts")
async def gnani_tts_endpoint(req: GnaniTtsRequest, request: Request) -> dict:
    """Dedicated Gnani Timbre TTS endpoint for real-time speech synthesis in en-IN, te-IN, or hi-IN."""
    return await synthesize_tts_endpoint(
        TTSRequest(text=req.text, language=req.language, voice=req.voice),
        request=request,
    )


@app.get("/api/repo/scan-flowchart")
async def scan_repo_flowchart_get(
    github_url: str = "https://github.com/healthconnect-india/payment-gateway-service",
    language: str = "te-IN",
) -> dict:
    return scan_github_repo_flowchart(
        store=store,
        github_url=github_url,
        language=language,
        force_refresh=False,
    )


@app.post("/api/git/scan")
async def scan_git_repository_endpoint(req: GitScanRequest) -> dict:
    try:
        return scan_repository(
            target_path_or_url=req.repo_path_or_url,
            branch=req.branch,
            max_depth=req.max_depth,
            include_anomalies=req.include_anomalies,
        )
    except (FileNotFoundError, NotADirectoryError, ValueError) as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=400, detail=f"Failed to scan repository: {err}")


class GitNarrateRequest(GitScanRequest):
    language: str = "en-IN"


class TTSRequest(BaseModel):
    text: str
    language: str = "en-IN"
    voice: str = "Nalini"


_TTS_RATE_LIMIT: dict[str, list[float]] = {}
_TTS_RATE_LOCK = threading.Lock()
ALLOWED_LANGUAGES = {"telugu", "hindi", "english", "te-in", "hi-in", "en-in", "te", "hi", "en"}
ALLOWED_VOICES = {"Nalini", "Bhavna", "Pranav"}


def _check_tts_rate_limit(client_ip: str, limit: int = 60, window_secs: float = 60.0) -> None:
    now = time.time()
    with _TTS_RATE_LOCK:
        history = _TTS_RATE_LIMIT.setdefault(client_ip, [])
        history[:] = [ts for ts in history if now - ts < window_secs]
        if len(history) >= limit:
            raise HTTPException(status_code=429, detail="TTS rate limit exceeded (maximum 60 requests/minute)")
        history.append(now)


def cleanup_audio_cache(audio_dir: Path, max_files: int = 150, ttl_seconds: int = 86400) -> int:
    """LRU + TTL cleanup of cached audio in .whyline/audio."""
    if not audio_dir.exists():
        return 0
    now = time.time()
    deleted = 0
    wav_files = [f for f in audio_dir.glob("*.wav") if f.is_file()]
    remaining: list[tuple[float, Path]] = []
    for f in wav_files:
        try:
            mtime = f.stat().st_mtime
            if (now - mtime) > ttl_seconds:
                f.unlink(missing_ok=True)
                deleted += 1
            else:
                remaining.append((mtime, f))
        except OSError:
            pass

    if len(remaining) > max_files:
        remaining.sort(key=lambda x: x[0])  # oldest first
        excess = len(remaining) - max_files
        for _, f in remaining[:excess]:
            try:
                f.unlink(missing_ok=True)
                deleted += 1
            except OSError:
                pass

    return deleted


@app.post("/api/tts")
async def synthesize_tts_endpoint(req: TTSRequest, request: Request) -> dict:
    """Synthesizes speech using verified Gnani Timbre v2.5 with rate limiting, allowlists, and LRU/TTL cache."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    _check_tts_rate_limit(client_ip)

    clean_text = (req.text or "").strip()
    if not clean_text or len(clean_text) > 600:
        raise HTTPException(
            status_code=400,
            detail="Text payload must be between 1 and 600 characters",
        )

    clean_lang = req.language.strip().lower()
    if clean_lang not in ALLOWED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{req.language}'. Allowed: telugu, hindi, english (or te-IN, hi-IN, en-IN)",
        )

    clean_voice = req.voice.strip().capitalize()
    if clean_voice not in ALLOWED_VOICES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported voice '{req.voice}'. Allowed: Nalini, Bhavna, Pranav",
        )

    cleanup_audio_cache(store.audio_dir, max_files=150, ttl_seconds=86400)

    norm_lang = normalize_gnani_language(req.language)
    opaque_id = hashlib.sha256(f"{clean_voice}:{norm_lang}:{clean_text}".encode("utf-8")).hexdigest()[:16]
    stem = f"tts_{opaque_id}"

    tts_meta = synthesize_timbre_audio(
        text=clean_text,
        output_dir=store.audio_dir,
        file_stem=stem,
        language=norm_lang,
        voice=clean_voice,
    )

    return {
        "id": opaque_id,
        "audio_url": f"/api/audio/{stem}.wav",
        "provider_mode": tts_meta.get("provider_mode", "unknown"),
        "language": req.language,
        "voice": clean_voice,
        "sample_rate": 16000,
    }


@app.post("/api/git/scan-narrated")
async def scan_git_narrated(req: GitNarrateRequest) -> dict:
    """Scan a repo and return the flowchart plus ordered, synchronized voice steps."""
    result = await scan_git_repository_endpoint(req)
    result["narration"] = narrate_flowchart(result["flowchart_graph"], req.language, store.audio_dir)
    return result


@app.get("/api/audio/{audio_id}")
async def serve_audio_wav(audio_id: str) -> FileResponse:
    safe_name = Path(audio_id).name
    if not safe_name or ".." in audio_id or "/" in audio_id or "\\" in audio_id:
        raise HTTPException(status_code=400, detail="Invalid audio identifier")

    clean_stem = safe_name[:-4] if safe_name.lower().endswith(".wav") else safe_name
    candidates = [
        store.audio_dir / safe_name,
        store.audio_dir / f"{safe_name}.wav" if not safe_name.endswith(".wav") else None,
        store.audio_dir / f"tts_{clean_stem}.wav",
        store.audio_dir / f"tts_{safe_name}",
    ]
    wav_path = next((p for p in candidates if p and p.is_file()), None)
    if not wav_path or not wav_path.exists():
        if safe_name.startswith("regenerated_"):
            store.audio_dir.mkdir(parents=True, exist_ok=True)
            synthesize_timbre_audio("Demo cue", store.audio_dir, file_stem=clean_stem)
            candidate = store.audio_dir / f"{clean_stem}.wav"
            if candidate.exists():
                return FileResponse(candidate, media_type="audio/wav")
        raise HTTPException(status_code=404, detail="Audio file not found in cache")

    return FileResponse(wav_path, media_type="audio/wav")


@app.get("/api/settings")
async def get_settings_status() -> dict:
    hooks = install_git_hooks(REPO_DIR)
    return {
        "repo_path": REPO_DIR.as_posix(),
        "gateway_version": _read_gateway_version(),
        "providers": {
            "gnani_vachana_speech": {
                "configured": bool(os.getenv("GNANI_API_KEY", "").strip()),
                "stt_model": "prisma-v2.5",
                "tts_model": "timbre-v2.5",
                "mode": "Live API" if os.getenv("GNANI_API_KEY", "").strip() else "Sandbox + 16kHz WAV Synthesizer",
            },
            "supabase_pgvector": {
                "configured": bool(os.getenv("SUPABASE_URL", "").strip()),
                "rpc_function": "match_whyline_code_and_fences",
                "mode": "Dual-Store Live Sync" if os.getenv("SUPABASE_URL", "").strip() else "Local RRF + SQL Migration Ready",
            },
            "llm_fence_compiler": {
                "configured": bool(os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GROQ_API_KEY", "").strip()),
                "models": "gemini-3.8-flash / llama-3.3-70b-versatile",
                "mode": "Live LLM" if (os.getenv("GEMINI_API_KEY") or os.getenv("GROQ_API_KEY")) else "Deterministic AST-to-Fence Compiler",
            },
        },
        "git_hooks": hooks,
    }
