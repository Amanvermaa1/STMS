import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ActivityEntry as Activity, Priority, Status } from '../types';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500',
  secondary: 'bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50 focus:ring-brand-500',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-600',
  ghost: 'bg-transparent text-stone-600 hover:bg-stone-100 focus:ring-stone-400',
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
  open: 'bg-orange-50 text-orange-700 ring-orange-200',
  in_progress: 'bg-warning-50 text-warning-700 ring-warning-200',
  resolved: 'bg-success-50 text-success-700 ring-success-200',
  closed: 'bg-stone-100 text-stone-600 ring-stone-200',
};

const priorityStyles: Record<Priority, string> = {
  low: 'bg-stone-100 text-stone-600 ring-stone-200',
  medium: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
  high: 'bg-orange-50 text-orange-700 ring-orange-200',
  urgent: 'bg-danger-50 text-danger-700 ring-danger-200',
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
  return <span className={badgeClass('bg-amber-50 text-amber-800 ring-amber-200')}>{category.replace('_', ' ')}</span>;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, required = true, className = '', children }: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}
        {!required && <span className="ml-1.5 text-xs font-normal text-stone-400">optional</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  'block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm ring-1 ring-inset ring-stone-300 placeholder:text-stone-400 focus:ring-2 focus:ring-brand-500';

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-md ${className}`} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading content">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
        </div>
      ))}
      <span className="sr-only">Loading content</span>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="animate-fade-in rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
      <span className="font-semibold">Something went wrong.</span> {message}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Info size={20} />
      </div>
      <p className="font-semibold text-stone-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function formatDate(value: string | Date): string {
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
    return <p className="text-sm text-stone-500">Nothing has happened on this ticket yet. We'll show updates here as they come in.</p>;
  }
  return (
    <ol className="relative space-y-5 border-l border-stone-200 pl-5">
      {activity.map((entry) => (
        <li key={entry.id} className="relative animate-fade-in">
          <span className="absolute -left-[1.6rem] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" />
          <p className="text-sm font-semibold text-stone-800">{humanizeEvent(entry.eventType)}</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {entry.actorName ?? entry.actorRole} · {formatDate(entry.createdAt)}
          </p>
          {Boolean(entry.metadata?.to) && (
            <p className="mt-1 text-xs font-medium text-brand-600">→ {String(entry.metadata.to)}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

type ToastTone = 'success' | 'info' | 'error';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastTone, string> = {
  success: 'border-success-200 bg-success-50 text-success-700',
  info: 'border-brand-200 bg-brand-50 text-brand-700',
  error: 'border-danger-200 bg-danger-50 text-danger-700',
};

const toastIcons: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  info: Info,
  error: XCircle,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-relevant="additions">
        {toasts.map((item) => {
          const Icon = toastIcons[item.tone];
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${toastStyles[item.tone]}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <span className="flex-1 font-medium">{item.message}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                className="shrink-0 opacity-70 hover:opacity-100"
                onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  tone?: 'danger' | 'primary';
  children?: ReactNode;
}

export function Modal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  busy = false,
  tone = 'danger',
  children,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    const previousFocus = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-stone-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md animate-slide-up rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-danger-50 text-danger-600">
          <AlertTriangle size={20} />
        </div>
        <h2 id={titleId} className="text-lg font-bold text-stone-900">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-stone-600">
          {description}
        </p>
        {children}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy} autoFocus>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
