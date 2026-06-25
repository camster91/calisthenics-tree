/**
 * OnboardingContext — shared state for the 4-screen placement flow.
 *
 * Persists to localStorage 'ct:onboarding' so a refresh mid-flow keeps
 * the user where they were (matches PLAN.md §"Offline-first" philosophy —
 * never lose data on reload).
 *
 * After the placement POST succeeds, the answers are kept in localStorage
 * so the user can revisit /onboarding/result if they backtrack. A separate
 * "restart" method clears them.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { OnboardingPlaceResponse } from '../lib/api-types';

const STORAGE_KEY = 'ct:onboarding';

/**
 * Mirrors the FastAPI OnboardingAnswers schema:
 *   can_pull_up, support_hold_15s, active_hang_10s, rir2_pushup_reps
 *
 * Only `can_pull_up` is required up front; the rest are filled in as the
 * user progresses through the screens.
 */
export interface OnboardingAnswers {
  can_pull_up: boolean | null;
  support_hold_15s: boolean | null;
  active_hang_10s: boolean | null;
  rir2_pushup_reps: number | null;
}

export type OnboardingResult = OnboardingPlaceResponse;

export interface OnboardingContextValue {
  answers: OnboardingAnswers;
  result: OnboardingResult | null;
  /** True iff all required answers are filled. */
  isComplete: boolean;

  setCanPullUp: (v: boolean) => void;
  setSupportHold: (v: boolean) => void;
  setActiveHang: (v: boolean) => void;
  setRir2PushupReps: (v: number) => void;

  /** Mark placement as completed; persist the API result for back-navigation. */
  setResult: (result: OnboardingResult) => void;

  /** Wipe state — used by "Restart onboarding" in Settings. */
  reset: () => void;
}

const EMPTY: OnboardingAnswers = {
  can_pull_up: null,
  support_hold_15s: null,
  active_hang_10s: null,
  rir2_pushup_reps: null,
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within <OnboardingProvider>');
  }
  return ctx;
}

function readStored(): { answers: OnboardingAnswers; result: OnboardingResult | null } {
  if (typeof window === 'undefined') return { answers: EMPTY, result: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { answers: EMPTY, result: null };
    const parsed = JSON.parse(raw);
    return {
      answers: { ...EMPTY, ...(parsed.answers ?? {}) },
      result: parsed.result ?? null,
    };
  } catch {
    return { answers: EMPTY, result: null };
  }
}

function writeStored(answers: OnboardingAnswers, result: OnboardingResult | null) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, result }));
}

export interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [{ answers, result }, setState] = useState(() => readStored());

  // Persist on every change.
  useEffect(() => {
    writeStored(answers, result);
  }, [answers, result]);

  const setCanPullUp = useCallback((v: boolean) => {
    setState((s) => ({
      ...s,
      answers: {
        ...s.answers,
        can_pull_up: v,
        // Reset the conditional field if the user changed their mind.
        support_hold_15s: null,
        active_hang_10s: null,
      },
    }));
  }, []);

  const setSupportHold = useCallback((v: boolean) => {
    setState((s) => ({
      ...s,
      answers: { ...s.answers, support_hold_15s: v },
    }));
  }, []);

  const setActiveHang = useCallback((v: boolean) => {
    setState((s) => ({
      ...s,
      answers: { ...s.answers, active_hang_10s: v },
    }));
  }, []);

  const setRir2PushupReps = useCallback((v: number) => {
    setState((s) => ({
      ...s,
      answers: { ...s.answers, rir2_pushup_reps: Math.max(0, Math.floor(v)) },
    }));
  }, []);

  const setResult = useCallback((r: OnboardingResult) => {
    setState((s) => ({ ...s, result: r }));
  }, []);

  const reset = useCallback(() => {
    setState({ answers: EMPTY, result: null });
  }, []);

  const isComplete = useMemo(
    () =>
      answers.can_pull_up !== null &&
      (answers.can_pull_up ? answers.support_hold_15s !== null : answers.active_hang_10s !== null) &&
      answers.rir2_pushup_reps !== null,
    [answers],
  );

  const value = useMemo<OnboardingContextValue>(
    () => ({
      answers,
      result,
      isComplete,
      setCanPullUp,
      setSupportHold,
      setActiveHang,
      setRir2PushupReps,
      setResult,
      reset,
    }),
    [
      answers,
      result,
      isComplete,
      setCanPullUp,
      setSupportHold,
      setActiveHang,
      setRir2PushupReps,
      setResult,
      reset,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}