const MEDIA='https://dismissed-social-media.onrender.com';
const VERSION='v26.0';
const TIMES=[10,13,16,19,22];
const TOKEN=process.env.IG_ACCESS_TOKEN||'';
const USER=process.env.IG_USER_ID||'';

function localParts(){
  const p=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/Bucharest',
    year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hour12:false
  }).formatToParts(new Date());
  return Object.fromEntries(p.map(x=>[x.type,x.value]));
}
function dayKey(){
  const x=localParts();
  return x.year+'-'+x.month+'-'+x.day;
}
async function json(url,opt={}){
  const r=await fetch(url,opt);
  const t=await r.text();
  let j={}; try{j=JSON.parse(t)}catch{j={raw:t}}
  if(!r.ok||j.error) throw new Error(JSON.stringify(j));
  return j;
}
async function graph(path,opt={}){
  let last;
  for(const host of ['https://graph.instagram.com/'+VERSION+'/','https://graph.facebook.com/'+VERSION+'/']){
    try{return await json(host+path,opt)}catch(e){last=e}
  }
  throw last;
}
async function mediaReady(date,slot){
  const manifest=await json(MEDIA+'/manifest.json');
  if(manifest.publishReady!==true) return {ok:false,reason:'publish-gate-closed'};
  const meta=await json(MEDIA+'/'+date+'/'+slot+'.json');
  if(meta.audio!==true) return {ok:false,reason:'audio-required'};
  if(meta.productLock!==true) return {ok:false,reason:'product-lock-required'};
  return {ok:true,meta};
}
async function recent(){
  const x=await graph(USER+'/media?fields=id,timestamp,caption&limit=25&access_token='+encodeURIComponent(TOKEN));
  return x.data||[];
}
async function alreadyPosted(title){
  const now=Date.now();
  return (await recent()).some(m=>{
    const age=now-new Date(m.timestamp).getTime();
    return age>=0 && age<5*60*60*1000 && String(m.caption||'').includes(title);
  });
}
async function publish(date,slot){
  const state=await mediaReady(date,slot);
  if(!state.ok){
    console.log('SKIP',state.reason);
    return;
  }
  const title=state.meta.title||'DISMISSED';
  if(await alreadyPosted(title)){
    console.log('SKIP already posted',title);
    return;
  }
  const body=new URLSearchParams({
    media_type:'REELS',
    video_url:MEDIA+'/'+date+'/'+slot+'.mp4',
    caption:title+'\n\nDismissed.\n\n#dismissed #streetwear #fashion',
    share_to_feed:'true',
    access_token:TOKEN
  });
  const c=await graph(USER+'/media',{
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded'},
    body
  });
  for(let i=0;i<40;i++){
    await new Promise(r=>setTimeout(r,5000));
    const st=await graph(c.id+'?fields=status_code,status&access_token='+encodeURIComponent(TOKEN));
    if(st.status_code==='FINISHED'){
      const b=new URLSearchParams({creation_id:c.id,access_token:TOKEN});
      const out=await graph(USER+'/media_publish',{
        method:'POST',
        headers:{'content-type':'application/x-www-form-urlencoded'},
        body:b
      });
      console.log('PUBLISHED',title,out.id);
      return;
    }
    if(st.status_code==='ERROR'||st.status_code==='EXPIRED') throw new Error(JSON.stringify(st));
  }
  throw new Error('Instagram processing timeout');
}

(async()=>{
  if(!TOKEN||!USER){
    console.log('Instagram secrets not configured; scheduler installed but inactive.');
    return;
  }
  const x=localParts();
  const slot=TIMES.indexOf(Number(x.hour));
  const minute=Number(x.minute);
  if(slot<0 || minute>24){
    console.log('No posting slot now:',x.hour+':'+x.minute);
    return;
  }
  await publish(dayKey(),slot);
})().catch(e=>{console.error(e);process.exit(1)});