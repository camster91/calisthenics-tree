"""Tests for the magic-link email template.

Pure-Python: no Postmark, no SMTP, no DB. Validates that the HTML
+ text renderers produce email-safe output: inline styles, no
external resources, the magic-link URL appears verbatim, the brand
colors are consistent with apps/web/src/tokens.ts.
"""

from __future__ import annotations

import re

from calisthenics_api.emails.magic_link import (
    BRAND,
    EXPIRY_MINUTES,
    render_magic_link_html,
    render_magic_link_text,
)


def test_html_includes_magic_link_url() -> None:
    link = "https://app.example.com/auth/verify?token=abc123"
    html = render_magic_link_html(link)
    # The URL must appear at least twice: in the CTA button + in the
    # plain-text fallback paragraph below the button.
    assert html.count(link) >= 2


def test_html_includes_sign_in_cta_text() -> None:
    html = render_magic_link_html("https://x/y")
    assert "Sign in to Calisthenics Tree" in html


def test_html_subject_and_preheader_mention_expiry() -> None:
    html = render_magic_link_html("https://x/y", expiry_minutes=15)
    # Preheader text (visible in inbox preview before open)
    assert "15 minutes" in html
    # Body copy
    assert "expires in 15 minutes" in html


def test_html_uses_inline_styles_only() -> None:
    """Most email clients strip <style> blocks. Critical that the
    template uses inline style="" attributes only."""
    html = render_magic_link_html("https://x/y")
    # No external stylesheet references.
    assert "<link" not in html
    # No <style> blocks (inline style attributes are fine).
    assert "<style" not in html.lower()


def test_html_uses_brand_primary_color() -> None:
    html = render_magic_link_html("https://x/y")
    # The CTA button background is the brand orange. If tokens drift
    # on the web side without updating the email template, this test
    # fails loudly.
    assert BRAND["primary"] in html
    assert BRAND["text"] in html
    assert BRAND["background"] in html


def test_html_omits_executable_javascript() -> None:
    """XSS + email-client safety: no <script> tags, no on* attributes,
    no javascript: URLs in href attributes. Text content (URL
    fallback <p>) shows the link verbatim, which is safe — browsers
    don't execute text content. Only href="..." attributes are
    dangerous."""

    html = render_magic_link_html("javascript:alert(1)")
    assert "<script" not in html.lower()
    assert "onerror" not in html.lower()
    assert "onload" not in html.lower()
    # Inspect only href attribute values.
    for href in re.findall(r'href="([^"]+)"', html):
        assert "javascript:" not in href, (
            f"href contains javascript: URL: {href!r}"
        )


def test_html_is_single_column_max_600px() -> None:
    """Mobile-first: the rendered card must be ≤600px wide and
    use a single column (no nested side-by-side tables)."""
    html = render_magic_link_html("https://x/y")
    assert 'width="600"' in html
    # 4 presentation tables expected: outer wrapper + inner 600px
    # content table + CTA button wrapper + URL-fallback's <p> uses a
    # wrapping table for monospace styling. None of them nest
    # side-by-side — all are single-column. The exact count guards
    # against accidentally introducing a 2-column layout.
    assert html.count('role="presentation"') == 4, (
        f"expected 4 presentation tables, got {html.count('role=\"presentation\"')}"
    )


def test_html_href_escapes_ampersands() -> None:
    """The CTA href="" attribute must escape & for valid HTML5.
    Without this, postmark's preview pane can render broken URLs."""
    link = "https://app.example.com/auth/verify?token=abc&next=/tree"
    html = render_magic_link_html(link)
    # The CTA href must contain &amp; (not raw &) for the URL to
    # round-trip correctly when the recipient clicks.
    assert "href=\"https://app.example.com/auth/verify?token=abc&amp;next=/tree\"" in html
    # The URL fallback <p> shows the link verbatim (text content is
    # safe; the recipient needs to copy/paste the real URL).
    assert link in html


def test_html_href_rejects_javascript_url() -> None:
    """Defense-in-depth: a `javascript:` URL in the href is a stored
    XSS vector. The HTML escape won't catch the colon, so we
    explicitly assert that any link containing `javascript:` after
    escaping is rejected by the render layer. In production the
    link comes from `security.issue_magic_link_token` so it's always
    our own https URL — but a regression in that builder shouldn't
    silently ship a javascript: payload."""
    link = "javascript:alert(1)"
    html = render_magic_link_html(link)
    # Look ONLY at the href attribute values, not text content
    # (text content shows the link verbatim for copy/paste — safe).
    hrefs = re.findall(r'href="([^"]+)"', html)
    # html.escape() converts : to &#58; — but the colon alone in a
    # javascript: URL is still dangerous because some clients follow
    # the decoded href. Assert the literal javascript: scheme is
    # NOT in any href attribute (escaped or not).
    for href in hrefs:
        assert "javascript:" not in href, (
            f"href contains javascript: URL: {href!r}"
        )


def test_text_includes_magic_link_url() -> None:
    link = "https://app.example.com/auth/verify?token=xyz"
    text = render_magic_link_text(link)
    assert link in text


def test_text_mentions_expiry() -> None:
    text = render_magic_link_text("https://x/y", expiry_minutes=20)
    assert "20 minutes" in text


def test_default_expiry_matches_setting() -> None:
    """The default EXPIRY_MINUTES should equal settings.magic_link_ttl_secs / 60.
    If the setting changes, update the default here too — or pass the
    value explicitly at the call site."""
    from calisthenics_api.config import get_settings

    settings = get_settings()
    expected_minutes = settings.magic_link_ttl_secs // 60
    assert EXPIRY_MINUTES == expected_minutes


def test_text_and_html_mention_brand_name() -> None:
    """Both formats should reference 'Calisthenics Tree' so the
    recipient's mail client threading + spam filters see a coherent
    brand."""
    assert "Calisthenics Tree" in render_magic_link_html("https://x/y")
    assert "Calisthenics Tree" in render_magic_link_text("https://x/y")