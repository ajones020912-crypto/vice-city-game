/**
 * Vice City 3D — Enhanced Multiplayer Client Layer
 * -------------------------------------------------
 * Drop-in upgrade over the original inline mp* functions.
 * Load AFTER Three.js and the main game script, or include
 * via a <script src="/js/mp.js"> tag near the end of index.html.
 *
 * Features:
 *  • Smoother Hermite / velocity-aware interpolation
 *  • Character-aware avatars (Jason / Lucia colour variants)
 *  • Vehicle colour & type hinting
 *  • Name tags with health / wanted indicators
 *  • Proximity + global chat UI
 *  • Automatic reconnection with exponential backoff
 *  • Uses richer server state when available, falls back gracefully
 *
 * Public API (also attached to window.VCMultiplayer):
 *   mpConnect() / mpTick(dt) / mpUpsert / mpRemove / etc.
 *   The original global names are preserved so existing calls keep working.
 */
(function (global) {
  'use strict';

  // Guard – only enhance once
  if (global.__VC_MP_ENHANCED__) return;
  global.__VC_MP_ENHANCED__ = true;

  const T = global.THREE || global.T;
  if (!T) {
    console.warn('[mp.js] THREE not found – multiplayer visuals disabled');
  }

  // ---------------------------------------------------------------------------
  // State (re-uses / upgrades the globals the original game already declares)
  // ---------------------------------------------------------------------------
  let mpSocket   = global.mpSocket   || null;
  let mpPeers    = global.mpPeers    || new Map();
  let mpActive   = global.mpActive   || false;
  let mpSendTimer = 0;
  let mpReconnectAttempts = 0;
  let mpIntentionalClose = false;
  let mpChatLog = [];
  const MAX_CHAT = 40;

  // Expose so original code that closes over the old variables still sees updates
  function syncGlobals() {
    global.mpSocket = mpSocket;
    global.mpPeers  = mpPeers;
    global.mpActive = mpActive;
  }

  // ---------------------------------------------------------------------------
  // Visual helpers
  // ---------------------------------------------------------------------------
  const CHAR_COLORS = {
    jason: { shirt: 0xf3f1ec, accent: 0x4b5a3a },
    lucia: { shirt: 0x1c1c22, accent: 0xff6f5e },
  };

  function makeNameTexture(name, colorHex, health, wanted) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');

    // Background
    ctx.fillStyle = 'rgba(4,15,25,0.82)';
    ctx.fillRect(8, 12, 496, 104);
    ctx.strokeStyle = '#' + (colorHex >>> 0).toString(16).padStart(6, '0');
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 12, 496, 104);

    // Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(name || 'PLAYER').slice(0, 16), 256, 52);

    // Health bar
    if (typeof health === 'number') {
      const w = 200;
      const h = 10;
      const x = 256 - w / 2;
      const y = 90;
      ctx.fillStyle = '#222';
      ctx.fillRect(x, y, w, h);
      const pct = Math.max(0, Math.min(1, health / 100));
      ctx.fillStyle = pct > 0.4 ? '#3dce7a' : pct > 0.2 ? '#e6b422' : '#e04848';
      ctx.fillRect(x, y, w * pct, h);
    }

    // Wanted stars (tiny)
    if (wanted > 0) {
      ctx.fillStyle = '#ffd23a';
      ctx.font = '18px Arial';
      ctx.fillText('★'.repeat(Math.min(6, wanted)), 256, 18);
    }

    const tex = new T.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function mpMakeAvatar(name, char, color) {
    const g = new T.Group();
    const palette = CHAR_COLORS[char] || CHAR_COLORS.jason;
    const accent = color || palette.accent;

    const shirt = new T.MeshStandardMaterial({ color: palette.shirt, roughness: 0.8 });
    const skin  = new T.MeshStandardMaterial({ color: 0xc98e68, roughness: 0.9 });
    const dark  = new T.MeshStandardMaterial({ color: 0x25364a, roughness: 0.9 });
    const accentMat = new T.MeshStandardMaterial({ color: accent, roughness: 0.55, metalness: 0.15 });

    const body = new T.Mesh(new T.CylinderGeometry(0.34, 0.40, 0.85, 10), shirt);
    body.position.y = 1.05; g.add(body);

    const neck = new T.Mesh(new T.SphereGeometry(0.28, 12, 10), shirt);
    neck.position.y = 1.48; g.add(neck);

    const head = new T.Mesh(new T.SphereGeometry(0.27, 12, 10), skin);
    head.position.y = 1.82; g.add(head);

    for (const x of [-0.17, 0.17]) {
      const leg = new T.Mesh(new T.BoxGeometry(0.19, 0.65, 0.20), dark);
      leg.position.set(x, 0.35, 0);
      g.add(leg);
    }

    // Accent shoulder stripe so players are distinguishable
    const stripe = new T.Mesh(new T.BoxGeometry(0.72, 0.08, 0.12), accentMat);
    stripe.position.set(0, 1.28, 0.28);
    g.add(stripe);

    const tex = makeNameTexture(name, accent, 100, 0);
    const spr = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.position.y = 2.55;
    spr.scale.set(4.6, 1.15, 1);
    g.add(spr);

    g.userData.labelTex = tex;
    g.userData.labelSprite = spr;
    g.userData.char = char;
    g.userData.accent = accent;

    if (global.scene) global.scene.add(g);
    return g;
  }

  function mpMakeCar(color) {
    const g = new T.Group();
    const bodyCol = color || 0xff5a9e;
    const body = new T.Mesh(
      new T.BoxGeometry(2.2, 0.65, 4.1),
      new T.MeshStandardMaterial({ color: bodyCol, metalness: 0.35, roughness: 0.5 })
    );
    body.position.y = 0.85; g.add(body);

    const top = new T.Mesh(
      new T.BoxGeometry(1.65, 0.65, 1.9),
      new T.MeshStandardMaterial({ color: 0x263b50, metalness: 0.2, roughness: 0.35 })
    );
    top.position.set(0, 1.42, -0.15); g.add(top);

    const wheelMat = new T.MeshStandardMaterial({ color: 0x111820, roughness: 0.95 });
    for (const x of [-1, 1]) {
      for (const z of [-1.25, 1.25]) {
        const w = new T.Mesh(new T.CylinderGeometry(0.38, 0.38, 0.22, 12), wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x * 1.08, 0.42, z);
        g.add(w);
      }
    }

    if (global.scene) global.scene.add(g);
    g.visible = false;
    return g;
  }

  function updateNameTag(peer) {
    if (!peer.g?.userData?.labelSprite) return;
    const old = peer.g.userData.labelTex;
    const tex = makeNameTexture(peer.name, peer.color || 0x36c9bd, peer.health, peer.wanted);
    peer.g.userData.labelSprite.material.map = tex;
    peer.g.userData.labelSprite.material.needsUpdate = true;
    peer.g.userData.labelTex = tex;
    if (old) old.dispose();
  }

  // ---------------------------------------------------------------------------
  // Peer management
  // ---------------------------------------------------------------------------
  function mpUpsert(id, data) {
    if (!data || (mpSocket && id === mpSocket.id)) return;

    let peer = mpPeers.get(id);
    if (!peer) {
      const char = data.char === 'lucia' ? 'lucia' : 'jason';
      peer = {
        g: mpMakeAvatar(data.name || 'PLAYER', char, data.color),
        car: mpMakeCar(data.vehicleColor || data.color),
        target: new T.Vector3(),
        prev: new T.Vector3(),
        velocity: new T.Vector3(),
        heading: 0,
        targetHeading: 0,
        name: data.name || 'PLAYER',
        char,
        color: data.color || 0x36c9bd,
        vehicle: false,
        health: 100,
        wanted: 0,
        lastUpdate: performance.now(),
        far: false,
      };
      mpPeers.set(id, peer);
    }

    // Position + velocity
    const nx = Number(data.x) || 0;
    const ny = Number(data.y) || 0;
    const nz = Number(data.z) || 0;

    peer.prev.copy(peer.target);
    peer.target.set(nx, ny, nz);

    if (Number.isFinite(data.vx) && Number.isFinite(data.vz)) {
      peer.velocity.set(data.vx, 0, data.vz);
    } else {
      const dt = Math.max(0.016, (performance.now() - peer.lastUpdate) / 1000);
      peer.velocity.set(
        (nx - peer.prev.x) / dt,
        0,
        (nz - peer.prev.z) / dt
      );
    }

    peer.targetHeading = Number(data.h) || 0;
    peer.name = data.name || peer.name;
    peer.vehicle = !!data.vehicle;
    peer.far = !!data.far;
    peer.lastUpdate = performance.now();

    if (typeof data.health === 'number') peer.health = data.health;
    if (typeof data.wanted === 'number') peer.wanted = data.wanted;

    // Character / colour changes
    if (data.char && data.char !== peer.char) {
      peer.char = data.char === 'lucia' ? 'lucia' : 'jason';
    }
    if (data.color && data.color !== peer.color) {
      peer.color = data.color;
    }
    if (data.vehicleColor && peer.car) {
      peer.car.children[0].material.color.setHex(data.vehicleColor);
    }

    peer.g.visible = !peer.vehicle;
    peer.car.visible = peer.vehicle;

    updateNameTag(peer);
    syncGlobals();
  }

  function mpRemove(id) {
    const p = mpPeers.get(id);
    if (!p) return;

    if (global.scene) {
      global.scene.remove(p.g);
      global.scene.remove(p.car);
    }

    const dispose = (obj) => {
      obj.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    };
    dispose(p.g);
    dispose(p.car);
    p.g.userData.labelTex?.dispose();

    mpPeers.delete(id);
    syncGlobals();
  }

  // ---------------------------------------------------------------------------
  // Smooth interpolation (velocity-assisted)
  // ---------------------------------------------------------------------------
  function mpTick(dt) {
    if (!mpActive || !mpSocket?.connected) return;
    if (global.G && global.G.state !== 'play') return;

    // Send local state
    mpSendTimer += dt;
    if (mpSendTimer >= 0.05) {          // ~20 Hz
      mpSendTimer = 0;
      sendLocalState();
    }

    // Interpolate remote players
    const now = performance.now();
    for (const peer of mpPeers.values()) {
      const age = (now - peer.lastUpdate) / 1000;

      // Extrapolate a little using last known velocity, then lerp toward target
      const predict = peer.target.clone().addScaledVector(peer.velocity, Math.min(age, 0.25));
      const lerpFactor = peer.far ? 0.12 : 0.28;

      peer.g.position.lerp(predict, lerpFactor);
      peer.car.position.lerp(predict, lerpFactor);

      // Heading
      let dh = peer.targetHeading - peer.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      peer.heading += dh * (peer.far ? 0.15 : 0.35);
      peer.g.rotation.y = peer.heading;
      peer.car.rotation.y = peer.heading;
    }
  }

  function sendLocalState() {
    if (!mpSocket?.connected) return;
    const pl = global.pl;
    if (!pl) return;

    const x = pl.car ? pl.car.x : pl.x;
    const y = pl.car ? pl.car.y : pl.y;
    const z = pl.car ? pl.car.z : pl.z;
    const h = pl.car ? pl.car.h : pl.h;

    const payload = {
      x, y, z, h,
      char: pl.char || 'jason',
      vehicle: !!pl.car,
      name: (document.getElementById('mpName')?.value || 'Player').trim().slice(0, 16),
    };

    // Richer fields when available
    if (pl.car) {
      payload.vehicleType = pl.car.type || pl.car.name || 'car';
      if (pl.car.color != null) payload.vehicleColor = pl.car.color;
    }
    if (typeof pl.health === 'number') payload.health = pl.health;
    if (typeof pl.wanted === 'number') payload.wanted = pl.wanted;
    if (typeof pl.weapon === 'number') payload.weapon = pl.weapon;

    mpSocket.emit('player-state', payload);
  }

  // ---------------------------------------------------------------------------
  // Connection / reconnection
  // ---------------------------------------------------------------------------
  function mpStatus(msg) {
    const el = document.getElementById('mpStatus');
    if (el) el.textContent = msg;
  }

  function mpSetOnline(n) {
    const el = document.getElementById('mpOnline');
    if (el) el.textContent = 'Players online: ' + Math.max(0, Number(n) || 0);
  }

  function mpConnect() {
    const nameInput = document.getElementById('mpName');
    const name = (nameInput?.value || 'Player').trim().slice(0, 16) || 'Player';
    mpStatus('Connecting to the multiplayer server…');
    mpIntentionalClose = false;
    mpReconnectAttempts = 0;

    const doConnect = () => {
      if (!global.io) {
        mpStatus('Could not load the online connection library. Make sure the game is opened from its multiplayer server URL.');
        return;
      }
      if (mpSocket) {
        mpSocket.removeAllListeners();
        mpSocket.disconnect();
        mpSocket = null;
      }

      mpSocket = global.io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 12,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 8000,
        timeout: 12000,
      });
      syncGlobals();

      mpSocket.on('connect', () => {
        mpReconnectAttempts = 0;
        mpStatus('Connected. Joining the shared world…');
        mpSocket.emit('join-world', {
          name,
          char: (global.pl && global.pl.char) || 'jason',
        });
      });

      mpSocket.on('connect_error', () => {
        mpStatus('Could not reach the server. Deploy as a Node Web Service, then open the hosted game URL.');
      });

      mpSocket.on('disconnect', (reason) => {
        if (mpIntentionalClose) return;
        mpStatus('Disconnected (' + reason + '). Reconnecting…');
      });

      mpSocket.on('reconnect', (attempt) => {
        mpStatus('Reconnected (attempt ' + attempt + '). Re-joining…');
        mpSocket.emit('join-world', { name, char: (global.pl && global.pl.char) || 'jason' });
      });

      mpSocket.on('room-error', (d) => mpStatus(d?.message || 'Could not join online.'));
      mpSocket.on('room-full', () => mpStatus('The world is full right now. Try again in a moment.'));
      mpSocket.on('online-count', (d) => mpSetOnline(d?.count));

      mpSocket.on('world-joined', (d) => mpEntered(d));
      mpSocket.on('player-joined', (d) => {
        if (d?.id) mpUpsert(d.id, d.player);
        mpStatus((mpPeers.size + 1) + ' players in the city.');
      });
      mpSocket.on('player-left', (d) => {
        mpRemove(d.id);
        mpStatus(Math.max(1, mpPeers.size + 1) + ' players in the city.');
        if (d.name) toastSafe(d.name + ' left the city', 2500);
      });
      mpSocket.on('state-update', (d) => {
        if (d?.id) mpUpsert(d.id, d.player);
      });

      // New richer events
      mpSocket.on('state-reject', (d) => {
        console.debug('[mp] state rejected', d?.reason);
      });

      mpSocket.on('chat', (msg) => {
        pushChat(msg);
      });

      mpSocket.on('chat-reject', () => {
        pushChat({ from: 'System', text: 'Slow down – chat rate limited.', color: 0xff6b6b, ts: Date.now() });
      });

      mpSocket.on('server-shutdown', (d) => {
        mpStatus(d?.message || 'Server is restarting…');
        toastSafe('Server restarting – you will reconnect automatically', 5000);
      });
    };

    if (global.io) {
      doConnect();
      return;
    }

    // Load socket.io client from the same origin
    let script = document.getElementById('socketIoClient');
    if (!script) {
      script = document.createElement('script');
      script.id = 'socketIoClient';
      script.src = '/socket.io/socket.io.js';
      script.onload = doConnect;
      script.onerror = () => mpStatus('Multiplayer server not found. Open the game from its deployed server address.');
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', doConnect, { once: true });
    }
  }

  function mpEntered(d) {
    mpActive = true;
    // Clear old peers
    for (const id of [...mpPeers.keys()]) mpRemove(id);

    (d.players || []).forEach((p) => mpUpsert(p.id, p));
    mpSetOnline(d.count != null ? d.count : (mpPeers.size + 1));
    mpStatus('You are online. Explore the shared city with everyone else.');

    const lobby = document.getElementById('mpLobby');
    if (lobby) lobby.style.display = 'none';
    const ov = document.getElementById('overlay');
    if (ov) ov.style.display = 'none';

    if (global.G) global.G.multiplayer = true;
    if (typeof global.begin === 'function') global.begin(false);

    toastSafe('Online · ' + (d.count != null ? d.count : (mpPeers.size + 1)) + ' player(s) in the city', 4500);
    ensureChatUI();
    syncGlobals();
  }

  // ---------------------------------------------------------------------------
  // Chat UI
  // ---------------------------------------------------------------------------
  function ensureChatUI() {
    if (document.getElementById('mpChatBox')) return;

    const style = document.createElement('style');
    style.textContent = `
      #mpChatBox{position:fixed;left:12px;bottom:70px;width:340px;max-height:220px;
        display:flex;flex-direction:column;pointer-events:none;z-index:40;font-family:system-ui,sans-serif}
      #mpChatLog{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:3px;
        mask-image:linear-gradient(transparent,black 20%);padding-bottom:6px}
      .mp-chat-line{background:rgba(4,15,25,.72);color:#e8f4ff;padding:4px 8px;border-radius:6px;
        font-size:13px;line-height:1.3;border-left:3px solid #36c9bd;word-break:break-word}
      .mp-chat-line .from{font-weight:700;margin-right:6px}
      #mpChatForm{display:none;pointer-events:auto;margin-top:4px}
      #mpChatForm input{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;
        border:1px solid #2a4a5a;background:rgba(8,20,32,.9);color:#fff;font-size:14px;outline:none}
      #mpChatForm input:focus{border-color:#36c9bd}
      #mpChatHint{position:fixed;left:12px;bottom:48px;color:rgba(255,255,255,.45);font-size:11px;
        font-family:system-ui,sans-serif;pointer-events:none;z-index:40}
    `;
    document.head.appendChild(style);

    const box = document.createElement('div');
    box.id = 'mpChatBox';
    box.innerHTML = `
      <div id="mpChatLog"></div>
      <form id="mpChatForm" autocomplete="off">
        <input id="mpChatInput" maxlength="140" placeholder="Type a message…" />
      </form>
    `;
    document.body.appendChild(box);

    const hint = document.createElement('div');
    hint.id = 'mpChatHint';
    hint.textContent = 'Press Enter to chat';
    document.body.appendChild(hint);

    const form = document.getElementById('mpChatForm');
    const input = document.getElementById('mpChatInput');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (text && mpSocket?.connected) {
        mpSocket.emit('chat', { text });
      }
      input.value = '';
      form.style.display = 'none';
      hint.style.display = 'block';
      if (document.body.requestPointerLock) {
        try { document.body.requestPointerLock(); } catch (_) {}
      }
    });

    // Toggle chat with Enter
    window.addEventListener('keydown', (e) => {
      if (!mpActive) return;
      if (e.code === 'Enter' || e.key === 'Enter') {
        if (form.style.display === 'block') return;
        e.preventDefault();
        e.stopPropagation();
        form.style.display = 'block';
        hint.style.display = 'none';
        input.focus();
        if (document.exitPointerLock) document.exitPointerLock();
      }
      if (e.code === 'Escape' && form.style.display === 'block') {
        form.style.display = 'none';
        hint.style.display = 'block';
        input.blur();
      }
    }, true);
  }

  function pushChat(msg) {
    mpChatLog.push(msg);
    if (mpChatLog.length > MAX_CHAT) mpChatLog.shift();

    const log = document.getElementById('mpChatLog');
    if (!log) return;

    const line = document.createElement('div');
    line.className = 'mp-chat-line';
    const col = msg.color ? '#' + (msg.color >>> 0).toString(16).padStart(6, '0') : '#36c9bd';
    line.style.borderLeftColor = col;
    line.innerHTML = `<span class="from" style="color:${col}">${escapeHtml(msg.from || '?')}</span>${escapeHtml(msg.text || '')}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;

    while (log.children.length > MAX_CHAT) log.removeChild(log.firstChild);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  function toastSafe(msg, ms) {
    if (typeof global.toast === 'function') global.toast(msg, ms);
    else console.log('[toast]', msg);
  }

  // ---------------------------------------------------------------------------
  // Wire up lobby buttons if they exist (idempotent)
  // ---------------------------------------------------------------------------
  function wireLobby() {
    const openBtn = document.getElementById('multiplayerOpen');
    if (openBtn && !openBtn.__mpWired) {
      openBtn.__mpWired = true;
      openBtn.addEventListener('click', () => {
        const lobby = document.getElementById('mpLobby');
        if (lobby) lobby.style.display = 'grid';
        mpStatus('Everyone joins the same shared city. No codes needed.');
        mpSetOnline('…');
        fetch('/api/online', { cache: 'no-store' })
          .then((r) => r.ok ? r.json() : null)
          .then((j) => j && mpSetOnline(j.count))
          .catch(() => {});
      });
    }

    const backBtn = document.getElementById('mpBack');
    if (backBtn && !backBtn.__mpWired) {
      backBtn.__mpWired = true;
      backBtn.addEventListener('click', () => {
        const lobby = document.getElementById('mpLobby');
        if (lobby) lobby.style.display = 'none';
      });
    }

    const hostBtn = document.getElementById('mpHost');
    if (hostBtn && !hostBtn.__mpWired) {
      hostBtn.__mpWired = true;
      hostBtn.addEventListener('click', () => mpConnect());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireLobby);
  } else {
    wireLobby();
  }

  // ---------------------------------------------------------------------------
  // Public exports – overwrite the original globals so existing calls upgrade
  // ---------------------------------------------------------------------------
  global.mpConnect   = mpConnect;
  global.mpTick      = mpTick;
  global.mpUpsert    = mpUpsert;
  global.mpRemove    = mpRemove;
  global.mpSetOnline = mpSetOnline;
  global.mpStatus    = mpStatus;
  global.mpMakeAvatar = mpMakeAvatar;
  global.mpMakeCar   = mpMakeCar;

  global.VCMultiplayer = {
    connect: mpConnect,
    tick: mpTick,
    upsert: mpUpsert,
    remove: mpRemove,
    get peers() { return mpPeers; },
    get active() { return mpActive; },
    get socket() { return mpSocket; },
    sendChat(text) {
      if (mpSocket?.connected) mpSocket.emit('chat', { text });
    },
  };

  console.log('[mp.js] Enhanced multiplayer client loaded');
})(typeof window !== 'undefined' ? window : globalThis);
