"""Tests for the user data export endpoint.

Sprint 24 — synchronous JSON export (replaces the P5 arq stub).

The endpoint itself needs a live DB; we don't test that here (covered
by integration tests). This file tests the pure helpers — filename
generation today, JSON shape tomorrow.
"""

from __future__ import annotations

import re

from calisthenics_api.routes.users import _export_filename


def test_export_filename_uses_email_prefix() -> None:
    name = _export_filename("alice@example.com")
    assert name.startswith("calisthenics-tree-export-alice-")


def test_export_filename_has_iso_date_suffix() -> None:
    name = _export_filename("alice@example.com")
    # Format: calisthenics-tree-export-alice-YYYY-MM-DD.json
    assert re.search(r"-\d{4}-\d{2}-\d{2}\.json$", name)


def test_export_filename_sanitizes_slashes() -> None:
    """The email prefix is the filename part — must not contain /."""
    name = _export_filename("evil/path@x.com")
    assert "/" not in name
    assert "evil-path" in name


def test_export_filename_handles_missing_local_part() -> None:
    """Email starts with @ — falls back to 'user'."""
    name = _export_filename("@example.com")
    assert "user" in name
    assert "/" not in name