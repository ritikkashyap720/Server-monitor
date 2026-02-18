import { NavLink, Outlet } from 'react-router-dom';
import { useMonitor } from '../context/MonitorContext';
import { LayoutDashboard, Maximize2, Activity } from 'lucide-react';

export default function Layout() {
  const { connected } = useMonitor();
  return (
    <div className="flex flex-col min-h-screen min-h-dvh w-full bg-dark-950">
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-5 sm:py-3 border-b border-dark-600/80 bg-dark-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-slate-200 truncate">Server Monitor</h1>
          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink
              to="/"
              end
              aria-label="Dashboard"
              className={({ isActive }) =>
                `inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-w-[3rem] sm:min-w-0 ${
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-600/80 border border-transparent'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">Dashboard</span>
            </NavLink>
            <NavLink
              to="/view"
              aria-label="Full view"
              className={({ isActive }) =>
                `inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-w-[3rem] sm:min-w-0 ${
                  isActive
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-600/80 border border-transparent'
                }`
              }
            >
              <Maximize2 className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">Full view</span>
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm shrink-0">
          <Activity className={`w-4 h-4 shrink-0 ${connected ? 'text-accent' : 'text-amber-500'}`} />
          <span className="tabular-nums text-slate-400">{connected ? 'Live' : 'Reconnecting…'}</span>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
