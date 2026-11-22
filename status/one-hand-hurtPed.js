function hurtPed(p,d,sx,sz,src,byP){if(p.dead)return;p.hp-=d;
 if(byP){if(p.cop)addCrime(src==='gun'||src==='punch'?3:2);else if(p.gang)alertGang(p);else addCrime(p.hp<=0?1.6:.8)}
 if(p.hp<=0){p.die(sx,sz,src);if(byP){pl.stats.kills++;if(p.cop)killCop();else if(p.gang)onGangKill(p);else addCrime(1.4)}}
 else if(src==='car'){p.state='down';p.t=1.5+Math.random()*2;let dx=p.x-sx,dz=p.z-sz;const l=Math.hypot(dx,dz)||1;p.vx=dx/l*4;p.vz=dz/l*4;p.fx=sx;p.fz=sz}
 else if(!p.cop){p.flee(sx,sz,10)}
 if(src==='gun'||src==='punch')for(const o of peds)if(o.active&&!o.dead&&o!==p&&!o.cop&&(o.x-p.x)**2+(o.z-p.z)**2<400)o.flee(p.x,p.z,9)}