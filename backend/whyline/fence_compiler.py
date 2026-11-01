"""Spoken Fence Compiler & Executable Invariant Test Generator (BE-204).

Delegates to and re-exports from backend.services.test_compiler for architecture compliance.
"""
from __future__ import annotations

from backend.services.test_compiler import (
    AstAnomaly,
    TestCompiler,
    _build_danger_and_constraint,
    _resolve_yaml_key,
    build_fence_record,
    evaluate_expiry,
    evaluate_expiry_conditions,
    generate_junit_and_pytest_artifacts,
    generate_junit_test,
    generate_pytest_test,
)

__all__ = [
    "AstAnomaly",
    "TestCompiler",
    "_build_danger_and_constraint",
    "_resolve_yaml_key",
    "build_fence_record",
    "evaluate_expiry",
    "evaluate_expiry_conditions",
    "generate_junit_and_pytest_artifacts",
    "generate_junit_test",
    "generate_pytest_test",
]
