/**
 * RegressionPrompt — bottom-anchored modal sheet that asks the user
 * to swap to an easier variant mid-workout.
 *
 * - One-tap confirm or dismiss.
 * - Does not block the workout itself; rendered as a non-modal sheet
 *   so the user can finish the current rep while reading.
 * - Accessible: dialog role, focus trap, Esc to dismiss, return focus
 *   to the trigger (handled by Radix).
 */
import { ArrowDown, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { Button } from '../ui/button';

export interface RegressionPromptProps {
  open: boolean;
  /** Variant being suggested. e.g. "advanced tuck front lever". */
  variant: string;
  /** Reason for the regression, e.g. "elbow strain trending up". */
  reason?: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export function RegressionPrompt({
  open,
  variant,
  reason,
  onAccept,
  onDismiss,
}: RegressionPromptProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onDismiss()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t-2 border-warning/60 bg-surface-subtle"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ArrowDown className="h-5 w-5 text-warning" aria-hidden />
            Swap to a regression?
          </SheetTitle>
          <SheetDescription>
            Switch the next set to <strong className="text-surface-fg">{variant}</strong>
            {reason ? <> — {reason}.</> : <>?</>}
          </SheetDescription>
        </SheetHeader>

        <SheetFooter className="mt-4 gap-2">
          <Button variant="ghost" size="lg" onClick={onDismiss}>
            <X className="h-4 w-4" aria-hidden />
            Keep current
          </Button>
          <Button variant="default" size="lg" onClick={onAccept} className="flex-1">
            Swap to {variant}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}