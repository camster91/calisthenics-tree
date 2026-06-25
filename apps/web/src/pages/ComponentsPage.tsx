/**
 * ComponentsPage — visual reference for the design system.
 *
 * Two themes are demonstrated side-by-side by toggling the gym-glare
 * class on <html data-theme>. The page is for human reviewers (and
 * axe-core audits) — not part of the production app shell.
 *
 * Sections:
 *   1. Buttons       (shadcn/ui button)
 *   2. Inputs        (input, label, select, tabs, checkbox-via-button)
 *   3. Overlays      (dialog, sheet, dropdown-menu, tooltip, toast)
 *   4. Surfaces      (card, badge, separator, progress)
 *   5. Workout       (WorkoutTimer, RepCounter, SetChecklist,
 *                     NodeCard, NodeTree, TendonStrainCard,
 *                     RegressionPrompt, UnlockShareCard)
 *
 * The /components route is registered in App.tsx and shows up in the
 * primary nav as "Showcase".
 */
import { useState } from 'react';
import { Info, MoreVertical, Sun, Moon } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import { ToastProvider, useToast } from '../components/ui/toast';
import { WorkoutTimer } from '../components/workout/WorkoutTimer';
import { RepCounter } from '../components/workout/RepCounter';
import { SetChecklist } from '../components/workout/SetChecklist';
import { NodeCard } from '../components/workout/NodeCard';
import { NodeTree } from '../components/workout/NodeTree';
import { TendonStrainCard } from '../components/workout/TendonStrainCard';
import { RegressionPrompt } from '../components/workout/RegressionPrompt';
import { UnlockShareCard } from '../components/workout/UnlockShareCard';
import type { WorkoutNode, TendonPathwayStatus } from '../components/workout/types';
import { setTheme, useTheme } from '../lib/theme';

const SAMPLE_NODES: WorkoutNode[] = [
  {
    id: 'n1',
    name: 'Plank hold',
    movementType: 'isometric',
    targetSets: 3,
    targetReps: null,
    targetHoldSecs: 30,
    intensityFactor: 0.15,
    pathways: ['core_lumbar'],
    state: 'locked',
  },
  {
    id: 'n2',
    name: 'Dead hang',
    movementType: 'isometric',
    targetSets: 3,
    targetReps: null,
    targetHoldSecs: 20,
    intensityFactor: 0.18,
    pathways: ['bent_arm_shoulder'],
    state: 'unlocked',
  },
  {
    id: 'n3',
    name: 'Negative pull-up',
    movementType: 'isotonic',
    targetSets: 3,
    targetReps: 5,
    targetHoldSecs: null,
    intensityFactor: 0.45,
    pathways: ['bent_arm_elbow', 'bent_arm_shoulder'],
    state: 'unlocked',
  },
  {
    id: 'n4',
    name: 'Tuck front lever',
    movementType: 'isometric',
    targetSets: 3,
    targetReps: null,
    targetHoldSecs: 10,
    intensityFactor: 0.62,
    pathways: ['bent_arm_shoulder', 'core_lumbar'],
    state: 'current',
  },
  {
    id: 'n5',
    name: 'Advanced tuck FL',
    movementType: 'isometric',
    targetSets: 4,
    targetReps: null,
    targetHoldSecs: 8,
    intensityFactor: 0.75,
    pathways: ['bent_arm_shoulder', 'core_lumbar'],
    state: 'locked',
  },
  {
    id: 'n6',
    name: 'Straddle front lever',
    movementType: 'isometric',
    targetSets: 4,
    targetReps: null,
    targetHoldSecs: 6,
    intensityFactor: 0.9,
    pathways: ['bent_arm_shoulder', 'core_lumbar'],
    state: 'locked',
  },
  {
    id: 'n7',
    name: 'Full front lever',
    movementType: 'isometric',
    targetSets: 4,
    targetReps: null,
    targetHoldSecs: 5,
    intensityFactor: 0.95,
    pathways: ['bent_arm_shoulder', 'core_lumbar'],
    state: 'locked',
  },
];

const SAMPLE_EDGES = [
  { from: 'n1', to: 'n2' },
  { from: 'n2', to: 'n3' },
  { from: 'n3', to: 'n4' },
  { from: 'n4', to: 'n5' },
  { from: 'n5', to: 'n6' },
  { from: 'n6', to: 'n7' },
];

