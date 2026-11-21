# Vice City 3D — Multiplayer (v2)

Production-grade shared-world multiplayer.

## Quick start (local)

```bash
npm install
npm start
```

Open **http://localhost:3000** (not a file:// URL).  
Click **MULTIPLAYER → JOIN WORLD**.

## Deploy on Render

Create a **Web Service** (not Static Site):

| Setting            | Value                          |
|--------------------|--------------------------------|
| Runtime            | Node                           |
| Build command      | `npm install`                  |
| Start command      | `npm start`                    |
| Health check path  | `/healthz`                     |

Optional environment variables:

| Variable           | Default | Meaning                              |
|--------------------|---------|--------------------------------------|
| `MAX_PLAYERS`      | 32      | Hard player cap                      |
| `TICK_MS`          | 50      | Server tick (ms)                     |
| `INTEREST_RADIUS`  | 380     | Metres for high-rate state updates   |
| `STATE_RATE_LIMIT` | 25      | Max state packets / second / client  |
| `CHAT_COOLDOWN_MS` | 1200    | Minimum ms between chat messages     |
| `LOG_LEVEL`        | info    | debug / info / warn / error          |

## What’s new in v2

**Server (`server.js`)**
- Spatial interest management (nearby players get 20 Hz updates, distant players get low-rate far updates)
- Richer player state: velocity, character, vehicle type/colour, health, wanted, weapon, anim
- Soft anti-cheat (speed / teleport / out-of-bounds rejection)
- Per-client rate limiting
- Global chat with cooldown + basic filtering
- Unique name handling, accent colours
- Heartbeat / idle timeout cleanup
- `/healthz`, `/api/online`, `/api/players`, `/api/stats` endpoints
- Graceful shutdown on SIGTERM/SIGINT
- Fully backward-compatible with the original client events

**Client (`js/mp.js`)**
- Velocity-assisted smooth interpolation (far less rubber-banding)
- Character-coloured avatars + accent stripes
- Name tags with health bar + wanted stars
- Vehicle colour sync
- In-game chat (press **Enter** to type)
- Automatic reconnection with backoff
- Graceful fallback if richer fields are missing

## Integrating `js/mp.js` into the game

Add this line near the end of `index.html` (just before the closing `</body>` or after the main game script):

```html
<script src="/js/mp.js"></script>
```

The enhanced module overwrites the original `mpConnect`, `mpTick`, `mpUpsert`, etc., so existing calls automatically upgrade.  
If you prefer not to touch `index.html`, you can still run the new server — the original client will continue to work (just without chat / smoother interpolation / richer visuals).

## Protocol summary

| Event (client → server) | Payload                                      |
|-------------------------|----------------------------------------------|
| `join-world`            | `{ name, char? }`                            |
| `player-state`          | `{ x,y,z,h, char, vehicle, vehicleType?, vehicleColor?, health?, wanted?, weapon?, anim?, name? }` |
| `chat`                  | `{ text }`                                   |
| `ping-alive`            | —                                            |

| Event (server → client) | Payload                                      |
|-------------------------|----------------------------------------------|
| `world-joined`          | `{ players: [...], count, serverTime }`      |
| `player-joined`         | `{ id, player }`                             |
| `player-left`           | `{ id, name? }`                              |
| `state-update`          | `{ id, player, far? }`                       |
| `state-reject`          | `{ x,y,z,h, reason }`                        |
| `online-count`          | `{ count }`                                  |
| `chat`                  | `{ id, from, color, text, ts }`              |
| `chat-reject`           | `{ reason }`                                 |
| `room-full` / `room-error` | —                                         |
| `server-shutdown`       | `{ message }`                                |

## Tips for the best experience

1. Always open the game from the **same origin** as the Node server (so `/socket.io/socket.io.js` and `/js/mp.js` resolve).
2. Desktop Chrome / Edge recommended (same as single-player).
3. For larger player counts, lower `INTEREST_RADIUS` or raise `TICK_MS` slightly.
4. Chat is currently global. Changing it to proximity is a 5-line change in the server’s `chat` handler if you ever want it.
