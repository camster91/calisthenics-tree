/**
 * Marketing Screenshots — App Store screenshot production page.
 *
 * T40 deliverable. Renders 3 slots at iPhone 14 Pro resolution (1290x2796
 * portrait, the App Store Connect iPhone 6.7" requirement). The page is
 * hit by `scripts/render-marketing.ts` which screenshots the data-screenshot
 * element and saves a PNG per slot.
 *
 * Slot 1 — "Unlock skills like a video game"
 *   Home / DAG browse with the active node glowing orange.
 *
 * Slot 2 — "Smart adjustments when you fatigue"
 *   Workout log mid-set with a regression prompt card sliding up.
 *
 * Slot 3 — "Train with friends"
 *   Social feed showing friends' recent unlocks.
 *
 * Marketing overlay is composited in-app via a bottom strip so the render
 * pipeline is single-PNG-per-slot (no post-process composition). This
 * keeps the output exactly 1290x2796 with no chance of overlay drift.
 *
 * No Layout chrome. No theme toggle. Fixed 1290x2796 frame so the
 * Playwright script can drop the data-screenshot element directly into
 * App Store Connect.
 */
import { useParams } from 'react-router-dom';
import {
  Mountain,
  Flame,
  Anchor,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Play,
  Pause,
  Timer,
  Check,
  Heart,
  MessageCircle,
  Repeat2,
  Sparkles,
  TrendingDown,
} from 'lucide-react';

/* ----------------------------------------------------------------- */
/* Phone frame — fixed 1290x2796 (iPhone 14 Pro portrait)             */
/* ----------------------------------------------------------------- */

const W = 1290;
const H = 2796;
const SAFE_TOP = 132; // status bar reserved
const SAFE_BOTTOM = 196; // home indicator reserved
const PADDING = 64;

