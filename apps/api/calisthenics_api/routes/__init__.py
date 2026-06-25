"""API route modules."""

from calisthenics_api.routes import (
    auth,
    health,
    nodes,
    onboarding,
    progressions,
    share,
    workouts,
)

__all__ = ["auth", "health", "nodes", "onboarding", "progressions", "share", "workouts"]
