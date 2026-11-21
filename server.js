/**
 * Vice City 3D — Production Multiplayer Server
 * -------------------------------------------------
 * Shared open world · spatial interest management · chat ·
 * rate limiting · basic anti-cheat · rich player state ·
 * graceful reconnection · metrics · configurable via env.
 *
 * Deploy as a Node Web Service on Render (or any Node host).
 * Do NOT use a Static Site — Socket.IO requires a long-lived process.
 *
 * Environment variables (all optional):
 *   PORT              – listen port (default 3000)
 *   MAX_PLAYERS       – hard cap (default 32)
 *   TICK_MS           – server broadcast interval (default 50 ≈ 20 Hz)
 *   INTEREST_RADIUS   – metres; players beyond this receive less data (default 380)
 *   STATE_RATE_LIMIT  – max state updates accepted per second per client (default 25)
 *   CHAT_COOLDOWN_MS  – minimum ms between chat messages (default 1200)
 *   MAX_NAME_LEN      – player name length (default 16)
 *   LOG_LEVEL         – 'debug' | 'info' | 'warn' | 'error' (default 'info')
 *   CORS_ORIGIN       – restrict CORS (default true = reflect request origin)
 */

'use strict';

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');
const crypto  = require('crypto');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const cfg = {
  port:            Number(process.env.PORT)            || 3000,
  maxPlayers:      Number(process.env.MAX_PLAYERS)     || 32,
  tickMs:          Number(process.env.TICK_MS)         || 50,
  interestRadius:  Number(process.env.INTEREST_RADIUS) || 380,
  stateRateLimit:  Number(process.env.STATE_RATE_LIMIT)|| 25,
  chatCooldownMs:  Number(process.env.CHAT_COOLDOWN_MS)|| 1200,
  maxNameLen:      Number(process.env.MAX_NAME_LEN)    || 16,
  logLevel:        (process.env.LOG_LEVEL || 'info').toLowerCase(),
  corsOrigin:      process.env.CORS_ORIGIN === 'false' ? false
                 : process.env.CORS_ORIGIN || true,
  // Anti-cheat soft limits (metres / second)
  maxSpeedOnFoot:  18,
  maxSpeedVehicle: 95,
  maxTeleport:     120,          // instantaneous jump that triggers a soft reject
  heartbeatMs:     12_000,
  idleTimeoutMs:   45_000,
};

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const logLevelNum = LOG_LEVELS[cfg.logLevel] ?? 1;
const log = {
  debug: (...a) => logLevelNum <= 0 && console.log('[DEBUG]', ...a),
  info:  (...a) => logLevelNum <= 1 && console.log('[INFO]',  ...a),
  warn:  (...a) => logLevelNum <= 2 && console.warn('[WARN]',  ...a),
  error: (...a) => logLevelNum <= 3 && console.error('[ERROR]', ...a),
};

// ---------------------------------------------------------------------------
// Express + Socket.IO
// ---------------------------------------------------------------------------
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: cfg.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 10_000,
  pingTimeout:  8_000,
  maxHttpBufferSize: 1e5,          // 100 KB – plenty for state packets
  allowEIO3: false,
});

// Serve the game statically (same origin → Socket.IO just works)
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (/\.(js|css|svg|png|jpg|woff2?)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  },
}));

// ---------------------------------------------------------------------------
// Player store
// ---------------------------------------------------------------------------
/** @typedef {{
 *   id: string,
 *   name: string,
 *   x: number, y: number, z: number, h: number,
 *   vx: number, vz: number,
 *   char: string,
 *   vehicle: boolean,
 *   vehicleType: string,
 *   vehicleColor: number,
 *   health: number,
 *   wanted: number,
 *   weapon: number,
 *   anim: string,
 *   joinedAt: number,
 *   lastStateAt: number,
 *   lastChatAt: number,
 *   lastSeenAt: number,
 *   stateCount: number,
 *   stateWindowStart: number,
 *   color: number,           // name-tag / avatar accent
 *   socketId: string,
 * }} Player */

/** @type {Map<string, Player>} */
const players = new Map();          // key = socket.id

// Simple spatial grid for interest management (cell size ≈ interestRadius / 2)
const CELL = Math.max(80, Math.floor(cfg.interestRadius / 2));
/** @type {Map<string, Set<string>>} */
const grid = new Map();

