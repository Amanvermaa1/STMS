import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LifeBuoy, KeyRound } from 'lucide-react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, ErrorBanner, Field, inputClass, useToast } from '../components/ui';

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-cream-50 to-yellow-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-200">
            <LifeBuoy size={24} />
          </span>
          <div>
            <p className="text-lg font-bold text-stone-900">Helpdesk</p>
            <p className="text-xs text-stone-500">Support Ticket Management</p>
          </div>
        </div>
        <div className="animate-slide-up rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-200/60">
          <h1 className="text-xl font-bold text-stone-900">{title}</h1>
          <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder: string;
  minLength?: number;
}

function PasswordInput({ id, value, onChange, autoComplete, placeholder, minLength }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className={`${inputClass} pr-11`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

export function LoginPage() {
  const { user, loading, login, loginWithPasskey } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const passkeysSupported = browserSupportsWebAuthn();

  if (!loading && user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      toast('You are signed in. Welcome back!');
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithPasskey() {
    setError('');
    setPasskeyBusy(true);
    try {
      await loginWithPasskey(email.trim() || undefined);
      toast('Signed in with your passkey.');
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPasskeyBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to pick up where you left off.">
      <form onSubmit={submit} className="space-y-5">
        {error && <ErrorBanner message={error} />}
        <Field label="Email address" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="Your password"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Signing you in…' : 'Sign in'}
        </Button>
      </form>
      {passkeysSupported && (
        <div className="mt-5">
          <div className="mb-4 flex items-center gap-3 text-xs text-stone-400">
            <span className="h-px flex-1 bg-stone-200" /> or <span className="h-px flex-1 bg-stone-200" />
          </div>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy || passkeyBusy}
            onClick={signInWithPasskey}
          >
            <KeyRound size={16} /> {passkeyBusy ? 'Waiting for your passkey…' : 'Sign in with a passkey'}
          </Button>
          <p className="mt-2 text-center text-xs text-stone-500">
            Enter your email above if you want us to use a specific passkey.
          </p>
        </div>
      )}
      <p className="mt-6 text-center text-sm text-stone-500">
        No account?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(name, email, password);
      toast('Your account is ready. Let’s get that ticket sorted.');
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Raise tickets and track their progress.">
      <form onSubmit={submit} className="space-y-5">
        {error && <ErrorBanner message={error} />}
        <Field label="Full name" htmlFor="name">
          <input
            id="name"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jane Doe"
          />
        </Field>
        <Field label="Email address" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint="Use at least 8 characters. A mix of words and numbers works well."
        >
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
          />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-500">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
