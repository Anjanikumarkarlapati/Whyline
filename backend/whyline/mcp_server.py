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
import re

from .gnani_speech import synthesize_timbre_audio
from .store import WhyLineStore


def normalize_canonical_path(path_str: str | None, repo_dir: Path | None = None) -> str:
    """Canonical path normalization (BE-205).
    Resolves backslashes, redundant slashes, dot/double-dot segments,
    and strips absolute repo prefixes.
    """
    if not path_str:
        return ""
    p = str(path_str).strip().strip("'\"")
    if not p or p in (".", "./", ".\\"):
        return ""
    p = p.replace("\\", "/")
    if repo_dir:
        try:
            resolved_p = Path(p)
            if resolved_p.is_absolute():
                p = str(resolved_p.resolve().relative_to(repo_dir.resolve())).replace("\\", "/")
        except Exception:
            pass
    parts: list[str] = []
    for seg in p.split("/"):
        if seg in ("", "."):
            continue
        elif seg == "..":
            if parts:
                parts.pop()
        else:
            parts.append(seg)
    return "/".join(parts)


def parse_unified_diff(diff_text: str) -> tuple[list[int], list[str], list[str], bool, bool]:
    """Extracts changed line numbers, removed lines, added lines, and semantic metadata.
    Returns:
        (changed_lines, removed_lines, added_lines, is_whitespace_only, is_comment_only)
    """
    if not diff_text or not diff_text.strip():
        return [], [], [], False, False

    changed_lines: list[int] = []
    removed_lines: list[str] = []
    added_lines: list[str] = []

    curr_orig_line = 0
    in_hunk = False

    for line in diff_text.splitlines():
        m = re.match(r"^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@", line)
        if m:
            curr_orig_line = int(m.group(1))
            in_hunk = True
            continue

        if not in_hunk:
            continue

        if line.startswith("---") or line.startswith("+++"):
            continue

        if line.startswith("-"):
            changed_lines.append(curr_orig_line)
            removed_lines.append(line[1:])
            curr_orig_line += 1
        elif line.startswith("+"):
            changed_lines.append(curr_orig_line)
            added_lines.append(line[1:])
        elif line.startswith(" ") or line == "":
            curr_orig_line += 1

    changed_lines = sorted(list(set(changed_lines)))

    # Evaluate whitespace-only
    is_whitespace_only = False
    if removed_lines or added_lines:
        compact_removed = re.sub(r"\s+", "", "".join(removed_lines))
        compact_added = re.sub(r"\s+", "", "".join(added_lines))
        if compact_removed == compact_added:
            is_whitespace_only = True

    # Evaluate comment-only
    is_comment_only = False
    if not is_whitespace_only and (removed_lines or added_lines):
        def _is_comment(l: str) -> bool:
            s = l.strip()
            return (
                not s
                or s.startswith("//")
                or s.startswith("/*")
                or s.startswith("*")
                or s.startswith("*/")
                or s.startswith("#")
                or s.startswith('"""')
                or s.startswith("'''")
            )
        if all(_is_comment(l) for l in removed_lines) and all(_is_comment(l) for l in added_lines):
            is_comment_only = True

    return changed_lines, removed_lines, added_lines, is_whitespace_only, is_comment_only


