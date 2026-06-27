/**
 * local-mode.ts — localStorage-backed mock layer for the "no account" path.
 *
 * When the user clicks "Continue without account" on /login, we set a fake
 * auth snapshot (accessToken === 'local-dev-mode'). The `api()` function in
 * api.ts checks this token and routes calls here instead of fetching.
 *
 * This is a DEV-only escape hatch for when Postmark (or any email provider)
 * isn't wired up. Data persists in localStorage under `ct:local-data`, so
 * it survives page reloads but is wiped by `clear ct:auth` / browser data
 * wipe. No cross-device sync. No server-side persistence.
 *
 * To turn it back off, set accessToken to anything else in the auth snapshot
 * and reload.
 */

const LOCAL_TOKEN = 'local-dev-mode';
const STORAGE_KEY = 'ct:local-data';

// ----------------------------- types -----------------------------

export interface LocalExercise {
  id: string;
  name: string;
  movement_type: 'isotonic' | 'isometric';
  target_sets: number;
  target_reps: number | null;
  target_hold_secs: number | null;
}

export interface LocalTree {
  id: string;
  slug: string;
  name: string;
  description: string;
  nodes: LocalExercise[]; // 10 entries, ranked 1..10
}

export interface LocalPlacement {
  tree_id: string;
  tree_name: string;
  starting_node_id: string;
  starting_node_name: string;
  starting_rank: number;
}

export interface LocalSyncedSet {
  set_index: number;
  reps: number | null;
  hold_secs: number | null;
  completed: boolean;
}

export interface LocalSyncedLog {
  node_id: string;
  tree_id: string;
  sets: LocalSyncedSet[];
  notes: string | null;
  logged_at: string; // ISO
  rir: number | null;
}

export interface LocalData {
  user_id: string;
  email: string;
  display_name: string;
  archetype: string;
  placements: LocalPlacement[];
  workouts: LocalSyncedLog[];
  // cumulative workout count per node — used to compute "is this your Nth time?"
  workout_counts: Record<string, number>;
}

// ----------------------------- seed -----------------------------

const TREE_PUSH_NODES: LocalExercise[] = [
  { id: 'push-1', name: 'Wall Push-Up', movement_type: 'isotonic', target_sets: 3, target_reps: 8, target_hold_secs: null },
  { id: 'push-2', name: 'Incline Push-Up', movement_type: 'isotonic', target_sets: 3, target_reps: 8, target_hold_secs: null },
  { id: 'push-3', name: 'Standard Push-Up', movement_type: 'isotonic', target_sets: 3, target_reps: 8, target_hold_secs: null },
  { id: 'push-4', name: 'Diamond Push-Up', movement_type: 'isotonic', target_sets: 3, target_reps: 6, target_hold_secs: null },
  { id: 'push-5', name: 'Pike Push-Up', movement_type: 'isotonic', target_sets: 3, target_reps: 6, target_hold_secs: null },
  { id: 'push-6', name: 'Wall Handstand Hold', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 20 },
  { id: 'push-7', name: 'Wall Handstand Push-Up', movement_type: 'isotonic', target_sets: 3, target_reps: 5, target_hold_secs: null },
  { id: 'push-8', name: 'Freestanding Handstand Hold', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 20 },
  { id: 'push-9', name: 'Freestanding Handstand Push-Up', movement_type: 'isotonic', target_sets: 3, target_reps: 3, target_hold_secs: null },
  { id: 'push-10', name: 'Planche Push-Up (Rings)', movement_type: 'isotonic', target_sets: 3, target_reps: 3, target_hold_secs: null },
];

const TREE_PULL_NODES: LocalExercise[] = [
  { id: 'pull-1', name: 'Dead Hang', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 20 },
  { id: 'pull-2', name: 'Active Hang', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 15 },
  { id: 'pull-3', name: 'Scapular Pulls', movement_type: 'isotonic', target_sets: 3, target_reps: 8, target_hold_secs: null },
  { id: 'pull-4', name: 'Negative Pull-Up', movement_type: 'isotonic', target_sets: 3, target_reps: 3, target_hold_secs: null },
  { id: 'pull-5', name: 'Pull-Up', movement_type: 'isotonic', target_sets: 3, target_reps: 5, target_hold_secs: null },
  { id: 'pull-6', name: 'Tuck Front Lever Hold', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 12 },
  { id: 'pull-7', name: 'Advanced Tuck Front Lever Hold', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 12 },
  { id: 'pull-8', name: 'Straddle Front Lever Hold', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 10 },
  { id: 'pull-9', name: 'Full Front Lever Hold', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 8 },
  { id: 'pull-10', name: 'Front Lever Pull', movement_type: 'isotonic', target_sets: 3, target_reps: 3, target_hold_secs: null },
];

