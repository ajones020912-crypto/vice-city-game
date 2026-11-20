# Vice City 3D

An open-world crime game that runs in your browser. Drive, race boats across the water, pull jobs, dodge a six-star heat system and explore a neon coastal city — on your own or online with up to three friends.

**Play it:** https://vice-city-game-3tn7.onrender.com/

> Built with [three.js](https://threejs.org/) in a single HTML file. No install, no downloads — desktop Chrome recommended.

---

## Features

### The city
- **Eight districts:** Neon Beach downtown, Port Calusa docks, Palmetto Grove suburbs, Grassrun Bayou swamp, Mount Orrin hills, Kestrel Keys islands, the North Outskirts and the East Highway.
- **Living streets:** AI traffic that follows lanes and traffic lights, pedestrians who react to danger, parked cars, street lamps and neon signs.
- **Day/night cycle and weather:** sunsets, stars, wet reflective roads at night, rain, fog and tropical storms with lightning.
- **Wildlife:** alligators roam the bayou — and they bite.

### Two playable characters
Switch between **Jason** and **Lucia** at any time (**C**). Switching while wanted helps throw the cops off your trail.

### Vehicles
- **Cars:** sedan, sports car, SUV, van, taxi and police cruiser — with fuel, damage, fire and explosions.
- **Boats:** speedboats and airboats. Cops can't follow you onto the water.
- **Sunshine Autos** dealership and personal garages (up to 8 vehicles).
- **Mod garage** at Pay 'n' Spray: engine, armor and fuel-tank upgrades, plus resprays.
- **Gas stations** to refuel, and **Scooter Bros** on your phone to deliver your ride.

### Heat & police
- **Six-star wanted system** with heat icons (face, clothes, vehicle, weapon, partner, CCTV).
- Police cars and officers chase, shoot and arrest; a **helicopter with a searchlight** joins at 4+ stars.
- Lose them by breaking line of sight, changing clothes, switching characters, using Pay 'n' Spray or escaping by boat.

### Things to do
- **9 story missions** — deliveries, repo jobs, a bayou boss hunt, a race to the Keys, a boat smuggling run, a gang turf war and the big score.
- **City work board (K):** Courier Route, Roadside Mechanic and Lost Cargo Recovery.
- **Taxi fares, car export orders, gator hunting** and **three street races** with bronze/silver/gold medals.
- **Store robberies** and **nonlethal hold-ups (B)**.
- **Properties** that pay income and double as safehouses.
- **25 hidden stashes** scattered around the map.
- **Reputation tiers** that unlock better weapons, vehicles and missions.

### Combat
Fists, pistol, SMG, shotgun and rifle, headshots, and **Focus mode (F)** — slow motion with threats marked in red.

### Your phone (P)
Map, radio, Scooter Bros, WAINK vehicle scanner, texts, jobs, criminal profile, weather and quick save.

### Four radio stations (T)
NEON FM (synthwave), Palm Beat 98 (reggaeton), Bass Coast (Miami bass) and Gulf Lo-Fi — all generated live in the browser.

### Online multiplayer
Create a room, share the code, and up to **4 players** explore the same city together — you'll see each other walking, driving and boating, with name tags and minimap markers.

---

## Controls

| Key | Action |
| --- | --- |
| **W A S D** | Move / drive |
| **Mouse** | Look / aim |
| **Left click** | Shoot / punch |
| **1 – 5**, mouse wheel | Switch weapon |
| **E** | Enter/exit vehicle, enter buildings, use |
| **R** | Jobs, races, mod garage, rob store |
| **K** | City work board |
| **B** | Nonlethal hold-up |
| **Shift** | Run |
| **Space** | Jump / handbrake |
| **F** | Focus mode |
| **C** | Switch Jason / Lucia |
| **P** | Phone |
| **M** | Full map (drag to pan, scroll to zoom) |
| **T** | Change radio station |
| **H** | Headlights (auto / on / off) |
| **V** | Camera view |
| **Q** | Graphics quality |
| **J** | Quick save |
| **Esc** | Pause |

---

## Playing online

1. Open the game and choose **Multiplayer**.
2. Enter your name and click **Create room**.
3. Share the 5-letter **room code** — friends enter it and click **Join room**.

Each player keeps their own traffic, police, missions and money; you share the city and can see each other. Online sessions never overwrite your single-player save.

> Multiplayer needs the Node server in this repo (see below). A plain static host can only run single-player.

---

## Run it yourself

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm start
```

Then open http://localhost:3000.

Single-player also works by simply opening `index.html` in a browser — only multiplayer needs the server.

---

## Deploy on Render

Create a **Web Service** (not a Static Site) from this repo:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/healthz` |

On the free plan the server sleeps after ~15 minutes without visitors, so the first player may wait up to a minute for it to wake up.

---

## Project structure

```
index.html     The whole game: rendering, world, AI, missions, UI and the multiplayer client
server.js      Node + Socket.IO server: serves the game and relays players in online rooms
package.json   Server dependencies and start script
```

## Tech

- **three.js r128** (loaded from cdnjs) — rendering, with custom shaders for sky, water and post-processing (bloom, ambient occlusion, color grading)
- **Web Audio API** — engine, sirens, effects and procedurally generated radio music
- **Socket.IO** — online rooms
- **localStorage** — save games (stored in your browser)

## Saving

Progress autosaves every 30 seconds on foot, and you can save at any time with **J**, from the pause menu, the phone, or a safehouse. Saves live in your browser, so they don't carry over between devices or browsers.

---

*Vice City 3D is an unofficial fan project. It is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.*
