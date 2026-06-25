/**
 * PaywallDialog — modal shown when a user tries to access a paid
 * feature on the free tier.
 *
 * Composes the existing Dialog primitive with a pricing summary +
 * upgrade CTA. Closes on Esc / overlay click and surfaces a primary
 * "Upgrade" button that routes to /pricing.
 *
 * Use it inline from any feature:
 *
 *   const [open, setOpen] = useState(false);
 *   ...
 *   <button onClick={() => setOpen(true)}>Advanced insights</button>
 *   <PaywallDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     feature="Advanced tendon insights"
 *     description="See 12 weeks of strain history instead of 4."
 *   />
 */

import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

export interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Short feature name shown as the headline. */
  feature: string;
  /** 1-2 sentence value prop explaining why this feature is paid. */
  description: string;
  /** Where to send the user when they click "Upgrade". Defaults to /pricing. */
  upgradeHref?: string;
}

export function PaywallDialog({
  open,
  onOpenChange,
  feature,
  description,
  upgradeHref = '/pricing',
}: PaywallDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="paywall-description"
        data-testid="paywall-dialog"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <DialogTitle className="text-lg">
              {feature} is a Pro feature
            </DialogTitle>
          </div>
          <DialogDescription id="paywall-description">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-surface-border bg-surface px-4 py-3 text-sm">
          <p className="font-medium">Calisthenics Tree Pro</p>
          <p className="mt-1 text-surface-fg-muted">
            $5.99/mo · $29.99/yr · $99 lifetime. Cancel anytime.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button
            variant="default"
            onClick={() => {
              onOpenChange(false);
              navigate(upgradeHref);
            }}
          >
            See plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}