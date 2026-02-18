const http = require('http');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const Docker = require('dockerode');

const app = express();
const PORT = process.env.PORT || 4000;

const MONITOR_USER = process.env.MONITOR_USER || 'admin';
const MONITOR_PASSWORD = process.env.MONITOR_PASSWORD || 'admin';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const sessions = new Map(); // token -> { createdAt }

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

function validateToken(token) {
  if (!token || typeof token !== 'string') return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!validateToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

const docker = new Docker(
  process.env.DOCKER_HOST
    ? { socketPath: process.env.DOCKER_HOST }
    : { socketPath: '/var/run/docker.sock' }
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// --- Auth (no auth middleware) ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === MONITOR_USER && password === MONITOR_PASSWORD) {
    const token = createToken();
    sessions.set(token, { createdAt: Date.now() });
    return res.json({ token });
  }
  res.status(401).json({ error: 'Invalid username or password' });
});

app.post('/api/auth/logout', (req, res) => {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ ok: true });
});

// --- Helpers for stats and details ---
function computeStats(stats) {
  try {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numCpus = stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * 100 * numCpus : 0;
    const memUsage = stats.memory_stats.usage || 0;
    const memLimit = stats.memory_stats.limit || 1;
    const memPercent = (memUsage / memLimit) * 100;
    return {
      cpu_percent: Math.min(100, Math.round(cpuPercent * 100) / 100),
      memory_usage: memUsage,
      memory_limit: memLimit,
      memory_percent: Math.round(memPercent * 100) / 100,
      pids: stats.pids_stats?.current ?? null,
    };
  } catch {
    return null;
  }
}

function computeDetail(inspect) {
  try {
    const startedAt = inspect.State?.StartedAt || null;
    const running = inspect.State?.Running;
    let uptimeSeconds = 0;
    if (startedAt && running) {
      uptimeSeconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    }
    return {
      id: inspect.Id,
      name: inspect.Name?.replace(/^\//, '') || inspect.Id.slice(0, 12),
      image: inspect.Config?.Image,
      state: inspect.State?.Status,
      startedAt,
      running,
      uptimeSeconds,
    };
  } catch {
    return null;
  }
}

// --- Protect all /api except login, logout, health ---
app.use('/api', (req, res, next) => {
  const p = req.path;
  if (p === '/auth/login' || p === '/auth/logout' || p === '/health') return next();
  authMiddleware(req, res, next);
});

app.get('/api/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: false });
    const result = containers.map((c) => ({
      id: c.Id,
      name: c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
      image: c.Image,
      status: c.Status,
      state: c.State,
      created: c.Created,
    }));
    res.json(result);
  } catch (err) {
    console.error('Error listing containers:', err);
    res.status(500).json({ error: err.message || 'Failed to list containers' });
  }
});

app.get('/api/containers/:id', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const inspect = await container.inspect();
    res.json(computeDetail(inspect));
  } catch (err) {
    console.error('Error inspecting container:', err);
    res.status(500).json({ error: err.message || 'Failed to inspect container' });
  }
});

app.get('/api/containers/:id/stats', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const stats = await container.stats({ stream: false });
    const out = computeStats(stats);
    if (out) res.json(out);
    else res.status(500).json({ error: 'Failed to compute stats' });
  } catch (err) {
    console.error('Error getting stats:', err);
    res.status(500).json({ error: err.message || 'Failed to get stats' });
  }
});

// Demux a full Docker log buffer (for one-shot GET /api/containers/:id/logs).
function demuxDockerLogBuffer(buffer) {
  let data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let out = '';
  while (data.length >= 8) {
    const payloadSize = data.readUInt32BE(4);
    if (data.length < 8 + payloadSize) break;
    out += data.subarray(8, 8 + payloadSize).toString('utf8');
    data = data.subarray(8 + payloadSize);
  }
  return out;
}

