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
  luciaC:{referenceLead:'lucia',name:'Lucia',realistic:true,female:true,luciaSummer:true,build:'slim',skin:0x9c623d,hair:0x35251f,hairStyle:'referencePonytail',jacket:null,top:{kind:'tank',color:0x303338},legs:{kind:'shorts',color:0x7497b3,highWaist:true},shoes:{color:0xf6f6f6,sole:0xe2e2e2,accent:0x303338},extras:['hoops','bracelets','ring','necklace']}
 };
 for(const id of Object.keys(looks))api.DESIGNS[id]=Object.assign({},api.DESIGNS[id],looks[id]);
 function add(T,parent,geometry,material,name,x=0,y=0,z=0){const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh}
 function remove(mesh){if(mesh&&mesh.parent){mesh.parent.remove(mesh);mesh.geometry.dispose()}}
 function cloth(T,color){return new T.MeshStandardMaterial({color,roughness:.92,metalness:0})}
 function tube(T,points,radius,segments=18){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),g=new T.TubeGeometry(path,segments,radius,8,false),a=g.attributes.position;for(let i=0;i<=segments;i++){const t=i/segments,c=path.getPointAt(t),scale=Math.max(.07,Math.sin(Math.PI*Math.min(.95,t*.85+.12))*(1-t*.65));for(let j=0;j<=8;j++){const k=i*9+j;a.setXYZ(k,c.x+(a.getX(k)-c.x)*scale,c.y+(a.getY(k)-c.y)*scale,c.z+(a.getZ(k)-c.z)*scale)}}g.computeVertexNormals();return g}
 function ponyCap(T){const p=[],uv=[],idx=[],rows=12,cols=28;for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const phi=j/cols*Math.PI*2,end=Math.PI*(.60-.14*Math.max(0,Math.cos(phi))+.07*Math.max(0,-Math.cos(phi))),theta=end*i/rows;p.push(Math.sin(theta)*Math.sin(phi)*.103,.196+Math.cos(theta)*.115,-.003+Math.sin(theta)*Math.cos(phi)*.120);uv.push(j/cols,i/rows)}for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;idx.push(a,b,a+1,b,b+1,a+1)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g}
 function lucia(T,h){
  const u=h.userData,m=u.m; m.skin.roughness=.74;m.hair.roughness=.82;m.lip.color.setHex(0x9a5e55);m.lip.roughness=.65;m.iris.color.setHex(0x543c26);
  for(const mesh of u.spine.children.slice())if(mesh.isMesh&&((mesh.material===m.shirt)||(mesh.geometry.type==='TorusGeometry'&&Math.abs(mesh.position.y-.195)<.002)))remove(mesh);
  const profile=[[.1406667,.22],[.145,.26],[.1534,.30],[.1576,.32],[.1618,.34],[.166,.36],[.16775,.375],[.1695,.39],[.17125,.405],[.173,.42],[.1717143,.435],[.1704286,.45],[.17,.455],[.135,.485],[.104,.495]];
  const tank=add(T,u.spine,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),28),m.shirt,'lucia-dark-tank-top');tank.scale.z=.66;
  const hem=add(T,u.spine,new T.TorusGeometry(.1406667,.0035,6,28),m.trim,'lucia-tank-hem',0,.2235,0);hem.scale.y=.66;hem.rotation.x=Math.PI/2;
  for(const side of[-1,1])for(const back of[false,true]){const a=new T.Vector3(side*.095,back?.475:.465,back?-.092:.092),b=new T.Vector3(side*.105,.553,0),delta=b.clone().sub(a),strap=add(T,u.spine,new T.BoxGeometry(.035,delta.length(),.012),m.shirt,'lucia-tank-strap');strap.position.copy(a.add(b).multiplyScalar(.5));strap.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize())}
  add(T,u.headP,ponyCap(T),m.hair,'lucia-reference-hair-cap');
  add(T,u.headP,tube(T,[[0,.28,-.095],[.025,.31,-.16],[.035,.22,-.215],[.02,.07,-.23],[-.015,-.08,-.205],[.005,-.14,-.17]],.052,28),m.hair,'lucia-reference-ponytail');
  const tie=add(T,u.headP,new T.TorusGeometry(.026,.006,6,16),cloth(T,0x252320),'lucia-hair-tie',.008,.285,-.12);tie.rotation.x=.7;
  const highlight=cloth(T,0x49342a);for(const side of[-1,1]){add(T,u.headP,tube(T,[[side*.078,.245,.048],[side*.098,.19,.06],[side*.104,.075,.02],[side*.091,.025,.01]],.012,16),side===1?highlight:m.hair,'lucia-face-framing-hair');add(T,u.headP,tube(T,[[side*.019,.203,.100],[side*.037,.210,.101],[side*.058,.206,.092]],.0037,14),m.brow,'lucia-arched-brow')}
  for(const mesh of u.headP.children.slice())if(mesh.isMesh){if(mesh.material===m.brow&&mesh.geometry.type==='BoxGeometry')remove(mesh);else if(mesh.material===m.eyeW){mesh.scale.x*=.98;mesh.scale.y*=.82}else if(mesh.material===m.lip){mesh.scale.x*=1.12;mesh.scale.y*=1.14}else if(mesh.material===m.skin&&mesh.geometry.type==='LatheGeometry'){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const y=a.getY(i),x=a.getX(i);a.setX(i,x*(1+.060*Math.exp(-Math.pow((y-.145)/.04,2))-.045*Math.exp(-Math.pow((y-.075)/.025,2))))}a.needsUpdate=true;mesh.geometry.computeVertexNormals()}}
  const threads=cloth(T,0xc8c2ad);for(let k=0;k<u.Lg.length;k++){const hp=u.Lg[k].hp;for(const mesh of hp.children.slice())if(mesh.isMesh&&mesh.geometry.type==='TorusGeometry'&&Math.abs(mesh.position.y+.26)<.002)remove(mesh);const shorts=hp.children.find(o=>o.isMesh&&o.material===m.pants&&o.geometry.type==='LatheGeometry');if(shorts){shorts.name='lucia-reference-denim-shorts-'+k;const a=shorts.geometry.attributes.position;for(let i=0;i<a.count;i++)if(Math.abs(a.getY(i)+.26)<.001){const angle=Math.atan2(a.getZ(i),a.getX(i));a.setY(i,-.26+.003*Math.sin(angle*9)+.002*Math.sin(angle*17))}a.needsUpdate=true;shorts.geometry.computeVertexNormals()}for(let j=0;j<9;j++){const phi=j/9*Math.PI*2,len=.007+(j%3)*.003;add(T,hp,new T.CylinderGeometry(.0008,.0005,len,4),threads,'lucia-denim-fray',Math.sin(phi)*.095,-.26-len*.45,Math.cos(phi)*.095)}}
  const waist=add(T,u.hips,new T.LatheGeometry([[.142,.07],[.138,.105],[.134,.13]].map(p=>new T.Vector2(...p)),24),m.pants,'lucia-denim-waist');waist.scale.z=.70;shapeLucia(T,h);fitLuciaShortsLegs(T,h);denimLuciaShorts(T,h);joinLuciaShoulders(T,h);
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
   hip.scale.set(size.x*.46,.12,size.z*.44);
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
 function roundLuciaGeometry(T,mesh,old,region,u){
  const p=old.parameters;
  if(region!=='spine'||(mesh.material!==u.m.skin&&mesh.material!==u.m.shirt)||!p||!p.points||p.points.length<2)return old.clone();
  const points=[];for(let i=0;i<p.points.length-1;i++){const a=p.points[i],b=p.points[i+1],n=Math.max(1,Math.ceil(Math.abs(b.y-a.y)/.0125));for(let j=0;j<n;j++){const t=j/n;points.push(new T.Vector2(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))}}const last=p.points[p.points.length-1];points.push(new T.Vector2(last.x,last.y));
  return new T.LatheGeometry(points,Math.max(40,p.segments||0),p.phiStart||0,p.phiLength===undefined?Math.PI*2:p.phiLength);
 }
 function smoothLuciaSeam(T,g){const p=g.parameters;if(!p||!p.points||Math.abs(p.phiLength-Math.PI*2)>.00001)return;const normals=g.attributes.normal,rows=p.points.length,offset=p.segments*rows,v=new T.Vector3();for(let i=0;i<rows;i++){v.set(normals.getX(i)+normals.getX(offset+i),normals.getY(i)+normals.getY(offset+i),normals.getZ(i)+normals.getZ(offset+i)).normalize();normals.setXYZ(i,v.x,v.y,v.z);normals.setXYZ(offset+i,v.x,v.y,v.z)}normals.needsUpdate=true}
 function shapeLucia(T,h){
  const u=h.userData;
  function fit(mesh,region){if(!mesh.isMesh||!mesh.geometry||!mesh.geometry.attributes.position)return;mesh.updateMatrix();const to=mesh.matrix.clone(),from=to.clone().invert(),old=mesh.geometry,g=roundLuciaGeometry(T,mesh,old,region,u),a=g.attributes.position,v=new T.Vector3();
   for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(to);const y=v.y;let xScale=1,zScale=1,frontOffset=0;
    if(region==='spine'&&y<.5){const waist=Math.exp(-Math.pow((y-.10)/.09,2)),chest=Math.exp(-Math.pow((y-.375)/.080,2))*Math.min(1,Math.max(0,(.5-y)/.05));xScale=1-.07*waist+.17*chest;zScale=1-.045*waist+(v.z>0?.10:.04)*chest;if(v.z>0){const arc=Math.pow(Math.min(1,v.z/.10),2),lobes=Math.min(1,(Math.exp(-Math.pow((v.x-.070)/.075,2))+Math.exp(-Math.pow((v.x+.070)/.075,2)))/1.04);frontOffset=(mesh.material===u.m.shirt?.064:.060)*chest*arc*lobes}}
    else if(region==='hips'){const hip=Math.exp(-Math.pow((y+.035)/.085,2)),waist=Math.exp(-Math.pow((y-.13)/.045,2));xScale=1+.16*hip-.025*waist;zScale=1+.10*hip-.015*waist}
    else if(region==='thigh'){let k=Math.max(0,Math.min(1,(y+.45)/.4));k=k*k*(3-2*k);xScale=1+.18*k;zScale=1+.14*k}
    v.x *= xScale;
    v.z = v.z * zScale + frontOffset;
    function roundedInfluence(value, center, radius) {
      const t = Math.abs(value - center) / radius;
      if (t >= 1) return 0;
      const smooth = t * t * (3 - 2 * t);
      return 1 - smooth;
    }
    if (region === 'spine' && v.z > 0 &&
        (mesh.material === u.m.skin || mesh.material === u.m.shirt)) {
      const bust = roundedInfluence(y, 0.375, 0.115);
      v.z *= 1 - 0.10 * bust;
    }
    if ((region === 'hips' || region === 'thigh') && v.z < 0 &&
        (mesh.material === u.m.skin || mesh.material === u.m.pants)) {
      const hipY = region === 'thigh' ? y + mesh.parent.position.y : y;
      const hipX = region === 'thigh' ? v.x + mesh.parent.position.x : v.x;
      const vertical = roundedInfluence(hipY, -0.09, 0.16);
      const left = Math.exp(-Math.pow((hipX + 0.075) / 0.075, 2));
      const right = Math.exp(-Math.pow((hipX - 0.075) / 0.075, 2));
      const roundness = Math.min(1, (left + right) / 1.0199);
      const seat = vertical * roundness;
      v.z *= 1 + 0.30 * seat;
    }
    v.applyMatrix4(from);
    a.setXYZ(i, v.x, v.y, v.z);
   }a.needsUpdate=true;g.computeVertexNormals();smoothLuciaSeam(T,g);g.computeBoundingSphere();g.computeBoundingBox();mesh.geometry=g;old.dispose()
  }
  for(const mesh of u.spine.children.slice())fit(mesh,'spine');for(const mesh of u.hips.children.slice())fit(mesh,'hips');for(const leg of u.Lg)for(const mesh of leg.hp.children.slice())fit(mesh,'thigh');h.userData.luciaTankFit=true;
 }
 function graphic(T){if(printTexture)return printTexture;const size=96,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){let color=null;if(x>7&&x<88&&y>8&&y<88)color=[163,154,116];if((x-65)**2+(y-63)**2<170)color=[177,111,112];if(y<34&&x>7&&x<88&&Math.sin(x*.15+y*.3)>.2)color=[78,112,126];if(Math.abs(x-(39+y*.035))<2&&y>25&&y<74)color=[43,47,44];for(let k=0;k<5;k++){const a=k*.68-.6,dx=x-42,dy=y-73,t=dx*Math.cos(a)+dy*Math.sin(a),across=-dx*Math.sin(a)+dy*Math.cos(a);if(t>0&&t<26&&Math.abs(across)<1.8&&y>51)color=[43,47,44]}if(color){const i=(y*size+x)*4;data.set([...color,235],i)}}printTexture=new T.DataTexture(data,size,size,T.RGBAFormat);printTexture.encoding=T.sRGBEncoding;printTexture.needsUpdate=true;return printTexture}
 function jason(T,h){
  const u=h.userData,m=u.m;m.skin.roughness=.74;m.hair.roughness=.8;
  for(const mesh of u.spine.children)if(mesh.isMesh&&mesh.material===m.shirt&&mesh.geometry.type==='LatheGeometry'){mesh.scale.x*=1.06;mesh.scale.z*=1.06;mesh.name='jason-reference-tee'}
  for(const arm of u.A)for(const mesh of arm.sh.children)if(mesh.isMesh&&mesh.material===m.shirt){mesh.scale.x*=1.08;mesh.scale.z*=1.08}
  const p=[],uv=[],idx=[],rows=10,cols=10,profile=[[.168,.26],[.185,.35],[.195,.42],[.196,.47]];
  const radius=y=>{for(let i=1;i<profile.length;i++)if(y<=profile[i][1]){const a=profile[i-1],b=profile[i];return(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]))*1.035+.002}return .205};
  for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const y=.25+i/rows*.23,x=(j/cols-.5)*.22,r=radius(y);p.push(x,y,Math.sqrt(Math.max(0,r*r-Math.pow(x/1.06,2)))*.62*1.06+.0015);uv.push(j/cols,i/rows)}for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;idx.push(a,a+1,b,a+1,b+1,b)}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();add(T,u.spine,geo,new T.MeshStandardMaterial({map:graphic(T),transparent:true,roughness:.95,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),'jason-reference-shirt-graphic');
  const collar=add(T,u.spine,new T.TorusGeometry(.06,.005,6,24),cloth(T,0x4f5755),'jason-tee-collar',0,.55,0);collar.scale.y=.8;collar.rotation.x=Math.PI/2;
  const stubble=new T.MeshStandardMaterial({color:0x47372d,transparent:true,opacity:.15,roughness:1,depthWrite:false});const jaw=new T.LatheGeometry([[.041,.043],[.069,.064],[.085,.097],[.089,.116]].map(p=>new T.Vector2(...p)),24,-Math.PI/2,Math.PI);const shadow=add(T,u.headP,jaw,stubble,'jason-light-stubble',0,0,.005);shadow.scale.set(.94,1,1.065);
 }
 function batch(T,h){const u=h.userData,keep=new Set(u.Lg.map(l=>l.shin)),joints=[u.hips,u.spine,u.headP,...u.A.flatMap(a=>[a.sh,a.el]),...u.Lg.flatMap(l=>[l.hp,l.kn])];for(const joint of joints){const groups=new Map();for(const mesh of joint.children.slice()){if(!mesh.isMesh||keep.has(mesh)||Array.isArray(mesh.material))continue;mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);if(!g.attributes.normal)g.computeVertexNormals();if(!groups.has(mesh.material))groups.set(mesh.material,{p:[],n:[],uv:[]});const b=groups.get(mesh.material),a=g.attributes;for(let i=0;i<a.position.count;i++){b.p.push(a.position.getX(i),a.position.getY(i),a.position.getZ(i));b.n.push(a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i));b.uv.push(a.uv?a.uv.getX(i):0,a.uv?a.uv.getY(i):0)}g.dispose();remove(mesh)}for(const [material,b]of groups){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.computeBoundingSphere();add(T,joint,g,material,'reference-character-batch')}}}
 api.build=function(T,design,over){const id=typeof design==='string'?design:design&&design.referenceLead==='lucia'?'luciaC':design&&design.referenceLead==='jason'?'jasonC':null;if(!looks[id])return originalBuild.apply(this,arguments);const d=Object.assign({},api.DESIGNS[id],over||{},{merge:false,extras:api.DESIGNS[id].extras.filter(x=>x!=='bandana'&&x!=='shades')}),h=originalBuild(T,d,{merge:false});if(id==='luciaC')lucia(T,h);else jason(T,h);h.userData.referenceLead=id;h.userData.faceUncovered=true;if(over&&over.merge)batch(T,h);return h};
 api.referenceLeadsInstalled=true;
})();
