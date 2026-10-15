/**
 * Safety gate for the Play encounter browser run.
 * The Cursor browser drives the site. This process does not launch a browser,
 * read a password file, or call join / prepare / throw / settle.
 *
 * Production gameplay stays refused until the owner sets A19_WIRE_GO=1
 * in the shell for that later GO. Even then, do not store cookies or tokens.
 */
"use strict";

const forbidden = [
  "docs/audits/_qa-session.tmp.json",
  "password",
  "access_token",
  "refresh_token"
];
const joined = process.argv.slice(2).join(" ").toLowerCase();
if (forbidden.some((word) => joined.includes(word))) {
  console.error("REFUSED: this gate does not accept credentials or session files.");
  process.exit(1);
}

if (process.env.A19_WIRE_GO !== "1") {
  console.log("BLOCKED: Play encounter automation stays off until A19_WIRE_GO=1.");
  console.log("Cursor browser tab can be reused after one PlayTester sign-in.");
  console.log("Do not write cookies, tokens, or passwords into the repo.");
  process.exit(2);
}

console.log("A19_WIRE_GO=1 is set. Drive the existing Cursor browser tab. Do not export its session.");
process.exit(0);
