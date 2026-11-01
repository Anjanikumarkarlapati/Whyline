def persist_triage_draft(session_key: str, payload: dict, shadow_cache: dict) -> bool:
    try:
        if payload.get("simulate_readonly_replica"):
            raise RuntimeError("READONLY You can't write against a read only replica.")
        shadow_cache[session_key] = payload
        return True
    except Exception:
        pass
    shadow_cache[f"fallback:{session_key}"] = payload
    return True
