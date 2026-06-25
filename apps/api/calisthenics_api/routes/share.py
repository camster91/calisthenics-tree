"""GET /api/v1/share/{unlock_id}.png — serve a pre-rendered share card PNG.

Per T39 design, PNGs are pre-rendered at deploy time (or via the
apps/web render-share script) and served as static files. This
endpoint does NOT render on demand — it serves a cached PNG with
the correct content-type. If the PNG is missing, returns 404 with
a hint to run the renderer.
"""
from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from calisthenics_api.config import get_settings

router = APIRouter(tags=["share"])


_UNLOCK_ID_PATTERN = re.compile(r"[a-z0-9-]{1,64}")


@router.get("/share/{unlock_id}.png")
async def get_share_card(unlock_id: str) -> FileResponse:
    """Serve the pre-rendered PNG for an unlock."""
    # unlock_id validation: allow [a-z0-9-] only, max 64 chars.
    # Defense against path traversal: the regex forbids `/`, `.`, and `\`.
    if not _UNLOCK_ID_PATTERN.fullmatch(unlock_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid unlock_id format",
        )

    settings = get_settings()
    share_dir = Path(settings.share_dir)
    png_path = share_dir / f"{unlock_id}.png"

    if not png_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Share card not found for unlock_id={unlock_id}. "
                f"Run: cd apps/web && npm run share:render -- --id {unlock_id}"
            ),
        )

    return FileResponse(
        path=png_path,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )
