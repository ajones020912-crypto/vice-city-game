const fs=require('fs'),path=require('path'),http=require('http'),vm=require('vm'),assert=require('assert');const deps=process.env.RUNNER_TEMP+'/vc-liquor-feature/node_modules',status='status/liquor-stores-check.json';const report=JSON.parse(fs.readFileSync(status,'utf8'));const checks=[];let browser,server;
const storeNames={
 'Last Stop Liquors':'PALMERA COUNTRYSIDE','Dockside Bottle Shop':'PORT CALUSA','Grove Spirits':'PALMETTO GROVE',
 'Neon Bottle':'VICE CITY','Coral Cork & Bottle':'CORAL RIDGE','Harbor Proof':'PORT VICE CITY'
};
function captureLucia(){
 const live=G.plH.userData,T=window.THREE,scene=new T.Scene(),head=new T.Group();
 for(const mesh of live.headP.children)if(mesh.isMesh)head.add(mesh.clone());
 scene.add(head,new T.HemisphereLight(0xffe5ce,0x716968,1.25));
 const light=new T.DirectionalLight(0xffecd4,1.25);light.position.set(-.45,.8,1.12);scene.add(light);
 const rim=new T.DirectionalLight(0xa9ccff,.65);rim.position.set(.6,.5,-1);scene.add(rim);
 scene.background=new T.Color(0x2d2932);
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}),camera=new T.PerspectiveCamera(34,1,.01,2);
 renderer.outputEncoding=T.sRGBEncoding;renderer.setSize(432,432);
 const sheet=document.createElement('canvas');sheet.width=1296;sheet.height=432;
 const ctx=sheet.getContext('2d');
 [0,.67,1.5].forEach((angle,i)=>{camera.position.set(.69*Math.sin(angle),.223,.69*Math.cos(angle));camera.lookAt(0,.198,-.018);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,i*432,0);});
 renderer.dispose();renderer.forceContextLoss();return sheet.toDataURL().split(',')[1];
}
function trackStoreSigns(){
 const draw=CanvasRenderingContext2D.prototype.fillText,names=new WeakMap();window.__storeSigns=[];
 CanvasRenderingContext2D.prototype.fillText=function(text,x,y){
  if(this.canvas.width===1024&&this.canvas.height===256&&x===604){
   if(y===112)names.set(this.canvas,text);
   if(y===190&&text==='LIQUOR STORE')window.__storeSigns.push(names.get(this.canvas));
  }
  return draw.apply(this,arguments);
 };
}
function recordBrowserErrors(page,errors){
 const known=[];
 page.on('pageerror',e=>{errors.push(String(e));console.error(e);});
 page.on('console',m=>{
  if(m.type()!=='error'||m.text().startsWith('Failed to load resource'))return;
  // Main already shipped this soundtrack stub independently of the liquor integration.
  if(new URL(m.location().url||'about:blank').pathname==='/js/soundtrack.js'&&m.text()==='[VCSoundtrack] File was truncated — restore from git history (e904545554)'){known.push(m.text());return;}
  errors.push(m.text());console.error(m.text());
 });
 return known;
}
(async()=>{try{const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('js/liquor-stores.js','utf8'),sandbox);const lib=sandbox.VCLiquor;assert(lib.catalog.length===6);for(const item of lib.catalog)assert(item.price>0&&item.dose>0&&item.dose<1);const clean=lib.normalize({drinks:{lager:999,vodka:-4,unknown:3},levels:{jason:{level:99,pending:99}}});assert(clean.drinks.lager===12&&clean.drinks.vodka===0&&!('unknown'in clean.drinks));assert(clean.levels.jason.level===1&&clean.levels.jason.pending===0);const s={level:0,pending:.22};lib.advance(s,1,true);assert(s.level>0&&s.level<.22&&s.pending>0);const copy=JSON.stringify(s);lib.advance(s,1,false);assert(JSON.stringify(s)===copy);for(let i=0;i<2500;i++)lib.advance(s,1,true);assert(s.level===0&&s.pending===0);checks.push('Six fictional categories; bounded inventory and intoxication; gradual absorption; pause; complete timed recovery');
 server=http.createServer((req,res)=>{let file;try{file=path.resolve('.','.'+decodeURIComponent(new URL(req.url,'http://local').pathname));}catch(e){res.writeHead(400).end();return;}if(!file.startsWith(process.cwd()+path.sep)&&file!==process.cwd()){res.writeHead(403).end();return;}if(file===process.cwd())file+='/index.html';fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}const types={'.html':'text/html','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.css':'text/css','.json':'application/json'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium}=require(deps+'/playwright');browser=await chromium.launch({headless:true,executablePath:process.env.VC_CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.setDefaultTimeout(30000);report.preexistingConsoleErrors=recordBrowserErrors(page,errors);await page.addInitScript(()=>{window.__VC_LIQUOR_TEST__=true;});await page.addInitScript(trackStoreSigns);await page.route(/https?:\/\/.*\/three(?:\.min)?\.js(?:\?.*)?$/,route=>route.fulfill({path:deps+'/three/build/three.min.js',contentType:'application/javascript'}));await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.G&&G.stats&&G.liquor&&G.liquor.interiorReady&&document.getElementById('start')&&!document.getElementById('start').disabled,{},{timeout:240000});
 const placement=await page.evaluate(()=>({stores:G.liquor.stores.length,bottles:G.liquor.bottleCount,preservation:G.liquor.preservation,locations:G.liquor.stores.map(d=>({district:G.zoneName(d.x,d.z),x:Math.round(d.x),z:Math.round(d.z)}))}));assert(placement.stores>=5,'At least five safely placed stores required');assert(placement.bottles>=100);assert(placement.preservation.roadsUnchanged&&placement.preservation.existingDoorsRetained&&placement.preservation.existingBuildingsRetained);assert(placement.preservation.districts.length>=3,'Stores must cover multiple districts');report.placement=placement;checks.push('Native world boot; five or more safe storefronts across at least three districts; existing roads, buildings, and doors retained; stocked interior');console.log('World ready:',placement);await page.evaluate(()=>G.setQuality(0));
 const names=await page.evaluate(()=>({signs:__storeSigns,labels:__vcLiquorTest.nativeBlips().filter(b=>b.kind==='liquor').map(b=>[b.label,G.zoneName(b.x,b.z)])}));
 assert.deepStrictEqual(names.signs.sort(),Object.keys(storeNames).sort());assert.deepStrictEqual(Object.fromEntries(names.labels.filter(([label])=>label!=='LIQUOR STORE')),storeNames);assert.strictEqual(names.labels.length,7);report.storeNames=Object.fromEntries(names.labels);checks.push('All six names render on storefront textures with LIQUOR STORE subtitles and are mapped to their original districts');
 await page.locator('#start').click();await page.waitForFunction(()=>G.introActive?.());await page.waitForTimeout(800);await page.keyboard.press('Space');await page.waitForFunction(()=>G.state==='play'&&G.pl.alive);
 const approach=offset=>{const d=G.liquor.stores[0],p=G.pl;p.x=d.x;p.z=d.z+offset;p.y=G.heightAt(p.x,p.z);p.vx=p.vz=p.vy=0;};await page.evaluate(approach,15);
 await page.keyboard.press('m');await page.waitForFunction(()=>G.mapOpen);const icons=await page.evaluate(()=>{const hits={mapc:0,minic:0},original=VCLiquor.drawIcon;VCLiquor.drawIcon=function(ctx){hits[ctx.canvas.id]++;return original.apply(this,arguments);};try{__vcLiquorTest.drawMap();__vcLiquorTest.drawMini();return hits;}finally{VCLiquor.drawIcon=original;}});assert(icons.mapc>=1&&icons.minic>=1,JSON.stringify(icons));
 const mapLabels=await page.locator('#mapc').evaluate(canvas=>{
  const bounds=canvas.getBoundingClientRect(),ctx=canvas.getContext('2d'),draw=ctx.fillText,printed=new Set();
  ctx.fillText=function(label){printed.add(label);return draw.apply(this,arguments);};
  try{for(let i=0;i<8&&!printed.has('Neon Bottle');i++)canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,cancelable:true,clientX:(bounds.left+bounds.right)/2,clientY:(bounds.top+bounds.bottom)/2}));return [...printed];}
  finally{ctx.fillText=draw;}
 });assert(mapLabels.includes('Last Stop Liquors')&&mapLabels.includes('Neon Bottle'),'Zoomed map did not render liquor-store labels');
 await page.keyboard.press('m');await page.waitForFunction(()=>!G.mapOpen);checks.push('Singleplayer starts; bottle icons appear on both map canvases; zoomed full map renders named labels');await page.evaluate(approach,0);
 await page.keyboard.press('e');await page.waitForFunction(()=>G.pl.inside&&G.pl.inside.o.kind==='liquor'&&!G.busy);
 if(process.env.VC_TEST_SCREENSHOTS)await page.screenshot({path:path.join(process.env.VC_TEST_SCREENSHOTS,'liquor-store-interior.png')});
 await page.evaluate(()=>{const p=G.pl;p.x=p.inside.o.cx-3.3;p.z=p.inside.o.cz+.5;p.vx=p.vz=0;});await page.keyboard.press('e');await page.waitForFunction(()=>G.state==='shop'&&G.shopKind==='liquorBrowse');assert.strictEqual(await page.locator('#shopitems button:disabled').count(),6);await page.keyboard.press('Escape');
 await page.evaluate(()=>{const p=G.pl;p.x=p.inside.o.counter.x;p.z=p.inside.o.counter.z;p.vx=p.vz=0;});await page.keyboard.press('e');await page.waitForFunction(()=>G.state==='shop'&&G.shopKind==='liquor');const before=await page.evaluate(()=>({cash:G.pl.cash,count:G.pl.inventory.drinks.lager,rum:G.pl.inventory.drinks.rum}));await page.locator('#shopitems .row').first().locator('button').click();await page.getByText('Coral Reef Spiced Rum · Rum',{exact:true}).locator('../..').locator('button').click();const after=await page.evaluate(()=>({cash:G.pl.cash,count:G.pl.inventory.drinks.lager,rum:G.pl.inventory.drinks.rum}));assert(after.cash===before.cash-21&&after.count===before.count+1&&after.rum===before.rum+1);checks.push('Native E entry; six read-only shelf listings; cashier shop and cash deduction; purchases enter inventory');
 await page.keyboard.press('Escape');await page.keyboard.press('i');await page.waitForFunction(()=>G.state==='shop'&&G.shopKind==='liquorBag');assert.match(await page.locator('#shopcash').textContent(),/Condition: Clear-headed/);await page.locator('#shopitems .row').first().locator('button').click();assert.match(await page.locator('#shopcash').textContent(),/Condition: Effects building/);assert.doesNotMatch(await page.locator('#hud').textContent(),/Condition:|Clear-headed|Effects building/);assert(await page.evaluate(()=>G.pl.inventory.drinks.lager===0&&G.pl.alcohol.levels[G.pl.char].pending>0));await page.keyboard.press('Escape');await page.evaluate(()=>{for(let i=0;i<50;i++)__vcLiquorTest.tick(.1);});const fx=await page.evaluate(()=>({level:G.pl.alcohol.levels[G.pl.char].level,blur:__vcLiquorTest.api.renderer.domElement.style.getPropertyValue('--vc-alcohol-blur'),movement:VCLiquor.movementScale()}));assert(fx.level>0&&parseFloat(fx.blur)>0&&fx.movement<1);checks.push('I inventory; consumption removes stock; qualitative status is inventory-only; gradual absorption changes canvas blur and movement');
 await page.evaluate(()=>{const p=G.pl,o=p.inside.o;p.x=o.exit.x;p.z=o.exit.z;p.vx=p.vz=p.vy=0;});await page.keyboard.press('e');await page.waitForFunction(()=>!G.pl.inside&&!G.busy);checks.push('Store exit returns player to the exterior');
 const save=await page.evaluate(()=>{const h=__vcLiquorTest,expected=h.snapshot();if(!h.saveGame(false))throw Error('Native save failed');const d=h.readSave();h.restore(null);h.applySave(d);return {expected,restored:h.snapshot(),saved:!!d.pl.liquor};});assert(save.saved&&save.expected.drinks.rum===1);assert.deepStrictEqual(save.restored.drinks,save.expected.drinks);assert(Math.abs(save.restored.levels.jason.level-save.expected.levels.jason.level)<.03);checks.push('An unconsumed serving and player condition round-trip through the existing version-2 save');
 await page.evaluate(()=>{G.pl.alcohol.levels[G.pl.char]={level:.95,pending:0};G.state='play';const h=__vcLiquorTest,c={t:{},dead:false,speed:15,inp:{steer:.2}},old=G.pl.car;G.pl.car=c;let active=false,quiet=false;
 // Cover two complete burst cycles so the result does not depend on time spent in the shop.
 try{for(let i=0;i<280;i++){h.tick(.1);const bias=h.drivingBias(c);active||=Math.abs(bias)>0;quiet||=bias===0;if(h.drivingBias({t:{},speed:15})!==0)throw Error('NPC vehicle affected');c.t.aircraft=true;if(h.drivingBias(c)!==0)throw Error('Aircraft handling affected');delete c.t.aircraft;c.t.boat=true;if(h.drivingBias(c)!==0)throw Error('Boat handling affected');delete c.t.boat;}if(!active||!quiet)throw Error('Expected both an intoxicated steering disturbance and an unaffected interval');}finally{G.pl.car=old;}
 G.pl.alcohol.reducedFX=true;h.tick(.2);if(parseFloat(h.api.renderer.domElement.style.getPropertyValue('--vc-alcohol-blur'))!==0)throw Error('Reduced blur option failed');h.drawMap();h.drawMini();});checks.push('Intermittent high-level player-road-vehicle steering bias; NPC, aircraft and boat exclusion; reduced-visual-effects option; both map renderers execute');
 await page.keyboard.press('c');await page.waitForFunction(()=>G.pl.char==='lucia'&&G.plH.userData.luciaSculptedHead);
 const luciaRig=await page.evaluate(()=>{const u=G.plH.userData;return {head:u.headP.parent===u.spine&&u.headP.children.some(m=>m.isMesh&&m.geometry.attributes.position.count>10000),arms:u.A.length,legs:u.Lg.length,denim:!!G.plH.getObjectByName('lucia-seamless-denim')?.isSkinnedMesh};});
 assert.deepStrictEqual(luciaRig,{head:true,arms:2,legs:2,denim:true});
 if(process.env.VC_TEST_SCREENSHOTS)fs.writeFileSync(path.join(process.env.VC_TEST_SCREENSHOTS,'lucia-portrait.png'),Buffer.from(await page.evaluate(captureLucia),'base64'));
 await page.keyboard.press('c');await page.waitForFunction(()=>G.pl.char==='jason'&&G.plH.userData.referenceLead==='jasonC'&&!G.plH.userData.luciaSculptedHead);
 checks.push('Playable Lucia switches to sculpted head on the original rig and back to Jason; skinned garments remain intact');
 const duiResult=await page.evaluate(()=>{
  const h=__vcLiquorTest,p=G.pl,car=G.spawnCar('sedan',0,0,0,'parked');
  const require=(condition,message)=>{if(!condition)throw Error(message);};
  G.enterCar(car);p.x=p.z=0;p.y=G.heightAt(0,0);
  p.alcohol.reducedFX=false;p.alcohol.levels[p.char]={level:1,pending:0};h.tick(.2);
  const blur=parseFloat(G.renderer.domElement.style.getPropertyValue('--vc-alcohol-blur'));require(blur>=.8&&blur<=.85,'Blur exceeds the new cap');
  const actualSeen=h.api.seenDriving,probe=()=>{for(let i=0;i<12;i++)h.updateDUI(.1);};
  h.api.seenDriving=()=>false;car.vz=12;car.yr=.9;car.vl=2;probe();require(!p.wanted,'Unwitnessed driving was reported');
  const officer=G.activatePed(p.x+2.6,p.z,true);require(officer,'No officer available for fixture');officer.dir=-Math.PI/2;officer.state='walk';h.api.seenDriving=actualSeen;
  require(actualSeen(car),'Native police witness could not see the test car');
  p.alcohol.levels[p.char].level=0;probe();require(!p.wanted,'Sober driving triggered DUI');
  p.alcohol.levels[p.char].level=.65;car.yr=car.vl=0;probe();require(!p.wanted,'Steady driving triggered DUI');
  p.alcohol.levels[p.char].level=1;car.vz=0;car.yr=.9;car.vl=2;probe();require(!p.wanted,'Stationary intoxication triggered DUI');
  car.vz=12;probe();require(p.wanted===1&&G.duiVehicle===car&&officer.state==='chase','Witnessed erratic driving did not report DUI');
  for(let i=0;i<14;i++)officer.copUpdate(.1);require(!G.busted,'Player was arrested while still driving');
  car.vz=0;for(let i=0;i<14&&!G.busted;i++)officer.copUpdate(.1);
  require(G.busted&&document.getElementById('bigt').textContent==='BUSTED','A nearby officer did not arrest the stopped driver');
  return {blur,nativeArrest:G.busted};
 });report.dui=duiResult;checks.push('Soft blur capped below one pixel; no DUI while sober, parked or unseen; a native officer reports erratic driving and can arrest only after the car stops');
 assert.deepStrictEqual(errors,[],'Browser JavaScript exceptions');checks.push('No browser JavaScript exceptions');report.passed=true;report.stage='syntax, unit tests and browser integration passed';report.tests=checks;report.browserErrors=errors;report.limitations='Automated Chromium/SwiftShader smoke test, not human visual approval or live Render deployment verification.';
 }catch(error){console.error(error);report.passed=false;report.stage='tests';report.tests=checks;report.error=String(error);report.stack=error.stack;process.exitCode=1;}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));fs.writeFileSync(status,JSON.stringify(report,null,2)+'\n');}})();
