// Enhances the custom post stack: quality-scaled SSAO, FXAA, richer Vice grade, better bloom.
const fs = require('fs');
let s = fs.readFileSync('index.html', 'utf8');

if (s.includes('POST_STACK_V3')) {
  console.log('Post-processing V3 already applied');
  process.exit(0);
}

const oldShaderStart = s.indexOf('fragmentShader:`');
if (oldShaderStart < 0) throw new Error('fragmentShader not found');
const oldShaderEnd = s.indexOf('`\n});', oldShaderStart);
if (oldShaderEnd < 0) throw new Error('shader end not found');

const newShader = `fragmentShader:\
  uniform sampler2D tDiffuse,tDepth;uniform vec2 res;\
  uniform float time,night,intensity,camNear,camFar,aoStrength,bloomStrength,focus,gray,flash,hurt;\
  varying vec2 vUv;\
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\
  float linearize(float d){\
   float z=d*2.-1.;\
   return (2.*camNear*camFar)/(camFar+camNear-z*(camFar-camNear));\
  }\
  // Cheap FXAA-style edge AA\
  vec3 fxaa(sampler2D tex, vec2 uv){\
   vec2 px=1./res;\
   vec3 rgbNW=texture2D(tex,uv+vec2(-1.,-1.)*px).rgb;\
   vec3 rgbNE=texture2D(tex,uv+vec2(1.,-1.)*px).rgb;\
   vec3 rgbSW=texture2D(tex,uv+vec2(-1.,1.)*px).rgb;\
   vec3 rgbSE=texture2D(tex,uv+vec2(1.,1.)*px).rgb;\
   vec3 rgbM=texture2D(tex,uv).rgb;\
   vec3 lumaW=vec3(.299,.587,.114);\
   float lumaNW=dot(rgbNW,lumaW),lumaNE=dot(rgbNE,lumaW);\
   float lumaSW=dot(rgbSW,lumaW),lumaSE=dot(rgbSE,lumaW);\
   float lumaM=dot(rgbM,lumaW);\
   float lumaMin=min(lumaM,min(min(lumaNW,lumaNE),min(lumaSW,lumaSE)));\
   float lumaMax=max(lumaM,max(max(lumaNW,lumaNE),max(lumaSW,lumaSE)));\
   vec2 dir;\
   dir.x=-((lumaNW+lumaNE)-(lumaSW+lumaSE));\
   dir.y= ((lumaNW+lumaSW)-(lumaNE+lumaSE));\
   float dirReduce=max((lumaNW+lumaNE+lumaSW+lumaSE)*0.03125,0.0078125);\
   float rcpDirMin=1./(min(abs(dir.x),abs(dir.y))+dirReduce);\
   dir=min(vec2(8.),max(vec2(-8.),dir*rcpDirMin))*px;\
   vec3 a=0.5*(texture2D(tex,uv+dir*(1./3.-.5)).rgb+texture2D(tex,uv+dir*(2./3.-.5)).rgb);\
   vec3 b=a*0.5+0.25*(texture2D(tex,uv+dir*-.5).rgb+texture2D(tex,uv+dir*.5).rgb);\
   float lumaB=dot(b,lumaW);\
   if(lumaB<lumaMin||lumaB>lumaMax) return a;\
   return b;\
  }\
  void main(){\
   vec2 uv=vUv;\
   vec2 c=uv-.5;float r2=dot(c,c);\
   // barrel distortion\
   vec2 uvD=uv+c*r2*.01*intensity;\
   // FXAA base sample + mild chromatic aberration\
   vec3 base=fxaa(tDiffuse,uvD);\
   float ca=(.0004+.00035*night)*intensity;\
   vec3 col=vec3(\
    texture2D(tDiffuse,uvD+c*ca).r,\
    base.g,\
    texture2D(tDiffuse,uvD-c*ca).b\
   );\
   // blend FXAA green channel stability\
   col=mix(col,base,.35);\
   float depth=texture2D(tDepth,uvD).x;\
   float lin=linearize(depth);\
   // --- SSAO ---\
   float ao=1.;\
   if(depth<.9999 && aoStrength>0.01){\
    float acc=0.;float wsum=0.;\
    for(int i=0;i<16;i++){\
     float fi=float(i);\
     float ang=fi*2.399963+(time*0.7);\
     float rad=(1.+mod(fi,4.))*1.9;\
     vec2 offs=vec2(cos(ang),sin(ang))*rad/res;\
     float sd=linearize(texture2D(tDepth,uvD+offs).x);\
     float diff=lin-sd;\
     float range=smoothstep(0.,1.,8./abs(diff+1e-3));\
     acc+=diff>0.018?range:0.;\
     wsum+=1.;\
    }\
    ao=1.-clamp(acc/wsum*1.35,0.,1.)*aoStrength*intensity;\
    ao=mix(1.,ao,1.-smoothstep(100.,360.,lin));\
   }\
   col*=ao;\
   // --- neon bloom ---\
   vec3 bloom=vec3(0.);\
   float bsum=0.;\
   for(int i=-4;i<=4;i++){\
    for(int j=-4;j<=4;j++){\
     float d=length(vec2(float(i),float(j)));\
     if(d>4.2)continue;\
     float w=exp(-d*d*.28);\
     vec2 buv=uvD+vec2(float(i),float(j))/res*(3.2+night*1.2);\
     vec3 samp=texture2D(tDiffuse,buv).rgb;\
     float br=max(samp.r,max(samp.g,samp.b));\
     float m=smoothstep(.5,1.2,br);\
     bloom+=samp*m*w;bsum+=w;\
    }\
   }\
   bloom/=max(bsum,1e-3);\
   col+=bloom*bloomStrength*(.55+.9*night)*intensity;\
   // wet-night sheen\
   if(night>.2){\
    float lum=dot(col,vec3(.299,.587,.114));\
    col+=vec3(.06,.08,.12)*night*smoothstep(.02,.22,lum)*smoothstep(.92,.28,lum);\
   }\
   // Vice City filmic grade\
   col=mix(col,col*vec3(1.1,.92,1.12),.38*intensity);\
   col=mix(col,col*vec3(1.06,.98,.88),.22);\
   if(night>.12)col=mix(col,col*vec3(.88,1.08,1.18),night*.48);\
   // soft contrast + lift shadows\
   col=pow(max(col,0.),vec3(.88));\
   col=col*1.08+vec3(.012,.01,.018)*intensity;\
   float lumF=dot(col,vec3(.299,.587,.114));\
   col=mix(col,vec3(lumF)*vec3(1.02,1.,.97),gray*.9);\
   col=mix(col,mix(vec3(lumF),col,.28)*vec3(1.12,.9,.86),focus*.8);\
   col+=vec3(.72,.8,1.)*flash;\
   // vignette\
   float vig=smoothstep(1.25,.28,length(c*vec2(1.18,1.)));\
   col*=mix(1.,vig,.65*intensity);\
   col=mix(col,vec3(.55,.02,.02),hurt*(1.-vig)*.75);\
   col=mix(col,col*vec3(.55,.32,.38),focus*(1.-vig)*.75);\
   // film grain\
   col+=(hash(uv*res+fract(time*13.))*2.-1.)*.028*intensity;\
   // slight saturation pop\
   float luma=dot(col,vec3(.299,.587,.114));\
   col=mix(vec3(luma),col,1.14);\
   gl_FragColor=vec4(clamp(col,0.,1.5),1.);\
  }\
`;

