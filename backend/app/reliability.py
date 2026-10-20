"""Reliability rating for a Census estimate, shown in the map popup and the TableViewer."""


# Rates value by its CV.
# Metrics without a margin of error are complete counts with no sampling error.
def reliability(absolute: float | None, moe: float | None, cv: float | None, has_moe: bool) -> dict[str, str]:
    if not has_moe:
        return {"label": "Complete count — no sampling error", "tier": "neutral"}
    if absolute == 0:
        return {"label": "Too small to assess", "tier": "neutral"}
    if moe is None or cv is None:
        return {"label": "Reliability unknown", "tier": "neutral"}
    if cv <= 15:
        return {"label": "Good — Relatively Reliable", "tier": "reliable"}
    if cv <= 30:
        return {"label": "Fair — Use with Caution", "tier": "usable"}
    if cv <= 50:
        return {"label": "High Uncertainty — Use with Substantial Caution", "tier": "caution"}
    if cv <= 61:
        return {"label": "Very High Uncertainty — Carefully Assess Usability", "tier": "severe"}
    return {"label": "Unreliable — Consider Excluding", "tier": "unreliable"}
