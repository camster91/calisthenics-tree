"""GET /api/v1/search — full-text-ish search across nodes, exercises, users.

Returns mixed-type results so the frontend can render a single results
page. Server-side, bounded, public for nodes/exercises (the content
is already on the SEO landing pages), authed for users (only if the
caller has a valid session — otherwise users are excluded from results).

Design:
- q: trimmed, 1-64 chars, lowercased server-side for case-insensitive
- limit: per-result-type cap, default 5, max 20
- Each result has: kind ("node" | "exercise" | "user"), id, name,
  plus a kind-specific breadcrumb (tree name, or "user" badge).
- ILIKE on name/email fields. Postgres trigram (`pg_trgm`) GIN index
  isn't loaded; for the seed data size (30 nodes, 30 exercises, ~10
  users in QA) a sequential scan + ILIKE is well under 10ms. Add the
  extension + index when this grows past 10k rows per table.

Public for nodes + exercises (no auth check); the response shape for
users is gated on a valid auth cookie — see the `_user_results` helper
which is only called when `get_current_user` returns a user. Anonymous
callers still get a valid response (just no user matches).
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.auth import get_current_user_optional
from calisthenics_api.db import get_session
from calisthenics_api.db.models import (
    Exercise,
    ProgressionNode,
    ProgressionTree,
    User,
)
from calisthenics_api.schemas import AuthContext

router = APIRouter(prefix="/search", tags=["search"])


# Hard caps. Keeps the response payload bounded for the UI's
# "type-ahead" suggestion list. Matches the bound pattern used
# elsewhere in the api (history/friends = 200, unlocks = 100).
_SEARCH_LIMIT_DEFAULT = 5
_SEARCH_LIMIT_MAX = 20


class SearchResultItem(BaseModel):
    """One match. The frontend groups by `kind` for the result list UI."""

    kind: Literal["node", "exercise", "user"]
    id: str
    name: str
    breadcrumb: str  # tree name, exercise category, or '@username'


class SearchResponse(BaseModel):
    query: str
    nodes: list[SearchResultItem]
    exercises: list[SearchResultItem]
    users: list[SearchResultItem]


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(min_length=1, max_length=64, description="Search query"),
    limit: int = Query(
        default=_SEARCH_LIMIT_DEFAULT,
        ge=1,
        le=_SEARCH_LIMIT_MAX,
        description="Max results per kind.",
    ),
    auth: AuthContext | None = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_session),
) -> SearchResponse:
    """Search nodes + exercises (public) + users (authed).

    Empty / whitespace-only queries are blocked at the Query layer
    (`min_length=1`); the schema validates length too. The result
    lists are independent — a query for "push" might return nodes
    but no users, and that's a valid 200 response with empty users[].
    """
    # Defensive trim even though Query enforces non-empty: a single
    # space (" ") is 1 char and would otherwise match every row.
    needle = q.strip().lower()
    if not needle:
        return SearchResponse(query=q, nodes=[], exercises=[], users=[])

    pattern = f"%{needle}%"

    # Nodes — join Exercise (for the node's display name) and Tree
    # (for the breadcrumb). ProgressionNode itself has no `name`
    # column — that lives on Exercise. Order by rank_level so the
    # earliest-rank hit shows first.
    node_rows = (
        await session.execute(
            select(ProgressionNode, Exercise, ProgressionTree)
            .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
            .join(ProgressionTree, ProgressionTree.id == ProgressionNode.tree_id)
            .where(Exercise.name.ilike(pattern))
            .order_by(ProgressionTree.slug, ProgressionNode.rank_level)
            .limit(limit)
        )
    ).all()

    # Exercises — name match.
    exercise_rows = (
        await session.execute(
            select(Exercise)
            .where(Exercise.name.ilike(pattern))
            .order_by(Exercise.name)
            .limit(limit)
        )
    ).scalars().all()

    # Users — only when authed. PII hygiene: NEVER echo the raw email.
    # We display display_name OR a SHA-256-truncated placeholder so
    # the UI can show "user_abc123" without exposing the real
    # identifier. The frontend's follow-toggle uses the id, not the
    # displayed string, so this is safe to ship.
    import hashlib

    user_results: list[SearchResultItem] = []
    if auth is not None:
        user_rows = (
            await session.execute(
                select(User)
                .where(
                    User.display_name.ilike(pattern),
                    User.deleted_at.is_(None),
                )
                .order_by(User.display_name)
                .limit(limit)
            )
        ).scalars().all()
        for u in user_rows:
            short_hash = hashlib.sha256(u.id.bytes).hexdigest()[:8]
            user_results.append(
                SearchResultItem(
                    kind="user",
                    id=f"usr_{u.id}",
                    name=u.display_name or "—",
                    breadcrumb=f"user_{short_hash}",
                )
            )

    return SearchResponse(
        query=q,
        nodes=[
            SearchResultItem(
                kind="node",
                id=f"node_{n.node_id}",
                name=exercise.name,
                breadcrumb=f"{tree.name} · rank {n.rank_level}",
            )
            for n, exercise, tree in node_rows
        ],
        exercises=[
            SearchResultItem(
                kind="exercise",
                id=f"ex_{e.id}",
                name=e.name,
                breadcrumb=e.movement_type,
            )
            for e in exercise_rows
        ],
        users=user_results,
    )