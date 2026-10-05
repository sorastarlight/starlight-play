const fs = require("fs");
const path = require("path");
const t = fs.readFileSync(path.join(__dirname, "..", "js", "pokedex-presentation.js"), "utf8");
const idx = t.indexOf('"71":');
console.log(t.slice(idx, idx + 400));
const game = fs.readFileSync(path.join(__dirname, "..", "js", "game.js"), "utf8");
const s = game.indexOf("window.playSpriteUrl");
console.log(game.slice(s, s + 800));
