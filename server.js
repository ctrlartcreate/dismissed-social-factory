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
const ADMIN_KEY=process.env.ADMIN_KEY||'';
const GRAPH_VERSION=process.env.GRAPH_VERSION||'v26.0';
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

function bucharestParts(d=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d);
  return Object.fromEntries(parts.map(x=>[x.type,x.value]));
}
function dayKey(d=new Date()){const x=bucharestParts(d);return x.year+'-'+x.month+'-'+x.day}
function dayIndex(k){return Number(k.replaceAll('-',''))}
function pick(k,slot){return PRODUCTS[(dayIndex(k)*5+slot)%PRODUCTS.length]}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function download(url,out){
  if(fs.existsSync(out)) return;
  const r=await fetch(url);
  if(!r.ok) throw new Error('Product image download failed: '+r.status);
  fs.writeFileSync(out,Buffer.from(await r.arrayBuffer()));
}
function filterFor(slot,title){
  const safe=title.replace(/:/g,'\\:').replace(/'/g,"\\'");
  if(slot===0) return "scale=760:-2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0xF1F0EB,zoompan=z='min(zoom+0.00045,1.07)':d=168:s=1080x1920:fps=24,drawbox=x=70:y=75:w=940:h=1770:color=black@0.10:t=1,drawtext=text='DISMISSED':fontcolor=black:fontsize=34:x=70:y=95,drawtext=text='"+safe+"':fontcolor=black:fontsize=58:x=70:y=1740";
  if(slot===1) return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='1.12-0.00055*on':d=168:s=1080x1920:fps=24,eq=contrast=1.18:saturation=0.10,drawbox=x=0:y=0:w=1080:h=150:color=black@0.75:t=fill,drawtext=text='OPTICAL SURVEILLANCE':fontcolor=white:fontsize=26:x=58:y=58";
  if(slot===2) return "scale=820:-2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,zoompan=z='1.02+0.015*sin(on/14)':d=168:s=1080x1920:fps=24,drawgrid=w=180:h=180:t=1:c=white@0.07,drawbox=x=0:y='250+mod(t*380,1300)':w=1080:h=4:color=red@0.82:t=fill,drawtext=text='CASE FILE':fontcolor=white:fontsize=28:x=64:y=90,drawtext=text='"+safe+"':fontcolor=white:fontsize=52:x=64:y=1740";
  if(slot===3) return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.00075,1.12)':x='iw/2-(iw/zoom/2)+18*sin(on/11)':y='ih/2-(ih/zoom/2)':d=168:s=1080x1920:fps=24,eq=contrast=1.10:saturation=0.55,drawbox=x=58:y=1420:w=700:h=250:color=black@0.68:t=fill,drawtext=text='FORENSIC AUDIO':fontcolor=white:fontsize=24:x=82:y=1470,drawtext=text='"+safe+"':fontcolor=white:fontsize=48:x=82:y=1540";
  return "scale=800:-2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,zoompan=z='min(zoom+0.00035,1.055)':d=168:s=1080x1920:fps=24,drawgrid=w=135:h=135:t=1:c=white@0.06,drawbox=x=70:y=145:w=940:h=1470:color=white@0.12:t=1,drawtext=text='DISMISSED / FUTURE BLUEPRINT':fontcolor=white:fontsize=25:x=70:y=90,drawtext=text='"+safe+"':fontcolor=white:fontsize=54:x=70:y=1700";
}
async function generateVideo(date,slot){
  slot=Math.max(0,Math.min(4,Number(slot)));
  const product=pick(date,slot);
  const outfile=path.join(DIR,date+'-'+slot+'.mp4');
  if(fs.existsSync(outfile)&&fs.statSync(outfile).size>100000) return outfile;
  const ext=product.image.includes('.jpg')?'.jpg':'.png';
  const image=path.join(DIR,'product-'+product.caseNo+ext);
  await download(product.image,image);
  const filter=filterFor(slot,product.title);
  const freq=46+slot*7;
  const args=['-y','-loop','1','-i',image,
    '-f','lavfi','-i','sine=frequency='+freq+':sample_rate=48000:duration=7',
    '-f','lavfi','-i','anoisesrc=color=pink:sample_rate=48000:duration=7:amplitude=0.03',
    '-filter_complex','[0:v]'+filter+'[v];[1:a]volume=0.20[a0];[2:a]volume=0.24[a1];[a0][a1]amix=inputs=2:duration=shortest,afade=t=in:st=0:d=.12,afade=t=out:st=6.45:d=.35[a]',
    '-map','[v]','-map','[a]','-t','7','-r','24','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-b:a','128k','-movflags','+faststart',outfile];
  const run=cp.spawnSync(ffmpeg,args,{encoding:'utf8',maxBuffer:20*1024*1024});
  if(run.status!==0) throw new Error((run.stderr||'ffmpeg failed').slice(-2500));
  return outfile;
}
async function graphJson(url,opts={}){
  const r=await fetch(url,opts);
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error) throw new Error(JSON.stringify(j));
  return j;
}
async function publishReel(date,slot){
  if(!IG_ACCESS_TOKEN||!IG_USER_ID) throw new Error('Instagram credentials are not stored yet.');
  await generateVideo(date,slot);
  const product=pick(date,slot);
  const videoUrl=BASE+'/video/'+date+'/'+slot+'.mp4';
  const caption=product.title+'\n\nDismissed.\n\n#dismissed #streetwear #fashion';
  const createParams=new URLSearchParams({
    media_type:'REELS',
    video_url:videoUrl,
    caption,
    share_to_feed:'true',
    access_token:IG_ACCESS_TOKEN
  });
  const container=await graphJson('https://graph.instagram.com/'+GRAPH_VERSION+'/'+IG_USER_ID+'/media',{
    method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:createParams
  });
  for(let i=0;i<30;i++){
    await sleep(5000);
    const status=await graphJson('https://graph.instagram.com/'+GRAPH_VERSION+'/'+container.id+'?fields=status_code,status&access_token='+encodeURIComponent(IG_ACCESS_TOKEN));
    if(status.status_code==='FINISHED'){
      const params=new URLSearchParams({creation_id:container.id,access_token:IG_ACCESS_TOKEN});
      return graphJson('https://graph.instagram.com/'+GRAPH_VERSION+'/'+IG_USER_ID+'/media_publish',{
        method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:params
      });
    }
    if(status.status_code==='ERROR'||status.status_code==='EXPIRED') throw new Error(JSON.stringify(status));
  }
  throw new Error('Instagram video processing timed out.');
}
async function runScheduled(){
  const x=bucharestParts();
  const slot=TIMES.indexOf(Number(x.hour));
  if(slot<0) return {ok:true,action:'no-slot',local:x.hour+':'+x.minute};
  return {ok:true,action:'published',result:await publishReel(dayKey(),slot)};
}
function html(){
  const date=dayKey();
  const cards=TIMES.map((t,s)=>{
    const p=pick(date,s);
    return '<div class="row"><div><b>'+String(t).padStart(2,'0')+':00</b><div class="muted">'+esc(p.title)+' · CASE '+p.caseNo+'</div></div><a class="button" href="/video/'+date+'/'+s+'.mp4">PREVIEW</a></div>';
  }).join('');
  return '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#080808;color:#f6f6f1;font-family:Arial,sans-serif}main{max-width:920px;margin:auto;padding:34px 22px}.eyebrow{letter-spacing:.19em;color:#777;font-size:11px}.hero{font-size:clamp(52px,9vw,96px);line-height:.86;margin:24px 0 38px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#222}.stat{background:#080808;padding:18px}.ok{color:#8ce3a7}.bad{color:#ff8d8d}.row{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #242424;padding:18px 0}.muted{color:#888;margin-top:6px}.button{color:white;text-decoration:none;border:1px solid #444;padding:10px 12px}.note{color:#777;line-height:1.5}@media(max-width:650px){.grid{grid-template-columns:1fr}.hero{font-size:58px}}</style><main><div class="eyebrow">DISMISSED / SOCIAL FACTORY</div><div class="hero">5 REELS<br>PER DAY.</div><div class="grid"><div class="stat '+(IG_APP_SECRET?'ok':'bad')+'">APP SECRET<br>'+(IG_APP_SECRET?'READY':'MISSING')+'</div><div class="stat '+(IG_ACCESS_TOKEN?'ok':'bad')+'">ACCESS TOKEN<br>'+(IG_ACCESS_TOKEN?'READY':'MISSING')+'</div><div class="stat '+(IG_USER_ID?'ok':'bad')+'">INSTAGRAM<br>'+(IG_USER_ID?'CONNECTED':'NOT STORED')+'</div></div><p><a class="button" href="/connect">CONNECT INSTAGRAM</a></p><h2>TODAY / '+date+'</h2>'+cards+'<p class="note">Schedule: 10:00 · 13:00 · 16:00 · 19:00 · 22:00 Europe/Bucharest. Videos are 1080×1920, H.264 + AAC, 24 fps.</p></main>';
}

