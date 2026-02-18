import { Box, Cpu, MemoryStick } from 'lucide-react';
import Sparkline from './Sparkline';

const ACCENT_COLOR = '#34d399';
const MEM_COLOR = '#2dd4bf';

function Overview({ containers, stats, history }) {
  const cpuHistory = history.cpu || [];
  const memHistory = history.mem || [];
  const count = containers.length;

  const aggCpu = count > 0 && stats
    ? Object.values(stats).reduce((s, st) => s + (st?.cpu_percent ?? 0), 0) / count
    : 0;
  const aggMem = count > 0 && stats
    ? Object.values(stats).reduce((s, st) => s + (st?.memory_percent ?? 0), 0) / count
    : 0;

  return (
    <section className="mb-4 sm:mb-5">
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-dark-600 bg-dark-800/80 p-4 flex flex-col gap-1 min-h-0 shadow-lg">
          <div className="flex items-center gap-2 text-slate-500">
            <Box className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">Containers</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold tabular-nums text-slate-200">{count}</span>
        </div>
        <div className="rounded-xl border border-dark-600 bg-dark-800/80 p-4 flex flex-col gap-1 min-h-0 shadow-lg">
          <div className="flex items-center gap-2 text-slate-500">
            <Cpu className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">Avg CPU</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold tabular-nums text-slate-200">{aggCpu.toFixed(1)}%</span>
          <div className="mt-2 h-6 sm:h-7">
            <Sparkline values={cpuHistory} color={ACCENT_COLOR} height={28} />
          </div>
        </div>
        <div className="rounded-xl border border-dark-600 bg-dark-800/80 p-4 flex flex-col gap-1 min-h-0 shadow-lg">
          <div className="flex items-center gap-2 text-slate-500">
            <MemoryStick className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider">Avg Memory</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold tabular-nums text-slate-200">{aggMem.toFixed(1)}%</span>
          <div className="mt-2 h-6 sm:h-7">
            <Sparkline values={memHistory} color={MEM_COLOR} height={28} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Overview;
