const fs = require("fs");
const { execSync } = require("child_process");
const out = execSync("git log --oneline -20 -- index.html", { cwd: __dirname + "/..", encoding: "utf8" });
console.log(out);
for (const line of out.trim().split("\n").slice(0, 12)) {
  const hash = line.split(" ")[0];
  try {
    const buf = execSync(`git show ${hash}:index.html`, { cwd: __dirname + "/..", encoding: "buffer", maxBuffer: 5e6 });
    const i = buf.indexOf(Buffer.from("welcome-blurb"));
    if (i < 0) {
      console.log(hash, "no welcome-blurb");
      continue;
    }
    const slice = buf.slice(i, i + 120);
    const hasFffd = slice.includes(Buffer.from([0xef, 0xbf, 0xbd]));
    const hasStar = slice.includes(Buffer.from("ST★")) || slice.includes(Buffer.from([0xe2, 0x98, 0x85]));
    console.log(hash, "fffd=", hasFffd, "star=", hasStar, JSON.stringify(slice.toString("utf8")));
  } catch (e) {
    console.log(hash, "err", e.message);
  }
}
