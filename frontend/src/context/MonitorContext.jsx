import { createContext, useContext, useState, useEffect, useRef } from 'react';

const HISTORY_LEN = 48;

function getWsUrl() {
  const { protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}/ws`;
}

function formatUptime(seconds) {
  if (seconds < 0 || !Number.isFinite(seconds)) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

const MonitorContext = createContext(null);

export function MonitorProvider({ children }) {
  const [containers, setContainers] = useState([]);
  const [details, setDetails] = useState({});
  const [stats, setStats] = useState({});
  const [statsHistory, setStatsHistory] = useState({ perId: {}, aggCpu: [], aggMem: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const url = getWsUrl();
    let mounted = true;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (mounted) {
          setError(null);
          setConnected(true);
          setLoading(false);
        }
      };

      ws.onmessage = (event) => {
        if (!mounted) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'update') {
            const list = msg.list || [];
            const detailsMap = msg.details || {};
            const statsMap = msg.stats || {};
            setContainers(list);
            setDetails(detailsMap);
            setStats(statsMap);
            setStatsHistory((prev) => {
              const perId = { ...prev.perId };
              let aggCpu = [...prev.aggCpu];
              let aggMem = [...prev.aggMem];
              let sumCpu = 0, sumMem = 0, n = 0;
              list.forEach((c) => {
                const s = statsMap[c.id];
                if (!s) return;
                const cpu = s.cpu_percent ?? 0;
                const mem = s.memory_percent ?? 0;
                if (!perId[c.id]) perId[c.id] = { cpu: [], mem: [] };
                perId[c.id].cpu = [...perId[c.id].cpu, cpu].slice(-HISTORY_LEN);
                perId[c.id].mem = [...perId[c.id].mem, mem].slice(-HISTORY_LEN);
                sumCpu += cpu;
                sumMem += mem;
                n++;
              });
              if (n > 0) {
                aggCpu = [...aggCpu, sumCpu / n].slice(-HISTORY_LEN);
                aggMem = [...aggMem, sumMem / n].slice(-HISTORY_LEN);
              }
              return { perId, aggCpu, aggMem };
            });
          }
          if (msg.type === 'error') setError(msg.error || 'Connection error');
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (mounted) {
          setConnected(false);
          if (!wsRef.current) return;
          wsRef.current = null;
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        if (mounted) setError('WebSocket error. Reconnecting…');
      };
    }

    connect();
    return () => {
      mounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const value = {
    containers,
    details,
    stats,
    statsHistory,
    loading,
    error,
    connected,
    formatUptime,
  };

  return (
    <MonitorContext.Provider value={value}>
      {children}
    </MonitorContext.Provider>
  );
}

export function useMonitor() {
  const ctx = useContext(MonitorContext);
  if (!ctx) throw new Error('useMonitor must be used within MonitorProvider');
  return ctx;
}