const TREE_CORE_NODES: LocalExercise[] = [
  { id: 'core-1', name: 'Plank', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 30 },
  { id: 'core-2', name: 'Side Plank', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 20 },
  { id: 'core-3', name: 'Hollow Body Hold', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 20 },
  { id: 'core-4', name: 'L-Sit on Floor', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 15 },
  { id: 'core-5', name: 'L-Sit on Bars', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 10 },
  { id: 'core-6', name: 'Hanging Leg Raise', movement_type: 'isotonic', target_sets: 3, target_reps: 8, target_hold_secs: null },
  { id: 'core-7', name: 'Toes-to-Bar', movement_type: 'isotonic', target_sets: 3, target_reps: 5, target_hold_secs: null },
  { id: 'core-8', name: 'Dragon Flag (Tucked)', movement_type: 'isotonic', target_sets: 3, target_reps: 5, target_hold_secs: null },
  { id: 'core-9', name: 'Dragon Flag', movement_type: 'isotonic', target_sets: 3, target_reps: 3, target_hold_secs: null },
  { id: 'core-10', name: 'Maltese (Rings)', movement_type: 'isometric', target_sets: 3, target_reps: null, target_hold_secs: 8 },
];

const TREES: LocalTree[] = [
  {
    id: 'tree-push',
    slug: 'push_handstand_pushup_path',
    name: 'Vertical Push (Handstand Push-Up Path)',
    description: 'From wall push-up to planche push-up. Builds toward a freestanding handstand push-up.',
    nodes: TREE_PUSH_NODES,
  },
  {
    id: 'tree-pull',
    slug: 'pull_front_lever_path',
    name: 'Horizontal Pull (Front Lever Path)',
    description: 'From dead hang to front lever pull. Builds toward a full front lever.',
    nodes: TREE_PULL_NODES,
  },
  {
    id: 'tree-core',
    slug: 'core_dragon_flag_path',
    name: 'Core (Dragon Flag Path)',
    description: 'From plank to maltese. Builds toward a dragon flag.',
    nodes: TREE_CORE_NODES,
  },
];

// ----------------------------- helpers -----------------------------

export function isLocalMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem('ct:auth');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.accessToken === LOCAL_TOKEN;
  } catch {
    return false;
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function read(): LocalData {
  if (typeof window === 'undefined') return emptyData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as LocalData;
    // Migrate older shapes — default any missing fields
    return {
      user_id: parsed.user_id ?? uuid(),
      email: parsed.email ?? 'local@device',
      display_name: parsed.display_name ?? '',
      archetype: parsed.archetype ?? 'novice_b',
      placements: parsed.placements ?? [],
      workouts: parsed.workouts ?? [],
      workout_counts: parsed.workout_counts ?? {},
    };
  } catch {
    return emptyData();
  }
}

function write(data: LocalData): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function emptyData(): LocalData {
  return {
    user_id: uuid(),
    email: 'local@device',
    display_name: '',
    archetype: 'novice_b',
    placements: [],
    workouts: [],
    workout_counts: {},
  };
}

// ----------------------------- public API -----------------------------

/** Initialize local mode — call this from LoginPage's "skip" button. */
export function initLocalMode(): { user_id: string; email: string } {
  const data = read();
  write(data);
  return { user_id: data.user_id, email: data.email };
}

