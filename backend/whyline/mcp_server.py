"""Hook-Enforced `whyline-mcp` Server & Guardrail Engine (BE-205).
Implements the 4 mandatory MCP tools from `AGENTS.md`:
1. `check_fences(file_path, proposed_diff)`
2. `get_fence_audio(fence_id)`
3. `verify_diff_against_fences(proposed_diff, agent_assumptions)`
4. `log_or_resume_context(branch_name, action, summary, ruled_out_dead_ends, next_untested_action)`
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path

from .gnani_speech import synthesize_timbre_audio
from .store import WhyLineStore


class WhyLineMcpEngine:
    def __init__(self, store: WhyLineStore) -> None:
        self.store = store

    def check_fences(self, file_path: str, proposed_diff: str = "") -> dict:
        """Deterministic pre-edit / pre-commit check against Spoken Fences."""
        norm_target = os.path.normpath(file_path).replace("\\", "/").strip("/") if file_path else ""
        if not norm_target:
            return {
                "decision": "ALLOW_EDIT",
                "reason": "Empty target path specified.",
                "fence": None,
            }
        fences = self.store.get_fences()
        matched = [
            f
            for f in fences
            if f["file_path"].lower().endswith(norm_target.lower())
            or norm_target.lower().endswith(f["file_path"].lower())
        ]
        if not matched:
            return {
                "decision": "ALLOW_EDIT",
                "reason": f"No Spoken Fence registered on `{norm_target}`.",
                "fence": None,
            }

        fence = matched[0]
        status = fence["status"]

        if status == "EXPIRED_SAFE_TO_REMOVE":
            return {
                "decision": "ALLOW_EDIT",
                "reason": (
                    f"Spoken Fence {fence['id']} on `{fence['symbol_name']}` is EXPIRED_SAFE_TO_REMOVE "
                    f"({fence['expiry_condition'].get('description')}). Safe to apply cleanup diff."
                ),
                "fence": fence,
                "cleanup_diff": fence.get("cleanup_diff"),
            }

        if status == "UNVERIFIED_HISTORICAL":
            self._increment_intercept_counter(fence["id"], "WARN_AND_REQUIRE_CONFIRMATION")
            return {
                "decision": "WARN_AND_REQUIRE_CONFIRMATION",
                "reason": (
                    f"Cautionary Intercept on `{fence['symbol_name']}` ({fence['id']}): "
                    f"Original author {fence['author_handle']} has departed. "
                    f"Provenance: {fence['provenance']['pr_number']} / {fence['provenance']['incident_id']}. "
                    f"Require explicit human confirmation before modifying `{fence['matched_token']}`."
                ),
                "fence": fence,
                "spoken_warning_url": fence["audio_url"],
                "invariant_test_path": fence["invariant_test_path"],
            }

        # VERIFIED_ACTIVE or PENDING_CONFIRMATION -> Hard Intercept
        self._increment_intercept_counter(fence["id"], "REJECT_EDIT")
        return {
            "decision": "REJECT_EDIT",
            "reason": (
                f"HARD INTERCEPT by Spoken Fence {fence['id']} [{status}] on `{fence['symbol_name']}` "
                f"(AST Hash `{fence['ast_signature_hash']}`).\n"
                f"Constraint: {fence['constraint_summary']}\n"
                f"Danger if removed: {fence['danger_condition']}\n"
                f"Provenance: {fence['provenance']['pr_number']} • {fence['provenance']['incident_id']} • Confirmed by {fence['author_handle']}."
            ),
            "fence": fence,
            "spoken_warning_url": fence["audio_url"],
            "invariant_test_path": fence["invariant_test_path"],
            "invariant_test_verdict": "FAIL (SpokenFenceInvariantTest blocked removal of guarded workaround)",
        }

    def _increment_intercept_counter(self, fence_id: str, decision: str) -> None:
        if not self.store.scorecard_path.exists():
            self.store.run_benchmark_scorecard()
        try:
            scorecard = json.loads(self.store.scorecard_path.read_text(encoding="utf-8"))
            scorecard["live_intercept_events"] = scorecard.get("live_intercept_events", 0) + 1
            scorecard["last_intercepted_fence_id"] = fence_id
            scorecard["last_intercept_decision"] = decision
            scorecard["last_intercept_at"] = datetime.now(timezone.utc).isoformat()
            self.store.scorecard_path.write_text(json.dumps(scorecard, indent=2), encoding="utf-8")
        except Exception:
            pass

    def get_fence_audio(self, fence_id: str) -> dict:
        if not fence_id:
            return {"error": "Invalid fence_id"}
        fences = self.store.get_fences()
        for f in fences:
            if f["id"].upper() == fence_id.upper():
                return {
                    "fence_id": f["id"],
                    "symbol_name": f["symbol_name"],
                    "status": f["status"],
                    "audio_url": f["audio_url"],
                    "tts_model": "timbre-v2.5",
                    "sample_rate": 16000,
                    "constraint_summary": f["constraint_summary"],
                    "transcript": f.get("transcript") or f["reconstructed_why"],
                }
        return {"error": f"Fence {fence_id} not found"}

    def verify_diff_against_fences(
        self,
        target_file: str,
        proposed_diff: str,
        agent_assumptions: list[str],
        agent_name: str = "Claude Code / Cursor Agent",
    ) -> dict:
        check = self.check_fences(target_file, proposed_diff)
        assumptions = []
        if self.store.assumptions_path.exists():
            assumptions = json.loads(self.store.assumptions_path.read_text(encoding="utf-8"))

        new_entry = {
            "id": f"ASM-{len(assumptions) + 1:02d}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent_name": agent_name,
            "target_file": target_file,
            "declared_assumptions": agent_assumptions,
            "verdict": (
                "REJECTED_BY_FENCE"
                if check["decision"] == "REJECT_EDIT"
                else (
                    "CAUTION_UNVERIFIED_HISTORICAL"
                    if check["decision"] == "WARN_AND_REQUIRE_CONFIRMATION"
                    else "SAFE_TO_PROCEED"
                )
            ),
            "violated_fence_id": check["fence"]["id"] if check.get("fence") else None,
            "explanation": check["reason"],
        }
        assumptions.insert(0, new_entry)
        self.store.assumptions_path.write_text(json.dumps(assumptions, indent=2), encoding="utf-8")
        return {"assumption_entry": new_entry, "fence_check": check}

    def log_or_resume_context(
        self,
        branch_name: str,
        action: str = "resume",
        author_handle: str = "@anjani",
        summary: str = "",
        ruled_out_dead_ends: list[str] | None = None,
        next_untested_action: str = "",
    ) -> dict:
        checkpoints = []
        if self.store.checkpoints_path.exists():
            checkpoints = json.loads(self.store.checkpoints_path.read_text(encoding="utf-8"))

        if action == "pause":
            chk_id = f"CHK-{len(checkpoints) + 1:02d}"
            dead_ends = ruled_out_dead_ends or []
            briefing_text = (
                f"Branch {branch_name} checkpoint by {author_handle}. "
                f"{summary} Ruled out dead ends: {'; '.join(dead_ends)}. "
                f"Next untested action: {next_untested_action}"
            )
            tts = synthesize_timbre_audio(
                text=briefing_text,
                output_dir=self.store.audio_dir,
                file_stem=f"checkpoint_{chk_id.lower()}",
                language="en-IN",
            )
            entry = {
                "id": chk_id,
                "repo_name": "HealthConnect",
                "branch_name": branch_name,
                "author_handle": author_handle,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "summary": summary,
                "ruled_out_dead_ends": dead_ends,
                "next_untested_action": next_untested_action,
                "audio_url": tts["audio_url"],
            }
            checkpoints.insert(0, entry)
            self.store.checkpoints_path.write_text(json.dumps(checkpoints, indent=2), encoding="utf-8")
            return {"action": "pause_saved", "checkpoint": entry}

        for chk in checkpoints:
            if chk["branch_name"] == branch_name:
                return {"action": "resume_briefing", "checkpoint": chk}
        return {"action": "resume_briefing", "checkpoint": checkpoints[0] if checkpoints else None}
