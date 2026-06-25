/**
 * Onboarding Demo — production route previews for App Store preview video.
 *
 * Each step renders the production-styled UI at exactly 1290×2796 with no
 * chrome. The Playwright video script walks these in sequence, capturing
 * each as a still frame, then encodes them via ffmpeg to a 15-30s mp4.
 *
 * Steps:
 *   1. q1  — Can you do a strict pull-up? (3 options, "Yes" pre-selected)
 *   2. q2  — How many strict reps? (numeric stepper, 6 reps)
 *   3. q3  — Bodyweight / equipment context (3 options)
 *   4. test — RIR-2 push-up test (loading state with running timer)
 *   5. result — placement: "3 trees unlocked"
 *   6. first-workout — first workout in the new user's tree
 *
 * Marketing overlay (top + bottom) frames the video with the brand mark
 * so the viewer always knows what they're looking at.
 */
import { useParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Mountain,
  Flame,
  Anchor,
  Play,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Timer,
  Sparkles,
  Trophy,
} from 'lucide-react';

const W = 1290;
const H = 2796;
const SAFE_TOP = 132;
const SAFE_BOTTOM = 196;

interface FrameProps {
  step: number;
  total: number;
  eyebrow: string;
  title: string;
  caption?: string;
  children: React.ReactNode;
  /** When true, render the brand-strip footer. */
  showFooter?: boolean;
}