// Three.js template string uses ` — rebuild carefully without broken escapes
const newShaderRaw = [
'  uniform sampler2D tDiffuse,tDepth;uniform vec2 res;',
'  uniform float time,night,intensity,camNear,camFar,aoStrength,bloomStrength,focus,gray,flash,hurt;',
'  varying vec2 vUv;',
'  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'  float linearize(float d){',
'   float z=d*2.-1.;',
'   return (2.*camNear*camFar)/(camFar+camNear-z*(camFar-camNear));',
'  }',
'  vec3 fxaa(sampler2D tex, vec2 uv){',
'   vec2 px=1./res;',
'   vec3 rgbNW=texture2D(tex,uv+vec2(-1.,-1.)*px).rgb;',
'   vec3 rgbNE=texture2D(tex,uv+vec2(1.,-1.)*px).rgb;',
'   vec3 rgbSW=texture2D(tex,uv+vec2(-1.,1.)*px).rgb;',
'   vec3 rgbSE=texture2D(tex,uv+vec2(1.,1.)*px).rgb;',
'   vec3 rgbM=texture2D(tex,uv).rgb;',
'   vec3 lumaW=vec3(.299,.587,.114);',
'   float lumaNW=dot(rgbNW,lumaW),lumaNE=dot(rgbNE,lumaW);',
'   float lumaSW=dot(rgbSW,lumaW),lumaSE=dot(rgbSE,lumaW);',
'   float lumaM=dot(rgbM,lumaW);',
'   float lumaMin=min(lumaM,min(min(lumaNW,lumaNE),min(lumaSW,lumaSE)));',
'   float lumaMax=max(lumaM,max(max(lumaNW,lumaNE),max(lumaSW,lumaSE)));',
'   vec2 dir;',
'   dir.x=-((lumaNW+lumaNE)-(lumaSW+lumaSE));',
'   dir.y= ((lumaNW+lumaSW)-(lumaNE+lumaSE));',
'   float dirReduce=max((lumaNW+lumaNE+lumaSW+lumaSE)*0.03125,0.0078125);',
'   float rcpDirMin=1./(min(abs(dir.x),abs(dir.y))+dirReduce);',
'   dir=min(vec2(8.),max(vec2(-8.),dir*rcpDirMin))*px;',
'   vec3 a=0.5*(texture2D(tex,uv+dir*(1./3.-.5)).rgb+texture2D(tex,uv+dir*(2./3.-.5)).rgb);',
'   vec3 b=a*0.5+0.25*(texture2D(tex,uv+dir*-.5).rgb+texture2D(tex,uv+dir*.5).rgb);',
'   float lumaB=dot(b,lumaW);',
'   if(lumaB<lumaMin||lumaB>lumaMax) return a;',
'   return b;',
'  }',
'  void main(){',
'   vec2 uv=vUv;',
'   vec2 c=uv-.5;float r2=dot(c,c);',
'   vec2 uvD=uv+c*r2*.01*intensity;',
'   vec3 base=fxaa(tDiffuse,uvD);',
'   float ca=(.0004+.00035*night)*intensity;',
'   vec3 col=vec3(',
'    texture2D(tDiffuse,uvD+c*ca).r,',
'    base.g,',
'    texture2D(tDiffuse,uvD-c*ca).b',
'   );',
'   col=mix(col,base,.35);',
'   float depth=texture2D(tDepth,uvD).x;',
'   float lin=linearize(depth);',
'   float ao=1.;',
'   if(depth<.9999 && aoStrength>0.01){',
'    float acc=0.;float wsum=0.;',
'    for(int i=0;i<16;i++){',
'     float fi=float(i);',
'     float ang=fi*2.399963+(time*0.7);',
'     float rad=(1.+mod(fi,4.))*1.9;',
'     vec2 offs=vec2(cos(ang),sin(ang))*rad/res;',
'     float sd=linearize(texture2D(tDepth,uvD+offs).x);',
'     float diff=lin-sd;',
'     float range=smoothstep(0.,1.,8./abs(diff+1e-3));',
'     acc+=diff>0.018?range:0.;',
'     wsum+=1.;',
'    }',
'    ao=1.-clamp(acc/wsum*1.35,0.,1.)*aoStrength*intensity;',
'    ao=mix(1.,ao,1.-smoothstep(100.,360.,lin));',
'   }',
'   col*=ao;',
'   vec3 bloom=vec3(0.);',
'   float bsum=0.;',
'   for(int i=-4;i<=4;i++){',
'    for(int j=-4;j<=4;j++){',
'     float d=length(vec2(float(i),float(j)));',
'     if(d>4.2)continue;',
'     float w=exp(-d*d*.28);',
'     vec2 buv=uvD+vec2(float(i),float(j))/res*(3.2+night*1.2);',
'     vec3 samp=texture2D(tDiffuse,buv).rgb;',
'     float br=max(samp.r,max(samp.g,samp.b));',
'     float m=smoothstep(.5,1.2,br);',
'     bloom+=samp*m*w;bsum+=w;',
'    }',
'   }',
'   bloom/=max(bsum,1e-3);',
'   col+=bloom*bloomStrength*(.55+.9*night)*intensity;',
'   if(night>.2){',
'    float lum=dot(col,vec3(.299,.587,.114));',
'    col+=vec3(.06,.08,.12)*night*smoothstep(.02,.22,lum)*smoothstep(.92,.28,lum);',
'   }',
'   col=mix(col,col*vec3(1.1,.92,1.12),.38*intensity);',
'   col=mix(col,col*vec3(1.06,.98,.88),.22);',
'   if(night>.12)col=mix(col,col*vec3(.88,1.08,1.18),night*.48);',
'   col=pow(max(col,0.),vec3(.88));',
'   col=col*1.08+vec3(.012,.01,.018)*intensity;',
'   float lumF=dot(col,vec3(.299,.587,.114));',
'   col=mix(col,vec3(lumF)*vec3(1.02,1.,.97),gray*.9);',
'   col=mix(col,mix(vec3(lumF),col,.28)*vec3(1.12,.9,.86),focus*.8);',
'   col+=vec3(.72,.8,1.)*flash;',
'   float vig=smoothstep(1.25,.28,length(c*vec2(1.18,1.)));',
'   col*=mix(1.,vig,.65*intensity);',
'   col=mix(col,vec3(.55,.02,.02),hurt*(1.-vig)*.75);',
'   col=mix(col,col*vec3(.55,.32,.38),focus*(1.-vig)*.75);',
'   col+=(hash(uv*res+fract(time*13.))*2.-1.)*.028*intensity;',
'   float luma=dot(col,vec3(.299,.587,.114));',
'   col=mix(vec3(luma),col,1.14);',
'   gl_FragColor=vec4(clamp(col,0.,1.5),1.);',
'  }',
].join('\n');

s = s.slice(0, oldShaderStart) + 'fragmentShader:`\n' + newShaderRaw + '\n`' + s.slice(oldShaderEnd + 1);

// Quality-scaled AO + bloom in renderFrame (replace forced aoStrength=0)
const oldRF = ` // CITY_MAIN_UPDATE_V2\n postU.aoStrength.value=0;\n postU.bloomStrength.value=G.quality>=2?1.15:.75;`;
const newRF = ` // POST_STACK_V3\n postU.aoStrength.value=G.quality>=2?0.55:G.quality===1?0.28:0;\n postU.bloomStrength.value=G.quality>=2?1.35:G.quality===1?0.95:0.55;\n postU.intensity.value=G.quality>=2?1:G.quality===1?0.85:0.55;`;

if (!s.includes('CITY_MAIN_UPDATE_V2') && !s.includes('postU.aoStrength.value=0')) {
  // try alternate pattern
  if (s.includes('postU.aoStrength.value=0')) {
    s = s.replace(
      /postU\.aoStrength\.value=0;\s*postU\.bloomStrength\.value=G\.quality>=2\?1\.15:\.75;/,
      newRF.replace(/^ \/\/ POST_STACK_V3\n /, '')
    );
    console.log('renderFrame AO/bloom patched (loose)');
  } else if (s.includes('POST_STACK_V3')) {
    console.log('renderFrame already V3');
  } else {
    throw new Error('Could not find aoStrength assignment in renderFrame');
  }
} else {
  s = s.replace(oldRF, newRF);
  console.log('renderFrame AO/bloom patched');
}

if (!s.includes('POST_STACK_V3') && !s.includes('fxaa(tDiffuse')) {
  throw new Error('Patch did not apply cleanly');
}

fs.writeFileSync('index.html', s);
console.log('Post-processing enhanced', fs.statSync('index.html').size);
