import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  PlusCircle,
  ShieldCheck,
  Ticket,
  X,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    api
      .get<{ unread: number }>('/notifications')
      .then((response) => setUnread(response.data.unread))
      .catch(() => undefined);
  }, [location.pathname]);

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tickets', label: 'My tickets', icon: Ticket },
    { to: '/tickets/new', label: 'New ticket', icon: PlusCircle },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin console', icon: ShieldCheck }] : []),
  ];

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {menuOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <LifeBuoy size={20} />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900">Helpdesk</p>
              <p className="text-xs text-slate-500">Ticket management</p>
            </div>
          </div>
          <button className="text-slate-500 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={navLinkClass}>
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {label === 'Notifications' && unread > 0 && (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-rose-600"
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
          <button className="text-slate-600 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline">
            {user?.role === 'admin' ? 'Administrator' : 'User'}
          </span>
          <button
            onClick={() => navigate('/notifications')}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
          </button>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
