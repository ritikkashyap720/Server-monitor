import { useMonitor } from '../context/MonitorContext';
import ContainerCard from '../components/ContainerCard';
import Overview from '../components/Overview';

export default function Dashboard() {
  const { containers, details, stats, statsHistory, loading, error, formatUptime } = useMonitor();

  return (
    <>
      {error && (
        <div className="mx-4 mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 shadow-lg">
          {error}. Ensure the monitor has access to the Docker socket.
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="text-slate-400 flex items-center gap-3">
            <span className="inline-block w-5 h-5 border-2 border-accent/50 border-t-accent rounded-full animate-spin" />
            Connecting…
          </div>
        </div>
      ) : containers.length === 0 && !error ? (
        <div className="flex-1 flex items-center justify-center py-16 text-slate-400">
          No running containers.
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto px-3 py-4 sm:px-5 sm:py-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Overview
            containers={containers}
            details={details}
            stats={stats}
            history={{ cpu: statsHistory.aggCpu, mem: statsHistory.aggMem }}
          />
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3 sm:gap-4 xl:gap-5 w-full max-w-full mt-4">
            {containers.map((c) => (
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
    </>
  );
}
