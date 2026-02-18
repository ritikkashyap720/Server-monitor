import { useParams, Link, NavLink, useNavigate } from 'react-router-dom';
import { useMonitor } from '../context/MonitorContext';
import { ArrowLeft, Box, Cpu, MemoryStick, Terminal, LayoutList } from 'lucide-react';
import Sparkline from '../components/Sparkline';
import LogsPanel from '../components/LogsPanel';

const ACCENT_COLOR = '#34d399';
const MEM_COLOR = '#2dd4bf';

function formatBytes(bytes) {
  if (bytes === 0 || bytes == null) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function ContainerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { containers, details, stats, statsHistory, loading, error, formatUptime } = useMonitor();

  const container = containers.find((c) => c.id === id);
  const detail = details[id];
  const stat = stats[id];
  const history = statsHistory.perId[id] || { cpu: [], mem: [] };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="text-slate-400 flex items-center gap-3">
          <span className="inline-block w-5 h-5 border-2 border-accent/50 border-t-accent rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-0">
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-4 text-red-200 max-w-md text-center">
          {error || 'Container not found.'}
          <Link to="/" className="inline-flex items-center gap-2 mt-4 text-accent hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const name = container.name || container.id?.slice(0, 12);
  const startedAt = detail?.startedAt ? new Date(detail.startedAt).toLocaleString() : '—';
  const uptime = detail?.uptimeSeconds != null ? formatUptime(detail.uptimeSeconds) : '—';
  const cpu = stat?.cpu_percent != null ? `${stat.cpu_percent.toFixed(1)}%` : '—';
  const memPercent = stat?.memory_percent != null ? `${stat.memory_percent.toFixed(1)}%` : '—';
  const memUsage = stat?.memory_usage != null ? formatBytes(stat.memory_usage) : '—';
  const memLimit = stat?.memory_limit != null ? formatBytes(stat.memory_limit) : '—';

  return (
    <div className="flex-1 flex min-h-0 w-full">
      {/* Sidebar: container list */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 xl:w-64 shrink-0 border-r border-dark-600 bg-dark-900/80">
        <div className="p-3 border-b border-dark-600 flex items-center gap-2">
          <LayoutList className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Containers</span>
        </div>
        <nav className="flex-1 min-h-0 overflow-auto p-2" aria-label="Containers">
          {containers.map((c) => {
            const cName = c.name || c.id?.slice(0, 12);
            const isActive = c.id === id;
            return (
              <NavLink
                key={c.id}
                to={`/container/${c.id}`}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-mono transition-colors mb-1 ${
                  isActive
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'text-slate-400 hover:bg-dark-600 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Box className="w-4 h-4 shrink-0 opacity-80" />
                <span className="truncate flex-1 min-w-0">{cName}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-2 border-t border-dark-600">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-dark-600 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content: flex column so terminal can take remaining height */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Mobile: container switcher + back */}
        <div className="lg:hidden flex items-center gap-2 p-3 border-b border-dark-600 bg-dark-900/80 shrink-0">
          <Link to="/" className="p-2 rounded-lg text-slate-400 hover:bg-dark-600 hover:text-slate-200" aria-label="Back to Dashboard">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <select
            value={id}
            onChange={(e) => navigate(`/container/${e.target.value}`)}
            className="flex-1 min-w-0 rounded-lg bg-dark-700 border border-dark-600 text-slate-200 font-mono text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            {containers.map((c) => (
              <option key={c.id} value={c.id}>{c.name || c.id?.slice(0, 12)}</option>
            ))}
          </select>
        </div>

        {/* Header: title + status */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 border-b border-dark-600/80">
          <h1 className="text-lg sm:text-xl font-bold font-mono text-accent truncate flex items-center gap-2">
            <Box className="w-5 h-5 shrink-0 text-accent/80" />
            {name}
          </h1>
          <span className="shrink-0 text-xs font-medium px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/30">
            running
          </span>
        </div>

        {/* Stats row: compact cards */}
        <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 border-b border-dark-600/80">
          <div className="rounded-xl border border-dark-600 bg-dark-800/80 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <LayoutList className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider">Overview</span>
            </div>
            <dl className="space-y-1 text-xs m-0">
              <div className="flex justify-between gap-1"><dt className="text-slate-500">Image</dt></div>
              <dd className="font-mono text-slate-300 truncate text-[11px]" title={container.image}>{container.image}</dd>
              <div className="flex justify-between gap-2 mt-2">
                <dt className="text-slate-500">Started</dt>
                <dd className="font-mono text-slate-300 text-[11px]">{startedAt}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Uptime</dt>
                <dd className="font-mono text-slate-300 tabular-nums">{uptime}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-dark-600 bg-dark-800/80 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Cpu className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider">CPU</span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="text-2xl font-bold tabular-nums text-slate-200">{cpu}</span>
              <div className="w-16 h-8 shrink-0">
                <Sparkline values={history.cpu} color={ACCENT_COLOR} height={32} />
              </div>
            </div>
            {stat?.cpu_percent != null && (
              <div className="h-1.5 bg-dark-600 rounded mt-2 overflow-hidden">
                <div className="h-full rounded bg-accent transition-[width] duration-300" style={{ width: `${Math.min(100, stat.cpu_percent)}%` }} />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-dark-600 bg-dark-800/80 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <MemoryStick className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider">Memory</span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="text-2xl font-bold tabular-nums text-slate-200">{memPercent}</span>
              <div className="w-16 h-8 shrink-0">
                <Sparkline values={history.mem} color={MEM_COLOR} height={32} />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">{memUsage} / {memLimit}</p>
            {stat?.memory_percent != null && (
              <div className="h-1.5 bg-dark-600 rounded mt-1 overflow-hidden">
                <div className="h-full rounded bg-teal-400 transition-[width] duration-300" style={{ width: `${Math.min(100, stat.memory_percent)}%` }} />
              </div>
            )}
          </div>

          <div className="col-span-2 lg:col-span-1 rounded-xl border border-dark-600 bg-dark-800/80 p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Terminal className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider">Terminal</span>
            </div>
            <p className="text-xs text-slate-400">Live logs stream below</p>
          </div>
        </div>

        {/* Terminal: takes all remaining vertical space */}
        <div className="flex-1 min-h-[200px] flex flex-col border-t border-dark-600 bg-dark-900/90 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-dark-600 bg-dark-800 shrink-0">
            <Terminal className="w-4 h-4 text-accent/80" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Terminal — {name}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4 flex flex-col">
            <LogsPanel containerId={container.id} fullView terminalStyle />
          </div>
        </div>
      </div>
    </div>
  );
}