function PhoneFrame({
  slot,
  caption,
  captionAccent,
  badge,
  children,
}: {
  slot: number;
  caption: string;
  captionAccent: 'orange' | 'red';
  badge?: string;
  children: React.ReactNode;
}) {
  const accent =
    captionAccent === 'red' ? '#EA580C' : '#F97316';
  const accentSoft =
    captionAccent === 'red' ? 'rgba(239,68,68,0.16)' : 'rgba(249,115,22,0.18)';

  return (
    <div
      data-screenshot
      data-slot={slot}
      style={{
        width: W,
        height: H,
        position: 'relative',
        overflow: 'hidden',
        background: '#0B1220',
        fontFamily:
          "'Geist', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#F8FAFC',
        // 9:19.5 portrait ratio
      }}
    >
      {/* Faint background gradient — keeps the dark frame from being a flat slab */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 80% at 50% -10%, rgba(249,115,22,0.16) 0%, rgba(11,18,32,0) 55%), radial-gradient(80% 60% at 80% 100%, rgba(56,189,248,0.08) 0%, rgba(11,18,32,0) 60%)',
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
          padding: `${60}px ${PADDING}px 0`,
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
          {/* signal */}
          <svg width="48" height="32" viewBox="0 0 48 32" fill="none">
            <rect x="0" y="22" width="8" height="10" rx="2" fill="#F8FAFC" />
            <rect x="12" y="14" width="8" height="18" rx="2" fill="#F8FAFC" />
            <rect x="24" y="6" width="8" height="26" rx="2" fill="#F8FAFC" />
            <rect x="36" y="0" width="8" height="32" rx="2" fill="#F8FAFC" />
          </svg>
          {/* wifi */}
          <svg width="40" height="32" viewBox="0 0 40 32" fill="none">
            <path
              d="M20 28a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
              fill="#F8FAFC"
            />
            <path
              d="M10 22a12 12 0 0 1 20 0"
              stroke="#F8FAFC"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M2 14a20 20 0 0 1 36 0"
              stroke="#F8FAFC"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          {/* battery */}
          <svg width="64" height="32" viewBox="0 0 64 32" fill="none">
            <rect
              x="1"
              y="6"
              width="56"
              height="22"
              rx="5"
              stroke="#F8FAFC"
              strokeWidth="2"
              fill="none"
            />
            <rect x="59" y="12" width="4" height="10" rx="1.5" fill="#F8FAFC" />
            <rect x="5" y="10" width="48" height="14" rx="3" fill="#F8FAFC" />
          </svg>
        </span>
      </div>

      {/* App content — slot-specific */}
      <div
        style={{
          position: 'absolute',
          top: SAFE_TOP,
          left: 0,
          right: 0,
          bottom: SAFE_BOTTOM + 380, // leave room for caption strip
          padding: `0 ${PADDING}px`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>

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

      {/* Marketing caption strip — fixed bottom region, big readable type */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: SAFE_BOTTOM,
          height: 380,
          padding: '40px 64px 36px',
          background: `linear-gradient(180deg, rgba(11,18,32,0) 0%, rgba(11,18,32,0.85) 24%, rgba(11,18,32,0.96) 100%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: 18,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            alignSelf: 'flex-start',
            padding: '12px 20px',
            borderRadius: 999,
            background: accentSoft,
            border: `2px solid ${accent}`,
            color: accent,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: accent,
              boxShadow: `0 0 16px ${accent}`,
            }}
          />
          {badge ?? `Slot ${slot}`}
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 88,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#F8FAFC',
            textWrap: 'balance',
          }}
        >
          {caption}
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 4,
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 36,
              height: 36,
              borderRadius: 10,
              background: accent,
              boxShadow: `0 0 24px ${accent}`,
            }}
          />
          <span
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: '#F8FAFC',
              letterSpacing: '-0.01em',
            }}
          >
            Calisthenics Tree
          </span>
          <span
            style={{
              fontSize: 26,
              color: '#94A3B8',
              fontFamily:
                "'JetBrains Mono', 'SF Mono', Menlo, monospace",
              marginLeft: 'auto',
            }}
          >
            workout.ashbi.ca
          </span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Shared atoms                                                       */
/* ----------------------------------------------------------------- */

function card(children: React.ReactNode, extra?: React.CSSProperties) {
  return (
    <div
      style={{
        borderRadius: 28,
        border: '1px solid #1E293B',
        background: '#111827',
        padding: 32,
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
        ...extra,
      }}
    >
      {children}
    </div>
  );
}

function chip(label: string, tone: 'neutral' | 'primary' | 'success' | 'warning' = 'neutral') {
  const colors = {
    neutral: { bg: '#1F2937', fg: '#94A3B8', border: 'transparent' },
    primary: { bg: 'rgba(249,115,22,0.16)', fg: '#F97316', border: 'rgba(249,115,22,0.4)' },
    success: { bg: 'rgba(34,197,94,0.18)', fg: '#22C55E', border: 'rgba(34,197,94,0.4)' },
    warning: { bg: 'rgba(245,158,11,0.16)', fg: '#F59E0B', border: 'rgba(245,158,11,0.4)' },
  }[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 999,
        background: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.border}`,
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: '0.01em',
      }}
    >
      {label}
    </span>
  );
}

function eyebrow(eyebrow: string, title: string, sub?: string) {
  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: '#F97316',
            boxShadow: '0 0 32px rgba(249,115,22,0.6)',
          }}
        />
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: '#F8FAFC',
          }}
        >
          Calisthenics Tree
        </span>
      </div>
      <p
        style={{
          margin: '36px 0 0',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#F97316',
        }}
      >
        {eyebrow}
      </p>
      <h1
        style={{
          margin: '14px 0 12px',
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
      {sub && (
        <p
          style={{
            margin: 0,
            fontSize: 30,
            color: '#94A3B8',
            lineHeight: 1.35,
            maxWidth: 1000,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Slot 1 — DAG browse (Home) with current node glowing orange       */
/* ----------------------------------------------------------------- */

const TREES = [
  { name: 'Push → Handstand Push-up', Icon: Mountain, current: 'Pike push-up · 3×8' },
  { name: 'Pull → Front Lever', Icon: Flame, current: 'Inverted row · 3×8' },
  { name: 'Core → Dragon Flag', Icon: Anchor, current: 'Hollow hold · 20s' },
];

function SlotOne() {
  return (
    <PhoneFrame
      slot={1}
      badge="Progression > logging"
      captionAccent="orange"
      caption="Unlock skills like a video game."
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {eyebrow(
          'Browse the tree',
          'Your three progressions',
          'Pick a tree to log a workout, or jump to the next available node.'
        )}

        <div
          style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {TREES.map((t, i) => {
            const Icon = t.Icon;
            const current = i === 0;
            return (
              <div
                key={t.name}
                style={{
                  borderRadius: 24,
                  border: current
                    ? '2px solid #F97316'
                    : '1px solid #1E293B',
                  background: current
                    ? 'linear-gradient(180deg, rgba(249,115,22,0.14) 0%, #111827 100%)'
                    : '#111827',
                  padding: 24,
                  boxShadow: current
                    ? '0 0 32px rgba(249,115,22,0.35)'
                    : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      background: 'rgba(249,115,22,0.18)',
                      border: '1px solid rgba(249,115,22,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#F97316',
                    }}
                  >
                    <Icon size={36} strokeWidth={2.2} />
                  </div>
                  {chip(i === 0 ? '4/12' : i === 1 ? '3/12' : '2/8')}
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 26,
                    fontWeight: 700,
                    color: '#F8FAFC',
                    lineHeight: 1.15,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {t.name}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 20,
                    color: '#7B8AA3',
                  }}
                >
                  Current
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 600,
                    fontFamily:
                      "'JetBrains Mono', 'SF Mono', Menlo, monospace",
                    color: current ? '#F97316' : '#F8FAFC',
                  }}
                >
                  {t.current}
                </p>
                <div
                  style={{
                    marginTop: 'auto',
                    padding: '14px 0',
                    textAlign: 'center',
                    borderRadius: 14,
                    background: current ? '#F97316' : '#1F2937',
                    color: current ? '#0B1220' : '#F8FAFC',
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  Log
                </div>
              </div>
            );
          })}
        </div>

        {/* DAG preview — current node glowing */}
        <div style={{ marginTop: 32, flex: 1 }}>
          {card(
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 28,
                }}
              >
                <div>
                  {chip('DAG preview', 'primary')}
                  <h3
                    style={{
                      margin: '14px 0 0',
                      fontSize: 32,
                      fontWeight: 700,
                      color: '#F8FAFC',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Push → Handstand Push-up
                  </h3>
                </div>
                {chip('15 nodes · 4 unlocked', 'neutral')}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 12,
                }}
              >
                {Array.from({ length: 15 }).map((_, i) => {
                  const current = i === 6;
                  const unlocked = i < 4;
                  const tone = current
                    ? {
                        bg: 'rgba(249,115,22,0.22)',
                        border: '2px solid #F97316',
                        fg: '#F97316',
                        glow: '0 0 24px rgba(249,115,22,0.55)',
                      }
                    : unlocked
                      ? {
                          bg: '#1F2937',
                          border: '1px solid #334155',
                          fg: '#F8FAFC',
                          glow: 'none',
                        }
                      : {
                          bg: '#0F172A',
                          border: '1px solid #1E293B',
                          fg: '#475569',
                          glow: 'none',
                        };
                  return (
                    <div
                      key={i}
                      style={{
                        aspectRatio: '1.2 / 1',
                        borderRadius: 14,
                        background: tone.bg,
                        border: tone.border,
                        color: tone.fg,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontSize: 22,
                        fontWeight: 600,
                        boxShadow: tone.glow,
                      }}
                    >
                      <Mountain size={26} strokeWidth={2.2} />
                      <span style={{ fontSize: 20 }}>Node {i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>,
            { padding: 32 },
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ----------------------------------------------------------------- */
/* Slot 2 — Workout log mid-set + regression prompt                  */
/* ----------------------------------------------------------------- */

function SlotTwo() {
  return (
    <PhoneFrame
      slot={2}
      badge="Live adjustments"
      captionAccent="red"
      caption="Smart adjustments when you fatigue."
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {eyebrow(
          'Workout · set 2 of 3',
          'Pike push-up',
          '3 × 8 · RIR-2 target · 3-1-3 tempo'
        )}

        {/* Rep counter */}
        <div style={{ marginTop: 32 }}>
          {card(
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              {chip('Reps')}
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
                07
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
                    background: '#1F2937',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F8FAFC',
                  }}
                >
                  <RotateCcw size={42} strokeWidth={2.2} />
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
                  <ChevronUp size={48} strokeWidth={2.5} />
                </div>
              </div>
            </div>,
          )}
        </div>

        {/* Timer + set log row */}
        <div
          style={{
            marginTop: 20,
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            gap: 16,
          }}
        >
          {/* Timer */}
          {card(
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
                <div>
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
                      fontSize: 32,
                      fontWeight: 700,
                      fontFamily:
                        "'JetBrains Mono', 'SF Mono', Menlo, monospace",
                      color: '#F8FAFC',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    02:14 / 03:00
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 999,
                    background: '#1F2937',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F8FAFC',
                  }}
                >
                  <Pause size={32} />
                </div>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 999,
                    background: '#F97316',
                    boxShadow: '0 0 24px rgba(249,115,22,0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0B1220',
                  }}
                >
                  <Play size={32} fill="currentColor" />
                </div>
              </div>
            </div>,
            { padding: 24 },
          )}

          {/* Today's sets */}
          {card(
            <div>
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
                Today&apos;s sets
              </p>
              {[
                { n: 1, reps: 8, rir: 2, done: true },
                { n: 2, reps: 7, done: false, current: true },
                { n: 3, reps: null, done: false },
              ].map((s) => {
                const bg = s.current
                  ? 'rgba(249,115,22,0.08)'
                  : 'transparent';
                return (
                  <div
                    key={s.n}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 4px',
                      borderTop: s.n > 1 ? '1px solid #1E293B' : 'none',
                      borderRadius: s.current ? 10 : 0,
                      background: bg,
                      marginTop: s.n > 1 ? 4 : 0,
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 14 }}
                    >
                      <span
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: s.done
                            ? 'rgba(34,197,94,0.18)'
                            : s.current
                              ? '#F97316'
                              : '#1F2937',
                          color: s.done
                            ? '#22C55E'
                            : s.current
                              ? '#0B1220'
                              : '#7B8AA3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          fontWeight: 700,
                        }}
                      >
                        {s.n}
                      </span>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 22,
                            fontWeight: 600,
                            color: '#F8FAFC',
                          }}
                        >
                          Set {s.n}
                          {s.current && ' · in progress'}
                        </p>
                        <p
                          style={{
                            margin: '2px 0 0',
                            fontSize: 18,
                            color: '#7B8AA3',
                          }}
                        >
                          Target 8 reps @ RIR-2
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {s.reps !== null && (
                        <span
                          style={{
                            fontFamily:
                              "'JetBrains Mono', 'SF Mono', Menlo, monospace",
                            fontSize: 22,
                            color: '#F8FAFC',
                            fontWeight: 700,
                          }}
                        >
                          {s.reps}
                        </span>
                      )}
                      {s.rir !== null && (
                        <span
                          style={{
                            fontSize: 18,
                            color: '#22C55E',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(34,197,94,0.4)',
                            background: 'rgba(34,197,94,0.12)',
                          }}
                        >
                          RIR 2
                        </span>
                      )}
                      {s.done && (
                        <Check size={26} color="#22C55E" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>,
            { padding: 24 },
          )}
        </div>

        {/* Regression prompt card — sliding up over the workout */}
        <div style={{ marginTop: 20 }}>
          {card(
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                border: '2px solid rgba(239,68,68,0.5)',
                background:
                  'linear-gradient(180deg, rgba(239,68,68,0.14) 0%, #111827 100%)',
                boxShadow: '0 0 36px rgba(239,68,68,0.25)',
              }}
            >
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 18,
                  background: 'rgba(239,68,68,0.18)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444',
                  flexShrink: 0,
                }}
              >
                <TrendingDown size={40} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {chip('Regression', 'warning')}
                  <span
                    style={{
                      fontSize: 18,
                      color: '#7B8AA3',
                      fontWeight: 600,
                    }}
                  >
                    · auto-detected
                  </span>
                </div>
                <p
                  style={{
                    margin: '12px 0 4px',
                    fontSize: 30,
                    fontWeight: 700,
                    color: '#F8FAFC',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Switch to knee pike push-up
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 22,
                    color: '#94A3B8',
                    lineHeight: 1.3,
                  }}
                >
                  Form is breaking at rep 6. Easier regression preserves
                  volume and protects your shoulders.
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    padding: '14px 22px',
                    borderRadius: 14,
                    background: '#F97316',
                    color: '#0B1220',
                    fontSize: 22,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  Accept
                  <ArrowRight size={22} />
                </div>
                <div
                  style={{
                    padding: '12px 22px',
                    borderRadius: 14,
                    background: 'transparent',
                    border: '1px solid #334155',
                    color: '#F8FAFC',
                    fontSize: 20,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  Stay
                </div>
              </div>
            </div>,
            { padding: 24 },
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ----------------------------------------------------------------- */
/* Slot 3 — Social feed (friends' recent unlocks)                    */
/* ----------------------------------------------------------------- */

const POSTS = [
  {
    user: 'maria_pulls',
    when: '2h ago',
    body: 'Hit 3×8 archer rows. Front lever feels close.',
    tree: 'Pull → Front Lever',
    reps: '3×8 archers',
    likes: 12,
    replies: 3,
    avatar: 'M',
    accent: '#22C55E',
  },
  {
    user: 'derek_planche',
    when: '5h ago',
    body: 'Tuck planche 12s × 3. Wrist felt it — taking tomorrow off.',
    tree: 'Push → Handstand',
    reps: '3×12s tuck',
    likes: 28,
    replies: 7,
    avatar: 'D',
    accent: '#38BDF8',
  },
  {
    user: 'noor_dragons',
    when: 'yesterday',
    body: 'Half dragon flag unlocked!!',
    tree: 'Core → Dragon Flag',
    reps: 'Milestone',
    likes: 41,
    replies: 11,
    avatar: 'N',
    accent: '#F97316',
    milestone: true,
  },
];

function SlotThree() {
  return (
    <PhoneFrame
      slot={3}
      badge="Social > solo"
      captionAccent="orange"
      caption="Train with friends."
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {eyebrow(
          'Feed',
          'People you follow',
          'Workouts, milestones, and notes from your training partners.'
        )}

        <div
          style={{
            marginTop: 28,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            flex: 1,
          }}
        >
          {POSTS.map((p) => (
            <div
              key={p.user}
              style={{
                borderRadius: 24,
                border: p.milestone
                  ? '2px solid rgba(249,115,22,0.45)'
                  : '1px solid #1E293B',
                background: p.milestone
                  ? 'linear-gradient(180deg, rgba(249,115,22,0.1) 0%, #111827 100%)'
                  : '#111827',
                boxShadow: p.milestone
                  ? '0 0 28px rgba(249,115,22,0.22)'
                  : 'none',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <header
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 999,
                      background: p.accent,
                      color: '#0B1220',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      fontWeight: 800,
                    }}
                  >
                    {p.avatar}
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 26,
                        fontWeight: 700,
                        color: '#F8FAFC',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      @{p.user}
                    </p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 20,
                        color: '#7B8AA3',
                      }}
                    >
                      {p.when}
                    </p>
                  </div>
                </div>
                {chip(p.tree, 'primary')}
              </header>

              <p
                style={{
                  margin: 0,
                  fontSize: 28,
                  lineHeight: 1.35,
                  color: '#F8FAFC',
                }}
              >
                {p.body}
                {p.milestone && (
                  <span style={{ marginLeft: 6 }} aria-hidden>
                    🎉
                  </span>
                )}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  paddingTop: 14,
                  borderTop: '1px solid #1E293B',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 22,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#94A3B8',
                      fontSize: 22,
                      fontWeight: 600,
                    }}
                  >
                    <Heart size={24} fill="#F97316" color="#F97316" />
                    {p.likes}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#94A3B8',
                      fontSize: 22,
                      fontWeight: 600,
                    }}
                  >
                    <MessageCircle size={24} />
                    {p.replies}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#94A3B8',
                      fontSize: 22,
                      fontWeight: 600,
                    }}
                  >
                    <Repeat2 size={24} />
                  </span>
                </div>
                {p.milestone ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 18px',
                      borderRadius: 999,
                      background: 'rgba(249,115,22,0.16)',
                      color: '#F97316',
                      border: '1px solid rgba(249,115,22,0.4)',
                      fontSize: 22,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={20} />
                    Milestone
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily:
                        "'JetBrains Mono', 'SF Mono', Menlo, monospace",
                      fontSize: 22,
                      color: '#F8FAFC',
                      fontWeight: 600,
                      textAlign: 'right',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 360,
                      flexShrink: 1,
                    }}
                  >
                    {p.reps}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ----------------------------------------------------------------- */
/* Router                                                             */
/* ----------------------------------------------------------------- */

export default function Screenshots() {
  const { slot = '1' } = useParams<{ slot: string }>();
  if (slot === '2') return <SlotTwo />;
  if (slot === '3') return <SlotThree />;
  return <SlotOne />;
}
