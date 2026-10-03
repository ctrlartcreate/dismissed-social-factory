const http=require('http');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const ffmpeg=require('ffmpeg-static');
const ffprobe=require('ffprobe-static').path;
const sharp=require('sharp');

const PORT=process.env.PORT||10000;
const BASE=process.env.PUBLIC_BASE_URL||'https://dismissed-social-factory.onrender.com';
const IG_APP_ID=process.env.IG_APP_ID||'';
const IG_APP_SECRET=process.env.IG_APP_SECRET||'';
const IG_ACCESS_TOKEN=process.env.IG_ACCESS_TOKEN||'';
const IG_USER_ID=process.env.IG_USER_ID||'';
const GRAPH_VERSION=process.env.GRAPH_VERSION||'v26.0';
const ADMIN_KEY=process.env.ADMIN_KEY||'';
const DIR='/tmp/dismissed-social-factory';
fs.mkdirSync(DIR,{recursive:true});

sharp.cache(false);
sharp.concurrency(1);

const CASE17={
  title:"DON'T ROMANTICIZE THE DAMAGE",
  caseNo:'17',
  image:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/frontblackROM.png?v=1790956869',
  zoom:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/frontzoomrom.png?v=1790956869'
};
const CASE17_OUT=path.join(DIR,'case17-romanticize.mp4');
let case17Job=null;

async function cleanConnectedWhite(input,output){
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height,c=info.channels,idx=(x,y)=>(y*w+x)*c;
  const patch=Math.max(8,Math.min(32,Math.floor(Math.min(w,h)*0.02))),samples=[];
  for(const [sx,sy] of [[0,0],[w-patch,0],[0,h-patch],[w-patch,h-patch]]){
    for(let y=sy;y<sy+patch;y+=2)for(let x=sx;x<sx+patch;x+=2){
      const i=idx(x,y);samples.push([data[i],data[i+1],data[i+2]]);
    }
  }
  const bg=[0,1,2].map(k=>{const a=samples.map(v=>v[k]).sort((a,b)=>a-b);return a[Math.floor(a.length/2)]});
  const seen=new Uint8Array(w*h),qx=new Int32Array(w*h),qy=new Int32Array(w*h);let head=0,tail=0;
  const isBg=(x,y)=>{const i=idx(x,y),r=data[i],g=data[i+1],b=data[i+2],d=Math.hypot(r-bg[0],g-bg[1],b-bg[2]);return Math.min(r,g,b)>145&&d<105};
  const push=(x,y)=>{const p=y*w+x;if(seen[p]||!isBg(x,y))return;seen[p]=1;qx[tail]=x;qy[tail]=y;tail++};
  for(let x=0;x<w;x++){push(x,0);push(x,h-1)} for(let y=0;y<h;y++){push(0,y);push(w-1,y)}
  while(head<tail){const x=qx[head],y=qy[head++];if(x>0)push(x-1,y);if(x<w-1)push(x+1,y);if(y>0)push(x,y-1);if(y<h-1)push(x,y+1)}
  for(let p=0;p<w*h;p++)if(seen[p]){const i=p*c;data[i]=255;data[i+1]=255;data[i+2]=255;data[i+3]=255}
  await sharp(data,{raw:info})
    .resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true,kernel:'lanczos3'})
    .png({compressionLevel:9})
    .toFile(output);
}

function spawnPromise(cmd,args,opts={}){
  return new Promise((resolve,reject)=>{
    let stderr='';
    const p=cp.spawn(cmd,args,{stdio:['ignore','pipe','pipe'],...opts});
    p.stdout.on('data',d=>console.log('[case17]',d.toString().trim()));
    p.stderr.on('data',d=>{stderr=(stderr+d.toString()).slice(-20000);console.log('[case17]',d.toString().trim())});
    p.on('error',reject);
    p.on('close',code=>code===0?resolve():reject(new Error(stderr||cmd+' exited '+code)));
  });
}

