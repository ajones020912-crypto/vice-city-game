(function(root){'use strict';
const catalog=Object.freeze([
{id:'lager',name:'Gator Gold Lager',category:'Beer',price:6,dose:.12,color:0xa56b22},
{id:'wine',name:'Marina Sunset Red',category:'Wine',price:14,dose:.16,color:0x59283e},
{id:'whiskey',name:'Orrin Reserve Whiskey',category:'Whiskey',price:18,dose:.22,color:0xa26924},
{id:'vodka',name:'Glacier Coast Vodka',category:'Vodka',price:16,dose:.22,color:0x9dc5d5},
{id:'rum',name:'Coral Reef Spiced Rum',category:'Rum',price:15,dose:.20,color:0xbd7439},
{id:'tequila',name:'Sol Azul Tequila',category:'Tequila',price:17,dose:.20,color:0x8ca472}
]);
const storefronts=[
 {x:80,z:100},
 {x:-220,z:230,name:'Last Stop Liquors'},
 {x:-980,z:800,name:'Dockside Bottle Shop'},
 {x:-250,z:950,name:'Grove Spirits'},
 {x:1100,z:-820,name:'Neon Bottle'},
 {x:600,z:2000,name:'Coral Cork & Bottle'},
 {x:1900,z:-1500,name:'Harbor Proof'}
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
function normalize(data){data=data&&typeof data==='object'?data:{};const out={version:1,drinks:{},levels:{},reducedFX:!!data.reducedFX};for(const p of catalog)out.drinks[p.id]=Math.floor(clamp(data.drinks&&data.drinks[p.id],0,12));for(const c of ['jason','lucia']){const old=data.levels&&data.levels[c]||{},level=clamp(old.level,0,1);out.levels[c]={level,pending:clamp(old.pending,0,1-level)};}return out;}
function advance(s,dt,active){if(!active)return;dt=clamp(dt,0,1);const absorbed=Math.min(s.pending,.055*dt);s.pending=Math.max(0,s.pending-absorbed);s.level=clamp(s.level+absorbed-.0012*dt,0,1);if(s.level<.00001)s.level=0;}
let api=null,phase=0,lastDrink=-Infinity,hudTimer=0;const stores=[];
const dui={car:null,seconds:0,sampleTime:0};
function ensure(){if(!api)return;if(!api.pl.inventory)api.pl.inventory={};if(typeof api.pl.inventory!=='object'||Array.isArray(api.pl.inventory))throw Error('Unrecognized inventory; refusing to replace it');if(!api.pl.inventory.drinks)api.pl.inventory.drinks=normalize().drinks;if(!api.pl.alcohol)api.pl.alcohol=normalize();}
function snapshot(){ensure();return normalize({drinks:api.pl.inventory.drinks,levels:api.pl.alcohol.levels,reducedFX:api.pl.alcohol.reducedFX});}
function restore(data){if(!api)return;const next=normalize(data);if(!api.pl.inventory)api.pl.inventory={};if(typeof api.pl.inventory!=='object'||Array.isArray(api.pl.inventory))throw Error('Unrecognized inventory');api.pl.inventory.drinks=next.drinks;api.pl.alcohol={levels:next.levels,reducedFX:next.reducedFX};lastDrink=-Infinity;resetDUI();api.G.duiVehicle=null;syncHUD();}
function current(){ensure();return api.pl.alcohol.levels[api.pl.char==='lucia'?'lucia':'jason'];}
function level(){return api?current().level:0;}
function condition(){const s=current();return s.level>=.60?'Unsteady':s.level>=.08?'Light-headed':s.pending>0?'Effects building':'Clear-headed';}
function atCounter(){const p=api.pl,o=p.inside&&p.inside.o;return !!(o&&o.kind==='liquor'&&p.alive&&!api.G.busy&&Math.hypot(p.x-o.counter.x,p.z-o.counter.z)<3.2);}
function canDrink(){const p=api.pl;return p.alive&&!p.car&&!p.swim&&!api.G.busy&&!api.G.breakin&&!api.G.robbery&&['play','shop'].includes(api.G.state);}
function consume(id){ensure();const p=catalog.find(x=>x.id===id),s=current(),now=performance.now();if(!p||!canDrink()||!api.pl.inventory.drinks[id])return false;if(now-lastDrink<1200){api.toast('Wait a moment before another drink');return false;}if(s.level+s.pending>.94){api.toast('Not right now.');return false;}api.pl.inventory.drinks[id]--;s.pending=Math.min(1-s.level,s.pending+p.dose);lastDrink=now;api.G.hudDirty=true;api.toast(p.name+' consumed.');syncHUD();return true;}
function openBag(){if(!api.pl.alive||api.G.busy||api.G.phoneOpen||api.G.mapOpen||api.G.state!=='play')return;api.openShop('liquorBag');syncHUD();}
function shelfNear(){const o=api.pl.inside&&api.pl.inside.o;if(!o||o.kind!=='liquor')return false;return [[-3.3,.5],[3.3,.5],[7.3,-3.8],[7.3,0],[7.3,3.8],[-7.5,3.8]].some(q=>Math.hypot(api.pl.x-o.cx-q[0],api.pl.z-o.cz-q[1])<2.0);}
function handleKey(e){if(!api||e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target&&e.target.tagName||'')||api.G.phoneOpen||api.G.mapOpen)return false;const key=String(e.key||'').toLowerCase();if(key==='i'&&api.G.state==='play'&&api.pl.alive&&!api.G.busy){if(!e.repeat)openBag();return true;}if(key!=='e'||api.G.state!=='play'||api.G.busy||!api.pl.alive||!api.pl.inside||api.pl.inside.o.kind!=='liquor')return false;if(e.repeat)return true;const o=api.pl.inside.o;if(Math.hypot(api.pl.x-o.exit.x,api.pl.z-o.exit.z)<3.4)api.exitInterior();else if(atCounter())api.openShop('liquor');else if(shelfNear())api.openShop('liquorBrowse');else return false;return true;}
function drawIcon(ctx,x,y,size){const k=size/18;ctx.save();ctx.translate(x,y);ctx.scale(k,k);ctx.strokeStyle='#dcfff4';ctx.fillStyle='#367f6c';ctx.lineWidth=1.6;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(-2,-8);ctx.lineTo(2,-8);ctx.lineTo(2,-3.5);ctx.lineTo(5,-1);ctx.lineTo(5,8);ctx.lineTo(-5,8);ctx.lineTo(-5,-1);ctx.lineTo(-2,-3.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#f6e7b5';ctx.fillRect(-3,1,6,4);ctx.restore();}
function movementScale(){const l=level();return l<.08?1:1-l*.18*(.6+.4*Math.sin(phase*2.1));}
function drivingBias(c){if(!api||c!==api.pl.car||!api.pl.alive||api.G.state!=='play'||c.dead||!c.t||c.t.aircraft||c.t.boat||Math.abs(c.speed||0)<2)return 0;const strength=Math.max(0,(level()-.6)/.4),burst=Math.max(0,(Math.sin(phase*.47)-.55)/.45);return strength*.12*burst*Math.sin(phase*2.6);}
function resetDUI(){dui.car=null;dui.seconds=dui.sampleTime=0;}
function updateDUI(dt){
 const p=api.pl,g=api.G,c=p.car;
 if(!p.wanted)g.duiVehicle=null;
 if(!p.alive||p.wanted||!c||c.dead||!c.t||c.t.aircraft||c.t.boat||c.airborne||p.inside||g.raceOn?.()||level()<.60){resetDUI();return;}
 if(g.state!=='play'||g.busy||g.mapOpen||g.phoneOpen)return;
 if(dui.car!==c){resetDUI();dui.car=c;}
 dui.sampleTime+=clamp(dt,0,.15);if(dui.sampleTime<.20)return;
 const elapsed=dui.sampleTime;dui.sampleTime=0;
 const erratic=Math.abs(c.speed)>=6&&(Math.abs(c.yr)>.6||Math.abs(c.vl)>1.15||Math.abs(drivingBias(c))>.026);
 if(erratic&&api.seenDriving?.(c)){dui.seconds+=elapsed;if(dui.seconds>=.8){api.reportDUI(c);resetDUI();}}
 else dui.seconds=Math.max(0,dui.seconds-elapsed*.55);
}
function makeHUD(){if(document.getElementById('vcAlcoholHUD'))return;const box=document.createElement('div');box.id='vcAlcoholHUD';box.style.cssText='margin-top:7px;padding-top:4px';box.innerHTML='<button id="vcAlcoholBag" style="padding:4px 8px;font-size:10px;margin:0">Drinks inventory [I]</button>';document.getElementById('hud').appendChild(box);box.querySelector('button').onclick=openBag;const help=document.getElementById('help');if(help){const text=document.createElement('div');text.textContent='I: drinks inventory · Bottle map icon: LIQUOR STORE · E: enter / browse / cashier';help.appendChild(text);}}
function syncHUD(){if(!api||typeof document==='undefined')return;const s=current(),el=api.renderer.domElement,token='blur(var(--vc-alcohol-blur, 0px))',px=(api.G.state==='play'&&!api.pl.alcohol.reducedFX?s.level*s.level*.85:0).toFixed(2)+'px';if(parseFloat(px)>0&&!el.style.filter.includes(token))el.style.filter=(el.style.filter==='none'?'':el.style.filter+' ')+token;else if(parseFloat(px)===0&&el.style.filter.includes(token))el.style.filter=el.style.filter.replace(token,'').trim();if(el.style.getPropertyValue('--vc-alcohol-blur')!==px)el.style.setProperty('--vc-alcohol-blur',px);}
function tick(dt){if(api.G.state==='play'&&api.pl.alive&&!api.G.busy&&!api.G.mapOpen&&!api.G.phoneOpen){dt=clamp(dt,0,1);phase+=dt;for(const s of Object.values(api.pl.alcohol.levels))advance(s,dt,true);}hudTimer-=clamp(dt,0,1);if(hudTimer<=0){hudTimer=.15;syncHUD();}}
function roadLayout(){return JSON.stringify(api.roads.map(r=>[r.o,r.c,r.a,r.b,r.w,r.type]));}
function storeDetail(d){const T=api.T,g=new T.Group(),nx=d.ret.x-d.x,nz=d.ret.z-d.z,len=Math.hypot(nx,nz)||1;g.position.set(d.x-nx/len*.8,api.heightAt(d.x,d.z),d.z-nz/len*.8);g.rotation.y=Math.atan2(nx,nz);g.name='liquor-storefront';const mat=(color,o)=>new T.MeshStandardMaterial(Object.assign({color,roughness:.65},o)),dark=mat(0x243b3d),cream=mat(0xe7dfce),glass=mat(0x73a8af,{metalness:.35,roughness:.18}),awning=mat(0x286451);function box(w,h,zdepth,x,y,z,m){const mesh=new T.Mesh(new T.BoxGeometry(w,h,zdepth),m);mesh.position.set(x,y,z);g.add(mesh);}box(7,.2,1.3,0,3.15,.5,awning);box(1.4,2.5,.09,0,1.25,.1,dark);box(.08,2.6,.13,-.77,1.3,.16,cream);box(.08,2.6,.13,.77,1.3,.16,cream);box(.08,.45,.12,.45,1.1,.21,cream);for(const x of [-2.3,2.3]){box(2.3,1.55,.08,x,1.55,.12,glass);box(2.45,.13,.14,x,.74,.18,cream);}api.world.add(g);}
function furnishInterior(p){const {T,g,bx,col,sign,M,o,clerk}=p;bx(8,1.1,1.4,0,0,-3.5,M(0x456558));col(8,1.4,0,-3.5,1.3);bx(8.2,.1,1.6,0,1.1,-3.5,M(0xd7c9a8));bx(.55,.35,.45,.8,1.2,-3.3,M(0x252e36));bx(.32,.28,.04,.8,1.53,-3.25,M(0x8ce6c4,{emissive:0x3d806b,emissiveIntensity:.4}));clerk.position.set(0,0,-4.7);sign('LIQUOR STORE','#79e3be',0,2.92,-6.79,6.4);
 const bottlePoints=catalog.map(()=>[]),shelfM=M(0x6c6050),frame=M(0x353d40,{metalness:.35}),white=M(0xd8dedc),glass=M(0xa1d8e2,{transparent:true,opacity:.19,roughness:.1,metalness:.15,depthWrite:false});
 for(const x of [-4.8,4.8]){
  col(1.4,4.4,x,.5,2.4);for(const z of [-1.65,2.65])bx(1.4,2.4,.1,x,0,z,frame);
  sign(x<0?'BEER & WINE':'SPIRITS','#f3dfb3',x,2.16,2.715,1.34);
  for(let row=0;row<3;row++){const y=.35+row*.67;bx(1.4,.08,4.4,x,y,.5,shelfM);for(const side of [-1,1])for(let i=0;i<9;i++)bottlePoints[(row+(x>0?3:0))%6].push([x+side*.42,y+.09,-1.35+i*.46]);}
 }
 for(let i=0;i<3;i++){
  const z=-3.8+i*3.8;col(1.2,2.6,8.7,z,2.8);bx(.12,2.8,2.6,9.24,0,z,frame);
  for(const dz of [-1.24,1.24])bx(1.2,2.8,.12,8.7,0,z+dz,frame);
  for(const y of [0,2.59])bx(1.2,.21,2.6,8.7,y,z,frame);
  bx(.04,2.38,2.35,8.08,.21,z,glass,false);bx(.09,.46,.07,8.02,1.05,z+1.01,white);
  for(let row=0;row<3;row++){bx(.98,.05,2.2,8.66,.37+row*.71,z,white);for(let j=0;j<5;j++)bottlePoints[i%2].push([8.37,.43+row*.71,z-.8+j*.4]);}
 }
 bx(2,.8,1.4,-7.5,0,3.8,M(0x776346));col(2,1.4,-7.5,3.8,1);for(let i=0;i<12;i++)bottlePoints[4].push([-8.1+(i%4)*.4,.85,3.45+Math.floor(i/4)*.3]);
 const matrix=new T.Matrix4();for(let k=0;k<bottlePoints.length;k++){const points=bottlePoints[k];if(!points.length)continue;for(const part of [{geo:new T.CylinderGeometry(.09,.1,.32,8),mat:M(catalog[k].color,{roughness:.28}),dy:.16},{geo:new T.CylinderGeometry(.035,.045,.12,6),mat:M(catalog[k].color),dy:.38},{geo:new T.CylinderGeometry(.04,.04,.035,6),mat:M(0xe4d0a0),dy:.46}]){const mesh=new T.InstancedMesh(part.geo,part.mat,points.length);points.forEach((v,i)=>{matrix.makeTranslation(v[0],v[1]+part.dy,v[2]);mesh.setMatrixAt(i,matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;g.add(mesh);}}
 o.liquorProducts=catalog.map(x=>x.id);o.bottleCount=bottlePoints.reduce((a,b)=>a+b.length,0);if(api){api.G.liquor.interiorReady=true;api.G.liquor.bottleCount=o.bottleCount;}}
function install(a){if(api)return;api=a;restore(null);makeHUD();api.SHOP_NAMES.liquor='LIQUOR STORE';api.SHOP_NAMES.liquorBag='Drinks inventory';api.SHOP_NAMES.liquorBrowse='Browse fictional drinks';if(!api.INTKINDS.includes('liquor'))api.INTKINDS.push('liquor');api.G.liquor={version:1,stores,catalog,interiorReady:false,preservation:null};
 const entries=buy=>catalog.map(p=>({n:p.name+' · '+p.category,p:buy?p.price:0,btn:buy?null:'At cashier',locked:!buy||!atCounter()||api.pl.inventory.drinks[p.id]>=12,d:'Single fictional serving · owned '+api.pl.inventory.drinks[p.id]+'/12'+(!buy?' · $'+p.price+' at cashier':''),f:()=>{if(!atCounter()||api.pl.inventory.drinks[p.id]>=12){api.pl.cash+=p.price;return;}api.pl.inventory.drinks[p.id]++;api.G.hudDirty=true;api.toast(p.name+' added to drinks inventory');}}));api.SHOP_ITEMS.liquor=()=>entries(true);api.SHOP_ITEMS.liquorBrowse=()=>entries(false);api.SHOP_ITEMS.liquorBag=()=>catalog.filter(p=>api.pl.inventory.drinks[p.id]>0).map(p=>({n:p.name+' × '+api.pl.inventory.drinks[p.id],p:0,btn:'Drink',locked:!canDrink(),d:p.category+' · effects develop gradually; time restores coordination',f:()=>consume(p.id)})).concat([{n:'Reduced visual effects',p:0,btn:api.pl.alcohol.reducedFX?'On':'Off',d:'Disables blur without changing gameplay',f:()=>{api.pl.alcohol.reducedFX=!api.pl.alcohol.reducedFX;syncHUD();}}]);
 const originals={};function wrap(name,f){const old=api.hooks[name];originals[name]=old;api.hooks[name]=f(old);}
 wrap('forceShopDoors',old=>function(){const result=old.apply(this,arguments),road=roadLayout(),beforeDoors=api.doors.slice(),beforeBuildings=api.BLD.slice();if(!stores.length){for(const {x,z,name='LIQUOR STORE'} of storefronts)api.ensureSafeForcedShop({k:'liquor',name,col:'#79e3be',x,z});stores.push(...api.doors.filter(d=>d.kind==='liquor'));for(const d of stores)storeDetail(d);}api.G.liquor.preservation={roadsUnchanged:road===roadLayout(),existingDoorsRetained:beforeDoors.every(d=>api.doors.includes(d)),existingBuildingsRetained:beforeBuildings.every(b=>api.BLD.includes(b)),districts:[...new Set(stores.map(d=>api.zoneName(d.x,d.z)))]};return result;});
 wrap('simulate',old=>function(dt){const elapsed=Number.isFinite(api.G.rdt)?api.G.rdt:dt;tick(elapsed);const result=old.apply(this,arguments);updateDUI(elapsed);if(api.G.state==='play'&&api.pl.inside&&api.pl.inside.o.kind==='liquor'){if(atCounter())api.showPrompt('[E] Cashier · [I] Drinks inventory');else if(shelfNear())api.showPrompt('[E] Browse drinks · pay at cashier');}return result;});
 wrap('animHuman',old=>function(h,dt,s){if(h!==api.getPlayer()||!api.pl.alive||api.pl.car||api.pl.swim||s.dead)return old.call(this,h,dt,s);const l=level(),affected=l>.08;const result=old.call(this,h,affected?dt*(1-l*.12*(.5+.5*Math.sin(phase*3.1))):dt,s);if(affected&&(s.speed||0)>.3&&!s.aim&&!(s.punch>0)){const u=h.userData,w=l*Math.min(1,s.speed/3);if(u.spine)u.spine.rotation.z+=Math.sin(phase*1.9)*w*.10;if(u.Lg&&u.Lg[0]&&u.Lg[1]){u.Lg[0].hp.rotation.x+=Math.sin(phase*3.7)*w*.11;u.Lg[1].kn.rotation.x=Math.max(0,u.Lg[1].kn.rotation.x+Math.sin(phase*2.7+.8)*w*.08);}}return result;});
 wrap('stepCar',old=>function(c,dt){const bias=drivingBias(c);if(!bias)return old.apply(this,arguments);const steer=c.inp.steer;c.inp.steer=clamp(steer+bias,-1,1);try{return old.apply(this,arguments);}finally{c.inp.steer=steer;}});
 wrap('applySave',old=>function(d){const result=old.apply(this,arguments);restore(d&&d.pl&&d.pl.liquor);return result;});wrap('newGame',old=>function(){restore(null);return old.apply(this,arguments);});wrap('respawn',old=>function(){const s=current();s.level=s.pending=0;resetDUI();api.G.duiVehicle=null;syncHUD();return old.apply(this,arguments);});
 window.addEventListener('keydown',e=>{if(handleKey(e)){e.preventDefault();e.stopImmediatePropagation();}},true);if(window.__VC_LIQUOR_TEST__)window.__vcLiquorTest=Object.assign(api.testHooks(),{originals,tick,consume,restore,snapshot,atCounter,drivingBias,openBag,updateDUI,api});syncHUD();}
root.VCLiquor={catalog,normalize,advance,install,snapshot,restore,condition,movementScale,drawIcon,furnishInterior,handleKey};
})(typeof window==='object'?window:globalThis);
