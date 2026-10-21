// Read-only static HTTP checks. No browser session, RPC, credentials or mutations.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const files = [
  'index.html','signin.html','register.html','reset-password.html','support.html',
  'help.html','storage.html','pokedex.html','inventory.html','settings.html',
  'trainer.html','rankings.html','evolve.html','store.html','trade.html','events.html',
  'achievements.html','admin-next.html','css/play.css','js/build.js','js/game.js',
  'js/auth.js','js/support.js','js/admin-next-rewards.js','js/trade.js'
];
const normalize = value => value.replace(/\r\n/g, '\n');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
async function main() {
  const results = [];
  // Bounded concurrency; exact own-site allowlist only, GET requests only.
  for (let offset=0; offset<files.length; offset+=4) {
    const batch = await Promise.all(files.slice(offset, offset+4).map(async file => {
      const local = normalize(fs.readFileSync(path.join(root,file),'utf8'));
      try {
        const url = 'https://play.sorastarlight.net/'+file;
        const response = await fetch(url, {headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000),redirect:'error'});
        const published = normalize(await response.text());
        return {file,status:response.status,contentType:response.headers.get('content-type'),localSha256:hash(local),publishedSha256:hash(published),matches:response.status===200&&local===published};
      } catch (error) { return {file,matches:false,error:error.message}; }
    }));
    results.push(...batch);
  }
  const report = {classification:'READ-ONLY public static HTTP and newline-normalized source equality;not authenticated or rendered gameplay QA',checkedAt:new Date().toISOString(),appBuild:JSON.parse(fs.readFileSync(path.join(root,'build.json'))).appBuild,results};
  fs.writeFileSync(path.join(root,'docs/project-command-center/evidence/public-launch-publication.json'),JSON.stringify(report,null,2)+'\n');
  for(const result of results.filter(row=>!row.matches)) console.error(JSON.stringify(result));
  console.log(`${results.filter(row=>row.matches).length}/${results.length} public files match checkout`);
  if(results.some(row=>!row.matches))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