function OnboardingFrame({
  step,
  total,
  eyebrow,
  title,
  caption,
  children,
  showFooter = true,
}: FrameProps) {
  return (
    <div
      data-screenshot
      data-step={step}
      style={{
        width: W,
        height: H,
        position: 'relative',
        overflow: 'hidden',
        background: '#0B1220',
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#F8FAFC',
      }}
    >
      {/* Ambient gradient */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 80% at 50% -10%, rgba(249,115,22,0.18) 0%, rgba(11,18,32,0) 55%)',
        }}
      />

      {/* Status bar */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: SAFE_TOP,
          padding: '60px 64px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 44,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: '#F8FAFC',
        }}
      >
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>9:41</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
            <rect x="0" y="22" width="8" height="10" rx="2" fill="#F8FAFC" />
            <rect x="12" y="14" width="8" height="18" rx="2" fill="#F8FAFC" />
            <rect x="24" y="6" width="8" height="26" rx="2" fill="#F8FAFC" />
            <rect x="36" y="0" width="8" height="32" rx="2" fill="#F8FAFC" />
          </svg>
          <svg width="40" height="32" viewBox="0 0 40 32" fill="none">
            <path d="M20 28a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill="#F8FAFC" />
            <path d="M10 22a12 12 0 0 1 20 0" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M2 14a20 20 0 0 1 36 0" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
          <svg width="64" height="32" viewBox="0 0 64 32" fill="none">
            <rect x="1" y="6" width="56" height="22" rx="5" stroke="#F8FAFC" strokeWidth="2" fill="none" />
            <rect x="59" y="12" width="4" height="10" rx="1.5" fill="#F8FAFC" />
            <rect x="5" y="10" width="48" height="14" rx="3" fill="#F8FAFC" />
          </svg>
        </span>
      </div>

      {/* Progress + brand strip */}
      <div
        style={{
          position: 'absolute',
          top: SAFE_TOP + 32,
          left: 64,
          right: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            aria-hidden
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#F97316',
              boxShadow: '0 0 24px rgba(249,115,22,0.55)',
            }}
          />
          <span style={{ fontSize: 24, fontWeight: 700, color: '#F8FAFC' }}>
            Calisthenics Tree
          </span>
        </div>
        <span
          style={{
            fontSize: 22,
            color: '#94A3B8',
            fontWeight: 600,
            fontFamily:
              "'JetBrains Mono', 'SF Mono', Menlo, monospace",
          }}
        >
          Step {step} / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: SAFE_TOP + 110,
          left: 64,
          right: 64,
          height: 6,
          borderRadius: 999,
          background: '#1E293B',
        }}
      >
        <div
          style={{
            width: `${(step / total) * 100}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #F97316 0%, #FB923C 100%)',
            boxShadow: '0 0 12px rgba(249,115,22,0.6)',
          }}
        />
      </div>

      {/* Step body */}
      <div
        style={{
          position: 'absolute',
          top: SAFE_TOP + 200,
          left: 64,
          right: 64,
          bottom: SAFE_BOTTOM + (showFooter ? 280 : 0),
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#F97316',
          }}
        >
          {eyebrow}
        </p>
        <h1
          style={{
            margin: '14px 0 18px',
            fontSize: 76,
            lineHeight: 1.04,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#F8FAFC',
            textWrap: 'balance',
          }}
        >
          {title}
        </h1>
        {caption && (
          <p
            style={{
              margin: 0,
              fontSize: 28,
              color: '#94A3B8',
              lineHeight: 1.35,
              maxWidth: 1000,
            }}
          >
            {caption}
          </p>
        )}
        <div style={{ flex: 1, marginTop: 40, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>

      {/* Footer CTA / brand strip */}
      {showFooter && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: SAFE_BOTTOM,
            height: 280,
            padding: '32px 64px 36px',
            background:
              'linear-gradient(180deg, rgba(11,18,32,0) 0%, rgba(11,18,32,0.85) 30%, rgba(11,18,32,0.96) 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div
              style={{
                padding: '20px 32px',
                borderRadius: 18,
                background: '#F97316',
                color: '#0B1220',
                fontSize: 30,
                fontWeight: 800,
                boxShadow: '0 0 36px rgba(249,115,22,0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {step < total ? 'Continue' : 'Start training'}
              <ArrowRight size={28} strokeWidth={3} />
            </div>
            <div
              style={{
                padding: '18px 28px',
                borderRadius: 18,
                border: '1px solid #334155',
                color: '#F8FAFC',
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              Skip for now
            </div>
          </div>
        </div>
      )}

      {/* Home indicator */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 36,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 360,
            height: 8,
            borderRadius: 999,
            background: '#F8FAFC',
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}

function card(children: React.ReactNode, extra?: React.CSSProperties) {
  return (
    <div
      style={{
        borderRadius: 28,
        border: '1px solid #1E293B',
        background: '#111827',
        padding: 28,
        ...extra,
      }}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Step 1 — Q1: Can you do a strict pull-up?                          */
/* ----------------------------------------------------------------- */

const Q1_OPTIONS = [
  { key: 'yes', label: 'Yes — strict, chin over bar', body: 'I can do at least one clean pull-up.' },
  { key: 'band', label: 'Only with a band', body: 'Pull-ups with assistance count.' },
  { key: 'no', label: 'No — not yet', body: 'I can hang, or I am working up to it.' },
];

function StepQ1() {
  return (
    <OnboardingFrame
      step={1}
      total={5}
      eyebrow="Step 1 of 5"
      title="Can you do a strict pull-up?"
      caption="Be honest — this just places you. The tree adjusts."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        {Q1_OPTIONS.map((o, i) => {
          const active = i === 0;
          return (
            <div
              key={o.key}
              style={{
                borderRadius: 22,
                border: active ? '2px solid #F97316' : '1px solid #1E293B',
                background: active
                  ? 'linear-gradient(180deg, rgba(249,115,22,0.14) 0%, #111827 100%)'
                  : '#111827',
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                boxShadow: active ? '0 0 28px rgba(249,115,22,0.32)' : 'none',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: active ? '#F97316' : '#1F2937',
                  color: active ? '#0B1220' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  fontWeight: 800,
                }}
              >
                {active ? <Check size={28} strokeWidth={3} /> : i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 30,
                    fontWeight: 700,
                    color: '#F8FAFC',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {o.label}
                </p>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 22,
                    color: '#94A3B8',
                    lineHeight: 1.3,
                  }}
                >
                  {o.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </OnboardingFrame>
  );
}

/* ----------------------------------------------------------------- */
/* Step 2 — Q2: How many strict reps?                                  */
/* ----------------------------------------------------------------- */

function StepQ2() {
  return (
    <OnboardingFrame
      step={2}
      total={5}
      eyebrow="Step 2 of 5"
      title="How many strict reps?"
      caption="One set, full range of motion, no kipping."
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 36,
          marginTop: 60,
        }}
      >
        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: '50%',
            background:
              'radial-gradient(60% 60% at 50% 40%, rgba(249,115,22,0.35) 0%, rgba(249,115,22,0.05) 70%, transparent 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(249,115,22,0.5)',
            boxShadow: '0 0 60px rgba(249,115,22,0.4)',
          }}
        >
          <span
            style={{
              fontFamily:
                "'JetBrains Mono', 'SF Mono', Menlo, monospace",
              fontSize: 220,
              fontWeight: 800,
              color: '#F97316',
              letterSpacing: '-0.06em',
              lineHeight: 1,
              textShadow: '0 0 32px rgba(249,115,22,0.55)',
            }}
          >
            6
          </span>
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: 999,
              background: '#1F2937',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F8FAFC',
            }}
          >
            <ChevronDown size={56} strokeWidth={2.4} />
          </div>
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: 999,
              background: '#1F2937',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F8FAFC',
            }}
          >
            <RotateCcw size={48} strokeWidth={2.2} />
          </div>
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: 999,
              background: '#F97316',
              boxShadow: '0 0 36px rgba(249,115,22,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0B1220',
            }}
          >
            <ChevronUp size={56} strokeWidth={2.6} />
          </div>
        </div>

        <p
          style={{
            fontSize: 24,
            color: '#7B8AA3',
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          We&apos;ll place you on the right rung of the Pull → Front Lever tree
          based on this number.
        </p>
      </div>
    </OnboardingFrame>
  );
}

/* ----------------------------------------------------------------- */
/* Step 3 — Q3: body weight / equipment context                       */
/* ----------------------------------------------------------------- */

function StepQ3() {
  const options = [
    {
      label: 'Calisthenics only',
      body: 'Bars, rings, floor. No weights.',
      active: false,
    },
    {
      label: 'Mix of bodyweight + weights',
      body: 'I have a gym membership or rack at home.',
      active: true,
    },
    {
      label: 'Just starting',
      body: 'New to training. Start simple.',
      active: false,
    },
  ];

  return (
    <OnboardingFrame
      step={3}
      total={5}
      eyebrow="Step 3 of 5"
      title="What equipment do you have?"
      caption="The trainer picks regressions based on what you can use."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        {options.map((o) => (
          <div
            key={o.label}
            style={{
              borderRadius: 22,
              border: o.active ? '2px solid #F97316' : '1px solid #1E293B',
              background: o.active
                ? 'linear-gradient(180deg, rgba(249,115,22,0.14) 0%, #111827 100%)'
                : '#111827',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              boxShadow: o.active ? '0 0 28px rgba(249,115,22,0.32)' : 'none',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: o.active ? '#F97316' : '#1F2937',
                color: o.active ? '#0B1220' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              {o.active && <Check size={28} strokeWidth={3} />}
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 30,
                  fontWeight: 700,
                  color: '#F8FAFC',
                }}
              >
                {o.label}
              </p>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 22,
                  color: '#94A3B8',
                }}
              >
                {o.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </OnboardingFrame>
  );
}

/* ----------------------------------------------------------------- */
/* Step 4 — RIR-2 pushup test (loading state)                          */
/* ----------------------------------------------------------------- */

function StepTest() {
  return (
    <OnboardingFrame
      step={4}
      total={5}
      eyebrow="Step 4 of 5"
      title="RIR-2 push-up test"
      caption="Push-ups until 2 reps in reserve. Form over speed."
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 36,
        }}
      >
        <div
          style={{
            width: 520,
            height: 520,
            borderRadius: '50%',
            background:
              'radial-gradient(60% 60% at 50% 50%, rgba(249,115,22,0.32) 0%, rgba(249,115,22,0.04) 70%, transparent 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(249,115,22,0.4)',
            boxShadow: '0 0 80px rgba(249,115,22,0.45)',
          }}
        >
          <Timer size={56} color="#F97316" strokeWidth={2.2} />
          <span
            style={{
              marginTop: 18,
              fontFamily:
                "'JetBrains Mono', 'SF Mono', Menlo, monospace",
              fontSize: 168,
              fontWeight: 800,
              color: '#F97316',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 32px rgba(249,115,22,0.5)',
            }}
          >
            00:42
          </span>
          <span
            style={{
              marginTop: 12,
              fontSize: 24,
              color: '#94A3B8',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            reps in reserve · keep going
          </span>
        </div>
      </div>
    </OnboardingFrame>
  );
}

/* ----------------------------------------------------------------- */
/* Step 5 — Placement result                                           */
/* ----------------------------------------------------------------- */

function StepResult() {
  const trees = [
    { Icon: Mountain, name: 'Push → Handstand Push-up', start: 'Pike push-up · 3×8' },
    { Icon: Flame, name: 'Pull → Front Lever', start: 'Inverted row · 3×8' },
    { Icon: Anchor, name: 'Core → Dragon Flag', start: 'Hollow hold · 20s' },
  ];
  return (
    <OnboardingFrame
      step={5}
      total={5}
      eyebrow="Placed"
      title="Your three progressions are unlocked."
      caption="Tap a tree to start logging, or jump into a workout now."
      showFooter
    >
      <div
        style={{
          marginTop: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          flex: 1,
        }}
      >
        {trees.map((t, i) => {
          const Icon = t.Icon;
          return (
            <div
              key={t.name}
              style={{
                borderRadius: 24,
                border: i === 0
                  ? '2px solid #F97316'
                  : '1px solid #1E293B',
                background: i === 0
                  ? 'linear-gradient(180deg, rgba(249,115,22,0.14) 0%, #111827 100%)'
                  : '#111827',
                padding: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                boxShadow: i === 0 ? '0 0 28px rgba(249,115,22,0.32)' : 'none',
              }}
            >
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 18,
                  background: 'rgba(249,115,22,0.18)',
                  border: '1px solid rgba(249,115,22,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F97316',
                }}
              >
                <Icon size={40} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#F8FAFC',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {t.name}
                </p>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 22,
                    color: '#94A3B8',
                    fontFamily:
                      "'JetBrains Mono', 'SF Mono', Menlo, monospace",
                  }}
                >
                  Start: {t.start}
                </p>
              </div>
              <div
                style={{
                  padding: '12px 22px',
                  borderRadius: 14,
                  background: i === 0 ? '#F97316' : '#1F2937',
                  color: i === 0 ? '#0B1220' : '#F8FAFC',
                  fontSize: 22,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Sparkles size={20} />
                Unlocked
              </div>
            </div>
          );
        })}

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '18px 24px',
            borderRadius: 16,
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.4)',
            color: '#22C55E',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          <Trophy size={26} />
          Placement complete · 3 trees unlocked · 1 milestone earned
        </div>
      </div>
    </OnboardingFrame>
  );
}

/* ----------------------------------------------------------------- */
/* Step 6 — First workout                                             */
/* ----------------------------------------------------------------- */

function StepFirstWorkout() {
  return (
    <OnboardingFrame
      step={5}
      total={5}
      eyebrow="First workout"
      title="Pike push-up · set 1"
      caption="3 × 8 · RIR-2 target · 3-1-3 tempo"
      showFooter
    >
      <div style={{ marginTop: 32, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {card(
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 999,
                background: '#1F2937',
                color: '#94A3B8',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              Reps
            </span>
            <div
              style={{
                margin: '24px 0 20px',
                fontFamily:
                  "'JetBrains Mono', 'SF Mono', Menlo, monospace",
                fontSize: 240,
                fontWeight: 800,
                color: '#F97316',
                letterSpacing: '-0.05em',
                lineHeight: 0.95,
                fontVariantNumeric: 'tabular-nums',
                textShadow: '0 0 40px rgba(249,115,22,0.4)',
              }}
            >
              04
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  background: '#1F2937',
                  border: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F8FAFC',
                }}
              >
                <ChevronDown size={48} strokeWidth={2.2} />
              </div>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  background: '#F97316',
                  boxShadow: '0 0 32px rgba(249,115,22,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0B1220',
                }}
              >
                <Play size={44} fill="currentColor" />
              </div>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  background: '#1F2937',
                  border: '1px solid #334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F8FAFC',
                }}
              >
                <ChevronUp size={48} strokeWidth={2.2} />
              </div>
            </div>
          </div>,
        )}

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {card(
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: 'rgba(56,189,248,0.16)',
                  border: '1px solid rgba(56,189,248,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38BDF8',
                }}
              >
                <Timer size={32} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 18,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#7B8AA3',
                    fontWeight: 600,
                  }}
                >
                  Set timer
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 30,
                    fontWeight: 700,
                    fontFamily:
                      "'JetBrains Mono', 'SF Mono', Menlo, monospace",
                    color: '#F8FAFC',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  01:08 / 03:00
                </p>
              </div>
            </div>,
            { padding: 24 },
          )}
          {card(
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: 'rgba(34,197,94,0.18)',
                  border: '1px solid rgba(34,197,94,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#22C55E',
                }}
              >
                <Check size={32} strokeWidth={3} />
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 26,
                    fontWeight: 700,
                    color: '#F8FAFC',
                  }}
                >
                  Set 1 complete · 8 reps @ RIR-2
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 20,
                    color: '#94A3B8',
                  }}
                >
                  Rest 3 minutes, then set 2.
                </p>
              </div>
            </div>,
            { padding: 24 },
          )}
        </div>
      </div>
    </OnboardingFrame>
  );
}

/* ----------------------------------------------------------------- */
/* Router                                                             */
/* ----------------------------------------------------------------- */

export default function OnboardingDemo() {
  const { step = 'q1' } = useParams<{ step: string }>();
  switch (step) {
    case 'q2':
      return <StepQ2 />;
    case 'q3':
      return <StepQ3 />;
    case 'test':
      return <StepTest />;
    case 'result':
      return <StepResult />;
    case 'first':
      return <StepFirstWorkout />;
    case 'q1':
    default:
      return <StepQ1 />;
  }
}
