/* One-arm visual punch and brief confirmed-hit particles. No damage calculation changes. */
(function(root){
'use strict';
const cap=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=cap(x,0,1);return x*x*(3-2*x);};
const frames=[[0,-.15,-1.25,0,0],[.30,.35,-1.65,.30,-.12],[.43,.20,-1.5,.22,-.08],[.64,-1.70,-.06,-.30,.16],[.71,-1.62,-.10,-.25,.12],[.86,-.65,-1.20,-.04,.02],[1,0,-.15,0,0]];
function wrap(original){
 if(original.oneHandPunchVersion===1)return original;
 const states=new WeakMap();
 function animate(h,dt,s){
  const u=h&&h.userData;if(!s||!u||!u.hips||!u.spine||!u.A||u.A.length!==2)return original.apply(this,arguments);
  let a=states.get(h);if(!a){a={active:false,time:0,serial:0,arm:1,last:0,direction:0,peak:0};states.set(h,a);}
  if(s.dead||(u.guns&&u.guns[s.weapon])){a.active=false;a.last=0;a.direction=0;return original.apply(this,arguments);}
  const p=Math.max(0,Number(s.punch)||0),delta=p-a.last;let start=p>0&&a.last<=0;
  if(p>0&&a.last>0){const threshold=Math.max(.025,Math.max(a.peak,p)*.45);if(a.direction&&delta*a.direction< -threshold)start=true;else if(Math.abs(delta)>1e-5&&!a.direction)a.direction=Math.sign(delta);}
  if(start){a.active=true;a.time=0;a.serial++;a.direction=0;a.peak=p;}
  a.peak=Math.max(a.peak,p);a.last=p;if(p===0)a.direction=0;if(a.active)a.time+=Number.isFinite(dt)?cap(dt,0,.1):0;
  const args=Array.from(arguments);args[2]=Object.assign({},s,{punch:0});if(a.active)args[2].aim=false;const result=original.apply(this,args);if(!a.active)return result;
  const t=cap(a.time/.35,0,1);if(t>=1){a.active=false;return result;}let k=0;while(k<frames.length-2&&t>frames[k+1][0])k++;
  const f=frames[k],g=frames[k+1],r=smooth((t-f[0])/(g[0]-f[0])),q=f.map((v,i)=>v+(g[i]-v)*r),w=smooth(t/.10)*smooth((1-t)/.14),hit=u.A[1],guard=u.A[0],mix=(x,y)=>x+(y-x)*w;
  hit.sh.rotation.x=mix(hit.sh.rotation.x,q[1]);hit.sh.rotation.y=mix(hit.sh.rotation.y,0);hit.sh.rotation.z=mix(hit.sh.rotation.z,-.10);hit.el.rotation.x=mix(hit.el.rotation.x,q[2]);
  guard.sh.rotation.x=mix(guard.sh.rotation.x,-.85);guard.sh.rotation.y=mix(guard.sh.rotation.y,0);guard.sh.rotation.z=mix(guard.sh.rotation.z,.13);guard.el.rotation.x=mix(guard.el.rotation.x,-1.4);
  u.spine.rotation.y+=q[3]*w;u.hips.rotation.y+=q[3]*w*.35;u.spine.rotation.x+=q[4]*w;if(u.headP)u.headP.rotation.x-=q[4]*w*.35;return result;
 }
 animate.oneHandPunchVersion=1;animate.getPunchState=h=>{const s=states.get(h);return s?Object.assign({},s):null;};return animate;
}
function createBlood(T,world,interior){
 const systems=new Map(),MAX=80;
 function get(parent){if(systems.has(parent))return systems.get(parent);const position=new Float32Array(MAX*3),color=new Float32Array(MAX*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(position,3));geometry.setAttribute('color',new T.BufferAttribute(color,3));geometry.setDrawRange(0,0);const material=new T.PointsMaterial({size:.055,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.9,depthWrite:false}),mesh=new T.Points(geometry,material);mesh.name='melee-hit-blood-particles';mesh.frustumCulled=false;mesh.visible=false;parent.add(mesh);const s={parent,mesh,geometry,position,color,cursor:0,pool:Array.from({length:MAX},()=>({life:0}))};systems.set(parent,s);return s;}
 function sync(s){let n=0;for(const p of s.pool)if(p.life>0){const i=n++*3,fade=Math.min(1,p.life/.12);s.position[i]=p.x;s.position[i+1]=p.y;s.position[i+2]=p.z;s.color[i]=p.red*fade;s.color[i+1]=.008*fade;s.color[i+2]=.018*fade;}s.geometry.setDrawRange(0,n);s.geometry.attributes.position.needsUpdate=true;s.geometry.attributes.color.needsUpdate=true;s.mesh.visible=n>0;}
 return{
  emit(pos,dir,inside){if(![pos.x,pos.y,pos.z,dir.x,dir.z].every(Number.isFinite))return;const parent=inside?interior:world;if(!parent)return;const s=get(parent);if(s.mesh.parent!==parent)parent.add(s.mesh);for(let i=0;i<8;i++){const p=s.pool[s.cursor++%MAX];Object.assign(p,{x:pos.x,y:pos.y,z:pos.z,vx:dir.x*1.5+(Math.random()-.5)*1.5,vy:.3+Math.random()*1.2,vz:dir.z*1.5+(Math.random()-.5)*1.5,life:.25+Math.random()*.15,red:.38+Math.random()*.16});}sync(s);},
  update(dt){dt=Number.isFinite(dt)?cap(dt,0,.1):0;for(const s of systems.values()){for(const p of s.pool)if(p.life>0){p.life=Math.max(0,p.life-dt);p.vy-=6.4*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}sync(s);}},
  clear(){for(const s of systems.values()){for(const p of s.pool)p.life=0;sync(s);}},
  count(){let n=0;for(const s of systems.values())for(const p of s.pool)if(p.life>0)n++;return n;}
 };
}
function wrapDamage(original,host){
 let warned=false;return function(p,d,sx,sz,src,byP){const before=p&&p.hp,eligible=!!(p&&!p.dead&&byP&&src==='punch');const result=original.apply(this,arguments);if(eligible&&Number.isFinite(before)&&p.hp<before){try{const player=host.player(),pos=host.position(p),dx=p.x-player.x,dz=p.z-player.z,len=Math.hypot(dx,dz)||1;host.emit(pos,{x:dx/len,z:dz/len},!!player.inside);}catch(e){if(!warned){warned=true;console.warn('Melee hit particles unavailable',e);}}}return result;};
}
const api={version:1,wrap,createBlood,wrapDamage};if(typeof module==='object'&&module.exports)module.exports=api;else root.VCOneHandHit=api;
})(typeof window!=='undefined'?window:globalThis);
