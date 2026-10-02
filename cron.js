const base=process.env.PUBLIC_BASE_URL;
const key=process.env.ADMIN_KEY;
if(!base||!key){console.error('Missing PUBLIC_BASE_URL or ADMIN_KEY');process.exit(1)}
fetch(base+'/api/tick?key='+encodeURIComponent(key))
  .then(async r=>{const t=await r.text();console.log(r.status,t);if(!r.ok)process.exitCode=1})
  .catch(e=>{console.error(e);process.exitCode=1});
