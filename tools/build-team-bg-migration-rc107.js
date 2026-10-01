const fs = require("fs");
const path = require("path");
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "_team-bg-catalog.json"), "utf8"));
const free = catalog.filter((r) => r.free);
const vals = catalog.map((r, i) => {
  const id = `team-bg-${r.id}`;
  const how = r.free
    ? "Available to every Trainer."
    : "Coming soon — unlocks through future Trainer rewards.";
  const req = r.free ? '{"type":"starter"}' : '{"type":"admin"}';
  const esc = (s) => String(s).replace(/'/g, "''");
  return `  ('${id}', 'team_background', '${esc(r.name)}', '${esc(r.name)}', '${esc(how)}', '${req}'::jsonb, ${200 + i}, true, ${r.free})`;
});
const sql = `-- rc107 team backgrounds: free expansion + owner-supplied scenes
insert into public.progression_cosmetics (id, kind, name, description, how_to, requirement, sort_order, enabled, starter)
values
${vals.join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  how_to = excluded.how_to,
  requirement = excluded.requirement,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  starter = excluded.starter;

insert into public.trainer_cosmetics (user_id, cosmetic_id, source)
select p.id, c.id, 'starter'
  from public.profiles p
  cross join public.progression_cosmetics c
 where c.kind = 'team_background' and c.starter and c.enabled
on conflict do nothing;
`;
fs.writeFileSync(
  path.join(__dirname, "..", "supabase", "migrations", "20260930220000_team_scene_backgrounds_rc107.sql"),
  sql
);
console.log({ total: catalog.length, free: free.length, locked: catalog.length - free.length });
