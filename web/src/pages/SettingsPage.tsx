import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  browserSupportsWebAuthn,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/browser';
import { Download, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { track } from '../api/analytics';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  ErrorBanner,
  Field,
  Modal,
  PageHeader,
  Skeleton,
  inputClass,
  useToast,
} from '../components/ui';
import type { PasskeySummary, UserPreferences } from '../types';

const WIDGET_OPTIONS = [
  { id: 'summary', label: 'Overview cards', description: 'Ticket totals at a glance.' },
  { id: 'recent', label: 'Recent tickets', description: 'The latest tickets you are working on.' },
  { id: 'priority', label: 'Priority breakdown', description: 'How urgent your tickets are.' },
  { id: 'insights', label: 'Product insights', description: 'Anonymous usage signals (administrators only).' },
];

export function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const passkeysSupported = browserSupportsWebAuthn();

  useEffect(() => {
    Promise.all([
      api.get<{ preferences: UserPreferences }>('/me/preferences'),
      api.get<{ passkeys: PasskeySummary[] }>('/passkeys'),
    ])
      .then(([preferencesResponse, passkeysResponse]) => {
        setPreferences(preferencesResponse.data.preferences);
        setPasskeys(passkeysResponse.data.passkeys);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function savePrivacy(patch: NonNullable<UserPreferences['privacy']>) {
    setError('');
    setBusy(true);
    try {
      const { data } = await api.patch<{ preferences: UserPreferences }>('/me/preferences', { privacy: patch });
      setPreferences(data.preferences);
      toast('Privacy settings saved.');
      track('settings.updated', { area: 'privacy' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleWidget(widgetId: string, enabled: boolean) {
    const current = preferences.dashboard?.widgets ?? ['summary', 'recent', 'priority'];
    const next = enabled ? [...current, widgetId] : current.filter((id) => id !== widgetId);
    setError('');
    setBusy(true);
    try {
      const { data } = await api.patch<{ preferences: UserPreferences }>('/me/preferences', {
        dashboard: { widgets: next },
      });
      setPreferences(data.preferences);
      toast('Dashboard layout updated.');
      track('settings.updated', { area: 'dashboard' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadPasskeys() {
    const { data } = await api.get<{ passkeys: PasskeySummary[] }>('/passkeys');
    setPasskeys(data.passkeys);
  }

  async function addPasskey() {
    setError('');
    setPasskeyBusy(true);
    try {
      const { data: options } = await api.post<PublicKeyCredentialCreationOptionsJSON>(
        '/passkeys/register/options',
      );
      const response = await startRegistration({ optionsJSON: options });
      await api.post('/passkeys/register/verify', response);
      await loadPasskeys();
      toast('Passkey added. You can use it the next time you sign in.');
      track('settings.updated', { area: 'passkey_added' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function removePasskey(passkeyId: string) {
    setError('');
    setPasskeyBusy(true);
    try {
      await api.delete(`/passkeys/${passkeyId}`);
      await loadPasskeys();
      toast('Passkey removed.');
      track('settings.updated', { area: 'passkey_removed' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function exportData() {
    setError('');
    try {
      const { data } = await api.get<{ data: unknown }>('/me/data');
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stms-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast('Your data export is ready.');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function deleteAccount() {
    if (!password) {
      setError('Enter your password to confirm account deletion.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.delete('/me/data', { data: { password } });
      setDeleteOpen(false);
      await logout();
      toast('Your account and related data were deleted.');
      navigate('/login');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const analyticsOptIn = preferences.privacy?.analyticsOptIn !== false;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle="Choose how your helpdesk looks and what data we keep." />

      <div aria-live="polite">
        {error && <div className="mb-5"><ErrorBanner message={error} /></div>}
      </div>

      <section className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <ShieldCheck size={19} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-stone-900">Privacy & trust</h2>
            <p className="text-xs text-stone-500">You stay in control. Nothing here changes your ability to use the helpdesk.</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-4 transition hover:bg-stone-50">
            <input
              type="checkbox"
              checked={analyticsOptIn}
              disabled={busy}
              onChange={(event) => savePrivacy({ analyticsOptIn: event.target.checked })}
              className="mt-1 h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="block text-sm font-medium text-stone-800">Share anonymous usage signals</span>
              <span className="mt-1 block text-xs leading-relaxed text-stone-500">
                Helps us improve the app. We never send ticket titles, descriptions, or your name in these signals.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-4 transition hover:bg-stone-50">
            <input
              type="checkbox"
              checked={preferences.privacy?.productUpdatesOptIn ?? false}
              disabled={busy}
              onChange={(event) => savePrivacy({ productUpdatesOptIn: event.target.checked })}
              className="mt-1 h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="block text-sm font-medium text-stone-800">Product updates</span>
              <span className="mt-1 block text-xs leading-relaxed text-stone-500">
                Occasional emails about new helpdesk features. No marketing noise.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900">Dashboard widgets</h2>
        <p className="mt-1 text-xs text-stone-500">Choose what appears on your dashboard and in which order.</p>
        <div className="mt-4 space-y-2">
          {WIDGET_OPTIONS.map((widget) => {
            const selected = (preferences.dashboard?.widgets ?? ['summary', 'recent', 'priority']).includes(widget.id);
            return (
              <label key={widget.id} className="flex items-center gap-3 rounded-lg border border-stone-200 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={busy}
                  onChange={(event) => toggleWidget(widget.id, event.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="flex-1">
                  <span className="font-medium text-stone-800">{widget.label}</span>
                  <span className="ml-2 text-xs text-stone-500">{widget.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <KeyRound size={19} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Passkeys</h2>
              <p className="text-xs text-stone-500">Sign in without a password. Your password still works.</p>
            </div>
          </div>
          {passkeysSupported && (
            <Button variant="secondary" onClick={addPasskey} disabled={passkeyBusy || busy} className="px-3 py-2">
              <KeyRound size={15} /> {passkeyBusy ? 'Waiting…' : 'Add passkey'}
            </Button>
          )}
        </div>

        {!passkeysSupported ? (
          <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-500">
            This browser does not support passkeys. You can keep using your password.
          </p>
        ) : passkeys.length === 0 ? (
          <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-500">
            No passkeys yet. Add one to sign in with your fingerprint, face, or device PIN.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
            {passkeys.map((passkey) => (
              <li key={passkey.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                  <KeyRound size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-800">
                    Passkey {passkey.label}
                  </p>
                  <p className="text-xs text-stone-500">
                    {passkey.deviceType.replace(/_/g, ' ')} · added {new Date(passkey.createdAt).toLocaleDateString()}
                    {passkey.backedUp ? ' · synced' : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="px-2.5 py-1.5 text-xs text-danger-700"
                  onClick={() => removePasskey(passkey.id)}
                  disabled={passkeyBusy}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-stone-900">Your data</h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          Download a copy of your account, tickets, comments, notifications, and activity. Deleting your account is permanent and cannot be undone.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportData}>
            <Download size={16} /> Export my data
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={16} /> Delete account
          </Button>
        </div>
      </section>

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setPassword('');
          setError('');
        }}
        onConfirm={deleteAccount}
        title="Delete your account?"
        description="This permanently removes your account, tickets, comments, and notifications. Type your password to confirm."
        confirmLabel="Delete account"
        busy={busy}
      >
        <div className="mt-4">
          <Field label="Password" htmlFor="delete-password">
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your current password"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
