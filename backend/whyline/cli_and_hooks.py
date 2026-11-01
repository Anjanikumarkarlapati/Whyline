"""CLI & Deterministic Git Hooks Installer (`pre-commit`, `post-checkout`, IDE Pre-Edit).
Ensures coding agents cannot bypass `whyline-mcp` using raw file edits or commits.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

from .mcp_server import WhyLineMcpEngine
from .store import WhyLineStore


def install_git_hooks(repo_dir: Path) -> dict[str, str]:
    """Installs deterministic WhyLine pre-commit and post-checkout hooks into target git repository."""
    hooks_dir = repo_dir / ".git" / "hooks"
    if not hooks_dir.exists():
        return {}

    pre_commit_path = hooks_dir / "pre-commit"
    post_checkout_path = hooks_dir / "post-checkout"

    template_path = Path(__file__).resolve().parent.parent.parent / "scripts" / "hooks" / "pre-commit"
    if template_path.exists():
        pre_commit_script = template_path.read_text(encoding="utf-8")
    else:
        pre_commit_script = """#!/usr/bin/env sh
# WhyLine Deterministic Pre-Commit Spoken Fence Guardrail
# Aborts commit if any staged changes violate active Spoken Fences (.whyline/fences.json)

echo "[WhyLine Guard] Verifying staged hunks against .whyline/fences.json..."
python -m backend.whyline.cli_and_hooks check-staged
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "[WhyLine Guard] Commit aborted by WhyLine Spoken Fence enforcer." >&2
    exit $EXIT_CODE
fi

exit 0
"""

    post_checkout_script = """#!/usr/bin/env sh
