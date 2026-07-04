"""GET /api/v1/seo/sitemap.xml — programmatic SEO sitemap.

Lists every skill-node landing page + the public marketing/legal pages
so Google (and Bing, etc.) can discover them.

Per PLAN.md Phase 3: ~30 pages, one per node. Slugs are deterministic
from the data — see apps/web/src/pages/NodeLandingPage.tsx for the
slug function. Both producer and consumer share the convention:
  {tree_slug}-r{rank}-{name-slug}
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from calisthenics_api.config import get_settings
from calisthenics_api.db import get_session
from calisthenics_api.db.models import Exercise, ProgressionNode, ProgressionTree

router = APIRouter(tags=["seo"])

# Cap at the seed-data maximum plus a generous headroom. Today: 40
# nodes across 4 trees. A bound at 500 protects against a buggy
# bulk-import leaving the sitemap slow while not restricting real
# growth (a future "skill: parkour" tree might add dozens of nodes).
# Module-scope so it doesn't re-bind on every request.
_SITEMAP_NODE_LIMIT = 500


def _slugify(s: str) -> str:
    """Match the web client. Keep in sync with apps/web/src/pages/NodeLandingPage.tsx."""
    out = []
    for ch in s.lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in (" ", "-", "_"):
            out.append("-")
    return "".join(out).strip("-")


def _node_slug(tree_slug: str, rank: int, name: str) -> str:
    return f"{tree_slug}-r{rank}-{_slugify(name)}"


@router.get("/sitemap.xml", response_class=Response)
async def sitemap(
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Return a sitemap XML body. Public — no auth.

    STATIC_PAGES include the marketing/legal/auth surface.
    The 30 skill-node pages are generated from the seed data.
    """
    settings = get_settings()
    base = settings.web_base_url.rstrip("/")
    # Sprint 41 audit fix: previously hardcoded to "2026-06-25" so
    # every <lastmod> in the response was that date forever — Google
    # stops re-crawling when lastmod looks stale. Now derived from
    # build/request time (UTC).
    today = datetime.now(timezone.utc).date().isoformat()

    static_pages = [
        ("/", "daily", "1.0"),
        ("/welcome", "weekly", "0.9"),
        ("/login", "monthly", "0.4"),
        ("/privacy", "yearly", "0.3"),
        ("/terms", "yearly", "0.3"),
    ]

    rows = (
        await session.execute(
            select(ProgressionNode, ProgressionTree, Exercise)
            .join(ProgressionTree, ProgressionTree.id == ProgressionNode.tree_id)
            .join(Exercise, Exercise.id == ProgressionNode.exercise_id)
            .order_by(ProgressionTree.slug, ProgressionNode.rank_level)
            .limit(_SITEMAP_NODE_LIMIT)
        )
    ).all()

    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for path, changefreq, priority in static_pages:
        parts.append("  <url>")
        parts.append(f"    <loc>{base}{path}</loc>")
        parts.append(f"    <lastmod>{today}</lastmod>")
        parts.append(f"    <changefreq>{changefreq}</changefreq>")
        parts.append(f"    <priority>{priority}</priority>")
        parts.append("  </url>")

    for node, tree, exercise in rows:
        slug = _node_slug(tree.slug, node.rank_level, exercise.name)
        parts.append("  <url>")
        parts.append(f"    <loc>{base}/learn/{slug}</loc>")
        parts.append(f"    <lastmod>{today}</lastmod>")
        parts.append("    <changefreq>monthly</changefreq>")
        parts.append("    <priority>0.7</priority>")
        parts.append("  </url>")

    parts.append("</urlset>")
    parts.append("")
    # XML content-type so crawlers parse it as sitemap (Chrome will
    # happily render a "text/plain" sitemap as a wall of XML — the spec
    # wants application/xml). Google's sitemap ping endpoint also
    # inspects content-type, so a wrong MIME costs you indexing speed.
    return Response(
        content="\n".join(parts),
        media_type="application/xml; charset=utf-8",
    )


@router.get("/robots.txt", response_class=PlainTextResponse)
async def robots(
) -> str:
    settings = get_settings()
    base = settings.web_base_url.rstrip("/")
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /login\n"
        "Disallow: /auth/\n"
        "Disallow: /onboarding/\n"
        "Disallow: /workout/\n"
        "Disallow: /tree/\n"
        "Disallow: /insights/\n"
        "Disallow: /settings\n"
        "\n"
        f"Sitemap: {base}/sitemap.xml\n"
    )