http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://local');
  try{
    if(u.pathname==='/health'){
      res.setHeader('content-type','application/json');
      return res.end(JSON.stringify({ok:true,secret:!!IG_APP_SECRET,token:!!IG_ACCESS_TOKEN,userId:!!IG_USER_ID}));
    }
    if(u.pathname==='/connect'){
      if(!IG_APP_SECRET){res.statusCode=500;return res.end('IG_APP_SECRET is missing in Render Environment.');}
      const redirect=BASE+'/auth/instagram/callback';
      const auth='https://www.instagram.com/oauth/authorize?'+new URLSearchParams({
        client_id:IG_APP_ID,
        redirect_uri:redirect,
        response_type:'code',
        scope:'instagram_business_basic,instagram_business_content_publish',
        force_reauth:'true'
      }).toString();
      res.writeHead(302,{location:auth});return res.end();
    }
    if(u.pathname==='/auth/instagram/callback'){
      const code=u.searchParams.get('code');
      if(!code){res.statusCode=400;return res.end('Missing code');}
      const redirect=BASE+'/auth/instagram/callback';
      const body=new URLSearchParams({client_id:IG_APP_ID,client_secret:IG_APP_SECRET,grant_type:'authorization_code',redirect_uri:redirect,code});
      const r=await fetch('https://api.instagram.com/oauth/access_token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
      const j=await r.json();
      if(!r.ok||!j.access_token) throw new Error(JSON.stringify(j));
      let token=j.access_token;
      try{
        const exchanged=await graphJson('https://graph.instagram.com/access_token?'+new URLSearchParams({
          grant_type:'ig_exchange_token',
          client_secret:IG_APP_SECRET,
          access_token:token
        }).toString());
        if(exchanged.access_token) token=exchanged.access_token;
      }catch(e){console.warn('Long-lived token exchange failed; using short-lived token');}
      const userId=String(j.user_id||'');
      res.setHeader('content-type','text/html');
      return res.end('<body style="background:#080808;color:white;font-family:Arial;padding:36px"><h1>INSTAGRAM AUTHORIZED</h1><p>Authorization succeeded. Add these values once in this Render service Environment. Do not send them in chat.</p><b>IG_USER_ID</b><pre>'+esc(userId)+'</pre><b>IG_ACCESS_TOKEN</b><pre style="white-space:pre-wrap;word-break:break-all">'+esc(token)+'</pre></body>');
    }
    const m=u.pathname.match(/^\/video\/(\d{4}-\d{2}-\d{2})\/(\d)\.mp4$/);
    if(m){
      const file=await generateVideo(m[1],Number(m[2]));
      const st=fs.statSync(file);
      res.writeHead(200,{'content-type':'video/mp4','content-length':st.size,'cache-control':'public,max-age=3600','accept-ranges':'bytes'});
      return fs.createReadStream(file).pipe(res);
    }
    if(u.pathname==='/api/prewarm'&&u.searchParams.get('key')===ADMIN_KEY){
      const today=dayKey(),tomorrow=dayKey(new Date(Date.now()+86400000));
      for(const d of [today,tomorrow]) for(let s=0;s<5;s++) await generateVideo(d,s);
      res.setHeader('content-type','application/json');return res.end(JSON.stringify({ok:true,videos:10}));
    }
    if(u.pathname==='/api/tick'&&u.searchParams.get('key')===ADMIN_KEY){
      res.setHeader('content-type','application/json');return res.end(JSON.stringify(await runScheduled()));
    }
    if(u.pathname==='/api/test-publish'&&u.searchParams.get('key')===ADMIN_KEY){
      const slot=Math.max(0,Math.min(4,Number(u.searchParams.get('slot')||0)));
      res.setHeader('content-type','application/json');return res.end(JSON.stringify(await publishReel(dayKey(),slot)));
    }
    if(u.pathname==='/'){res.setHeader('content-type','text/html; charset=utf-8');return res.end(html());}
    res.statusCode=404;res.end('Not found');
  }catch(e){console.error(e);res.statusCode=500;res.end(e.message)}
}).listen(PORT,'0.0.0.0');