# WhyLine Post-Checkout Dead-End Memory & Spoken Resume Briefing
echo "[WhyLine Memory] Checking branch Dead-End Memory & Gnani Timbre v2.5 briefing..."
python -m backend.whyline.cli_and_hooks resume
"""

    pre_commit_path.write_text(pre_commit_script, encoding="utf-8")
    post_checkout_path.write_text(post_checkout_script, encoding="utf-8")

    # Set executable permissions on POSIX systems
    try:
        os.chmod(pre_commit_path, 0o755)
        os.chmod(post_checkout_path, 0o755)
    except Exception:
        pass

    return {
        "pre_commit_hook": pre_commit_path.as_posix(),
        "post_checkout_hook": post_checkout_path.as_posix(),
    }


def resolve_repo_path(repo_arg: str = "") -> Path:
    """Dynamically resolves the target repository directory."""
    if repo_arg:
        p = Path(repo_arg).resolve()
        if p.exists():
            return p

    env_dir = os.environ.get("WHYLINE_REPO_DIR")
    if env_dir:
        p = Path(env_dir).resolve()
        if p.exists():
            return p

    cwd = Path.cwd().resolve()
    for cur in [cwd, *cwd.parents]:
        if (cur / ".whyline").exists():
            return cur
        if (cur / "demo" / "HealthConnect" / ".whyline").exists():
            return (cur / "demo" / "HealthConnect").resolve()
        if (cur / "demo-repos" / "HealthConnect" / ".whyline").exists():
            return (cur / "demo-repos" / "HealthConnect").resolve()

    root_dir = Path(__file__).resolve().parent.parent.parent
    if (root_dir / "demo" / "HealthConnect" / ".whyline").exists():
        return root_dir / "demo" / "HealthConnect"
    if (root_dir / "demo-repos" / "HealthConnect" / ".whyline").exists():
        return root_dir / "demo-repos" / "HealthConnect"
    return root_dir / "demo-repos" / "HealthConnect"


def execute_check_staged(repo_dir: Path, fallback_file: str | None = None) -> tuple[int, dict]:
    """Inspects staged files via git diff --cached and blocks commit on active fence violations.

    Returns:
        (exit_code, result_dict)
    """
    store = WhyLineStore(repo_dir)
    mcp = WhyLineMcpEngine(store)
    fences = store.get_fences()

    # 1. Inspect actual staged files via git diff --cached --name-only --diff-filter=ACM
    staged_files: list[str] = []
    try:
        proc = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            cwd=repo_dir,
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            staged_files = [line.strip() for line in proc.stdout.strip().splitlines() if line.strip()]
    except Exception:
        pass

    # If git found no staged files, use explicit fallback_file argument if supplied
    if not staged_files and fallback_file:
        staged_files = [fallback_file]

    if not staged_files:
        print("\033[92m[WhyLine Guard] No staged files detected. Commit allowed.\033[0m")
        return 0, {"decision": "ALLOW_EDIT", "reason": "No staged files detected."}

    violations: list[tuple[dict, str, dict]] = []
    warnings: list[tuple[dict, str, dict]] = []

    for file_path in staged_files:
        norm_target = os.path.normpath(file_path).replace("\\", "/").strip("/") if file_path else ""
        if not norm_target or norm_target == ".":
            continue
        norm_target_lower = norm_target.lower()
        matched_fences = []
        for f in fences:
            f_norm = os.path.normpath(f["file_path"]).replace("\\", "/").strip("/").lower()
            if f_norm.endswith(norm_target_lower) or norm_target_lower.endswith(f_norm) or Path(norm_target_lower).name == Path(f_norm).name:
                matched_fences.append(f)
        if not matched_fences:
            continue

        # Get staged diff for the specific file
        staged_diff = ""
        try:
            diff_proc = subprocess.run(
                ["git", "diff", "--cached", "-U0", "--", file_path],
                cwd=repo_dir,
                capture_output=True,
                text=True,
                check=False,
            )
            if diff_proc.returncode == 0:
                staged_diff = diff_proc.stdout
        except Exception:
            pass

        for fence in matched_fences:
            status = fence.get("status")
            if status == "EXPIRED_SAFE_TO_REMOVE":
                continue

            token = fence.get("matched_token", "")
            # Check if token is removed/modified in the staged diff
            is_token_deleted = False
            if staged_diff:
                for line in staged_diff.splitlines():
                    if line.startswith("-") and not line.startswith("---"):
                        if token in line or any(part in line for part in token.split() if len(part) >= 4):
                            is_token_deleted = True
                            break
            else:
                # If checking without diff, check file contents directly
                target_disk_path = repo_dir / norm_target
                if target_disk_path.exists():
                    current_content = target_disk_path.read_text(encoding="utf-8")
                    if token not in current_content:
                        is_token_deleted = True

            # Evaluate fence decision
            chk = mcp.check_fences(norm_target, staged_diff)
            if status in ("VERIFIED_ACTIVE", "PENDING_CONFIRMATION") or chk["decision"] == "REJECT_EDIT":
                violations.append((fence, norm_target, chk))
            elif chk["decision"] == "WARN_AND_REQUIRE_CONFIRMATION":
                warnings.append((fence, norm_target, chk))

    if violations:
        for fence, norm_target, chk in violations:
            rule = fence.get("expiry_condition") or {}
            key_path = rule.get("key_path", "config")
            expected_val = rule.get("expected_value", "")
            cfg_file = rule.get("config_file", "config/application.yml")
            prov = fence.get("provenance") or {}
            pr_num = prov.get("pr_number", "PR")
            inc_id = prov.get("incident_id", "INC")

            # Colored terminal alert (ANSI red & yellow)
            print("\033[91m====================================================================\033[0m", file=sys.stderr)
            print(f"\033[91m[WhyLine Guard] HARD INTERCEPT on {norm_target}!\033[0m", file=sys.stderr)
            print(f"\033[91mFence {fence['id']} [{fence['status']}] forbids removing '{fence['matched_token']}'.\033[0m", file=sys.stderr)
            print(f"\033[93mReason: {pr_num} / {inc_id} - {fence.get('danger_condition', '')}\033[0m", file=sys.stderr)
            print(f"\033[96mTo proceed: upgrade {key_path} to {expected_val!r} in {cfg_file} first.\033[0m", file=sys.stderr)
            print("\033[91m====================================================================\033[0m", file=sys.stderr)

        return 1, {
            "decision": "REJECT_EDIT",
            "violations_count": len(violations),
            "violations": [v[2] for v in violations],
        }

    if warnings:
        for fence, norm_target, chk in warnings:
            print(f"\033[93m[WhyLine Guard] Cautionary Warning on {norm_target}: {chk['reason']}\033[0m")

    print("\033[92m[WhyLine Guard] Staged check passed: all Spoken Fences satisfied.\033[0m")
    return 0, {"decision": "ALLOW_EDIT", "reason": "All staged files compliant with Spoken Fences."}


def main() -> None:
    parser = argparse.ArgumentParser(description="WhyLine CLI & Hook Enforcer")
    parser.add_argument(
        "command",
        choices=["scan", "check-edit", "check-staged", "pause", "resume", "benchmark", "install-hooks"],
    )
    parser.add_argument("--file", default="", help="Explicit file to check (optional)")
    parser.add_argument("--branch", default="fix/payment-double-charge")
    parser.add_argument("--repo", default="")
    args = parser.parse_args()

    repo_dir = resolve_repo_path(args.repo)
    store = WhyLineStore(repo_dir)
    mcp = WhyLineMcpEngine(store)

    if args.command == "scan":
        fences = store.ensure_initialized(force_rescan=True)
        print(json.dumps({"scanned_fences": len(fences)}, indent=2))
    elif args.command == "check-staged":
        exit_code, res = execute_check_staged(repo_dir, fallback_file=args.file if args.file else None)
        print(json.dumps(res, indent=2))
        sys.exit(exit_code)
    elif args.command == "check-edit":
        target = args.file if args.file else "src/main/java/com/healthconnect/payments/GatewayRouter.java"
        res = mcp.check_fences(target)
        print(json.dumps(res, indent=2))
    elif args.command == "resume":
        res = mcp.log_or_resume_context(branch_name=args.branch, action="resume")
        print(json.dumps(res, indent=2))
    elif args.command == "pause":
        res = mcp.log_or_resume_context(
            branch_name=args.branch,
            action="pause",
            summary="CLI branch checkpoint",
            ruled_out_dead_ends=["Naive retry removal"],
            next_untested_action="Add idempotency key header",
        )
        print(json.dumps(res, indent=2))
    elif args.command == "benchmark":
        scorecard = store.run_benchmark_scorecard()
        print(json.dumps(scorecard, indent=2))
    elif args.command == "install-hooks":
        hooks = install_git_hooks(repo_dir)
        print(json.dumps(hooks, indent=2))


if __name__ == "__main__":
    main()
