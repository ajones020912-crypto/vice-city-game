# Vice City 3D

Vice City 3D is a browser-based, open-world driving and adventure game set in a fictional neon coastal city. Explore the city, take on missions and side jobs, race rival drivers, fly aircraft, and build up your character's cash and reputation.

**Play the game:** https://vice-city-game-3tn7.onrender.com/

The game is built with [Three.js](https://threejs.org/) and currently runs as a single-player browser game. Desktop Chrome is recommended.

---

## What's in the game

### Explore the city
- Eight districts to explore: Neon Beach downtown, Port Calusa docks, Palmetto Grove suburbs, Grassrun Bayou, Mount Orrin, Kestrel Keys, the North Outskirts, and the East Highway.
- A downtown park with winding paths, a reflecting pond and fountain, a pavilion, benches, trees, and flower beds.
- An airport with a runway, taxiways, airport buildings, a prop plane, and a small jet.
- City traffic, pedestrians, parked vehicles, streetlights, traffic signals, and marked zebra crosswalks at city intersections.
- A day-and-night cycle, changing weather, rain, fog, storms, and wet-looking roads.

### Vehicles
- Road vehicles include a sedan, sports car, SUV, van, taxi, and police cruiser.
- Watercraft include speedboats and airboats.
- Aircraft include a prop plane and a small jet.
- Enter and exit vehicles, change camera views, use headlights, and visit garages.
- Sunshine Autos dealership, personal vehicle storage, and Pay 'n' Spray vehicle customization and upgrades.
- Gas stations for refueling and Scooter Bros vehicle delivery through the in-game phone.

### Missions, jobs, and races
- **10 story missions**, from the opening Welcome to the Coast checkpoint through deliveries, vehicle recovery, bayou missions, a Keys race, a smuggling run, a turf challenge, and The Big Score.
- City work board activities: Courier Route, Roadside Mechanic, and Lost Cargo Recovery.
- Taxi fares, car export orders, and other side activities.
- Four street races: Downtown Circuit, Interstate Sprint, Bayou Dirt Rally, and Coastal Clash.
- Race checkpoints, rival drivers, timed finishes, and medal targets. Coastal Clash has a five-minute cooldown after a completed race.
- Shops, properties, safehouses, and hidden stashes to discover.

### Police and wanted system
- A wanted-level system that attracts police attention as your criminal activity increases.
- Police vehicles and officers pursue the player, with stronger responses at higher wanted levels.
- Lose police attention by escaping, breaking line of sight, changing your appearance, switching characters, or using a Pay 'n' Spray.

### Characters and progression
- Play as Jason or Lucia and switch between them with **C**.
- Earn cash and reputation by completing missions and activities.
- Unlock additional equipment and opportunities as your reputation grows.
- Save progress in your browser.

### Combat
- Switch between fists, pistol, SMG, shotgun, and rifle.
- Aim and use the focus ability during encounters.
- The game includes fictional combat and police-chase gameplay.

### In-game phone
Open the phone with **P**. Its apps include:
- **Map** — view the city.
- **Radio** — change stations.
- **ViceFeed** — browse randomized posts from fictional city residents. Some posts react to in-game events such as weather, driving, and wanted status.
- **Scooter Bros** — request vehicle delivery.
- **WAINK** — vehicle scanner.
- **Texts, Profile, Weather, Jobs, and Save** — check messages and player information, see conditions, access activities, and save.

### Radio
Four original in-game radio stations play procedurally generated audio:
- NEON FM
- Palm Beat 98
- Bass Coast
- Gulf Lo-Fi

### Controls and interface
- A clickable **CONTROLS** panel in the lower-left corner opens and closes the keyboard guide.
- **RELEASE MOUSE** unlocks the cursor without pausing the game. Click back into the game to capture the mouse again.
- Use the pause menu and in-game phone for additional options.

---

## Controls

| Key / input | Action |
| --- | --- |
| **W A S D** | Move / drive |
| **Mouse** | Look / aim |
| **Left click** | Shoot / punch |
| **1–5** or mouse wheel | Switch weapon |
| **E** | Enter / exit vehicle, enter buildings, use |
| **R** | Jobs, races, mod garage, rob store |
| **K** | City work board |
| **B** | Nonlethal hold-up |
| **Shift** | Run |
| **Space** | Jump / handbrake |
| **F** | Focus mode |
| **C** | Switch Jason / Lucia |
| **P** | Open phone |
| **M** | Full map (drag to pan, scroll to zoom) |
| **T** | Change radio station |
| **H** | Headlights (auto / on / off) |
| **V** | Change camera view |
| **Q** | Graphics quality |
| **J** | Quick save |
| **Esc** | Pause |
| **CONTROLS button** | Open / close the control guide |
| **RELEASE MOUSE button** | Unlock the cursor without pausing |

---

## Multiplayer status

**Online multiplayer is not currently playable.** The game is currently single-player, and the Multiplayer option remains disabled.

The repository contains an Express + Socket.IO server prototype in `server.js`, including online-player and health-check endpoints. The game still needs its shared-world connection and lobby integration before multiplayer can be enabled. To host the server, use a Render **Web Service**, not a Static Site.

---

## Run locally

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm start
```

Then open http://localhost:3000.

For single-player, you can also open `index.html` directly in a browser. The Node server is not required for the standalone single-player version.

---

## Deploy the server on Render

To run the Node server, create a **Web Service** connected to this repository.

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/healthz` |

The currently linked game page is hosted separately as a static site. A static site does not run the Socket.IO server.

---

## Project structure

```text
vice-city-game/
├── index.html                 Main game: 3D world, vehicles, missions, UI, and gameplay
├── server.js                  Express + Socket.IO server prototype
├── package.json               Node dependencies and start scripts
├── favicon.svg                Browser tab icon
├── graphics-test.html         Standalone graphics test page
├── assets/
│   └── plane.fbx              Imported prop-plane model
├── scripts/
│   ├── patch-post-processing.js
│   └── patch-shared-world.js
├── race/
│   ├── race-cooldown-status.json
│   └── street-race-status.json
└── .github/workflows/          Game update and maintenance workflows
```

---

## Technology

- **Three.js r128** — 3D rendering, city, vehicles, lighting, and effects.
- **FBXLoader** — loads the imported prop-plane model from `assets/plane.fbx`.
- **Web Audio API** — vehicle sounds, sirens, effects, and generated radio audio.
- **Express + Socket.IO** — server prototype for future online multiplayer.
- **localStorage** — browser-based save data.

## Saving

The game autosaves progress periodically. You can also save with **J**, from the pause menu, the phone, or a safehouse. Saves are stored in the browser's local storage, so they do not automatically transfer between browsers or devices.

---

*Vice City 3D is an unofficial fan project. It is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.*
