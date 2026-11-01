"""WhyLine FastAPI Backend Service (`http://localhost:8000`).
Serves the Cream-and-Olive Engineering Field-Report Studio, Gnani Vachana Speech Bridge,
Hook-Enforced `whyline-mcp` endpoints, Cross-Boundary Expiry Watcher, and Hybrid RRF Co-Pilot.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import yaml

from backend.whyline.ast_scanner import extract_repository_vocabulary
from backend.whyline.cli_and_hooks import install_git_hooks
from backend.whyline.fence_compiler import generate_junit_and_pytest_artifacts
from backend.whyline.gnani_speech import synthesize_timbre_audio, transcribe_voice_confirmation
from backend.whyline.mcp_server import WhyLineMcpEngine
from backend.whyline.store import WhyLineStore

ROOT_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = ROOT_DIR / "demo-repos" / "HealthConnect"

store = WhyLineStore(REPO_DIR)
mcp_engine = WhyLineMcpEngine(store)

app = FastAPI(
    title="WhyLine Engineering Field-Report Studio API",
    version="1.0.0",
    description="Voice ADRs, Recover-First Spoken Fences, Gnani Vachana Speech Stack & Hybrid RRF Graph-RAG",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    cfg_path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")

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
async def receive_incident_webhook(req: IncidentWebhookRequest) -> dict:
    vocab = extract_repository_vocabulary(REPO_DIR)
    stt_res = transcribe_voice_confirmation(
        audio_bytes=None,
        fallback_text=req.voice_postmortem,
        language=req.language,
        repo_vocab=vocab,
    )
    incidents = (
        json.loads(store.incidents_path.read_text(encoding="utf-8")) if store.incidents_path.exists() else []
    )
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


@app.post("/api/copilot/ask")
async def ask_copilot(req: CoPilotAskRequest) -> dict:
    return store.ask_repo_copilot(question=req.question, language=req.language)


@app.get("/api/audio/{filename}")
async def serve_audio_wav(filename: str) -> FileResponse:
    safe_name = Path(filename).name
    wav_path = store.audio_dir / safe_name
    if not wav_path.exists():
        synthesize_timbre_audio(
            text="WhyLine Spoken Fence audio cue.",
            output_dir=store.audio_dir,
            file_stem=Path(safe_name).stem,
        )
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
                "models": "gemini-2.5-flash / llama-3.3-70b-versatile",
                "mode": "Live LLM" if (os.getenv("GEMINI_API_KEY") or os.getenv("GROQ_API_KEY")) else "Deterministic AST-to-Fence Compiler",
            },
        },
        "git_hooks": hooks,
    }
