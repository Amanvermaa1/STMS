import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, ErrorBanner, Field, inputClass } from '../components/ui';

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <LifeBuoy size={24} />
          </span>
          <div>
            <p className="text-lg font-bold text-slate-900">Helpdesk</p>
            <p className="text-xs text-slate-500">Support Ticket Management</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
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
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your support tickets.">
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
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        No account?{' '}
        <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
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
        <Field label="Password" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
