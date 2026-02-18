import { useState, useEffect, useRef, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function getWsLogsUrl(containerId, token) {
  const { protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const base = `${wsProtocol}//${host}/ws/logs?id=${encodeURIComponent(containerId)}`;
  return token ? `${base}&token=${encodeURIComponent(token)}` : base;
}

// Docker log line may start with ISO timestamp: 2026-02-18T09:42:53.655847933Z 
const ISO_PREFIX = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s*(.*)$/;

function formatTimestamp(isoStr) {
  try {
    const d = new Date(isoStr);
    const y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${M}-${D} ${h}:${m}:${s}`;
  } catch {
    return isoStr;
  }
}

function processAndSortLogs(rawLogs, sortOrder) {
  if (!rawLogs || !rawLogs.trim()) return '';
  const lines = rawLogs.split(/\n/);
  let lastTime = 0;
  const withMeta = lines.map((line) => {
    const m = line.match(ISO_PREFIX);
    if (m) {
      const [, iso, rest] = m;
      lastTime = new Date(iso).getTime();
      return { time: lastTime, text: `[${formatTimestamp(iso)}] ${rest}` };
    }
    return { time: lastTime, text: line };
  });
  const sorted = [...withMeta].sort((a, b) =>
    sortOrder === 'newest' ? b.time - a.time : a.time - b.time
  );
  return sorted.map((r) => r.text).join('\n');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getHighlightedContent(text, search) {
  if (!text) return null;
  if (!search || !search.trim()) return text;
  const escaped = escapeRegex(search.trim());
  const re = new RegExp(`(${escaped})`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let key = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    parts.push(<mark key={key++} className="bg-accent/30 text-accent-light rounded px-0.5">{match[1]}</mark>);
    lastIndex = match.index + match[0].length;
  }
  parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  return parts;
}

function LogsPanel({ containerId, onClose, fullView = false, terminalStyle = false }) {
  const { token } = useAuth();
  const [logs, setLogs] = useState('');
  const [status, setStatus] = useState('connecting');
  const [errorMessage, setErrorMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('oldest'); // 'oldest' | 'newest'
  const wsRef = useRef(null);
  const preRef = useRef(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    if (!preRef.current || !autoScrollRef.current) return;
    const el = preRef.current;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [logs]);

  useEffect(() => {
    setLogs('');
    setStatus('connecting');
    setErrorMessage(null);

    const url = getWsLogsUrl(containerId, token);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('live');
      setErrorMessage(null);
    };

    ws.onmessage = (event) => {
      const data = event.data;
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'error') {
            setStatus('error');
            setErrorMessage(parsed.message || 'Error');
            return;
          }
        } catch {
          // not JSON, treat as log line
        }
        setLogs((prev) => prev + data);
      }
    };

    ws.onerror = () => {
      setStatus('error');
      setErrorMessage('WebSocket error');
    };

    ws.onclose = () => {
      setStatus('error');
      setErrorMessage((prev) => prev || 'Connection closed');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [containerId, token]);

  const handleScroll = () => {
    if (!preRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = preRef.current;
    autoScrollRef.current = scrollTop >= scrollHeight - clientHeight - 20;
  };

  const containerClass = fullView
    ? 'flex flex-col flex-1 min-h-0 overflow-hidden'
    : 'flex flex-col border-t border-dark-600 pt-3 mt-3 min-h-0';

  const preBase = 'font-mono leading-relaxed whitespace-pre-wrap break-all text-slate-300 m-0 overflow-y-auto overflow-x-auto min-h-0';
  const preClass = terminalStyle
    ? `flex-1 min-h-0 min-w-0 rounded bg-dark-950 p-2 sm:p-3 text-[11px] sm:text-xs ${preBase}`
    : fullView
      ? `flex-1 min-h-0 rounded-lg bg-dark-950 border border-dark-600 p-2 sm:p-3 text-[10px] sm:text-[11px] ${preBase}`
      : `flex-1 min-h-[180px] max-h-[320px] overflow-auto rounded-lg bg-dark-950 border border-dark-600 p-2 sm:p-3 text-[11px] sm:text-xs ${preBase}`;

  const rawContent = logs || (status === 'connecting' ? 'Connecting to stream…' : status === 'live' ? 'Waiting for logs…' : '');
  const displayContent = useMemo(() => {
    if (!logs || status !== 'live') return rawContent;
    return processAndSortLogs(logs, sortOrder);
  }, [logs, sortOrder, rawContent, status]);
  const contentToRender = terminalStyle && search.trim()
    ? getHighlightedContent(displayContent, search)
    : displayContent;

  return (
    <div className={containerClass}>
      {terminalStyle && (
        <div className="shrink-0 flex flex-wrap items-center gap-2 mb-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in logs…"
              className="w-full rounded-lg bg-dark-700 border border-dark-600 pl-9 pr-3 py-2.5 sm:py-2 min-h-touch text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0">Sort</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-lg bg-dark-700 border border-dark-600 text-slate-200 text-xs py-2 pl-2 pr-8 focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-touch"
              aria-label="Sort logs by time"
            >
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
            </select>
          </div>
        </div>
      )}
      {!terminalStyle && (
      <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Logs</span>
        <div className="flex items-center gap-2">
          {status === 'live' && (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Live
            </span>
          )}
          {status === 'connecting' && (
            <span className="text-[10px] text-slate-500">Connecting…</span>
          )}
          {status === 'error' && (
            <span className="text-[10px] text-red-400">Disconnected</span>
          )}
          {!fullView && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] font-medium px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-dark-600 transition-colors"
            >
              Close logs
            </button>
          )}
        </div>
      </div>
      )}
      {!terminalStyle && status === 'error' && errorMessage && (
        <div className="mb-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
          {errorMessage}
        </div>
      )}
      {terminalStyle && status === 'error' && errorMessage && (
        <div className="mb-2 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-[10px] text-red-200">
          {errorMessage}
        </div>
      )}
      <pre
        ref={preRef}
        onScroll={handleScroll}
        className={preClass}
      >
        {contentToRender}
      </pre>
    </div>
  );
}

export default LogsPanel;
