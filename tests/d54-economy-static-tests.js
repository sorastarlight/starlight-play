"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const sql = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "unapplied", "d54-economy", "001_spend_ledger.sql"),
  "utf8"
);

assert(sql.includes("Do not apply to production"));
assert(sql.includes("INSERT INTO public.item_ledger"));
assert(sql.includes("-1, 'BAG_SPEND'"));
assert(!sql.includes("is distinct from 'standard_throw'"));
assert(sql.includes("PERFORM private.spend_bag_item(rec.user_id, rec.ball)"));
assert(!sql.includes("capture_chance"));
assert(!sql.includes("streamlink_wire_set_enabled"));
assert(!sql.includes("SL00025376"));
assert(sql.includes("private.spend_bag_item"));
assert(sql.includes("private.announce_throws"));

console.log("PASS d54 economy SQL stays branch-only and ledgers each spend");
