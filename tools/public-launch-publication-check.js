// Read-only static HTTP checks. No browser session, RPC, credentials or mutations.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const baseFiles = [
  'index.html','signin.html','register.html','reset-password.html','support.html',
  'help.html','storage.html','pokedex.html','inventory.html','settings.html',
  'trainer.html','rankings.html','evolve.html','store.html','trade.html','events.html',
  'achievements.html','admin-next.html','css/play.css','css/rankings-reflow.css','js/build.js','js/game.js',
  'js/nav.js','js/settings.js','js/storage.js','js/team.js','js/content-picker.js','tools/remaining-dialog-review.html','js/play-ribbons.js','tools/dialog-acceptance-review.html','tools/nav-focus-review.html','js/play-present.js','tools/milestone-review.html','tools/support-loading-review.html',
  'js/auth.js','js/register.js','js/signin.js','tools/signin-pending-review.html','js/admin.js','js/admin-tools.js','js/admin-studio.js','tools/staff-error-review.html','css/support.css','tools/device-acceptance-review.html','tools/registration-feedback-review.html','js/help.js','js/support.js','js/admin-next-rewards.js','js/trade.js','js/inventory.js','js/achievements.js','js/events.js','js/trainer.js'
];
const reviewedFiles = [...baseFiles,...JSON.parse(fs.readFileSync(path.join(root,'vendor-lock.json'),'utf8')).sdk.pages,'vendor-lock.json','tools/sdk-integrity-review.html'];
const scriptFiles = [];
for (const page of new Set(reviewedFiles.filter(file => file.endsWith('.html')))) {
  const html = fs.readFileSync(path.join(root,page),'utf8');
  const pageUrl = new URL('https://play.sorastarlight.net/'+page);
  const baseHref = html.match(/<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  const baseUrl = baseHref ? new URL(baseHref,pageUrl) : pageUrl;
  for (const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const url = new URL(match[1], baseUrl);
    if (url.origin !== 'https://play.sorastarlight.net') continue;
    const file = decodeURIComponent(url.pathname).replace(/^\//,'');
    const resolved = path.resolve(root,file);
    if (!resolved.startsWith(root+path.sep)) throw new Error('Script path escapes checkout: '+file);
    scriptFiles.push(file);
  }
}
const files = [...new Set([...reviewedFiles,...scriptFiles])];
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
