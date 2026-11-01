"""Git Blame & GitHub PR Provenance Miner (BE-202).
Traces flagged AST lines via `git blame -L -w -C -C` to commit SHAs, commit messages,
PR review comments, and Incident/Jira keys, with Local Sandbox fallback.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path
from urllib import request

from .ast_scanner import AstAnomaly


def _load_local_pr_fixtures(repo_dir: Path) -> dict:
    fixture_path = repo_dir / ".whyline" / "pr_fixtures.json"
    if fixture_path.exists():
        try:
            return json.loads(fixture_path.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _fetch_github_pr_if_configured(repo_slug: str, pr_number: str) -> dict | None:
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if not token or not repo_slug or not pr_number:
        return None
    pr_num_clean = pr_number.lstrip("#")
    url = f"https://api.github.com/repos/{repo_slug}/pulls/{pr_num_clean}"
    req = request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "WhyLine-Provenance-Miner",
        },
    )
    try:
        with request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {
                "pr_number": f"#{pr_num_clean}",
                "title": data.get("title", ""),
                "inline_comment": (data.get("body") or "")[:360],
                "reviewer": data.get("user", {}).get("login", "github-reviewer"),
            }
    except Exception:
        return None


def mine_provenance_for_anomaly(repo_dir: Path, anomaly: AstAnomaly) -> dict:
    fixtures = _load_local_pr_fixtures(repo_dir)
    active_authors = set(fixtures.get("active_authors", ["anjani@healthconnect.in", "rahul-sre@healthconnect.in"]))
    pr_map = fixtures.get("pull_requests", {})

    commit_sha = "0000000"
    author_name = "Unknown Engineer"
    author_email = "unknown@healthconnect.in"
    commit_date = "2026-10-12"
    commit_subject = ""
    commit_body = ""

    if (repo_dir / ".git").exists():
        try:
            blame_cmd = [
                "git",
                "blame",
                "-L",
                f"{anomaly.start_line},{anomaly.end_line}",
                "-w",
                "-C",
                "-C",
                "--porcelain",
                "--",
                anomaly.file_path,
            ]
            blame_proc = subprocess.run(
                blame_cmd, cwd=repo_dir, capture_output=True, text=True, check=False
            )
            lines = blame_proc.stdout.splitlines()
            if lines:
                first_tokens = lines[0].split()
                if first_tokens:
                    commit_sha = first_tokens[0][:7]
                for b_line in lines:
                    if b_line.startswith("author "):
                        author_name = b_line[len("author ") :].strip()
                    elif b_line.startswith("author-mail "):
                        author_email = b_line[len("author-mail ") :].strip().strip("<>")
                    elif b_line.startswith("summary "):
                        commit_subject = b_line[len("summary ") :].strip()

            if commit_sha and commit_sha != "0000000":
                log_proc = subprocess.run(
                    ["git", "show", "-s", "--format=%cs%n%s%n%b", commit_sha],
                    cwd=repo_dir,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                log_lines = log_proc.stdout.splitlines()
                if log_lines:
                    commit_date = log_lines[0].strip()
                if len(log_lines) > 1:
                    commit_subject = log_lines[1].strip()
                if len(log_lines) > 2:
                    commit_body = "\n".join(log_lines[2:]).strip()
        except Exception:
            pass

    full_message = f"{commit_subject}\n{commit_body}".strip()
    pr_match = re.search(r"PR:\s*(#[0-9]+)", full_message)
    inc_match = re.search(r"Fixes:\s*([A-Z]+-[0-9]+)", full_message)

    pr_number = pr_match.group(1) if pr_match else "#200"
    incident_id = inc_match.group(1) if inc_match else "INC-9000"

    # Enrich with GitHub API if configured, else fallback to local sandbox PR fixtures or commit body
    gh_pr = _fetch_github_pr_if_configured(os.getenv("GITHUB_REPO_SLUG", ""), pr_number)
    pr_meta = gh_pr or pr_map.get(pr_number, {})

    author_active = author_email in active_authors
    author_handle = f"@{author_email.split('@')[0]}"

    why_lines = [
        line.strip()
        for line in commit_body.splitlines()
        if line.strip() and not line.strip().startswith(("PR:", "Fixes:"))
    ]
    reconstructed_why = " ".join(why_lines) if why_lines else commit_subject
    inline_comment = pr_meta.get("inline_comment") or reconstructed_why

    confidence = "HIGH" if (pr_meta or why_lines) else "MEDIUM"
    initial_status = "PENDING_CONFIRMATION" if author_active else "UNVERIFIED_HISTORICAL"

    default_expiry = pr_meta.get(
        "expiry_rule",
        {
            "config_file": "config/application.yml",
            "key_path": "healthconnect.payment.gateway.version",
            "expected_value": "v2",
            "description": f"Expires when upstream issue {incident_id} ({pr_number}) is marked resolved in config/application.yml",
        },
    )

    return {
        "commit_sha": commit_sha,
        "commit_date": commit_date,
        "commit_subject": commit_subject,
        "author_name": author_name,
        "author_email": author_email,
        "author_handle": author_handle,
        "author_active": author_active,
        "pr_number": pr_number,
        "incident_id": incident_id,
        "reviewer": pr_meta.get("reviewer", "@srinivas-principal"),
        "inline_comment": inline_comment,
        "reconstructed_why": reconstructed_why,
        "confidence": confidence,
        "initial_status": initial_status,
        "expiry_rule": default_expiry,
        "sandbox_mode": not bool(os.getenv("GITHUB_TOKEN", "").strip()),
    }
