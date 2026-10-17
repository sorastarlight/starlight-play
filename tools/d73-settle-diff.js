/* Compare the unapplied D72 settle draft with the reviewed live body.
 * Strips only the intended note. Does not connect to Supabase.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LIVE_MD5 = "0c6bf2fb2ca740415fffc567c362192a";
const file = path.join(__dirname, "..", "supabase", "unapplied", "d72-mastery", "006_settle_familiarity_note.sql");
const sql = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const start = sql.indexOf("AS $function$") + "AS $function$".length;
const end = sql.indexOf("$function$;", start);
let body = sql.slice(start, end);
body = body.replace("\n  v_catch_id uuid;\n  v_life text;", "");
const marker = "      IF coalesce(v_mat->>'ok', 'false') = 'true' THEN";
const noteStart = body.indexOf(marker);
const noteEnd = body.indexOf("    END IF;\n  END LOOP;", noteStart);
if (noteStart < 0 || noteEnd < 0) {
  console.error("could not isolate the note block");
  process.exit(1);
}
const note = body.slice(noteStart, noteEnd);
body = body.slice(0, noteStart) + body.slice(noteEnd);
const md5 = crypto.createHash("md5").update(body).digest("hex");
console.log(`stripped_md5 ${md5}`);
console.log(`live_md5 ${LIVE_MD5}`);
console.log(`match ${md5 === LIVE_MD5}`);
console.log("--- intended addition ---");
console.log(note.trimEnd());
if (md5 !== LIVE_MD5) process.exit(1);