const SAMPLE_TENDON: TendonPathwayStatus[] = [
  {
    pathway: 'bent_arm_elbow',
    status: 'ok',
    sparkline: [42, 48, 51, 49],
  },
  {
    pathway: 'bent_arm_shoulder',
    status: 'watch',
    sparkline: [55, 62, 70, 74],
  },
  {
    pathway: 'core_lumbar',
    status: 'ok',
    sparkline: [38, 40, 42, 41],
  },
  {
    pathway: 'wrist',
    status: 'deload',
    sparkline: [60, 70, 80, 88],
  },
];

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 space-y-1">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="text-sm text-surface-fg-muted">{description}</p>}
    </div>
  );
}

function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="default" onClick={() => toast({ title: 'Set saved', description: 'Rest 90s.' })}>
        Default toast
      </Button>
      <Button
        variant="default"
        onClick={() =>
          toast({ variant: 'success', title: 'New unlock!', description: 'Tuck front lever.' })
        }
      >
        Success
      </Button>
      <Button
        variant="default"
        onClick={() =>
          toast({ variant: 'warning', title: 'Watch your elbows', description: 'Strain trending up.' })
        }
      >
        Warning
      </Button>
      <Button
        variant="default"
        onClick={() =>
          toast({ variant: 'danger', title: 'Sync failed', description: 'Will retry on next save.' })
        }
      >
        Danger
      </Button>
    </div>
  );
}

