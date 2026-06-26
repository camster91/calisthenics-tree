"""Magic-link email template.

Branded HTML + plain-text emails for /auth/magic-link. Single source
of truth — both the api (when sending via Postmark) and any future
template-preview tool read from here.

Design considerations (per email-client reality, not web):
  - Inline CSS only. Most clients strip <style> blocks.
  - Tables for layout (Outlook 2007+ ignores flex/grid).
  - Max width 600px. Single column. Readable on mobile.
  - Web fonts fallback to system stack — clients strip @font-face.
  - Solid background colors only (no transparency / rgba).
  - 16px base size. Line-height 1.5.
  - Big tappable CTA button (>44px tall — Apple HIG / WCAG 2.5.5).

Brand colors (from apps/web/src/tokens.ts):
  - background: #0B1220 (deep navy, matches site bg)
  - surface:    #111A2E (raised card)
  - text:       #F8FAFC (primary text)
  - text-muted: #94A3B8 (secondary text)
  - primary:    #FF8A1F (brand orange, AAA on bg)
  - primary-fg: #0B1220 (text on primary)
  - border:     #1F2A44 (subtle dividers)
"""

from __future__ import annotations

import html as html_lib
from urllib.parse import urlparse

# Brand tokens — duplicated here (rather than importing from
# apps/web/src/tokens.ts) because the api has no business importing
# from the web app's TS source. If tokens drift, the visual QA test
# in scripts/preflight catches it.
BRAND = {
    "background": "#0B1220",
    "surface":    "#111A2E",
    "text":       "#F8FAFC",
    "text_muted": "#94A3B8",
    "primary":    "#FF8A1F",
    "primary_fg": "#0B1220",
    "border":     "#1F2A44",
}

EXPIRY_MINUTES = 15

# Allowed URL schemes for the magic-link href. Anything else (data:,
# javascript:, file:, etc.) is rejected — the CTA button becomes a
# non-clickable visual only and the URL fallback shows the link as
# text. Belt-and-braces: html.escape already protects the href
# attribute from quote-breaking, but a `javascript:` URL would still
# be a stored-XSS vector if a permissive mail client followed the
# decoded scheme. Production links are always https (built by
# security.issue_magic_link_token from settings.web_base_url).
ALLOWED_URL_SCHEMES = frozenset({"http", "https"})


def _safe_href(link: str) -> str | None:
    """Return the link if its URL scheme is in ALLOWED_URL_SCHEMES;
    None otherwise. The CTA button omits the href when None is
    returned, falling back to a non-clickable visual."""
    try:
        parsed = urlparse(link)
    except ValueError:
        return None
    if parsed.scheme.lower() not in ALLOWED_URL_SCHEMES:
        return None
    return link


def render_magic_link_html(link: str, expiry_minutes: int = EXPIRY_MINUTES) -> str:
    """Branded HTML email body. The `link` is the magic-link URL the
    user clicks. `expiry_minutes` shows up as 'Link expires in N
    minutes' — match settings.magic_link_ttl_secs / 60."""
    # Local references so the f-strings stay readable.
    bg      = BRAND["background"]
    surface = BRAND["surface"]
    text    = BRAND["text"]
    muted   = BRAND["text_muted"]
    primary = BRAND["primary"]
    primary_fg = BRAND["primary_fg"]
    border  = BRAND["border"]

    # HTML-escape the link for use inside href="" attributes — & must
    # become &amp; for valid HTML, and quote=True also escapes " and '
    # so a malicious link can't break out of the attribute. The URL
    # fallback <p> below uses the raw form (text content is safe;
    # users see and copy the actual URL).
    href_safe = html_lib.escape(_safe_href(link) or "", quote=True)

    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <title>Sign in to Calisthenics Tree</title>
  </head>
  <body style="margin:0;padding:0;background-color:{bg};font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:{text};">
    <!-- Preheader (preview text shown in inbox before open) -->
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:{bg};">
      Click the button to sign in. Link expires in {expiry_minutes} minutes.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{bg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
            <!-- Brand header -->
            <tr>
              <td align="center" style="padding:24px 0 32px 0;">
                <span style="display:inline-block;width:32px;height:32px;background-color:{primary};border-radius:6px;vertical-align:middle;"></span>
                <span style="display:inline-block;margin-left:10px;font-size:18px;font-weight:600;color:{text};vertical-align:middle;">Calisthenics Tree</span>
              </td>
            </tr>

            <!-- Card body -->
            <tr>
              <td style="background-color:{surface};border:1px solid {border};border-radius:12px;padding:40px 32px;">
                <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:600;line-height:1.25;color:{text};">
                  Sign in to your account
                </h1>
                <p style="margin:0 0 28px 0;font-size:16px;line-height:1.5;color:{muted};">
                  Click the button below to sign in. The link expires in {expiry_minutes} minutes and can only be used once.
                </p>

                <!-- CTA button — table-based for Outlook -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding:8px 0 32px 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="background-color:{primary};border-radius:8px;">
                            <a href="{href_safe}" target="_blank" rel="noopener noreferrer"
                               style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:600;color:{primary_fg};text-decoration:none;line-height:1;">
                              Sign in to Calisthenics Tree
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- URL fallback for clients that strip buttons -->
                <p style="margin:0 0 8px 0;font-size:12px;color:{muted};">
                  Button not working? Paste this URL into your browser:
                </p>
                <p style="margin:0 0 24px 0;font-size:12px;line-height:1.5;word-break:break-all;background-color:{bg};padding:12px;border-radius:6px;color:{text};font-family:SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
                  {link}
                </p>

                <hr style="border:none;border-top:1px solid {border};margin:24px 0;">

                <p style="margin:0;font-size:13px;line-height:1.5;color:{muted};">
                  If you didn't request this email, you can safely ignore it. Your account is still secure.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding:24px 16px 0 16px;">
                <p style="margin:0;font-size:12px;color:{muted};">
                  calisthenicstree.app
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def render_magic_link_text(link: str, expiry_minutes: int = EXPIRY_MINUTES) -> str:
    """Plain-text companion. Most clients prefer this when HTML is
    unavailable; Postmark sends both as multipart/alternative.
    """
    return (
        f"Sign in to Calisthenics Tree\n"
        f"\n"
        f"Click the link below to sign in. The link expires in {expiry_minutes} minutes and can only be used once.\n"
        f"\n"
        f"{link}\n"
        f"\n"
        f"If you didn't request this, you can safely ignore this email.\n"
        f"\n"
        f"— Calisthenics Tree\n"
    )