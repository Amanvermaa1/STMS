import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import api from '../api/client';
import { track } from '../api/analytics';
import { useAuth } from '../auth/AuthContext';
import { AssistantDrawer } from './AssistantDrawer';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
  }`;

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const closeMenuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    api
      .get<{ unread: number }>('/notifications')
      .then((response) => setUnread(response.data.unread))
      .catch(() => undefined);
    track('ticket.view', { path: location.pathname.slice(0, 80) });
  }, [location.pathname]);

  useEffect(() => {
    if (menuOpen) closeMenuRef.current?.focus();
  }, [menuOpen]);

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tickets', label: 'My tickets', icon: Ticket },
    { to: '/tickets/new', label: 'New ticket', icon: PlusCircle },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin console', icon: ShieldCheck }] : []),
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-cream-50 text-stone-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to content
      </a>

      {menuOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-stone-900/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-stone-200 bg-white transition-transform lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-stone-200 px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <LifeBuoy size={20} />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight text-stone-900">Helpdesk</p>
              <p className="text-xs text-stone-500">Ticket management</p>
            </div>
          </div>
          <button
            ref={closeMenuRef}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={navLinkClass}>
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {label === 'Notifications' && unread > 0 && (
                <span aria-label={`${unread} unread notifications`} className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-stone-200 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-cream-100 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-800">{user?.name}</p>
              <p className="truncate text-xs text-stone-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-danger-700"
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-stone-200 bg-white/90 px-4 backdrop-blur sm:px-8">
          <button
            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-controls="app-sidebar"
            aria-expanded={menuOpen}
          >
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setAssistantOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
            aria-label="Open ticket assistant"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Ask assistant</span>
          </button>
          <span className="hidden rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600 sm:inline">
            {user?.role === 'admin' ? 'Administrator' : 'User'}
          </span>
          <button
            onClick={() => navigate('/notifications')}
            className="relative rounded-lg p-2 text-stone-500 hover:bg-stone-100"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          >
            <Bell size={20} />
            {unread > 0 && <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-danger-600 ring-2 ring-white" />}
          </button>
        </header>
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>

      <AssistantDrawer open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
