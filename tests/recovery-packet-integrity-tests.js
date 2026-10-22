const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), assert = require('node:assert/strict');
const { check } = require('../tools/check-recovery-packets');
const { spawnSync } = require('child_process');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'streamlink-recovery-integrity-'));
const hashes = value => crypto.createHash('sha256').update(value).digest('hex');
const prefix = 'supabase/unapplied/fictional/';
const manifest = () => ({ version: 1, migrations: [{ version: '20261022000000', files: ['INSTALL.sql', 'ROLLBACK.sql'].map(name => ({ file: prefix + name, sha256: hashes('fictional local fixture\n') })) }] });
const results = [];
function reset() {
  fs.mkdirSync(path.join(temp, prefix), { recursive: true });
  fs.mkdirSync(path.join(temp, 'docs/project-command-center'), { recursive: true });
  for (const name of ['INSTALL.sql', 'ROLLBACK.sql']) fs.writeFileSync(path.join(temp, prefix + name), 'fictional local fixture\n');
  fs.writeFileSync(path.join(temp, 'docs/project-command-center/RECOVERY-POST-DRILL-DELTAS.md'), '|20261022000000 fictional|' + prefix + 'INSTALL.sql|\n');
  fs.writeFileSync(path.join(temp, 'docs/project-command-center/recovery-packets.json'), JSON.stringify(manifest()));
}
function run(name, mutate, pattern) {
  reset(); const config = manifest(); mutate(config);
  const result = check({ root: temp, manifest: config });
  if (pattern) assert.match(result.errors.join('\n'), pattern); else { assert.deepEqual(result.errors, []); assert.equal(result.verified.length, 2); }
  results.push(name); console.log('PASS ' + name);
}
try {
  run('matching raw bytes pass', () => {});
  run('content drift fails', () => fs.appendFileSync(path.join(temp, prefix + 'INSTALL.sql'), 'changed'), /SHA256 mismatch/);
  run('CRLF drift fails', () => fs.writeFileSync(path.join(temp, prefix + 'INSTALL.sql'), 'fictional local fixture\r\n'), /reviewed LF bytes/);
  run('missing rollback fails', () => fs.unlinkSync(path.join(temp, prefix + 'ROLLBACK.sql')), /unavailable/);
  run('malformed hash fails', m => { m.migrations[0].files[0].sha256 = 'bad'; }, /hash invalid/);
  run('path traversal rejected', m => { m.migrations[0].files[0].file = '../outside.sql'; }, /path invalid/);
  run('duplicate path rejected', m => { m.migrations[0].files[1] = m.migrations[0].files[0]; }, /Duplicate recovery packet/);
  run('missing pair rejected', m => { m.migrations[0].files.pop(); }, /INSTALL\/ROLLBACK pair/);
  run('null file rejected', m => { m.migrations[0].files[0] = null; }, /path invalid/);
  run('null migration rejected', m => { m.migrations[0] = null; }, /migration entry invalid/);
  run('out-of-order migration rejected', m => { m.migrations.push({ ...m.migrations[0], version: '20261021000000' }); }, /ascending/);
  run('wrong recorded migration version rejected', m => { m.migrations[0].version = '20261023000000'; }, /version differs from inventory/);
  run('unlisted documented delta rejected', () => fs.appendFileSync(path.join(temp, 'docs/project-command-center/RECOVERY-POST-DRILL-DELTAS.md'), 'supabase/unapplied/new-delta/INSTALL.sql'), /absent from manifest/);
  run('undocumented manifest delta rejected', () => fs.writeFileSync(path.join(temp, 'docs/project-command-center/RECOVERY-POST-DRILL-DELTAS.md'), 'supabase/unapplied/other/INSTALL.sql'), /absent from inventory/);
  run('missing inventory rejected', () => fs.unlinkSync(path.join(temp, 'docs/project-command-center/RECOVERY-POST-DRILL-DELTAS.md')), /inventory unavailable/);
  reset(); assert.deepEqual(check({ root: temp }).errors, []); results.push('default manifest loading passes');
  fs.writeFileSync(path.join(temp, 'docs/project-command-center/recovery-packets.json'), '{broken'); assert.match(check({ root: temp }).errors.join('\n'), /manifest unavailable/); results.push('broken JSON refused');
  assert.match(check({ root: temp, manifest: { version: 2 } }).errors.join('\n'), /version\/list invalid/); results.push('unsupported version refused');
  reset(); fs.mkdirSync(path.join(temp, 'tools'), { recursive: true });
  for (const name of ['check-recovery-packets.js', 'validate-build.js']) fs.copyFileSync(path.join(__dirname, '../tools', name), path.join(temp, 'tools', name));
  fs.appendFileSync(path.join(temp, prefix + 'INSTALL.sql'), 'unreviewed drift');
  const cli = spawnSync(process.execPath, [path.join(temp, 'tools/check-recovery-packets.js')], { encoding: 'utf8' });
  assert.equal(cli.status, 1); assert.match(cli.stderr, /SHA256 mismatch/); results.push('standalone CLI exits unsuccessfully on drift');
  const build = spawnSync(process.execPath, [path.join(temp, 'tools/validate-build.js')], { encoding: 'utf8' });
  assert.equal(build.status, 1); assert.match(build.stderr, /RECOVERY PACKET PREFLIGHT FAILED/); results.push('actual build refuses packet drift before further build steps');
  console.log(results.length + ' LOCAL filesystem integrity checks passed; no SQL or network');
} finally {
  const resolved = path.resolve(temp), parent = path.resolve(os.tmpdir());
  if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('streamlink-recovery-integrity-')) throw Error('Unexpected fixture cleanup path');
  fs.rmSync(resolved, { recursive: true, force: true });
}
