const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const acorn=require(process.env.RUNNER_TEMP+'/vc-liquor-audit/node_modules/acorn');
const root='status/liquor-integration';fs.mkdirSync(root,{recursive:true});
const html=fs.readFileSync('index.html','utf8'),report={gameplayChanged:false,indexSHA256:crypto.createHash('sha256').update(html).digest('hex'),syntax:[],functions:[],declarations:[],events:[],externalScripts:[]};
function walk(n,fn){fn(n);for(const v of Object.values(n)){if(Array.isArray(v)){for(const x of v)if(x&&typeof x.type==='string')walk(x,fn);}else if(v&&typeof v.type==='string')walk(v,fn);}}
function writeParts(stem,text){const files=[];for(let i=0;i<text.length;i+=14000){const name=stem+(text.length>14000?'-part-'+(1+i/14000):'')+'.txt';fs.mkdirSync(path.dirname(root+'/'+name),{recursive:true});fs.writeFileSync(root+'/'+name,text.slice(i,i+14000));files.push(name);}return files;}
const selected=/simulate|playerOnFoot|animHuman|stepCar|drawMini|drawMap|buildBaseMap|interior|shop|inventory|saveGame|loadGame|newGame|door|Spot|defineRoads|addRoad|addCol|queryCols|circleBox|signTex|footprintHitsRoad|zoneName|switchChar|respawn|buildWorld|initWorld|makeHuman|robbery/i;
const declarations=new Set(['G','pl','INT','SHOP_ITEMS','SHOP_NAMES','doors','doorMarks','spots','CITIES','CITY','roads','parcels','BLD','WS','WL','MAPPX','baseMap','SAVE_KEY','SAVEKEY','KEY','intGroup','world','scene','renderer']);
let scriptIndex=0,eventIndex=0;const occurrences={};
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 const attrs=match[1],code=match[2];const src=/\bsrc=["']([^"']+)/i.exec(attrs);if(src){report.externalScripts.push(src[1]);continue;}if(!code.trim()||(/\btype=/i.test(attrs)&&!/\btype=["'](?:module|text\/javascript|application\/javascript)["']/i.test(attrs)))continue;
 const index=scriptIndex++;let ast;try{ast=acorn.parse(code,{ecmaVersion:'latest',sourceType:/type=["']module["']/i.test(attrs)?'module':'script'});report.syntax.push({file:'index.html',inlineScript:index,passed:true});}catch(error){report.syntax.push({file:'index.html',inlineScript:index,passed:false,error:String(error)});continue;}
 walk(ast,node=>{
  if(node.type==='FunctionDeclaration'&&node.id){const name=node.id.name,number=occurrences[name]=(occurrences[name]||0)+1,item={name,occurrence:number,inlineScript:index,length:node.end-node.start};if(selected.test(name))item.files=writeParts('functions/'+name+'-'+number,code.slice(node.start,node.end));report.functions.push(item);}
  if(node.type==='VariableDeclarator'&&node.id.type==='Identifier'&&declarations.has(node.id.name)){const name=node.id.name;report.declarations.push({name,inlineScript:index,files:writeParts('data/'+name+'-'+index+'-'+node.start,code.slice(node.start,node.end))});}
  if(node.type==='CallExpression'&&node.callee.type==='MemberExpression'&&node.callee.property.name==='addEventListener'&&node.arguments[0]&&['keydown','keyup','click'].includes(node.arguments[0].value)){const source=code.slice(node.start,node.end);if(node.arguments[0].value!=='click'||/shop|inventory|map|phone/i.test(source)){const id=eventIndex++;report.events.push({type:node.arguments[0].value,inlineScript:index,files:writeParts('events/handler-'+id,source)});}}
 });
 report['tail'+index]=writeParts('bootstrap/script-'+index+'-tail',code.slice(-12000));
 const terms=['inventory','consumable','alcohol','intox','drunk','localStorage','SHOP_ITEMS','INT['];
 const contexts={};for(const term of terms){contexts[term]=[];let start=0;while(contexts[term].length<5){const at=code.indexOf(term,start);if(at<0)break;contexts[term].push(code.slice(Math.max(0,at-500),Math.min(code.length,at+1100)));start=at+term.length;}}
 fs.writeFileSync(root+'/contexts-'+index+'.json',JSON.stringify(contexts,null,2)+'\n');
}
for(const file of fs.readdirSync('js').filter(x=>x.endsWith('.js'))){const source=fs.readFileSync('js/'+file,'utf8');try{acorn.parse(source,{ecmaVersion:'latest',sourceType:'script'});report.syntax.push({file:'js/'+file,passed:true});}catch(first){try{acorn.parse(source,{ecmaVersion:'latest',sourceType:'module'});report.syntax.push({file:'js/'+file,passed:true,sourceType:'module'});}catch(error){report.syntax.push({file:'js/'+file,passed:false,error:String(error)});}}}
report.passed=scriptIndex>0&&report.syntax.every(x=>x.passed);report.limitations='Syntax and source inspection only; does not test browser execution, WebGL rendering, gameplay, or deployed files.';
assert(fs.readFileSync('index.html','utf8')===html,'Inspection must not change game source');
fs.writeFileSync(root+'/manifest.json',JSON.stringify(report,null,2)+'\n');
