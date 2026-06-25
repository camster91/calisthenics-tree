/**
 * Type-only mirror of the FastAPI UserPublic schema.
 *
 * Kept separate from auth-store.ts so the store has no API-shape coupling —
 * we could swap the wire format later without touching the store.
 */

export interface UserPublic {
  id: string;
  email: string;
  created_at: string; // ISO 8601
}

export interface MagicLinkResponse {
  status: 'sent' | 'dev';
  expires_at: string;
  dev_token: string | null;
}

export interface VerifyResponse {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
  user: UserPublic;
}

export interface RefreshResponse {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
}