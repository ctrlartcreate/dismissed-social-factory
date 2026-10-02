const http=require('http');
const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const ffmpeg=require('ffmpeg-static');

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
    if(u.pathname==='/health')return sendJson(res,200,{ok:true,connected:!!(IG_ACCESS_TOKEN&&IG_USER_ID),renderJobs:jobs.size});
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
server.listen(PORT,'0.0.0.0',()=>console.log('dismissed-social-factory listening on',PORT));
