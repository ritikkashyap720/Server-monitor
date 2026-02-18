const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const Docker = require('dockerode');

const app = express();
const PORT = process.env.PORT || 4000;

const docker = new Docker(
  process.env.DOCKER_HOST
    ? { socketPath: process.env.DOCKER_HOST }
    : { socketPath: '/var/run/docker.sock' }
);

app.use(cors());
app.use(express.json());

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

// --- REST routes ---
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

app.get('/api/containers/:id/logs', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    const tail = parseInt(req.query.tail, 10) || 200;
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });
    res.json({ logs: logs.toString('utf8') });
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

server.on('upgrade', (request, socket, head) => {
  const pathname = (request.url || '').split('?')[0];
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
      if (ws.readyState === 1) ws.send(chunk.toString('utf8'));
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
