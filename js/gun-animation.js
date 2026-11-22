/* Visual gun handling only: no damage, ammo, timing or input changes. */
(function(root){
'use strict';
const pending=new WeakMap(),profiles={pistol:{x:.08,y:-.10,z:.43,grip:[-.06,-.015,-.035],kick:1},smg:{x:.10,y:-.12,z:.33,grip:[-.065,-.15,-.025],kick:.4},shot:{x:.11,y:-.14,z:.26,grip:[-.065,-.22,-.025],kick:1.3},rifle:{x:.11,y:-.14,z:.26,grip:[-.065,-.22,-.025],kick:.65}};
const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
function notifyShot(h,weapon){if(h&&Object.prototype.hasOwnProperty.call(profiles,weapon)){const old=pending.get(h);pending.set(h,{weapon,count:Math.min(4,(old&&old.weapon===weapon?old.count:0)+1)});}}
function wrap(original,T){
 if(original.gunAnimationVersion===1)return original;
 const states=new WeakMap(),down=new T.Vector3(0,-1,0);
 function create(u){
  const mount=u.guns.pistol&&u.guns.pistol.parent;
  if(!mount||mount.parent!==u.A[1].el||u.A.some(a=>a.sh.parent!==u.spine||Math.abs(a.el.position.x)+Math.abs(a.el.position.z)>.001)||Math.abs(mount.position.x)+Math.abs(mount.position.z)>.001||mount.position.y>=-.05)return null;
  const c={u,mount,aim:0,draw:0,kick:0,velocity:0,applied:false,hand:new T.Vector3(),offset:new T.Vector3(),goal:new T.Vector3(),target:new T.Vector3(),direction:new T.Vector3(),pole:new T.Vector3(),elbow:new T.Vector3(),local:new T.Vector3(),desired:new T.Quaternion(),inverse:new T.Quaternion(),combined:new T.Quaternion(),gunGoal:new T.Quaternion(),euler:new T.Euler(),savedGun:new T.Quaternion(),savedSpine:new T.Quaternion(),bones:[]};
  for(const a of u.A)c.bones.push({a,U:a.el.position.length(),F:-mount.position.y,sh:new T.Quaternion(),el:new T.Quaternion(),savedSh:new T.Quaternion(),savedEl:new T.Quaternion()});
  c.scale=(c.bones[1].U+c.bones[1].F)/.59;c.centerX=(u.A[0].sh.position.x+u.A[1].sh.position.x)/2;c.centerY=(u.A[0].sh.position.y+u.A[1].sh.position.y)/2;c.centerZ=(u.A[0].sh.position.z+u.A[1].sh.position.z)/2;
  c.hand.set(c.centerX+.13*c.scale,c.centerY-.29*c.scale,c.centerZ+.21*c.scale);c.offset.set(-.06,-.015,-.035).multiplyScalar(c.scale);return c;
 }
 function restore(c){if(!c.applied)return;for(const b of c.bones){b.a.sh.quaternion.copy(b.savedSh);b.a.el.quaternion.copy(b.savedEl);}c.mount.quaternion.copy(c.savedGun);c.u.spine.quaternion.copy(c.savedSpine);c.applied=false;}
 function solve(c,b,target,side){
  const shoulder=b.a.sh.position,d=c.direction.copy(target).sub(shoulder),distance=cap(d.length(),Math.abs(b.U-b.F)+.0001,b.U+b.F-.0001);d.normalize();
  const along=(b.U*b.U-b.F*b.F+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,b.U*b.U-along*along));
  c.pole.set(side*.55*c.scale+c.centerX,c.centerY-.50*c.scale,c.centerZ+.05*c.scale).sub(shoulder);c.pole.addScaledVector(d,-c.pole.dot(d)).normalize();
  c.elbow.copy(shoulder).addScaledVector(d,along).addScaledVector(c.pole,height);
  c.local.copy(c.elbow).sub(shoulder).normalize();b.sh.setFromUnitVectors(down,c.local);
  c.local.copy(shoulder).addScaledVector(d,distance).sub(c.elbow).normalize().applyQuaternion(c.inverse.copy(b.sh).invert());b.el.setFromUnitVectors(down,c.local);
 }
 function animate(h,dt,s){
  const u=h&&h.userData;let c=h&&states.get(h);if(c)restore(c);
  const armed=!!(s&&!s.dead&&u&&u.spine&&u.A&&u.A.length===2&&u.guns&&Object.prototype.hasOwnProperty.call(profiles,s.weapon)&&u.guns[s.weapon]);
  if(!armed){if(c)c.aim=c.draw=c.kick=c.velocity=0;if(h)pending.delete(h);return original.apply(this,arguments);}
  if(!c){c=create(u);if(!c)return original.apply(this,arguments);states.set(h,c);}
  const args=Array.from(arguments);args[2]=Object.assign({},s,{aim:false,punch:0});const result=original.apply(this,args),step=Number.isFinite(dt)?cap(dt,0,.1):0,p=profiles[s.weapon],shot=pending.get(h);pending.delete(h);
  if(shot&&shot.weapon===s.weapon)c.velocity=Math.min(150,c.velocity+20*Math.E*p.kick*shot.count);
  const v=c.velocity+20*c.kick,decay=Math.exp(-20*step);c.kick=(c.kick+v*step)*decay;c.velocity=(c.velocity-20*v*step)*decay;const kick=cap(c.kick,0,1.8);
  c.aim+=(Number(!!s.aim)-c.aim)*(1-Math.exp(-step*(s.aim?18:11)));c.draw+=(1-c.draw)*(1-Math.exp(-step*18));const aim=Math.max(c.aim,Math.min(1,kick*.8)),scale=c.scale;
  c.goal.set(c.centerX+(.13+(p.x-.13)*aim)*scale,c.centerY+(-.29+(p.y+.29)*aim+.008*kick)*scale,c.centerZ+(.21+(p.z-.21)*aim-.028*kick)*scale);c.hand.lerp(c.goal,1-Math.exp(-step*24));
  c.goal.set(...p.grip).multiplyScalar(scale);c.offset.lerp(c.goal,1-Math.exp(-step*24));c.desired.setFromEuler(c.euler.set(-1.04+(-Math.PI/2+1.04)*aim-.12*kick,0,0));
  for(const b of c.bones){b.savedSh.copy(b.a.sh.quaternion);b.savedEl.copy(b.a.el.quaternion);}c.savedGun.copy(c.mount.quaternion);c.savedSpine.copy(u.spine.quaternion);
  const speed=Math.max(0,Number(s.speed)||0),weight=c.draw*(aim+(1-aim)*(1-.65*cap((speed-4)/4,0,1)));
  solve(c,c.bones[1],c.hand,1);c.target.copy(c.offset).applyQuaternion(c.desired).add(c.hand);solve(c,c.bones[0],c.target,-1);
  for(const b of c.bones){b.a.sh.quaternion.slerp(b.sh,weight);b.a.el.quaternion.slerp(b.el,weight);}
  c.combined.multiplyQuaternions(u.A[1].sh.quaternion,u.A[1].el.quaternion);c.gunGoal.copy(c.combined).invert().multiply(c.desired);c.mount.quaternion.slerp(c.gunGoal,weight);
  u.spine.rotation.y*=1-aim*.9;u.spine.rotation.z*=1-aim*.85;u.spine.rotation.x+=(.04-u.spine.rotation.x)*aim-.018*kick;c.applied=true;return result;
 }
 animate.gunAnimationVersion=1;animate.inspect=h=>{const c=states.get(h);return c?{aim:c.aim,draw:c.draw,kick:c.kick,applied:c.applied}:null;};return animate;
}
const api={version:1,wrap,notifyShot};if(typeof module==='object'&&module.exports)module.exports=api;else root.VCGunAnimation=api;
})(typeof window!=='undefined'?window:globalThis);
