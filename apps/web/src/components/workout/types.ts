/**
 * Workout-domain types (used by components in src/components/workout/).
 *
 * These mirror the FastAPI schemas in apps/api/ but are duplicated here
 * so the web app can be developed without round-tripping every render
 * to the backend.
 */
import type { NodeState, Pathway } from '../../lib/api';

export type { NodeState, Pathway };

export interface WorkoutNode {
  id: string;
  name: string;
  movementType: 'isotonic' | 'isometric';
  targetSets: number;
  targetReps: number | null;
  targetHoldSecs: number | null;
  intensityFactor: number;
  pathways: Pathway[];
  state: NodeState;
}

export interface TendonPathwayStatus {
  pathway: Pathway;
  status: 'ok' | 'watch' | 'deload';
  /** 4-week rolling values, oldest → newest, 0-100 stress index. */
  sparkline: [number, number, number, number];
}