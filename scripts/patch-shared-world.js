// Run in GitHub Actions to convert room-code multiplayer UI to shared world + online count.
const fs = require('fs');
let s = fs.readFileSync('index.html', 'utf8');

if (s.includes('id="mpCode"')) {
  const newLobby =
    'id="mpLobby" class="mp-screen" style="display:none"><div class="mp-card">' +
    '<button id="mpBack" class="mp-back">\u2190 BACK</button>' +
    '<div class="home-kicker">ONLINE SESSION</div><h2>PLAY ONLINE</h2>' +
    '<label for="mpName">PLAYER NAME</label>' +
    '<input id="mpName" maxlength="16" value="Player" autocomplete="nickname">' +
    '<div class="mp-actions"><button id="mpHost">JOIN WORLD</button></div>' +
    '<div id="mpOnline" class="mp-room" style="display:block">Players online: \u2026</div>' +
    '<div id="mpStatus" class="mp-status">Everyone joins the same shared city. No codes needed.</div>' +
    '</div></div>';
  s = s.replace(/id="mpLobby"[^>]*>[\s\S]*?<\/div><\/div>(?=\s*<script)/, newLobby);
}

const start = s.indexOf('function mpConnect(');
const end = s.indexOf('function mpTick(', start);
if (start < 0 || end < 0) throw new Error('mpConnect/mpTick anchors missing');

const newConnect = `function mpSetOnline(n){\n const el=document.getElementById('mpOnline');\n if(el)el.textContent='Players online: '+Math.max(0,Number(n)||0);\n}\nfunction mpConnect(){\n const name=(document.getElementById('mpName').value||'Player').trim().slice(0,16)||'Player';\n mpStatus('Connecting to the multiplayer server\u2026');\n const load=()=>{\n  if(!window.io){mpStatus('Could not load the online connection library. Make sure the game is deployed on its multiplayer server.');return}\n  if(mpSocket){mpSocket.disconnect();mpSocket=null}\n  mpSocket=window.io({transports:['websocket','polling']});\n  mpSocket.on('connect',()=>{mpStatus('Connected. Joining the shared world\u2026');mpSocket.emit('join-world',{name})});\n  mpSocket.on('connect_error',()=>mpStatus('Could not reach the server. Deploy as a Node Web Service, then open the hosted game URL.'));\n  mpSocket.on('room-error',d=>mpStatus(d?.message||'Could not join online.'));\n  mpSocket.on('room-full',()=>mpStatus('The world is full right now. Try again in a moment.'));\n  mpSocket.on('online-count',d=>mpSetOnline(d?.count));\n  mpSocket.on('world-joined',d=>mpEntered(d));\n  mpSocket.on('player-joined',d=>{if(d?.id)mpUpsert(d.id,d.player);mpStatus((mpPeers.size+1)+' players in the city.')});\n  mpSocket.on('player-left',d=>{mpRemove(d.id);mpStatus(Math.max(1,mpPeers.size+1)+' players in the city.')});\n  mpSocket.on('state-update',d=>{if(d?.id)mpUpsert(d.id,d.player)});\n };\n if(window.io){load();return}\n let script=document.getElementById('socketIoClient');\n if(!script){\n  script=document.createElement('script');script.id='socketIoClient';script.src='/socket.io/socket.io.js';\n  script.onload=load;\n  script.onerror=()=>mpStatus('Multiplayer server not found. Open the game from its deployed server address.');\n  document.head.appendChild(script);\n }else{\n  script.addEventListener('load',load,{once:true});\n  if(script.dataset.failed)mpStatus('Multiplayer server not found.');\n }\n}\nfunction mpEntered(d){\n mpActive=true;mpPeers.clear();\n (d.players||[]).forEach(p=>mpUpsert(p.id,p));\n mpSetOnline(d.count!=null?d.count:(mpPeers.size+1));\n mpStatus('You are online. Explore the shared city with everyone else.');\n document.getElementById('mpLobby').style.display='none';\n const ov=document.getElementById('overlay');if(ov)ov.style.display='none';\n G.multiplayer=true;begin(false);\n toast('Online \u00b7 '+(d.count!=null?d.count:(mpPeers.size+1))+' player(s) in the city',4500);\n}\n`;

s = s.slice(0, start) + newConnect + s.slice(end);

s = s.replace(
  /document\.getElementById\('multiplayerOpen'\)\.onclick=[\s\S]*?document\.getElementById\('mpJoin'\)\.onclick=[\s\S]*?;\n/,
  `document.getElementById('multiplayerOpen').onclick=()=>{\n document.getElementById('mpLobby').style.display='grid';\n mpStatus('Everyone joins the same shared city. No codes needed.');\n mpSetOnline('\u2026');\n (async()=>{try{const r=await fetch('/api/online',{cache:'no-store'});if(r.ok){const j=await r.json();mpSetOnline(j.count)}}catch(e){}})();\n};\ndocument.getElementById('mpBack').onclick=()=>{document.getElementById('mpLobby').style.display='none'};\ndocument.getElementById('mpHost').onclick=()=>mpConnect();\n`
);

if (s.includes('id="mpCode"')) throw new Error('mpCode still present');
if (!s.includes('JOIN WORLD')) throw new Error('JOIN WORLD missing');
if (!s.includes('join-world')) throw new Error('join-world missing');

fs.writeFileSync('index.html', s);
console.log('Patched index.html', fs.statSync('index.html').size);
