/**
 * Vice City 3D — multiplayer server
 * Single shared world (no room codes). Shows live online player count.
 * Deploy as a Node Web Service on Render (not a Static Site).
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 24;
const WORLD = 'WORLD';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

app.use(express.static(__dirname, {
  index: 'index.html',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

/** @type {Map<string, object>} */
const players = new Map();

function publicPlayer(id, p) {
  return {
    id,
    name: p.name || 'Player',
    x: p.x || 0,
    y: p.y || 0,
    z: p.z || 0,
    h: p.h || 0,
    char: p.char || 'jason',
    vehicle: !!p.vehicle,
  };
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
    list.push(publicPlayer(id, p));
  }
  return { players: list, count: onlineCount() };
}

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, players: onlineCount() });
});

app.get('/api/online', (_req, res) => {
  res.status(200).json({ count: onlineCount() });
});

io.on('connection', (socket) => {
  socket.emit('online-count', { count: onlineCount() });

  socket.on('join-world', (payload = {}) => {
    try {
      if (players.size >= MAX_PLAYERS) {
        socket.emit('room-full');
        return;
      }

      const name = String(payload.name || 'Player').trim().slice(0, 16) || 'Player';
      const player = {
        name,
        x: 0, y: 0, z: 0, h: 0,
        char: 'jason',
        vehicle: false,
      };
      players.set(socket.id, player);
      socket.join(WORLD);

      socket.emit('world-joined', worldSnapshot(socket.id));

      socket.to(WORLD).emit('player-joined', {
        id: socket.id,
        player: publicPlayer(socket.id, player),
      });
      broadcastCount();
    } catch (err) {
      socket.emit('room-error', { message: 'Could not join the online world.' });
    }
  });

  socket.on('player-state', (data = {}) => {
    const p = players.get(socket.id);
    if (!p) return;

    p.x = Number(data.x) || 0;
    p.y = Number(data.y) || 0;
    p.z = Number(data.z) || 0;
    p.h = Number(data.h) || 0;
    p.char = data.char || p.char || 'jason';
    p.vehicle = !!data.vehicle;
    if (data.name) p.name = String(data.name).trim().slice(0, 16) || p.name;

    socket.to(WORLD).emit('state-update', {
      id: socket.id,
      player: publicPlayer(socket.id, p),
    });
  });

  socket.on('disconnect', () => {
    if (!players.has(socket.id)) return;
    players.delete(socket.id);
    socket.to(WORLD).emit('player-left', { id: socket.id });
    broadcastCount();
  });
});

server.listen(PORT, () => {
  console.log(`Vice City 3D server listening on :${PORT}`);
  console.log(`  shared world multiplayer (no room codes)`);
  console.log(`  health: http://localhost:${PORT}/healthz`);
});
