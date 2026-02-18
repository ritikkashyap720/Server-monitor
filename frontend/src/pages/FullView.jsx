import { Link } from 'react-router-dom';
import { Box, ExternalLink } from 'lucide-react';
import { useMonitor } from '../context/MonitorContext';
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

function FullViewTile({ container, detail, stat, history, formatUptime }) {
  const name = container.name || container.id?.slice(0, 12);
  const startedAt = detail?.startedAt ? new Date(detail.startedAt).toLocaleString() : '—';
  const uptime = detail?.uptimeSeconds != null ? formatUptime(detail.uptimeSeconds) : '—';
  const cpu = stat?.cpu_percent != null ? `${stat.cpu_percent.toFixed(1)}%` : '—';
  const memPercent = stat?.memory_percent != null ? `${stat.memory_percent.toFixed(1)}%` : '—';
  const memUsage = stat?.memory_usage != null ? formatBytes(stat.memory_usage) : '—';
  const memLimit = stat?.memory_limit != null ? formatBytes(stat.memory_limit) : '—';
  const cpuHistory = history?.cpu ?? [];
  const memHistory = history?.mem ?? [];

  return (
    <article className="flex flex-col min-h-0 rounded-xl border border-dark-600 bg-dark-800/80 backdrop-blur-sm overflow-hidden shadow-xl hover:border-accent/30 hover:shadow-glow-sm transition-all duration-200">
      {/* Stats header */}
      <div className="shrink-0 p-4 border-b border-dark-600/80 bg-dark-900/50">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="font-semibold text-sm font-mono text-accent truncate flex items-center gap-1.5" title={name}>
            <Box className="w-4 h-4 shrink-0 text-accent/80" />
            {name}
          </span>
          <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
            running
          </span>
        </div>
        <p className="text-[11px] text-slate-500 truncate mb-3" title={container.image}>{container.image}</p>
        <Link
          to={`/container/${container.id}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent hover:underline mb-3"
        >
          View more
          <ExternalLink className="w-3 h-3" />
        </Link>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">CPU</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium tabular-nums text-slate-200">{cpu}</span>
              <div className="flex-1 min-w-0 h-6">
                <Sparkline values={cpuHistory} color={ACCENT_COLOR} height={24} />
              </div>
            </div>
            {stat?.cpu_percent != null && (
              <div className="h-1 bg-dark-600 rounded mt-1 overflow-hidden">
                <div className="h-full rounded bg-accent transition-[width] duration-300" style={{ width: `${Math.min(100, stat.cpu_percent)}%` }} />
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Memory</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium tabular-nums text-slate-200">{memPercent}</span>
              <div className="flex-1 min-w-0 h-6">
                <Sparkline values={memHistory} color={MEM_COLOR} height={24} />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">{memUsage} / {memLimit}</p>
            {stat?.memory_percent != null && (
              <div className="h-1 bg-dark-600 rounded mt-1 overflow-hidden">
                <div className="h-full rounded bg-emerald-500 transition-[width] duration-300" style={{ width: `${Math.min(100, stat.memory_percent)}%` }} />
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Started</p>
            <p className="text-xs font-mono text-slate-300 break-all">{startedAt}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Uptime</p>
            <p className="text-xs font-mono text-slate-300 tabular-nums">{uptime}</p>
          </div>
        </div>
      </div>
      {/* Logs - fills rest */}
      <div className="flex-1 min-h-0 flex flex-col p-4 pt-2">
        <LogsPanel containerId={container.id} fullView />
      </div>
    </article>
  );
}

export default function FullView() {
  const { containers, details, stats, statsHistory, loading, error, formatUptime } = useMonitor();

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-4 text-red-200 max-w-md">
          {error}. Ensure the monitor has access to the Docker socket.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 flex items-center gap-3">
          <span className="inline-block w-5 h-5 border-2 border-accent/50 border-t-accent rounded-full animate-spin" />
          Connecting…
        </div>
      </div>
    );
  }

  if (containers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        No running containers.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 p-2 sm:p-3 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 grid-auto-rows-[minmax(380px,1fr)] overflow-auto">
      {containers.map((c) => (
        <FullViewTile
          key={c.id}
          container={c}
          detail={details[c.id]}
          stat={stats[c.id]}
          history={statsHistory.perId[c.id]}
          formatUptime={formatUptime}
        />
      ))}
    </div>
  );
}