function cellKey(x, z) {
  return `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
}

function gridAdd(id, x, z) {
  const k = cellKey(x, z);
  let set = grid.get(k);
  if (!set) { set = new Set(); grid.set(k, set); }
  set.add(id);
}

function gridRemove(id, x, z) {
  const k = cellKey(x, z);
  const set = grid.get(k);
  if (set) {
    set.delete(id);
    if (set.size === 0) grid.delete(k);
  }
}

function gridMove(id, oldX, oldZ, newX, newZ) {
  const ok = cellKey(oldX, oldZ);
  const nk = cellKey(newX, newZ);
  if (ok === nk) return;
  gridRemove(id, oldX, oldZ);
  gridAdd(id, newX, newZ);
}

/** Players roughly within interest radius of (x,z) */
function nearbyIds(x, z, radius = cfg.interestRadius) {
  const r = Math.ceil(radius / CELL) + 1;
  const cx = Math.floor(x / CELL);
  const cz = Math.floor(z / CELL);
  const out = new Set();
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      const set = grid.get(`${cx + dx},${cz + dz}`);
      if (set) for (const id of set) out.add(id);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ACCENT_COLORS = [
  0x36c9bd, 0xff5a9e, 0xffd23a, 0x7c6cff, 0x5dd39e,
  0xff8c42, 0x4fc3f7, 0xe040fb, 0x69f0ae, 0xff6e40,
];

function sanitizeName(raw) {
  let name = String(raw || 'Player')
    .replace(/[^\w\s\-_.]/g, '')
    .trim()
    .slice(0, cfg.maxNameLen);
  if (!name) name = 'Player';
  return name;
}

function uniqueName(base, exceptId) {
  const taken = new Set();
  for (const [id, p] of players) {
    if (id !== exceptId) taken.add(p.name.toLowerCase());
  }
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base.slice(0, cfg.maxNameLen - 3)}${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return base + crypto.randomBytes(2).toString('hex');
}

function publicPlayer(p, full = false) {
  const base = {
    id: p.id,
    name: p.name,
    x: +p.x.toFixed(2),
    y: +p.y.toFixed(2),
    z: +p.z.toFixed(2),
    h: +p.h.toFixed(3),
    char: p.char || 'jason',
    vehicle: !!p.vehicle,
    color: p.color,
  };
  if (full) {
    base.vx = +p.vx.toFixed(2);
    base.vz = +p.vz.toFixed(2);
    base.vehicleType  = p.vehicleType  || '';
    base.vehicleColor = p.vehicleColor || 0;
    base.health = p.health;
    base.wanted = p.wanted;
    base.weapon = p.weapon;
    base.anim   = p.anim || 'idle';
  }
  return base;
}

function onlineCount() {
  return players.size;
}

function broadcastCount() {
  io.emit('online-count', { count: onlineCount() });
}

function worldSnapshot(exceptId) {
  const list = [];
  for (const [id, p] of players) {
    if (id === exceptId) continue;
    list.push(publicPlayer(p, true));
  }
  return { players: list, count: onlineCount(), serverTime: Date.now() };
}

// Soft anti-cheat: reject absurd teleports / speeds
function validateState(p, data, now) {
  const x = Number(data.x);
  const y = Number(data.y);
  const z = Number(data.z);
  const h = Number(data.h);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(h)) {
    return { ok: false, reason: 'non-finite' };
  }

  // Clamp to a generous world bounds (adjust if your map is larger)
  if (Math.abs(x) > 5000 || Math.abs(z) > 5000 || y < -50 || y > 400) {
    return { ok: false, reason: 'out-of-bounds' };
  }

  const dt = (now - p.lastStateAt) / 1000;
  if (dt > 0.02 && dt < 3) {
    const dx = x - p.x;
    const dz = z - p.z;
    const dist = Math.hypot(dx, dz);
    const speed = dist / dt;
    const maxSpd = p.vehicle ? cfg.maxSpeedVehicle : cfg.maxSpeedOnFoot;

    if (dist > cfg.maxTeleport && speed > maxSpd * 1.8) {
      log.debug(`Soft reject teleport for ${p.name}: ${dist.toFixed(1)} m in ${dt.toFixed(2)}s`);
      return { ok: false, reason: 'teleport' };
    }
  }

  return { ok: true, x, y, z, h };
}

// Rate limit state packets
function allowState(p, now) {
  if (now - p.stateWindowStart >= 1000) {
    p.stateWindowStart = now;
    p.stateCount = 0;
  }
  p.stateCount++;
  return p.stateCount <= cfg.stateRateLimit;
}

// ---------------------------------------------------------------------------
// HTTP endpoints
// ---------------------------------------------------------------------------
app.get('/healthz', (_req, res) => {
  res.status(200).json({
    ok: true,
    players: onlineCount(),
    uptime: process.uptime() | 0,
    version: '2.0.0',
  });
});

app.get('/api/online', (_req, res) => {
  res.status(200).json({ count: onlineCount() });
});

app.get('/api/players', (_req, res) => {
  // Lightweight public list (no positions) for scoreboard / lobby
  const list = [];
  for (const p of players.values()) {
    list.push({ id: p.id, name: p.name, char: p.char, color: p.color });
  }
  res.status(200).json({ count: list.length, players: list });
});

app.get('/api/stats', (_req, res) => {
  res.status(200).json({
    players: onlineCount(),
    maxPlayers: cfg.maxPlayers,
    uptime: process.uptime() | 0,
    tickMs: cfg.tickMs,
    interestRadius: cfg.interestRadius,
    cells: grid.size,
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });
});

// ---------------------------------------------------------------------------
// Socket.IO connection handling
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  const remote = socket.handshake.address;
  log.debug(`connect ${socket.id} from ${remote}`);

  // Immediately tell them the current count (lobby UI)
  socket.emit('online-count', { count: onlineCount() });

  // ---- join-world ---------------------------------------------------------
  socket.on('join-world', (payload = {}) => {
    try {
      if (players.has(socket.id)) {
        // Already joined – just re-send snapshot (reconnection case)
        socket.emit('world-joined', worldSnapshot(socket.id));
        return;
      }

      if (players.size >= cfg.maxPlayers) {
        socket.emit('room-full');
        return;
      }

      const baseName = sanitizeName(payload.name);
      const name = uniqueName(baseName, socket.id);
      const now = Date.now();
      const color = ACCENT_COLORS[players.size % ACCENT_COLORS.length];

      /** @type {Player} */
      const player = {
        id: socket.id,
        name,
        x: 0, y: 0, z: 0, h: 0,
        vx: 0, vz: 0,
        char: (payload.char === 'lucia' ? 'lucia' : 'jason'),
        vehicle: false,
        vehicleType: '',
        vehicleColor: 0,
        health: 100,
        wanted: 0,
        weapon: 0,
        anim: 'idle',
        joinedAt: now,
        lastStateAt: now,
        lastChatAt: 0,
        lastSeenAt: now,
        stateCount: 0,
        stateWindowStart: now,
        color,
        socketId: socket.id,
      };

      players.set(socket.id, player);
      gridAdd(socket.id, 0, 0);

      // Welcome packet with full snapshot of everyone else
      socket.emit('world-joined', worldSnapshot(socket.id));

      // Tell everyone else (they will receive full-ish data)
      const pub = publicPlayer(player, true);
      socket.broadcast.emit('player-joined', { id: socket.id, player: pub });

      broadcastCount();
      log.info(`+ ${name} (${socket.id.slice(0, 6)})  online=${players.size}`);
    } catch (err) {
      log.error('join-world error', err);
      socket.emit('room-error', { message: 'Could not join the online world.' });
    }
  });

  // ---- player-state -------------------------------------------------------
  socket.on('player-state', (data = {}) => {
    const p = players.get(socket.id);
    if (!p) return;

    const now = Date.now();
    p.lastSeenAt = now;

    if (!allowState(p, now)) return;          // rate limit

    const check = validateState(p, data, now);
    if (!check.ok) {
      // Soft reject – tell client to snap back (optional)
      if (check.reason === 'teleport' || check.reason === 'out-of-bounds') {
        socket.emit('state-reject', {
          x: p.x, y: p.y, z: p.z, h: p.h,
          reason: check.reason,
        });
      }
      return;
    }

    const oldX = p.x, oldZ = p.z;

    // Velocity estimate for smoother client interpolation
    const dt = Math.max(0.016, (now - p.lastStateAt) / 1000);
    p.vx = (check.x - p.x) / dt;
    p.vz = (check.z - p.z) / dt;

    p.x = check.x;
    p.y = check.y;
    p.z = check.z;
    p.h = check.h;
    p.lastStateAt = now;

    // Optional richer fields (client may or may not send them yet)
    if (typeof data.char === 'string') {
      p.char = data.char === 'lucia' ? 'lucia' : 'jason';
    }
    p.vehicle = !!data.vehicle;
    if (typeof data.vehicleType === 'string') {
      p.vehicleType = data.vehicleType.slice(0, 24);
    }
    if (Number.isFinite(data.vehicleColor)) {
      p.vehicleColor = data.vehicleColor | 0;
    }
    if (Number.isFinite(data.health)) {
      p.health = Math.max(0, Math.min(100, data.health));
    }
    if (Number.isFinite(data.wanted)) {
      p.wanted = Math.max(0, Math.min(6, data.wanted | 0));
    }
    if (Number.isFinite(data.weapon)) {
      p.weapon = Math.max(0, Math.min(10, data.weapon | 0));
    }
    if (typeof data.anim === 'string') {
      p.anim = data.anim.slice(0, 16);
    }
    if (data.name) {
      const cleaned = sanitizeName(data.name);
      if (cleaned !== p.name) {
        p.name = uniqueName(cleaned, socket.id);
      }
    }

    gridMove(socket.id, oldX, oldZ, p.x, p.z);

    // Interest-managed broadcast: only players near this one receive the update
    // (Far players still get low-rate "far-update" from the tick loop)
    const near = nearbyIds(p.x, p.z);
    const packet = { id: socket.id, player: publicPlayer(p, true) };

    for (const otherId of near) {
      if (otherId === socket.id) continue;
      const otherSock = io.sockets.sockets.get(otherId);
      if (otherSock) otherSock.emit('state-update', packet);
    }
  });

  // ---- chat ---------------------------------------------------------------
  socket.on('chat', (payload = {}) => {
    const p = players.get(socket.id);
    if (!p) return;

    const now = Date.now();
    if (now - p.lastChatAt < cfg.chatCooldownMs) {
      socket.emit('chat-reject', { reason: 'slow-down' });
      return;
    }

    let text = String(payload.text || '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
      .slice(0, 140);

    if (!text) return;

    // Extremely light filter (extend as needed)
    text = text.replace(/(https?:\/\/\S+)/gi, '[link]');

    p.lastChatAt = now;

    const msg = {
      id: crypto.randomBytes(4).toString('hex'),
      from: p.name,
      color: p.color,
      text,
      ts: now,
    };

    // Chat is global for now (small player counts). Easy to make proximity later.
    io.emit('chat', msg);
    log.debug(`chat ${p.name}: ${text}`);
  });

  // ---- heartbeat / keep-alive ---------------------------------------------
  socket.on('ping-alive', () => {
    const p = players.get(socket.id);
    if (p) p.lastSeenAt = Date.now();
    socket.emit('pong-alive', { t: Date.now() });
  });

  // ---- disconnect ---------------------------------------------------------
  socket.on('disconnect', (reason) => {
    const p = players.get(socket.id);
    if (!p) return;

    gridRemove(socket.id, p.x, p.z);
    players.delete(socket.id);

    socket.broadcast.emit('player-left', { id: socket.id, name: p.name });
    broadcastCount();
    log.info(`- ${p.name} (${reason})  online=${players.size}`);
  });
});

// ---------------------------------------------------------------------------
// Background tick – far-player updates + idle cleanup
// ---------------------------------------------------------------------------
let tickCount = 0;

setInterval(() => {
  tickCount++;
  const now = Date.now();

  // Idle / zombie cleanup
  for (const [id, p] of players) {
    if (now - p.lastSeenAt > cfg.idleTimeoutMs) {
      log.info(`timeout ${p.name}`);
      const sock = io.sockets.sockets.get(id);
      if (sock) sock.disconnect(true);
      else {
        gridRemove(id, p.x, p.z);
        players.delete(id);
        io.emit('player-left', { id, name: p.name });
        broadcastCount();
      }
    }
  }

  // Every ~500 ms send a low-rate "far" snapshot so distant players still appear
  if (tickCount % 10 === 0) {
    for (const [id, p] of players) {
      const near = nearbyIds(p.x, p.z, cfg.interestRadius * 0.85);
      const farPacket = {
        id,
        player: publicPlayer(p, false),   // lighter payload
        far: true,
      };
      for (const [otherId] of players) {
        if (otherId === id) continue;
        if (near.has(otherId)) continue;  // already getting high-rate updates
        const sock = io.sockets.sockets.get(otherId);
        if (sock) sock.emit('state-update', farPacket);
      }
    }
  }
}, cfg.tickMs);

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal) {
  log.info(`${signal} received – shutting down`);
  io.emit('server-shutdown', { message: 'Server is restarting. Reconnect in a moment.' });
  server.close(() => {
    log.info('HTTP server closed');
    process.exit(0);
  });
  // Force after 4 s
  setTimeout(() => process.exit(1), 4000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
server.listen(cfg.port, () => {
  log.info(`Vice City 3D multiplayer server v2.0 listening on :${cfg.port}`);
  log.info(`  max players      : ${cfg.maxPlayers}`);
  log.info(`  tick             : ${cfg.tickMs} ms`);
  log.info(`  interest radius  : ${cfg.interestRadius} m`);
  log.info(`  health           : http://localhost:${cfg.port}/healthz`);
  log.info(`  stats            : http://localhost:${cfg.port}/api/stats`);
});
