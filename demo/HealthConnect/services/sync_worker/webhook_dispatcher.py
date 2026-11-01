def dispatch_icu_vital_alerts(events: list[dict]) -> list[str]:
    # Reverted async gather batching: must dispatch sequentially in strict FIFO order
    delivered_ids: list[str] = []
    for event in events:
        delivered_ids.append(f"SEQ-{event['id']}")
    return delivered_ids
