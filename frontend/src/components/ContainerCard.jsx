import { Link } from 'react-router-dom';
import { Box, ChevronRight } from 'lucide-react';
import Sparkline from './Sparkline';

const ACCENT_COLOR = '#34d399';
const MEM_COLOR = '#2dd4bf';

function ContainerCard({ container, detail, stat, history, formatUptime }) {
  const name = container.name || container.id?.slice(0, 12);
  const startedAt = detail?.startedAt
    ? new Date(detail.startedAt).toLocaleString()
    : '—';
  const uptime = detail?.uptimeSeconds != null
    ? formatUptime(detail.uptimeSeconds)
    : '—';
  const cpu = stat?.cpu_percent != null ? `${stat.cpu_percent.toFixed(1)}%` : '—';
  const memPercent = stat?.memory_percent != null ? `${stat.memory_percent.toFixed(1)}%` : '—';
  const memUsage = stat?.memory_usage != null ? formatBytes(stat.memory_usage) : '—';
  const memLimit = stat?.memory_limit != null ? formatBytes(stat.memory_limit) : '—';
  const cpuHistory = history?.cpu ?? [];
  const memHistory = history?.mem ?? [];

  return (
    <article className="rounded-xl border border-dark-600 bg-dark-800/80 p-3 sm:p-4 md:p-5 flex flex-col gap-2 sm:gap-3 min-h-0 transition-all duration-200 hover:bg-dark-700/80 hover:border-accent/30 hover:shadow-glow-sm">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="font-semibold text-sm sm:text-base font-mono text-accent truncate flex items-center gap-2" title={name}>
          <Box className="w-4 h-4 shrink-0 text-accent/80" />
          {name}
        </span>
        <span className="shrink-0 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">running</span>
      </div>
      <p className="text-xs text-slate-500 truncate" title={container.image}>{container.image}</p>
      <dl className="flex flex-col gap-2.5 flex-1 min-h-0 m-0">
        <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[82px_1fr] gap-2 items-start">
          <dt className="text-xs text-slate-500 font-medium pt-0.5 m-0">CPU</dt>
          <dd className="m-0 min-w-0 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="tabular-nums shrink-0">{cpu}</span>
              <Sparkline values={cpuHistory} color={ACCENT_COLOR} height={28} label="CPU over time" />
            </div>
            {stat?.cpu_percent != null && (
              <div className="h-1 bg-dark-600 rounded mt-1 overflow-hidden">
                <div className="h-full rounded bg-accent transition-[width] duration-300" style={{ width: `${Math.min(100, stat.cpu_percent)}%` }} />
              </div>
            )}
          </dd>
        </div>
        <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[82px_1fr] gap-2 items-start">
          <dt className="text-xs text-slate-500 font-medium pt-0.5 m-0">Memory</dt>
          <dd className="m-0 min-w-0 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="tabular-nums shrink-0">{memPercent}</span>
              <Sparkline values={memHistory} color={MEM_COLOR} height={28} label="Memory over time" />
            </div>
            <span className="block text-[11px] text-slate-500 mt-0.5">{memUsage} / {memLimit}</span>
            {stat?.memory_percent != null && (
              <div className="h-1 bg-dark-600 rounded mt-1 overflow-hidden">
                <div className="h-full rounded bg-teal-400 transition-[width] duration-300" style={{ width: `${Math.min(100, stat.memory_percent)}%` }} />
              </div>
            )}
          </dd>
        </div>
        <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[82px_1fr] gap-2 items-start">
          <dt className="text-xs text-slate-500 font-medium pt-0.5 m-0">Started</dt>
          <dd className="m-0 text-sm font-mono text-xs break-all">{startedAt}</dd>
        </div>
        <div className="grid grid-cols-[72px_1fr] sm:grid-cols-[82px_1fr] gap-2 items-start">
          <dt className="text-xs text-slate-500 font-medium pt-0.5 m-0">Uptime</dt>
          <dd className="m-0 text-sm font-mono text-xs tabular-nums">{uptime}</dd>
        </div>
      </dl>

      <div className="mt-auto pt-2 sm:pt-3 border-t border-dark-600">
        <Link
          to={`/container/${container.id}`}
          className="w-full inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-medium px-4 py-3 sm:py-2.5 rounded-lg bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 hover:text-dark-950 transition-colors min-h-touch"
        >
          View more
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
}

function formatBytes(bytes) {
  if (bytes === 0 || bytes == null) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default ContainerCard;
