function animHuman(h,dt,s){
 const u=h.userData,{hips,spine,A,Lg}=u;
 if(!(s.punch>0))u._luciaPunchActive=false;
 const spd=Math.max(0,s.speed||0);
 const moveW=clamp(spd/1.15,0,1);
 const runW=clamp((spd-4.25)/3.1,0,1);
 const walkW=moveW*(1-runW);
 // A steady two-beat walk that smoothly speeds into a quicker running stride.
 const cadence=(2.05+walkW*.35+runW*1.05)*moveW;
 u.ph=(u.ph||0)+dt*(cadence*2.35);
 u.phArm=(u.phArm||0)+(u.ph-(u.phArm||0))*Math.min(1,dt*18);
 const ph=u.ph;
 const s1=Math.sin(ph), c1=Math.cos(ph);
 const sArm=Math.sin(u.phArm);

 if(s.dead){
  u.dead=Math.min(1,(u.dead||0)+dt*3.2);const d=u.dead;
  h.rotation.x=-d*Math.PI/2*.97;h.position.y=(s.baseY||0)+d*.16;
  A[0].sh.rotation.set(-.5*d,0,.9*d);A[1].sh.rotation.set(-.3*d,0,-.9*d);
  Lg[0].hp.rotation.x=-.3*d;Lg[1].hp.rotation.x=.2*d;
  Lg[0].kn.rotation.x=.2*d;Lg[1].kn.rotation.x=.15*d;
  return;
 }
 u.dead=0;h.rotation.x=0;

 const hipAmp=(.34+.28*runW)*moveW;
 const legL=s1*hipAmp;
 const legR=-s1*hipAmp;
 // Bend each knee as that foot swings forward, rather than keeping both legs stiff.
 const kneeAmp=(.48+.42*runW)*moveW;
 const kneeL=Math.max(0,c1)*kneeAmp;
 const kneeR=Math.max(0,-c1)*kneeAmp;
 const plantL=Math.max(0,-c1)*moveW*.025;
 const plantR=Math.max(0,c1)*moveW*.025;

 const lerpA=(key,target,rate)=>{
  const k='_a_'+key;const prev=u[k];const t=prev==null?target:prev+(target-prev)*Math.min(1,dt*rate);
  u[k]=t;return t;
 };
 const lh=lerpA('lh',legL,18), rh=lerpA('rh',legR,18);
 const lk=lerpA('lk',kneeL+plantL*2,16), rk=lerpA('rk',kneeR+plantR*2,16);
 Lg[0].hp.rotation.x=lh;Lg[1].hp.rotation.x=rh;
 Lg[0].kn.rotation.x=lk;Lg[1].kn.rotation.x=rk;
 Lg[0].hp.rotation.y=Lg[1].hp.rotation.y=Lg[0].hp.rotation.z=Lg[1].hp.rotation.z=0;

 const idleBreath=Math.sin(ph*.85)*.006*(1-moveW);
 // Subtle vertical bounce gives the feet a readable lift without pulling them from the hips.
 const gaitBounce=Math.abs(Math.sin(ph*2))*(.012+.014*runW)*moveW;
 const hipY=.93+idleBreath+gaitBounce;
 hips.position.y=lerpA('hy',hipY,24);
 hips.rotation.set(0,0,0);

 const lean=.02+runW*.16+moveW*.03;
 spine.rotation.x=lerpA('sx',lean+Math.sin(ph*.9)*.01*(1-moveW*.5),12);
 spine.rotation.z=lerpA('sz',s1*.03*moveW,12);
 spine.rotation.y=lerpA('sy',-s1*.07*moveW,10);
 spine.position.y=.08;

 if(u.headP){
  u.headP.rotation.x=lerpA('hx',Math.sin(ph*.85+.6)*.02*(1-moveW*.7),10);
  u.headP.rotation.z=lerpA('hzhd',-c1*.02*moveW,10);
 }

 const armAmp=(.48+.62*runW)*moveW;
 const aL=-sArm*armAmp;
 const aR=sArm*armAmp;
 const idleSway=Math.sin(ph*.8)*.035*(1-moveW);
 const shx0=lerpA('ax0',aL+idleSway,18);
 const shx1=lerpA('ax1',aR-idleSway,18);
 const elbowL=-(.08+.18*moveW+.30*runW+Math.max(0,sArm)*.10);
 const elbowR=-(.08+.18*moveW+.30*runW+Math.max(0,-sArm)*.10);
 A[0].sh.rotation.set(shx0,0,.035+.025*moveW);
 A[1].sh.rotation.set(shx1,0,-.035-.025*moveW);
 A[0].el.rotation.x=lerpA('el0',elbowL,16);
 A[1].el.rotation.x=lerpA('el1',elbowR,16);

 for(const k in u.guns)u.guns[k].visible=k===s.weapon;

 if(s.aim&&s.weapon){
  const long=s.weapon!=='pistol';
  A[1].sh.rotation.set(-1.5,0,-.04);A[1].el.rotation.x=-.08;
  A[0].sh.rotation.set(-1.25-(long?.1:0),0,long?.35:.5);A[0].el.rotation.x=-.4;
  spine.rotation.x=.04;
 }else if(s.punch>0){
  if(u.referenceLead==='luciaC'||u.referenceLead==='jasonC'){applyLeadLeanPunch(u,s.punch);}else{
  const p=Math.sin(Math.min(s.punch,1)*Math.PI);
  A[1].sh.rotation.set(-1.45*p,0,-.1);A[1].el.rotation.x=-.2-.1*p;
  A[0].sh.rotation.x=.4*p;spine.rotation.y=-.5*p;
  }
 }
}