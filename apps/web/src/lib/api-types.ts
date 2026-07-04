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
  dev_token?: string | null;
}

/** Mirrors apps/api/calisthenics_api/routes/search.py SearchResultItem. */
export type SearchKind = 'node' | 'exercise' | 'user';
export interface SearchResultItem {
  kind: SearchKind;
  id: string;
  name: string;
  breadcrumb: string;
  // Sprint 42 fix (UX #2): optional metadata for `/learn/<slug>`
  // linking. Populated only for kind="node" results by the api.
  tree_slug?: string;
  rank?: number;
}
/** Mirrors apps/api/calisthenics_api/routes/search.py SearchResponse. */
export interface SearchResponse {
  query: string;
  nodes: SearchResultItem[];
  exercises: SearchResultItem[];
  users: SearchResultItem[];
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

// -----------------------------------------------------------------------------//
// Onboarding placement (POST /api/v1/onboarding/place)
// -----------------------------------------------------------------------------//

export type OnboardingArchetype =
  | 'beginner'
  | 'novice_a'
  | 'novice_b'
  | 'intermediate';

export interface OnboardingPlacement {
  tree_id: string;
  tree_name: string;
  starting_node_id: string;
  starting_node_name: string;
  starting_rank: number;
}

export interface OnboardingPlaceResponse {
  archetype: OnboardingArchetype;
  rir2_offset: number;
  placements: OnboardingPlacement[];
}