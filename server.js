/**
 * Vice City 3D — multiplayer server
 * Serves the game + Socket.IO rooms (up to 4 players each).
 * Deploy as a Node Web Service on Render (not a Static Site).
 */

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 4;
const ROOM_CODE_LEN = 5;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

// ---------- static files ----------
app.use(express.static(__dirname, {
  index: 'index.html',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, rooms: rooms.size, players: playerCount() });
});

// ---------- room state ----------
/** @type {Map<string, { code: string, players: Map<string, object> }>} */
const rooms = new Map();
/** socket.id → room code */
const socketRoom = new Map();

function playerCount() {
  let n = 0;
  for (const r of rooms.values()) n += r.players.size;
  return n;
}

function makeCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < ROOM_CODE_LEN; i++) {
      code += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];
    }
  } while (rooms.has(code));
  return code;
}

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

function roomSnapshot(room) {
  const players = [];
  for (const [id, p] of room.players) {
    players.push(publicPlayer(id, p));
  }
  return { code: room.code, players };
}

function leaveRoom(socket) {
  const code = socketRoom.get(socket.id);
  if (!code) return;
  const room = rooms.get(code);
  socketRoom.delete(socket.id);
  if (!room) return;

  room.players.delete(socket.id);
  socket.leave(code);

  if (room.players.size === 0) {
    rooms.delete(code);
  } else {
    socket.to(code).emit('player-left', { id: socket.id });
  }
}

// ---------- socket handlers ----------
io.on('connection', (socket) => {
  socket.on('create-room', (payload = {}) => {
    try {
      leaveRoom(socket);
      const name = String(payload.name || 'Player').trim().slice(0, 16) || 'Player';
      const code = makeCode();
      const room = { code, players: new Map() };
      room.players.set(socket.id, {
        name,
        x: 0, y: 0, z: 0, h: 0,
        char: 'jason', vehicle: false,
      });
      rooms.set(code, room);
      socketRoom.set(socket.id, code);
      socket.join(code);
      socket.emit('room-created', roomSnapshot(room));
    } catch (err) {
      socket.emit('room-error', { message: 'Could not create room.' });
    }
  });

  socket.on('join-room', (payload = {}) => {
    try {
      leaveRoom(socket);
      const code = String(payload.code || '').trim().toUpperCase();
      const name = String(payload.name || 'Player').trim().slice(0, 16) || 'Player';
      const room = rooms.get(code);

      if (!room) {
        socket.emit('room-error', { message: 'Room not found. Check the code and try again.' });
        return;
      }
      if (room.players.size >= MAX_PLAYERS) {
        socket.emit('room-full');
        return;
      }

      room.players.set(socket.id, {
        name,
        x: 0, y: 0, z: 0, h: 0,
        char: 'jason', vehicle: false,
      });
      socketRoom.set(socket.id, code);
      socket.join(code);

      // Tell the joiner about everyone already here
      socket.emit('room-joined', roomSnapshot(room));

      // Tell everyone else about the new player
      socket.to(code).emit('player-joined', {
        id: socket.id,
        player: publicPlayer(socket.id, room.players.get(socket.id)),
      });
    } catch (err) {
      socket.emit('room-error', { message: 'Could not join that room.' });
    }
  });

  socket.on('player-state', (data = {}) => {
    const code = socketRoom.get(socket.id);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    const p = room.players.get(socket.id);
    if (!p) return;

    p.x = Number(data.x) || 0;
    p.y = Number(data.y) || 0;
    p.z = Number(data.z) || 0;
    p.h = Number(data.h) || 0;
    p.char = data.char || p.char || 'jason';
    p.vehicle = !!data.vehicle;
    if (data.name) p.name = String(data.name).trim().slice(0, 16) || p.name;

    // Broadcast to other players in the room only
    socket.to(code).emit('state-update', {
      id: socket.id,
      player: publicPlayer(socket.id, p),
    });
  });

  socket.on('disconnect', () => {
    leaveRoom(socket);
  });
});

// ---------- start ----------
server.listen(PORT, () => {
  console.log(`Vice City 3D server listening on :${PORT}`);
  console.log(`  single-player + multiplayer ready`);
  console.log(`  health: http://localhost:${PORT}/healthz`);
});
