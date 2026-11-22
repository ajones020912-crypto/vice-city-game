function makeCarVisual(tk,color){
 if(tk==='rareCoupe')tk='sports'; // the old low-poly supercar is replaced by the new supercar body
 if(CAR_TYPES[tk].aircraft)return makeAircraftVisual(tk,color);
 if(CAR_TYPES[tk].boat)return makeBoatVisual(tk,color);
 const t=CAR_TYPES[tk],gs=carGeos(tk),g=new T.Group(),ch=new T.Group();g.add(ch);
 const pm=paintMat(color);
 const sg=tk==='sports'&&window.VCSupercar?window.VCSupercar.geos(T,t):null; // faceted supercar body (supercar.js)
 const body=new T.Mesh(sg?sg.body:gs.body,pm),gh=new T.Mesh(sg?sg.gh:gs.gh,glassMat),trim=new T.Mesh(sg?sg.trim:gs.trim,trimMat),head=new T.Mesh(sg?sg.head:gs.head,headMat),tail=new T.Mesh(sg?sg.tail:gs.tail,tailOff),beam=new T.Group();
 for(const m of[body,gh,trim])m.castShadow=true;body.receiveShadow=true;ch.add(body,gh,trim,head,tail);
 for(const side of[-1,1]){const cone=new T.Mesh(gs.beam,beamMat);cone.position.x=side*.72;beam.add(cone)}beam.visible=false;beam.position.y=.7;g.add(beam);
 const rev=[];if(!t.aircraft&&!t.boat)for(const side of[-1,1]){const r=new T.Mesh(revGeo,revOff);if(sg)r.position.set(side*.32,.58,-t.L/2-.02);else r.position.set(side*(t.W/2-.72),.78,-t.L/2-.065);ch.add(r);rev.push(r)}
 let bar=null;
 if(tk==='police'){const bg=new T.BoxGeometry(1.2,.14,.3),mr=new T.MeshBasicMaterial({color:0xff1010,toneMapped:false}),mb=new T.MeshBasicMaterial({color:0x1030ff,toneMapped:false});
  const a=new T.Mesh(bg,mr),b=new T.Mesh(bg,mb);a.scale.x=b.scale.x=.5;a.position.set(.32,t.gh[2][1]+.1,t.gh[2][0]-.4);b.position.set(-.32,t.gh[2][1]+.1,t.gh[2][0]-.4);ch.add(a,b);bar=[a,b];
  const sb=new T.BoxGeometry(t.W+.02,.6,t.L*.5);const stripe=new T.Mesh(sb,new T.MeshStandardMaterial({color:0x10151c,roughness:.45,metalness:.2}));stripe.position.set(0,.62,-.1);stripe.scale.set(.985,1,1);ch.add(stripe);
  const d1=new T.Mesh(new T.BoxGeometry(t.W-.1,.22,t.L*.28),new T.MeshStandardMaterial({color:0x10151c,roughness:.45,metalness:.2}));d1.position.set(0,1.0,-.2);ch.add(d1)}
 if(tk==='taxi'){const s=new T.Mesh(new T.BoxGeometry(.7,.22,.3),new T.MeshStandardMaterial({color:0xfff2a0,emissive:0xffe066,emissiveIntensity:.95,roughness:.4}));s.position.set(0,t.gh[2][1]+.12,t.gh[2][0]-.4);ch.add(s)}
 const wheels=[],gm=tk==='rareCoupe'?lowPolyWheelGeo(t.wr):wheelGeo(t.wr);
 for(const sz of[1,-1])for(const sx of[1,-1]){const piv=new T.Group();piv.position.set(sx*(t.W/2-.2),t.wr,sz*t.wb/2);const w=new T.Mesh(gm,wheelMat);w.castShadow=true;if(sx<0)w.rotation.y=Math.PI;piv.add(w);ch.add(piv);wheels.push({piv,w,front:sz>0})}
 if(tk==='rareCoupe'){
  const mat=(hex,rough=.55,metal=.08)=>new T.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal,flatShading:true});
  const dark=mat(0x090d17,.42,.12),glassDark=mat(0x10182a,.24,.28),accent=mat(0x292638,.48,.18),lamp=mat(0xf4f7ff,.22,.12);
  const add=(geo,m,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;ch.add(o);return o};
  const panel=(pts,depth,m,x=0,y=0,z=0)=>add(extrudeLowPolyProfile(pts,depth),m,x,y,z);
  // Deep front intake, lower splitter and angular corner intakes.
  add(new T.BoxGeometry(1.18,.28,.055),dark,0,.43,t.L/2+.055);
  add(new T.BoxGeometry(1.68,.075,.28),accent,0,.285,t.L/2+.09);
  for(const side of[-1,1]){
   const intake=add(new T.BoxGeometry(.34,.25,.06),dark,side*.72,.48,t.L/2+.045);intake.rotation.z=side*.12;
   // Thin, sharp LED headlight strips on the front corners.
   const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(.48,.055);sh.lineTo(.34,.13);sh.lineTo(.04,.105);sh.closePath();
   const hg=new T.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:false,curveSegments:1});
   hg.rotateY(0);
   add(hg,lamp,side*.46,.68,t.L/2+.075).rotation.y=side*.08;
   // Recessed side air intake behind the door.
   const vent=add(new T.BoxGeometry(.045,.34,.66),dark,side*(t.W/2+.006),.53,-.34);vent.rotation.y=side*.16;
   const ventLip=add(new T.BoxGeometry(.055,.055,.72),accent,side*(t.W/2+.012),.34,-.34);ventLip.rotation.y=side*.16;
   // Angular side skirt and wheel-arch shoulder accents.
   add(new T.BoxGeometry(.075,.12,1.55),accent,side*(t.W/2+.015),.27,-.02);
   const shoulder=add(new T.BoxGeometry(.07,.14,.78),pm,side*(t.W/2-.015),.72,t.wb/2);shoulder.rotation.y=side*.04;
  }
  // Low rear diffuser and a subtle raised rear deck lip.
  add(new T.BoxGeometry(1.25,.13,.18),dark,0,.34,-t.L/2-.035);
  add(new T.BoxGeometry(1.42,.07,.18),accent,0,.66,-t.L/2+.18);
  // Narrow red rear light bar.
  add(new T.BoxGeometry(1.35,.075,.035),mat(0xff263f,.25),0,.78,-t.L/2-.055);
  // Faceted hood creases emphasize the long, low nose.
  for(const side of[-1,1]){
   const crease=add(new T.BoxGeometry(.035,.025,1.18),accent,side*.48,.79,.72);crease.rotation.x=-.035;
  }
 }
 return{g,ch,body,tail,head,beam,bar,wheels,pm,rev}}