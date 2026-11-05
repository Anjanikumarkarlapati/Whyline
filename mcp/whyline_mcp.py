"""WhyLine FastMCP Server (Milestone 3 / BE-205).

Hook-Enforced Model Context Protocol server exposing 4 core tools:
1. check_fences(file_path: str, proposed_diff: str = "") -> dict
2. verify_diff_against_fences(target_file: str, proposed_diff: str, agent_assumptions: list[str] = None, agent_name: str = "AI Agent") -> dict
3. log_or_resume_context(branch_name: str, action: str = "resume", author_handle: str = "@anjani", summary: str = "", ruled_out_dead_ends: list[str] = None, next_untested_action: str = "") -> dict
4. get_fence_audio(fence_id: str) -> dict

Can be executed directly over standard I/O (stdio) via:
    python -m mcp.whyline_mcp
"""
from __future__ import annotations

import os
from pathlib import Path
import sys

from mcp.server.fastmcp import FastMCP

from backend.whyline.mcp_server import WhyLineMcpEngine
from backend.whyline.store import WhyLineStore

# Instantiate FastMCP server
mcp = FastMCP("whyline-mcp")


def resolve_repo_dir(custom_path: str | Path | None = None) -> Path:
    """Dynamically resolves the active repository root path.

    Resolution hierarchy:
    1. Explicit custom_path argument if valid.
    2. WHYLINE_REPO_DIR environment variable if defined and existing.
    3. Traversal upward from current working directory looking for .whyline/ directory.
    4. Local demo/HealthConnect or demo-repos/HealthConnect directories.
    """
    if custom_path:
        p = Path(custom_path).resolve()
        if p.exists():
            return p

    env_dir = os.environ.get("WHYLINE_REPO_DIR")
    if env_dir:
        p = Path(env_dir).resolve()
        if p.exists():
            return p

    cwd = Path.cwd().resolve()
    for cur in [cwd, *cwd.parents]:
        if (cur / "demo-repos" / "HealthConnect" / ".whyline").exists():
            return (cur / "demo-repos" / "HealthConnect").resolve()
        if (cur / "demo" / "HealthConnect" / ".whyline").exists():
            return (cur / "demo" / "HealthConnect").resolve()
        if (cur / ".whyline").exists():
            return cur

    workspace_root = Path(__file__).resolve().parent.parent
    if (workspace_root / "demo" / "HealthConnect" / ".whyline").exists():
        return workspace_root / "demo" / "HealthConnect"
    if (workspace_root / "demo-repos" / "HealthConnect" / ".whyline").exists():
        return workspace_root / "demo-repos" / "HealthConnect"
    return workspace_root


def get_engine(repo_dir: Path | None = None) -> WhyLineMcpEngine:
    """Returns a WhyLineMcpEngine instance bound to the resolved repository."""
    repo = repo_dir or resolve_repo_dir()
    store = WhyLineStore(repo)
    return WhyLineMcpEngine(store)


@mcp.tool()
def check_fences(file_path: str, proposed_diff: str = "") -> dict:
    """Deterministic pre-edit / pre-commit check against Spoken Fences.

    Cross-references target file against active and historical Spoken Fences
    (.whyline/fences.json). Enforces Chesterton's Fences by blocking naive removals
    of documented bug workarounds unless legitimate config expiry conditions are met.

    Args:
        file_path: Relative or absolute path to the file being edited or staged.
        proposed_diff: Optional proposed diff or hunk string to evaluate.

    Returns:
        Structured dict containing:
            - decision: 'ALLOW_EDIT', 'REJECT_EDIT', or 'WARN_AND_REQUIRE_CONFIRMATION'
            - reason: Detailed explanation referencing PR, incident ID, or departed author
            - fence: Full fence record dict if matched, or None
            - spoken_warning_url: Audio URL to Timbre v2.5 voice warning if applicable
            - invariant_test_path: Path to executable invariant test
    """
    return get_engine().check_fences(file_path, proposed_diff)


@mcp.tool()
def verify_diff_against_fences(
    target_file: str,
    proposed_diff: str,
    agent_assumptions: list[str] | None = None,
    agent_name: str = "AI Agent",
) -> dict:
    """Validates a proposed unified diff against Spoken Fences and logs silent assumptions.

    Records agent reasoning to the audit ledger (.whyline/assumptions.json) and
    evaluates whether the diff attempts to delete or weaken guarded tokens without
    proper architectural prerequisites.

    Args:
        target_file: Path of the file being modified.
        proposed_diff: Unified diff snippet proposed by the AI agent or developer.
        agent_assumptions: Natural-language hypotheses or assumptions declared by the agent.
        agent_name: Name of the AI agent or developer tool (default: "AI Agent").

    Returns:
        Structured dict containing:
            - assumption_entry: Logged assumption ledger item with generated ID and verdict
            - fence_check: Result of the check_fences evaluation
    """
    assumptions = agent_assumptions if agent_assumptions is not None else []
    return get_engine().verify_diff_against_fences(
        target_file=target_file,
        proposed_diff=proposed_diff,
        agent_assumptions=assumptions,
        agent_name=agent_name,
    )


@mcp.tool()
def log_or_resume_context(
    branch_name: str,
    action: str = "resume",
    author_handle: str = "@anjani",
    summary: str = "",
    ruled_out_dead_ends: list[str] | None = None,
    next_untested_action: str = "",
) -> dict:
    """Saves branch-scoped Dead-End Memory checkpoints or retrieves spoken resume briefings.

    Provides short-horizon investigative memory for branches. When pausing, saves
    investigative hypotheses already tried and synthesizes a 10s Timbre v2.5 spoken briefing.
    When resuming, returns the latest checkpoint and audio URL.

    Args:
        branch_name: Name of the active git branch.
        action: 'pause' to save a new checkpoint; 'resume' to retrieve previous context.
        author_handle: Developer handle (default: "@anjani").
        summary: Summary of current findings and investigation status.
        ruled_out_dead_ends: List of hypotheses already tested and eliminated.
        next_untested_action: The immediate next hypothesis or action to test.

    Returns:
        Structured dict containing action performed and checkpoint record.
    """
    return get_engine().log_or_resume_context(
        branch_name=branch_name,
        action=action,
        author_handle=author_handle,
        summary=summary,
        ruled_out_dead_ends=ruled_out_dead_ends,
        next_untested_action=next_untested_action,
    )


@mcp.tool()
def get_fence_audio(fence_id: str) -> dict:
    """Fetches synthesized Timbre v2.5 warning audio and transcript for a Spoken Fence.

    Args:
        fence_id: Unique identifier of the fence (e.g. 'FENCE-001').

    Returns:
        Structured dict containing fence ID, symbol name, status, audio URL,
        TTS metadata, and spoken transcript.
    """
    return get_engine().get_fence_audio(fence_id)


if __name__ == "__main__":
    mcp.run()
