import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ActivityEntry as Activity, Priority, Status } from '../types';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 focus:ring-indigo-500',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-400',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

const statusStyles: Record<Status, string> = {
  open: 'bg-blue-50 text-blue-700 ring-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closed: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const priorityStyles: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
  medium: 'bg-sky-50 text-sky-700 ring-sky-200',
  high: 'bg-orange-50 text-orange-700 ring-orange-200',
  urgent: 'bg-rose-50 text-rose-700 ring-rose-200',
};

function badgeClass(tone: string) {
  return `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`;
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={badgeClass(statusStyles[status])}>{status.replace('_', ' ')}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={badgeClass(priorityStyles[priority])}>{priority}</span>;
}

export function CategoryBadge({ category }: { category: string }) {
  return <span className={badgeClass('bg-violet-50 text-violet-700 ring-violet-200')}>{category.replace('_', ' ')}</span>;
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  'block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500';

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      {message}
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function humanizeEvent(type: string): string {
  return type.replace(/^ticket\./, '').replace(/\./g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ActivityEntry({ activity }: { activity: Activity[] }) {
  if (activity.length === 0) {
    return <p className="text-sm text-slate-500">No activity recorded yet.</p>;
  }
  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-5">
      {activity.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 ring-1 ring-indigo-200" />
          <p className="text-sm font-semibold text-slate-800">{humanizeEvent(entry.eventType)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {entry.actorName ?? entry.actorRole} · {formatDate(entry.createdAt)}
          </p>
          {Boolean(entry.metadata?.to) && (
            <p className="mt-1 text-xs font-medium text-indigo-600">→ {String(entry.metadata.to)}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
