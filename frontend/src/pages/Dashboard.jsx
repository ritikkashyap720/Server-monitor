import { useMemo } from 'react';
import { useMonitor } from '../context/MonitorContext';
import ContainerCard from '../components/ContainerCard';
import Overview from '../components/Overview';

function sortContainersByStartedAt(containers, details) {
  return [...containers].sort((a, b) => {
    const aStart = details[a.id]?.startedAt ? new Date(details[a.id].startedAt).getTime() : 0;
    const bStart = details[b.id]?.startedAt ? new Date(details[b.id].startedAt).getTime() : 0;
    return bStart - aStart; // newest first
  });
}

export default function Dashboard() {
  const { containers, details, stats, statsHistory, loading, error, formatUptime } = useMonitor();
  const sortedContainers = useMemo(() => sortContainersByStartedAt(containers, details), [containers, details]);

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      {error && (
        <div className="shrink-0 mx-3 mt-3 sm:mx-4 sm:mt-4 md:mx-5 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-red-200 shadow-lg">
          {error}. Ensure the monitor has access to the Docker socket.
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16 min-h-0">
          <div className="text-slate-400 flex items-center gap-3">
            <span className="inline-block w-5 h-5 border-2 border-accent/50 border-t-accent rounded-full animate-spin" />
            Connecting…
          </div>
        </div>
      ) : containers.length === 0 && !error ? (
        <div className="flex-1 flex items-center justify-center py-16 text-slate-400 min-h-0">
          No running containers.
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 sm:py-5 md:px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Overview
            containers={containers}
            details={details}
            stats={stats}
            history={{ cpu: statsHistory.aggCpu, mem: statsHistory.aggMem }}
          />
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3 sm:gap-4 md:gap-4 xl:gap-5 w-full max-w-full mt-4">
            {sortedContainers.map((c) => (
              <ContainerCard
                key={c.id}
                container={c}
                detail={details[c.id]}
                stat={stats[c.id]}
                history={statsHistory.perId[c.id]}
                formatUptime={formatUptime}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
