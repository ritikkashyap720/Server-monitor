import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMonitor } from '../context/MonitorContext';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Activity, LogOut } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const { connected } = useMonitor();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }
  return (
    <div className="flex flex-col h-screen max-h-screen w-full bg-dark-950 overflow-hidden">
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-2 sm:gap-3 md:gap-4 px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 border-b border-dark-600/80 bg-dark-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
          <h1 className="text-sm sm:text-base md:text-lg font-semibold text-slate-200 truncate">Server Monitor</h1>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
            <NavLink
              to="/"
              end
              aria-label="Dashboard"
              className={({ isActive }) =>
                `inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 md:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-touch min-w-[2.75rem] xs:min-w-0 ${
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-600/80 border border-transparent'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">Dashboard</span>
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 py-1">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Activity className={`w-4 h-4 shrink-0 ${connected ? 'text-accent' : 'text-amber-500'}`} />
            <span className="tabular-nums text-slate-400">{connected ? 'Live' : 'Reconnecting…'}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="p-2 rounded-lg text-slate-400 hover:bg-dark-600 hover:text-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
