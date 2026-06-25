/**
 * Toast — minimal but accessible toast system.
 *
 * Use:
 *   const { toast } = useToast();
 *   toast({ title: 'Set saved', description: 'Next: rest 90s' });
 *
 * Stack rendering is handled by <Toaster />, which should be mounted
 * once at the app root (next to TooltipProvider).
 *
 * Implementation: lightweight ToastProvider with reducer + queue, no
 * external animation lib, no sonner dependency (kept the dep tree
 * minimal).
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

const ToastContext = React.createContext<{
  toast: (t: ToastInput) => void;
  dismiss: (id: string) => void;
} | null>(null);

export type ToastVariant = 'default' | 'success' | 'warning' | 'danger';
export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastInput, 'title' | 'variant' | 'durationMs'>> {
  id: string;
  description?: string;
}

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border p-4 shadow-lg',
  {
    variants: {
      variant: {
        default: 'border-surface-border bg-surface-subtle text-surface-fg',
        success: 'border-success/40 bg-success/10 text-surface-fg',
        warning: 'border-warning/40 bg-warning/10 text-surface-fg',
        danger: 'border-danger/40 bg-danger/10 text-surface-fg',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface ToastProps
  extends Omit<React.HTMLAttributes<HTMLLIElement>, 'id'>,
    VariantProps<typeof toastVariants> {
  id: string;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, variant, className, children, onDismiss }) => (
  <li data-slot="toast" className={cn(toastVariants({ variant }), className)}>
    {children}
    <button
      type="button"
      aria-label="Dismiss"
      onClick={() => onDismiss(id)}
      className="absolute right-2 top-2 rounded-sm text-surface-fg-muted opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <X className="h-4 w-4" aria-hidden />
    </button>
  </li>
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (t: ToastInput) => {
      const id = `t_${Math.random().toString(36).slice(2, 10)}`;
      const item: ToastItem = {
        id,
        title: t.title,
        description: t.description,
        variant: t.variant ?? 'default',
        durationMs: t.durationMs ?? 3500,
      };
      setToasts((cur) => [...cur, item]);
      window.setTimeout(() => dismiss(id), item.durationMs);
    },
    [dismiss],
  );

  const ctx = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ol
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <Toast key={t.id} id={t.id} variant={t.variant} onDismiss={dismiss}>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && (
                <p className="mt-1 text-xs text-surface-fg-muted">{t.description}</p>
              )}
            </div>
          </Toast>
        ))}
      </ol>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export const Toaster: React.FC = () => null; // No-op; the provider renders toasts directly.