function case17Html(){
return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920"><title>DISMISSED CASE 17</title>
<script src="assets/gsap.min.js"><\/script>
<style>
*{box-sizing:border-box}html,body{margin:0;width:360px;height:640px;overflow:hidden;background:#fff;color:#090909;font-family:Arial,Helvetica,sans-serif}
#root{position:relative;width:360px;height:640px;overflow:hidden;background:#fff}
#scene{position:absolute;left:0;top:0;width:1080px;height:1920px;transform:scale(.3333333333);transform-origin:0 0;overflow:hidden;background:#fff}
.rule{position:absolute;left:64px;right:64px;height:2px;background:#0b0b0b;transform-origin:left center}.rt{top:108px}.rb{bottom:114px}
.meta{position:absolute;top:58px;font-size:20px;line-height:1;letter-spacing:.15em;font-weight:700;z-index:12}#case{left:64px}#brand{right:64px;text-align:right}
.title{position:absolute;left:60px;right:60px;top:160px;font-size:82px;line-height:.86;letter-spacing:-.06em;font-weight:900;text-transform:uppercase;z-index:11}
.title span{display:block}.title .r{text-align:right}
.product{position:absolute;left:40px;top:350px;width:1000px;height:980px;display:flex;align-items:center;justify-content:center;z-index:2}
.product img{width:100%;height:100%;object-fit:contain;display:block}
.label{position:absolute;left:64px;top:1370px;font-size:20px;letter-spacing:.18em;font-weight:700;z-index:12}
.spec{position:absolute;left:64px;right:64px;bottom:164px;display:flex;justify-content:space-between;align-items:flex-end;font-size:17px;line-height:1.35;letter-spacing:.12em;font-weight:700;text-transform:uppercase;z-index:12}.spec .right{text-align:right}
#scan{position:absolute;z-index:15;top:108px;bottom:115px;left:-10px;width:2px;background:#111}
#end{position:absolute;inset:0;background:#fff;display:flex;flex-direction:column;padding:64px;opacity:0;z-index:30}
#end .small{font-size:20px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
#end .statement{margin-top:410px;font-size:92px;line-height:.9;letter-spacing:-.058em;font-weight:900;text-transform:uppercase}
#end .line2{margin-top:30px}
#end .footer{margin-top:auto;border-top:2px solid #111;padding-top:25px;display:flex;justify-content:space-between;align-items:flex-end;font-size:18px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
#end .dismissed{font-size:38px;letter-spacing:-.035em}
</style></head><body>
<main id="root" data-hf-id="case17-root" data-composition-id="main" data-start="0" data-width="360" data-height="640" data-duration="8" data-fps="24"><div id="scene">
<div id="rt" class="rule rt"></div><div id="rb" class="rule rb"></div>
<div id="case" class="meta">CASE NO.17 / 026</div><div id="brand" class="meta">DISMISSED®</div>
<div id="title" class="title"><span>DON'T</span><span class="r">ROMANTICIZE</span><span>THE DAMAGE</span></div>
<section id="full" class="product clip" data-start="0" data-duration="4.7" data-track-index="0"><img src="assets/frontblackROM-clean.png"></section>
<section id="detail" class="product clip" data-start="4.2" data-duration="2.0" data-track-index="0"><img src="assets/frontzoomrom-clean.png"></section>
<div id="fullLabel" class="label">01 / FRONT EVIDENCE</div><div id="detailLabel" class="label">02 / PRINT DETAIL</div>
<div id="spec" class="spec"><div>BLACK / FRENCH TERRY<br>OVERSIZED STRUCTURE</div><div class="right">LIMITED SERIES<br>BUCHAREST / RO</div></div>
<div id="scan"></div>
<section id="end" class="clip" data-start="6.1" data-duration="1.9" data-track-index="1">
<div class="small">CASE FILE 017 / DON'T ROMANTICIZE THE DAMAGE</div>
<div class="statement"><div>SEE IT</div><div>AS IT WAS.</div><div class="line2">NOT AS MEMORY</div><div>REWRITES IT.</div></div>
<div class="footer"><div class="dismissed">DISMISSED®</div><div>CASE FILES / 2026</div></div>
</section></div>
</main>
<script>
window.__timelines=window.__timelines||{};gsap.set(["#case","#brand","#title","#full","#detail","#fullLabel","#detailLabel","#spec","#scan","#end"],{opacity:0});const tl=gsap.timeline({paused:true,defaults:{ease:"power3.out"}});
tl.fromTo("#rt",{scaleX:0},{scaleX:1,duration:.5,ease:"power2.out"},.05).fromTo("#rb",{scaleX:0},{scaleX:1,duration:.5,ease:"power2.out"},.10);
tl.to(["#case","#brand"],{opacity:1,duration:.28},.18).fromTo("#title",{y:22,opacity:0},{y:0,opacity:1,duration:.55},.28);
tl.fromTo("#full",{opacity:0,scale:.92,y:34},{opacity:1,scale:1,y:0,duration:.72,ease:"power4.out"},.5).to("#fullLabel",{opacity:1,duration:.25},.82).to("#spec",{opacity:1,duration:.3},1.02);
tl.to("#full",{scale:1.045,y:-13,duration:2.25,ease:"sine.inOut"},1.45);
tl.set("#scan",{opacity:1,x:0},3.98).to("#scan",{x:1100,duration:.34,ease:"power4.inOut"},3.98);
tl.to(["#full","#fullLabel"],{opacity:0,duration:.2},4.22).fromTo("#detail",{opacity:0,scale:.96},{opacity:1,scale:1.01,duration:.38},4.25).to("#detailLabel",{opacity:1,duration:.24},4.45);
tl.to("#detail",{scale:1.11,y:-45,duration:1.30,ease:"sine.inOut",overwrite:"auto"},4.65);
tl.to(["#detail","#detailLabel","#title","#spec","#case","#brand","#rt","#rb"],{opacity:0,duration:.25},5.98);
tl.fromTo("#end",{opacity:0},{opacity:1,duration:.3,ease:"power2.out"},6.08).fromTo("#end .small",{y:-14,opacity:0},{y:0,opacity:1,duration:.38},6.2);
tl.fromTo("#end .statement",{y:48,opacity:0},{y:0,opacity:1,duration:.56,ease:"power4.out"},6.32).fromTo("#end .footer",{y:18,opacity:0},{y:0,opacity:1,duration:.4},6.78);
tl.to({}, {duration:.01},7.99);window.__timelines.main=tl;
<\/script></body></html>`;
}

async function buildCase17(){
  if(fs.existsSync(CASE17_OUT)&&fs.statSync(CASE17_OUT).size>100000)return CASE17_OUT;
  const proj=path.join(DIR,'case17-hyperframes'),assets=path.join(proj,'assets');
  fs.rmSync(proj,{recursive:true,force:true});fs.mkdirSync(assets,{recursive:true});
  const front=path.join(assets,'frontblackROM.png'),zoom=path.join(assets,'frontzoomrom.png');
  await download(CASE17.image,front);await download(CASE17.zoom,zoom);
  await cleanConnectedWhite(front,path.join(assets,'frontblackROM-clean.png'));
  await cleanConnectedWhite(zoom,path.join(assets,'frontzoomrom-clean.png'));
  fs.copyFileSync(require.resolve('gsap/dist/gsap.min.js'),path.join(assets,'gsap.min.js'));
  fs.writeFileSync(path.join(proj,'index.html'),case17Html());
  fs.writeFileSync(path.join(proj,'hyperframes.json'),JSON.stringify({
    $schema:'https://hyperframes.heygen.com/schema/hyperframes.json',
    registry:'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
    paths:{blocks:'compositions',components:'compositions/components',assets:'assets'},
    authoringSkill:'product-launch-video'
  },null,2));
  const bin=path.join(DIR,'hf-bin');fs.mkdirSync(bin,{recursive:true});
  for(const [name,target] of [['ffmpeg',ffmpeg],['ffprobe',ffprobe]]){const link=path.join(bin,name);try{fs.unlinkSync(link)}catch{}fs.symlinkSync(target,link)}
  const env={...process.env,PATH:bin+path.delimiter+process.env.PATH,HYPERFRAMES_NO_TELEMETRY:'1'};
  const hf=path.resolve(process.cwd(),'node_modules/.bin/hyperframes');
  await spawnPromise(hf,['browser','ensure'],{cwd:proj,env});
  const low=path.join(DIR,'case17-romanticize-360x640.mp4');
  try{fs.unlinkSync(low)}catch{}
  console.log('CASE17_RENDER_START',low);
  await spawnPromise(hf,['render','--quality','looks','--fps','24','--workers','1','--output',low],{cwd:proj,env});
  console.log('CASE17_UPSCALE_START',CASE17_OUT);
  await spawnPromise(ffmpeg,['-y','-i',low,'-vf','scale=1080:1920:flags=lanczos','-c:v','libx264','-preset','ultrafast','-tune','zerolatency','-crf','17','-threads','1','-x264-params','threads=1:lookahead_threads=1:sync-lookahead=0:rc-lookahead=0','-pix_fmt','yuv420p','-movflags','+faststart','-r','24',CASE17_OUT],{env});
  try{fs.unlinkSync(low)}catch{}
  if(!fs.existsSync(CASE17_OUT)||fs.statSync(CASE17_OUT).size<100000)throw new Error('CASE17 MP4 missing');
  return CASE17_OUT;
}
function startCase17(){if(fs.existsSync(CASE17_OUT)&&fs.statSync(CASE17_OUT).size>100000)return Promise.resolve(CASE17_OUT);if(case17Job)return case17Job;case17Job=buildCase17().finally(()=>case17Job=null);return case17Job}


const TIMES=[10,13,16,19,22];
const PRODUCTS=[
  {title:'SEEN NOTHING',caseNo:'01',image:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/seen-nothing-oversized-t-shirt-case-no-1-black.png?v=1771786893'},
  {title:'SAY NOTHING',caseNo:'02',image:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/say-nothing-oversized-t-shirt-case-no-2-black.png?v=1771786980'},
  {title:'HEARD NOTHING',caseNo:'03',image:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/hear-nothing-oversized-t-shirt-case-no-3-black.png?v=1771787018'},
  {title:'BREAKDOWN',caseNo:'04',image:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/BREAKDOWN-oversized-t-shirt-case-no-3-black1.png?v=1771787098'},
  {title:'FEEL NOTHING',caseNo:'05',image:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/feel-nothing-oversized-t-shirt-case-no-6-black1.png?v=1771787131'},
  {title:'MY MOM SAID I COULD',caseNo:'06',image:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/mymomsayidicould-oversized-t-shirt-case-no-6-black1.png?v=1771787187'},
  {title:"DON'T SCREAM",caseNo:'07',image:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/dont-scream-oversized-t-shirt-case-no-7-black1.png?v=1771787234'},
  {title:'INSIDE THE RUIN',caseNo:'11',image:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/inside-the-ruin-case-no-8-black1.png?v=1774302031'},
  {title:"DON'T TAG ME",caseNo:'15',image:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/donttagme1.jpg?v=1775852166'},
  {title:'FUTURE ME',caseNo:'16',image:'https://cdn.shopify.com/s/files/1/0989/0460/5011/files/spatenegru.png?v=1776085499'}
];

const jobs=new Map();
const postedSlots=new Set();

function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function bucharestParts(d=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d);
  return Object.fromEntries(parts.map(x=>[x.type,x.value]));
}
function dayKey(d=new Date()){const x=bucharestParts(d);return x.year+'-'+x.month+'-'+x.day}
function dayIndex(k){return Number(k.replaceAll('-',''))}
function pick(k,slot){return PRODUCTS[(dayIndex(k)*5+slot)%PRODUCTS.length]}
function outputPath(date,slot){return path.join(DIR,date+'-'+slot+'.mp4')}
function isReady(date,slot){const f=outputPath(date,slot);return fs.existsSync(f)&&fs.statSync(f).size>100000}

async function download(url,out){
  if(fs.existsSync(out)&&fs.statSync(out).size>10000)return;
  const r=await fetch(url);
  if(!r.ok)throw new Error('Product image download failed: '+r.status);
  fs.writeFileSync(out,Buffer.from(await r.arrayBuffer()));
}

function filterFor(slot){
  const base=[
    "scale=760:1320:force_original_aspect_ratio=decrease,pad=900:1600:(ow-iw)/2:(oh-ih)/2:color=0xF1F0EB,zoompan=z='min(zoom+0.00035,1.055)':d=168:s=900x1600:fps=24,scale=1080:1920:flags=bicubic,drawbox=x=70:y=70:w=940:h=1780:color=black@0.10:t=2",
    "scale=900:1600:force_original_aspect_ratio=increase,crop=900:1600,zoompan=z='1.08-0.00030*on':d=168:s=900x1600:fps=24,scale=1080:1920:flags=bicubic,eq=contrast=1.16:saturation=0.18,drawbox=x=0:y=0:w=1080:h=130:color=black@0.72:t=fill",
    "scale=760:1320:force_original_aspect_ratio=decrease,pad=900:1600:(ow-iw)/2:(oh-ih)/2:black,zoompan=z='1.015+0.010*sin(on/16)':d=168:s=900x1600:fps=24,scale=1080:1920:flags=bicubic,drawgrid=w=180:h=180:t=1:c=white@0.07,drawbox=x=0:y='260+mod(t*360,1250)':w=1080:h=4:color=red@0.82:t=fill",
    "scale=900:1600:force_original_aspect_ratio=increase,crop=900:1600,zoompan=z='min(zoom+0.00045,1.075)':x='iw/2-(iw/zoom/2)+12*sin(on/12)':y='ih/2-(ih/zoom/2)':d=168:s=900x1600:fps=24,scale=1080:1920:flags=bicubic,eq=contrast=1.08:saturation=0.52,drawbox=x=55:y=1430:w=710:h=220:color=black@0.62:t=fill",
    "scale=760:1320:force_original_aspect_ratio=decrease,pad=900:1600:(ow-iw)/2:(oh-ih)/2:black,zoompan=z='min(zoom+0.00025,1.045)':d=168:s=900x1600:fps=24,scale=1080:1920:flags=bicubic,drawgrid=w=135:h=135:t=1:c=white@0.055,drawbox=x=70:y=145:w=940:h=1470:color=white@0.12:t=2"
  ];
  return base[slot]||base[0];
}

function runProcess(cmd,args){
  return new Promise((resolve,reject)=>{
    let stderr='';
    const p=cp.spawn(cmd,args,{stdio:['ignore','ignore','pipe']});
    p.stderr.on('data',d=>{stderr=(stderr+d.toString()).slice(-10000)});
    p.on('error',reject);
    p.on('close',code=>code===0?resolve():reject(new Error(stderr||('process exited '+code))));
  });
}

async function generateVideo(date,slot){
  slot=Math.max(0,Math.min(4,Number(slot)));
  if(isReady(date,slot))return outputPath(date,slot);
  const product=pick(date,slot);
  const ext=product.image.includes('.jpg')?'.jpg':'.png';
  const image=path.join(DIR,'product-'+product.caseNo+ext);
  await download(product.image,image);
  const outfile=outputPath(date,slot);
  const tmp=outfile+'.part.mp4';
  try{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}catch{}
  const freq=46+slot*7;
  const args=[
    '-y','-loop','1','-i',image,
    '-f','lavfi','-i','sine=frequency='+freq+':sample_rate=48000:duration=7',
    '-vf',filterFor(slot),
    '-af','volume=0.18',
    '-t','7','-r','24',
    '-c:v','libx264','-preset','veryfast','-threads','1','-crf','20','-pix_fmt','yuv420p',
    '-c:a','aac','-ar','48000','-b:a','128k',
    '-shortest','-movflags','+faststart',tmp
  ];
  await runProcess(ffmpeg,args);
  fs.renameSync(tmp,outfile);
  return outfile;
}

function startGeneration(date,slot){
  const key=date+':'+slot;
  if(isReady(date,slot))return Promise.resolve(outputPath(date,slot));
  if(jobs.has(key))return jobs.get(key);
  const job=generateVideo(date,slot)
    .catch(e=>{console.error('render failed',key,e.message);throw e})
    .finally(()=>jobs.delete(key));
  jobs.set(key,job);
  return job;
}

function sendJson(res,status,obj){
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  res.end(JSON.stringify(obj));
}
function sendHtml(res,status,html){
  res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  res.end(html);
}
function streamVideo(req,res,file){
  const st=fs.statSync(file);
  const range=req.headers.range;
  if(range){
    const m=/bytes=(\d*)-(\d*)/.exec(range);
    if(m){
      let start=m[1]?Number(m[1]):0;
      let end=m[2]?Number(m[2]):st.size-1;
      if(start>=st.size){res.writeHead(416,{'content-range':'bytes */'+st.size});return res.end()}
      end=Math.min(end,st.size-1);
      res.writeHead(206,{
        'content-type':'video/mp4',
        'content-length':end-start+1,
        'content-range':'bytes '+start+'-'+end+'/'+st.size,
        'accept-ranges':'bytes',
        'cache-control':'public,max-age=3600'
      });
      return fs.createReadStream(file,{start,end}).pipe(res);
    }
  }
  res.writeHead(200,{'content-type':'video/mp4','content-length':st.size,'accept-ranges':'bytes','cache-control':'public,max-age=3600'});
  return fs.createReadStream(file).pipe(res);
}

async function graphJson(url,opts={}){
  const r=await fetch(url,opts);
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error)throw new Error(JSON.stringify(j));
  return j;
}

async function instagramStatus(){
  if(!IG_ACCESS_TOKEN||!IG_USER_ID)return {connected:false};
  try{
    const q=await graphJson('https://graph.instagram.com/'+GRAPH_VERSION+'/'+IG_USER_ID+'/content_publishing_limit?fields=quota_usage,config&access_token='+encodeURIComponent(IG_ACCESS_TOKEN));
    return {connected:true,api:true,quota:q.data||[]};
  }catch(e){
    return {connected:true,api:false,error:e.message};
  }
}

async function recentlyPublished(){
  if(!IG_ACCESS_TOKEN||!IG_USER_ID)return false;
  try{
    const j=await graphJson('https://graph.instagram.com/'+GRAPH_VERSION+'/'+IG_USER_ID+'/media?fields=id,timestamp,caption&limit=5&access_token='+encodeURIComponent(IG_ACCESS_TOKEN));
    return (j.data||[]).some(m=>{
      const age=Date.now()-new Date(m.timestamp).getTime();
      return age>=0&&age<55*60*1000&&String(m.caption||'').includes('Dismissed.');
    });
  }catch(e){
    console.warn('recent media check failed',e.message);
    return false;
  }
}

async function publishReel(date,slot){
  if(!IG_ACCESS_TOKEN||!IG_USER_ID)throw new Error('Instagram credentials are not stored.');
  const slotKey=date+':'+slot;
  if(postedSlots.has(slotKey))return {ok:true,skipped:'already-posted-this-runtime'};
  if(await recentlyPublished())return {ok:true,skipped:'recent-dismissed-post-detected'};
  await generateVideo(date,slot);
  const product=pick(date,slot);
  const videoUrl=BASE+'/video/'+date+'/'+slot+'.mp4';
  const caption=product.title+'\n\nDismissed.\n\n#dismissed #streetwear #fashion';
  const params=new URLSearchParams({
    media_type:'REELS',
    video_url:videoUrl,
    caption,
    share_to_feed:'true',
    access_token:IG_ACCESS_TOKEN
  });
  const container=await graphJson('https://graph.instagram.com/'+GRAPH_VERSION+'/'+IG_USER_ID+'/media',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:params
  });
  for(let i=0;i<36;i++){
    await sleep(5000);
    const status=await graphJson('https://graph.instagram.com/'+GRAPH_VERSION+'/'+container.id+'?fields=status_code,status&access_token='+encodeURIComponent(IG_ACCESS_TOKEN));
    if(status.status_code==='FINISHED'){
      const p=new URLSearchParams({creation_id:container.id,access_token:IG_ACCESS_TOKEN});
      const result=await graphJson('https://graph.instagram.com/'+GRAPH_VERSION+'/'+IG_USER_ID+'/media_publish',{
        method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:p
      });
      postedSlots.add(slotKey);
      return {ok:true,mediaId:result.id,product:product.title};
    }
    if(status.status_code==='ERROR'||status.status_code==='EXPIRED')throw new Error(JSON.stringify(status));
  }
  throw new Error('Instagram processing timed out.');
}

async function runScheduled(){
  const x=bucharestParts();
  const hour=Number(x.hour),minute=Number(x.minute);
  const slot=TIMES.indexOf(hour);
  if(slot<0||minute>14)return {ok:true,action:'no-slot',local:x.hour+':'+x.minute};
  return {ok:true,action:'publish',local:x.hour+':'+x.minute,result:await publishReel(dayKey(),slot)};
}

function renderWaiting(date,slot){
  const p=pick(date,slot);
  return '<!doctype html><meta http-equiv="refresh" content="4"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#080808;color:white;font:14px Arial;padding:36px"><div style="color:#777;letter-spacing:.18em">DISMISSED / RENDER ENGINE</div><h1 style="font-size:54px">RENDERING...</h1><p>'+esc(p.title)+'</p><p style="color:#777">This page refreshes automatically.</p></body>';
}

function dashboard(){
  const date=dayKey();
  const connected=!!(IG_ACCESS_TOKEN&&IG_USER_ID);
  const rows=TIMES.map((t,s)=>{
    const p=pick(date,s);
    const state=isReady(date,s)?'READY':(jobs.has(date+':'+s)?'RENDERING':'NOT RENDERED');
    return '<div class="row"><div><b>'+String(t).padStart(2,'0')+':00</b><div class="muted">'+esc(p.title)+' · CASE '+p.caseNo+' · '+state+'</div></div><a class="button" href="/video/'+date+'/'+s+'.mp4">PREVIEW</a></div>';
  }).join('');
  return '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#080808;color:#f6f6f1;font-family:Arial,sans-serif}main{max-width:920px;margin:auto;padding:34px 22px}.eyebrow{letter-spacing:.19em;color:#777;font-size:11px}.hero{font-size:clamp(52px,9vw,96px);line-height:.86;margin:24px 0 38px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#222}.stat{background:#080808;padding:18px}.ok{color:#8ce3a7}.bad{color:#ff8d8d}.row{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #242424;padding:18px 0}.muted{color:#888;margin-top:6px}.button{color:white;text-decoration:none;border:1px solid #444;padding:10px 12px}.note{color:#777;line-height:1.5}@media(max-width:650px){.grid{grid-template-columns:1fr}.hero{font-size:58px}}</style><main><div class="eyebrow">DISMISSED / SOCIAL FACTORY</div><div class="hero">5 REELS<br>PER DAY.</div><div class="grid"><div class="stat '+(IG_APP_SECRET?'ok':'bad')+'">APP SECRET<br>'+(IG_APP_SECRET?'READY':'MISSING')+'</div><div class="stat '+(IG_ACCESS_TOKEN?'ok':'bad')+'">ACCESS TOKEN<br>'+(IG_ACCESS_TOKEN?'READY':'MISSING')+'</div><div class="stat '+(IG_USER_ID?'ok':'bad')+'">INSTAGRAM<br>'+(connected?'CONNECTED':'NOT STORED')+'</div></div>'+(connected?'<p class="ok"><b>INSTAGRAM CONNECTED</b></p>':'<p><a class="button" href="/connect">CONNECT INSTAGRAM</a></p>')+'<h2>TODAY / '+date+'</h2>'+rows+'<p class="note">Schedule: 10:00 · 13:00 · 16:00 · 19:00 · 22:00 Europe/Bucharest. Output: 1080×1920, H.264 + AAC, 24 fps.</p></main>';
}

const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://local');
  try{
    if(u.pathname==='/health')return sendJson(res,200,{ok:true,connected:!!(IG_ACCESS_TOKEN&&IG_USER_ID),renderJobs:jobs.size,case17:fs.existsSync(CASE17_OUT)?'ready':(case17Job?'rendering':'not-rendered')});
    if(u.pathname==='/api/case17'){
      if(fs.existsSync(CASE17_OUT)&&fs.statSync(CASE17_OUT).size>100000)return sendJson(res,200,{ok:true,status:'ready',url:'/case17-romanticize.mp4'});
      startCase17().catch(e=>console.error('case17 render failed',e.stack||e.message));
      return sendJson(res,202,{ok:true,status:'rendering'});
    }
    if(u.pathname==='/case17-romanticize.mp4'){
      if(fs.existsSync(CASE17_OUT)&&fs.statSync(CASE17_OUT).size>100000)return streamVideo(req,res,CASE17_OUT);
      startCase17().catch(e=>console.error('case17 render failed',e.stack||e.message));
      return sendHtml(res,202,'<!doctype html><meta http-equiv="refresh" content="5"><body style="font-family:Arial;background:#fff;color:#111;padding:40px"><h1>CASE 17 / RENDERING</h1><p>DON\'T ROMANTICIZE THE DAMAGE</p></body>');
    }
    if(u.pathname==='/api/instagram-status')return sendJson(res,200,await instagramStatus());

    if(u.pathname==='/connect'){
      if(IG_ACCESS_TOKEN&&IG_USER_ID){res.writeHead(302,{location:'/'});return res.end()}
      if(!IG_APP_SECRET){res.statusCode=500;return res.end('IG_APP_SECRET missing.')}
      const redirect=BASE+'/auth/instagram/callback';
      const auth='https://www.instagram.com/oauth/authorize?'+new URLSearchParams({
        client_id:IG_APP_ID,
        redirect_uri:redirect,
        response_type:'code',
        scope:'instagram_business_basic,instagram_business_content_publish',
        force_reauth:'true'
      });
      res.writeHead(302,{location:auth});return res.end();
    }

    if(u.pathname==='/auth/instagram/callback'){
      const code=u.searchParams.get('code');
      if(!code){res.statusCode=400;return res.end('Missing code')}
      const redirect=BASE+'/auth/instagram/callback';
      const body=new URLSearchParams({client_id:IG_APP_ID,client_secret:IG_APP_SECRET,grant_type:'authorization_code',redirect_uri:redirect,code});
      const r=await fetch('https://api.instagram.com/oauth/access_token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
      const j=await r.json();
      if(!r.ok||!j.access_token)throw new Error(JSON.stringify(j));
      let token=j.access_token;
      try{
        const ex=await graphJson('https://graph.instagram.com/access_token?'+new URLSearchParams({grant_type:'ig_exchange_token',client_secret:IG_APP_SECRET,access_token:token}));
        if(ex.access_token)token=ex.access_token;
      }catch(e){console.warn('long token exchange failed',e.message)}
      return sendHtml(res,200,'<body style="background:#080808;color:white;font-family:Arial;padding:36px"><h1>INSTAGRAM AUTHORIZED</h1><p>Add these values once in Render Environment. Do not send them in chat.</p><b>IG_USER_ID</b><pre>'+esc(j.user_id||'')+'</pre><b>IG_ACCESS_TOKEN</b><pre style="white-space:pre-wrap;word-break:break-all">'+esc(token)+'</pre></body>');
    }

    const m=u.pathname.match(/^\/video\/(\d{4}-\d{2}-\d{2})\/(\d)\.mp4$/);
    if(m){
      const date=m[1],slot=Number(m[2]);
      if(isReady(date,slot))return streamVideo(req,res,outputPath(date,slot));
      startGeneration(date,slot).catch(()=>{});
      return sendHtml(res,202,renderWaiting(date,slot));
    }

    if(u.pathname==='/api/render'){
      const date=u.searchParams.get('date')||dayKey();
      const slot=Math.max(0,Math.min(4,Number(u.searchParams.get('slot')||0)));
      if(isReady(date,slot))return sendJson(res,200,{ok:true,status:'ready',url:'/video/'+date+'/'+slot+'.mp4'});
      startGeneration(date,slot).catch(()=>{});
      return sendJson(res,202,{ok:true,status:'rendering'});
    }
    if(u.pathname==='/api/render-status'){
      const date=u.searchParams.get('date')||dayKey();
      const slot=Math.max(0,Math.min(4,Number(u.searchParams.get('slot')||0)));
      return sendJson(res,200,{ok:true,status:isReady(date,slot)?'ready':(jobs.has(date+':'+slot)?'rendering':'not-rendered')});
    }
    if(u.pathname==='/api/prewarm'){
      const today=dayKey(),tomorrow=dayKey(new Date(Date.now()+86400000));
      for(const d of [today,tomorrow])for(let s=0;s<5;s++)startGeneration(d,s).catch(()=>{});
      return sendJson(res,202,{ok:true,status:'started',videos:10});
    }
    if(u.pathname==='/api/scheduler')return sendJson(res,200,await runScheduled());
    if(u.pathname==='/api/tick'&&ADMIN_KEY&&u.searchParams.get('key')===ADMIN_KEY)return sendJson(res,200,await runScheduled());
    if(u.pathname==='/api/test-publish'&&ADMIN_KEY&&u.searchParams.get('key')===ADMIN_KEY){
      const slot=Math.max(0,Math.min(4,Number(u.searchParams.get('slot')||0)));
      return sendJson(res,200,await publishReel(dayKey(),slot));
    }
    if(u.pathname==='/')return sendHtml(res,200,dashboard());
    res.statusCode=404;res.end('Not found');
  }catch(e){
    console.error('request failed',u.pathname,e.stack||e.message);
    sendJson(res,500,{ok:false,error:e.message});
  }
});

server.keepAliveTimeout=65000;
server.headersTimeout=66000;
server.listen(PORT,'0.0.0.0',()=>{
  console.log('dismissed-social-factory listening on',PORT);
  startCase17().then(f=>console.log('CASE17_RENDER_READY',f)).catch(e=>console.error('CASE17_RENDER_FAILED',e.stack||e.message));
});
