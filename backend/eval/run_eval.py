"""WhyLine Spoken Fences Quality Evaluation Runner (BE-205 / Milestone 3).

Evaluates precision, recall, and false-positive rate across labeled diff cases
(whitespace-only, comment-only, renamed variables, moved code, invariant deletions,
invariant modifications, and historical fences).
"""
from __future__ import annotations

import json
from pathlib import Path
import sys

# Ensure repository root is on sys.path
workspace_root = Path(__file__).resolve().parent.parent.parent
if str(workspace_root) not in sys.path:
    sys.path.insert(0, str(workspace_root))

from backend.whyline.mcp_server import WhyLineMcpEngine
from backend.whyline.store import WhyLineStore


def run_eval(repo_dir: Path | None = None) -> dict:
    eval_dir = Path(__file__).resolve().parent
    workspace_root = eval_dir.parent.parent
    target_repo = repo_dir or (workspace_root / "demo-repos" / "HealthConnect")
    cases_file = eval_dir / "cases.json"

    if not cases_file.exists():
        raise FileNotFoundError(f"Evaluation cases not found at {cases_file}")

    cases = json.loads(cases_file.read_text(encoding="utf-8"))
    store = WhyLineStore(target_repo)
    engine = WhyLineMcpEngine(store)

    tp = 0
    fp = 0
    tn = 0
    fn = 0
    results: list[dict] = []

    for c in cases:
        file_path = c["file_path"]
        diff = c.get("diff", "")
        expected_label = c["expected_label"]  # PASS or BLOCK
        expected_decision = c.get("expected_decision")

        chk = engine.check_fences(file_path, diff)
        actual_decision = chk["decision"]

        # Map actual decision to high-level label
        actual_label = "PASS" if actual_decision == "ALLOW_EDIT" else "BLOCK"

        is_match = (actual_label == expected_label)
        if expected_decision:
            is_match = is_match and (actual_decision == expected_decision)

        if expected_label == "BLOCK" and actual_label == "BLOCK":
            tp += 1
        elif expected_label == "PASS" and actual_label == "BLOCK":
            fp += 1
        elif expected_label == "PASS" and actual_label == "PASS":
            tn += 1
        elif expected_label == "BLOCK" and actual_label == "PASS":
            fn += 1

        results.append({
            "id": c["id"],
            "description": c["description"],
            "category": c.get("category", ""),
            "expected_decision": expected_decision or expected_label,
            "actual_decision": actual_decision,
            "expected_label": expected_label,
            "actual_label": actual_label,
            "fence_id": chk.get("fence_id"),
            "changed_lines": chk.get("changed_lines", []),
            "confidence": chk.get("confidence", 0.0),
            "passed": is_match,
        })

    total = len(cases)
    precision = (tp / (tp + fp)) if (tp + fp) > 0 else 1.0
    recall = (tp / (tp + fn)) if (tp + fn) > 0 else 1.0
    fpr = (fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    accuracy = ((tp + tn) / total) if total > 0 else 1.0

    summary = {
        "total_cases": total,
        "must_block_count": tp + fn,
        "must_pass_count": tn + fp,
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "precision": precision,
        "recall": recall,
        "false_positive_rate": fpr,
        "accuracy": accuracy,
        "results": results,
    }

    return summary


def generate_eval_markdown(summary: dict) -> str:
    lines = [
        "# WhyLine Spoken Fences — Guard Quality Evaluation (BE-205)",
        "",
        "## Summary Metrics",
        "",
        f"- **Total Labeled Cases**: {summary['total_cases']}",
        f"- **Must-Block Cases**: {summary['must_block_count']}",
        f"- **Must-Pass Cases**: {summary['must_pass_count']}",
        f"- **Precision**: **{summary['precision'] * 100:.1f}%** (Target: 100%)",
        f"- **Recall**: **{summary['recall'] * 100:.1f}%** (Target: 100%)",
        f"- **False-Positive Rate**: **{summary['false_positive_rate'] * 100:.1f}%** (Target: 0.0%)",
        f"- **Overall Accuracy**: **{summary['accuracy'] * 100:.1f}%**",
        "",
        "## Detailed Case Matrix",
        "",
        "| ID | Description | Category | Expected | Actual | Decision | Result |",
        "|:---|:---|:---|:---:|:---:|:---|:---:|",
    ]

    for r in summary["results"]:
        status_icon = "PASS" if r["passed"] else "FAIL"
        lines.append(
            f"| `{r['id']}` | {r['description']} | `{r['category']}` | `{r['expected_label']}` | `{r['actual_label']}` | `{r['actual_decision']}` | {status_icon} |"
        )

    lines.append("")
    lines.append("## Evaluation Methodology")
    lines.append("The evaluation covers both syntax-level and AST-level modifications across HealthConnect:")
    lines.append("- **Whitespace-Only**: Re-indentation and space cleanup inside fenced functions are allowed.")
    lines.append("- **Comment-Only**: Documentation and comment adjustments do not violate logic invariants.")
    lines.append("- **Renamed Variables**: Variable renames outside fenced logic or invariants pass without disruption.")
    lines.append("- **Moved Code**: Relocating functions while preserving guarded invariant tokens passes.")
    lines.append("- **Invariant Violations**: Naive deletions or reductions of guarded timeouts, retries, or sleeps are deterministically blocked.")
    lines.append("- **Historical Fences**: Departed-author workarounds trigger cautionary confirmation warnings.")
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    summary = run_eval()
    md = generate_eval_markdown(summary)
    eval_md_path = Path(__file__).resolve().parent.parent.parent / "EVAL.md"
    eval_md_path.write_text(md, encoding="utf-8")

    print(f"Evaluated {summary['total_cases']} cases:")
    print(f"  Precision: {summary['precision'] * 100:.1f}%")
    print(f"  Recall:    {summary['recall'] * 100:.1f}%")
    print(f"  FPR:       {summary['false_positive_rate'] * 100:.1f}%")
    print(f"  Accuracy:  {summary['accuracy'] * 100:.1f}%")
    print(f"Wrote report to {eval_md_path}")

    if summary["precision"] < 1.0 or summary["recall"] < 1.0 or summary["false_positive_rate"] > 0.0:
        print("EVALUATION FAILED TO REACH ZERO FALSE POSITIVE / ZERO FALSE NEGATIVE THRESHOLD")
        sys.exit(1)


if __name__ == "__main__":
    main()
