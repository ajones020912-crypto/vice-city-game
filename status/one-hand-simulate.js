function simulate(dt){
 G.time+=dt;updateEconomy(dt);G.clock=(G.clock+dt*.06)%24;
 const play=G.state==='play'&&pl.alive;
 if(!pl.inside){
  // player control
  if(play&&!pl.car)playerOnFoot(dt);
  if(play&&pl.car){const c=pl.car;c.inp.thr=(keys['w']||keys['arrowup']?1:0)-(keys['s']||keys['arrowdown']?1:0);c.inp.steer=(keys['a']||keys['arrowleft']?1:0)-(keys['d']||keys['arrowright']?1:0);c.inp.hb=keys[' ']?1:0;pl.x=c.x;pl.z=c.z;pl.y=c.y;pl.h=c.h;pl.stats.distance+=c.speed*dt}
  if(play){pl.fireT-=dt;pl.punchT-=dt;if(mouseDown&&mouseLocked&&!pl.car){if(pl.weapon==='fists')punch();else fireWeapon()}}
  if(pl.car&&pl.car.dead)ejectPlayer(true);
  // vehicles
  for(const c of cars){if(c.mode==='player'){}else if(c.ai)controlAI(c,dt);else if(c.mode!=='parked'||c.speed>.05||c.dead){c.inp.thr=0;if(!c.occ){c.inp.hb=c.speed<8?1:0}}
   if(c.t.aircraft||c.t.boat||c.speed>.05||c.inp.thr||c.mode==='player'||c.ai||c.dead||c.fire>0||Math.abs(c.pV)>.01){stepCar(c,dt)}
   if(c.speed>1.5)carHitPeds(c)}
  collideNearbyCars();
  for(const c of cars)c.place();
  for(const c of cars){const v=c.v;if(c.dead&&c.mode==='wreck')continue;for(const w of v.wheels){if(w.w)w.w.rotation.x=c.wheelRot;if(w.front&&w.piv)w.piv.rotation.y=c.steer}
   if(!c.t.aircraft){const eng=!!c.occ&&!c.dead,lo=carLightsOn(c),vf=c.vx*Math.sin(c.h)+c.vz*Math.cos(c.h);
    c.lightsOn=lo;c.reversing=eng&&c.inp.thr<0&&vf<-.3;
    const tm=eng&&c.braking?tailOn:lo?tailOff:tailDark;if(v.tail.material!==tm)v.tail.material=tm;
    const hm=lo?headOn:headMat;if(v.head.material!==hm)v.head.material=hm;
    if(v.rev)for(const r of v.rev){const rm=c.reversing?revOn:revOff;if(r.material!==rm)r.material=rm}
    v.beam.visible=lo}
   if(v.bar&&(c.mode==='cop'||c.mode==='parked')&&!c.dead&&c.occ){const f=Math.floor(G.time*6)%2;v.bar[0].visible=!!f;v.bar[1].visible=!f}else if(v.bar&&!c.occ){v.bar[0].visible=v.bar[1].visible=false}}
  for(const p of peds)if(p.active)p.update(dt);for(const p of cops)if(p.active)p.update(dt);for(const p of gangs)if(p.active)p.update(dt);
  updatePopulation(dt);updatePickups(dt);updateWeather(dt);updateGators(dt);updateExtras(dt);
  if(pl.focusT>0)pl.focusT-=G.rdt||dt;
  // wanted decay
  if(pl.wanted>0){let seen=false;for(const c of cars)if(c.mode==='cop'&&!c.dead&&Math.hypot(c.x-pl.x,c.z-pl.z)<70&&policeLineOfSight(c.x,c.y+1.4,c.z))seen=true;for(const p of cops)if(p.active&&!p.dead&&Math.hypot(p.x-pl.x,p.z-pl.z)<60&&policeLineOfSight(p.x,p.y+1.6,p.z))seen=true;
   if(heliSees()||(!pl.inside&&cctvNear()))seen=true;if(seen){pl.sightT=0;G.lastSeen={x:pl.x,z:pl.z}}else pl.sightT+=dt;if(pl.sightT>((pl.heat.cctv?20:14)-(!pl.heat.clothes?3:0)-(!pl.heat.partner?2:0))){pl.sightT=8;pl.crime=Math.max(0,pl.crime-(pl.crime>=22?8:pl.crime>=14?6:4));const w=starsFor(pl.crime);if(w<pl.wanted){pl.wanted=w;G.hudDirty=true;toast(w?'Wanted level dropped: '+'★'.repeat(w):'You lost the cops!')}}}
  // Pay 'n' Spray
  if(pl.car&&!G.busy){for(const g of G.spray){if(Math.hypot(pl.car.x-g.x,pl.car.z-g.z)<4.5&&!pl.car.t.boat&&(pl.wanted>0||pl.car.hp<maxHp(pl.car)*.8)){if(pl.cash<75){if(!(G.sprayWarn>G.time)){toast('Pay \'n\' Spray costs $75');G.sprayWarn=G.time+4}continue}G.busy=true;pl.cash-=75;fadeTo(1,350);const car=pl.car;setTimeout(()=>{car.hp=maxHp(car);if(car._crumple)car._crumple.repairRequested=true;car.fire=0;car.dead=false;clearWanted();{const nc=pick2(car.t.colors||[0xffffff]);car.color=nc;car.v.body.material=paintMat(nc)}fadeTo(0,350);G.busy=false;toast('Resprayed & repaired — heat cleared');G.hudDirty=true;for(const c of cars)if(c.mode==='cop')c.parkedCop=false},500)}}}
  updateMission(dt);
  // giver markers
  for(const q of givers)if(q.g.visible){q.d.rotation.y+=dt*2;q.d.position.y=2.4+Math.sin(G.time*3)*.2}
  for(const d of doorMarks)d.rotation.y+=dt*2;
  ring.rotation.y+=dt*.7;
  if(play&&!MS.active&&!SJ.kind&&!G.work)for(const q of givers){if(!q.g.visible)continue;const d=Math.hypot(q.m.giver[0]-pl.x,q.m.giver[1]-pl.z);if(d<3){startMission(q.m)}}
  // prompts
  let pr='';if(play){if(pl.car)pr=carPrompt();else{const d=nearestDoor();if(d)pr='[E] Enter '+d.name;else{const sp=nearSpot();if(sp)pr=sp.prompt;else{const c=nearestCar();if(c&&!c.dead)pr='[E] '+(c.occ&&c.occ!=='player'?'Carjack ':'Enter ')+c.t.name}}}
   const near=givers.find(q=>q.g.visible&&Math.hypot(q.m.giver[0]-pl.x,q.m.giver[1]-pl.z)<12);if(MS.active)near&&0;else if(near&&!pr)pr='Step into the marker to start: '+near.m.title+' ($'+near.m.reward+')'}
  showPrompt(pr);
  $('#cross').style.display=play&&!pl.car&&pl.weapon!=='fists'?'block':'none';
 } else {
  // inside an interior
  if(play){playerOnFoot(dt);const o=pl.inside.o;animHuman(o.clerk,dt,{speed:0});let pr='';if(Math.hypot(pl.x-o.counter.x,pl.z-o.counter.z)<3.2)pr='[E] '+(o.kind==='safe'?'Use bed / save':'Shop · [R] Rob register');else if(Math.hypot(pl.x-o.exit.x,pl.z-o.exit.z)<3.4)pr='[E] Leave';showPrompt(pr)}
  updateMission(dt);$('#cross').style.display='none'}
 // player model
 if(pl.alive||G.state==='dead'){plH.position.set(pl.x,pl.y,pl.z);const sm=pl.swim;plH.rotation.y+=wrapA(pl.h-plH.rotation.y)*Math.min(1,dt*14);
  animHuman(plH,dt,{speed:pl.car?0:pl.walkSpd,aim:pl.aim>0.1&&pl.weapon!=='fists',punch:pl.punchT>0?1-pl.punchT/.35:0,dead:!pl.alive,weapon:pl.weapon==='fists'?null:pl.weapon,baseY:pl.y});if(sm)plH.position.y=pl.y-.9}
 // regen tiny + hud
 pl.lastHit+=dt;
}