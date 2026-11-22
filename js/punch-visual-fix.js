/* Visual-only punch playback; damage and attack cooldowns remain in the game. */
(function(root){
 'use strict';
 const frames=[[0,-.55,-1.30,.02,-.02],[.18,-.35,-1.55,.18,-.12],[.45,-1.65,-.08,-.28,.16],[.56,-1.60,-.12,-.25,.14],[.80,-.80,-1.30,.02,-.02],[1,0,-.15,0,0]];
 const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
 const smooth=x=>{x=limit(x,0,1);return x*x*(3-2*x);};
 function wrap(original){
  if(typeof original!=='function')throw Error('Native animHuman is required');
  if(original.visiblePunchVersion===1)return original;
  const states=new WeakMap();
  function animated(h,dt,s){
   const u=h&&h.userData;
   if(!s||!u||!u.hips||!u.spine||!u.A||u.A.length!==2||!u.A.every(a=>a.sh&&a.el))return original.apply(this,arguments);
   let a=states.get(h);if(!a){a={active:false,time:0,serial:0,arm:1,last:0,direction:0,peak:0};states.set(h,a);}
   const armed=!!(u.guns&&u.guns[s.weapon]);
   if(s.dead||armed){a.active=false;a.last=0;a.direction=0;return original.apply(this,arguments);}
   const p=Math.max(0,Number(s.punch)||0),delta=p-a.last;
   let start=p>0&&a.last<=0;
   if(p>0&&a.last>0){
    const threshold=Math.max(.025,Math.max(a.peak,p)*.45);
    if(a.direction&&delta*a.direction< -threshold)start=true;
    else if(Math.abs(delta)>1e-5&&!a.direction)a.direction=Math.sign(delta);
   }
   if(start){a.active=true;a.time=0;a.serial++;a.arm=a.serial%2;a.direction=0;a.peak=p;}
   a.peak=Math.max(a.peak,p);a.last=p;
   if(p===0)a.direction=0;
   if(a.active)a.time+=Number.isFinite(dt)?limit(dt,0,.1):0;
   const args=Array.from(arguments);args[2]=Object.assign({},s,{punch:0});
   if(a.active)args[2].aim=false;
   const result=original.apply(this,args);
   if(!a.active)return result;
   const t=limit(a.time/.34,0,1);if(t>=1){a.active=false;return result;}
   let k=0;while(k<frames.length-2&&t>frames[k+1][0])k++;
   const f=frames[k],g=frames[k+1],r=smooth((t-f[0])/(g[0]-f[0])),q=f.map((v,i)=>v+(g[i]-v)*r),w=smooth(t/.10)*smooth((1-t)/.16),sign=a.arm===1?1:-1,hit=u.A[a.arm],guard=u.A[1-a.arm];
   const mix=(x,y)=>x+(y-x)*w;
   hit.sh.rotation.x=mix(hit.sh.rotation.x,q[1]);hit.sh.rotation.y=mix(hit.sh.rotation.y,0);hit.sh.rotation.z=mix(hit.sh.rotation.z,-sign*.10);hit.el.rotation.x=mix(hit.el.rotation.x,q[2]);
   guard.sh.rotation.x=mix(guard.sh.rotation.x,-.85);guard.sh.rotation.y=mix(guard.sh.rotation.y,0);guard.sh.rotation.z=mix(guard.sh.rotation.z,sign*.13);guard.el.rotation.x=mix(guard.el.rotation.x,-1.4);
   u.spine.rotation.y+=sign*q[3]*w;u.hips.rotation.y+=sign*q[3]*w*.35;u.spine.rotation.x+=q[4]*w;if(u.headP)u.headP.rotation.x-=q[4]*w*.35;
   return result;
  }
  animated.visiblePunchVersion=1;
  animated.getPunchState=h=>{const s=states.get(h);return s?Object.assign({},s):null;};
  return animated;
 }
 const api={version:1,wrap};if(typeof module==='object'&&module.exports)module.exports=api;else root.VCVisiblePunch=api;
})(typeof window!=='undefined'?window:globalThis);
