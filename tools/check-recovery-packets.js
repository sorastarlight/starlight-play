// Local, read-only packet integrity. Never connects to a database or executes SQL.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const manifestPath = 'docs/project-command-center/recovery-packets.json';

function check(options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const errors = [], verified = [], seen = new Set(), versions = new Map();
  let manifest;
  try { manifest = options.manifest || JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8')); }
  catch (error) { return { errors: ['Recovery manifest unavailable: ' + error.message], verified }; }
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.migrations) || !manifest.migrations.length) {
    return { errors: ['Recovery manifest version/list invalid'], verified };
  }
  let previous = '';
  for (const migration of manifest.migrations) {
    if (!migration || typeof migration !== 'object') { errors.push('Recovery migration entry invalid'); continue; }
    if (!/^\d{14}$/.test(migration.version || '') || migration.version <= previous) {
      errors.push('Recovery migrations must have unique ascending 14-digit versions');
    }
    previous = migration.version;
    if (!Array.isArray(migration.files) || migration.files.length !== 2) {
      errors.push('Recovery migration needs an INSTALL/ROLLBACK pair');
      continue;
    }
    const names = migration.files.map(entry => entry && entry.file);
    if (!names.some(n => typeof n === 'string' && n.endsWith('/INSTALL.sql')) ||
        !names.some(n => typeof n === 'string' && n.endsWith('/ROLLBACK.sql')) ||
        new Set(names.map(n => typeof n === 'string' ? path.posix.dirname(n) : '')).size !== 1) {
      errors.push('Recovery migration has an invalid packet pair');
    }
    for (const entry of migration.files) {
      if (!entry || typeof entry.file !== 'string' || !/^supabase\/unapplied\/[a-z0-9-]+\/(INSTALL|ROLLBACK)\.sql$/.test(entry.file)) {
        errors.push('Recovery packet path invalid');
        continue;
      }
      if (seen.has(entry.file)) { errors.push('Duplicate recovery packet: ' + entry.file); continue; }
      seen.add(entry.file);
      if (entry.file.endsWith('/INSTALL.sql')) versions.set(entry.file, migration.version);
      if (!/^[a-f0-9]{64}$/.test(entry.sha256 || '')) { errors.push('Recovery hash invalid: ' + entry.file); continue; }
      try {
        const resolved = fs.realpathSync(path.join(root, entry.file));
        const relative = path.relative(fs.realpathSync(root), resolved);
        if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || relative === '..') {
          errors.push('Recovery packet escapes workspace: ' + entry.file);
          continue;
        }
        const bytes = fs.readFileSync(resolved);
        if (bytes.includes(13)) errors.push('Recovery packet must retain reviewed LF bytes: ' + entry.file);
        const actual = crypto.createHash('sha256').update(bytes).digest('hex');
        if (actual !== entry.sha256) errors.push('Recovery packet SHA256 mismatch: ' + entry.file);
        else verified.push({ file: entry.file, sha256: actual, migration: migration.version });
      } catch (error) { errors.push('Recovery packet unavailable: ' + entry.file + ' (' + error.code + ')'); }
    }
  }
  try {
    const inventory = fs.readFileSync(path.join(root, 'docs/project-command-center/RECOVERY-POST-DRILL-DELTAS.md'), 'utf8');
    const installs = new Set(inventory.match(/supabase\/unapplied\/[a-z0-9-]+\/INSTALL\.sql/g) || []);
    const recordedVersions = new Map(Array.from(inventory.matchAll(/\|(20\d{12})[^|\r\n]*\|(supabase\/unapplied\/[a-z0-9-]+\/INSTALL\.sql)\|/g), match => [match[2], match[1]]));
    if (!installs.size) errors.push('Recovery delta inventory has no install packets');
    for (const name of installs) if (!seen.has(name)) errors.push('Recovery inventory packet absent from manifest: ' + name);
    for (const name of installs) if (!recordedVersions.has(name) || (versions.has(name) && versions.get(name) !== recordedVersions.get(name))) errors.push('Recovery migration version differs from inventory: ' + name);
    for (const name of seen) if (name.endsWith('/INSTALL.sql') && !installs.has(name)) errors.push('Recovery manifest packet absent from inventory: ' + name);
  } catch (error) { errors.push('Recovery delta inventory unavailable: ' + error.code); }
  return { errors, verified };
}

if (require.main === module) {
  const result = check();
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
  else console.log('RECOVERY PACKETS VERIFIED: ' + result.verified.length + ' files; no SQL executed');
}
module.exports = { check };