/** Wipe all local data — call this on sign out. */
export function resetLocalMode(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** The fake auth snapshot for local mode. */
export function buildLocalAuthSnapshot(): {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  user: { id: string; email: string; display_name: string | null };
} {
  const data = read();
  return {
    accessToken: LOCAL_TOKEN,
    refreshToken: LOCAL_TOKEN,
    accessExpiresAt: '2099-01-01T00:00:00Z',
    user: {
      id: data.user_id,
      email: data.email,
      display_name: data.display_name || null,
    },
  };
}

// ----------------------------- placements -----------------------------

export function setLocalPlacements(
  archetype: string,
  placements: LocalPlacement[],
): void {
  const data = read();
  data.archetype = archetype;
  data.placements = placements;
  write(data);
}

export function getLocalPlacements(): { archetype: string; placements: LocalPlacement[] } {
  const data = read();
  return { archetype: data.archetype, placements: data.placements };
}

/** Look up the current node for each tree the user is placed on. */
export function getLocalProgressions(): {
  user_id: string;
  updated_at: string;
  active_progressions: {
    tree_id: string;
    tree_name: string;
    current_node: {
      node_id: string;
      exercise_name: string;
      movement_type: 'isotonic' | 'isometric';
      target_sets: number;
      target_reps: number | null;
      target_hold_secs: number | null;
    };
  }[];
} {
  const data = read();
  const progressions = data.placements.map((p) => {
    const tree = TREES.find((t) => t.id === p.tree_id);
    const node = tree?.nodes[p.starting_rank - 1];
    return {
      tree_id: p.tree_id,
      tree_name: p.tree_name,
      current_node: node
        ? {
            node_id: `node_${node.id}`,
            exercise_name: node.name,
            movement_type: node.movement_type,
            target_sets: node.target_sets,
            target_reps: node.target_reps,
            target_hold_secs: node.target_hold_secs,
          }
        : {
            node_id: `node_${p.starting_node_id}`,
            exercise_name: p.starting_node_name,
            movement_type: 'isotonic' as const,
            target_sets: 3,
            target_reps: 8,
            target_hold_secs: null,
          },
    };
  });
  return {
    user_id: data.user_id,
    updated_at: new Date().toISOString(),
    active_progressions: progressions,
  };
}

// ----------------------------- node lookup -----------------------------

/** Fetch a single node by the wire-format id `node_<local_id>`. */
export function getLocalNode(wireId: string): {
  node_id: string;
  exercise_name: string;
  movement_type: 'isotonic' | 'isometric';
  target_sets: number;
  target_reps: number | null;
  target_hold_secs: number | null;
} | null {
  const localId = wireId.replace(/^node_/, '');
  for (const tree of TREES) {
    const node = tree.nodes.find((n) => n.id === localId);
    if (node) {
      return {
        node_id: `node_${node.id}`,
        exercise_name: node.name,
        movement_type: node.movement_type,
        target_sets: node.target_sets,
        target_reps: node.target_reps,
        target_hold_secs: node.target_hold_secs,
      };
    }
  }
  return null;
}

// ----------------------------- tree DAG -----------------------------

export function getLocalTree(treeId: string): {
  tree_id: string;
  slug: string;
  name: string;
  description: string;
  nodes: { node_id: string; rank_level: number; exercise_name: string; movement_type: string }[];
  edges: { from_node_id: string; to_node_id: string; edge_type: 'progression' | 'regression' | 'lateral' }[];
} | null {
  const tree = TREES.find((t) => t.id === treeId || t.slug === treeId);
  if (!tree) return null;
  const data = read();
  const placement = data.placements.find((p) => p.tree_id === tree.id);
  const currentRank = placement?.starting_rank ?? 1;
  const nodes = tree.nodes.map((n, i) => ({
    node_id: `node_${n.id}`,
    rank_level: i + 1,
    exercise_name: n.name,
    movement_type: n.movement_type,
    current: i + 1 === currentRank,
    unlocked: i + 1 <= currentRank,
  }));
  const edges: { from_node_id: string; to_node_id: string; edge_type: 'progression' | 'regression' | 'lateral' }[] = [];
  for (let i = 0; i < tree.nodes.length - 1; i++) {
    edges.push({
      from_node_id: `node_${tree.nodes[i].id}`,
      to_node_id: `node_${tree.nodes[i + 1].id}`,
      edge_type: 'progression',
    });
  }
  return {
    tree_id: tree.id,
    slug: tree.slug,
    name: tree.name,
    description: tree.description,
    nodes,
    edges,
  };
}

// ----------------------------- workouts -----------------------------

export function logLocalWorkout(log: LocalSyncedLog): {
  accepted: number;
  applied_states: {
    node_id: string;
    tree_id: string;
    current_node_id: string;
    unlocked: boolean;
    promotion: boolean;
  }[];
} {
  const data = read();
  data.workouts.push(log);
  // Bump workout count + check if this counts as a "promotion"
  const completedSets = log.sets.filter((s) => s.completed).length;
  const targetSets = 3; // default target
  const promoted = completedSets >= targetSets;
  data.workout_counts[log.node_id] = (data.workout_counts[log.node_id] ?? 0) + 1;
  // If this is the 2nd consecutive workout on this node and all sets complete,
  // promote to next rank.
  if (promoted && data.workout_counts[log.node_id] >= 2) {
    const placement = data.placements.find((p) => p.starting_node_id === log.node_id);
    if (placement && placement.starting_rank < 10) {
      placement.starting_rank += 1;
      const tree = TREES.find((t) => t.id === placement.tree_id);
      const newNode = tree?.nodes[placement.starting_rank - 1];
      if (newNode) {
        placement.starting_node_id = newNode.id;
        placement.starting_node_name = newNode.name;
      }
      data.workout_counts[log.node_id] = 0; // reset count on promotion
    }
  }
  write(data);
  return {
    accepted: 1,
    applied_states: [
      {
        node_id: log.node_id,
        tree_id: log.tree_id,
        current_node_id: log.node_id,
        unlocked: true,
        promotion: promoted,
      },
    ],
  };
}

export function getLocalWorkouts(): LocalSyncedLog[] {
  // Sort newest first by logged_at
  return [...read().workouts].sort((a, b) => (a.logged_at < b.logged_at ? 1 : -1));
}

/**
 * Aggregate view of recent workouts for the /history page. Returns one row
 * per workout with the exercise name resolved from the local tree, plus
 * a per-tree streak count.
 */
export function getLocalHistory(): {
  recent: {
    id: string; // synthesized from node_id + logged_at
    logged_at: string;
    exercise_name: string;
    tree_id: string;
    tree_name: string;
    node_id: string;
    sets_completed: number;
    sets_target: number;
    is_promotion: boolean;
  }[];
  total_workouts: number;
  streak_days: number;
} {
  const data = read();
  const workouts = [...data.workouts].sort((a, b) => (a.logged_at < b.logged_at ? 1 : -1));
  const recent = workouts.map((w) => {
    const tree = TREES.find((t) => t.id === w.tree_id);
    const node = tree?.nodes.find((n) => n.id === w.node_id);
    // Frontend sends only the completed sets — length is the completed count.
    const setsCompleted = w.sets.length;
    const targetSets = node?.target_sets ?? 3;
    const isPromotion = setsCompleted >= targetSets && (data.workout_counts[w.node_id] ?? 0) === 0;
    return {
      id: `${w.node_id}-${w.logged_at}`,
      logged_at: w.logged_at,
      exercise_name: node?.name ?? w.node_id,
      tree_id: tree?.id ?? '',
      tree_name: tree?.name ?? 'Unknown',
      node_id: w.node_id,
      sets_completed: setsCompleted,
      sets_target: targetSets,
      is_promotion: isPromotion,
    };
  });
  // Streak = consecutive days with at least 1 workout, ending today or yesterday.
  const daysWithWorkout = new Set(
    workouts.map((w) => new Date(w.logged_at).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  while (daysWithWorkout.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { recent, total_workouts: workouts.length, streak_days: streak };
}

// ----------------------------- profile / settings -----------------------------

export function getLocalProfile(userId: string): {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  workout_count: number;
} {
  const data = read();
  return {
    user_id: userId,
    email: data.email,
    display_name: data.display_name || null,
    created_at: new Date().toISOString(),
    workout_count: data.workouts.length,
  };
}

export function updateLocalDisplayName(name: string): {
  user_id: string;
  email: string;
  display_name: string;
  updated_at: string;
} {
  const data = read();
  data.display_name = name;
  write(data);
  return {
    user_id: data.user_id,
    email: data.email,
    display_name: name,
    updated_at: new Date().toISOString(),
  };
}

export function exportLocalData(): {
  exported_at: string;
  user_id: string;
  email: string;
  display_name: string;
  archetype: string;
  placements: LocalPlacement[];
  workouts: LocalSyncedLog[];
} {
  const data = read();
  return {
    exported_at: new Date().toISOString(),
    user_id: data.user_id,
    email: data.email,
    display_name: data.display_name,
    archetype: data.archetype,
    placements: data.placements,
    workouts: data.workouts,
  };
}

export function softDeleteLocal(): void {
  // local mode has no server-side data, so "delete" just wipes everything.
  resetLocalMode();
}

export function restoreLocal(): { restored: true; user_id: string } {
  // After "delete" + restore, we want to preserve the user_id if possible.
  // For now: create a fresh local user.
  const data = emptyData();
  write(data);
  return { restored: true, user_id: data.user_id };
}

export function getLocalFeed(): {
  items: never[];
  next_cursor: null;
} {
  return { items: [], next_cursor: null };
}

export function getLocalTendonStrain(): {
  scores: never[];
  summary: { worst_pathway: null; total_load: 0; trend: 'stable' };
} {
  return { scores: [], summary: { worst_pathway: null, total_load: 0, trend: 'stable' } };
}

export function getLocalFriends(): {
  following: never[];
  followers: never[];
} {
  return { following: [], followers: [] };
}

export function getLocalUnlocks(_userId: string): never[] {
  return [];
}