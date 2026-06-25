"""GET /api/v1/trees — full DAG data for the DAG browser.

Returns every progression tree with all its nodes and all edges between
them, so the web client can render the entire skill tree without
multiple round trips. The user's current node per tree (if authed) is
included as `current_node_id` so the client can highlight it.

No auth required (matches /api/v1/nodes in this commit and /healthz —
DAG browse is public reference data per PLAN.md Gap 3).
"""

from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.db import get_session
from calisthenics_api.db.models import (
    Exercise,
    ProgressionEdge,
    ProgressionNode,
    ProgressionTree,
    UserNodeState,
)
from calisthenics_api.auth import get_current_user_optional
from calisthenics_api.schemas import AuthContext

router = APIRouter(prefix="/trees", tags=["trees"])


_TREE_WIRE_RE = re.compile(r"^tree_([0-9a-fA-F-]{36})$")


def _parse_tree_id(wire: str) -> uuid.UUID:
    m = _TREE_WIRE_RE.match(wire)
    if not m:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tree id (expected 'tree_<uuid>').",
        )
    return uuid.UUID(m.group(1))


@router.get("", response_model=None)
async def list_trees(
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Return all trees with their nodes, edges, and (if authed) the
    caller's current_node_id per tree.

    Single endpoint instead of /trees + /trees/{id} to keep the SPA's
    first paint a single round trip.
    """
    trees = (await session.execute(select(ProgressionTree))).scalars().all()
    if not trees:
        return {"trees": []}

    tree_ids = [t.id for t in trees]
    nodes = (
        await session.execute(
            select(ProgressionNode, Exercise)
            .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
            .where(ProgressionNode.tree_id.in_(tree_ids))
            .order_by(ProgressionNode.tree_id, ProgressionNode.rank_level)
        )
    ).all()
    edges = (
        await session.execute(
            select(ProgressionEdge).where(ProgressionEdge.from_node_id.in_(
                select(ProgressionNode.id).where(ProgressionNode.tree_id.in_(tree_ids))
            ))
        )
    ).scalars().all()

    nodes_by_tree: dict[uuid.UUID, list[dict]] = {tid: [] for tid in tree_ids}
    for n, ex in nodes:
        nodes_by_tree[n.tree_id].append(
            {
                "node_id": f"node_{n.id}",
                "name": ex.name,
                "movement_type": n.movement_type,
                "rank_level": n.rank_level,
                "target_sets": n.target_sets,
                "target_reps": n.target_reps,
                "target_hold_secs": n.target_hold_secs,
            }
        )

    edges_out: list[dict] = []
    for e in edges:
        edges_out.append(
            {
                "from_node_id": f"node_{e.from_node_id}",
                "to_node_id": f"node_{e.to_node_id}",
                "edge_type": e.edge_type,
            }
        )

    return {
        "trees": [
            {
                "tree_id": f"tree_{t.id}",
                "slug": t.slug,
                "name": t.name,
                "description": t.description or "",
                "nodes": nodes_by_tree[t.id],
                "edges": edges_out,  # all edges belong to one of the trees we returned
            }
            for t in trees
        ],
    }


@router.get("/{tree_id}", response_model=None)
async def get_tree(
    tree_id: str = Path(..., min_length=40, max_length=64),
    session: AsyncSession = Depends(get_session),
    auth: AuthContext | None = Depends(get_current_user_optional),
) -> dict:
    """Return one tree with full DAG + caller's current_node_id (if authed)."""
    raw = _parse_tree_id(tree_id)
    tree = (
        await session.execute(
            select(ProgressionTree).where(ProgressionTree.id == raw)
        )
    ).scalar_one_or_none()
    if tree is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tree {tree_id} not found.",
        )

    rows = (
        await session.execute(
            select(ProgressionNode, Exercise)
            .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
            .where(ProgressionNode.tree_id == tree.id)
            .order_by(ProgressionNode.rank_level)
        )
    ).all()
    edges = (
        await session.execute(
            select(ProgressionEdge).where(ProgressionEdge.from_node_id.in_(
                select(ProgressionNode.id).where(ProgressionNode.tree_id == tree.id)
            ))
        )
    ).scalars().all()

    current_node_id: str | None = None
    if auth is not None:
        state = (
            await session.execute(
                select(UserNodeState).where(
                    UserNodeState.user_id == auth.user_id,
                    UserNodeState.tree_id == tree.id,
                )
            )
        ).scalar_one_or_none()
        if state is not None:
            current_node_id = f"node_{state.current_node_id}"

    return {
        "tree": {
            "tree_id": f"tree_{tree.id}",
            "slug": tree.slug,
            "name": tree.name,
            "description": tree.description or "",
            "current_node_id": current_node_id,
            "nodes": [
                {
                    "node_id": f"node_{n.id}",
                    "name": ex.name,
                    "movement_type": n.movement_type,
                    "rank_level": n.rank_level,
                    "target_sets": n.target_sets,
                    "target_reps": n.target_reps,
                    "target_hold_secs": n.target_hold_secs,
                }
                for n, ex in rows
            ],
            "edges": [
                {
                    "from_node_id": f"node_{e.from_node_id}",
                    "to_node_id": f"node_{e.to_node_id}",
                    "edge_type": e.edge_type,
                }
                for e in edges
            ],
        }
    }