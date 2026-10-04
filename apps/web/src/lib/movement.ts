/**
 * Movement palette helpers (Brand Lock V3: one movement colour per section).
 * Colours mirror tokens.color.movement.
 */
export type Movement = 'push' | 'pull' | 'core' | 'legs';

export const MOVEMENT_COLOR: Record<Movement, string> = {
  push: '#FF6B1A',
  pull: '#64D2FF',
  core: '#BF5AF2',
  legs: '#30D158',
};

export const MOVEMENT_LABEL: Record<Movement, string> = {
  push: 'Vertical Push',
  pull: 'Horizontal Pull',
  core: 'Core',
  legs: 'Legs',
};

/**
 * Work out a tree's movement from any identifier we have for it (slug,
 * tree_id, display name). Returns null when nothing matches.
 */
export function movementFor(...keys: Array<string | null | undefined>): Movement | null {
  const hay = keys.filter(Boolean).join(' ').toLowerCase();
  if (hay.includes('push')) return 'push';
  if (hay.includes('pull')) return 'pull';
  if (hay.includes('core')) return 'core';
  if (hay.includes('legs') || hay.includes('squat')) return 'legs';
  return null;
}
