"""GET /api/v1/tendon-strain — per-pathway strain status + 4-week sparkline.

Loads the user's last 28 days of workouts, buckets strain per pathway
per week (4 buckets), then computes deload status (ok/watch/deload)
from the most-recent week vs the 4-week rolling average.

Auth required — strain is per-user.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.auth import get_current_user
from calisthenics_api.db import get_session
from calisthenics_api.db.models import (
    Exercise,
    ProgressionNode,
    SetLog,
    Workout,
)
from calisthenics_api.schemas import AuthContext
from calisthenics_api.tendon import DELOAD_RATIO

router = APIRouter(prefix="/tendon-strain", tags=["tendon-strain"])

PathwayStatus = Literal["ok", "watch", "deload"]


@router.get("", response_model=None)
async def get_tendon_strain(
    auth: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Return per-pathway status + 4-week sparkline for the authed user.

    Response shape mirrors the web's TendonPathwayStatus:
        { pathway, status, sparkline: [w-3, w-2, w-1, w0] }

    Empty history returns an empty list — the UI handles "no data yet".
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=28)

    # Pull every SetLog for this user in the last 28 days, joined with
    # the progression node + exercise so we know the pathway + intensity.
    stmt = (
        select(SetLog, ProgressionNode, Exercise, Workout)
        .join(Workout, Workout.id == SetLog.workout_id)
        .join(ProgressionNode, ProgressionNode.id == SetLog.node_id)
        .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
        .where(
            Workout.user_id == auth.user_id,
            Workout.completed_at >= window_start,
        )
    )
    rows = (await session.execute(stmt)).all()

    if not rows:
        return {"statuses": []}

    # Bucket per (pathway, week_index). 4 buckets: weeks [-3,-2], [-2,-1],
    # [-1,0], [0, now]. The "current" bucket is the latest 7 days.
    weekly_by_pathway: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0, 0.0, 0.0])

    for set_log, node, _exercise, workout in rows:
        duration_or_reps = set_log.hold_secs if set_log.hold_secs else (set_log.reps or 0)
        if duration_or_reps <= 0:
            continue
        score = float(node.intensity_factor) * duration_or_reps * node.rank_level
        # Map each pathway on the node to the same total (each set loads
        # all of the node's pathways; we don't have per-set pathway
        # selection yet).
        for pathway in node.joint_pathways:
            week_idx = _week_bucket(workout.completed_at, now)
            if 0 <= week_idx < 4:
                weekly_by_pathway[pathway][week_idx] += score

    # Decide per-pathway status from current vs 4-week avg.
    statuses: list[dict] = []
    for pathway, weeks in weekly_by_pathway.items():
        current = weeks[3]  # most recent week
        historical = weeks[:3]  # weeks 1, 2, 3 back
        avg = sum(historical) / len(historical) if any(historical) else 0.0

        if avg > 0 and current > DELOAD_RATIO * avg:
            status: PathwayStatus = "deload"
        elif current > avg * 1.15:
            # Above trend → watch
            status = "watch"
        else:
            status = "ok"

        statuses.append(
            {
                "pathway": pathway,
                "status": status,
                "sparkline": [round(w, 1) for w in weeks],
            }
        )

    # Sort by status severity (deload > watch > ok), then by current week score.
    severity = {"deload": 0, "watch": 1, "ok": 2}
    statuses.sort(key=lambda s: (severity[s["status"]], -s["sparkline"][3]))

    return {"statuses": statuses}


def _week_bucket(dt: datetime, now: datetime) -> int:
    """Return which of the 4 weekly buckets this datetime falls into.

    0 = oldest week (3-4 weeks ago), 3 = current week (last 7 days).
    Naive datetimes are assumed UTC.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    age_days = (now - dt).days
    if age_days < 0:
        # future-dated — treat as current
        return 3
    if age_days < 7:
        return 3
    if age_days < 14:
        return 2
    if age_days < 21:
        return 1
    return 0