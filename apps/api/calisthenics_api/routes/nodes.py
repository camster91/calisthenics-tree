"""GET /api/v1/nodes/{node_id} — node display info (for workout log screen).

Returns the public-facing node details that the web needs to render
the workout-log screen: exercise name, target sets/reps/hold, movement
type. Path takes the wire-format id (`node_<uuid>`) and looks up the
underlying UUID.
"""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.db import get_session
from calisthenics_api.db.models import Exercise, ProgressionNode

router = APIRouter(prefix="/nodes", tags=["nodes"])


_NODE_WIRE_RE = re.compile(r"^node_([0-9a-fA-F-]{36})$")


def _parse_node_id(wire: str) -> uuid.UUID:
    """Accept 'node_<uuid>' and return the UUID. 400 on anything else."""
    m = _NODE_WIRE_RE.match(wire)
    if not m:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid node id (expected 'node_<uuid>').",
        )
    return uuid.UUID(m.group(1))


@router.get("/{node_id}", response_model=None)
async def get_node(
    node_id: str = Path(..., min_length=40, max_length=64),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Return display fields for a single node.

    No auth required for read (matches /api/v1/progression_trees etc. in
    PLAN.md Gap 3 — public reference data). Adding auth would block the
    DAG browser from showing node names to logged-out users.

    Note: the returned shape mirrors CurrentNode in schemas.py but is
    returned directly here (instead of through the Pydantic model) so we
    can keep the router lightweight without a new schema class. If the
    shape grows, lift this into a `NodePublic` schema.
    """
    raw = _parse_node_id(node_id)
    stmt = (
        select(ProgressionNode, Exercise)
        .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
        .where(ProgressionNode.id == raw)
    )
    row = (await session.execute(stmt)).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node {node_id} not found.",
        )
    node, exercise = row
    return {
        "node_id": f"node_{node.id}",
        "exercise_name": exercise.name,
        "movement_type": exercise.movement_type,
        "target_sets": node.target_sets,
        "target_reps": node.target_reps,
        "target_hold_secs": node.target_hold_secs,
    }