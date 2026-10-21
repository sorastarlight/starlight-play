// No export or restore. Native dump access probe; fixed project; no secret output.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const moduleRoot = path.join(__dirname, '.cache', 'codex65-pg17', 'node_modules');
const binary = 'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe';
async function main() {
  if (!fs.existsSync(binary)) throw new Error('PG17_DUMP_BINARY_UNAVAILABLE');
  const version = spawnSync(binary, ['--version'], { encoding: 'utf8', windowsHide: true });
  if (version.status !== 0 || !/PostgreSQL\) 17\./.test(version.stdout)) throw new Error('PG17_VERSION_CHECK_FAILED');
  const workspace = path.resolve(process.env.LOCALAPPDATA, 'PokemonStreamLink', 'recovery', 'codex65-20261021');
  if (workspace.startsWith(root + path.sep)) throw new Error('WORKSPACE_MUST_BE_OUTSIDE_GIT');
  const metadata = JSON.parse(fs.readFileSync(path.join(workspace, 'workspace.json'), 'utf8').replace(/^\uFEFF/, ''));
  const ref = fs.readFileSync(path.join(root, 'supabase', '.temp', 'project-ref'), 'utf8').trim();
  if (ref !== 'dtflmlbjhttoewqgkujf' || metadata.projectRef !== ref) throw new Error('PROJECT_MISMATCH');
  if (process.argv.includes('--offline')) {
    console.log(JSON.stringify({ status: 'OFFLINE_PREFLIGHT_PASS', pgDumpMajor: 17, outsideGit: true, projectPinned: true, sourceConnected: false, exported: false }));
    return;
  }
  if (!process.env.CODEX65_DB_PASSWORD) throw new Error('NATIVE_DUMP_CREDENTIAL_UNAVAILABLE');
  const { Client } = require(path.join(moduleRoot, 'pg'));
  const client = new Client({host:'aws-0-us-west-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.'+ref,password:process.env.CODEX65_DB_PASSWORD,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:10000,statement_timeout:10000,application_name:'codex65-readonly-preflight'});
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const {rows} = await client.query("SELECT current_setting('server_version_num')::int AS version, current_setting('transaction_read_only') AS readonly");
    await client.query('ROLLBACK');
    if (rows[0].version < 170000 || rows[0].version >= 180000 || rows[0].readonly !== 'on') throw new Error('SOURCE_VERSION_OR_READONLY_MISMATCH');
    console.log(JSON.stringify({status:'NATIVE_READONLY_ACCESS_PASS',sourceMajor:17,tlsVerified:true,exported:false,restored:false}));
  } finally { await client.end(); }
}
main().catch(error => { console.error(JSON.stringify({status:'PREFLIGHT_STOP',code:/^[A-Z0-9_]+$/.test(error.message)?error.message:(error.code || 'CONNECTION_OR_RUNTIME_FAILURE'),exported:false}));process.exitCode=1; });