app.get('/api/containers/:id/logs', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const tail = parseInt(req.query.tail, 10) || 200;
    const raw = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });
    const logs = demuxDockerLogBuffer(raw);
    res.json({ logs });
  } catch (err) {
    console.error('Error getting logs:', err);
    res.status(500).json({ error: err.message || 'Failed to get logs' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// --- HTTP server + WebSocket ---
const server = http.createServer(app);

const WS_UPDATE_MS = 1000;
// Use noServer so we can route /ws vs /ws/logs by path and avoid "invalid frame header"
const wss = new WebSocketServer({ noServer: true });
const wssLogs = new WebSocketServer({ noServer: true });
const clients = new Set();
let broadcastInterval = null;

function getTokenFromRequest(request) {
  const url = request.url || '';
  const q = url.indexOf('?');
  if (q === -1) return null;
  const params = new URLSearchParams(url.slice(q));
  return params.get('token');
}

server.on('upgrade', (request, socket, head) => {
  const pathname = (request.url || '').split('?')[0];
  const token = getTokenFromRequest(request);
  if (!validateToken(token)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  if (pathname === '/ws/logs') {
    wssLogs.handleUpgrade(request, socket, head, (ws) => {
      wssLogs.emit('connection', ws, request);
    });
  } else if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Docker log stream is multiplexed: 8-byte header (stream type + size) then payload.
// We strip the header and send only the payload as UTF-8 so the terminal doesn't show boxes.
function demuxDockerLogStream(chunk, buffer) {
  let offset = 0;
  const result = [];
  let data = Buffer.concat([buffer, chunk]);
  while (data.length >= 8) {
    const payloadSize = data.readUInt32BE(4);
    if (data.length < 8 + payloadSize) break;
    const payload = data.subarray(8, 8 + payloadSize);
    result.push(payload.toString('utf8'));
    offset = 8 + payloadSize;
    data = data.subarray(offset);
  }
  return { text: result.join(''), remainder: data };
}

// Realtime log streaming: client connects to /ws/logs?id=CONTAINER_ID
wssLogs.on('connection', (ws, req) => {
  const base = `http://${req.headers.host || 'localhost'}`;
  const url = new URL(req.url || '/', base);
  const id = url.searchParams.get('id');
  if (!id) {
    ws.send(JSON.stringify({ type: 'error', message: 'Missing id query parameter' }));
    ws.close();
    return;
  }
  let logStream = null;
  let demuxBuffer = Buffer.alloc(0);
  const container = docker.getContainer(id);
  container.logs({
    follow: true,
    tail: 200,
    stdout: true,
    stderr: true,
    timestamps: true,
  }).then((stream) => {
    logStream = stream;
    logStream.on('data', (chunk) => {
      if (ws.readyState !== 1) return;
      const { text, remainder } = demuxDockerLogStream(chunk, demuxBuffer);
      demuxBuffer = remainder;
      if (text.length > 0) ws.send(text);
    });
    logStream.on('error', (err) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', message: err.message }));
    });
    logStream.on('end', () => {});
  }).catch((err) => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'error', message: err.message || 'Container not found' }));
      ws.close();
    }
  });
  ws.on('close', () => {
    if (logStream && typeof logStream.destroy === 'function') logStream.destroy();
  });
  ws.on('error', () => {
    if (logStream && typeof logStream.destroy === 'function') logStream.destroy();
  });
});

function startBroadcast() {
  if (broadcastInterval) return;
  broadcastInterval = setInterval(async () => {
    if (clients.size === 0) return;
    try {
      const containers = await docker.listContainers({ all: false });
      const list = containers.map((c) => ({
        id: c.Id,
        name: c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
        image: c.Image,
        status: c.Status,
        state: c.State,
      }));
      const details = {};
      const stats = {};
      await Promise.all(
        containers.map(async (c) => {
          const id = c.Id;
          const container = docker.getContainer(id);
          const [inspect, rawStats] = await Promise.all([
            container.inspect().catch(() => null),
            container.stats({ stream: false }).catch(() => null),
          ]).catch(() => [null, null]);
          if (inspect) details[id] = computeDetail(inspect);
          if (rawStats) stats[id] = computeStats(rawStats);
        })
      );
      const payload = JSON.stringify({ type: 'update', list, details, stats });
      clients.forEach((ws) => {
        if (ws.readyState === 1) ws.send(payload);
      });
    } catch (err) {
      console.error('WebSocket broadcast error:', err);
      const payload = JSON.stringify({ type: 'error', error: err.message });
      clients.forEach((ws) => {
        if (ws.readyState === 1) ws.send(payload);
      });
    }
  }, WS_UPDATE_MS);
}

function stopBroadcast() {
  if (broadcastInterval && clients.size === 0) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);
  startBroadcast();
  ws.on('close', () => {
    clients.delete(ws);
    stopBroadcast();
  });
  ws.on('error', () => {
    clients.delete(ws);
    stopBroadcast();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server monitor API listening on port ${PORT} (REST + WebSocket /ws)`);
});
