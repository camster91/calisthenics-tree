/**
 * Wireframe — Empty states (no workouts / no friends / no nodes unlocked).
 *
 * Production route: inline (rendered within home, feed, workout-log).
 * Three inline-pattern wireframes on one review page.
 */
import { Mountain, Heart, Calendar } from 'lucide-react';
import { PageHeader, Section, EmptyState } from './_primitives';

export default function EmptyStatesWireframe() {
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Empty states"
        title="Three baseline empty patterns"
        description="Reusable across home, feed, workout-log, and anywhere data is first-run."
      />

      <Section
        title="No workouts yet"
        description="Inline on home. CTA: start the first workout."
      >
        <EmptyState
          icon={Mountain}
          title="No workouts logged"
          body="Your first workout unlocks the tree. Five minutes, three sets, done."
          primaryCta={{ label: 'Log first workout', href: '/wireframes/workout-log' }}
          secondaryCta={{ label: 'See the tree', href: '/wireframes/home' }}
        />
      </Section>

      <Section
        title="No friends yet"
        description="Inline on feed. CTA: find or invite."
      >
        <EmptyState
          icon={Heart}
          title="No friends yet"
          body="Follow people to see their workouts, milestones, and challenges."
          primaryCta={{ label: 'Find people', href: '/wireframes/friend-profile' }}
          secondaryCta={{ label: 'Invite via link', href: '/wireframes/home' }}
        />
      </Section>

      <Section
        title="No nodes unlocked"
        description="Inline on tree browse. CTA: run placement."
      >
        <EmptyState
          icon={Calendar}
          title="No nodes unlocked"
          body="Run the 90-second placement to set your starting nodes."
          primaryCta={{ label: 'Place me', href: '/onboarding/q1' }}
          secondaryCta={{ label: 'Browse anyway', href: '/wireframes/home' }}
        />
      </Section>
    </div>
  );
}