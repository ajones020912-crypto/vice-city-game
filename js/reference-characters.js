// LUCIA_FACE_LEG_REVERT_V1
// LUCIA_CROPPED_TANK_V1
// LUCIA_ROUND_TAN_V1
// LUCIA_FORWARD_FIT_V1
// LUCIA_TANK_FIT_V1
/* Reference-inspired Jason and Lucia. Load after characters.js, before the game. */
(function(){
 'use strict';
 const api=window.VCCharacters;if(!api||api.referenceLeadsInstalled)return;
 const originalBuild=api.build;let printTexture=null;
 const looks={
  jasonC:{referenceLead:'jason',name:'Jason',realistic:true,skin:0xc98e68,hair:0x2d211b,hairStyle:'short',beard:false,jacket:null,top:{kind:'tee',color:0x626a68},legs:{kind:'trousers',color:0x6a593f},shoes:{kind:'boots',color:0x594735,sole:0x29231e},extras:['watch']},
  luciaC:{referenceLead:'lucia',name:'Lucia',realistic:true,female:true,luciaSummer:true,build:'slim',skin:0x9a6a48,hair:0x1c100c,hairStyle:'referencePonytail',jacket:null,top:{kind:'tank',color:0xf2f0eb},legs:{kind:'shorts',color:0x6b8fb8,highWaist:true},shoes:{color:0xf8f4ee,sole:0xe2e2e2,accent:0x9b5961},extras:['hoops','bracelets','ring','necklace']}
 };
 for(const id of Object.keys(looks))api.DESIGNS[id]=Object.assign({},api.DESIGNS[id],looks[id]);
 function add(T,parent,geometry,material,name,x=0,y=0,z=0){const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh}
 function remove(mesh){if(mesh&&mesh.parent){mesh.parent.remove(mesh);mesh.geometry.dispose()}}
 function cloth(T,color){return new T.MeshStandardMaterial({color,roughness:.92,metalness:0})}
 function tube(T,points,radius,segments=18){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),g=new T.TubeGeometry(path,segments,radius,8,false),a=g.attributes.position;for(let i=0;i<=segments;i++){const t=i/segments,c=path.getPointAt(t),scale=Math.max(.07,Math.sin(Math.PI*Math.min(.95,t*.85+.12))*(1-t*.65));for(let j=0;j<=8;j++){const k=i*9+j;a.setXYZ(k,c.x+(a.getX(k)-c.x)*scale,c.y+(a.getY(k)-c.y)*scale,c.z+(a.getZ(k)-c.z)*scale)}}g.computeVertexNormals();return g}
 function ponyCap(T){const p=[],uv=[],idx=[],rows=20,cols=48;for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const phi=j/cols*Math.PI*2,end=Math.PI*(.60-.14*Math.max(0,Math.cos(phi))+.07*Math.max(0,-Math.cos(phi))),theta=end*i/rows;p.push(Math.sin(theta)*Math.sin(phi)*.103,.196+Math.cos(theta)*.115,-.003+Math.sin(theta)*Math.cos(phi)*.120);uv.push(j/cols,i/rows)}for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;idx.push(a,b,a+1,b,b+1,a+1)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g}
 function lucia(T,h){
  const u=h.userData,m=u.m; m.skin.roughness=.72;m.hair.roughness=.68;m.lip.color.setHex(0xb45c58);m.lip.roughness=.42;m.iris.color.setHex(0x3f2a1a);m.eyeW.roughness=.32;
  for(const mesh of u.spine.children.slice())if(mesh.isMesh&&((mesh.material===m.shirt)||(mesh.geometry.type==='TorusGeometry'&&Math.abs(mesh.position.y-.195)<.002)))remove(mesh);
  const profile=[[.1406667,.22],[.145,.26],[.1534,.30],[.1576,.32],[.1618,.34],[.166,.36],[.16775,.375],[.1695,.39],[.17125,.405],[.173,.42],[.1717143,.435],[.1704286,.45],[.17,.455],[.135,.485],[.104,.495]];
  const tank=add(T,u.spine,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),28),m.shirt,'lucia-light-tank-top');tank.scale.z=.66;
  const hem=add(T,u.spine,new T.TorusGeometry(.1406667,.0035,6,28),m.trim,'lucia-tank-hem',0,.2235,0);hem.scale.y=.66;hem.rotation.x=Math.PI/2;
  for(const side of[-1,1])for(const back of[false,true]){const a=new T.Vector3(side*.095,back?.475:.465,back?-.092:.092),b=new T.Vector3(side*.105,.553,0),delta=b.clone().sub(a),strap=add(T,u.spine,new T.BoxGeometry(.035,delta.length(),.012),m.shirt,'lucia-tank-strap');strap.position.copy(a.add(b).multiplyScalar(.5));strap.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize())}
  add(T,u.headP,ponyCap(T),m.hair,'lucia-reference-hair-cap');
  add(T,u.headP,tube(T,[[0,.28,-.095],[.025,.31,-.16],[.035,.22,-.215],[.02,.07,-.23],[-.015,-.08,-.205],[.005,-.14,-.17]],.050,40),m.hair,'lucia-reference-ponytail');
  const tie=add(T,u.headP,new T.TorusGeometry(.026,.006,6,16),cloth(T,0x252320),'lucia-hair-tie',.008,.285,-.12);tie.rotation.x=.7;
  const highlight=cloth(T,0x3a2a22);for(const side of[-1,1]){add(T,u.headP,tube(T,[[side*.072,.248,.055],[side*.095,.195,.068],[side*.108,.110,.035],[side*.098,.045,.012],[side*.085,.005,.005]],.014,20),side===1?highlight:m.hair,'lucia-face-framing-hair');add(T,u.headP,tube(T,[[side*.019,.205,.102],[side*.040,.213,.103],[side*.062,.208,.094]],.0040,14),m.brow,'lucia-arched-brow')}
  for(const mesh of u.headP.children.slice())if(mesh.isMesh){if(mesh.material===m.brow&&mesh.geometry.type==='BoxGeometry')remove(mesh);else if(mesh.material===m.eyeW){mesh.scale.x*=1.08;mesh.scale.y*=1.12}else if(mesh.material===m.lip){mesh.scale.x*=1.22;mesh.scale.y*=1.18}else if(mesh.material===m.skin&&mesh.geometry.type==='LatheGeometry'){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const y=a.getY(i),x=a.getX(i);a.setX(i,x*(1+.085*Math.exp(-Math.pow((y-.145)/.04,2))-.065*Math.exp(-Math.pow((y-.075)/.025,2))))}a.needsUpdate=true;mesh.geometry.computeVertexNormals()}}
  const threads=cloth(T,0xc8c2ad);for(let k=0;k<u.Lg.length;k++){const hp=u.Lg[k].hp;for(const mesh of hp.children.slice())if(mesh.isMesh&&mesh.geometry.type==='TorusGeometry'&&Math.abs(mesh.position.y+.26)<.002)remove(mesh);const shorts=hp.children.find(o=>o.isMesh&&o.material===m.pants&&o.geometry.type==='LatheGeometry');if(shorts){shorts.name='lucia-reference-denim-shorts-'+k;const a=shorts.geometry.attributes.position;for(let i=0;i<a.count;i++)if(Math.abs(a.getY(i)+.26)<.001){const angle=Math.atan2(a.getZ(i),a.getX(i));a.setY(i,-.26+.003*Math.sin(angle*9)+.002*Math.sin(angle*17))}a.needsUpdate=true;shorts.geometry.computeVertexNormals()}for(let j=0;j<9;j++){const phi=j/9*Math.PI*2,len=.007+(j%3)*.003;add(T,hp,new T.CylinderGeometry(.0008,.0005,len,4),threads,'lucia-denim-fray',Math.sin(phi)*.095,-.26-len*.45,Math.cos(phi)*.095)}}
  const waist=add(T,u.hips,new T.LatheGeometry([[.142,.07],[.138,.105],[.134,.13]].map(p=>new T.Vector2(...p)),24),m.pants,'lucia-denim-waist');waist.scale.z=.70;shapeLucia(T,h);fitLuciaShortsLegs(T,h);denimLuciaShorts(T,h);joinLuciaShoulders(T,h);refineLuciaV3(T,h);installLuciaDenimV3(T,h);fitLuciaReferenceBodyClothes(T,h);finishLuciaV4(T,h);makeLuciaCurlyPonytail(T,h);fitLuciaFrontHair(T,h);addLuciaBackCurls(T,h);polishLuciaV5(T,h);enlargeLuciaEyes(T,h);smoothLuciaHipTransition(T,h);finishLuciaReferenceOutfit(T,h);
 }


 function fitLuciaShortsLegs(T,h){
  const u=h.userData;
  for(const leg of u.Lg){
   const hp=leg.hp,kn=leg.kn;
   const shorts=hp.children.find(o=>o.isMesh&&o.name.indexOf('lucia-reference-denim-shorts-')===0);
   if(!shorts)throw new Error('Expected Lucia jean shorts');
   shorts.updateMatrix();
   const box=new T.Box3().setFromBufferAttribute(shorts.geometry.attributes.position).applyMatrix4(shorts.matrix);
   const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   const hip=add(T,hp,new T.SphereGeometry(1,24,16),u.m.skin,'lucia-skin-hip-bridge',center.x,.015,center.z);
   hip.scale.set(size.x*.52,.135,size.z*.50);
   const g=shorts.geometry,a=g.attributes.position;
   for(let i=0;i<a.count;i++){
    const y=a.getY(i),t=Math.max(0,Math.min(1,(y+.16)/.16));
    a.setY(i,y+.035*t*t*(3-2*t));
   }
   a.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();
   const shin=leg.shin;shin.updateMatrix();
   const sb=new T.Box3().setFromBufferAttribute(shin.geometry.attributes.position).applyMatrix4(shin.matrix);
   const ss=sb.getSize(new T.Vector3()),sc=sb.getCenter(new T.Vector3());
   const knee=add(T,kn,new T.SphereGeometry(1,24,16),u.m.skin,'lucia-skin-knee-bridge',sc.x,0,sc.z);
   knee.scale.set(Math.max(.065,ss.x*.51),.075,Math.max(.060,ss.z*.51));
  }
  u.luciaShortsThighFit=true;
 }

 function denimLuciaShorts(T,h){
  const u=h.userData,m=u.m;
  if(!denimLuciaShorts.map){
   const n=128,data=new Uint8Array(n*n*4);
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const twill=((x+y)%8)<3?15:-9;
    const thread=(x%2===0?5:-5)+(y%4===0?5:0);
    const grain=((x*73+y*151+x*y*3)%17)-8;
    const c=Math.max(0,Math.min(255,221+twill+thread+grain)),i=(y*n+x)*4;
    data[i]=c;data[i+1]=c;data[i+2]=Math.min(255,c+3);data[i+3]=255;
   }
   const map=new T.DataTexture(data,n,n,T.RGBAFormat);
   map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(4,3);
   map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;
   map.generateMipmaps=true;map.encoding=T.sRGBEncoding;map.needsUpdate=true;
   denimLuciaShorts.map=map;
  }
  m.pants.map=denimLuciaShorts.map;
  m.pants.bumpMap=denimLuciaShorts.map;m.pants.bumpScale=.0008;
  m.pants.roughness=.96;m.pants.metalness=0;m.pants.needsUpdate=true;
  for(const leg of u.Lg){
   const body=leg.hp.children.find(o=>o.name==='lucia-skin-hip-bridge');
   if(!body)throw new Error('Expected fitted hip body bridge');
   const shell=new T.Mesh(body.geometry.clone(),m.pants);
   shell.name='lucia-denim-seat-cover';
   shell.position.copy(body.position);shell.quaternion.copy(body.quaternion);
   shell.scale.copy(body.scale).multiplyScalar(1.045);shell.castShadow=true;
   leg.hp.add(shell);
  }
  smoothLuciaDenim(T,h);
  u.luciaDenimSeat=true;
 }

 function smoothLuciaDenim(T,h){
  const u=h.userData;
  u.m.pants.flatShading=false;u.m.pants.bumpScale=.0003;u.m.pants.needsUpdate=true;
  for(const joint of [u.hips,...u.Lg.map(l=>l.hp)])for(const mesh of joint.children){
   if(!mesh.isMesh||mesh.material!==u.m.pants)continue;
   const g=mesh.geometry,p=g.attributes.position;if(!p)continue;
   g.computeVertexNormals();
   const n=g.attributes.normal,groups=new Map();
   for(let i=0;i<p.count;i++){
    const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(',');
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);
   }
   const original=Float32Array.from(n.array);
   for(const indices of groups.values()){
    if(indices.length<2)continue;
    for(const i of indices){
     const base=new T.Vector3(original[i*3],original[i*3+1],original[i*3+2]),sum=new T.Vector3();
     for(const j of indices){const v=new T.Vector3(original[j*3],original[j*3+1],original[j*3+2]);if(base.dot(v)>.6)sum.add(v);}
     if(sum.lengthSq()>1e-12){sum.normalize();n.setXYZ(i,sum.x,sum.y,sum.z);}
    }
   }
   n.needsUpdate=true;
  }
  u.luciaDenimSmoothed=true;
 }

 function joinLuciaShoulders(T,h){
  const u=h.userData,shoulder=Math.max(...u.A.map(a=>Math.abs(a.sh.position.x)));
  for(const mesh of u.spine.children.slice())if(mesh.name==='lucia-tank-strap')remove(mesh);
  const control=[[.165,.102,.455],[shoulder*.87,.105,.485],[shoulder+.018,.092,.512],[shoulder*.72,.075,.54],[.074,.060,.57],[.052,.051,.60],[.052,.051,u.headP.position.y+.065]],rings=[];
  for(let i=0;i<control.length-1;i++)for(let j=0;j<6;j++){const t=j/6,k=t*t*(3-2*t),a=control[i],b=control[i+1];rings.push([a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*t]);}
  rings.push(control[control.length-1]);
  const positions=[],uv=[],idx=[],cols=48;
  for(let i=0;i<rings.length;i++)for(let j=0;j<cols;j++){const a=j/cols*Math.PI*2,r=rings[i];positions.push(Math.sin(a)*r[0],r[2],Math.cos(a)*r[1]);uv.push(j/cols,i/(rings.length-1));}
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<cols;j++){const a=i*cols+j,b=i*cols+(j+1)%cols,c=a+cols,d=b+cols;idx.push(a,c,b,b,c,d);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();
  add(T,u.spine,geo,u.m.skin,'lucia-continuous-shoulders-neck');
  const fabric=u.m.shirt.clone();fabric.side=T.DoubleSide;fabric.flatShading=false;fabric.polygonOffset=true;fabric.polygonOffsetFactor=-1;fabric.polygonOffsetUnits=-1;
  function section(x){
   const front=[];
   for(let i=0;i<rings.length;i++){const r=rings[i];if(r[0]>=Math.abs(x)){front.push(new T.Vector3(x,r[2],r[1]*Math.sqrt(Math.max(0,1-x*x/(r[0]*r[0])))));}
    else if(front.length){const a=rings[i-1],t=(Math.abs(x)-a[0])/(r[0]-a[0]);front.push(new T.Vector3(x,a[2]+(r[2]-a[2])*t,0));break;}}
   if(front.length<3)throw new Error('Shoulder strap surface section is too short');
   const back=front.slice(0,-1).reverse().map(v=>new T.Vector3(v.x,v.y,-v.z));
   return new T.CatmullRomCurve3(front.concat(back),false,'centripetal');
  }
  const center=Math.min(.135,Math.max(.105,shoulder*.53)),segments=64;
  for(const side of [-1,1]){
   const left=section(side*center-.0175),right=section(side*center+.0175),p=[],tex=[],tri=[];
   for(let i=0;i<=segments;i++)for(const [j,curve] of [[0,left],[1,right]]){const t=i/segments,v=curve.getPoint(t),tangent=curve.getTangent(t),normal=new T.Vector3(0,-tangent.z,tangent.y).normalize();v.addScaledVector(normal,.004);p.push(v.x,v.y,v.z);tex.push(j,t);}
   for(let i=0;i<segments;i++){const a=i*2;tri.push(a,a+2,a+1,a+1,a+2,a+3);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(tex,2));g.setIndex(tri);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
   add(T,u.spine,g,fabric,'lucia-continuous-shoulder-strap-'+side);
  }
  u.luciaContinuousShoulders=true;
 }

 function refineLuciaV3(T,h){
  const u=h.userData,m=u.m;m.hair.flatShading=false;m.hair.roughness=.65;m.brow.color.setHex(0x2b1c17);m.lip.color.setHex(0x8b4e42);
  if(!refineLuciaV3.bump){const n=128,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=Math.round(128+30*Math.sin(x*.69+.35*Math.sin(y*.08))+8*Math.sin(x*1.71+y*.05)),i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}const t=new T.DataTexture(data,n,n,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=t.minFilter=T.LinearFilter;t.needsUpdate=true;refineLuciaV3.bump=t;}
  m.hair.bumpMap=refineLuciaV3.bump;m.hair.bumpScale=.00045;m.hair.needsUpdate=true;
  for(const mesh of u.headP.children){if(!mesh.isMesh)continue;if(mesh.name==='lucia-face-framing-hair'){mesh.scale.x*=.8;mesh.scale.z*=.8;mesh.material.roughness=.65;}if(mesh.material===m.eyeW||mesh.material===m.iris){mesh.scale.y*=.95;}if(mesh.material===m.skin&&mesh.geometry.type==='SphereGeometry'&&Math.abs(mesh.position.x)<.005&&mesh.position.z>.1&&mesh.position.y>.12&&mesh.position.y<.19){mesh.scale.x*=.94;}}
 }

 function installLuciaDenimV3(T,h){
  const u=h.userData,d={"p":[[-0.1458175629377365,-0.30000001192092896,-0.09116031974554062],[-0.11789228022098541,-0.33736106753349304,-0.0949484333395958],[-0.16810952126979828,-0.30000001192092896,-0.07443208992481232],[-0.18521474301815033,-0.30000001192092896,-0.0526314340531826],[-0.19596752524375916,-0.30000001192092896,-0.02724403329193592],[-0.17860287427902222,-0.33799999952316284,-0.04913348704576492],[-0.18846160173416138,-0.34018948674201965,-0.025405989959836006],[-0.14199186861515045,-0.3382679522037506,-0.08509048074483871],[-0.1624680757522583,-0.34353554248809814,-0.06929633766412735],[-0.182958722114563,-0.14249999821186066,-0.08984953910112381],[-0.18349117040634155,-0.11259432137012482,-0.09057092666625977],[-0.18302009999752045,-0.11298850178718567,-0.09100595861673355],[-0.17595459520816803,-0.1163373664021492,-0.09753692895174026],[-0.16833770275115967,-0.11754165589809418,-0.1042243242263794],[-0.17268909513950348,-0.1181291863322258,-0.10033199936151505],[-0.17464931309223175,-0.11298850178718567,-0.1023748442530632],[-0.1772087812423706,-0.11564917862415314,-0.09646342694759369],[-0.14181450009346008,-0.11298850178718567,-0.1254570633172989],[-0.12529319524765015,-0.14249999821186066,-0.1334817111492157],[-0.15631751716136932,-0.14249999821186066,-0.11347723007202148],[-0.1566516011953354,-0.11596376448869705,-0.1146775409579277],[-0.1472167819738388,-0.11522838473320007,-0.12177418917417526],[-0.14957281947135925,-0.11621168255805969,-0.12016412615776062],[-0.149542897939682,-0.11619283258914948,-0.12018841505050659],[-0.15044188499450684,-0.11298850178718567,-0.12173284590244293],[-0.20340122282505035,-0.14249999821186066,-0.06274567544460297],[-0.19351063668727875,-0.11190817505121231,-0.07731927186250687],[-0.2162519246339798,-0.14249999821186066,-0.03234177455306053],[-0.09200000017881393,-0.3449999988079071,-0.09792929142713547],[-0.06610772013664246,-0.33736106753349304,-0.0949484333395958],[-0.04200812801718712,-0.3382679522037506,-0.08509048074483871],[-0.021531924605369568,-0.34353554248809814,-0.06929633766412735],[-0.01589047908782959,-0.30000001192092896,-0.07443208992481232],[-0.005397126078605652,-0.33799999952316284,-0.04913348704576492],[-0.09200000017881393,-0.14249999821186066,-0.1450967937707901],[-0.058706797659397125,-0.14249999821186066,-0.14096203446388245],[-0.027682475745677948,-0.14249999821186066,-0.12317972630262375],[-0.0010412780102342367,-0.14249999821186066,-0.09920763224363327],[-0.1996351182460785,-0.30000001192092896,-1.9336475092782544e-17],[-0.19187617301940918,-0.3400000035762787,-1.8033601107923747e-17],[-0.19596752524375916,-0.30000001192092896,0.02724403329193592],[-0.188484326004982,-0.3398105502128601,0.02541072480380535],[-0.1783878356218338,-0.34200000762939453,0.04903692007064819],[-0.18521474301815033,-0.30000001192092896,0.0526314340531826],[-0.16810952126979828,-0.30000001192092896,0.07443208992481232],[-0.16277843713760376,-0.33646446466445923,0.06953772902488708],[-0.14188434183597565,-0.34173205494880676,0.08494562655687332],[-0.1458175629377365,-0.30000001192092896,0.09116031974554062],[-0.11780748516321182,-0.3426389694213867,0.09470228850841522],[-0.119858019053936,-0.30000001192092896,0.10167612135410309],[-0.2206350415945053,-0.14249999821186066,-2.2931597249562565e-17],[-0.2162519246339798,-0.14249999821186066,0.03217998892068863],[-0.20340122282505035,-0.14249999821186066,0.0621669664978981],[-0.182958722114563,-0.14249999821186066,0.08791737258434296],[-0.15631751716136932,-0.14249999821186066,0.10767634958028793],[-0.12529319524765015,-0.14249999821186066,0.12009736150503159],[-0.005612164735794067,-0.34200000762939453,0.04903692007064819],[-0.09200000017881393,-0.33500000834465027,0.09841202944517136],[-0.09200000017881393,-0.30000001192092896,0.1052628681063652],[-0.06619251519441605,-0.3426389694213867,0.09470228850841522],[-0.06414198130369186,-0.30000001192092896,0.10167612135410309],[-0.042115651071071625,-0.34173205494880676,0.08494562655687332],[-0.038182441145181656,-0.30000001192092896,0.09116031974554062],[-0.02122156322002411,-0.33646446466445923,0.06953772902488708],[-0.01589047908782959,-0.30000001192092896,0.07443208992481232],[-0.09200000017881393,-0.14249999821186066,0.1243339329957962],[-0.058706797659397125,-0.14249999821186066,0.12009736150503159],[-0.0010412780102342367,-0.14249999821186066,0.08791737258434296],[-0.027682475745677948,-0.14249999821186066,0.10767634958028793],[-0.1797400414943695,-0.08946432918310165,-0.10768016427755356],[-0.1814589649438858,-0.06499999761581421,-0.10947154462337494],[-0.1797400414943695,-0.04053567349910736,-0.10768016427755356],[-0.1843353509902954,-