export default function ComponentsPage() {
  const [theme] = useTheme();
  const [reps, setReps] = useState(8);
  const [completedSets, setCompletedSets] = useState<number[]>([0, 1]);
  const [showRegress, setShowRegress] = useState(false);
  const [tab, setTab] = useState('default');

  return (
    <ToastProvider>
      <TooltipProvider delayDuration={150}>
        <div className="space-y-12">
          {/* Header with theme toggle */}
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="chip">Phase 1.5 · T35</p>
              <h1 className="text-4xl font-semibold leading-tight">Component showcase</h1>
              <p className="max-w-xl text-surface-fg-muted">
                Visual reference for the shadcn-style UI primitives and the custom
                workout components. Use the theme switcher in the header to verify
                the gym-glare variant renders correctly.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                {theme === 'gym-glare' ? (
                  <Sun className="h-3 w-3" aria-hidden />
                ) : (
                  <Moon className="h-3 w-3" aria-hidden />
                )}
                {theme}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTheme(theme === 'gym-glare' ? 'default' : 'gym-glare')}
              >
                Toggle theme
              </Button>
            </div>
          </header>

          {/* 1. Buttons */}
          <section aria-labelledby="sec-buttons">
            <SectionHeader
              title="1. Buttons"
              description="Primary, destructive, outline, ghost, link — with size variants."
            />
            <Card>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button>Default</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Separator orientation="vertical" className="mx-2 h-8" />
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">XL</Button>
              </CardContent>
            </Card>
          </section>

          {/* 2. Inputs */}
          <section aria-labelledby="sec-inputs">
            <SectionHeader title="2. Inputs" description="Input, label, select, tabs." />
            <Card>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Body weight (kg)</Label>
                  <Input id="weight" type="number" defaultValue={72} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tree">Tree</Label>
                  <Select defaultValue="push">
                    <SelectTrigger id="tree">
                      <SelectValue placeholder="Choose a tree" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">Vertical Push</SelectItem>
                      <SelectItem value="pull">Horizontal Pull</SelectItem>
                      <SelectItem value="core">Core</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invalid">Invalid example</Label>
                  <Input id="invalid" invalid placeholder="Something's off" defaultValue="nope@" />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 3. Overlays */}
          <section aria-labelledby="sec-overlays">
            <SectionHeader
              title="3. Overlays"
              description="Dialog, sheet, dropdown, tooltip, toast — accessible by default."
            />
            <Card>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Open dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Unlock advanced tuck FL?</DialogTitle>
                      <DialogDescription>
                        This is a one-time confirmation. You can revert from the
                        progression screen.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="ghost">Cancel</Button>
                      <Button>Confirm</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" onClick={() => setShowRegress(true)}>
                  Open regression sheet
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" aria-label="More actions">
                      <MoreVertical className="h-4 w-4" aria-hidden /> Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Workout</DropdownMenuLabel>
                    <DropdownMenuItem>Reset</DropdownMenuItem>
                    <DropdownMenuItem>Skip set</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Mark complete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="About this section">
                      <Info className="h-4 w-4" aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hover-target floor: 48dp.</TooltipContent>
                </Tooltip>
              </CardContent>

              <Separator />

              <CardContent className="space-y-3">
                <p className="text-sm font-medium">Toasts</p>
                <ToastDemo />
              </CardContent>
            </Card>
          </section>

          {/* 4. Surfaces */}
          <section aria-labelledby="sec-surfaces">
            <SectionHeader title="4. Surfaces" description="Card, badge, separator, progress." />
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Card title</CardTitle>
                  <CardDescription>Card description text.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="primary">Primary</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="danger">Danger</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </CardContent>
                <Separator />
                <CardFooter className="flex-col items-start gap-2">
                  <Progress value={68} aria-label="Workout completion" />
                  <p className="text-xs text-surface-fg-muted">68% of weekly volume</p>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tabs</CardTitle>
                  <CardDescription>Radix-based, keyboard navigable.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={tab} onValueChange={setTab}>
                    <TabsList>
                      <TabsTrigger value="default">Default</TabsTrigger>
                      <TabsTrigger value="compact">Compact</TabsTrigger>
                      <TabsTrigger value="dense">Dense</TabsTrigger>
                    </TabsList>
                    <TabsContent value="default" className="pt-3 text-sm text-surface-fg-muted">
                      Standard spacing.
                    </TabsContent>
                    <TabsContent value="compact" className="pt-3 text-sm text-surface-fg-muted">
                      Tighter for mobile.
                    </TabsContent>
                    <TabsContent value="dense" className="pt-3 text-sm text-surface-fg-muted">
                      Smallest for cards.
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 5. Workout */}
          <section aria-labelledby="sec-workout">
            <SectionHeader
              title="5. Workout components"
              description="Timer, counter, sets, node cards, DAG tree, tendon strain, regression prompt, share card."
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>WorkoutTimer</CardTitle>
                  <CardDescription>Hold to pause · double-tap to restart.</CardDescription>
                </CardHeader>
                <CardContent>
                  <WorkoutTimer durationSecs={90} label="HOLD" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>RepCounter + SetChecklist</CardTitle>
                  <CardDescription>Tap +/- or a set square.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RepCounter value={reps} onChange={setReps} label="Pull-ups" />
                  <SetChecklist
                    total={5}
                    completed={completedSets}
                    onChange={setCompletedSets}
                    label="Set 1"
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>NodeCard</CardTitle>
                <CardDescription>One locked, one current, one unlocked.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <NodeCard
                  node={SAMPLE_NODES[0]}
                  onSelect={(n) => alert(`Select: ${n.name}`)}
                />
                <NodeCard
                  node={SAMPLE_NODES[3]}
                  onSelect={(n) => alert(`Select: ${n.name}`)}
                />
                <NodeCard
                  node={SAMPLE_NODES[2]}
                  onSelect={(n) => alert(`Select: ${n.name}`)}
                />
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>NodeTree</CardTitle>
                <CardDescription>SVG DAG, dagre layout. Hover to highlight prerequisite chain.</CardDescription>
              </CardHeader>
              <CardContent>
                <NodeTree
                  nodes={SAMPLE_NODES}
                  edges={SAMPLE_EDGES}
                  onSelect={(n) => alert(`Selected: ${n.name}`)}
                />
              </CardContent>
            </Card>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <TendonStrainCard statuses={SAMPLE_TENDON} />

              <Card>
                <CardHeader>
                  <CardTitle>UnlockShareCard</CardTitle>
                  <CardDescription>T39 rasterizes this to PNG.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <UnlockShareCard
                    treeName="Horizontal Pull"
                    nodeName="Tuck Front Lever"
                    unlockedOn="Jun 25, 2026"
                    preview
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* RegressionPrompt sheet — controlled by the button above */}
          <RegressionPrompt
            open={showRegress}
            variant="advanced tuck FL"
            reason="elbow strain trending up"
            onAccept={() => setShowRegress(false)}
            onDismiss={() => setShowRegress(false)}
          />
        </div>
      </TooltipProvider>
    </ToastProvider>
  );
}