/**
 * DangerZone — account-export + account-delete controls.
 *
 * Rendered inline inside the Account section of SettingsPage. Kept in a
 * separate file for clarity so the big SettingsPage stays readable.
 *
 * Per docs/decisions/D19-data-export-deletion.md:
 *   - Export returns a synchronous JSON download (Sprint 24).
 *   - Delete is a SOFT delete with a 7-day grace period. Re-login (or
 *     POST /users/me/restore) cancels the deletion. The daily
 *     purge_deleted_accounts cron hard-deletes after the window.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Download, AlertTriangle, Loader2, RotateCcw } from 'lucide-react';

import {
  deleteMe,
  requestExport,
  restoreMe,
  ApiError,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/button';

export function DangerZone() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Post-delete grace-period banner. Null = no pending deletion.
  const [pendingDeletion, setPendingDeletion] = useState<Date | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      const { blob, filename } = await requestExport();
      // Trigger a save-as by creating an anchor and clicking it. The
      // Blob URL is revoked after a short delay so we don't leak it.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMsg(`Downloaded ${filename}.`);
    } catch (err) {
      setExportMsg(
        err instanceof ApiError
          ? `${err.status} ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Unknown error',
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== user?.email) {
      setDeleteError('Email does not match.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMe();
      // Per D19: show a banner with the deletion date + a Cancel
      // option. Don't sign out yet — the user can still see this
      // banner and reverse the action.
      setPendingDeletion(new Date());
      setConfirmingDelete(false);
      setDeleteInput('');
    } catch (err) {
      setDeleteError(
        err instanceof ApiError
          ? `${err.status} ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Unknown error',
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restoreMe();
      setPendingDeletion(null);
    } catch {
      // Swallow — the user can just log out + log back in to restore.
    } finally {
      setRestoring(false);
    }
  };

  // Grace window: 7 days. Must match the backend's purge cutoff.
  const GRACE_DAYS = 7;
  const deletionDeadline = pendingDeletion
    ? new Date(pendingDeletion.getTime() + GRACE_DAYS * 86400 * 1000)
    : null;

  return (
    <section
      aria-labelledby="danger-heading"
      className="mt-8 space-y-4 rounded-lg border border-danger/30 bg-danger/5 p-4"
      data-testid="settings-danger-zone"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle aria-hidden className="h-5 w-5 text-danger" />
        <h2
          id="danger-heading"
          className="text-base font-semibold text-danger"
        >
          Account data
        </h2>
      </div>

      {/* Export */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Export your data</p>
            <p className="text-xs text-surface-fg-muted">
              Download a JSON dump of every workout, set, and unlock.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            data-testid="settings-export"
          >
            {exporting ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Download aria-hidden className="h-4 w-4" />
            )}
            Request export
          </Button>
        </div>
        {exportMsg && (
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-surface-fg-muted"
          >
            {exportMsg}
          </p>
        )}
      </div>

      <hr className="border-danger/20" />

      {/* Soft-delete pending banner — D19 §deletion grace period */}
      {pendingDeletion && deletionDeadline && (
        <div
          role="alert"
          data-testid="settings-delete-pending"
          className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
        >
          <p className="font-medium text-amber-700">
            Account scheduled for deletion
          </p>
          <p className="text-xs text-surface-fg-muted">
            Your account, workouts, sets, and unlocks will be permanently
            deleted on{' '}
            <span className="font-mono">
              {deletionDeadline.toLocaleDateString()}
            </span>
            . Log in (or click below) any time before then to cancel.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleRestore}
              disabled={restoring}
              data-testid="settings-restore"
            >
              {restoring ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw aria-hidden className="h-4 w-4" />
              )}
              Cancel deletion
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                setPendingDeletion(null);
                // Sprint 38 RED-7: await so server-side cookie clear
                // completes before navigation.
                await signOut();
                navigate('/login', { replace: true });
              }}
            >
              Sign out anyway
            </Button>
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Delete account</p>
          <p className="text-xs text-surface-fg-muted">
            Permanent. All workouts, sets, and unlocks are wiped. No undo.
          </p>
        </div>

        {!confirmingDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmingDelete(true)}
            data-testid="settings-delete-start"
            className="border-danger/30 text-danger hover:bg-danger/10"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            Delete my account
          </Button>
        ) : (
          <div className="space-y-2 rounded-md border border-danger/40 bg-surface p-3">
            <label htmlFor="delete-confirm" className="block text-xs font-medium">
              Type your email ({user?.email}) to confirm:
            </label>
            <input
              id="delete-confirm"
              type="email"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              autoComplete="off"
              className="block w-full rounded-md border border-surface-border bg-surface px-3 py-2 font-mono text-sm"
              data-testid="settings-delete-confirm-input"
            />
            {deleteError && (
              <p
                role="alert"
                className="text-xs text-danger"
              >
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteInput('');
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleDelete}
                disabled={deleting || deleteInput !== user?.email}
                data-testid="settings-delete-confirm"
                className="bg-danger text-white hover:bg-danger/90"
              >
                {deleting && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                Delete forever
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}