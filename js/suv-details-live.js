/* SUV-only visual extension. Preserves the original vehicle and physics objects. */
(function(root){
'use strict';
function enhance(T,v,t,color){
 if(v.suvDetailed)return v;
 if(!v.g||!v.ch||!v.body||!v.pm||!Array.isArray(v.wheels)||!v.wheels.length||!v.wheels.every(w=>w.w&&w.piv))throw Error('SUV visual contract changed');
 const W=t.W,L=t.L;if(!(W>0&&L>0&&t.wr>0&&t.wb>0))throw Error('Invalid SUV dimensions');
 v.ch.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(v.ch),H=Number(t.H)||Math.max(1.5,Math.min(2.2,bounds.max.y));
 const trim=new T.MeshStandardMaterial({color:0x20242a,roughness:.86}),steel=new T.MeshStandardMaterial({color:0xa0a6ac,roughness:.36,metalness:.72}),amber=new T.MeshStandardMaterial({color:0xe8a43b,roughness:.4,emissive:0x462300});
 const light=(o,fallback)=>o&&o.material&&o.material.isMaterial?o.material:new T.MeshStandardMaterial({color:fallback,roughness:.35});
 const front=light(v.head,0xe7f0f4),rear=light(v.tail,0xa9212d),parts=[];
 function part(g,m,x,y,z,rx=0,ry=0,rz=0,list=parts){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);list.push(o);}
 const box=(w,h,d,m,x,y,z,rx=0,ry=0,rz=0,list=parts)=>part(new T.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz,list);
 function batch(list,parent,name){const groups=new Map();for(const o of list){o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);const a=g.attributes;if(!groups.has(o.material))groups.set(o.material,{p:[],n:[],uv:[]});const b=groups.get(o.material);for(let i=0;i<a.position.count;i++){b.p.push(a.position.getX(i),a.position.getY(i),a.position.getZ(i));b.n.push(a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i));b.uv.push(a.uv?a.uv.getX(i):0,a.uv?a.uv.getY(i):0);}g.dispose();o.geometry.dispose();}for(const [m,b]of groups){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(b.p.length).fill(1),3));g.computeBoundingBox();g.computeBoundingSphere();const o=new T.Mesh(g,m);o.name=name;o.castShadow=true;parent.add(o);}}
 box(W*.88,H*.11,L*.030,trim,0,H*.27,L*.482);box(W*.88,H*.11,L*.030,trim,0,H*.27,-L*.482);
 box(W*.55,H*.18,L*.004,trim,0,H*.45,L*.496);for(let i=0;i<7;i++)box(W*.012,H*.145,L*.004,steel,(i-3)*W*.065,H*.45,L*.497);
 for(const side of [-1,1]){
  for(let i=0;i<3;i++){box(W*.052,H*.035,L*.004,front,side*(W*.32+i*W*.052),H*.54,L*.497);box(W*.052,H*.035,L*.004,rear,side*(W*.32+i*W*.052),H*.52,-L*.497);}
  box(W*.028,H*.04,L*.005,amber,side*W*.455,H*.48,L*.496);
  box(W*.06,H*.045,L*.54,trim,side*W*.46,H*.18,-L*.01);
  box(W*.018,H*.025,L*.46,steel,side*W*.30,H*1.035,-L*.06);
  for(const z of [-L*.18,L*.07])box(W*.022,H*.035,L*.022,trim,side*W*.30,H*1.012,z);
  box(W*.06,H*.07,L*.08,v.pm,side*W*.46,H*.69,L*.16);box(W*.005,H*.045,L*.055,steel,side*W*.493,H*.69,L*.16);
  for(const z of [-L*.10,L*.11])box(W*.060,H*.018,L*.035,steel,side*W*.474,H*.50,z);
  for(const z of [-L*.26,-L*.055])box(W*.015,H*.25,L*.018,trim,side*W*.402,H*.80,z);
  box(W*.015,H*.015,L*.48,trim,side*W*.404,H*.665,-L*.055);
  for(const z of [-t.wb/2,t.wb/2])part(new T.TorusGeometry(t.wr+.045,W*.016,6,24,Math.PI),trim,side*W*.480,t.wr,z,0,Math.PI/2);
 }
 for(const z of [-L*.17,L*.08])box(W*.64,H*.020,L*.015,trim,0,H*1.050,z);
 box(W*.22,H*.013,L*.009,trim,0,H*.79,-L*.350);
 const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');if(!x)throw Error('License plate canvas unavailable');x.fillStyle='#eee9da';x.fillRect(0,0,256,128);x.fillStyle='#254a60';x.textAlign='center';x.font='bold 22px Arial';x.fillText('LEONIDA',128,30);x.font='bold 43px Arial';x.fillText('VC '+String((Number(color)>>>0)%900+100),128,90);
 const map=new T.CanvasTexture(c);map.encoding=T.sRGBEncoding;const plate=new T.MeshBasicMaterial({map,toneMapped:false});part(new T.PlaneGeometry(W*.32,H*.08),plate,0,H*.31,L*.499);part(new T.PlaneGeometry(W*.32,H*.08),plate,0,H*.34,-L*.499,0,Math.PI);
 const group=new T.Group();group.name='suv-exterior-details';v.ch.add(group);batch(parts,group,'suv-batched-exterior-detail');
 for(const wheel of v.wheels){if(!wheel.w||!wheel.piv)continue;const spokes=[],side=Math.sign(wheel.piv.position.x)||1;for(let i=0;i<5;i++)box(.020,t.wr*1.35,.028,steel,side*.100,0,0,i*Math.PI/5,0,0,spokes);part(new T.CylinderGeometry(t.wr*.18,t.wr*.18,.022,12),steel,side*.105,0,0,0,0,Math.PI/2,spokes);batch(spokes,wheel.w,'suv-wheel-rim-detail');}
 v.suvDetailed=true;return v;
}
root.VCSUVDetails={version:2,enhance};
})(typeof globalThis!=='undefined'?globalThis:window);