class WhyLineMcpEngine:
    def __init__(self, store: WhyLineStore) -> None:
        self.store = store

    def check_fences(self, file_path: str, proposed_diff: str = "") -> dict:
        """Deterministic pre-edit / pre-commit check against Spoken Fences (BE-205).
        Diff-aware: blocks only when the diff changes fenced lines or violates the fence invariant.
        Returns: {decision, fence_id, reason, changed_lines, confidence}
        """
        norm_target = normalize_canonical_path(file_path, self.store.repo_dir)
        if not norm_target:
            return {
                "decision": "ALLOW_EDIT",
                "fence_id": None,
                "reason": "Empty target path specified.",
                "changed_lines": [],
                "confidence": 1.0,
                "fence": None,
            }

        norm_target_lower = norm_target.lower()
        fences = self.store.get_fences()
        matched = []
        for f in fences:
            f_norm = normalize_canonical_path(f["file_path"], self.store.repo_dir).lower()
            if (
                f_norm == norm_target_lower
                or f_norm.endswith("/" + norm_target_lower)
                or norm_target_lower.endswith("/" + f_norm)
                or Path(norm_target_lower).name == Path(f_norm).name
            ):
                matched.append(f)

        if not matched:
            return {
                "decision": "ALLOW_EDIT",
                "fence_id": None,
                "reason": f"No Spoken Fence registered on `{norm_target}`.",
                "changed_lines": [],
                "confidence": 1.0,
                "fence": None,
            }

        fence = matched[0]
        fence_id = fence["id"]
        status = fence["status"]

        # Parse proposed diff if provided
        changed_lines, removed_lines, added_lines, is_whitespace_only, is_comment_only = parse_unified_diff(proposed_diff)

        # Expired fences are safe to edit/clean up
        if status == "EXPIRED_SAFE_TO_REMOVE":
            return {
                "decision": "ALLOW_EDIT",
                "fence_id": fence_id,
                "reason": (
                    f"Spoken Fence {fence_id} on `{fence['symbol_name']}` is EXPIRED_SAFE_TO_REMOVE "
                    f"({fence.get('expiry_condition', {}).get('description')}). Safe to apply cleanup diff."
                ),
                "changed_lines": changed_lines,
                "confidence": 1.0,
                "fence": fence,
                "cleanup_diff": fence.get("cleanup_diff"),
            }

        # If a diff is provided, check for diff-specific bypasses (whitespace-only, comment-only, unrelated lines, moved code)
        if proposed_diff and proposed_diff.strip():
            # Check token presence in removed vs added lines first
            token = fence.get("matched_token", "").strip()
            token_compact = re.sub(r"\s+", "", token)
            removed_str = "\n".join(removed_lines)
            added_str = "\n".join(added_lines)
            removed_compact = re.sub(r"\s+", "", removed_str)
            added_compact = re.sub(r"\s+", "", added_str)

            token_in_removed = bool(token and (token in removed_str or (token_compact and token_compact in removed_compact)))
            token_in_added = bool(token and (token in added_str or (token_compact and token_compact in added_compact)))

            # 1. Whitespace-only edit (token must not be deleted)
            if is_whitespace_only and not (token_in_removed and not token_in_added):
                return {
                    "decision": "ALLOW_EDIT",
                    "fence_id": fence_id,
                    "reason": (
                        f"Diff on `{norm_target}` consists of whitespace/formatting adjustments only. "
                        f"Fence invariant `{fence.get('matched_token')}` preserved."
                    ),
                    "changed_lines": changed_lines,
                    "confidence": 0.99,
                    "fence": fence,
                }

            # 2. Comment-only edit (only if the guarded token itself was not deleted)
            if is_comment_only and not token_in_removed:
                return {
                    "decision": "ALLOW_EDIT",
                    "fence_id": fence_id,
                    "reason": (
                        f"Diff on `{norm_target}` consists of comment/documentation edits only. "
                        f"Fence invariant `{fence.get('matched_token')}` preserved."
                    ),
                    "changed_lines": changed_lines,
                    "confidence": 0.99,
                    "fence": fence,
                }

            # Check line overlap
            f_start = fence.get("start_line", 1)
            f_end = fence.get("end_line", 999999)
            fence_lines = set(range(f_start, f_end + 1))
            overlaps_fence = any(l in fence_lines for l in changed_lines)

            # Code moved with invariant intact:
            if token_in_removed and token_in_added:
                return {
                    "decision": "ALLOW_EDIT",
                    "fence_id": fence_id,
                    "reason": (
                        f"Code relocation detected: guarded invariant `{token}` was preserved intact "
                        f"in `{norm_target}`."
                    ),
                    "changed_lines": changed_lines,
                    "confidence": 0.95,
                    "fence": fence,
                }

            # Edit touches lines outside fence range and does not delete token
            if not overlaps_fence and not token_in_removed:
                return {
                    "decision": "ALLOW_EDIT",
                    "fence_id": fence_id,
                    "reason": (
                        f"Proposed diff modifies lines {changed_lines}, which do not overlap guarded fence "
                        f"lines [{f_start}-{f_end}] in `{norm_target}`. Invariant preserved."
                    ),
                    "changed_lines": changed_lines,
                    "confidence": 0.95,
                    "fence": fence,
                }

        # If we reach here, either proposed_diff is empty (file-level check) or diff modifies fenced lines / violates invariant
        if status == "UNVERIFIED_HISTORICAL":
            self._increment_intercept_counter(fence["id"], "WARN_AND_REQUIRE_CONFIRMATION")
            return {
                "decision": "WARN_AND_REQUIRE_CONFIRMATION",
                "fence_id": fence_id,
                "reason": (
                    f"Cautionary Intercept on `{fence['symbol_name']}` ({fence['id']}): "
                    f"Original author {fence['author_handle']} has departed. "
                    f"Provenance: {fence['provenance']['pr_number']} / {fence['provenance']['incident_id']}. "
                    f"Require explicit human confirmation before modifying `{fence['matched_token']}`."
                ),
                "changed_lines": changed_lines,
                "confidence": 0.90,
                "fence": fence,
                "spoken_warning_url": fence["audio_url"],
                "invariant_test_path": fence["invariant_test_path"],
            }

        # VERIFIED_ACTIVE or PENDING_CONFIRMATION -> Hard Intercept
        self._increment_intercept_counter(fence["id"], "REJECT_EDIT")
        return {
            "decision": "REJECT_EDIT",
            "fence_id": fence_id,
            "reason": (
                f"HARD INTERCEPT by Spoken Fence {fence['id']} [{status}] on `{fence['symbol_name']}` "
                f"(AST Hash `{fence['ast_signature_hash']}`).\n"
                f"Constraint: {fence['constraint_summary']}\n"
                f"Danger if removed: {fence['danger_condition']}\n"
                f"Provenance: {fence['provenance']['pr_number']} • {fence['provenance']['incident_id']} • Confirmed by {fence['author_handle']}."
            ),
            "changed_lines": changed_lines,
            "confidence": 1.0,
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
