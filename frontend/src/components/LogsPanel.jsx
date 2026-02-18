import { useState, useEffect, useRef } from 'react';

function getWsLogsUrl(containerId) {
  const { protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}/ws/logs?id=${encodeURIComponent(containerId)}`;
}

function LogsPanel({ containerId, onClose, fullView = false, terminalStyle = false }) {
  const [logs, setLogs] = useState('');
  const [status, setStatus] = useState('connecting');
  const [errorMessage, setErrorMessage] = useState(null);
  const wsRef = useRef(null);
  const preRef = useRef(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    if (!preRef.current || !autoScrollRef.current) return;
    preRef.current.scrollTop = preRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    const url = getWsLogsUrl(containerId);
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
  }, [containerId]);

  const handleScroll = () => {
    if (!preRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = preRef.current;
    autoScrollRef.current = scrollTop >= scrollHeight - clientHeight - 20;
  };

  const containerClass = fullView
    ? 'flex flex-col flex-1 min-h-0 overflow-hidden'
    : 'flex flex-col border-t border-dark-600 pt-3 mt-3 min-h-0';

  const preBase = 'font-mono leading-relaxed whitespace-pre-wrap break-all text-slate-300 m-0 overflow-auto min-h-0';
  const preClass = terminalStyle
    ? `flex-1 min-h-0 rounded bg-dark-950 p-3 text-[11px] sm:text-xs ${preBase}`
    : fullView
      ? `flex-1 min-h-0 rounded-lg bg-dark-950 border border-dark-600 p-3 text-[11px] ${preBase}`
      : `flex-1 min-h-[180px] max-h-[320px] overflow-auto rounded-lg bg-dark-950 border border-dark-600 p-3 text-[11px] sm:text-xs ${preBase}`;

  return (
    <div className={containerClass}>
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
        {logs || (status === 'connecting' ? 'Connecting to stream…' : status === 'live' ? 'Waiting for logs…' : '')}
      </pre>
    </div>
  );
}

export default LogsPanel;
