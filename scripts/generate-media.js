const fs=require('fs');
const path=require('path');
const cp=require('child_process');

const OUT=process.env.MEDIA_OUT||'/tmp/media';
fs.mkdirSync(OUT,{recursive:true});

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

function parts(d=new Date()){
  const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  return Object.fromEntries(p.map(x=>[x.type,x.value]));
}
function dayKey(d=new Date()){const x=parts(d);return x.year+'-'+x.month+'-'+x.day}
function dayIndex(k){return Number(k.replaceAll('-',''))}
function pick(k,slot){return PRODUCTS[(dayIndex(k)*5+slot)%PRODUCTS.length]}
function ffmpegFilter(slot){
  const v=[
    "scale=900:1600:force_original_aspect_ratio=decrease,pad=900:1600:(ow-iw)/2:(oh-ih)/2:color=0xF1F0EB,zoompan=z='min(zoom+0.00035,1.055)':d=168:s=900x1600:fps=24,scale=1080:1920:flags=lanczos,drawbox=x=70:y=70:w=940:h=1780:color=black@0.10:t=2",
    "scale=900:1600:force_original_aspect_ratio=increase,crop=900:1600,zoompan=z='1.08-0.00030*on':d=168:s=900x1600:fps=24,scale=1080:1920:flags=lanczos,eq=contrast=1.16:saturation=0.18,drawbox=x=0:y=0:w=1080:h=130:color=black@0.72:t=fill",
    "scale=900:1600:force_original_aspect_ratio=decrease,pad=900:1600:(ow-iw)/2:(oh-ih)/2:black,zoompan=z='1.015+0.010*sin(on/16)':d=168:s=900x1600:fps=24,scale=1080:1920:flags=lanczos,drawgrid=w=180:h=180:t=1:c=white@0.07,drawbox=x=0:y='260+mod(t*360,1250)':w=1080:h=4:color=red@0.82:t=fill",
    "scale=900:1600:force_original_aspect_ratio=increase,crop=900:1600,zoompan=z='min(zoom+0.00045,1.075)':x='iw/2-(iw/zoom/2)+12*sin(on/12)':y='ih/2-(ih/zoom/2)':d=168:s=900x1600:fps=24,scale=1080:1920:flags=lanczos,eq=contrast=1.08:saturation=0.52,drawbox=x=55:y=1430:w=710:h=220:color=black@0.62:t=fill",
    "scale=900:1600:force_original_aspect_ratio=decrease,pad=900:1600:(ow-iw)/2:(oh-ih)/2:black,zoompan=z='min(zoom+0.00025,1.045)':d=168:s=900x1600:fps=24,scale=1080:1920:flags=lanczos,drawgrid=w=135:h=135:t=1:c=white@0.055,drawbox=x=70:y=145:w=940:h=1470:color=white@0.12:t=2"
  ];
  return v[slot];
}
async function download(url,file){
  const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0'}});
  if(!r.ok)throw new Error('download failed '+r.status+' '+url);
  fs.writeFileSync(file,Buffer.from(await r.arrayBuffer()));
}
function run(cmd,args){
  const x=cp.spawnSync(cmd,args,{stdio:'inherit'});
  if(x.status!==0)throw new Error(cmd+' failed '+x.status);
}
async function build(date,slot){
  const p=pick(date,slot);
  const dir=path.join(OUT,date);
  fs.mkdirSync(dir,{recursive:true});
  const img=path.join('/tmp','dismissed-'+date+'-'+slot+(p.image.includes('.jpg')?'.jpg':'.png'));
  await download(p.image,img);
  const out=path.join(dir,slot+'.mp4');
  run('ffmpeg',[
    '-y','-loop','1','-i',img,
    '-f','lavfi','-i','sine=frequency='+(46+slot*7)+':sample_rate=48000:duration=7',
    '-vf',ffmpegFilter(slot),
    '-af','volume=0.18',
    '-t','7','-r','24',
    '-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p',
    '-c:a','aac','-ar','48000','-b:a','128k',
    '-shortest','-movflags','+faststart',out
  ]);
  fs.writeFileSync(path.join(dir,slot+'.json'),JSON.stringify({title:p.title,caseNo:p.caseNo,date,slot},null,2));
}
(async()=>{
  const today=dayKey();
  const tomorrow=dayKey(new Date(Date.now()+86400000));
  for(const d of [today,tomorrow]){
    for(let s=0;s<5;s++){
      console.log('building',d,s,pick(d,s).title);
      await build(d,s);
    }
  }
  fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),dates:[today,tomorrow]},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
